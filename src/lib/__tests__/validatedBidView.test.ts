import { describe, expect, test } from 'bun:test'
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { computeValidatedBids } from '../auction/bidValidation'
import type { ParsedAuctionEvent, ParsedBidEvent, ParsedValidatorVerdictEvent, MinBidCurve } from '../auction/events'
import { APP_AUCTION_DLEQ_ROLLOUT_START_AT, type Nut7ProofState } from '../auction/constants'
import { hashToCurveHexFromString } from '../cashu/hashToCurve'
import { makeDleqKeyset as makeFixtureKeyset, makeHonestDleqProof } from '../cashu/dleqFixture'
import type { MintKeys } from '@cashu/cashu-ts'
import {
	getBidClassification,
	getValidatedBidderState,
	getValidatedTopAmount,
	getValidatedTopBidderPubkey,
	isBidValidated,
	isReserveMetFromValidBids,
} from '../auction/validatedBidView'

// =============================================================================
// validatedBidView — the B1 read-path fix (PR #1280 review 5235113240).
//
// B1: "The DLEQ verdict gates bid classification and winner selection. It
// does not gate the displayed price, the bidder-visible floor, the displayed
// leader, or the seller's settlement intent." A hand-crafted kind-1023
// claiming amount=1_000_000 with a 1-sat (or fabricated) proof is an
// unauthenticated relay POST away; every viewer reading the raw relay array
// would display it as the current price, raise the min-bid floor on honest
// bidders' forms, and (on the seller dashboard) mark the reserve met.
//
// These tests pin that the AUTHORITATIVE derivations (price floor, leader,
// winner, reserve-met, bidder status) come from `computeValidatedBids`
// output, while preserving the established fail-safe semantics:
//   - absent keyset map            => pending (never valid, never winner)
//   - entry absent from a map      => pending
//   - positive failure over
//     complete evidence            => dleq_invalid
//   - pending excluded from validBids and from the winner
// =============================================================================

const SELLER_PK = 'a'.repeat(64)
const HONEST_BIDDER_PK = 'b'.repeat(64)
const ATTACKER_PK = '9'.repeat(64)
const V1 = 'c'.repeat(64)
const V2 = 'd'.repeat(64)
const COMPRESSED_PK = '02' + 'd'.repeat(64)
const REFUND_PK = '03' + 'e'.repeat(64)

const NO_CURVE: MinBidCurve = { shape: 'none', peakMultiplier: 1, raw: '' }

const stubRawEvent = (kind: number, pubkey: string): NDKEvent =>
	({
		kind,
		pubkey,
		content: '',
		tags: [] as string[][],
		id: 'stub',
		created_at: 0,
	}) as unknown as NDKEvent

const buildAuction = (overrides: Partial<ParsedAuctionEvent> = {}): ParsedAuctionEvent => {
	const startAt = overrides.startAt ?? 1_000
	const endAt = overrides.endAt ?? 2_000
	const maxEndAt = overrides.maxEndAt ?? 2_100
	const settlementGrace = overrides.settlementGrace ?? 3_600
	return {
		rawEvent: stubRawEvent(30408, SELLER_PK),
		dTag: 'auction-test',
		sellerPubkey: SELLER_PK,
		coordinate: `30408:${SELLER_PK}:auction-test`,
		rootEventId: '1'.repeat(64),
		title: 'Test Auction',
		content: '',
		auctionType: 'english',
		startAt,
		endAt,
		maxEndAt,
		settlementGrace,
		currency: 'SAT',
		reserve: 0,
		startingBid: 1_000,
		bidIncrement: 100,
		minBidCurve: NO_CURVE,
		settlementPolicy: 'cashu_p2pk_bidder_path_v1',
		keyScheme: 'hd_p2pk',
		mints: ['https://mint.test'],
		p2pkXpub: 'xpub-stub',
		auditors: [V1, V2],
		auditorQuorum: 2,
		maxSkewSec: 60,
		fallbackDelaySec: 1_800,
		vadiumRatioBps: 10_000,
		schema: 'auction_v1',
		dleqRequired: overrides.dleqRequired ?? false,
		...overrides,
	}
}

