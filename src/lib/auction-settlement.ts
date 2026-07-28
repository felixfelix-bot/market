/**
 * Settlement verification and losing-bidder refund logic for V4V auctions.
 *
 * Section 5 — Validator Settlement Verification:
 *   On kind 1024 event, fetch all notes from the winning bid (kind 1023).
 *   For each note: query the mint to verify (a) funds still valid,
 *   (b) note points to correct recipient pubkey.
 *   Publish a validation event confirming/denying.
 *
 * Section 6 — Losing Bidder Auto-Refund:
 *   After the settlement window expires, losing bidders' locked notes are
 *   auto-refundable. No secret was revealed. The client surfaces
 *   "refund available" after the window ends.
 *
 * @see docs/adr/proposals/v4v-dev-splits-auction.md (sections 5, 8)
 * @see docs/adr/proposals/adr-v4v-dev-splits-DECISIONS.md (D2, D3)
 */

import type { AuctionBidContent, BidNoteEntry } from '@/lib/schemas/auction-v4v'
import type { AuctionPaymentState } from '@/lib/schemas/auction-v4v'

// ===========================================================================
// Settlement Verification (Section 5)
// ===========================================================================

/** The result of verifying a single note at a mint. */
export interface NoteVerificationResult {
	/** The note entry that was checked. */
	note: BidNoteEntry
	/** Whether the mint confirmed the note's funds are still valid. */
	fundsValid: boolean
	/** Whether the note is locked to the correct recipient pubkey. */
	recipientCorrect: boolean
	/** Overall: note is valid and redeemable by the intended recipient. */
	valid: boolean
	/** Error message if verification failed. */
	error?: string
}

/**
 * Mint query interface — the caller provides an implementation that hits
 * the actual Cashu mint API. This keeps the module side-effect-light and
 * testable (per src/lib/AGENTS.md).
 */
export interface MintQueryPort {
	/**
	 * Queries a mint to verify a locked note.
	 * Returns whether funds are valid and locked to the correct recipient.
	 */
	verifyLockedNote(
		mintUrl: string,
		lockedNoteRef: string,
		expectedRecipient: string,
	): Promise<{
		fundsValid: boolean
		recipientCorrect: boolean
		error?: string
	}>
}

/**
 * Verifies all notes referenced in the winning bid at settlement time.
 *
 * Logic (ADR section 5, decision D2):
 * 1. The winning bid (kind 1023) contains one locked note per recipient.
 * 2. For each note: query the mint to verify:
 *    (a) funds are still valid
 *    (b) note points to correct recipient pubkey
 * 3. Return per-note results + an overall verdict.
 *
 * The caller (validator) uses these results to publish a validation event
 * confirming or denying the settlement.
 */
export async function verifySettlementNotes(
	winningBid: AuctionBidContent,
	mintQuery: MintQueryPort,
): Promise<{ results: NoteVerificationResult[]; allValid: boolean }> {
	const results = await Promise.all(
		winningBid.notes.map(async (note) => {
			try {
				const mintResult = await mintQuery.verifyLockedNote(note.mint_url, note.locked_note_ref, note.recipient_npub)
				return {
					note,
					fundsValid: mintResult.fundsValid,
					recipientCorrect: mintResult.recipientCorrect,
					valid: mintResult.fundsValid && mintResult.recipientCorrect,
					error: mintResult.error,
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err)
				return {
					note,
					fundsValid: false,
					recipientCorrect: false,
					valid: false,
					error: message,
				}
			}
		}),
	)

	return {
		results,
		allValid: results.length > 0 && results.every((r) => r.valid),
	}
}

// ===========================================================================
// Losing Bidder Auto-Refund (Section 6)
// ===========================================================================

/** Refund eligibility check result for a losing bid. */
export interface RefundEligibilityResult {
	/** Whether the bid is refundable. */
	refundable: boolean
	/** The payment state transition that applies. */
	resultingState: AuctionPaymentState
	/** Reason for the outcome. */
	reason: string
}

/**
 * Determines whether a losing bidder's locked notes are eligible for
 * auto-refund after the settlement window expires.
 *
 * Logic (ADR section 8, decision D3):
 * - The losing bidder's secret was never revealed (no kind 1024 for their bid).
 * - After the settlement window ends, notes are automatically refundable.
 * - No active reclaim is needed — no risk to funds.
 * - The client should surface "refund available" for losing bidders.
 *
 * @param bidState Current payment state of the bid.
 * @param settlementWindowEndsAt Unix timestamp (seconds) when the window ends.
 * @param now Current unix timestamp (seconds). Defaults to Date.now()/1000.
 * @param wasSettled Whether a settlement event (1024) was published referencing this bid.
 */
export function checkLosingBidderRefund(
	bidState: AuctionPaymentState,
	settlementWindowEndsAt: number,
	now: number = Math.floor(Date.now() / 1000),
	wasSettled: boolean = false,
): RefundEligibilityResult {
	// If this bid was settled (won), it's not a losing bid — no refund.
	if (wasSettled) {
		return {
			refundable: false,
			resultingState: 'settled',
			reason: 'Bid was settled (won the auction) — notes unlocked, no refund needed',
		}
	}

	// If the settlement window hasn't expired yet, refund is not yet available.
	if (now < settlementWindowEndsAt) {
		return {
			refundable: false,
			resultingState: bidState,
			reason: 'Settlement window has not expired yet — refund not available',
		}
	}

	// Window expired, this bid was never settled (losing bid), secret never revealed.
	// Notes are auto-refundable.
	switch (bidState) {
		case 'requested':
		case 'attempted':
		case 'wallet_acknowledged':
			return {
				refundable: true,
				resultingState: 'refunded',
				reason: 'Settlement window expired without settlement — losing bid notes auto-refundable (secret never revealed)',
			}
		case 'refunded':
			return {
				refundable: false,
				resultingState: 'refunded',
				reason: 'Notes already refunded',
			}
		case 'expired':
			return {
				refundable: true,
				resultingState: 'refunded',
				reason: 'Bid already marked expired — notes auto-refundable',
			}
		case 'fulfilled':
			return {
				refundable: false,
				resultingState: 'fulfilled',
				reason: 'Notes already fulfilled (redeemed)',
			}
		case 'failed':
			return {
				refundable: false,
				resultingState: 'failed',
				reason: 'Bid already failed — no refund applicable',
			}
		default:
			// settled, receipt_published, confirmed — shouldn't reach here for a losing bid
			return {
				refundable: false,
				resultingState: bidState,
				reason: `Bid in state "${bidState}" is not eligible for refund`,
			}
	}
}
