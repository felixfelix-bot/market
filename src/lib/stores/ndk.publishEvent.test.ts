import { describe, expect, test } from 'bun:test'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { ndkActions } from '@/lib/stores/ndk'

/**
 * Regression coverage for PR #744 review finding 5 (BLOCK):
 * ndkActions.publishEvent must route NIP-16 *replaceable* kinds through
 * event.publishReplaceable() so relays can apply last-wins/dedup.
 *
 * NIP-16 replaceable kinds are: 0 (metadata), 3 (contacts),
 * 10000-19999 and 30000-39999 (addressable/parameterized-replaceable).
 * The pre-fix predicate omitted 0 and 3.
 *
 * The store is deliberately NOT mocked here. ndkStore has no NDK instance in
 * the test env, so getWriteRelaySet() resolves to undefined and the stub
 * event's publish methods are invoked directly — which is exactly the call
 * site this test needs to observe.
 */
const fakeEvent = (kind: number | undefined) => {
	const calls: string[] = []
	const event = {
		kind,
		publish: async () => {
			calls.push('publish')
			return new Set(['plain'])
		},
		publishReplaceable: async () => {
			calls.push('publishReplaceable')
			return new Set(['replaceable'])
		},
	}
	return { event, calls }
}

const REPLACEABLE_KINDS = [0, 3, 10000, 10001, 19999, 30000, 30078, 39999]
const REGULAR_KINDS = [1, 4, 7, 3000, 9999, 20000, 29999, 40000, 40001]

describe('ndkActions.publishEvent — NIP-16 replaceable routing', () => {
	for (const kind of REPLACEABLE_KINDS) {
		test(`kind ${kind} is published via publishReplaceable`, async () => {
			const { event, calls } = fakeEvent(kind)
			await ndkActions.publishEvent(event as unknown as NDKEvent)
			expect(calls).toEqual(['publishReplaceable'])
		})
	}

	for (const kind of REGULAR_KINDS) {
		test(`kind ${kind} is published via publish`, async () => {
			const { event, calls } = fakeEvent(kind)
			await ndkActions.publishEvent(event as unknown as NDKEvent)
			expect(calls).toEqual(['publish'])
		})
	}

	test('an event without a kind falls back to publish (no throw)', async () => {
		const { event, calls } = fakeEvent(undefined)
		await ndkActions.publishEvent(event as unknown as NDKEvent)
		expect(calls).toEqual(['publish'])
	})

	test('expectation lists match NDKEvent.isReplaceable classification', () => {
		for (const kind of REPLACEABLE_KINDS) {
			const event = new NDKEvent(undefined as unknown as never, { kind } as never)
			expect(event.isReplaceable()).toBe(true)
		}
		for (const kind of REGULAR_KINDS) {
			const event = new NDKEvent(undefined as unknown as never, { kind } as never)
			expect(event.isReplaceable()).toBe(false)
		}
	})
})