const buildLockSecret = (childPubkey: string, locktime: number, refundPubkey: string, nonce: string): string =>
	JSON.stringify([
		'P2PK',
		{
			nonce,
			data: childPubkey,
			tags: [
				['sigflag', 'SIG_INPUTS'],
				['locktime', String(locktime)],
				['refund', refundPubkey],
				['n_sigs_refund', '1'],
			],
		},
	])

let bidCounter = 0
const buildBid = (auction: ParsedAuctionEvent, overrides: Partial<ParsedBidEvent> = {}): ParsedBidEvent => {
	bidCounter += 1
	const locktime = overrides.locktime ?? auction.maxEndAt + auction.settlementGrace
	const childPubkey = overrides.childPubkey ?? COMPRESSED_PK
	const refundPubkey = overrides.refundPubkey ?? REFUND_PK
	const lockSecrets = overrides.lockSecrets ?? [buildLockSecret(childPubkey, locktime, refundPubkey, `nonce-${bidCounter}`)]
	const proofYs = overrides.proofYs ?? lockSecrets.map((s) => hashToCurveHexFromString(s))
	return {
		rawEvent: stubRawEvent(1023, HONEST_BIDDER_PK),
		id: overrides.id ?? `${bidCounter}`.padStart(64, '0'),
		bidderPubkey: overrides.bidderPubkey ?? HONEST_BIDDER_PK,
		createdAt: overrides.createdAt ?? 1_500,
		auctionRootEventId: auction.rootEventId,
		auctionCoordinate: auction.coordinate,
		sellerPubkey: auction.sellerPubkey,
		amount: overrides.amount ?? 5_000,
		legLockedAmount: overrides.legLockedAmount ?? overrides.amount ?? 5_000,
		currency: 'SAT',
		mint: overrides.mint ?? 'https://mint.test',
		locktime,
		refundPubkey,
		childPubkey,
		lockSecrets,
		proofYs,
		dleqProofs: overrides.dleqProofs,
		createdForEndAt: auction.endAt,
		bidNonce: 'test-bid-nonce',
		keyScheme: 'hd_p2pk',
		status: 'locked',
		prevBidId: overrides.prevBidId,
	}
}

let verdictCounter = 0
const buildVerdict = (bid: ParsedBidEvent, overrides: Partial<ParsedValidatorVerdictEvent> = {}): ParsedValidatorVerdictEvent => {
	verdictCounter += 1
	return {
		rawEvent: stubRawEvent(30440, overrides.validatorPubkey ?? V1),
		id: overrides.id ?? `verdict-${verdictCounter}`,
		validatorPubkey: overrides.validatorPubkey ?? V1,
		createdAt: overrides.createdAt ?? 1_505,
		dTag: overrides.dTag ?? `${bid.bidderPubkey}:${bid.auctionRootEventId}:${bid.id}`,
		bidderPubkey: bid.bidderPubkey,
		auctionRootEventId: bid.auctionRootEventId,
		auctionCoordinate: bid.auctionCoordinate,
		bidEventId: bid.id,
		claim: overrides.claim ?? 'valid_bid_placed',
		observedAt: overrides.observedAt ?? bid.createdAt + 5,
		reason: overrides.reason,
	}
}

const quorumVerdicts = (bid: ParsedBidEvent): ParsedValidatorVerdictEvent[] => [
	buildVerdict(bid, { validatorPubkey: V1, observedAt: bid.createdAt + 5 }),
	buildVerdict(bid, { validatorPubkey: V2, observedAt: bid.createdAt + 30 }),
]

const unspent = (bids: ParsedBidEvent[]): Map<string, Nut7ProofState> => new Map(bids.map((b) => [b.id, 'unspent' as Nut7ProofState]))

const GENERATOR_HEX = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'

