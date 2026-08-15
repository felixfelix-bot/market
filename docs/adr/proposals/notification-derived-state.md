# ADR Proposal: Derived Read/Unread Notification State

**Status:** Proposal (Draft)
**Phase:** 3 of 3 — end-state architecture
**Depends on:** [notification-event-cache-architecture](./notification-event-cache-architecture.md) (Phase 2)
**Related PR:** #1142 (feat: auction notifications)
**Related ADR proposals:** [notification-counting-scoped-map](./notification-counting-scoped-map.md) (Phase 1), [notification-event-cache-architecture](./notification-event-cache-architecture.md) (Phase 2)

## Context

This is the third and final proposal in a three-phase notification
architecture. Phase 1 ([scoped-map counting](./notification-counting-scoped-map.md))
fixes the immediate cross-auction contamination bug on the current NDK store.
Phase 2 ([local event cache](./notification-event-cache-architecture.md))
introduces EventStore + nostr-idb + negentropy sync so the monitor reads from a
local, persistent, synchronous store.

This proposal addresses the root cause that Phases 1 and 2 work around: **the
notification store maintains derived state (integer counters) instead of
deriving state from events.** Once Phase 2 makes EventStore the source of
truth, the counters themselves become redundant — they can be computed
synchronously on every read.

## Problem Statement

The notification store tracks **derived counters** that drift and diverge:

- Unseen counts are stored as integers (or scoped maps of integers).
- Multiple code paths increment, decrement, re-sum, and zero these counters.
- The monitor maintains counters from relay subscription callbacks; UI rows
  recompute counts from their own relay queries; the two can disagree.
- Per-event read/unread is not a first-class concept. The store knows "there
  are 5 unseen bid events across all auctions" — not which specific events are
  unread.

This is why the Phase 1 counting bug exists. If read/unread were tracked
per-event (or per-scope-timestamp), counters would be unnecessary — they'd be
derived values that are always correct by construction.

## Proposed Solution

**The only mutable state is `lastSeenTimestamps`** — a tiny map persisted to
localStorage. Everything else is derived synchronously from EventStore.

### The model

```
Mutable state (persisted to localStorage, ~1KB for a typical seller):
  lastSeenTimestamps = {
    auctionBids:      { "auction-A": 1700000100, "auction-B": 1700000200 },
    auctionComments:  { "auction-A": 1700000100, "auction-B": 1700000200 },
    ...
  }

Everything else is DERIVED from EventStore:
  unseenBidsFor(auctionKey) = eventStore.getByFilters({
    kinds: [1023],
    "#a": [auctionKey],
    since: lastSeenTimestamps.auctionBids[auctionKey]
  }).length

  totalUnseenBids = sum over all auctionKeys of unseenBidsFor(auctionKey)
```

### Synchronous derivation

EventStore queries are synchronous and in-memory. No async, no promises:

```typescript
function getUnseenCount(category: string, auctionKey: string): number {
	const lastSeen = lastSeenTimestamps[category]?.[auctionKey] || 0
	return eventStore.getByFilters({
		kinds: NOTIFICATION_KINDS[category],
		'#a': [auctionKey],
		since: lastSeen,
	}).length
}

function getTotalUnseen(category: string): number {
	return Object.keys(lastSeenTimestamps[category] || {}).reduce((sum, key) => sum + getUnseenCount(category, key), 0)
}
```

### Mark as read = update one timestamp

"Marking as seen" becomes trivial — update one timestamp and everything
downstream is correct. No counter manipulation, no map zeroing, no re-summing:

```typescript
function markAsRead(category: string, auctionKey: string) {
	lastSeenTimestamps[category] = {
		...lastSeenTimestamps[category],
		[auctionKey]: Math.floor(Date.now() / 1000),
	}
	localStorage.setItem('lastSeenTimestamps', JSON.stringify(lastSeenTimestamps))
	// All derived counts immediately reflect the change
}
```

