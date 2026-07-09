import { NDKEvent } from '@nostr-dev-kit/ndk'
import { AUCTION_KIND, getAuctionId } from '@/lib/auctionSettlement'

/**
 * Convert an auction event to a live activity coordinate
 * @param auctionEvent - The auction NDK event
 * @returns The live activity coordinate string or empty string if invalid
 */
export function getAuctionLiveActivityCoord(auctionEvent: NDKEvent | null): string {
	if (!auctionEvent) return ''
	
	const dTag = getAuctionId(auctionEvent)
	if (!dTag) return ''
	
	return `${AUCTION_KIND}:${auctionEvent.pubkey}:${dTag}`
}

/**
 * Get live activity refetch interval based on auction timing
 * @param auctionEvent - The auction event
 * @param currentStatus - Current live activity status (optional)
 * @returns Appropriate refetch interval in milliseconds
 */
export function pickAuctionLiveActivityRefetchMs(auctionEvent: NDKEvent | null, currentStatus?: string): number {
	if (!auctionEvent) return 60_000
	
	// For auctions, poll faster (15s) when the auction is planned and approaching its start time
	// so the live chat activates promptly when the auction goes live instead of waiting up to 60s
	const startAt = getAuctionStartsAt(auctionEvent)
	if (startAt === 0) return 60_000
	
	const now = Math.floor(Date.now() / 1000)
	const nearStartWindowS = 10 * 60 // 10 minutes before start
	
	if (currentStatus === 'planned' && (startAt - now) <= nearStartWindowS) {
		return 15_000
	}
	
	return 60_000
}

/**
 * Get auction start time from an event
 * @param auctionEvent - The auction event
 * @returns Start time as Unix timestamp or 0 if not found
 */
function getAuctionStartsAt(auctionEvent: NDKEvent): number {
	const raw = auctionEvent?.tags.find((t) => t[0] === 'start_at')?.[1]
	const parsed = raw ? parseInt(raw, 10) : 0
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/**
 * Hook for auction-specific live activity with automatic refetch interval selection
 * @param auctionEvent - The auction event
 */
export function useAuctionLiveActivity(auctionEvent: NDKEvent | null) {
	const liveActivityCoord = getAuctionLiveActivityCoord(auctionEvent)
	
	return useQuery({
		queryKey: ['auctionLiveActivity', liveActivityCoord],
		queryFn: async () => {
			if (!liveActivityCoord) return null
			const { fetchLiveActivity } = await import('./liveChat')
			return fetchLiveActivity(liveActivityCoord)
		},
		enabled: !!liveActivityCoord,
		refetchInterval: () => pickAuctionLiveActivityRefetchMs(auctionEvent),
	})
}