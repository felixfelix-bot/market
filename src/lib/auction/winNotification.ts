import type { NostrEventLike } from '@/lib/nostr/eventLike'
import { toRawEvent } from '@/lib/nostr/eventLike'
import { parseSettlementEvent } from '@/lib/schemas/auction/settlementEvents'
import { computeValidatedBids, type ValidatedBidSet } from '@/lib/auction/bidValidation'
import type { AuctionSettlementStatus, Nut7ProofState } from '@/lib/auction/constants'
import type { ParsedAuctionEvent, ParsedBidEvent, ParsedPathReleaseEvent, ParsedValidatorVerdictEvent } from '@/lib/auction/events'
import { fetchMintKeysets, validatePathRelease } from '@/lib/auction/validation'
import type { MintKeyset } from '@cashu/cashu-ts'
import { fetchBidNut7States } from './useNut7Polling'
import { parseAuctionEvent } from '@/lib/schemas/auction/auctionEvent'
import { parseBidEvent } from '@/lib/schemas/auction/bidEvent'
import { parsePathReleaseEvent } from '@/lib/schemas/auction/settlementEvents'
import { parseValidatorVerdictEvent } from '@/lib/schemas/auction/validatorEvents'

export interface QueuedAuctionWin {
	auctionRootEventId: string
	bidEventId: string
}

export const shouldUseNonBlockingAuctionWinPrompt = (pathname: string): boolean =>
	/^\/auctions\/[^/]+\/?$/.test(pathname) ||
	/^\/dashboard\/products\/auctions\/[^/]+\/?$/.test(pathname) ||
	/^\/dashboard\/orders\/[^/]+\/?$/.test(pathname)

export const selectValidatedAuctionWinner = (
	auction: ParsedAuctionEvent,
	bids: ParsedBidEvent[],
	verdicts: ParsedValidatorVerdictEvent[],
	nut7States: Map<string, Nut7ProofState>,
): ParsedBidEvent | null => getValidatedAuctionBids(auction, bids, verdicts, nut7States).canonicalWinner

export const getValidatedAuctionBids = (
	auction: ParsedAuctionEvent,
	bids: ParsedBidEvent[],
	verdicts: ParsedValidatorVerdictEvent[],
	nut7States: Map<string, Nut7ProofState>,
): ValidatedBidSet => computeValidatedBids({ auction, bids, verdicts, nut7States, postSettlement: false })

export interface AuctionWinResolution {
	canonicalWinner: ParsedBidEvent | null
	isActiveWinner: boolean
	hasReleasedPath: boolean
}

export const resolveAuctionWinFromEvents = async (
	win: QueuedAuctionWin,
	auctionEvent: NostrEventLike,
	bidEvents: NostrEventLike[],
	verdictEvents: NostrEventLike[],
	pathReleaseEvents: NostrEventLike[],
	now: number,
): Promise<AuctionWinResolution> => {
	const parsedAuctionResult = parseAuctionEvent(toRawEvent(auctionEvent))
	if (!parsedAuctionResult.ok) return { canonicalWinner: null, isActiveWinner: false, hasReleasedPath: false }
	const auction = parsedAuctionResult.value
	const parsedBids = bidEvents
		.map((event) => parseBidEvent(toRawEvent(event)))
		.filter((result): result is { ok: true; value: ParsedBidEvent } => result.ok)
		.map((result) => result.value)
	const parsedVerdicts = verdictEvents
		.map((event) => parseValidatorVerdictEvent(toRawEvent(event)))
		.filter((result): result is { ok: true; value: ParsedValidatorVerdictEvent } => result.ok)
		.map((result) => result.value)
	const parsedPathReleases = pathReleaseEvents
		.map((event) => parsePathReleaseEvent(toRawEvent(event)))
		.filter((result): result is { ok: true; value: ParsedPathReleaseEvent } => result.ok)
		.map((result) => result.value)
	const nut7States = await fetchBidNut7States(parsedBids, auction.mints)
	return resolveAuctionWin(win, auction, parsedBids, parsedVerdicts, parsedPathReleases, nut7States, now)
}

export async function resolveAuctionWin(
	win: QueuedAuctionWin,
	auction: ParsedAuctionEvent,
	bids: ParsedBidEvent[],
	verdicts: ParsedValidatorVerdictEvent[],
	pathReleases: ParsedPathReleaseEvent[],
	nut7States: Map<string, Nut7ProofState>,
	now: number,
	mintKeysetsByMint?: Map<string, MintKeyset[]>,
): Promise<AuctionWinResolution> {
	const validatedBids = getValidatedAuctionBids(auction, bids, verdicts, nut7States)
	const canonicalWinner = validatedBids.canonicalWinner
	const isActiveWinner = canonicalWinner?.id === win.bidEventId
	const hasReleasedPath = isActiveWinner
		? await hasValidatedPathReleaseForAuctionWin(win, auction, validatedBids, pathReleases, now, mintKeysetsByMint)
		: false

	return { canonicalWinner, isActiveWinner, hasReleasedPath }
}