### Reactive updates

EventStore supports observable subscriptions. When new events arrive, derived
counts update automatically via `applesauce-react`'s `use$` hook:

```typescript
import { use$ } from 'applesauce-react'

function useUnseenBids(auctionKey: string): number {
	return use$(
		eventStore.filters({ kinds: [1023], '#a': [auctionKey] }).pipe(
			map((events) => {
				const lastSeen = lastSeenTimestamps.auctionBids[auctionKey] || 0
				return events.filter((e) => e.created_at > lastSeen).length
			}),
		),
	)
}
```

### Cache-origin suppression

`isFromCache` distinguishes events rehydrated from IndexedDB on page load from
genuinely new network events. This prevents firing notifications for events the
user already saw before reload:

```typescript
import { isFromCache } from 'applesauce-core/helpers'
eventStore.insert$.subscribe((event) => {
	if (!isFromCache(event)) triggerNotification(event)
})
```

## Consequences

### Positive

- Eliminates the entire class of counting bugs (the root cause Phases 1 and 2
  work around).
- Per-event read/unread becomes first-class — queryable, debuggable.
- Persisted state is tiny (~1KB timestamps vs. potentially large event sets).
- Counts are always exact and current — no reconciliation, no drift.

### Costs

- Requires Phase 2 (cache architecture) as a hard prerequisite. EventStore must
  be the source of truth before counters can be removed.
- All consumers of the notification store must migrate from reading counter
  fields to calling derived functions or hooks.
- `recalculateFromEvents` and all increment/decrement actions are removed — a
  significant refactor of the store API.
- Performance of synchronous `getByFilters` on every badge render must be
  verified at scale (mitigated by `applesauce-react` memoization).

## Decision Points

1. **Timestamp-based vs event-ID-set for "read" tracking?**
   - Timestamp: `event.created_at <= lastSeenTimestamp[scope]` → read. Simple,
     no per-event state, matches the current `lastSeenTimestamps` pattern.
   - Event-ID set: maintain a `Set<string>` of read event IDs. Precise but
     heavier (storage grows, needs pruning).
   - Recommendation: timestamp-based. Simpler, sufficient for notifications.

2. **`lastSeenTimestamps` storage location?**
   - `localStorage` (current pattern): synchronous, simple, ~1KB.
   - EventStore metadata / nostr-idb: keeps all state in one place, but adds
     read latency on cold start.
   - Recommendation: localStorage. It's tiny, synchronous, and must be
     available before EventStore rehydrates.

3. **Reactive update mechanism?**
   - `applesauce-react` `use$` hook (idiomatic for React).
   - Manual `useEffect` + `eventStore.insert$.subscribe`.
   - Recommendation: `applesauce-react` — this is a React app.

4. **Scope key enumeration.** `getTotalUnseen` iterates over keys in
   `lastSeenTimestamps[category]`. What if a new auction exists in EventStore
   but has no entry in `lastSeenTimestamps` yet? The timestamp defaults to 0,
   so all its events count as unseen — correct behavior, but confirm the
   enumeration covers all active scopes.

## Dependencies

- **[notification-event-cache-architecture](./notification-event-cache-architecture.md)
  (Phase 2) is a hard prerequisite.** EventStore must be the single source of
  truth, populated from IndexedDB on load and kept fresh via negentropy sync,
  before counters can be removed and replaced with derived values.
- This proposal cannot proceed until Phase 2 is complete. Phase 1 (scoped-map
  counting) remains the correct interim approach in the meantime.

## References

- `applesauce-core` — EventStore, isFromCache, persistEventsToCache
- `applesauce-react` — use$ hook for observable subscriptions
- `src/lib/stores/notifications.ts` — current store (to be refactored)
- `src/hooks/useNotificationMonitor.ts` — current monitor (to be rewritten)
- PR #1142 — feat: auction notifications
