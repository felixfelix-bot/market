/**
 * Loader-backed transport for the bounded author-relay read path
 * (`authorRelayRead.ts`).
 *
 * ADR-0002 Wave 1 read topology (F3, proposed: PR #1333) bounds that read at three
 * levels: per read (cap-before-connect — the declared list is deduped and
 * scheme-filtered and hard-capped at {@link MAX_AUTHOR_RELAYS_PER_READ} before any
 * connection opens), per relay (one deadline), and per session (a distinct-relay
 * cap with TTL + eviction). This module is the transport for those reads.
 *
 * **What `applesauce-loaders` owns here** (the address-pointer loader):
 *
 * - the filter derivation: a kind-0 profile read and the kind-17375 wallet read are
 *   both replaceable events, so `{ kinds: [k], authors: [pubkey] }` *is* the address
 *   pointer `k:pubkey`. The loader derives the filter from the pointer instead of
 *   the call site spelling both out;
 * - the pointer matcher: an event a relay returns that does not match the requested
 *   pointer is dropped rather than merged, so a relay an author declared cannot
 *   inject an event for a *different* coordinate into the read (a read served by the
 *   hand-rolled filter path accepts whatever the relay returns for the filter);
 * - the relay-set request shape: `UpstreamPool` is the single place egress leaves
 *   this module, so the seam port stays the only relay stack the app talks to.
 *
 * **What stays hand-rolled, because no loader in applesauce-loaders 6.2.0 expresses
 * it — and saying otherwise would be the bug this comment exists to prevent:**
 *
 * - the per-read cap: a loader's own relay selection widens the relay set (pointer
 *   relay hints, `lookupRelays`), so the pool below **clamps every request to the
 *   session-admitted relays** and refuses anything else with no egress, and the
 *   address loader is created with `followRelayHints: false` and `lookupRelays: []`;
 * - serial execution: a loader issues ONE request for the whole relay set, so the
 *   pool iterates the admitted relays one at a time and never overlaps two;
 * - the per-relay deadline: `createAddressLoader` has no per-relay timeout, only a
 *   teardown `AbortSignal`. `SyncLoader` does carry a per-relay *progress* timeout,
 *   but it reconciles a relay by paging it backward until exhausted (and probes
 *   NIP-77 first), and `createTimelineLoader` pages backward in blocks for the same
 *   reason — both are more egress per relay than the single bounded REQ these reads
 *   promise, so the deadline stays here;
 * - the session cache: the loader's `cacheRequest` hook would serve from a second
 *   cache with none of this path's rules (purpose-namespaced key, TTL sweep, no
 *   negative entries), so it is not wired; the pool passes `eventStore: null` and
 *   dedupe/ordering stays with the seam's coordinate-level latest-wins merge.
 *
 * A read the pointer cannot express (the `#p` inbox reads name no author, and a
 * regular kind has no replaceable coordinate) is not dropped from the path: it uses
 * the same pool directly, which is where the serial + deadline discipline lives for
 * both. See `authorRelayLoaders.test.ts`.
 */
import type { NostrRequest, UpstreamPool } from 'applesauce-loaders'
import { createAddressLoader, type LoadableAddressPointer } from 'applesauce-loaders/loaders'
import { isReplaceableKind } from 'nostr-tools/kinds'
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs'
import type { NostrEvent } from 'nostr-tools/pure'

import type { NostrFilter } from './io'

// Bound to Node's timer type so the module does not depend on DOM lib types.
type TimerHandle = ReturnType<typeof setTimeout>

/**
 * No batching delay: one bounded read = one batch. The loaders' default (1000ms)
 * would sit inside the per-relay deadline and the deadline would decide the read.
 */
export const AUTHOR_RELAY_LOADER_BUFFER_MS = 0

/** Resolve `null` when a relay fetch exceeds its deadline or rejects. */
export function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
	return new Promise<T | null>((resolve) => {
		const timer: TimerHandle = setTimeout(() => resolve(null), timeoutMs)
		promise.then(
			(value) => {
				clearTimeout(timer)
				resolve(value)
			},
			() => {
				clearTimeout(timer)
				resolve(null)
			},
		)
	})
}

/**
 * The whole run's worst case: `relayCount` serially contacted relays, each capped at
 * its own deadline, plus one slot for the loader's batching/scheduling between the
 * batch flush and the first request. This is the backstop that keeps a run from
 * being inherited forever (`authorRelayRead.ts`), so it must not be tighter than
 * the per-relay bounds it covers.
 */
export function boundedRunDeadlineMs(perRelayTimeoutMs: number, relayCount: number): number {
	return perRelayTimeoutMs * (Math.max(relayCount, 1) + 1)
}

/**
 * Derive the address pointer a read can be expressed as, or `null` when the read is
 * wider or narrower than a pointer (`#p` inbox reads, regular kinds, multi-author or
 * multi-kind filters, or any additional selector).
 *
 * Only replaceable kinds qualify (`0`, `3`, `10000-19999`): an addressable kind needs
 * its `d` tag, and a read that carries no `#d` selector cannot name one.
 */
