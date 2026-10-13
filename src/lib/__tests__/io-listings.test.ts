/**
 * Wave A2 seam tests: kind-30402 (NIP-15 product listing) read helpers.
 *
 * These pin the listing read operations added to the seam
 * (`src/lib/nostr/io.ts`): fetchListings, fetchListingsByMerchant,
 * fetchListingById, fetchListingByDTag, subscribeToListings. They exercise
 * the in-process contract through the pass-through delegation with a stub
 * active adapter, so no relay round-trip is needed (relay behaviour is
 * covered by the base seam tests in io.test.ts / Wave A1).
 */
import { afterEach, describe, expect, mock, test } from 'bun:test'

const stubRawEvent = {
	id: 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1',
	pubkey: 'def456def456def456def456def456def456def456def456def456def456def4',
	created_at: 300,
	kind: 30402,
	tags: [
		['d', 'my-listing'],
		['t', 'gizmo'],
	],
	content: 'a gizmo',
	sig: 'sig-1',
}
const stubRawEvent2 = { ...stubRawEvent, id: 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc2', created_at: 100 }
// A 30403 collection event — used to confirm non-30402 siblings pass through.
const stubCollectionEvent = {
	...stubRawEvent,
	id: 'fff123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc3',
	kind: 30403,
	created_at: 50,
}

import { type NostrIo, ndkIo, setNostrIo } from '../nostr/io'
import {
	PRODUCT_LISTING_KIND,
	fetchListingByDTag,
	fetchListingById,
	fetchListings,
	fetchListingsByMerchant,
	subscribeToListings,
} from '../nostr/io'

const VALID_PUBKEY = 'def456def456def456def456def456def456def456def456def456def456def4'
const VALID_ID = 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1'
const VALID_ID2 = 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc2'

function makeStubIo(overrides: Partial<NostrIo> = {}): NostrIo {
	return {
		fetchEvents: mock(async () => []),
		subscribe: mock(() => () => {}),
		publish: mock(async () => {}),
		sign: mock(async () => ({}) as never),
		getUser: mock(async () => null),
		...overrides,
	}
}

afterEach(() => setNostrIo(ndkIo))

describe('listing read helpers (kind 30402 seam)', () => {
	test('fetchListings routes an arbitrary filter through the seam and sorts newest-first', async () => {
		const fetchFn = mock(async () => [stubRawEvent2, stubRawEvent])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		const events = await fetchListings({ kinds: [PRODUCT_LISTING_KIND], limit: 10 })

		expect(fetchFn).toHaveBeenCalledWith({ kinds: [PRODUCT_LISTING_KIND], limit: 10 }, undefined)
		// sort is newest-first by created_at (300 before 100)
		expect(events.map((e) => e.id)).toEqual([stubRawEvent.id, stubRawEvent2.id])
	})

	test('fetchListings does not force a kind so sibling kinds (30403) pass through', async () => {
		const fetchFn = mock(async () => [stubCollectionEvent])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		const events = await fetchListings({ kinds: [30403], authors: [VALID_PUBKEY] })

		expect(fetchFn).toHaveBeenCalledWith({ kinds: [30403], authors: [VALID_PUBKEY] }, undefined)
		expect(events).toEqual([stubCollectionEvent])
	})

	test('fetchListingsByMerchant builds a 30402 author filter with default limit 50', async () => {
		const fetchFn = mock(async () => [stubRawEvent])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		const events = await fetchListingsByMerchant(VALID_PUBKEY)

		expect(fetchFn).toHaveBeenCalledWith({ kinds: [PRODUCT_LISTING_KIND], authors: [VALID_PUBKEY], limit: 50 }, undefined)
		expect(events).toEqual([stubRawEvent])
	})

	test('fetchListingsByMerchant honors an explicit limit override', async () => {
		const fetchFn = mock(async () => [stubRawEvent])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		await fetchListingsByMerchant(VALID_PUBKEY, { limit: 7 })

		expect(fetchFn).toHaveBeenCalledWith({ kinds: [PRODUCT_LISTING_KIND], authors: [VALID_PUBKEY], limit: 7 }, { limit: 7 })
	})

	test('fetchListingsByMerchant throws on a malformed pubkey', async () => {
		const fetchFn = mock(async () => [])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		await expect(fetchListingsByMerchant('not-a-pubkey')).rejects.toThrow('invalid 64-char hex key')
		expect(fetchFn).not.toHaveBeenCalled()
	})

	test('fetchListingById builds an ids filter and returns the single event', async () => {
		const fetchFn = mock(async () => [stubRawEvent])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		const event = await fetchListingById(VALID_ID)

		expect(fetchFn).toHaveBeenCalledWith({ kinds: [PRODUCT_LISTING_KIND], ids: [VALID_ID], limit: 1 }, undefined)
		expect(event).toEqual(stubRawEvent)
	})

	test('fetchListingById resolves null when no relay has the event', async () => {
		const fetchFn = mock(async () => [])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		await expect(fetchListingById(VALID_ID)).resolves.toBeNull()
	})

	test('fetchListingById throws on a malformed event id', async () => {
		const fetchFn = mock(async () => [])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		await expect(fetchListingById('not-an-id')).rejects.toThrow('invalid 64-char hex key')
		expect(fetchFn).not.toHaveBeenCalled()
	})

	test('fetchListingByDTag builds an authors + #d filter', async () => {
		const fetchFn = mock(async () => [stubRawEvent])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		const event = await fetchListingByDTag(VALID_PUBKEY, 'my-listing')

		expect(fetchFn).toHaveBeenCalledWith(
			{ kinds: [PRODUCT_LISTING_KIND], authors: [VALID_PUBKEY], '#d': ['my-listing'], limit: 1 },
			undefined,
		)
		expect(event).toEqual(stubRawEvent)
	})

	test('fetchListingByDTag resolves null when not found', async () => {
		const fetchFn = mock(async () => [])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		await expect(fetchListingByDTag(VALID_PUBKEY, 'missing')).resolves.toBeNull()
	})

	test('fetchListingByDTag returns null for an empty d-tag without querying', async () => {
		const fetchFn = mock(async () => [])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		await expect(fetchListingByDTag(VALID_PUBKEY, '')).resolves.toBeNull()
		expect(fetchFn).not.toHaveBeenCalled()
	})

	test('fetchListingByDTag throws on a malformed pubkey', async () => {
		const fetchFn = mock(async () => [])
		setNostrIo(makeStubIo({ fetchEvents: fetchFn }))

		await expect(fetchListingByDTag('bad', 'x')).rejects.toThrow('invalid 64-char hex key')
		expect(fetchFn).not.toHaveBeenCalled()
	})

	test('subscribeToListings injects the 30402 kind into a bare filter and stays open', () => {
		const subFn = mock(() => () => {})
		setNostrIo(makeStubIo({ subscribe: subFn }))

		const stop = subscribeToListings({ authors: [VALID_PUBKEY] }, () => {})

		expect(subFn).toHaveBeenCalledWith({ authors: [VALID_PUBKEY], kinds: [PRODUCT_LISTING_KIND] }, expect.any(Function), {
			closeOnEose: false,
		})
		expect(typeof stop).toBe('function')
	})

	test('subscribeToListings keeps an already-30402 filter kind unchanged', () => {
		const subFn = mock(() => () => {})
		setNostrIo(makeStubIo({ subscribe: subFn }))

		subscribeToListings({ kinds: [PRODUCT_LISTING_KIND], '#t': ['gizmo'] }, () => {})

		expect(subFn).toHaveBeenCalledWith({ kinds: [PRODUCT_LISTING_KIND], '#t': ['gizmo'] }, expect.any(Function), { closeOnEose: false })
	})

	test('subscribeToListings maps array filters and merges kinds per entry', () => {
		const subFn = mock(() => () => {})
		setNostrIo(makeStubIo({ subscribe: subFn }))

		subscribeToListings([{ authors: [VALID_PUBKEY] }, { authors: [VALID_ID2] }], () => {})

		expect(subFn).toHaveBeenCalledWith(
			[
				{ authors: [VALID_PUBKEY], kinds: [PRODUCT_LISTING_KIND] },
				{ authors: [VALID_ID2], kinds: [PRODUCT_LISTING_KIND] },
			],
			expect.any(Function),
			{ closeOnEose: false },
		)
	})

	test('subscribeToListings forwards explicit subscribe options (relayUrls) and keeps closeOnEose false', () => {
		const subFn = mock(() => () => {})
		setNostrIo(makeStubIo({ subscribe: subFn }))

		subscribeToListings({ kinds: [PRODUCT_LISTING_KIND] }, () => {}, { relayUrls: ['wss://relay.example'] })

		expect(subFn).toHaveBeenCalledWith({ kinds: [PRODUCT_LISTING_KIND] }, expect.any(Function), {
			closeOnEose: false,
			relayUrls: ['wss://relay.example'],
		})
	})
})
