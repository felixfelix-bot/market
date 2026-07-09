import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { auctionKeys } from './queryKeyFactory'

// Import the existing functions from auctions.tsx
import {
	fetchAuctionBids,
	fetchAuctionSettlements,
	fetchAuctionPathReleases,
	fetchAuctionVerdicts,
	fetchAuctionClaimOrders,
} from './auctions'

/**
 * Composite function to fetch all auction details in parallel.
 * Batches mutually independent queries (bids, settlements, path releases, verdicts, claim orders)
 * into a single Promise.all, reducing waterfall latency from sum(latencies) to max(latency).
 * 
 * @param auctionEventId The root auction event id
 * @param limit Optional limit per query type
 * @returns Promise<AuctionDetails> containing all fetched data
 */
export const fetchAuctionDetails = async (
	auctionEventId: string,
	limit: number = 100
): Promise<{
	bids: NDKEvent[]
	settlements: NDKEvent[]
	pathReleases: NDKEvent[]
	verdicts: NDKEvent[]
	claimOrders: NDKEvent[]
}> => {
	// All five queries are mutually independent - none depends on another's result
	// They all key off the auctionEventId or can be derived from it
	const [
		bids,
		settlements, 
		pathReleases,
		verdicts,
		claimOrders
	] = await Promise.all([
		fetchAuctionBids(auctionEventId, limit),
		fetchAuctionSettlements(auctionEventId, limit),
		fetchAuctionPathReleases(auctionEventId, limit),
		fetchAuctionVerdicts(auctionEventId, limit),
		fetchAuctionClaimOrders(auctionEventId)
	])

	return {
		bids,
		settlements,
		pathReleases,
		verdicts,
		claimOrders
	}
}

/**
 * Options for fetching auction details
 */
export interface FetchAuctionDetailOptions {
	/** Optional limits for each query type */
	bidLimit?: number
	settlementLimit?: number
	pathReleaseLimit?: number
	verdictLimit?: number
	claimOrderLimit?: number
}

/**
 * Enhanced version of fetchAuctionDetails with custom limits per query type
 */
export const fetchAuctionDetailsWithOpts = async (
	auctionEventId: string,
	opts: FetchAuctionDetailOptions = {}
): Promise<{
	bids: NDKEvent[]
	settlements: NDKEvent[]
	pathReleases: NDKEvent[]
	verdicts: NDKEvent[]
	claimOrders: NDKEvent[]
}> => {
	const {
		bidLimit = 100,
		settlementLimit = 100,
		pathReleaseLimit = 200,
		verdictLimit = 500,
		claimOrderLimit = 100
	} = opts

	// Use Promise.all with custom limits
	const [
		bids,
		settlements, 
		pathReleases,
		verdicts,
		claimOrders
	] = await Promise.all([
		fetchAuctionBids(auctionEventId, bidLimit),
		fetchAuctionSettlements(auctionEventId, settlementLimit),
		fetchAuctionPathReleases(auctionEventId, pathReleaseLimit),
		fetchAuctionVerdicts(auctionEventId, verdictLimit),
		fetchAuctionClaimOrders(auctionEventId)
	])

	return {
		bids,
		settlements,
		pathReleases,
		verdicts,
		claimOrders
	}
}

/**
 * Query options for the composite auction details fetch
 * Useful for non-React contexts, server prefetching, or Applesauce migration
 */
export const auctionDetailsQueryOptions = (auctionEventId: string, opts: FetchAuctionDetailOptions = {}) =>
	queryOptions({
		queryKey: [...auctionKeys.details(auctionEventId), 'composite'],
		queryFn: () => fetchAuctionDetailsWithOpts(auctionEventId, opts),
		enabled: !!auctionEventId,
		staleTime: 10000,
		refetchInterval: 15000,
	})

/**
 * Helper hook for composite auction details in React components
 */
export const useAuctionDetails = (auctionEventId: string, opts: FetchAuctionDetailOptions = {}) => {
	return useQuery(auctionDetailsQueryOptions(auctionEventId, opts))
}