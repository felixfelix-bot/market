import { describe, expect, test } from 'bun:test'
import {
	areAllProductsExpanded,
	nextProductsExpandedState,
	splitTimelineEvents,
	type TimelineEntry,
} from '@/components/orders/OrderDetailComponent'
import { getInvoiceTitle } from '@/components/orders/detail/InvoiceCard'

// Plain event-shaped objects: the helpers only read `created_at`, so tests do
// not need real NDKEvent instances (relay data stays mocked-out per ADR-0005).
function entry(id: string, createdAt?: number): TimelineEntry {
	return {
		event: { id, created_at: createdAt } as TimelineEntry['event'],
		type: 'status',
		title: `Event ${id}`,
		icon: null,
	}
}

describe('splitTimelineEvents', () => {
	test('returns no latest and no earlier events for an empty timeline', () => {
		expect(splitTimelineEvents([])).toEqual({ latest: null, earlier: [] })
	})

	test('keeps a single event always visible as the latest entry', () => {
		const only = entry('a', 100)
		const { latest, earlier } = splitTimelineEvents([only])
		expect(latest).toBe(only)
		expect(earlier).toEqual([])
	})

	test('sorts newest-first and splits off the newest event as latest', () => {
		const oldest = entry('old', 100)
		const newest = entry('new', 300)
		const middle = entry('mid', 200)
		const { latest, earlier } = splitTimelineEvents([oldest, newest, middle])
		expect(latest?.event.id).toBe('new')
		expect(earlier.map((e) => e.event.id)).toEqual(['mid', 'old'])
	})

	test('treats a missing created_at as the oldest event', () => {
		const undated = entry('undated', undefined)
		const dated = entry('dated', 1)
		const { latest, earlier } = splitTimelineEvents([undated, dated])
		expect(latest?.event.id).toBe('dated')
		expect(earlier.map((e) => e.event.id)).toEqual(['undated'])
	})
})

describe('products expand-all state', () => {
	test('is not all-expanded when there are no products', () => {
		expect(areAllProductsExpanded([], { a: true })).toBe(false)
	})

	test('is not all-expanded when only some products are expanded', () => {
		expect(areAllProductsExpanded(['a', 'b'], { a: true })).toBe(false)
	})

	test('is all-expanded when every product is expanded', () => {
		expect(areAllProductsExpanded(['a', 'b'], { a: true, b: true })).toBe(true)
	})

	test('expand-all toggle expands every product', () => {
		expect(nextProductsExpandedState(['a', 'b'], { a: true })).toEqual({ a: true, b: true })
	})

	test('expand-all toggle collapses everything when already all-expanded', () => {
		expect(nextProductsExpandedState(['a', 'b'], { a: true, b: true })).toEqual({})
	})
})

describe('getInvoiceTitle', () => {
	test('labels merchant invoices with the recipient name and (Merchant)', () => {
		expect(getInvoiceTitle({ recipientName: 'Acme Shop', type: 'merchant' })).toBe('Acme Shop (Merchant)')
	})

	test('labels v4v invoices with the recipient name and (v4v)', () => {
		expect(getInvoiceTitle({ recipientName: 'Podcaster', type: 'v4v' })).toBe('Podcaster (v4v)')
	})
})
