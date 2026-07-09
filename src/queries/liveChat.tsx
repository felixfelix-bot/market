import { ndkActions } from '@/lib/stores/ndk'
import { type NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { liveActivityKeys } from './queryKeyFactory'
import {
	LIVE_ACTIVITY_KIND,
	LIVE_CHAT_KIND,
	parseLiveActivity,
	parseLiveChatMessage,
	type LiveActivity,
	type LiveChatMessage,
} from '@/lib/nip53'

type NDKKind = NonNullable<NDKFilter['kinds']>[number]
const LIVE_ACTIVITY_KIND_NDK = LIVE_ACTIVITY_KIND as unknown as NDKKind
const LIVE_CHAT_KIND_NDK = LIVE_CHAT_KIND as unknown as NDKKind
import { configStore } from '@/lib/stores/config'

/**
 * Fetch live activity for a given coordinate
 * @param liveActivityCoord - The live activity coordinate (e.g., "30001:pubkey:dTag")
 */
export const fetchLiveActivity = async (liveActivityCoord: string): Promise<LiveActivity | null> => {
	if (!liveActivityCoord) return null

	const ndk = ndkActions.getNDK()
	if (!ndk) return null

	const cvmServerPubkey = configStore.state.config.cvmServerPubkey

	const filter: NDKFilter = {
		kinds: [LIVE_ACTIVITY_KIND_NDK],
		'#a': [liveActivityCoord],
		limit: 10,
	}

	if (cvmServerPubkey) {
		filter.authors = [cvmServerPubkey]
	}

	const events = await ndkActions.fetchEventsWithTimeout([filter], { timeoutMs: 5000 })
	if (events.size === 0) return null

	const sorted = Array.from(events).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
	return parseLiveActivity(sorted[0])
}

/**
 * Fetch live chat messages for a given live activity coordinate
 * @param liveActivityCoord - The live activity coordinate
 */
export const fetchLiveChatMessages = async (liveActivityCoord: string): Promise<LiveChatMessage[]> => {
	const ndk = ndkActions.getNDK()
	if (!ndk) return []

	const filters: NDKFilter[] = [
		{
			kinds: [LIVE_CHAT_KIND_NDK],
			'#a': [liveActivityCoord],
			limit: 200,
		},
	]

	const events = await ndkActions.fetchEventsWithTimeout(filters, { timeoutMs: 5000 })
	return Array.from(events)
		.map(parseLiveChatMessage)
		.sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * Hook for using live activity data
 * @param liveActivityCoord - The live activity coordinate
 */
export const useLiveActivity = (liveActivityCoord: string) => {
	return useQuery(
		queryOptions({
			queryKey: liveActivityKeys.byCoord(liveActivityCoord),
			queryFn: () => fetchLiveActivity(liveActivityCoord),
			enabled: !!liveActivityCoord,
			refetchInterval: 60_000,
		}),
	)
}

/**
 * Hook for using live chat messages
 * @param liveActivityCoord - The live activity coordinate  
 * @param isActive - Whether the chat is currently active (affects polling interval)
 * @param customRefetchInterval - Optional custom refetch interval in milliseconds
 */
export const useLiveChatMessages = (liveActivityCoord: string, isActive: boolean, customRefetchInterval?: number) => {
	return useQuery(
		queryOptions({
			queryKey: liveActivityKeys.chatMessages(liveActivityCoord),
			queryFn: () => fetchLiveChatMessages(liveActivityCoord),
			enabled: !!liveActivityCoord,
			refetchInterval: customRefetchInterval ?? (isActive ? 3_000 : 15_000),
		}),
	)
}

/**
 * Interval picker function for live activity refetch
 * @param refetchInterval - Optional custom refetch interval
 * @returns The refetch interval to use
 */
export function pickLiveActivityRefetchMs(refetchInterval?: number): number {
	return refetchInterval ?? 60_000
}

/**
 * Interval picker function for fast polling when activity is about to start
 * @param customInterval - Optional custom interval in milliseconds  
 * @returns The fast refetch interval (15 seconds by default)
 */
export function pickLiveActivityFastRefetchMs(customInterval?: number): number {
	return customInterval ?? 15_000
}