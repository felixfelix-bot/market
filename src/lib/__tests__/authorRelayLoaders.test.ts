/**
 * Loader-backed bounded author-relay transport — tests.
 *
 * ADR-0002 Wave 1 read topology (F3, proposed: PR #1333) bounds the author-relay
 * read at three levels: per read (cap-before-connect: 3 relays, deduped and
 * scheme-filtered before any connection opens), per relay (one deadline) and per
 * session (distinct-relay cap with TTL + eviction). `applesauce-loaders` can be
 * the transport for the pointer-expressible reads, but it cannot express those
 * bounds — so this file pins BOTH halves of the claim:
 *
 *  - what the loader owns: the pointer -> filter derivation, and the pointer
 *    matcher that drops an event a declared relay returns for a *different*
 *    coordinate;
 *  - what stays ours, because the loader's own relay selection, its batching and
 *    its (absent) per-relay deadline would each widen the bound: the pool clamps
 *    every request to the session-admitted relays, iterates them one at a time,
 *    and abandons a relay at its deadline.
 *
 * Every event is a real `finalizeEvent`-signed event and the seam port is a local
 * recorder (no network), so this file does not perturb the NDK footprint guard.
 */
import { describe, expect, test } from 'bun:test'
import { finalizeEvent, getPublicKey } from 'nostr-tools'
import type { NostrEvent } from 'nostr-tools/pure'

import type { FetchOptions, NostrFilter } from '@/lib/nostr/io'
import { fetchNdkEventSet } from '@/lib/nostr/ndk-events'
import {
	AuthorRelaySession,
	MAX_AUTHOR_RELAYS_PER_READ,
	resolveAuthorRelayRead,
	type AuthorRelayReadDeps,
} from '@/lib/nostr/authorRelayRead'
import {
	addressPointerForRead,
	boundedRunDeadlineMs,
	createBoundedRelayPool,
	loadAddressPointerEvents,
} from '@/lib/nostr/authorRelayLoader'

const TEST_SECRET_KEY = new Uint8Array(32).fill(7)
/** The author every fixture is signed by, so a fixture event matches its filter. */
const AUTHOR_PUBKEY = getPublicKey(TEST_SECRET_KEY)
const OTHER_PUBKEY = 'b7'.repeat(32)

const PROFILE_FILTER: NostrFilter = { kinds: [0], authors: [AUTHOR_PUBKEY] }
/** The F3 inbox read: `#p` filters name no author, so no pointer can express them. */
const INBOX_FILTER: NostrFilter = { kinds: [4], '#p': [AUTHOR_PUBKEY], limit: 100 }

const stubNdk = {
	fetchEvent: async () => null,
	queuesNip05: { add: async (item: { func: () => Promise<unknown> }) => item.func() },
} as unknown as Parameters<typeof fetchNdkEventSet>[1]

function signedEvent(kind: number, createdAt: number, content = '', secretKey = TEST_SECRET_KEY): NostrEvent {
	return finalizeEvent({ kind, created_at: createdAt, tags: [], content }, secretKey)
}

interface RecordedFetch {
	relayUrls: string[]
	filters: NostrFilter[]
}

/**
 * Recorder for the seam port. `handler` decides what one relay returns; the
 * recorder tracks call order, the relay list each call carried (always exactly
 * one relay for the bounded transport) and the peak number of concurrent fetches
 * (the serial rule).
 */
function recordingPort(handler: (relayUrl: string, filters: NostrFilter[]) => Promise<NostrEvent[]>) {
	const calls: RecordedFetch[] = []
	let inFlight = 0
	let maxInFlight = 0

	const port = {
		async fetchEvents(filter: NostrFilter | NostrFilter[], opts?: FetchOptions): Promise<NostrEvent[]> {
			const relayUrls = opts?.relayUrls ?? []
			const filters = Array.isArray(filter) ? filter : [filter]
			calls.push({ relayUrls, filters })
			inFlight += 1
			maxInFlight = Math.max(maxInFlight, inFlight)
			try {
				return await handler(relayUrls[0] ?? '', filters)
			} finally {
				inFlight -= 1
			}
		},
	} as unknown as Pick<AuthorRelayReadDeps['io'], 'fetchEvents'>

	return { port, calls, maxInFlight: () => maxInFlight }
}

