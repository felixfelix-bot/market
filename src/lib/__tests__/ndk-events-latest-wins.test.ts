import { describe, expect, mock, test } from 'bun:test'
import { finalizeEvent } from 'nostr-tools'
import type { NostrEvent } from 'nostr-tools/pure'

import { fetchNdkEvent, fetchNdkEventSet, NDKEvent } from '@/lib/nostr/ndk-events'
import type { NostrIo } from '@/lib/nostr/io'

const TEST_SECRET_KEY = new Uint8Array(32).fill(9)

type NdkEventContext = ConstructorParameters<typeof NDKEvent>[0]
const ndk = {} as NdkEventContext

function liveActivity(created_at: number, dTag: string): NostrEvent {
	return finalizeEvent({ kind: 30408, created_at, tags: [['d', dTag]], content: '' }, TEST_SECRET_KEY)
}

const old = liveActivity(1_700_000_000, 'auction-1')
const mid = liveActivity(1_700_000_100, 'auction-1')
const newest = liveActivity(1_700_000_200, 'auction-1')

describe('fetchNdkEvent (newest-wins determinism)', () => {
	test('returns the newest event regardless of arrival order', async () => {
		const nostrIo = { fetchEvents: mock(async () => [old, newest, mid]) } as Pick<NostrIo, 'fetchEvents'>

		const result = await fetchNdkEvent(nostrIo, ndk, { kinds: [1] })

		expect(result?.id).toBe(newest.id)
	})

	test('reversed arrival order still returns the newest event (not first-arrival)', async () => {
		const nostrIo = { fetchEvents: mock(async () => [mid, newest, old]) } as Pick<NostrIo, 'fetchEvents'>

		const result = await fetchNdkEvent(nostrIo, ndk, { kinds: [1] })

		expect(result?.id).toBe(newest.id)
	})

	test('returns null when no events match', async () => {
		const nostrIo = { fetchEvents: mock(async () => []) } as Pick<NostrIo, 'fetchEvents'>

		const result = await fetchNdkEvent(nostrIo, ndk, { kinds: [1] })

		expect(result).toBeNull()
	})

	test('equal created_at resolves by lower event id (lexicographic tiebreaker)', async () => {
		const a = liveActivity(1_700_000_000, 'tie-a')
		const b = liveActivity(1_700_000_000, 'tie-b')
		const lowerId = a.id < b.id ? a : b

		const nostrIo = { fetchEvents: mock(async () => [b, a]) } as Pick<NostrIo, 'fetchEvents'>

		const result = await fetchNdkEvent(nostrIo, ndk, { kinds: [1] })

		expect(result?.id).toBe(lowerId.id)
	})
})

describe('fetchNdkEventSet opts forwarding', () => {
	test('forwards FetchOptions to the port (timeoutMs/relayUrls)', async () => {
		const fetchEvents = mock(async (_filter?: unknown, _opts?: unknown) => [newest])
		const nostrIo = { fetchEvents } as unknown as Pick<NostrIo, 'fetchEvents'>

		await fetchNdkEventSet(nostrIo, ndk, { kinds: [1] }, { timeoutMs: 1234 })

		expect(fetchEvents).toHaveBeenCalledTimes(1)
		expect(fetchEvents.mock.calls[0][1]).toEqual({ timeoutMs: 1234 })
	})
})
