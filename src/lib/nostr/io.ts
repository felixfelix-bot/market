/**
 * Library-agnostic Nostr I/O port — the "seam" of the NDK -> applesauce
 * strangler-fig migration (see
 * `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md`).
 *
 * Every event that flows through this port is a raw nostr-tools event
 * (applesauce has no wrapper class), so migrating a module is mostly about
 * redirecting where its subscribe/fetch/publish calls land, not about
 * changing event shapes.
 *
 * The active adapter defaults to the temporary NDK bridge (`io-ndk.ts`) and
 * is flipped to the applesauce implementation (`io-applesauce.ts`) module by
 * module, with tests gating each flip. When the last caller has flipped,
 * `io-ndk.ts` and the NDK singleton are deleted (Wave D).
 *
 * NEW-MODULE POLICY (read before adding imports here): modules introduced
 * going forward — most notably the auctions module (kind 30408 NIP-60),
 * which does not exist yet on main (only forward-looking comments in
 * `src/lib/v4v/splits.ts`) — MUST be applesauce-native from day one and MUST
 * NOT introduce any nostr-dev-kit import (the NDK package). Such modules'
 * relay I/O must route through this seam's primitives (fetchEvents /
 * subscribe / publish) so the NDK bridge can be deleted at Wave D without
 * touching a future auction codebase. The kind-30402 listing helpers below
 * are the reference shape: they accept raw nostr filters/keys and return
 * plain `NostrEvent` objects, never NDK wrappers.
 */
import type { EventTemplate, NostrEvent } from 'nostr-tools/pure'
import type { Filter } from 'nostr-tools'

import { ndkIo } from './io-ndk'

export { applesauceIo } from './io-applesauce'
export { ndkIo }

export type { EventTemplate, NostrEvent } from 'nostr-tools/pure'
export type NostrFilter = Filter

export interface NostrUser {
	pubkey: string
}

export interface FetchOptions {
	/** Abort the fetch after this many milliseconds (default: ~8s). */
	timeoutMs?: number
	/** Restrict the fetch to these relay URLs. Default: adapter's configured relays. */
	relayUrls?: string[]
}

export interface SubscribeOptions {
	/**
	 * Close the subscription once relays reach EOSE. Default: false.
	 *
	 * Caveat (applesauce adapter): applesauce 5.2's req() emitted a virtual
	 * EOSE after ~10s as a backstop when a relay never sent one; 6.x only
	 * surfaces the relay's own EOSE. A closeOnEose: true subscription can
	 * therefore hang open on a never-EOSE relay — callers that need bounded
	 * lifetime should add their own timeout.
	 */
	closeOnEose?: boolean
	/** Restrict the subscription to these relay URLs. Default: adapter's configured relays. */
	relayUrls?: string[]
}

export interface PublishOptions {
	/** Restrict publishing to these relay URLs. Default: adapter's write relays. */
	relayUrls?: string[]
}

export interface NostrIo {
	fetchEvents(filter: NostrFilter | NostrFilter[], opts?: FetchOptions): Promise<NostrEvent[]>
	subscribe(filter: NostrFilter | NostrFilter[], onEvent: (event: NostrEvent) => void, opts?: SubscribeOptions): () => void
	publish(event: NostrEvent, opts?: PublishOptions): Promise<void>
	sign(template: EventTemplate): Promise<NostrEvent>
	getUser(): Promise<NostrUser | null>
}

let active: NostrIo = ndkIo

/** Returns the currently active Nostr I/O adapter. */
export function getNostrIo(): NostrIo {
	return active
}

/** Swaps the active adapter. Used by the migration to flip modules off NDK. */
export function setNostrIo(io: NostrIo): void {
	active = io
}

export const fetchEvents: NostrIo['fetchEvents'] = (filter, opts) => active.fetchEvents(filter, opts)
export const subscribe: NostrIo['subscribe'] = (filter, onEvent, opts) => active.subscribe(filter, onEvent, opts)
export const publish: NostrIo['publish'] = (event, opts) => active.publish(event, opts)
export const sign: NostrIo['sign'] = (template) => active.sign(template)
export const getUser: NostrIo['getUser'] = () => active.getUser()

// ---------------------------------------------------------------------------
// Kind-30402 (NIP-15 product listing) read operations
//
// Applesauce-native read helpers for product listings. Each builds the
// relevant 30402 filter and routes it through the active adapter's generic
// fetchEvents/subscribe primitives, so they remain library-agnostic: under
// the NDK bridge they delegate to NDK; under the applesauce adapter they hit
// applesauce-relay directly. Like the orders seam functions they accept raw
// nostr-tools filters/keys and return plain `NostrEvent` objects — no NDK
// type crosses this boundary.
//
// Blacklist / deleted-product / visibility / in-stock post-filters are NOT
// applied here; the product UI applies them after the read (see
// src/queries/products.tsx::fetchProducts*). The seam returns the raw listing
// events exactly as the relays deliver them.
// ---------------------------------------------------------------------------