export async function hasValidatedPathReleaseForAuctionWin(
	win: QueuedAuctionWin,
	auction: ParsedAuctionEvent,
	validatedBids: ValidatedBidSet,
	pathReleases: ParsedPathReleaseEvent[],
	now: number,
	mintKeysetsByMint?: Map<string, MintKeyset[]>,
): Promise<boolean> {
	const winner = validatedBids.canonicalWinner
	if (!winner || winner.id !== win.bidEventId) return false

	const chain: ParsedBidEvent[] = []
	const seen = new Set<string>()
	let current: ParsedBidEvent | undefined = winner
	while (current && !seen.has(current.id)) {
		seen.add(current.id)
		chain.unshift(current)
		if (!current.prevBidId) break
		current = validatedBids.validBids.find((bid) => bid.id === current?.prevBidId)
		if (!current) return false
	}

	for (const bid of chain) {
		const matchingReleases = pathReleases.filter((release) => release.bidEventId === bid.id)
		if (matchingReleases.length === 0) return false
		const keysets = mintKeysetsByMint?.get(bid.mint) ?? (await fetchMintKeysets(bid.mint))
		const hasValidRelease = matchingReleases.some(
			(release) =>
				validatePathRelease({
					auction,
					bid,
					release,
					now,
					postCloseDecision: 'winner',
					mintKeysets: keysets,
				}).isValid,
		)
		if (!hasValidRelease) return false
	}

	return chain.length > 0
}

/**
 * Any settlement the auction's seller published for this auction (+coordinate)
 * closes the *read* side of the win flow, whatever its `status`:
 * `publishBidderPathRelease` refuses to release a path once any seller
 * settlement exists for the auction (`src/publish/auctions.tsx` — "Auction
 * already has a settlement"), so a queued win that keeps inviting a settle
 * action for a `reserve_not_met` / `cancelled` / `griefed_no_fallback`
 * settlement is an action the publish layer always rejects - and it blocks the
 * head of the win queue while it does.
 *
 * Pass `{ statuses: ['settled'] }` (see `hasFinalSettlementForAuctionWin`) when
 * the question is specifically "did the sale complete".
 *
 * The seller comparison lowercases both sides, matching the publish gate this
 * predicate has to agree with (`src/publish/auctions.tsx` — the "already has a
 * settlement" check) and the other seller-binding comparisons in
 * `src/lib/auction/events.ts` and `src/lib/auction/settlementDescriptor.ts`.
 * `nostrPubkeyHex` accepts upper- and lower-case hex without normalising, and
 * `sellerPubkey` comes straight from `event.pubkey`, so a raw `===` here would
 * reject an upper-case settlement author the gate accepts — leaving the prompt
 * inviting an action that always fails, which is the failure this predicate
 * exists to close.
 */
export const hasSellerSettlementForAuctionWin = (
	win: Pick<QueuedAuctionWin, 'auctionRootEventId'>,
	auction: NostrEventLike,
	auctionCoordinate: string,
	settlements: NostrEventLike[],
	options?: { statuses?: AuctionSettlementStatus[] },
): boolean => {
	const statuses = options?.statuses
	const sellerPubkey = auction.pubkey?.toLowerCase() ?? ''
	return settlements.some((event) => {
		const parsed = parseSettlementEvent(toRawEvent(event))
		return (
			parsed.ok &&
			(statuses === undefined || statuses.includes(parsed.value.status)) &&
			parsed.value.sellerPubkey.toLowerCase() === sellerPubkey &&
			parsed.value.auctionRootEventId === win.auctionRootEventId &&
			parsed.value.auctionCoordinate === auctionCoordinate
		)
	})
}

/**
 * The `status: 'settled'`-only variant of `hasSellerSettlementForAuctionWin`,
 * kept as the named answer to the different question "did the sale complete?",
 * which the seller-side surfaces have so far asked inline and independently.
 *
 * Deliberately narrow: a `cancelled` / `reserve_not_met` / `griefed_no_fallback`
 * settlement closes the win prompt (see above) but did **not** complete a sale,
 * so a caller must not use this predicate to mean "not settled ⇒ still
 * actionable". No production surface consumes it today.
 */
export const hasFinalSettlementForAuctionWin = (
	win: Pick<QueuedAuctionWin, 'auctionRootEventId'>,
	auction: NostrEventLike,
	auctionCoordinate: string,
	settlements: NostrEventLike[],
): boolean => hasSellerSettlementForAuctionWin(win, auction, auctionCoordinate, settlements, { statuses: ['settled'] })