/** The resolver's own wiring, with the recorder standing in for the browser seam. */
function makeDeps(overrides: {
	relayList?: Array<string | { url: string; read: boolean; write: boolean }>
	handler?: (relayUrl: string, filters: NostrFilter[]) => Promise<NostrEvent[]>
	pinnedEvents?: NostrEvent[]
}) {
	const { relayList = [], handler = async () => [], pinnedEvents = [] } = overrides
	const recorder = recordingPort(handler)

	const deps: AuthorRelayReadDeps = {
		io: {
			async fetchEvents(filter: NostrFilter | NostrFilter[], opts?: FetchOptions) {
				if (!opts?.relayUrls || opts.relayUrls.length === 0) return pinnedEvents
				return recorder.port.fetchEvents(filter, opts)
			},
		} as unknown as AuthorRelayReadDeps['io'],
		ndk: stubNdk,
		fetchAuthorRelayList: async () =>
			relayList.map((entry) => (typeof entry === 'string' ? { url: entry, read: true, write: false } : entry)),
		isEnabled: () => true,
		now: () => 1_000_000,
		perRelayTimeoutMs: 50,
		session: new AuthorRelaySession({ maxDistinctRelays: 12, ttlMs: 60_000, now: () => 1_000_000 }),
	}

	return { deps, calls: recorder.calls, maxInFlight: recorder.maxInFlight }
}

describe('address-pointer derivation — what a pointer can express', () => {
	test('derives a pointer for a single-kind single-author replaceable read', () => {
		// kind 0 (profile) and kind 17375 (the NIP-60 wallet event) are both
		// replaceable, so kind + author IS the pointer the read means.
		expect(addressPointerForRead(PROFILE_FILTER)).toEqual({ kind: 0, pubkey: AUTHOR_PUBKEY })
		expect(addressPointerForRead({ kinds: [17375], authors: [AUTHOR_PUBKEY] })).toEqual({ kind: 17375, pubkey: AUTHOR_PUBKEY })
		expect(addressPointerForRead({ kinds: [3], authors: [AUTHOR_PUBKEY] })).toEqual({ kind: 3, pubkey: AUTHOR_PUBKEY })
	})

	test('leaves a read the pointer cannot express on the filter transport', () => {
		// A regular kind has no replaceable coordinate to point at.
		expect(addressPointerForRead({ kinds: [1], authors: [AUTHOR_PUBKEY] })).toBeNull()
		// An addressable kind needs its `d` tag, which this read does not name.
		expect(addressPointerForRead({ kinds: [30023], authors: [AUTHOR_PUBKEY] })).toBeNull()
		// More than one author or kind is not one pointer.
		expect(addressPointerForRead({ kinds: [0], authors: [AUTHOR_PUBKEY, OTHER_PUBKEY] })).toBeNull()
		expect(addressPointerForRead({ kinds: [0, 1], authors: [AUTHOR_PUBKEY] })).toBeNull()
		// Any other selector makes the read wider or narrower than the pointer.
		expect(addressPointerForRead({ ...PROFILE_FILTER, limit: 10 })).toBeNull()
		expect(addressPointerForRead({ ...PROFILE_FILTER, since: 1_700_000_000 })).toBeNull()
		expect(addressPointerForRead({ ...PROFILE_FILTER, ids: ['ab'.repeat(32)] })).toBeNull()
		expect(addressPointerForRead([PROFILE_FILTER, { kinds: [1], authors: [AUTHOR_PUBKEY] }])).toBeNull()
	})

	test('a `#p` inbox read is not pointer-expressible', () => {
		// The F3 inbox reads name the reader in `#p` and no author at all, so there
		// is no coordinate for a pointer to point at.
		expect(addressPointerForRead(INBOX_FILTER)).toBeNull()
	})

	test('the run deadline covers every admitted relay plus one scheduling slot', () => {
		// Serial: N relays, each bounded by its own deadline, plus one slot for the
		// loader's batching/scheduling between the batch flush and the first request.
		expect(boundedRunDeadlineMs(50, 3)).toBe(200)
		expect(boundedRunDeadlineMs(50, 1)).toBe(100)
		expect(boundedRunDeadlineMs(50, 0)).toBe(100)
	})
})