/** Addressable kind for NIP-15 product listings. */
export const PRODUCT_LISTING_KIND = 30402

const HEX_KEY_RE = /^[0-9a-f]{64}$/i

function assertHexKey(value: string, label: string): void {
	if (!HEX_KEY_RE.test(value)) throw new Error(`${label}: invalid 64-char hex key`)
}

function defaultListingsSort(events: NostrEvent[]): NostrEvent[] {
	return events.slice().sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
}

/**
 * Query product listings by an arbitrary raw nostr filter.
 *
 * The caller supplies the full filter (kinds need not include 30402 — the
 * helper does NOT force it so callers can reuse it for sibling kinds like
 * 30403 collections). Results are returned newest-first, matching the legacy
 * products feed ordering.
 */
export function fetchListings(filter: NostrFilter | NostrFilter[], opts?: FetchOptions): Promise<NostrEvent[]> {
	return fetchEvents(filter, opts).then(defaultListingsSort)
}

/**
 * Fetch every listing a merchant has published (kind 30402 by `authors`).
 *
 * @param pubkey 64-hex seller pubkey (throws if malformed).
 * @param opts Optional relay/timeout controls; also accepts `limit` defaults
 *   to 50 like the legacy `fetchProductsByPubkey`.
 */
export async function fetchListingsByMerchant(pubkey: string, opts?: FetchOptions & { limit?: number }): Promise<NostrEvent[]> {
	assertHexKey(pubkey, 'fetchListingsByMerchant')
	const filter: NostrFilter = {
		kinds: [PRODUCT_LISTING_KIND],
		authors: [pubkey],
		limit: opts?.limit ?? 50,
	}
	return fetchEvents(filter, opts).then(defaultListingsSort)
}

/**
 * Fetch a single listing by its event id.
 *
 * @returns The event, or `null` when no relay has it. Unlike the generic
 *   fetch, this resolves to a single event (or null) rather than an array.
 */
export async function fetchListingById(eventId: string, opts?: FetchOptions): Promise<NostrEvent | null> {
	assertHexKey(eventId, 'fetchListingById')
	const filter: NostrFilter = {
		kinds: [PRODUCT_LISTING_KIND],
		ids: [eventId],
		limit: 1,
	}
	const events = await fetchEvents(filter, opts)
	return events[0] ?? null
}

/**
 * Fetch a single listing by its d-tag coordinate (addressable identifier).
 *
 * NIP-01-equivalent of a `#d` lookup for addressable kinds; the seam has no
 * naddr helper, so this filters by `authors` + `#d` instead of resolving an
 * naddr (see the 30402 cheat-sheet, §4-note-on-d).
 *
 * @returns The event, or `null` when not found.
 */
export async function fetchListingByDTag(pubkey: string, dTag: string, opts?: FetchOptions): Promise<NostrEvent | null> {
	assertHexKey(pubkey, 'fetchListingByDTag')
	if (!dTag) return null
	const filter: NostrFilter = {
		kinds: [PRODUCT_LISTING_KIND],
		authors: [pubkey],
		'#d': [dTag],
		limit: 1,
	}
	const events = await fetchEvents(filter, opts)
	return events[0] ?? null
}

/**
 * Live-subscribe to product-listing updates.
 *
 * Stays open (closeOnEose: false) so a live storefront keeps receiving
 * changes; returns an unsubscribe `stop()` function. The product UI uses
 * this for push-style updates; today products.tsx relies on React Query
 * re-poll, so this helper is the on-ramp when a live view lands.
 */
export function subscribeToListings(
	filter: NostrFilter | NostrFilter[],
	onEvent: (event: NostrEvent) => void,
	opts?: SubscribeOptions,
): () => void {
	const merged: NostrFilter | NostrFilter[] = Array.isArray(filter)
		? filter.map((f) => (f.kinds?.includes(PRODUCT_LISTING_KIND) ? f : { ...f, kinds: [...(f.kinds ?? []), PRODUCT_LISTING_KIND] }))
		: filter.kinds?.includes(PRODUCT_LISTING_KIND)
			? filter
			: { ...filter, kinds: [...(filter.kinds ?? []), PRODUCT_LISTING_KIND] }
	return subscribe(merged, onEvent, { closeOnEose: false, ...opts })
}
