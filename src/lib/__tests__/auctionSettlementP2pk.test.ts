import { describe, expect, test } from 'bun:test'
import { HDKey } from '@scure/bip32'
import { getEncodedToken, type MintKeyset, type Proof } from '@cashu/cashu-ts'
import { deriveAuctionChildP2pkPubkeyFromXpub } from '@/lib/auctionP2pk'
import { preflightAuctionSettlementP2pk, preflightAuctionSettlementP2pkChain } from '@/lib/auctionSettlementP2pk'

const makeFixture = () => {
	const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1)
	const account = HDKey.fromMasterSeed(seed).derive("m/30408'/0'/0'")
	const xpub = account.publicExtendedKey
	if (!xpub) throw new Error('Failed to derive test xpub')

	const derivationPath = '7/11/13/17/19'
	const childPubkey = deriveAuctionChildP2pkPubkeyFromXpub(xpub, derivationPath)

	return {
		xpub,
		derivationPath,
		childPubkey,
		childPubkeyXOnly: childPubkey.slice(2),
		mismatchedChildPubkey: deriveAuctionChildP2pkPubkeyFromXpub(xpub, '1/2/3/4/5'),
	}
}

const makeP2pkSecret = (lockPubkey: string): string =>
	JSON.stringify([
		'P2PK',
		{
			nonce: '00'.repeat(32),
			data: lockPubkey,
			tags: [['locktime', '2000000000']],
		},
	])

const makeToken = (secret: string): string => {
	const proof: Proof = {
		id: '009a1f293253e41e',
		amount: 1,
		secret,
		C: '02'.padEnd(66, '1'),
	}

	return getEncodedToken({
		mint: 'https://mint.example',
		proofs: [proof],
	})
}

describe('auction settlement P2PK preflight', () => {
	test('accepts compressed token lock pubkey matching derived child key', () => {
		const fixture = makeFixture()
		const result = preflightAuctionSettlementP2pk({
			auctionP2pkXpub: fixture.xpub,
			derivationPath: fixture.derivationPath,
			settlementPlanChildPubkey: fixture.childPubkey,
			token: makeToken(makeP2pkSecret(fixture.childPubkey)),
		})

		expect(result.derivedChildPubkey).toBe(fixture.childPubkey)
		expect(result.tokenLockPubkey).toBe(fixture.childPubkey)
	})

	test('accepts settlement-plan childPubkey in x-only form only as comparison metadata', () => {
		const fixture = makeFixture()
		const result = preflightAuctionSettlementP2pk({
			auctionP2pkXpub: fixture.xpub,
			derivationPath: fixture.derivationPath,
			settlementPlanChildPubkey: fixture.childPubkeyXOnly,
			token: makeToken(makeP2pkSecret(fixture.childPubkey)),
		})

		expect(result.settlementPlanChildPubkey).toBe(fixture.childPubkeyXOnly)
		expect(result.tokenLockPubkey).toBe(fixture.childPubkey)
	})

	test('rejects token lock pubkey that is x-only', () => {
		const fixture = makeFixture()

		expect(() =>
			preflightAuctionSettlementP2pk({
				auctionP2pkXpub: fixture.xpub,
				derivationPath: fixture.derivationPath,
				settlementPlanChildPubkey: fixture.childPubkey,
				token: makeToken(makeP2pkSecret(fixture.childPubkeyXOnly)),
			}),
		).toThrow('Winner token P2PK lock pubkey is not compressed; cannot settle this bid safely')
	})

	test('rejects malformed token P2PK secret', () => {
		const fixture = makeFixture()

		expect(() =>
			preflightAuctionSettlementP2pk({
				auctionP2pkXpub: fixture.xpub,
				derivationPath: fixture.derivationPath,
				settlementPlanChildPubkey: fixture.childPubkey,
				token: makeToken('not-json'),
			}),
		).toThrow('Winner token proof secret is not a valid P2PK secret')
	})

	test('rejects derived child key mismatch against token lock pubkey', () => {
		const fixture = makeFixture()

		expect(() =>
			preflightAuctionSettlementP2pk({
				auctionP2pkXpub: fixture.xpub,
				derivationPath: fixture.derivationPath,
				settlementPlanChildPubkey: fixture.childPubkey,
				token: makeToken(makeP2pkSecret(fixture.mismatchedChildPubkey)),
			}),
		).toThrow('Winner token P2PK lock pubkey does not match auction p2pk_xpub + derivation path')
	})

	test('rejects settlement-plan childPubkey mismatch', () => {
		const fixture = makeFixture()

		expect(() =>
			preflightAuctionSettlementP2pk({
				auctionP2pkXpub: fixture.xpub,
				derivationPath: fixture.derivationPath,
				settlementPlanChildPubkey: fixture.mismatchedChildPubkey,
				token: makeToken(makeP2pkSecret(fixture.childPubkey)),
			}),
		).toThrow('Settlement plan child pubkey does not match auction p2pk_xpub + derivation path')
	})

	test('rejects #824-shaped x-only settlement metadata and x-only token lock before redemption', () => {
		const fixture = makeFixture()

		expect(() =>
			preflightAuctionSettlementP2pk({
				auctionP2pkXpub: fixture.xpub,
				derivationPath: fixture.derivationPath,
				settlementPlanChildPubkey: fixture.childPubkeyXOnly,
				token: makeToken(makeP2pkSecret(fixture.childPubkeyXOnly)),
			}),
		).toThrow('Winner token P2PK lock pubkey is not compressed; cannot settle this bid safely')
	})
})

