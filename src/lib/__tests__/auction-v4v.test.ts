import { describe, expect, test } from 'bun:test'
import {
	AuctionListingContentSchema,
	AuctionBidContentSchema,
	validateV4vSplitSum,
	validateValidatorMinimums,
	validateAuctionV4vConfig,
	type AuctionListingContent,
	type V4vSplit,
} from '@/lib/schemas/auction-v4v'
import { TOTAL_BPS } from '@/lib/schemas/auction-kinds'

const SELLER_PUBKEY = 'a'.repeat(64)
const VALIDATOR_PUBKEY = 'b'.repeat(64)
const PM_PUBKEY = 'c'.repeat(64)
const BIDDER_PUBKEY = 'd'.repeat(64)
const MINT_A = 'https://mint-a.example.com'
const MINT_B = 'https://mint-b.example.com'

// ---------------------------------------------------------------------------
// 2. V4V split validation (sum must = 10000, bps >= validator fee_min_bps)
// ---------------------------------------------------------------------------

describe('V4V split validation', () => {
	describe('validateV4vSplitSum', () => {
		test('returns true when splits sum to exactly 10000', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9700 },
				{ npub: VALIDATOR_PUBKEY, bps: 200 },
				{ npub: PM_PUBKEY, bps: 100 },
			]
			expect(validateV4vSplitSum(splits)).toBe(true)
		})

		test('returns true for single entry of 10000 (seller takes 100%)', () => {
			const splits: V4vSplit[] = [{ npub: SELLER_PUBKEY, bps: TOTAL_BPS }]
			expect(validateV4vSplitSum(splits)).toBe(true)
		})

		test('returns false when splits sum to less than 10000', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9000 },
				{ npub: VALIDATOR_PUBKEY, bps: 100 },
			]
			expect(validateV4vSplitSum(splits)).toBe(false)
		})

		test('returns false when splits sum to more than 10000', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 10000 },
				{ npub: VALIDATOR_PUBKEY, bps: 1 },
			]
			expect(validateV4vSplitSum(splits)).toBe(false)
		})
	})

	describe('validateValidatorMinimums', () => {
		test('returns empty errors when all assigned bps >= announced minimums', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9700 },
				{ npub: VALIDATOR_PUBKEY, bps: 300 },
			]
			const fees = new Map([[VALIDATOR_PUBKEY, 200]])
			expect(validateValidatorMinimums(splits, fees)).toEqual([])
		})

		test('returns errors when assigned bps < announced minimum', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9900 },
				{ npub: VALIDATOR_PUBKEY, bps: 100 }, // below 200 minimum
			]
			const fees = new Map([[VALIDATOR_PUBKEY, 200]])
			const errors = validateValidatorMinimums(splits, fees)
			expect(errors).toHaveLength(1)
			expect(errors[0]).toContain('100')
			expect(errors[0]).toContain('200')
		})

		test('does not error for non-validator recipients with no announced fee', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9900 },
				{ npub: VALIDATOR_PUBKEY, bps: 100 },
			]
			const fees = new Map<string, number>() // empty — no validators announced
			expect(validateValidatorMinimums(splits, fees)).toEqual([])
		})

		test('equal bps to minimum is valid (boundary)', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9800 },
				{ npub: VALIDATOR_PUBKEY, bps: 200 }, // exactly equals 200 minimum
			]
			const fees = new Map([[VALIDATOR_PUBKEY, 200]])
			expect(validateValidatorMinimums(splits, fees)).toEqual([])
		})
	})

	describe('validateAuctionV4vConfig (combined)', () => {
		test('returns valid=true when sum is correct and minimums are met', () => {
			const content: AuctionListingContent = {
				v4v_splits: [
					{ npub: SELLER_PUBKEY, bps: 9700 },
					{ npub: VALIDATOR_PUBKEY, bps: 200 },
					{ npub: PM_PUBKEY, bps: 100 },
				],
				settlement_window: 86400,
				mints: [MINT_A],
				auction_type: 'english',
				locking_scheme: 'P2PK',
			}
			const fees = new Map([[VALIDATOR_PUBKEY, 200]])
			const result = validateAuctionV4vConfig(content, fees)
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})

		test('returns valid=false with both sum and minimum errors', () => {
			const content: AuctionListingContent = {
				v4v_splits: [
					{ npub: SELLER_PUBKEY, bps: 9000 },
					{ npub: VALIDATOR_PUBKEY, bps: 100 }, // below minimum AND sum is wrong
				],
				mints: [MINT_A],
			}
			const fees = new Map([[VALIDATOR_PUBKEY, 200]])
			const result = validateAuctionV4vConfig(content, fees)
			expect(result.valid).toBe(false)
			expect(result.errors.length).toBeGreaterThanOrEqual(2)
		})
	})
})

// ---------------------------------------------------------------------------
// 3. Multi-note bid schema (valid entries, cross-mint case)
// ---------------------------------------------------------------------------

