# ADR Proposal: Scoped-Map Notification Counting Pattern

**Status:** Proposal (Draft)
**Phase:** 1 of 3 — immediate bridge fix
**Related PR:** #1142 (feat: auction notifications)
**Related ADR proposals:** [notification-event-cache-architecture](./notification-event-cache-architecture.md), [notification-derived-state](./notification-derived-state.md)

## Context

PR #1142 introduces a seller notification system that tracks "unseen" events
across six categories: auction bids, live-chat comments, NIP-22 thread
comments, product comments, auction-went-live transitions, and
settlement-began transitions.

Each category maintains a **global unseen count** (header badge) and a
**per-auction (or per-product) last-seen timestamp** (row-level "N New"
indicators). Two patterns coexist in `src/lib/stores/notifications.ts` for
managing these counts. One is correct; five categories use the other, which is
flawed.

## Problem Statement

**Five of six notification categories use a global-decrement pattern that
causes cross-auction count contamination.** Only the bids category uses the
correct scoped-map-summed pattern.

### Pattern A — Scoped-Map-Summed (correct, bids only)

The store holds a `ScopedUnseenCounts` map (`Record<string, number>`) keyed by
auction/product identifier. The global count is **always derived** via
`sumScopedUnseenCounts(map)`.

- **Increment:** map entry for the scope key is incremented; global re-summed.
- **Mark scope seen:** that entry is zeroed; global re-summed. Other scopes untouched.

The store is the single source of truth. No external count is trusted.

### Pattern B — Global-Decrement (flawed, 5 categories)

The store holds a single global integer. When a row calls "mark as seen," it
passes a `clearedCount` (the number of unseen items the row computed from its
own independent relay queries), and the store subtracts:
`global = max(0, global - clearedCount)`.

This is incorrect because `clearedCount` comes from the UI row's **independent**
relay queries, which diverge from the monitor's count due to:

1. Different relay sets — monitor and row subscribe to different relays.
2. Different deduplication — monitor maintains `seenEventIds`; rows may not.
3. Different exclusion rules — monitor excludes seller-authored events and
   non-countable statuses; rows are unaware of these rules.
4. Timing — events arrive between the row's fetch and the mark-as-seen click.

**Concrete failure:** Monitor counts 7 unseen comments (5 for auction A, 2 for
auction B). Row fetches 3 for auction A. User marks A as seen. Store computes
`7 - 3 = 4`. Correct answer is 2 (B's count). The 2-unit discrepancy becomes
phantom unseen notifications attributed to the wrong auction.

### Where each pattern is used today

| Category | Pattern | Status |
|----------|---------|--------|
| `unseenAuctionBidsByAuction` | Scoped-map-summed | ✅ Correct |
| `unseenAuctionComments` (live-chat) | Global-decrement | ❌ Flawed |
| `unseenAuctionEventComments` (NIP-22) | Global-decrement | ❌ Flawed |
| `unseenProductComments` | Global-decrement | ❌ Flawed |
| `unseenAuctionLive` | Global-decrement | ❌ Flawed |
| `unseenAuctionSettlementBegins` | Global-decrement | ❌ Flawed |

## Proposed Solution

**Convert all five flawed categories to the scoped-map-summed pattern.** The
bids category is the reference implementation.

### Rules

1. Each unseen count category stores a `ScopedUnseenCounts` map
   (`Record<string, number>`) keyed by the scope identifier (auction key or
   product coordinate).
2. The global count is **always derived** from the map via
   `sumScopedUnseenCounts`. It is never independently mutated.
3. Increment actions accept a scope key and update only that map entry.
4. Mark-seen actions accept a scope key and zero only that entry. The
   `clearedCount` parameter is removed — the store does not trust external
   counts.

### Sketch

```typescript
// State — per category
unseenAuctionCommentsByAuction: ScopedUnseenCounts  // Record<string, number>

// Increment — scope key, update entry, re-sum
incrementUnseenAuctionComments: (auctionKey?: string) => {
  notificationStore.setState((state) => {
    const scopedCounts = { ...state.unseenAuctionCommentsByAuction };
    if (auctionKey) scopedCounts[auctionKey] = (scopedCounts[auctionKey] || 0) + 1;
    return {
      ...state,
      unseenAuctionCommentsByAuction: scopedCounts,
      unseenAuctionComments: sumScopedUnseenCounts(scopedCounts),
    };
  });
}

// Mark seen — zero the entry, re-sum, no clearedCount
markAuctionCommentsSeen: (auctionKey?: string) => {
  notificationStore.setState((state) => {
    const scopedCounts = { ...state.unseenAuctionCommentsByAuction };
    if (auctionKey) scopedCounts[auctionKey] = 0;
    else Object.keys(scopedCounts).forEach((k) => (scopedCounts[k] = 0));
    return {
      ...state,
      unseenAuctionCommentsByAuction: scopedCounts,
      unseenAuctionComments: sumScopedUnseenCounts(scopedCounts),
    };
  });
}
```

## Consequences

### Positive

- Eliminates cross-auction notification contamination.
- Header badge count always equals the sum of per-scope counts.
- Store is the single source of truth — no dependency on row relay query
  results for count correctness.

### Costs

- State size increases slightly (one map per category instead of one integer).
- `recalculateFromEvents` signature grows (additional scoped map parameters).
- UI rows must pass scope keys instead of raw counts — minor API change.
- Lifecycle categories (live, settlement-begins) that fire from timers or
  reconciliation passes must have the auction key available at the call site.

## Decision Points

1. **`decrementUnseenCount` removal.** After conversion, this helper has no
   callers. Delete it in the same PR, or keep for backward compatibility?
   (Recommendation: delete — it's an internal store helper with no external
   consumers.)

2. **Product comments keying.** Confirm product comments are keyed by product
   coordinate (naddr) or event ID, matching how products are identified in UI
   rows.

3. **Lifecycle category scope keys.** The live and settlement-begins categories
   fire from `setTimeout` timers and reconciliation passes, not subscription
   events. Confirm the auction key is available at each increment call site.

4. **Generalize beyond notifications?** Codify scoped-map-summed as a project-
   wide standard for any per-entity count that aggregates to a global badge, or
   scope this ADR to the notification store only.

5. **Migration timing.** Land as a single commit on the auction notifications
   feature branch, or wait for that branch to merge first? (The change is
   backward-compatible — mark-seen ignores the removed parameter.)

## Dependencies

**None.** This fix works on the current NDK-based store today. No architecture
change, no migration, no new packages required.

This is the Phase 1 bridge fix. It eliminates the immediate cross-contamination
bug while the longer-term architectural work (Phase 2 cache, Phase 3 derived
state) proceeds in parallel.

## References

- `src/lib/stores/notifications.ts` — notification store containing both patterns
- `src/hooks/useNotificationMonitor.ts` — monitor that calls increment/recalculate
- `src/routes/_dashboard-layout/dashboard/products/auctions.tsx` — UI rows that call mark-seen
- AGENTS.md — "Preserve the distinction between UI/form state, query/cache state, relay state"
- PR #1142 — feat: auction notifications
