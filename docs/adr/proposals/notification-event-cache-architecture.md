# ADR Proposal: Local Event Cache Architecture (EventStore + nostr-idb + Negentropy Sync)

**Status:** Proposal (Draft)
**Phase:** 2 of 3 — requires architecture change
**Related PRs:** #1142 (feat: auction notifications), closed #1115 (server-side aggregator)
**Related ADR proposals:** [notification-counting-scoped-map](./notification-counting-scoped-map.md) (Phase 1), [notification-derived-state](./notification-derived-state.md) (Phase 3)

## Context

PR #1142's notification monitor opens ~15 relay subscriptions per seller
session — one per event category (bids, live-chat, thread comments, product
comments, live-activity, settlement, listings). Each subscription queries
multiple relays. On page reload, every subscription re-fetches from scratch.
There is no persistence between sessions.

This proposal addresses the caching and relay-connection architecture. It does
not address the counting pattern (Phase 1) or the derived-state model (Phase 3)
— those are separate proposals. It overlaps with the closed
[aggregator-relay](./aggregator-relay.md) proposal, which reached the same
applesauce-native conclusion from a different starting point.

## Problem Statement

The current NDK-based notification architecture has four failure modes:

1. **Cold starts.** Page reload = full re-fetch of all notification events from
   relays. Counts start at zero and build up slowly as relay responses arrive.
   The badge is wrong during the loading window.

2. **No offline support.** If relays are unreachable, notification counts show
   zero. Subscriptions die; there is no local fallback.

3. **N×15×M relay connection explosion.** N sellers × 15 subscriptions × M
   relays per subscription = a large number of open websocket connections and
   redundant event transfers.

4. **Bandwidth waste.** Full events are downloaded for every subscription,
   even if already cached or already seen by another subscription. No diff or
   set-reconciliation exists.

## Proposed Solution

A layered client-side architecture using applesauce's native packages. No
server-side infrastructure required.

### Layer 1 — EventStore (synchronous, in-memory)

The notification monitor reads exclusively from `EventStore`. Zero relay
latency. All reads are synchronous.

```typescript
import { EventStore } from 'applesauce-core'
const eventStore = new EventStore()
// Synchronous — instant
const events = eventStore.getByFilters({ kinds: [1023], '#a': [auctionKey] })
```

### Layer 2 — nostr-idb (IndexedDB, persistent)

Events persist in IndexedDB across page reloads. On load, EventStore is
repopulated from cache instantly, before any relay query fires.

```typescript
import { NostrIDB } from 'nostr-idb'
const nostrIDB = new NostrIDB({ cacheIndexes: 1000, maxEvents: 10000 })
await nostrIDB.start()
const cacheRequest = (filters) => nostrIDB.filters(filters)
```

### Layer 3 — RelayPool.sync (negentropy, diff-only)

`RelayPool.sync` (NIP-77) compares event ID inventories between client and
relay. Only the diff is transferred — not full events. This replaces 15
filter-specific subscriptions with a single reconciliation pass.

```typescript
import { RelayPool } from 'applesauce-relay'
const pool = new RelayPool()
pool
	.sync(
		['wss://relay.nostr.band', 'wss://nos.lol'],
		eventStore,
		{ kinds: [30000, 1023, 1024, 1025], authors: [sellerPubkey] },
		'down', // download direction only
	)
	.subscribe((event) => eventStore.add(event))
```

### Layer 4 — Event loader (orchestration)

`createEventLoaderForStore` wires cache → relay → EventStore. New events from
relays are auto-persisted to IndexedDB (non-blocking).

```typescript
import { createEventLoaderForStore } from 'applesauce-loaders/loaders'
import { persistEventsToCache } from 'applesauce-core/helpers'

createEventLoaderForStore(eventStore, pool, {
	cacheRequest,
	lookupRelays: ['wss://purplepag.es/', 'wss://index.hzrd149.com/'],
})
persistEventsToCache(eventStore, async (events) => {
	await Promise.allSettled(events.map((e) => nostrIDB.add(e)))
})
```

### Page-load flow

