import { describe, expect, mock, test } from 'bun:test'
import { verifySettlementNotes, checkLosingBidderRefund, type MintQueryPort } from '@/lib/auction-settlement'
import type { AuctionSettlementContent, AuctionBidContent } from '@/lib/schemas/auction-v4v'

const SELLER_PUBKEY = 'a'.repeat(64)
const VALIDATOR_PUBKEY = 'b'.repeat(64)
const MINT_A = 'https://mint-a.example.com'

// ---------------------------------------------------------------------------
// 6a. Settlement note verification (Section 5)
// ---------------------------------------------------------------------------

describe('Settlement note verification', () => {
	const settlement: AuctionSettlementContent = {
		derivation_path: 'm/44/0/0/0/1',
		winning_bid_id: 'e'.repeat(64),
	}

	const validBid: AuctionBidContent = {
		notes: [
			{ recipient_npub: SELLER_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-seller' },
			{ recipient_npub: VALIDATOR_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-validator' },
		],
		derivation_commitment: 'commitment-hash',
	}

	test('returns allValid=true when every note passes verification', async () => {
		const mintQuery: MintQueryPort = {
			verifyLockedNote: mock(async () => ({
				fundsValid: true,
				recipientCorrect: true,
			})),
		}

		const result = await verifySettlementNotes(settlement, validBid, mintQuery)

		expect(result.allValid).toBe(true)
		expect(result.results).toHaveLength(2)
		expect(result.results.every((r) => r.valid)).toBe(true)
		expect(mintQuery.verifyLockedNote).toHaveBeenCalledTimes(2)
	})

	test('returns allValid=false when a note fails funds check', async () => {
		const mintQuery: MintQueryPort = {
			verifyLockedNote: mock(async (_mint, _ref, recipient) => ({
				fundsValid: recipient !== SELLER_PUBKEY,
				recipientCorrect: true,
				error: 'Funds already spent',
			})),
		}

		const result = await verifySettlementNotes(settlement, validBid, mintQuery)

		expect(result.allValid).toBe(false)
		expect(result.results).toHaveLength(2)
		expect(result.results[0].fundsValid).toBe(false)
		expect(result.results[0].valid).toBe(false)
		expect(result.results[0].error).toBe('Funds already spent')
	})

	test('returns allValid=false when recipient is wrong', async () => {
		const mintQuery: MintQueryPort = {
			verifyLockedNote: mock(async () => ({
				fundsValid: true,
				recipientCorrect: false,
				error: 'Locked to different pubkey',
			})),
		}

		const result = await verifySettlementNotes(settlement, validBid, mintQuery)

		expect(result.allValid).toBe(false)
		expect(result.results.every((r) => !r.recipientCorrect)).toBe(true)
	})

	test('handles mint query throwing — marks note as invalid', async () => {
		const mintQuery: MintQueryPort = {
			verifyLockedNote: mock(async () => {
				throw new Error('Mint unreachable')
			}),
		}

		const result = await verifySettlementNotes(settlement, validBid, mintQuery)

		expect(result.allValid).toBe(false)
		expect(result.results.every((r) => r.error === 'Mint unreachable')).toBe(true)
	})

	test('returns allValid=false for empty notes array (no notes to verify)', async () => {
		const mintQuery: MintQueryPort = {
			verifyLockedNote: mock(async () => ({ fundsValid: true, recipientCorrect: true })),
		}
		const emptyBid: AuctionBidContent = {
			notes: [],
			derivation_commitment: 'commitment',
		}

		const result = await verifySettlementNotes(settlement, emptyBid, mintQuery)

		expect(result.allValid).toBe(false)
		expect(result.results).toHaveLength(0)
	})
})

// ---------------------------------------------------------------------------
// 6b. Losing bidder refund flow (Section 6 / decision D3)
// ---------------------------------------------------------------------------

describe('Losing bidder refund flow', () => {
	const WINDOW_END = 1_700_000_000

	test('refund NOT available before settlement window expires', () => {
		const result = checkLosingBidderRefund('requested', WINDOW_END, WINDOW_END - 1000)
		expect(result.refundable).toBe(false)
		expect(result.resultingState).toBe('requested')
		expect(result.reason).toContain('not expired')
	})

	test('refund available after settlement window expires (losing bid)', () => {
		const result = checkLosingBidderRefund('requested', WINDOW_END, WINDOW_END + 1)
		expect(result.refundable).toBe(true)
		expect(result.resultingState).toBe('refunded')
		expect(result.reason).toContain('auto-refundable')
	})

	test('refund available for "attempted" state after window expires', () => {
		const result = checkLosingBidderRefund('attempted', WINDOW_END, WINDOW_END + 1)
		expect(result.refundable).toBe(true)
		expect(result.resultingState).toBe('refunded')
	})

	test('refund available for "wallet_acknowledged" state after window expires', () => {
		const result = checkLosingBidderRefund('wallet_acknowledged', WINDOW_END, WINDOW_END + 1)
		expect(result.refundable).toBe(true)
		expect(result.resultingState).toBe('refunded')
	})

	test('refund available for "expired" state after window expires', () => {
		const result = checkLosingBidderRefund('expired', WINDOW_END, WINDOW_END + 1)
		expect(result.refundable).toBe(true)
		expect(result.resultingState).toBe('refunded')
	})

	test('refund NOT available for winning (settled) bid', () => {
		const result = checkLosingBidderRefund('requested', WINDOW_END, WINDOW_END + 1, true)
		expect(result.refundable).toBe(false)
		expect(result.resultingState).toBe('settled')
		expect(result.reason).toContain('settled')
	})

	test('refund NOT available for already-refunded bid', () => {
		const result = checkLosingBidderRefund('refunded', WINDOW_END, WINDOW_END + 1)
		expect(result.refundable).toBe(false)
		expect(result.resultingState).toBe('refunded')
		expect(result.reason).toContain('already refunded')
	})

	test('refund NOT available for fulfilled bid', () => {
		const result = checkLosingBidderRefund('fulfilled', WINDOW_END, WINDOW_END + 1)
		expect(result.refundable).toBe(false)
		expect(result.resultingState).toBe('fulfilled')
	})

	test('refund NOT available for failed bid', () => {
		const result = checkLosingBidderRefund('failed', WINDOW_END, WINDOW_END + 1)
		expect(result.refundable).toBe(false)
		expect(result.resultingState).toBe('failed')
	})

	test('refund IS available at exact window boundary (now == window end)', () => {
		// The code uses strict < so at now == window end the window is expired.
		const result = checkLosingBidderRefund('requested', WINDOW_END, WINDOW_END)
		expect(result.refundable).toBe(true)
		expect(result.resultingState).toBe('refunded')
	})

	test('refund NOT available one second before window end', () => {
		const result = checkLosingBidderRefund('requested', WINDOW_END, WINDOW_END - 1)
		expect(result.refundable).toBe(false)
		expect(result.resultingState).toBe('requested')
	})

	test('refund available one second after window end', () => {
		const result = checkLosingBidderRefund('requested', WINDOW_END, WINDOW_END + 1)
		expect(result.refundable).toBe(true)
	})
})
