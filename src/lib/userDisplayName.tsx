/**
 * Utilities for getting the best available display name for users
 * Extracted from UserCard component for reusability across the application
 */

import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { useNDK } from '@nostr-dev-kit/ndk'
import { useQuery } from '@tanstack/react-query'
import { ndkActions } from '@/lib/stores/ndk'

/**
 * Get the best available display name for a user, following the hierarchy:
 * displayName > name > npub (shortened)
 * 
 * @param user - NDK user object
 * @returns The best available display name
 */
export function getUserDisplayName(user?: { profile?: { displayName?: string; name?: string }; npub?: string }): string {
	if (!user) return ''
	return user?.profile?.displayName ?? user?.profile?.name ?? (user?.npub ? user.npub.slice(0, 9) + '..' + user.npub.slice(-6) : '')
}

/**
 * Get a shortened npub format for display
 * @param npub - The full npub string
 * @returns Shortened npub (first 9 + .. + last 6 chars)
 */
export function getShortenedNpub(npub: string): string {
	if (!npub || npub.length < 15) return npub
	return npub.slice(0, 9) + '..' + npub.slice(-6)
}

/**
 * Query hook for fetching user profile data and getting display name
 */
export function useUserProfileDisplay(pubkey?: string) {
	const ndk = useNDK()
	
	return useQuery({
		queryKey: ['userProfile', 'displayName', pubkey],
		queryFn: async () => {
			if (!pubkey || !ndk) return null
			
			const user = ndk.getUser({ pubkey })
			await user.fetchProfile()
			
			return {
				displayName: getUserDisplayName(user),
				user
			}
		},
		enabled: !!pubkey && !!ndk,
		staleTime: 300000, // 5 minutes
	})
}

/**
 * Get user display name from an event (synchronous version)
 * @param event - The event containing the pubkey
 * @returns The best available display name or shortened npub
 */
export function getEventUserDisplayName(event?: { pubkey?: string }): string {
	if (!event?.pubkey) return ''
	return getShortenedNpub(`npub1${event.pubkey.slice(0, 12)}…`)
}

/**
 * Asynchronous function to fetch user profile and get display name
 * @param pubkey - The user's public key
 * @returns Promise resolving to the user's display name
 */
export async function fetchUserDisplayName(pubkey: string): Promise<string> {
	const ndk = ndkActions.getNDK()
	if (!ndk) return getShortenedNpub(`npub1${pubkey.slice(0, 12)}…`)
	
	try {
		const user = ndk.getUser({ pubkey })
		await user.fetchProfile()
		return getUserDisplayName(user)
	} catch (error) {
		console.warn('Failed to fetch user profile:', error)
		return getShortenedNpub(`npub1${pubkey.slice(0, 12)}…`)
	}
}