describe('bounded relay pool — the loader cannot widen the bound', () => {
	test('contacts the admitted relays serially, one at a time, in request order', async () => {
		const profile = signedEvent(0, 1_700_000_000, JSON.stringify({ name: 'Alice' }))
		const recorder = recordingPort(async () => [profile])
		const consulted: string[] = []
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://r1.example', 'wss://r2.example', 'wss://r3.example'],
			perRelayTimeoutMs: 50,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
			onRelayContacted: (relayUrl) => consulted.push(relayUrl),
		})

		const events = await new Promise<NostrEvent[]>((resolve, reject) => {
			const collected: NostrEvent[] = []
			pool.request(['wss://r1.example', 'wss://r2.example', 'wss://r3.example'], [PROFILE_FILTER]).subscribe({
				next: (event) => collected.push(event),
				error: reject,
				complete: () => resolve(collected),
			})
		})

		expect(consulted).toEqual(['wss://r1.example', 'wss://r2.example', 'wss://r3.example'])
		expect(recorder.maxInFlight()).toBe(1)
		expect(recorder.calls.map((call) => call.relayUrls)).toEqual([['wss://r1.example'], ['wss://r2.example'], ['wss://r3.example']])
		// The read's filter is what the relay is asked for — the pool does not rewrite it.
		expect(recorder.calls.map((call) => call.filters)).toEqual([[PROFILE_FILTER], [PROFILE_FILTER], [PROFILE_FILTER]])
		expect(events.map((event) => event.id)).toEqual([profile.id, profile.id, profile.id])
	})

	test('refuses a relay the session never admitted — no egress, no connection', async () => {
		const recorder = recordingPort(async () => [])
		const refused: string[] = []
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://r1.example'],
			perRelayTimeoutMs: 50,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
			onRelayRefused: (relayUrl) => refused.push(relayUrl),
		})

		await new Promise<void>((resolve) => pool.request(['wss://rogue.example'], [PROFILE_FILTER]).subscribe({ complete: () => resolve() }))

		expect(refused).toEqual(['wss://rogue.example'])
		expect(recorder.calls).toHaveLength(0)
	})

	test('abandons a relay that never answers at its deadline and continues to the next one', async () => {
		const profile = signedEvent(0, 1_700_000_000, JSON.stringify({ name: 'Alice' }))
		const recorder = recordingPort(async (relayUrl) => {
			if (relayUrl === 'wss://hangs.example') return new Promise<NostrEvent[]>(() => {})
			return [profile]
		})
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://hangs.example', 'wss://answers.example'],
			perRelayTimeoutMs: 25,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
		})

		const startedAt = Date.now()
		const events = await new Promise<NostrEvent[]>((resolve, reject) => {
			const collected: NostrEvent[] = []
			pool.request(['wss://hangs.example', 'wss://answers.example'], [PROFILE_FILTER]).subscribe({
				next: (event) => collected.push(event),
				error: reject,
				complete: () => resolve(collected),
			})
		})
		const elapsed = Date.now() - startedAt

		expect(events.map((event) => event.id)).toEqual([profile.id])
		expect(elapsed).toBeLessThan(2_000)
	})

	test('skips a relay that throws without failing the request', async () => {
		const profile = signedEvent(0, 1_700_000_000, JSON.stringify({ name: 'Alice' }))
		const recorder = recordingPort(async (relayUrl) => {
			if (relayUrl === 'wss://broken.example') throw new Error('connection refused')
			return [profile]
		})
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://broken.example', 'wss://answers.example'],
			perRelayTimeoutMs: 50,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
		})

		const events = await new Promise<NostrEvent[]>((resolve, reject) => {
			const collected: NostrEvent[] = []
			pool.request(['wss://broken.example', 'wss://answers.example'], [PROFILE_FILTER]).subscribe({
				next: (event) => collected.push(event),
				error: reject,
				complete: () => resolve(collected),
			})
		})

		expect(events.map((event) => event.id)).toEqual([profile.id])
	})

	test('opens no further connection once the run is torn down', async () => {
		const abort = new AbortController()
		const recorder = recordingPort(async (relayUrl) => {
			if (relayUrl === 'wss://r1.example') abort.abort()
			return []
		})
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://r1.example', 'wss://r2.example'],
			perRelayTimeoutMs: 50,
			signal: abort.signal,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
		})

		await new Promise<void>((resolve) =>
			pool.request(['wss://r1.example', 'wss://r2.example'], [PROFILE_FILTER]).subscribe({ complete: () => resolve() }),
		)

		expect(recorder.calls.map((call) => call.relayUrls)).toEqual([['wss://r1.example']])
	})
})

