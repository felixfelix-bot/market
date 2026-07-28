/**
 * Unit tests for auction V4V split arithmetic.
 *
 * Tests the pure validation and calculation functions used by the
 * AuctionSplitsEditor component:
 *   - validateV4vSplitSum: sum must equal TOTAL_BPS (10000)
 *   - calculateSellerBps: seller receives the remainder after other splits
 *
 * @see src/lib/schemas/auction-v4v.ts
 * @see src/components/auctions/AuctionSplitsEditor.tsx
 */

import { describe, expect, test } from 'bun:test'

import { TOTAL_BPS } from '@/lib/schemas/auction-kinds'
import { validateV4vSplitSum, type V4vSplit } from '@/lib/schemas/auction-v4v'
import { calculateSellerBps } from '@/components/auctions/AuctionSplitsEditor'

const SELLER_NPUB = 'a'.repeat(64)
const VALIDATOR_NPUB = 'b'.repeat(64)
const PM_DONATION_NPUB = 'c'.repeat(64)

function makeSplit(npub: string, bps: number): V4vSplit {
	return { npub, bps }
}

// ---------------------------------------------------------------------------
// validateV4vSplitSum
// ---------------------------------------------------------------------------

describe('validateV4vSplitSum', () => {
	test('passes when splits sum to exactly 10000', () => {
		const splits: V4vSplit[] = [makeSplit(SELLER_NPUB, 9800), makeSplit(VALIDATOR_NPUB, 100), makeSplit(PM_DONATION_NPUB, 100)]
		expect(validateV4vSplitSum(splits)).toBe(true)
	})

	test('passes with a single split of 10000 (seller only)', () => {
		const splits: V4vSplit[] = [makeSplit(SELLER_NPUB, TOTAL_BPS)]
		expect(validateV4vSplitSum(splits)).toBe(true)
	})

	test('fails when splits sum to 9999 (one short)', () => {
		const splits: V4vSplit[] = [makeSplit(SELLER_NPUB, 9799), makeSplit(VALIDATOR_NPUB, 100), makeSplit(PM_DONATION_NPUB, 100)]
		expect(validateV4vSplitSum(splits)).toBe(false)
	})

	test('fails when splits sum to 10001 (one over)', () => {
		const splits: V4vSplit[] = [makeSplit(SELLER_NPUB, 9801), makeSplit(VALIDATOR_NPUB, 100), makeSplit(PM_DONATION_NPUB, 100)]
		expect(validateV4vSplitSum(splits)).toBe(false)
	})

	test('fails when splits sum to 0 (empty or all-zero)', () => {
		const splits: V4vSplit[] = [makeSplit(SELLER_NPUB, 0), makeSplit(VALIDATOR_NPUB, 0)]
		expect(validateV4vSplitSum(splits)).toBe(false)
	})

	test('fails for an empty array', () => {
		expect(validateV4vSplitSum([])).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// calculateSellerBps
// ---------------------------------------------------------------------------

describe('calculateSellerBps', () => {
	test('returns 10000 when there are no other splits', () => {
		const splits: V4vSplit[] = [makeSplit(SELLER_NPUB, 0)]
		expect(calculateSellerBps(splits, SELLER_NPUB)).toBe(TOTAL_BPS)
	})

	test('returns 10000 minus the sum of non-seller splits', () => {
		const splits: V4vSplit[] = [
			makeSplit(SELLER_NPUB, 0), // will be recalculated
			makeSplit(VALIDATOR_NPUB, 200),
			makeSplit(PM_DONATION_NPUB, 100),
		]
		expect(calculateSellerBps(splits, SELLER_NPUB)).toBe(9700)
	})

	test('returns 0 when non-seller splits consume the full 10000', () => {
		const splits: V4vSplit[] = [makeSplit(SELLER_NPUB, 0), makeSplit(VALIDATOR_NPUB, 5000), makeSplit(PM_DONATION_NPUB, 5000)]
		expect(calculateSellerBps(splits, SELLER_NPUB)).toBe(0)
	})

	test('returns a negative value when non-seller splits exceed 10000', () => {
		const splits: V4vSplit[] = [makeSplit(SELLER_NPUB, 0), makeSplit(VALIDATOR_NPUB, 6000), makeSplit(PM_DONATION_NPUB, 5000)]
		// Overflow — the editor should show this as invalid, but the function
		// itself does not clamp; it reports the raw remainder so the UI can
		// surface the error.
		expect(calculateSellerBps(splits, SELLER_NPUB)).toBe(-1000)
	})

	test('ignores the seller entry when summing other splits', () => {
		const splits: V4vSplit[] = [
			// Seller already has a stale value — it must be ignored.
			makeSplit(SELLER_NPUB, 9999),
			makeSplit(VALIDATOR_NPUB, 300),
		]
		expect(calculateSellerBps(splits, SELLER_NPUB)).toBe(9700)
	})
})