export function addressPointerForRead(filter: NostrFilter | NostrFilter[]): LoadableAddressPointer | null {
	const filters = Array.isArray(filter) ? filter : [filter]
	if (filters.length !== 1) return null

	const only = filters[0]
	const unsupported = Object.keys(only).filter((key) => key !== 'kinds' && key !== 'authors')
	if (unsupported.length > 0) return null

	const kinds = only.kinds ?? []
	const authors = only.authors ?? []
	if (kinds.length !== 1 || authors.length !== 1) return null

	const [kind] = kinds
	const [pubkey] = authors
	if (typeof kind !== 'number' || typeof pubkey !== 'string') return null
	if (!isReplaceableKind(kind)) return null

	return { kind, pubkey }
}

/**
 * A loader-shaped upstream pool, whose `request` is the bounded transport. It
 * structurally satisfies `UpstreamPool`, so any loader in the package can be given
 * this pool as its upstream.
 */
export interface BoundedRelayPool {
	request: NostrRequest
}

export interface BoundedRelayPoolOptions {
	/** The relays the session admitted for this read — the only set that may be contacted. */
	admittedRelays: ReadonlyArray<string>
	perRelayTimeoutMs: number
	/** The seam port. Called with exactly ONE relay URL per call. */
	fetchRawEvents: (relayUrls: string[], filters: NostrFilter[]) => Promise<NostrEvent[]>
	/** Tears the run down: no further relay is contacted once aborted. */
	signal?: AbortSignal
	/** Called with each relay as it is contacted, in serial order. */
	onRelayContacted?: (relayUrl: string) => void
	/** Called when a loader asks for a relay the session never admitted. */
	onRelayRefused?: (relayUrl: string) => void
}

/**
 * An `UpstreamPool` that accepts the loader's relay-set request and executes it as
 * this path's bounded transport: clamped to the admitted relays, serial, one
 * deadline per relay, a failing or silent relay skipped.
 *
 * The clamp is the load-bearing part: it is what keeps a loader's own relay
 * selection (pointer hints, lookup relays) from widening the per-read or per-session
 * bound. A relay outside the admitted set is refused with no egress at all.
 */
export function createBoundedRelayPool(options: BoundedRelayPoolOptions): BoundedRelayPool {
	const admitted = new Set(options.admittedRelays)

	const request: NostrRequest = (relays, filters) =>
		from(fetchAdmittedRelaysSerially(relays, filters as NostrFilter[], options, admitted)).pipe(mergeMap((events) => from(events)))

	return { request }
}

async function fetchAdmittedRelaysSerially(
	relays: string[],
	filters: NostrFilter[],
	options: BoundedRelayPoolOptions,
	admitted: Set<string>,
): Promise<NostrEvent[]> {
	const collected: NostrEvent[] = []
	for (const relayUrl of relays) {
		if (options.signal?.aborted) break
		if (!admitted.has(relayUrl)) {
			// Clamp, never widen: this relay is outside the bound the session admitted.
			options.onRelayRefused?.(relayUrl)
			continue
		}
		options.onRelayContacted?.(relayUrl)
		const events = await withDeadline(options.fetchRawEvents([relayUrl], filters), options.perRelayTimeoutMs)
		if (events) collected.push(...events)
	}
	return collected
}

/**
 * Read one address pointer through the loader, inside the bounds the pool enforces.
 *
 * `extraRelays` must be the session-admitted relays (the caller's own bound); the
 * loader gets no other relay source — relay hints are disabled and the lookup-relay
 * layer is empty — and the pool refuses anything outside it anyway.
 */
export async function loadAddressPointerEvents(
	pool: BoundedRelayPool,
	pointer: LoadableAddressPointer,
	options: { extraRelays: ReadonlyArray<string> },
): Promise<NostrEvent[]> {
	if (options.extraRelays.length === 0) return []

	// Deterministic teardown: the pool's per-relay deadline already bounds the
	// request itself, so this only has to drop whatever the loader still holds when
	// the read is done. `createAddressLoader` accepts no per-relay timeout, so the
	// teardown signal is the only lever it gives us. A caller that needs to tear the
	// read down from outside aborts the pool's own signal.
	const teardown = new AbortController()
	const loader = createAddressLoader(pool, {
		extraRelays: [...options.extraRelays],
		followRelayHints: false,
		lookupRelays: [],
		eventStore: null,
		bufferTime: AUTHOR_RELAY_LOADER_BUFFER_MS,
		signal: teardown.signal,
	})

	try {
		return await lastValueFrom(loader(pointer).pipe(toArray()), { defaultValue: [] })
	} finally {
		teardown.abort()
	}
}

/** Collect a filter read from the admitted relays through the same bounded pool. */
export async function loadFilterEvents(
	pool: BoundedRelayPool,
	relays: ReadonlyArray<string>,
	filter: NostrFilter | NostrFilter[],
): Promise<NostrEvent[]> {
	const filters = Array.isArray(filter) ? filter : [filter]
	return await lastValueFrom(pool.request([...relays], filters).pipe(toArray()), { defaultValue: [] })
}