1. `nostrIDB.start()` → IndexedDB ready (~5ms)
2. EventStore repopulated from cache (instant, synchronous)
3. Notification counts available immediately — no relay wait
4. `RelayPool.sync` runs in background — fetches only missing events via negentropy
5. New events arrive → EventStore updates → counts update reactively
6. `persistEventsToCache` saves new events to IndexedDB (non-blocking)

### Selective caching (optimization)

Cache only notification-relevant kinds to keep storage bounded:

```typescript
persistEventsToCache(eventStore, async (events) => {
	const important = events.filter((e) => [0, 3, 30000, 1023, 1024, 1025, 30408, 30311].includes(e.kind))
	if (important.length > 0) await nostrIDB.addEvents(important)
})
```

## Consequences

### Positive

- Zero-latency notification counts on page load (synchronous EventStore reads).
- Offline-capable (IndexedDB persists across reloads and network loss).
- Dramatic bandwidth reduction (negentropy transfers event ID diffs, not full events).
- Eliminates 15 redundant subscriptions per session.

### Costs

- Depends on NDK → applesauce migration (ADR-0002) landing for the notification component.
- New runtime dependencies: `applesauce-core`, `applesauce-relay`, `applesauce-loaders`, `nostr-idb`.
- IndexedDB storage grows over time — needs eviction policy (see decision points).
- NIP-77 relay support is not universal — fallback to subscription-based fetch needed.

## Decision Points

1. **Cache backend: nostr-idb vs `window.nostrdb.js`?**
   - nostr-idb: explicit control, configured batch sizes, `maxEvents` limit.
   - `window.nostrdb.js`: transparent polyfill, browser-extension support
     (nostr-bucket), IndexedDB fallback. Progressive enhancement.
   - Recommendation: start with nostr-idb, add `window.nostrdb.js` later for
     extension users.

2. **Sync direction: "down" only or "both"?**
   - "down": client downloads missing events (sufficient for notification reads).
   - "both": client also uploads events relays lack (relevant if we publish
     notification-relevant events).
   - Recommendation: "down" for the notification cache.

3. **Sync trigger: interval vs visibility-change vs hybrid?**
   - Interval (every N minutes while tab active).
   - Visibility change (tab becomes visible → sync to catch sleep/background gap).
   - Hybrid (cold-start + visibility-change + periodic) — likely correct.
   - Recommendation: hybrid. Cold-start sync on mount, re-sync on
     `visibilitychange`, periodic interval as backstop.

4. **Cache eviction: TTL? LRU? size-based?**
   - `nostr-idb` has `maxEvents` with automatic pruning (oldest first).
   - Selective caching (only notification-relevant kinds) reduces volume.
   - Recommendation: both — selective caching minimizes volume, `maxEvents`
     prevents unbounded growth.

5. **Reactive framework: applesauce-react vs manual?**
   - `applesauce-react` provides a `use$` hook for observable subscriptions.
   - Manual `useEffect` + subscribe is framework-agnostic but more boilerplate.
   - Recommendation: `applesauce-react` (this is a React app).

6. **Multi-relay reconciliation.** Sync from all relays in parallel, or
   primary + fallback? Parallel is faster but may conflict; primary + fallback
   is simpler but slower.

## Dependencies

- **NDK → applesauce migration (ADR-0002).** This architecture uses
  applesauce's EventStore, RelayPool, and negentropy sync. Must land after or
  alongside the migration for the notification component. AGENTS.md already
  routes new relay I/O through `src/lib/nostr/io.ts`; the cache layer should be
  built there as part of Wave 0.
- **NIP-77 relay support.** Relays must support negentropy for the diff-only
  sync to work. Check relay capabilities before sync; fall back to
  subscription-based fetch for relays without NIP-77.

## References

- `applesauce-core` — EventStore, persistEventsToCache, isFromCache
- `applesauce-relay` — RelayPool, negentropy sync (NIP-77)
- `applesauce-loaders` — createEventLoaderForStore
- `nostr-idb` — IndexedDB persistence layer
- [NIP-77: Negentropy](https://github.com/nostr-protocol/nips/blob/master/77.md)
- PR #1142 — feat: auction notifications
- Closed PR #1115 — original server-side aggregator proposal
