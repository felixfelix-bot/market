# ADR Proposals Index

This is the consolidated internal index of architectural proposals for Plebeian
Market. Only ONE proposal is surfaced to the team at a time for discussion.

This branch supersedes `docs/pending-adrs-index` (content merged here).

## Status Legend

- 🔵 **In review** — PR open upstream, team discussion active
- 🟡 **Ready to surface** — content complete, waiting for team meeting slot
- 🔴 **Needs work** — idea captured, not yet fleshed out
- ✅ **Decided** — merged or resolved, moved to archive

## Surfacing Protocol

1. Each proposal stays in this index until selected for team discussion
2. Only ONE proposal is surfaced at a time (per ADR Signal group meeting)
3. When surfaced: create a focused upstream PR, link it here, move status to 🔵
4. When merged: mark ✅ and move to the decisions archive
5. This branch is a living document — reorder priorities as understanding evolves

## Active Proposals

### In Review (PRs open upstream)

| # | Status | Title | PR | Key Question |
|---|--------|-------|----|-------------|
| 1 | 🔵 | [Phase enums (state machines)](./phase-enums.md) | #1178 | Migrate payment state from parallel booleans to discriminated union? |
| 2 | 🔵 | [Store layer dependency rules](./store-layer-deps.md) | #1179 | Allowed import direction: stores→queries or queries→stores? |

### Ready to Surface

| # | Status | Title | Key Question | Depends On |
|---|--------|-------|-------------|------------|
| 3 | 🟡 | [Relay data validation enforcement](./relay-data-validation.md) | Mandate Zod safeParse on all event.content parsing? | — |
| 4 | 🟡 | [Error boundary + observability](./error-boundary-observability.md) | React Error Boundaries + restore production error reporting? | — |
| 5 | 🟡 | [E2E test stabilization](./e2e-test-stabilization.md) | networkidle migration + test-unskip protocol? | — |
| 6 | 🟡 | [Client-side event aggregation](./aggregator-relay.md) | Use applesauce RelayPool+EventStore instead of server-side aggregator? | — |
| 7 | 🟡 | [Notification counting: scoped-map pattern](./notification-counting-scoped-map.md) | Convert all notification categories to per-entity scoped maps? | — |
| 8 | 🟡 | [Relay WebSocket origin validation (H1)](./relay-websocket-origin-validation.md) | CSWSH prevention: allowlist management + NIP-46 bunker compat? | — |
| 9 | 🟡 | [Payment input validation (H2)](./payment-input-validation.md) | Blanket verifyEvent() rule or payment-only? | — |
| 10 | 🟡 | [Wallet secret encryption at rest (H8)](./wallet-secret-encryption.md) | Key derivation strategy for NIP-07 extension users? | — |

### Needs Work (Drafts not yet complete)

| # | Status | Title | Key Question | Depends On |
|---|--------|-------|-------------|------------|
| 11 | 🔴 | [Notification event cache architecture](./notification-event-cache-architecture.md) | EventStore + nostr-idb + negentropy sync layers? | #6, ADR-0002 |
| 12 | 🔴 | [Notification derived state model](./notification-derived-state.md) | Eliminate counters; derive from EventStore + lastSeenTimestamps? | #11 |
| 13 | 🔴 | CVM server identity & NIP-53 pubkey model | How does CVM service derive/use Nostr identity? | — |
| 14 | 🔴 | ADR numbering scheme | Resolve fork/upstream numbering conflicts; assign at merge? | — |
| 15 | 🔴 | Documentation governance (merge with #1152) | Persistent rule + transient violations pattern | — |

## Notification Architecture — Dependency Chain

The notification proposals form a 3-phase migration path:

```
Phase 1: Scoped-Map Counting (#7)     ← immediate, works on NDK, no deps
    ↓
Phase 2: Event Cache Architecture (#11) ← requires ADR-0002 (applesauce) + #6 (aggregation decision)
    ↓
Phase 3: Derived State Model (#12)      ← requires #11 (EventStore as truth)
```

Phase 1 can ship independently as a bug fix. Phases 2-3 are gated on the
NDK→applesauce migration (ADR-0002) and the client-side aggregation decision (#6).

## Security Audit — Proposal Map

Security findings from Issue #996 (PRs #1074, #1118-closed):

| Finding | Topic | ADR-Gated? | Proposal |
|---------|-------|-----------|----------|
| H1 | WebSocket origin validation | **Yes** — policy decisions | #8 |
| H2 | Zap signature verification | **Disputed** — see note | #9 |
| H3/H4 | SSH hardening | No — direct fix | — |
| H5/H6/H7 | CI SHA pinning | No — direct fix | — |
| H8 | Wallet secret encryption | **Yes** — key management | #10 |

**H2 note:** The security remediation index classifies H2 as a non-ADR bug fix
("objectively a bug — no valid argument for accepting unsigned payment requests").
The proposal (#9) argues an ADR is still valuable to settle: (1) should
verifyEvent() be a blanket rule for ALL server-side event processing, or
payment-only? (2) Does "signature verified" constitute a new payment lifecycle
state per AGENTS.md? Suggested resolution: merge the code fix immediately, ADR
ratifies the broader policy.

## Decided / Archived

| Topic | Resolution | Date |
|-------|-----------|------|
| ADR-015: Relay persistence & staging recovery | Deprioritized — "yolo-nuke" runbook instead | 2026-07-23 |
| State machines as user-facing feature | No — internal code quality only | 2026-07-23 |
| Meta-ADR alignment with #1152 | Merge into single docs governance ADR | 2026-07-23 |

## Topics Identified but Not Yet Drafted

These were surfaced in team discussions or handover documents but have no
proposal stub yet. Listed for tracking.

- **Currency conversion service architecture** (upstream issue, TBD)
- **UI component migration & widget book** (Issue #1153)
- **Auction validation protocol** (Issue #1151, PR #1170 by hkarani)
- **V2 integration branch strategy** (PR #1167, self-assigned as 016, closed)
- **NIP-17 order message transport** (upstream ADR-013, proposed)
- **NIP-17 order transport migration** (upstream ADR-014, proposed)