const makeDleqKeyset = (amounts: number[]): MintKeys => {
	const keys: Record<number, string> = {}
	for (const amt of amounts) {
		keys[amt] = amt === 1 ? GENERATOR_HEX : '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5'
	}
	return { id: '00deadbeef', unit: 'sat', keys }
}

const dleqKeyset1 = makeDleqKeyset([100])

// Garbage DLEQ — will NEVER pass hasValidDleq (real crypto verification fails)
const garbageDleq = { id: '00deadbeef', amount: 100, C: GENERATOR_HEX, e: '00', s: '00', r: 'ff' }

const buildPostRolloutAuction = (overrides: Partial<ParsedAuctionEvent> = {}): ParsedAuctionEvent =>
	buildAuction({
		...overrides,
		startAt: APP_AUCTION_DLEQ_ROLLOUT_START_AT,
		endAt: APP_AUCTION_DLEQ_ROLLOUT_START_AT + 1_000,
		maxEndAt: APP_AUCTION_DLEQ_ROLLOUT_START_AT + 1_100,
		dleqRequired: true,
	})

// =============================================================================
// The B1 scenario end to end.
// =============================================================================

describe('validatedBidView — B1 scenario (raw fake high bid vs DLEQ-verified collateral)', () => {
	const auction = buildPostRolloutAuction({ reserve: 100_000 })
	const honestBid = buildBid(auction, {
		id: 'a'.repeat(64),
		amount: 5_000,
		bidderPubkey: HONEST_BIDDER_PK,
		createdAt: APP_AUCTION_DLEQ_ROLLOUT_START_AT + 400,
		dleqProofs: [garbageDleq],
	})
	// The attacker's event: quorum-confirmed (validators are structure-only),
	// claims 1_000_000 sats, collateral "proven" by a fabricated DLEQ proof.
	// Distinct C from the honest bid's proof so the fake is condemned by the
	// DLEQ CRYPTO path (not the A3 cross-author duplicate-collateral path —
	// that path excludes the bid from validBids/winner just the same, but
	// leaves the classified report unmutated).
	const fakeHighBid = buildBid(auction, {
		id: 'b'.repeat(64),
		amount: 1_000_000,
		bidderPubkey: ATTACKER_PK,
		createdAt: APP_AUCTION_DLEQ_ROLLOUT_START_AT + 500,
		dleqProofs: [
			{ id: '00deadbeef', amount: 100, C: '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5', e: '00', s: '00', r: 'ff' },
		],
	})
	const verdicts = [...quorumVerdicts(honestBid), ...quorumVerdicts(fakeHighBid)]
	// NOTE: both bids use garbage DLEQ here so the scenario matches B1's
	// "1-sat (or fabricated) proof" attack; the honest bid's own DLEQ also
	// fails, which is fine — the assertions below only require the ATTACKER's
	// bid to be non-authoritative. The honest-DLEQ case is covered separately.
	const keysets = new Map([['https://mint.test:00deadbeef', dleqKeyset1]])

	test('a dleq_invalid 1_000_000-sat raw bid cannot drive price, leader, winner, or reserve-met', () => {
		const set = computeValidatedBids({
			auction,
			bids: [honestBid, fakeHighBid],
			verdicts,
			nut7States: unspent([honestBid, fakeHighBid]),
			dleqKeysets: keysets,
		})

		// Both bids fail DLEQ over complete evidence => dleq_invalid, so the
		// honest bid is NOT a valid fallback winner either — everything fails
		// closed to the starting bid floor.
		expect(set.invalidBids).toHaveLength(2)
		expect(getBidClassification(set, fakeHighBid.id)).toBe('invalid')
		expect(getValidatedTopAmount(set, auction.startingBid)).toBe(auction.startingBid)
		expect(getValidatedTopBidderPubkey(set)).toBeNull()
		expect(set.canonicalWinner).toBeNull()
		// The seller is NOT locked out of reserve_not_met: no verified bid
		// meets the 100_000 reserve.
		expect(isReserveMetFromValidBids(set, auction.reserve)).toBe(false)
	})

	test('with an honest DLEQ-verified collateralised bid present, the fake high bid still changes nothing', () => {
		// Build an HONEST bid: real NUT-12 proof over its own lock secret.
		const locktime = auction.maxEndAt + auction.settlementGrace
		const honestSecret = buildLockSecret(COMPRESSED_PK, locktime, REFUND_PK, 'honest-b1-nonce')
		const honestKeyset = makeFixtureKeyset([5_000])
		const honestProof = makeHonestDleqProof(5_000, honestSecret)
		const verifiedBid = buildBid(auction, {
			id: 'c'.repeat(64),
			amount: 5_000,
			bidderPubkey: HONEST_BIDDER_PK,
			createdAt: APP_AUCTION_DLEQ_ROLLOUT_START_AT + 400,
			lockSecrets: [honestSecret],
			dleqProofs: [honestProof],
		})
		const allVerdicts = [...quorumVerdicts(verifiedBid), ...quorumVerdicts(fakeHighBid)]
		const set = computeValidatedBids({
			auction,
			bids: [verifiedBid, fakeHighBid],
			verdicts: allVerdicts,
			nut7States: unspent([verifiedBid, fakeHighBid]),
			dleqKeysets: new Map([
				['https://mint.test:00deadbeef', dleqKeyset1],
				[`https://mint.test:${honestProof.id}`, honestKeyset],
			]),
		})

		// The verified 5_000-sat bid is authoritative...
		expect(isBidValidated(set, verifiedBid.id)).toBe(true)
		// ...the 1_000_000-sat fabricated one is not.
		expect(getBidClassification(set, fakeHighBid.id)).toBe('invalid')
		expect(set.invalidBids).toContainEqual(expect.objectContaining({ id: fakeHighBid.id }))

		// Price floor comes from the VERIFIED top amount, not the raw array.
		expect(getValidatedTopAmount(set, auction.startingBid)).toBe(5_000)
		// Displayed leader / winner is the verified bidder.
		expect(getValidatedTopBidderPubkey(set)).toBe(HONEST_BIDDER_PK)
		expect(set.canonicalWinner?.id).toBe(verifiedBid.id)
		// Reserve NOT met by the fake bid (only verified bids count).
		expect(isReserveMetFromValidBids(set, 100_000)).toBe(false)
		// Bidder status: the honest bidder is winning; the attacker is none.
		expect(getValidatedBidderState(set, HONEST_BIDDER_PK, false)).toBe('winning')
		expect(getValidatedBidderState(set, HONEST_BIDDER_PK, true)).toBe('won')
		expect(getValidatedBidderState(set, ATTACKER_PK, true)).toBe('none')
		// Bid count excludes the unverified raw bid.
		expect(set.validBids).toHaveLength(1)
	})
})

