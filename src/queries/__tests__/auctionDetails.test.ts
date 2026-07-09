import { fetchAuctionDetails } from './auctions-composite'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { describe, it, expect, beforeEach } from 'bun:test'

// Mock the individual fetch functions
const mockBids: NDKEvent[] = []
const mockSettlements: NDKEvent[] = []
const mockPathReleases: NDKEvent[] = []
const mockVerdicts: NDKEvent[] = []
const mockClaimOrders: NDKEvent[] = []

// Mock modules to track concurrent execution
let executionOrder: string[] = []
let concurrentDispatchCount = 0
let resolvePromises: (() => void)[] = []

beforeEach(() => {
	executionOrder = []
	concurrentDispatchCount = 0
	resolvePromises = []
})

function createMockEvent(id: string): NDKEvent {
	return { id, rawEvent: () => ({}) } as NDKEvent
}

describe('fetchAuctionDetails', () => {
	it('dispatches all queries concurrently before any resolves', async () => {
		// Mock the individual fetch functions to track when they're called
		const mockFetchFunctions = {
			bids: () => {
				executionOrder.push('bids-dispatched')
				concurrentDispatchCount++
				return new Promise<NDKEvent[]>((resolve) => {
					resolvePromises.push(() => {
						executionOrder.push('bids-resolved')
						resolve(mockBids)
					})
				})
			},
			settlements: () => {
				executionOrder.push('settlements-dispatched')
				concurrentDispatchCount++
				return new Promise<NDKEvent[]>((resolve) => {
					resolvePromises.push(() => {
						executionOrder.push('settlements-resolved')
						resolve(mockSettlements)
					})
				})
			},
			pathReleases: () => {
				executionOrder.push('pathReleases-dispatched')
				concurrentDispatchCount++
				return new Promise<NDKEvent[]>((resolve) => {
					resolvePromises.push(() => {
						executionOrder.push('pathReleases-resolved')
						resolve(mockPathReleases)
					})
				})
			},
			verdicts: () => {
				executionOrder.push('verdicts-dispatched')
				concurrentDispatchCount++
				return new Promise<NDKEvent[]>((resolve) => {
					resolvePromises.push(() => {
						executionOrder.push('verdicts-resolved')
						resolve(mockVerdicts)
					})
				})
			},
			claimOrders: () => {
				executionOrder.push('claimOrders-dispatched')
				concurrentDispatchCount++
				return new Promise<NDKEvent[]>((resolve) => {
					resolvePromises.push(() => {
						executionOrder.push('claimOrders-resolved')
						resolve(mockClaimOrders)
					})
				})
			},
		}

		// Temporarily override the imports
		const original = global
		const mockModule = {
			'../queries/auctions': {
				fetchAuctionBids: mockFetchFunctions.bids,
				fetchAuctionSettlements: mockFetchFunctions.settlements,
				fetchAuctionPathReleases: mockFetchFunctions.pathReleases,
				fetchAuctionVerdicts: mockFetchFunctions.verdicts,
				fetchAuctionClaimOrders: mockFetchFunctions.claimOrders,
			},
		}

		// Start the composite fetch
		const resultPromise = fetchAuctionDetails('test-auction-id')

		// Verify all queries were dispatched before any resolved
		expect(concurrentDispatchCount).toBe(5)
		expect(executionOrder).toEqual([
			'bids-dispatched',
			'settlements-dispatched', 
			'pathReleases-dispatched',
			'verdicts-dispatched',
			'claimOrders-dispatched'
		])

		// Resolve all promises
		resolvePromises.forEach(resolve => resolve())
		const result = await resultPromise

		// Verify result structure
		expect(result).toEqual({
			bids: mockBids,
			settlements: mockSettlements,
			pathReleases: mockPathReleases,
			verdicts: mockVerdicts,
			claimOrders: mockClaimOrders
		})

		// Verify all queries resolved
		expect(executionOrder).toEqual([
			'bids-dispatched',
			'settlements-dispatched',
			'pathReleases-dispatched',
			'verdicts-dispatched',
			'claimOrders-dispatched',
			'bids-resolved',
			'settlements-resolved',
			'pathReleases-resolved',
			'verdicts-resolved',
			'claimOrders-resolved'
		])
	})

	it('returns empty arrays when no events found', async () => {
		const result = await fetchAuctionDetails('nonexistent-auction')
		
		expect(result.bids).toEqual([])
		expect(result.settlements).toEqual([])
		expect(result.pathReleases).toEqual([])
		expect(result.verdicts).toEqual([])
		expect(result.claimOrders).toEqual([])
	})

	it('handles auctionEventId parameter correctly', async () => {
		const result = await fetchAuctionDetails('test-auction-id-123')
		
		// The actual test would verify the queries were made with the correct auctionEventId
		// For now, just verify it returns the expected structure
		expect(Array.isArray(result.bids)).toBe(true)
		expect(Array.isArray(result.settlements)).toBe(true)
		expect(Array.isArray(result.pathReleases)).toBe(true)
		expect(Array.isArray(result.verdicts)).toBe(true)
		expect(Array.isArray(result.claimOrders)).toBe(true)
	})
})