// Regression coverage for issue #5 / upstream #1022: settlement must
// validate EVERY release leg BEFORE redeeming any of them. Previously the
// per-leg preflight ran inside the redemption loop, so a failure on leg N
// left legs 1..N-1 already redeemed (partial settlement / stuck seller).
describe('auction settlement P2PK chain preflight (atomicity, #1022)', () => {
	const makeChainFixture = (legCount: number) => {
		const base = makeFixture()
		const legs = Array.from({ length: legCount }, (_, index) => {
			const derivationPath = `7/11/13/17/${19 + index}` // unique per leg
			const childPubkey = deriveAuctionChildP2pkPubkeyFromXpub(base.xpub, derivationPath)
			return { derivationPath, childPubkey }
		})
		return { xpub: base.xpub, legs }
	}

	const buildReleases = (fixture: ReturnType<typeof makeChainFixture>, poisonLegIndex?: number) =>
		fixture.legs.map((leg, index) => {
			// Poison leg locks its token to a DIFFERENT leg's child pubkey,
			// simulating a bad/unredeemable token while the settlement-plan
			// metadata still looks plausible.
			const lockTarget =
				poisonLegIndex === index ? fixture.legs[(index + 1) % Math.max(1, fixture.legs.length)].childPubkey : leg.childPubkey
			return {
				mintUrl: 'https://mint.example',
				derivationPath: leg.derivationPath,
				childPubkey: leg.childPubkey,
				token: makeToken(makeP2pkSecret(lockTarget)),
			}
		})

	const emptyKeysetMap = () => new Map<string, MintKeyset[]>()

	test('accepts a chain where every leg validates', () => {
		const fixture = makeChainFixture(3)
		const result = preflightAuctionSettlementP2pkChain({
			auctionP2pkXpub: fixture.xpub,
			releases: buildReleases(fixture),
			mintKeysetsByUrl: emptyKeysetMap(),
		})
		expect(result.legs).toHaveLength(3)
		for (let i = 0; i < fixture.legs.length; i++) {
			expect(result.legs[i].derivedChildPubkey).toBe(fixture.legs[i].childPubkey)
			expect(result.legs[i].tokenLockPubkey).toBe(fixture.legs[i].childPubkey)
		}
	})

	test('rejects the ENTIRE chain when any single leg has a bad token (no partial pass)', () => {
		const fixture = makeChainFixture(3)
		expect(() =>
			preflightAuctionSettlementP2pkChain({
				auctionP2pkXpub: fixture.xpub,
				releases: buildReleases(fixture, 1), // leg index 1 is poison
				mintKeysetsByUrl: emptyKeysetMap(),
			}),
		).toThrow('Winner token P2PK lock pubkey does not match auction p2pk_xpub + derivation path')
	})

	test('a single-leg chain delegates correctly to the per-leg preflight', () => {
		const fixture = makeChainFixture(1)
		const result = preflightAuctionSettlementP2pkChain({
			auctionP2pkXpub: fixture.xpub,
			releases: buildReleases(fixture),
			mintKeysetsByUrl: emptyKeysetMap(),
		})
		expect(result.legs).toHaveLength(1)
		expect(result.legs[0].tokenLockPubkey).toBe(fixture.legs[0].childPubkey)
	})

	test('empty releases returns an empty legs array (no-op settlement)', () => {
		const fixture = makeChainFixture(0)
		const result = preflightAuctionSettlementP2pkChain({
			auctionP2pkXpub: fixture.xpub,
			releases: [],
			mintKeysetsByUrl: emptyKeysetMap(),
		})
		expect(result.legs).toHaveLength(0)
	})
})