// =============================================================================
// Fail-safe semantics preserved (B1 must not weaken them).
// =============================================================================

describe('validatedBidView — fail-safe semantics preserved', () => {
	const auction = buildPostRolloutAuction({ reserve: 100_000 })
	const fakeHighBid = buildBid(auction, {
		id: 'b'.repeat(64),
		amount: 1_000_000,
		bidderPubkey: ATTACKER_PK,
		createdAt: APP_AUCTION_DLEQ_ROLLOUT_START_AT + 500,
		dleqProofs: [garbageDleq],
	})
	const verdicts = quorumVerdicts(fakeHighBid)

	test('ABSENT keyset map => pending, never a winner, never a price floor above startingBid', () => {
		const set = computeValidatedBids({
			auction,
			bids: [fakeHighBid],
			verdicts,
			nut7States: unspent([fakeHighBid]),
			// no dleqKeysets
		})
		expect(getBidClassification(set, fakeHighBid.id)).toBe('pending')
		expect(set.canonicalWinner).toBeNull()
		expect(getValidatedTopBidderPubkey(set)).toBeNull()
		expect(getValidatedTopAmount(set, auction.startingBid)).toBe(auction.startingBid)
		expect(isReserveMetFromValidBids(set, auction.reserve)).toBe(false)
		const pendingClassified = set.classified.find((c) => c.bid.id === fakeHighBid.id)
		expect(pendingClassified?.pendingReason).toBe('dlequ_evidence_unavailable')
	})

	test('entry ABSENT from a SUPPLIED map => pending (evidence unavailable, not fraud)', () => {
		const set = computeValidatedBids({
			auction,
			bids: [fakeHighBid],
			verdicts,
			nut7States: unspent([fakeHighBid]),
			dleqKeysets: new Map([['https://other.mint:00deadbeef', dleqKeyset1]]),
		})
		expect(getBidClassification(set, fakeHighBid.id)).toBe('pending')
		expect(set.canonicalWinner).toBeNull()
		expect(getValidatedTopAmount(set, auction.startingBid)).toBe(auction.startingBid)
		expect(isReserveMetFromValidBids(set, auction.reserve)).toBe(false)
	})

	test('positive failure over COMPLETE evidence => dleq_invalid (not pending)', () => {
		const set = computeValidatedBids({
			auction,
			bids: [fakeHighBid],
			verdicts,
			nut7States: unspent([fakeHighBid]),
			dleqKeysets: new Map([['https://mint.test:00deadbeef', dleqKeyset1]]),
		})
		const classified = set.classified.find((c) => c.bid.id === fakeHighBid.id)
		expect(classified?.classification).toBe('invalid')
		expect(classified?.invalidReason).toBe('dleq_invalid')
		expect(set.canonicalWinner).toBeNull()
		expect(getValidatedTopAmount(set, auction.startingBid)).toBe(auction.startingBid)
		expect(isReserveMetFromValidBids(set, auction.reserve)).toBe(false)
	})
})

