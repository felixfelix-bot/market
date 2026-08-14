# Relay Aggregation Strategy

## Status

Proposed — Number: ADR-xxx (assigned at upstream merge; formerly ADR-XXX on
`docs/pending-adrs-index`)

## Date

2026-07-25

## Context

The Plebeian Market client queries multiple Nostr relays for market events
(auctions, bids, products, settlements, messages). Many relays are dead or
slow, causing:

1. **Fan-out latency** — the client waits for N relay timeouts before showing data
2. **Inconsistent state** — different relays have different event sets, leading to stale or missing data
3. **Resource cost** — mobile clients maintain many WebSocket connections to unreliable relays

Issue #1046 documents the dead-relay fan-out problem.

A server-side caching aggregator relay was prototyped in closed PR #1115:
a Khatru relay that mirrors market-relevant events from upstream relays into
one fast relay. The client would prepend `MARKET_AGGREGATOR_RELAY` as its
primary read relay in production.

However, the project is migrating from NDK to Applesauce, which provides
client-side primitives that may address the same problem:

- **RelayPool** — manages multiple relay connections, handles reconnection and
  dead-relay detection
- **EventStore** — in-memory + persisted event cache with deduplication
- **nostr-idb** — IndexedDB-backed persistence for browser clients
- **negentropy sync** — efficient set reconciliation protocol

## Decision Drivers

- Cold-start latency (first visit, empty cache)
- Ongoing read latency (subsequent visits)
- Relay reliability and consistency guarantees
- Operational cost of running server-side infrastructure
- Applesauce migration timeline and capabilities
- Multi-device / multi-session state coherence

## Options

### Option 1: Client-side only (Applesauce)

Rely on Applesauce's RelayPool + EventStore + nostr-idb for all relay
management. No server-side aggregator infrastructure.

**Pros:**
- Zero server infrastructure to maintain
- Client-side caching means repeated reads don't re-hit dead relays
- RelayPool can timeout dead relays quickly and prefer healthy ones
- negentropy sync keeps local cache efficient
- Aligns with the Applesauce migration direction

**Cons:**
- Cold start still requires hitting upstream relays (slow first visit)
- No centralized consistency guarantee
- Mobile clients with no persistent cache still pay full fan-out cost

### Option 2: Server-side aggregator (Khatru)

Deploy a Khatru relay that mirrors market-relevant events. Clients prepend
it as primary read relay in production.

**Pros:**
- Single fast relay for all clients (low latency)
- Server-side consistency and deduplication
- Clients don't need to manage N relay connections for market data

**Cons:**
- New infrastructure to operate and monitor
- Single point of failure if not redundant
- Aggregator must stay in sync (scraper lag, missing events)
- Adds a trusted relay to the stack

### Option 3: Hybrid (Bootstrap relay + Applesauce)

A lightweight bootstrap relay that helps cold starts, then clients transition
to Applesauce-managed relay reads for ongoing data.

**Pros:**
- Fast cold start without full aggregator complexity
- Applesauce handles ongoing reads with caching
- Bootstrap relay can be read-only, low-maintenance

**Cons:**
- Still requires some server infrastructure
- Transition logic adds complexity
- Bootstrap relay must be kept current

## Open Questions

1. Does Applesauce's RelayPool handle dead-relay detection and failover
   adequately for production use at Plebeian Market's scale?
2. Is client-side caching sufficient for cold starts, or is the latency
   unacceptable for new users?
3. What is the operational cost of running a Khatru aggregator relay vs
   relying on client-side Applesauce?
4. If a server-side component is needed, should it be a full aggregator or
   just a bootstrap relay?
5. Can we ask hzrd149 (Applesauce author) for guidance on whether RelayPool
   + EventStore is designed to handle dead-relay fan-out in production?

## Recommendation

Defer decision until Applesauce migration reaches a point where RelayPool +
EventStore can be benchmarked for cold-start and dead-relay scenarios.

If benchmarks show acceptable performance, prefer Option 1 (client-side only).

If cold-start latency is unacceptable, pursue Option 3 (hybrid bootstrap relay).

## Related

- Issue #1046 (dead-relay fan-out)
- Closed PR #1115 (aggregator relay implementation — Khatru + scraper)
- ADR-0002 (Strangler-fig I/O migration — stores benefit from clean relay strategy)
- AGENTS.md relay strategy sections

## Provenance

Reconciled per D3 on 2026-08-14: this expanded ADR-XXX form (8 non-empty H2
sections, `docs/pending-adrs-index`) replaces the shorter applesauce-focused
proposal previously carried here (7 H2 sections). No live upstream PR backs
either form. The superseded concise form's framing (client-side aggregation
via applesauce as replacement for closed PR #1115) is preserved above via the
#1115 references.
