/**
 * Per-auction proof & fund isolation for auction bidding.
 *
 * Background (issues #3 "stuck bid funds" + #4 "proofs already spent"):
 *
 * The bid flow in `src/publish/auctions.tsx` locks only the bid DELTA. Each
 * lock calls `cashuWallet.swap(...)`, which CONSUMES the selected proofs at the
 * mint. The NDK Cashu wallet's local proof store, however, is only reconciled
 * against mint truth by `consolidateMintProofs` (the single call site that
 * passes `destroy: spentProofs`). In the window between a swap and the next
 * consolidate pass:
 *
 *   - `getProofsForMint(...)` still returns proofs that are already spent at the
 *     mint → `selectProofs` re-selects them for a DIFFERENT auction → the mint
 *     rejects the swap with "proofs already spent". Proof tracking was not
 *     isolated per-auction. (issue #4)
 *   - `getBalancesFromState(...)` reports a balance derived from the stale dump,
 *     so the bidder UI shows funds that are actually committed. Only a manual
 *     refresh (which triggers consolidate) reconciles truth. (issue #3)
 *
 * The fix is a *reserved-proof* layer: proofs that have been committed to an
 * in-flight bid are tracked here and excluded from both proof selection and the
 * displayed available balance until `consolidateWalletProofs` reconciles them
 * (spent proofs are destroyed; the reserved set is cleared because the dump is
 * now authoritative again).
 *
 * Everything in this module is PURE — it operates on plain proof-shaped objects
 * and a `Set<string>` of reserved secrets — so it is fully unit-testable without
 * a live mint or NDK wallet.
 */

/**
 * Minimal proof shape this module needs. The real `Proof` from `@cashu/cashu-ts`
 * satisfies it (it always has `secret` and `amount`), as do the lighter-weight
 * proof objects the wallet helpers return. Using a structural type keeps this
 * module free of a hard dependency on cashu-ts at the type level.
 */
export interface ProofLike {
	secret: string
	amount: number
}

/**
 * A reserved proof tracked by mint, for computing per-mint available balances.
 * `secret` is the unique proof identifier used for de-duplication.
 */
export interface ReservedProofRef {
	secret: string
	mintUrl: string
	amount: number
}

/**
 * Remove proofs whose `secret` is in the reserved set.
 *
 * Used by `lockAuctionBidFunds` to guarantee a bid never selects proofs that
 * another in-flight bid has already committed (issue #4). Reserving by secret —
 * not by reference — is what makes isolation correct across auctions: the same
 * underlying proof cannot be double-spent even if two auction bid flows read the
 * wallet state concurrently.
 */
export function excludeProofsBySecret<T extends ProofLike>(proofs: T[], reservedSecrets: Set<string>): T[] {
	if (reservedSecrets.size === 0) return proofs
	return proofs.filter((proof) => !reservedSecrets.has(proof.secret))
}

/**
 * Sum the value of reserved proofs grouped by mint, de-duplicating by secret.
 *
 * De-duplication matters for per-auction isolation: if the same underlying proof
 * is somehow recorded as reserved by two auctions (e.g. a race before the first
 * swap settled), its value must be subtracted from available balance only once.
 */
export function sumReservedByMint(refs: ReservedProofRef[]): Record<string, number> {
	const byMint: Record<string, number> = {}
	const seen = new Set<string>()
	for (const ref of refs) {
		if (seen.has(ref.secret)) continue
		seen.add(ref.secret)
		byMint[ref.mintUrl] = (byMint[ref.mintUrl] ?? 0) + ref.amount
	}
	return byMint
}

/**
 * Subtract per-mint reserved value from raw balances.
 *
 * This is the structural fix for issue #3: the bidder UI computes available
 * balance as `raw − reserved`, so it never double-counts funds committed to an
 * in-flight bid — independent of whether consolidate has run yet. Values are
 * clamped at zero so a transient inconsistency (more reserved than raw) can never
 * surface a negative balance. Mints absent from the raw balances are ignored
 * (reserved entries for unknown mints carry no spendable balance to subtract).
 */
export function computeNetBalances(rawBalances: Record<string, number>, reservedByMint: Record<string, number>): Record<string, number> {
	const net: Record<string, number> = {}
	for (const [mint, raw] of Object.entries(rawBalances)) {
		const reserved = reservedByMint[mint] ?? 0
		net[mint] = Math.max(0, raw - reserved)
	}
	return net
}

/**
 * Mutable, in-memory ledger of the proofs currently committed to in-flight
 * auction bids. This is the stateful companion to the pure helpers above: it is
 * the single source of truth that `lockAuctionBidFunds` consults to (a) exclude
 * consumed-input proofs from re-selection (issue #4) and (b) subtract reserved
 * value from the displayed/selected balance (issue #3).
 *
 * It is "pure-ish": the only side effects are mutations of its own fields, and
 * every method is deterministic, so the whole ledger is unit-testable without a
 * wallet or mint.
 *
 * Lifecycle:
 *   - `reserve(refs)`     — called by `lockAuctionBidFunds` immediately before
 *                            the swap consumes the selected input proofs.
 *   - `release(secrets)`  — called on lock FAILURE (inputs were NOT spent) and
 *                            by `consolidateMintProofs` for proofs the mint has
 *                            confirmed SPENT (truth reconciled → reservation no
 *                            longer needed because the local store destroyed them).
 *   - `clearForMint(m)`   — belt-and-suspenders reset for a whole mint.
 *
 * De-duplication is by `secret` everywhere so the same underlying proof, however
 * many auctions raced to reserve it, is counted exactly once.
 */
export class ReservedProofLedger {
	private readonly secrets = new Set<string>()
	private readonly refs: ReservedProofRef[] = []

	/** Mark the given proofs as reserved. Duplicate secrets are ignored. */
	reserve(refs: ReservedProofRef[]): void {
		for (const ref of refs) {
			if (this.secrets.has(ref.secret)) continue
			this.secrets.add(ref.secret)
			this.refs.push(ref)
		}
	}

	/** Drop every listed secret (and its accumulated ref) from the ledger. */
	release(secrets: string[]): void {
		if (secrets.length === 0) return
		const toRelease = new Set(secrets)
		for (const s of toRelease) this.secrets.delete(s)
		for (let i = this.refs.length - 1; i >= 0; i--) {
			if (toRelease.has(this.refs[i].secret)) this.refs.splice(i, 1)
		}
	}

	/** Remove all reservations belonging to a single mint (e.g. after a full reconcile). */
	clearForMint(mint: string): void {
		const keep = this.refs.filter((r) => r.mintUrl !== mint)
		this.refs.length = 0
		this.refs.push(...keep)
		this.secrets.clear()
		for (const r of keep) this.secrets.add(r.secret)
	}

	/** Defensive copy — callers must not mutate the internal set. */
	getSecrets(): Set<string> {
		return new Set(this.secrets)
	}

	/** Per-mint reserved totals (de-duplicated), ready for `computeNetBalances`. */
	sumByMint(): Record<string, number> {
		return sumReservedByMint(this.refs)
	}

	/** Number of distinct reserved proofs. */
	get count(): number {
		return this.secrets.size
	}
}
