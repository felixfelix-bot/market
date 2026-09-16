import { describe, expect, test } from 'bun:test'
import type { NDKEvent } from '@nostr-dev-kit/ndk'

/**
 * Regression coverage for PR #744 review finding 6 (RISK):
 * getCollectionTitle's fallback was flipped from 'Untitled Collection' to '',
 * which blanked every consumer that renders the title directly (dashboard
 * list, aria-labels, delete confirmation, `Collection: ${title}` labels,
 * CollectionCard, CollectionDisplayComponent) and made the
 * routes/community.index.tsx filter drop pre-existing untitled collections.
 *
 * collections.tsx reads localStorage at module scope, so the stub must be
 * installed before the dynamic import below. Verified green when this file is
 * co-run with the rest of the suite (bun test src/lib src/queries).
 */
const storage = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
	getItem: (key: string) => storage.get(key) ?? null,
	setItem: (key: string, value: string) => void storage.set(key, value),
	removeItem: (key: string) => void storage.delete(key),
	clear: () => storage.clear(),
	key: () => null,
	length: 0,
} as unknown as Storage

const { getCollectionTitle } = await import('@/queries/collections')

const eventWithTags = (tags: string[][]) => ({ tags }) as unknown as NDKEvent

describe('getCollectionTitle', () => {
	test('returns the title tag value when present', () => {
		expect(getCollectionTitle(eventWithTags([['title', 'My Collection']]))).toBe('My Collection')
	})

	test('falls back to a non-empty label for a null event', () => {
		expect(getCollectionTitle(null)).toBe('Untitled Collection')
	})

	test('falls back to a non-empty label when there is no title tag', () => {
		expect(getCollectionTitle(eventWithTags([['image', 'https://example.com/a.png']]))).toBe('Untitled Collection')
	})

	test('falls back to a non-empty label for an empty title tag', () => {
		expect(getCollectionTitle(eventWithTags([['title', '']]))).toBe('Untitled Collection')
	})

	test('never returns an empty string (consumers render it directly)', () => {
		expect(getCollectionTitle(null)).not.toBe('')
		expect(getCollectionTitle(eventWithTags([]))).not.toBe('')
	})
})
