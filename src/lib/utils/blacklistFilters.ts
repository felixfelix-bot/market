import { blacklistActions } from '@/lib/stores/blacklist'
import { getATagFromCoords } from './coords'

/**
 * Minimal structural event shape the blacklist filters operate on. Both the
 * legacy `NDKEvent` wrapper and the raw nostr-tools `NostrEvent` (applesauce
 * seam) satisfy it, so the filter helpers work regardless of which adapter is
 * feeding them.
 */
export interface BlacklistableEvent {
	pubkey: string
	kind: number | undefined
	tags: string[][]
}

/** Extract the `d` tag from a raw tags array (NIP-01 addressable identifier). */
const dTagValue = (tags: string[][]): string | undefined => tags.find((t) => t[0] === 'd')?.[1]

/**
 * Filter out blacklisted items from an array of events
 */
export const filterBlacklistedEvents = <T extends BlacklistableEvent>(events: T[]): T[] => {
	if (!blacklistActions.isBlacklistLoaded()) {
		return events // Return all if blacklist not loaded yet
	}

	return events.filter((event) => {
		// Check if author is blacklisted
		if (blacklistActions.isPubkeyBlacklisted(event.pubkey)) {
			return false
		}

		// For products (kind 30402) and collections (kind 30405), check coordinates
		if (event.kind === 30402 || event.kind === 30405) {
			const dTag = dTagValue(event.tags)
			if (dTag) {
				const coords = getATagFromCoords({
					kind: event.kind,
					pubkey: event.pubkey,
					identifier: dTag,
				})

				if (event.kind === 30402 && blacklistActions.isProductBlacklisted(coords)) {
					return false
				}

				if (event.kind === 30405 && blacklistActions.isCollectionBlacklisted(coords)) {
					return false
				}
			}
		}

		return true
	})
}

/**
 * Check if a product event is blacklisted
 */
export const isProductEventBlacklisted = (event: BlacklistableEvent): boolean => {
	// Check author
	if (blacklistActions.isPubkeyBlacklisted(event.pubkey)) {
		return true
	}

	// Check product coordinates
	if (event.kind === 30402) {
		const dTag = dTagValue(event.tags)
		if (dTag) {
			const coords = getATagFromCoords({
				kind: 30402,
				pubkey: event.pubkey,
				identifier: dTag,
			})
			return blacklistActions.isProductBlacklisted(coords)
		}
	}

	return false
}

/**
 * Check if a collection event is blacklisted
 */
export const isCollectionEventBlacklisted = (event: BlacklistableEvent): boolean => {
	// Check author
	if (blacklistActions.isPubkeyBlacklisted(event.pubkey)) {
		return true
	}

	// Check collection coordinates
	if (event.kind === 30405) {
		const dTag = dTagValue(event.tags)
		if (dTag) {
			const coords = getATagFromCoords({
				kind: 30405,
				pubkey: event.pubkey,
				identifier: dTag,
			})
			return blacklistActions.isCollectionBlacklisted(coords)
		}
	}

	return false
}

/**
 * Filter products by coordinates
 */
export const filterBlacklistedProductCoords = (productCoords: string[]): string[] => {
	return productCoords.filter((coords) => !blacklistActions.isProductBlacklisted(coords))
}

/**
 * Filter collections by coordinates
 */
export const filterBlacklistedCollectionCoords = (collectionCoords: string[]): string[] => {
	return collectionCoords.filter((coords) => !blacklistActions.isCollectionBlacklisted(coords))
}

/**
 * Filter user pubkeys
 */
export const filterBlacklistedPubkeys = (pubkeys: string[]): string[] => {
	return pubkeys.filter((pubkey) => !blacklistActions.isPubkeyBlacklisted(pubkey))
}

/**
 * React hook that returns filter functions with reactive updates
 * Use this in components that need to react to blacklist changes
 */
export const useBlacklistFilters = () => {
	return {
		filterEvents: filterBlacklistedEvents,
		isProductBlacklisted: isProductEventBlacklisted,
		isCollectionBlacklisted: isCollectionEventBlacklisted,
		filterProductCoords: filterBlacklistedProductCoords,
		filterCollectionCoords: filterBlacklistedCollectionCoords,
		filterPubkeys: filterBlacklistedPubkeys,
	}
}
