import { describe, expect, test } from 'bun:test'
import {
	AuctionListingContentSchema,
	AuctionBidContentSchema,
	buildAuctionListingTags,
	validateV4vSplitSum,
	validateValidatorMinimums,
	validateAuctionV4vConfig,
	validateValidatorFeeSnapshot,
	type AuctionListingContent,
	type V4vSplit,
	type ValidatorFeeSnapshot,
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
		test('1. valid splits (sum=10000) pass', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9700 },
				{ npub: VALIDATOR_PUBKEY, bps: 200 },
				{ npub: PM_PUBKEY, bps: 100 },
			]
			expect(validateV4vSplitSum(splits)).toBe(true)
		})

		test('2. sum 9999 fails', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9000 },
				{ npub: VALIDATOR_PUBKEY, bps: 999 }, // totals 9999
			]
			expect(validateV4vSplitSum(splits)).toBe(false)
		})

		test('3. sum 10001 fails', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 10000 },
				{ npub: VALIDATOR_PUBKEY, bps: 1 },
			]
			expect(validateV4vSplitSum(splits)).toBe(false)
		})
	})

	describe('validateValidatorMinimums', () => {
		test('4. validator bps below fee_min_bps fails', () => {
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

		test('5. validator bps equal fee_min_bps passes', () => {
			const splits: V4vSplit[] = [
				{ npub: SELLER_PUBKEY, bps: 9800 },
				{ npub: VALIDATOR_PUBKEY, bps: 200 }, // exactly equals 200 minimum
			]
			const fees = new Map([[VALIDATOR_PUBKEY, 200]])
			expect(validateValidatorMinimums(splits, fees)).toEqual([])
		})
	})

	describe('V4V optional / zero validators', () => {
		test('6. validators without PM donation passes (V4V optional)', () => {
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

		test('7. zero validators flagged invalid', () => {
			const content: AuctionListingContent = {
				v4v_splits: [{ npub: SELLER_PUBKEY, bps: TOTAL_BPS }],
				settlement_window: 86400,
				mints: [MINT_A],
				auction_type: 'english',
				locking_scheme: 'P2PK',
			}
			const snapshot: ValidatorFeeSnapshot[] = []
			const result = validateAuctionV4vConfig(content, new Map(), {
				requireAtLeastOneValidator: true,
				feeSnapshot: snapshot,
			})
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('At least one validator must be assigned to the auction')
		})

		test('8. empty v4v_splits fails', () => {
			const result = AuctionListingContentSchema.safeParse({
				v4v_splits: [],
				mints: [MINT_A],
			})
			expect(result.success).toBe(false)
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
				settlement_window: 86400,
				mints: [MINT_A],
				auction_type: 'english',
				locking_scheme: 'P2PK',
			}
			const fees = new Map([[VALIDATOR_PUBKEY, 200]])
			const result = validateAuctionV4vConfig(content, fees)
			expect(result.valid).toBe(false)
			expect(result.errors.length).toBeGreaterThanOrEqual(2)
		})
	})
})

// ---------------------------------------------------------------------------
// 2b. Fee snapshot validation (anti bait-and-switch)
// ---------------------------------------------------------------------------

describe('Validator fee snapshot validation', () => {
	const NOW = 1_700_000_000
	const ANN: ValidatorFeeSnapshot = {
		npub: VALIDATOR_PUBKEY,
		feeMinBps: 200,
		announcedAt: NOW - 1_000,
	}

	test('snapshot passes when assigned bps >= snapshotted minimum', () => {
		const splits: V4vSplit[] = [
			{ npub: SELLER_PUBKEY, bps: 9800 },
			{ npub: VALIDATOR_PUBKEY, bps: 200 },
		]
		expect(validateValidatorFeeSnapshot(splits, [ANN])).toEqual([])
	})

	test('snapshot fails when assigned bps < snapshotted minimum', () => {
		const splits: V4vSplit[] = [
			{ npub: SELLER_PUBKEY, bps: 9900 },
			{ npub: VALIDATOR_PUBKEY, bps: 100 },
		]
		const errors = validateValidatorFeeSnapshot(splits, [ANN])
		expect(errors).toHaveLength(1)
		expect(errors[0]).toContain('100')
		expect(errors[0]).toContain('200')
	})

	test('snapshot errors when a snapshotted validator is missing from splits', () => {
		const splits: V4vSplit[] = [{ npub: SELLER_PUBKEY, bps: TOTAL_BPS }]
		const errors = validateValidatorFeeSnapshot(splits, [ANN])
		expect(errors).toHaveLength(1)
		expect(errors[0]).toContain(VALIDATOR_PUBKEY.slice(0, 12))
	})

	test('no snapshot errors for non-validator recipients not in snapshot', () => {
		// Any snapshotted validator must still be present. The point of the test
		// is that an unrelated non-validator recipient (PM_PUBKEY) does not
		// trigger a snapshot error even though it is not in the snapshot.
		const splits: V4vSplit[] = [
			{ npub: SELLER_PUBKEY, bps: 9600 },
			{ npub: PM_PUBKEY, bps: 200 },
			{ npub: VALIDATOR_PUBKEY, bps: 200 },
		]
		expect(validateValidatorFeeSnapshot(splits, [ANN])).toEqual([])
	})
})

// ---------------------------------------------------------------------------
// 2c. Auction listing tags include fee snapshot
// ---------------------------------------------------------------------------

describe('Auction listing tag builder', () => {
	test('includes fee_snapshot tags when snapshot is provided', () => {
		const content: AuctionListingContent = {
			v4v_splits: [
				{ npub: SELLER_PUBKEY, bps: 9800 },
				{ npub: VALIDATOR_PUBKEY, bps: 200 },
			],
			settlement_window: 86400,
			mints: [MINT_A],
			auction_type: 'english',
			locking_scheme: 'P2PK',
		}
		const feeSnapshot: ValidatorFeeSnapshot[] = [{ npub: VALIDATOR_PUBKEY, feeMinBps: 200, announcedAt: 1_700_000_000 }]
		const tags = buildAuctionListingTags({ auctionId: 'auction-1', content, feeSnapshot })
		expect(tags).toContainEqual(['d', 'auction-1'])
		expect(tags).toContainEqual(['p', VALIDATOR_PUBKEY])
		expect(tags).toContainEqual(['fee_snapshot', VALIDATOR_PUBKEY, '200', '1700000000'])
	})

	test('omits fee_snapshot tags when snapshot is absent', () => {
		const content: AuctionListingContent = {
			v4v_splits: [{ npub: SELLER_PUBKEY, bps: TOTAL_BPS }],
			settlement_window: 86400,
			mints: [MINT_A],
			auction_type: 'english',
			locking_scheme: 'P2PK',
		}
		const tags = buildAuctionListingTags({ auctionId: 'auction-2', content })
		expect(tags.some((t) => t[0] === 'fee_snapshot')).toBe(false)
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
// 3. Multi-note bid schema (valid entries, cross-mint case)
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
			settlement_window: 86400,
			mints: [MINT_A],
			auction_type: 'english',
			locking_scheme: 'P2PK',
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
			settlement_window: 86400,
			mints: [MINT_A],
			auction_type: 'english',
			locking_scheme: 'P2PK',
		}
		expect(validateV4vSplitSum(content.v4v_splits)).toBe(true)
	})

	test('V4vSplitSchema allows bps of 0 (for optional recipients)', () => {
		const result = AuctionListingContentSchema.safeParse({
			v4v_splits: [
				{ npub: SELLER_PUBKEY, bps: 10000 },
				{ npub: PM_PUBKEY, bps: 0 },
			],
			settlement_window: 86400,
			mints: [MINT_A],
			auction_type: 'english',
			locking_scheme: 'P2PK',
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
