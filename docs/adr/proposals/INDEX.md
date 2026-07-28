# ADR Proposals Index

This is an internal index of architectural proposals, sorted by priority and
surfacing status. Only ONE proposal is surfaced to the team at a time for
discussion.

This branch consolidates all ADR drafts from the `docs/pending-adrs-index`
branch. Proposals live here as self-contained markdown files that can be lifted
into upstream PRs when ready.

## Status Legend
- 🔵 **In review** — PR open, team discussion active
- 🟡 **Ready to surface** — content complete, waiting for the right moment
- 🔴 **Needs work** — idea captured but not yet fleshed out

---

## Proposals

### In Active Review (PRs open upstream)

| # | Status | Title | Key Question | PR |
|---|--------|-------|-------------|-----|
| 1 | 🔵 In review | [Phase enums (state machines)](./phase-enums.md) | Migrate payment state from parallel booleans to discriminated union? | #1178 |
| 2 | 🔵 In review | [Store layer dependency rules](./store-layer-deps.md) | Allowed import direction: stores→queries or queries→stores? | #1179 |

### Architecture & Infrastructure

| # | Status | Title | Key Question |
|---|--------|-------|-------------|
| 3 | 🟡 Ready | [Client-side event aggregation via applesauce](./aggregator-relay.md) | Use applesauce RelayPool+EventStore instead of server-side aggregator? |
| 4 | 🟡 Ready | [Relay data validation enforcement](./relay-data-validation.md) | Mandate Zod safeParse on all event.content parsing? |
| 5 | 🟡 Ready | [Error boundary strategy + production observability](./error-boundary-observability.md) | React Error Boundaries + restore production error reporting? |
| 6 | 🟡 Ready | [E2E test stabilization strategy](./e2e-test-stabilization.md) | networkidle migration + test-unskip protocol? |

### Notification System (3-Phase Sequence)

The notification system has three interrelated problems, each warranting its own
ADR. They form a phased sequence — Phase 1 is a standalone bridge fix, Phase 2
requires the applesauce migration, Phase 3 builds on Phase 2.

| Phase | Status | Title | Key Question |
|-------|--------|-------|-------------|
| 1 | 🟡 Ready | [Scoped-map notification counting](./notification-counting-scoped-map.md) | Replace global-decrement counters with scoped maps to fix cross-auction contamination? |
| 2 | 🟡 Ready | [Local event cache architecture](./notification-event-cache-architecture.md) | IndexedDB + negentropy sync (NIP-77) to replace 15 relay subscriptions? |
| 3 | 🟡 Ready | [Derived read/unread notification state](./notification-derived-state.md) | EventStore as single source of truth — derive counts, persist only timestamps? |

**Phase 1 ships standalone** (no applesauce dependency). Phase 2 requires the
NDK→applesauce migration. Phase 3 depends on Phase 2.

### Security

| # | Status | Title | Key Question |
|---|--------|-------|-------------|
| 7 | 🟡 Ready | [WebSocket origin validation](./websocket-origin-validation.md) | ALLOWED_ORIGINS policy to prevent CSWSH? |
| 8 | 🟡 Ready | [NWC wallet secret encryption at rest](./nwc-wallet-encryption.md) | AES-256-GCM + HKDF key derivation from user's nostr key? |
| 9 | 🟡 Ready | [Payment flow input validation](./payment-input-validation.md) | Mandatory verifyEvent() before payment state transitions? |

### Meta

| # | Status | Title | Key Question |
|---|--------|-------|-------------|
| 10 | 🟡 Ready | [Security remediation strategy](./security-remediation-strategy.md) | Split findings into ADR-gated vs direct-implementation tracks? |

---

## Surfacing Protocol

1. Each proposal stays in this index until selected for team discussion
2. Only ONE proposal is surfaced at a time (per ADR Signal group meeting)
3. When surfaced: create a focused upstream PR, link it here, move status to 🔵
4. When merged: mark as decided and move to the decisions archive
5. This branch is a living document — reorder priorities as understanding evolves

## Priority Guidance

Suggested next-to-surface order (after current PRs #1178, #1179 resolve):

1. **Phase 1: Scoped-map notification counting** — standalone fix, no deps, immediate bug fix
2. **Security remediation strategy** — frames the security track, helps prioritize
3. **WebSocket origin validation** — critical security, implementation ready
4. **Payment flow input validation** — critical security, implementation ready
5. **NWC wallet encryption** — critical security, needs key derivation decision
6. **Relay data validation** — security-relevant, pairs well with input validation
7. **Client-side event aggregation** — sets direction for Phase 2 of notifications
8. **Phase 2: Local event cache** — requires applesauce migration
9. **Phase 3: Derived read/unread state** — requires Phase 2
10. **Error boundary + observability** — lower urgency
11. **E2E test stabilization** — lower urgency

### Known Bugs Under Investigation

Bugs found during adversarial analysis of the auction validator (PR #1170).
Not blockers for #1170 — documented for focused follow-up work.

| # | Severity | Title | Fix Estimate | Key File |
|---|----------|-------|--------------|----------|
| 1 | Critical | [Top-bid self-revalidation oscillation](./bugs-to-investigate/01-top-bid-oscillation.md) | ~10 lines | `lifecycle.ts:414` |
| 2 | Critical | [Relay-order last-writer-wins](./bugs-to-investigate/02-relay-order-last-writer-wins.md) | ~30 lines | `state.ts:277,292` |

See [`bugs-to-investigate/`](./bugs-to-investigate/README.md) for detailed analysis.

---

## Notes

- This index replaces the previous approach of opening multiple ADR PRs simultaneously
- The goal is to reduce cognitive load on the team by controlling what gets reviewed and when
- All proposals are self-contained markdown files that can be lifted into upstream PRs when ready
- The `docs/pending-adrs-index` branch content has been consolidated here