describe('loader-backed pointer read', () => {
	test('reads the pointer through the address loader and the bounded pool', async () => {
		const profile = signedEvent(0, 1_700_000_000, JSON.stringify({ name: 'Alice' }))
		const recorder = recordingPort(async (relayUrl) => (relayUrl === 'wss://r1.example' ? [profile] : []))
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://r1.example', 'wss://r2.example'],
			perRelayTimeoutMs: 50,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
		})

		const events = await loadAddressPointerEvents(
			pool,
			{ kind: 0, pubkey: AUTHOR_PUBKEY },
			{ extraRelays: ['wss://r1.example', 'wss://r2.example'] },
		)

		expect(events.map((event) => event.id)).toEqual([profile.id])
		// The loader derives the filter from the pointer and the pool still opens one
		// connection at a time, one per admitted relay.
		expect(recorder.calls.map((call) => call.relayUrls)).toEqual([['wss://r1.example'], ['wss://r2.example']])
		expect(recorder.maxInFlight()).toBe(1)
		for (const call of recorder.calls) expect(call.filters).toEqual([{ kinds: [0], authors: [AUTHOR_PUBKEY] }])
	})

	test('ignores relay hints a pointer may carry, so the cap cannot be widened', async () => {
		const recorder = recordingPort(async () => [])
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://r1.example'],
			perRelayTimeoutMs: 50,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
		})

		await loadAddressPointerEvents(
			pool,
			{ kind: 0, pubkey: AUTHOR_PUBKEY, relays: ['wss://hinted.example'] },
			{ extraRelays: ['wss://r1.example'] },
		)

		expect(recorder.calls.map((call) => call.relayUrls)).toEqual([['wss://r1.example']])
	})

	test('drops an event a declared relay returns for a different coordinate', async () => {
		const otherProfile = signedEvent(0, 1_700_000_000, JSON.stringify({ name: 'Somebody else' }), new Uint8Array(32).fill(9))
		const ownProfile = signedEvent(0, 1_700_000_100, JSON.stringify({ name: 'Alice' }))
		const recorder = recordingPort(async () => [otherProfile, signedEvent(1, 1_700_000_200, 'a note'), ownProfile])
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://r1.example'],
			perRelayTimeoutMs: 50,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
		})

		const events = await loadAddressPointerEvents(pool, { kind: 0, pubkey: AUTHOR_PUBKEY }, { extraRelays: ['wss://r1.example'] })

		expect(events.map((event) => event.id)).toEqual([ownProfile.id])
	})

	test('a hung relay cannot hold the pointer read open', async () => {
		const profile = signedEvent(0, 1_700_000_000, JSON.stringify({ name: 'Alice' }))
		const recorder = recordingPort(async (relayUrl) => {
			if (relayUrl === 'wss://hangs.example') return new Promise<NostrEvent[]>(() => {})
			return [profile]
		})
		const pool = createBoundedRelayPool({
			admittedRelays: ['wss://hangs.example', 'wss://answers.example'],
			perRelayTimeoutMs: 25,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
		})

		const startedAt = Date.now()
		const events = await loadAddressPointerEvents(
			pool,
			{ kind: 0, pubkey: AUTHOR_PUBKEY },
			{ extraRelays: ['wss://hangs.example', 'wss://answers.example'] },
		)

		expect(events.map((event) => event.id)).toEqual([profile.id])
		expect(Date.now() - startedAt).toBeLessThan(2_000)
	})

	test('performs no egress when the session admitted nothing', async () => {
		const recorder = recordingPort(async () => [])
		const pool = createBoundedRelayPool({
			admittedRelays: [],
			perRelayTimeoutMs: 50,
			fetchRawEvents: (relayUrls, filters) => recorder.port.fetchEvents(filters, { relayUrls }),
		})

		const events = await loadAddressPointerEvents(pool, { kind: 0, pubkey: AUTHOR_PUBKEY }, { extraRelays: [] })

		expect(events).toEqual([])
		expect(recorder.calls).toHaveLength(0)
	})
})

