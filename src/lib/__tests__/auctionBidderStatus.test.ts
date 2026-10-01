import { describe, expect, test } from 'bun:test'
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { getAuctionBidderStatus } from '@/lib/auctionBidderStatus'

const makeAuction = (params: { id?: string; startAt?: number; endAt?: number }): NDKEvent =>
	({
		id: params.id ?? 'auction-root',
		pubkey: 'seller',
		created_at: 1,
		content: 'Auction description',
		tags: [
			['d', 'auction-1'],
			['title', 'Auction'],
			['start_at', String(params.startAt ?? 100)],
			['end_at', String(params.endAt ?? 300)],
			['max_end_at', String(params.endAt ?? 300)],
			['extension_rule', 'none'],
		],
	}) as NDKEvent

const makeBid = (params: { id: string; pubkey: string; amount: number; createdAt: number; status?: string }): NDKEvent =>
	({
		id: params.id,
		pubkey: params.pubkey,
		created_at: params.createdAt,
		content: JSON.stringify({ amount: params.amount }),
		tags: [
			['e', 'auction-root'],
			['amount', String(params.amount), 'SAT'],
			['status', params.status ?? 'locked'],
		],
	}) as NDKEvent

describe('auction bidder status', () => {
	test('no current user returns no status', () => {
		const auction = makeAuction({})
		const bids = [makeBid({ id: 'bid-1', pubkey: 'alice', amount: 1000, createdAt: 120 })]

		expect(getAuctionBidderStatus({ currentUserPubkey: '', auction, bids, isEnded: false })).toBeNull()
	})

	test('current user with no bids returns no status', () => {
		const auction = makeAuction({})
		const bids = [makeBid({ id: 'bid-1', pubkey: 'alice', amount: 1000, createdAt: 120 })]

		expect(getAuctionBidderStatus({ currentUserPubkey: 'bob', auction, bids, isEnded: false })).toBeNull()
	})

	test('current user is top bidder while live', () => {
		const auction = makeAuction({})
		const bids = [
			makeBid({ id: 'bid-1', pubkey: 'alice', amount: 1000, createdAt: 120 }),
			makeBid({ id: 'bid-2', pubkey: 'bob', amount: 1200, createdAt: 130 }),
		]

		expect(getAuctionBidderStatus({ currentUserPubkey: 'bob', auction, bids, isEnded: false })).toEqual({
			status: 'winning',
			label: "You're winning",
		})
	})

	test('current user is outbid while live', () => {
		const auction = makeAuction({})
		const bids = [
			makeBid({ id: 'bid-1', pubkey: 'alice', amount: 1000, createdAt: 120 }),
			makeBid({ id: 'bid-2', pubkey: 'bob', amount: 1200, createdAt: 130 }),
		]

		expect(getAuctionBidderStatus({ currentUserPubkey: 'alice', auction, bids, isEnded: false })).toEqual({
			status: 'outbid',
			label: "You've been outbid",
		})
	})

	test('current user is top bidder after ended', () => {
		const auction = makeAuction({})
		const bids = [
			makeBid({ id: 'bid-1', pubkey: 'alice', amount: 1000, createdAt: 120 }),
			makeBid({ id: 'bid-2', pubkey: 'bob', amount: 1200, createdAt: 130 }),
		]

		expect(getAuctionBidderStatus({ currentUserPubkey: 'bob', auction, bids, isEnded: true })).toEqual({
			status: 'won',
			label: 'You had the top bid',
		})
	})

	test('current user is outbid after ended', () => {
		const auction = makeAuction({})
		const bids = [
			makeBid({ id: 'bid-1', pubkey: 'alice', amount: 1000, createdAt: 120 }),
			makeBid({ id: 'bid-2', pubkey: 'bob', amount: 1200, createdAt: 130 }),
		]

		expect(getAuctionBidderStatus({ currentUserPubkey: 'alice', auction, bids, isEnded: true })).toEqual({
			status: 'was_outbid',
			label: 'You were outbid',
		})
	})

	test('tie-breaker follows existing auction bid ordering semantics', () => {
		const auction = makeAuction({})
		const bids = [
			makeBid({ id: 'bid-later', pubkey: 'alice', amount: 1200, createdAt: 130 }),
			makeBid({ id: 'bid-earlier', pubkey: 'bob', amount: 1200, createdAt: 120 }),
		]

		expect(getAuctionBidderStatus({ currentUserPubkey: 'bob', auction, bids, isEnded: false })).toEqual({
			status: 'winning',
			label: "You're winning",
		})
		expect(getAuctionBidderStatus({ currentUserPubkey: 'alice', auction, bids, isEnded: false })?.status).toBe('outbid')
	})
})

