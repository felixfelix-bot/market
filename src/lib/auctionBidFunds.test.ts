import { describe, expect, test } from 'bun:test'
import { ReservedProofLedger, computeNetBalances, excludeProofsBySecret, sumReservedByMint, type ReservedProofRef } from './auctionBidFunds'

const EMPTY = new Set<string>()

describe('excludeProofsBySecret', () => {
	test('keeps all proofs when reserved set is empty', () => {
		const proofs = [
			{ secret: 's1', amount: 100 },
			{ secret: 's2', amount: 50 },
		]
		expect(excludeProofsBySecret(proofs, EMPTY)).toEqual(proofs)
	})

	test('removes proofs whose secret is in the reserved set', () => {
		const proofs = [
			{ secret: 's1', amount: 100 },
			{ secret: 's2', amount: 50 },
			{ secret: 's3', amount: 25 },
		]
		const reserved = new Set(['s1', 's3'])
		expect(excludeProofsBySecret(proofs, reserved)).toEqual([{ secret: 's2', amount: 50 }])
	})

	test('returns empty array when every proof is reserved', () => {
		const proofs = [{ secret: 's1', amount: 100 }]
		const reserved = new Set(['s1'])
		expect(excludeProofsBySecret(proofs, reserved)).toEqual([])
	})

	test('handles empty proof list', () => {
		expect(excludeProofsBySecret([], new Set(['s1']))).toEqual([])
	})

	test('preserves non-secret fields on kept proofs', () => {
		const proofs = [
			{ secret: 's1', amount: 100, id: 'k1', C: '0xabc' },
			{ secret: 's2', amount: 50, id: 'k2', C: '0xdef' },
		]
		const kept = excludeProofsBySecret(proofs, new Set(['s2']))
		expect(kept).toEqual([{ secret: 's1', amount: 100, id: 'k1', C: '0xabc' }])
	})
})

describe('sumReservedByMint', () => {
	test('sums reserved value per mint', () => {
		const refs: ReservedProofRef[] = [
			{ secret: 's1', mintUrl: 'https://mint.a', amount: 100 },
			{ secret: 's2', mintUrl: 'https://mint.a', amount: 50 },
			{ secret: 's3', mintUrl: 'https://mint.b', amount: 200 },
		]
		expect(sumReservedByMint(refs)).toEqual({
			'https://mint.a': 150,
			'https://mint.b': 200,
		})
	})

	test('returns empty object for empty input', () => {
		expect(sumReservedByMint([])).toEqual({})
	})

	test('deduplicates by secret within a mint (two auctions reserve same proof)', () => {
		// Per-auction isolation: the same underlying proof committed by two
		// auctions must not double-subtract from available balance.
		const refs: ReservedProofRef[] = [
			{ secret: 's1', mintUrl: 'https://mint.a', amount: 100 },
			{ secret: 's1', mintUrl: 'https://mint.a', amount: 100 },
		]
		expect(sumReservedByMint(refs)).toEqual({ 'https://mint.a': 100 })
	})
})

describe('computeNetBalances', () => {
	test('subtracts reserved value per mint from raw balances', () => {
		const raw = { 'https://mint.a': 1000, 'https://mint.b': 500 }
		const reserved = { 'https://mint.a': 300, 'https://mint.b': 100 }
		expect(computeNetBalances(raw, reserved)).toEqual({
			'https://mint.a': 700,
			'https://mint.b': 400,
		})
	})

	test('clamps to zero when reserved exceeds raw (spent-but-not-yet-consolidated proofs)', () => {
		const raw = { 'https://mint.a': 0 }
		const reserved = { 'https://mint.a': 300 }
		expect(computeNetBalances(raw, reserved)).toEqual({ 'https://mint.a': 0 })
	})

	test('preserves mints that have no reserved value', () => {
		const raw = { 'https://mint.a': 1000, 'https://mint.b': 500 }
		expect(computeNetBalances(raw, { 'https://mint.a': 200 })).toEqual({
			'https://mint.a': 800,
			'https://mint.b': 500,
		})
	})

	test('ignores reserved entries for mints absent from raw balances', () => {
		const raw = { 'https://mint.a': 1000 }
		expect(computeNetBalances(raw, { 'https://mint.unknown': 999 })).toEqual({
			'https://mint.a': 1000,
		})
	})

	test('handles empty raw balances', () => {
		expect(computeNetBalances({}, { 'https://mint.a': 100 })).toEqual({})
	})
})

describe('per-auction proof isolation (issue #4 regression)', () => {
	test('proofs reserved by auction A are not re-selected for auction B', () => {
		// Wallet has proofs s1 (100) and s2 (50) at mint.a. Auction A reserves
		// s1 (100 sats) via its bid lock. When auction B bids 150, the selector
		// must NOT pick the already-committed s1 — only s2 remains spendable.
		const walletProofs = [
			{ secret: 's1', amount: 100 },
			{ secret: 's2', amount: 50 },
		]
		const reservedByAuctionA = new Set(['s1'])

		const spendable = excludeProofsBySecret(walletProofs, reservedByAuctionA)
		expect(spendable).toEqual([{ secret: 's2', amount: 50 }])

		// Selecting 150 sats from only s2 (50) cannot succeed — correct,
		// because the 100 is already committed and must not be double-spent.
		const totalAvailable = spendable.reduce((sum, p) => sum + p.amount, 0)
		expect(totalAvailable).toBe(50)
		expect(totalAvailable < 150).toBe(true)
	})
})

