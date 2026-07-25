# ADR Proposal: Client-Side Event Aggregation via Applesauce (Replaces Server-Side Aggregator Relay)

## Context

PR #1115 proposed a **server-side aggregator relay** — a Khatru Go relay + Python scraper + app-side wiring — to consolidate Nostr events from multiple relays into a single caching endpoint. The goal was to reduce client-side relay connections, cache events centrally, and provide a unified view of the Nostr network.

**PR #1115 has been closed.** This document proposes an alternative architecture using applesauce's native client-side capabilities.

## Problem Statement

The Plebeian Market client needs to:
1. Query events from multiple Nostr relays
2. Cache events locally to reduce redundant relay queries
3. Present a unified, deduplicated view of events to the UI
4. Handle intermittent relay connectivity gracefully

## What Applesauce Already Provides (Client-Side)

The applesauce SDK (`applesauce-core`, `applesauce-relay`, `applesauce-loaders`) already solves all four problems natively, without a server-side relay:

### 1. Multi-Relay Management — `RelayPool`
```ts
import { RelayPool } from "applesauce-relay";

const pool = new RelayPool();
// Manages connections to multiple relays
// Methods: subscription(), request(), publish(), count()
```
`RelayPool` opens subscriptions across multiple relays simultaneously, aggregating results client-side.

### 2. Local Caching — IndexedDB via `nostr-idb`
```ts
import { NostrIDB } from "nostr-idb";

const nostrIDB = new NostrIDB();
await nostrIDB.start(); // starts background processes

// In-memory index caching for fast repeated queries
// Automatic batching for optimal write performance
```
Events persist in IndexedDB, surviving page reloads. Indexes are cached in memory for sub-millisecond lookups.

### 3. Unified Event Store — `EventStore`
```ts
import { EventStore } from "applesauce-core";

const eventStore = new EventStore();
// Reactive, in-memory store
// Deduplicates events by ID automatically
// UI components subscribe reactively
```

### 4. Cache-First Loading — `createEventLoaderForStore`
```ts
import { createEventLoaderForStore } from "applesauce-loaders/loaders";
import { persistEventsToCache } from "applesauce-core/helpers";

// Cache request function — checks IndexedDB first
const cacheRequest = (filters) => nostrIDB.filters(filters);

// Auto-persist new events to cache
persistEventsToCache(eventStore, async (events) => {
  await Promise.allSettled(events.map((event) => nostrIDB.add(event)));
});

// Loader: cache first, then relay fallback
createEventLoaderForStore(eventStore, pool, {
  cacheRequest,
  lookupRelays: ["wss://purplepag.es/", "wss://index.hzrd149.com/"],
});
```

The loader checks the local cache **before** hitting relays. New events from relays are automatically persisted to cache. This is the exact "aggregation + caching" pattern the server-side relay was trying to achieve.

## Architecture Comparison

| Concern | Server-Side Aggregator (#1115) | Applesauce Client-Side |
|---------|-------------------------------|----------------------|
| Multi-relay queries | Khatru Go relay fetches from upstream relays | `RelayPool` queries multiple relays directly |
| Event caching | Python scraper writes to relay DB | `nostr-idb` writes to IndexedDB |
| Deduplication | Relay handles replacement | `EventStore` deduplicates by event ID |
| Infrastructure cost | Requires hosting Go + Python services | Zero — runs in the browser |
| Latency | Extra hop through aggregator relay | Direct client → relay queries |
| Offline support | None (aggregator must be online) | IndexedDB cache works offline |
| Single point of failure | Aggregator relay goes down = everyone loses data | Each client has its own cache |
| Maintenance burden | Go binary + Python scraper + relay config | npm packages, auto-updated |

## Open Questions for ADR Discussion

1. **Read replica relays**: Do we need a curated list of read relays, or do we let the user configure their own? The `lookupRelays` parameter in `createEventLoaderForStore` controls which relays are queried for "lookup" operations (profile resolution, etc.).

2. **Negentropy sync**: Should we use applesauce's negentropy (set reconciliation) support for initial sync instead of full relay queries? This would dramatically reduce bandwidth on first load.

3. **Cache invalidation**: `nostr-idb` caches events indefinitely. Do we need a TTL or max-size eviction policy for stale events?

4. **Write relay strategy**: This ADR covers reads only. Publishing (writes) still needs a relay strategy — do we publish to a fixed set, or let the user choose?

5. **Migration path**: If we adopt this pattern, what replaces the current NDK-based relay interaction code? How much of the existing query layer needs to change?

## Recommendation

Use applesauce's native client-side stack (`RelayPool` + `EventStore` + `nostr-idb` + `createEventLoaderForStore`) instead of building a server-side aggregator relay. This eliminates infrastructure cost, reduces latency, provides offline support, and aligns with the ongoing NDK → applesauce migration.

## References

- [Applesauce caching docs](https://applesauce-mcp.build/docs/storage/caching)
- `applesauce-core` — EventStore, persistEventsToCache
- `applesauce-relay` — RelayPool (subscription, request, publish, count)
- `applesauce-loaders` — createEventLoaderForStore
- `nostr-idb` — IndexedDB persistence layer
- Closed PR #1115 — original server-side aggregator proposal
