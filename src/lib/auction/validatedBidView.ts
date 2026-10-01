import type { ValidatedBidSet, BidClassification } from './bidValidation'

/**
 * View-layer derivations over a `ValidatedBidSet` (PR #1280 review B1).
 *
 * `computeValidatedBids` already gates bid classification and winner
 * selection on the DLEQ verdict (pending and `dleq_invalid` bids are
 * excluded from `validBids` and `canonicalWinner`). These helpers expose
 * the SAME authoritative set to the economically authoritative read paths
 * — displayed price, bidder-visible floor, displayed leader, winner-only
 * CTAs, and the seller's reserve/settlement decisions — so a raw relay bid
 * that fails (or has not yet passed) collateral verification can no longer
 * drive them. Raw relay bids may still be rendered as explicitly labelled
 * unverified observations; they must not be authoritative.
 *
 * All functions are pure and total: a `null`/empty set must be handled by
 * the caller (the routes fall back to the legacy raw derivations only
 * while verdict evidence has not loaded).
 */

/**
 * Get the validated top amount for display. Uses `currentTopValidAmount`
 * from the validated set, with `startingBid` as a floor to match the
 * legacy baseline.
 *
 * Returns `startingBid` when there are no valid bids.
 */
export function getValidatedTopAmount(set: ValidatedBidSet, startingBid: number = 0): number {
	return Math.max(set.currentTopValidAmount, startingBid)
}

/**
 * Get the pubkey of the canonical winner from the validated set.
 *
 * Returns null when there is no canonical winner (no valid bids).
 */
export function getValidatedTopBidderPubkey(set: ValidatedBidSet): string | null {
	return set.canonicalWinner?.bidderPubkey ?? null
}

/**
 * Determine the bidder status for a given pubkey based on the validated
 * set.
 *
 * Preserves the existing label vocabulary from auctionBidderStatus.ts:
 * - `'winning'` — user's pubkey matches the canonical winner and auction is not ended
 * - `'outbid'` — user has a valid bid but is not the canonical winner and auction is not ended
 * - `'won'` — user's pubkey matches the canonical winner and auction is ended
 * - `'was_outbid'` — user has a valid bid but is not the canonical winner and auction is ended
 * - `'none'` — user has no valid bid in the validated set
 */
export function getValidatedBidderState(
	set: ValidatedBidSet,
	pubkey: string,
	isEnded: boolean,
): 'winning' | 'outbid' | 'won' | 'was_outbid' | 'none' {
	const winnerPubkey = set.canonicalWinner?.bidderPubkey ?? null

	if (winnerPubkey === pubkey) {
		return isEnded ? 'won' : 'winning'
	}

	// Check if user has ANY valid bid (not just the winning one)
	const hasValidBid = set.validBids.some((bid) => bid.bidderPubkey === pubkey)
	if (hasValidBid) {
		return isEnded ? 'was_outbid' : 'outbid'
	}

	return 'none'
}

/**
 * Whether the reserve is met by any cryptographically verified bid. The
 * seller's `reserve_not_met` decision must not be suppressible by a raw
 * relay bid whose collateral failed (or has not yet passed) verification.
 */
export function isReserveMetFromValidBids(set: ValidatedBidSet, reserve: number): boolean {
	return set.validBids.some((bid) => bid.amount >= reserve)
}

/**
 * Check if a specific bid (by id) is classified as `'valid'` in the
 * validated set. Returns false if the bid is not present in the set at
 * all.
 */
export function isBidValidated(set: ValidatedBidSet, bidId: string): boolean {
	const found = set.classified.find((c) => c.bid.id === bidId)
	return found?.classification === 'valid'
}

/**
 * Get the full classification for a specific bid (by id).
 * Returns `'unknown'` if the bid is not present in the set at all.
 */
export function getBidClassification(set: ValidatedBidSet, bidId: string): BidClassification | 'unknown' {
	const found = set.classified.find((c) => c.bid.id === bidId)
	return found?.classification ?? 'unknown'
}
