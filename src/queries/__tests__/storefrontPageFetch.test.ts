import { beforeEach, describe, expect, mock, test } from 'bun:test'

const SELLER_PUBKEY = 'a'.repeat(64)
const FORGER_PUBKEY = 'b'.repeat(64)

let relayEvents: Record<string, unknown>[] = []
let verifyEventResult: ((event: Record<string, unknown>) => boolean) | null = null
let verifiedEvents: Record<string, unknown>[] = []

// Mock only the signature-verification seam that storefront.tsx uses, so we can
// control which events pass/fail signature verification without needing real
// cryptographic signatures. Never mock 'nostr-tools' itself: bun applies
// mock.module process-wide for the whole test run, which would replace the real
// verifyEvent for every other test file in the suite.
mock.module('@/lib/nostr/event-signature', () => ({
	verifyNostrEventSignature: mock((event: Record<string, unknown>) => {
		verifiedEvents.push(event)
		if (verifyEventResult) return verifyEventResult(event)
		// Default: accept events that carry a 'sig' field
		return !!event.sig
	}),
}))

mock.module('@/lib/nostr/io', () => ({
	fetchEvents: mock(async () => relayEvents),
	subscribe: mock(() => () => {}),
	sign: mock(async () => ({})),
	publish: mock(async () => {}),
	getUser: mock(async () => null),
}))

mock.module('react', () => ({
	useEffect: () => {},
	default: {},
}))

mock.module('@tanstack/react-query', () => ({
	useQuery: () => ({ data: undefined }),
	useQueryClient: () => ({ invalidateQueries: async () => {} }),
}))

const { fetchStorefrontPage } = await import('../storefront')

const pageContent = JSON.stringify({ version: 1, blocks: [{ type: 'text', text: 'Welcome' }] })

const pageEvent = (overrides: Record<string, unknown> = {}) => ({
	id: 'f'.repeat(64),
	kind: 30024,
	pubkey: SELLER_PUBKEY,
	created_at: 1_700_000_000,
	content: pageContent,
	tags: [['d', 'storefront-page']],
	sig: '1'.repeat(128),
	...overrides,
})

beforeEach(() => {
	relayEvents = []
	verifyEventResult = null
	verifiedEvents = []
})

describe('fetchStorefrontPage signature verification', () => {
	test('returns the page for a correctly signed seller event', async () => {
		relayEvents = [pageEvent()]

		const result = await fetchStorefrontPage(SELLER_PUBKEY)

		expect(result?.eventId).toBe('f'.repeat(64))
		expect(result?.page.blocks).toEqual([{ type: 'text', text: 'Welcome' }])
	})

	test('rejects an event whose signature does not verify', async () => {
		// Right pubkey, right kind, right d tag — but a forged signature.
		relayEvents = [pageEvent()]
		verifyEventResult = () => false

		expect(await fetchStorefrontPage(SELLER_PUBKEY)).toBeNull()
		expect(verifiedEvents.length).toBeGreaterThan(0)
	})

	test('skips a forged event and falls through to the next valid one', async () => {
		const forged = pageEvent({ id: 'e'.repeat(64), created_at: 1_700_000_100 })
		const valid = pageEvent({ id: 'd'.repeat(64), created_at: 1_700_000_000 })
		relayEvents = [forged, valid]
		verifyEventResult = (event) => event.id === valid.id

		const result = await fetchStorefrontPage(SELLER_PUBKEY)

		expect(result?.eventId).toBe(valid.id)
	})

	test('ignores events authored by a different pubkey', async () => {
		relayEvents = [pageEvent({ pubkey: FORGER_PUBKEY })]

		expect(await fetchStorefrontPage(SELLER_PUBKEY)).toBeNull()
	})
})