// =============================================================================
// Non-regression: verified and grandfathered bids still drive the view.
// =============================================================================

describe('validatedBidView — verified bids remain authoritative (happy path)', () => {
	test('honest DLEQ-verified bid drives price, leader, winner and reserve-met', () => {
		const auction = buildPostRolloutAuction({ reserve: 4_000 })
		const locktime = auction.maxEndAt + auction.settlementGrace
		const secret = buildLockSecret(COMPRESSED_PK, locktime, REFUND_PK, 'happy-b1-nonce')
		const keyset = makeFixtureKeyset([5_000])
		const proof = makeHonestDleqProof(5_000, secret)
		const bid = buildBid(auction, {
			id: 'd'.repeat(64),
			amount: 5_000,
			createdAt: APP_AUCTION_DLEQ_ROLLOUT_START_AT + 500,
			lockSecrets: [secret],
			dleqProofs: [proof],
		})
		const set = computeValidatedBids({
			auction,
			bids: [bid],
			verdicts: quorumVerdicts(bid),
			nut7States: unspent([bid]),
			dleqKeysets: new Map([[`https://mint.test:${proof.id}`, keyset]]),
		})

		expect(isBidValidated(set, bid.id)).toBe(true)
		expect(set.canonicalWinner?.id).toBe(bid.id)
		expect(getValidatedTopAmount(set, auction.startingBid)).toBe(5_000)
		expect(getValidatedTopBidderPubkey(set)).toBe(bid.bidderPubkey)
		expect(isReserveMetFromValidBids(set, auction.reserve)).toBe(true)
		expect(getValidatedBidderState(set, bid.bidderPubkey, true)).toBe('won')
	})

	test('grandfathered pre-rollout bid without DLEQ still drives the view (legacy behaviour unchanged)', () => {
		const auction = buildAuction({ reserve: 4_000 })
		const bid = buildBid(auction, { id: 'e'.repeat(64), amount: 5_000 })
		const set = computeValidatedBids({
			auction,
			bids: [bid],
			verdicts: quorumVerdicts(bid),
			nut7States: unspent([bid]),
		})
		expect(set.canonicalWinner?.id).toBe(bid.id)
		expect(getValidatedTopAmount(set, auction.startingBid)).toBe(5_000)
		expect(isReserveMetFromValidBids(set, auction.reserve)).toBe(true)
	})
})