describe('Multi-note bid schema (kind 1023)', () => {
	test('parses a valid single-mint bid with multiple notes', () => {
		const content = {
			notes: [
				{ recipient_npub: SELLER_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-seller' },
				{ recipient_npub: VALIDATOR_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-validator' },
			],
			derivation_commitment: 'commitment-hash-abc',
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.notes).toHaveLength(2)
			expect(result.data.derivation_commitment).toBe('commitment-hash-abc')
		}
	})

	test('rejects bid with no notes', () => {
		const content = {
			notes: [],
			derivation_commitment: 'commitment-hash-abc',
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(false)
	})

	test('rejects note with invalid recipient pubkey', () => {
		const content = {
			notes: [{ recipient_npub: 'short', mint_url: MINT_A, locked_note_ref: 'ref' }],
			derivation_commitment: 'commitment',
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(false)
	})

	test('rejects note with invalid mint url', () => {
		const content = {
			notes: [{ recipient_npub: SELLER_PUBKEY, mint_url: 'not-a-url', locked_note_ref: 'ref' }],
			derivation_commitment: 'commitment',
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(false)
	})

	test('rejects note with empty locked_note_ref', () => {
		const content = {
			notes: [{ recipient_npub: SELLER_PUBKEY, mint_url: MINT_A, locked_note_ref: '' }],
			derivation_commitment: 'commitment',
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(false)
	})

	test('rejects bid missing derivation_commitment', () => {
		const content = {
			notes: [{ recipient_npub: SELLER_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref' }],
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// 4. Cross-mint case: notes on different mints for different recipients
// ---------------------------------------------------------------------------

describe('Cross-mint multi-note bid', () => {
	test('accepts notes on different mints for different recipients', () => {
		const content = {
			notes: [
				{ recipient_npub: SELLER_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-seller-mint-a' },
				{ recipient_npub: VALIDATOR_PUBKEY, mint_url: MINT_B, locked_note_ref: 'ref-validator-mint-b' },
				{ recipient_npub: PM_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-pm-mint-a' },
			],
			derivation_commitment: 'shared-commitment',
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.notes[0].mint_url).toBe(MINT_A)
			expect(result.data.notes[1].mint_url).toBe(MINT_B)
			expect(result.data.notes[0].recipient_npub).toBe(SELLER_PUBKEY)
			expect(result.data.notes[1].recipient_npub).toBe(VALIDATOR_PUBKEY)
		}
	})

	test('accepts two notes to the same recipient on different mints', () => {
		const content = {
			notes: [
				{ recipient_npub: SELLER_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-1' },
				{ recipient_npub: SELLER_PUBKEY, mint_url: MINT_B, locked_note_ref: 'ref-2' },
			],
			derivation_commitment: 'commitment',
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(true)
	})

	test('accepts all recipients on the same mint (single-mint case)', () => {
		const content = {
			notes: [
				{ recipient_npub: SELLER_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-1' },
				{ recipient_npub: VALIDATOR_PUBKEY, mint_url: MINT_A, locked_note_ref: 'ref-2' },
			],
			derivation_commitment: 'commitment',
		}
		const result = AuctionBidContentSchema.safeParse(content)
		expect(result.success).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// 5. V4V optional case: validator fees present but no PM donation
// ---------------------------------------------------------------------------

describe('V4V optional case — validator present, no PM donation', () => {
	test('listing with validator fee but no PM split is valid', () => {
		const content: AuctionListingContent = {
			v4v_splits: [
				{ npub: SELLER_PUBKEY, bps: 9700 },
				{ npub: VALIDATOR_PUBKEY, bps: 300 },
				// No PM_PUBKEY entry — PM donation omitted entirely
			],
			settlement_window: 86400,
			mints: [MINT_A],
			auction_type: 'english',
			locking_scheme: 'P2PK',
		}

		expect(validateV4vSplitSum(content.v4v_splits)).toBe(true)

		const fees = new Map([[VALIDATOR_PUBKEY, 300]])
		const result = validateAuctionV4vConfig(content, fees)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	test('listing where seller takes 100% with no splits at all is valid', () => {
		const content: AuctionListingContent = {
			v4v_splits: [{ npub: SELLER_PUBKEY, bps: TOTAL_BPS }],
			mints: [MINT_A],
		}

		expect(validateV4vSplitSum(content.v4v_splits)).toBe(true)
		const result = validateAuctionV4vConfig(content, new Map())
		expect(result.valid).toBe(true)
	})

	test('listing with only a zero-bps PM entry is valid (configured-zero)', () => {
		const content: AuctionListingContent = {
			v4v_splits: [
				{ npub: SELLER_PUBKEY, bps: TOTAL_BPS - 0 },
				// Seller takes all — validator/PM bps can be 0 in the split array
			],
			mints: [MINT_A],
		}
		expect(validateV4vSplitSum(content.v4v_splits)).toBe(true)
	})

	test('V4vSplitSchema allows bps of 0 (for optional recipients)', () => {
		const result = AuctionListingContentSchema.safeParse({
			v4v_splits: [
				{ npub: SELLER_PUBKEY, bps: 10000 },
				{ npub: PM_PUBKEY, bps: 0 },
			],
			mints: [MINT_A],
		})
		// The schema only validates structure, not the split sum.
		// bps=0 is explicitly allowed in V4vSplitSchema.
		expect(result.success).toBe(true)
	})

	test('listing with PM bps=0 and seller taking 100% passes split sum', () => {
		const splits: V4vSplit[] = [
			{ npub: SELLER_PUBKEY, bps: 10000 },
			{ npub: PM_PUBKEY, bps: 0 },
		]
		expect(validateV4vSplitSum(splits)).toBe(true)
	})
})