describe('resolver — the loader path sits inside the same bounds', () => {
	test('an address-pointer read drops an off-pointer event a declared relay returns', async () => {
		const otherProfile = signedEvent(0, 1_700_000_000, JSON.stringify({ name: 'Somebody else' }), new Uint8Array(32).fill(9))
		const { deps, calls } = makeDeps({ relayList: ['wss://r1.example'], handler: async () => [otherProfile] })

		const outcome = await resolveAuthorRelayRead({ purpose: 'display', authorPubkey: AUTHOR_PUBKEY, filter: PROFILE_FILTER }, deps)

		// The pointer is the authority for this read: a declared relay cannot inject
		// an event for a different coordinate into it.
		expect(outcome.source).toBe('author-relays')
		expect(outcome.events.size).toBe(0)
		expect(calls).toHaveLength(1)
	})

	test('an address-pointer read still caps a hostile declaration list at the per-read bound', async () => {
		const profile = signedEvent(0, 1_700_000_000, JSON.stringify({ name: 'Alice' }))
		const { deps, calls, maxInFlight } = makeDeps({
			relayList: [
				'wss://r1.example',
				'wss://r2.example',
				'wss://r3.example',
				'wss://r4.example',
				'wss://r5.example',
				'wss://r6.example.onion',
				'https://r7.example',
				'wss://user:pw@r8.example',
			],
			handler: async () => [profile],
		})

		const outcome = await resolveAuthorRelayRead({ purpose: 'display', authorPubkey: AUTHOR_PUBKEY, filter: PROFILE_FILTER }, deps)

		expect(MAX_AUTHOR_RELAYS_PER_READ).toBe(3)
		expect(calls).toHaveLength(3)
		expect(outcome.consultedRelays).toEqual(['wss://r1.example', 'wss://r2.example', 'wss://r3.example'])
		expect(maxInFlight()).toBe(1)
		expect(Array.from(outcome.events).map((event) => event.id)).toEqual([profile.id])
	})

	test('a `#p` inbox read stays on the filter transport, serial and capped', async () => {
		const order = signedEvent(4, 1_700_000_000, 'order')
		const { deps, calls, maxInFlight } = makeDeps({
			relayList: ['wss://r1.example', 'wss://r2.example', 'wss://r3.example', 'wss://r4.example'],
			handler: async () => [order],
		})

		const outcome = await resolveAuthorRelayRead({ purpose: 'self', authorPubkey: AUTHOR_PUBKEY, filter: INBOX_FILTER }, deps)

		expect(calls).toHaveLength(3)
		expect(maxInFlight()).toBe(1)
		// A filter read is passed through untouched: the pool does not rewrite it and no
		// pointer matcher narrows it.
		for (const call of calls) expect(call.filters).toEqual([INBOX_FILTER])
		expect(Array.from(outcome.events).map((event) => event.id)).toEqual([order.id])
	})
})
