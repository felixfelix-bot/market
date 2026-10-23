/**
 * Repro: validator-side settlement completeness for a REBID (multi-leg) chain.
 *
 * Mirrors exactly what `src/server/auction-validator/lifecycle.ts`
 * `buildSettlementChain()` hands to `validateSettlementCompleteness()`:
 * the parsed bid object, whose `legLockedAmount` comes from the `amount` tag
 * (src/lib/schemas/auction/bidEvent.ts), i.e. the CUMULATIVE bid value, not the
 * per-leg delta.
 *
 * Expected (AUCTIONS.md §4.3.2): one payout per leg, each with the leg's own
 * locked amount; sum == final_amount.
 */
import { validateSettlementCompleteness } from '../src/lib/auction/validation'
import { deriveAuctionChildP2pkPubkeyFromXpub } from '../src/lib/auctionP2pk'
import { hashToCurveHexFromString } from '../src/lib/cashu/hashToCurve'
import { getEncodedToken } from '@cashu/cashu-ts'
import type { ParsedAuctionEvent, ParsedBidEvent, ParsedPathReleaseEvent, ParsedSettlementEvent } from '../src/lib/auction/events'

const SELLER = 'a'.repeat(64)
const BIDDER = 'b'.repeat(64)
const REFUND = '03' + 'e'.repeat(64)
const LOCKTIME = 5_700
const makeLockSecret = (child: string): string =>
	JSON.stringify([
		'P2PK',
		{ nonce: 'n1', data: child, tags: [['sigflag', 'SIG_INPUTS'], ['locktime', String(LOCKTIME)], ['refund', REFUND], ['n_sigs_refund', '1']] },
	])
const XPUB = 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz'
const PATH = 'm/0/0/0/0/1'
const CHILD = deriveAuctionChildP2pkPubkeyFromXpub(XPUB, PATH).toLowerCase()

const raw = (kind: number, pubkey: string) => ({ kind, pubkey, content: '', tags: [] as string[][], id: 'stub', created_at: 0 })

const auction: ParsedAuctionEvent = {
	rawEvent: raw(30408, SELLER),
	dTag: 'a1',
	sellerPubkey: SELLER,
	coordinate: `30408:${SELLER}:a1`,
	rootEventId: '1'.repeat(64),
	title: 't',
	content: '',
	auctionType: 'english',
	startAt: 1_000,
	endAt: 2_000,
	maxEndAt: 2_100,
	settlementGrace: 3_600,
	currency: 'SAT',
	reserve: 0,
	startingBid: 1_000,
	bidIncrement: 100,
	minBidCurve: { shape: 'none', peakMultiplier: 1, raw: '' },
	settlementPolicy: 'cashu_p2pk_bidder_path_v1',
	keyScheme: 'hd_p2pk',
	mints: ['https://mint.test'],
	p2pkXpub: XPUB,
	auditors: ['c'.repeat(64)],
	auditorQuorum: 1,
	maxSkewSec: 60,
	fallbackDelaySec: 100,
	vadiumRatioBps: 10_000,
	schema: 'auction_v1',
}

// What parseBidEvent() actually produces: legLockedAmount := the `amount` tag.
const makeBid = (id: string, amount: number, prevBidId?: string): ParsedBidEvent => ({
	rawEvent: raw(1023, BIDDER),
	id,
	bidderPubkey: BIDDER,
	createdAt: 1_500,
	auctionRootEventId: auction.rootEventId,
	auctionCoordinate: auction.coordinate,
	sellerPubkey: SELLER,
	amount,
	legLockedAmount: amount, // <-- parseBidEvent: legLockedAmount = parse(tag 'amount')
	currency: 'SAT',
	mint: 'https://mint.test',
	locktime: LOCKTIME,
	refundPubkey: REFUND,
	childPubkey: CHILD,
	lockSecrets: [makeLockSecret(CHILD)],
	proofYs: [hashToCurveHexFromString(makeLockSecret(CHILD))],
	createdForEndAt: auction.endAt,
	bidNonce: 'n' + id.slice(0, 3),
	keyScheme: 'hd_p2pk',
	status: 'locked',
	prevBidId,
})

// leg1 locks 6_000 and commits cumulative 6_000; leg2 locks 4_000 delta, cumulative 10_000.
const leg1 = makeBid('2'.repeat(64), 6_000)
const leg2 = makeBid('3'.repeat(64), 10_000, leg1.id)

const rel = (bid: ParsedBidEvent, id: string, legAmount: number): ParsedPathReleaseEvent => ({
	rawEvent: raw(1025, BIDDER),
	id,
	bidderPubkey: BIDDER,
	createdAt: 2_200,
	bidEventId: bid.id,
	auctionCoordinate: auction.coordinate,
	sellerPubkey: SELLER,
	derivationPath: PATH,
	childPubkey: CHILD,
	releaseReason: 'settlement',
	auditorRefs: [],
	cashuToken: getEncodedToken({
		mint: auction.mints[0],
		proofs: [{ id: '009a1f293253e41e', amount: legAmount, secret: bid.lockSecrets[0], C: '02' + '1'.repeat(64) }],
	}),
	content: '',
})

const release1 = rel(leg1, '5'.repeat(64), 6_000)
const release2 = rel(leg2, '6'.repeat(64), 4_000)

// Seller publisher (src/publish/auctions.tsx) writes per-leg DELTAS: 6_000 + 4_000.
const settlement: ParsedSettlementEvent = {
	rawEvent: raw(1024, SELLER),
	id: '7'.repeat(64),
	sellerPubkey: SELLER,
	createdAt: 2_300,
	auctionRootEventId: auction.rootEventId,
	auctionCoordinate: auction.coordinate,
	status: 'settled',
	closeAt: auction.maxEndAt,
	winningBidId: leg2.id,
	winnerPubkey: BIDDER,
	finalAmount: 10_000, // == leg2.amount (cumulative)
	pathReleaseEventId: release2.id,
	payouts: [
		{ bidEventId: leg1.id, amount: 6_000, status: 'redeemed' },
		{ bidEventId: leg2.id, amount: 4_000, status: 'redeemed' },
	],
	fallbackChain: [],
}

const result = validateSettlementCompleteness({
	auction,
	settlement,
	winningBid: leg2,
	pathRelease: release2,
	winningBidClaim: 'won_pending_settlement',
	winningBidPostCloseDecision: 'winner',
	// exactly what lifecycle.ts:316-330 buildSettlementChain() pushes:
	bidChain: [
		{ bid: leg1, pathRelease: release1, nut7State: undefined },
		{ bid: leg2, pathRelease: release2, nut7State: undefined },
	],
})

console.log('validator-path result:', JSON.stringify(result))

// Contrast: the CLIENT descriptor path (settlementDescriptor.ts:202-214) builds the
// same chain but rewrites legLockedAmount to the per-leg expectedAmount.
const resultClient = validateSettlementCompleteness({
	auction,
	settlement,
	winningBid: leg2,
	pathRelease: release2,
	winningBidClaim: 'won_pending_settlement',
	winningBidPostCloseDecision: 'winner',
	bidChain: [
		{ bid: { ...leg1, legLockedAmount: 6_000 }, pathRelease: release1, nut7State: undefined },
		{ bid: { ...leg2, legLockedAmount: 4_000 }, pathRelease: release2, nut7State: undefined },
	],
})
console.log('client-descriptor result:', JSON.stringify(resultClient))
process.exit(0)