// =============================================================================
// PR #1280 review B1: bidder status must derive from the VALIDATED bid set
// when one is supplied, so a DLEQ-fabricated raw bid cannot make an honest
// bidder read as outbid. (Raw fallback while verdicts load stays covered by
// the legacy tests above.)
// =============================================================================

describe('auction bidder status — validated bid set (B1)', () => {
	const aliceBid = { id: 'bid-alice', bidderPubkey: 'alice', amount: 1000 } as unknown as import('@/lib/auction/events').ParsedBidEvent
	const malloryFakeBid = {
		id: 'bid-mallory',
		bidderPubkey: 'mallory',
		amount: 1_000_000,
	} as unknown as import('@/lib/auction/events').ParsedBidEvent

	const validatedSet: import('@/lib/auction/bidValidation').ValidatedBidSet = {
		classified: [
			{ bid: aliceBid, classification: 'valid', observedAt: 150 },
			{ bid: malloryFakeBid, classification: 'invalid', observedAt: 160, invalidReason: 'dleq_invalid' },
		],
		validBids: [aliceBid],
		pendingBids: [],
		invalidBids: [malloryFakeBid],
		canonicalWinner: aliceBid,
		currentTopValidAmount: 1000,
	}

	const rawBids = [
		makeBid({ id: 'bid-alice', pubkey: 'alice', amount: 1000, createdAt: 120 }),
		// The attacker's raw event IS on the relay and IS the raw top bid.
		makeBid({ id: 'bid-mallory', pubkey: 'mallory', amount: 1_000_000, createdAt: 130 }),
	]

	test('an honest bidder is NOT outbid by a dleq_invalid raw bid when the validated set is supplied', () => {
		const auction = makeAuction({})
		expect(
			getAuctionBidderStatus({
				currentUserPubkey: 'alice',
				auction,
				bids: rawBids,
				isEnded: true,
				validatedBidSet: validatedSet,
			}),
		).toEqual({ status: 'won', label: 'You had the top bid' })
		expect(
			getAuctionBidderStatus({
				currentUserPubkey: 'alice',
				auction,
				bids: rawBids,
				isEnded: false,
				validatedBidSet: validatedSet,
			})?.status,
		).toBe('winning')
	})

	test('the attacker whose only bid is dleq_invalid gets no status from the validated set', () => {
		const auction = makeAuction({})
		expect(
			getAuctionBidderStatus({
				currentUserPubkey: 'mallory',
				auction,
				bids: rawBids,
				isEnded: false,
				validatedBidSet: validatedSet,
			}),
		).toBeNull()
	})

	test('without a validated set the legacy raw derivation is unchanged (loading fallback)', () => {
		const auction = makeAuction({})
		// Same raw bids, no validatedBidSet: the raw top bid (mallory) leads,
		// so alice reads as outbid — this is the pre-B1 behaviour, kept ONLY
		// as the transient fallback while verdict evidence loads.
		expect(getAuctionBidderStatus({ currentUserPubkey: 'alice', auction, bids: rawBids, isEnded: true })?.status).toBe('was_outbid')
	})
})