describe('stale-balance defense (issue #3 regression)', () => {
	test('net balance excludes reserved value so the UI never double-counts in-flight bids', () => {
		// Raw dump still shows 1000 (spent-but-unconsolidated proofs inflate it).
		// 300 sats of that 1000 are committed to a pending bid (reserved).
		// The bidder UI must see 700 as available, not 1000.
		const rawBalances = { 'https://mint.a': 1000 }
		const reserved = { 'https://mint.a': 300 }
		expect(computeNetBalances(rawBalances, reserved)).toEqual({ 'https://mint.a': 700 })
	})
})

describe('ReservedProofLedger', () => {
	const ref = (secret: string, mintUrl: string, amount: number): ReservedProofRef => ({ secret, mintUrl, amount })

	test('starts empty', () => {
		const ledger = new ReservedProofLedger()
		expect(ledger.count).toBe(0)
		expect(ledger.getSecrets().size).toBe(0)
		expect(ledger.sumByMint()).toEqual({})
	})

	test('reserve adds secrets and exposes them via getSecrets', () => {
		const ledger = new ReservedProofLedger()
		ledger.reserve([ref('s1', 'https://mint.a', 100), ref('s2', 'https://mint.a', 50)])
		expect(ledger.count).toBe(2)
		expect(ledger.getSecrets()).toEqual(new Set(['s1', 's2']))
	})

	test('reserve deduplicates by secret (two auctions reserve the same proof -> counted once)', () => {
		const ledger = new ReservedProofLedger()
		ledger.reserve([ref('s1', 'https://mint.a', 100)])
		ledger.reserve([ref('s1', 'https://mint.a', 100), ref('s2', 'https://mint.a', 50)])
		expect(ledger.count).toBe(2)
		expect(ledger.sumByMint()).toEqual({ 'https://mint.a': 150 })
	})

	test('sumByMint aggregates reserved value per mint, cross-mint', () => {
		const ledger = new ReservedProofLedger()
		ledger.reserve([ref('s1', 'https://mint.a', 100), ref('s2', 'https://mint.b', 40), ref('s3', 'https://mint.a', 60)])
		expect(ledger.sumByMint()).toEqual({ 'https://mint.a': 160, 'https://mint.b': 40 })
	})

	test('release drops only the listed secrets (lock-failure path)', () => {
		const ledger = new ReservedProofLedger()
		ledger.reserve([ref('s1', 'https://mint.a', 100), ref('s2', 'https://mint.a', 50), ref('s3', 'https://mint.a', 25)])
		// Bid failed -> un-reserve the inputs that were NOT actually spent.
		ledger.release(['s1', 's3'])
		expect(ledger.getSecrets()).toEqual(new Set(['s2']))
		expect(ledger.sumByMint()).toEqual({ 'https://mint.a': 50 })
	})

	test('release ignores unknown secrets and empty input', () => {
		const ledger = new ReservedProofLedger()
		ledger.reserve([ref('s1', 'https://mint.a', 100)])
		ledger.release([])
		ledger.release(['does-not-exist'])
		expect(ledger.count).toBe(1)
	})

	test('clearForMint removes only that mint reservations (consolidate-per-mint path)', () => {
		const ledger = new ReservedProofLedger()
		ledger.reserve([ref('s1', 'https://mint.a', 100), ref('s2', 'https://mint.b', 40), ref('s3', 'https://mint.a', 60)])
		// Mint A reconciled -> its reservations cleared; mint B untouched.
		ledger.clearForMint('https://mint.a')
		expect(ledger.getSecrets()).toEqual(new Set(['s2']))
		expect(ledger.sumByMint()).toEqual({ 'https://mint.b': 40 })
	})

	test('getSecrets returns a defensive copy — mutating it does not affect the ledger', () => {
		const ledger = new ReservedProofLedger()
		ledger.reserve([ref('s1', 'https://mint.a', 100)])
		const snapshot = ledger.getSecrets()
		snapshot.add('s999')
		snapshot.delete('s1')
		// Internal state unchanged.
		expect(ledger.getSecrets()).toEqual(new Set(['s1']))
		expect(ledger.count).toBe(1)
	})

	test('end-to-end bid lifecycle: reserve -> release spent on reconcile -> ledger drains', () => {
		const ledger = new ReservedProofLedger()
		// Two in-flight bids reserve consumed inputs.
		ledger.reserve([ref('in1', 'https://mint.a', 80), ref('in2', 'https://mint.a', 30)])
		expect(ledger.sumByMint()).toEqual({ 'https://mint.a': 110 })
		// consolidateMintProofs confirms both inputs are SPENT at the mint and
		// releases them (local store destroys them -> reservation obsolete).
		ledger.release(['in1', 'in2'])
		expect(ledger.count).toBe(0)
		expect(ledger.sumByMint()).toEqual({})
	})
})
