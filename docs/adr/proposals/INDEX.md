# ADR Proposals Index

This is an internal index of architectural proposals, sorted by priority and surfacing status. Only ONE proposal is surfaced to the team at a time for discussion.

## Status Legend
- 🔵 **In review** — PR open, team discussion active
- 🟡 **Ready to surface** — content complete, waiting for the right moment to present
- 🔴 **Needs work** — idea captured but not yet fleshed out

## Proposals

| # | Status | Title | Key Question | Surfaced To Team? |
|---|--------|-------|-------------|-------------------|
| 1 | 🔵 In review | [Phase enums (state machines) instead of parallel boolean flags](./phase-enums.md) | Migrate payment state from parallel booleans to discriminated union? | YES — PR #1178 |
| 2 | 🔵 In review | [Store layer dependency rules](./store-layer-deps.md) | What's the allowed import direction: stores→queries or queries→stores? | YES — PR #1179 |
| 3 | 🟡 Ready | [Relay data validation enforcement](./relay-data-validation.md) | Mandate Zod safeParse on all event.content parsing? | NO |
| 4 | 🟡 Ready | [Error boundary strategy + production observability](./error-boundary-observability.md) | React Error Boundaries + restore production error reporting? | NO |
| 5 | 🟡 Ready | [E2E test stabilization strategy](./e2e-test-stabilization.md) | networkidle migration + test-unskip protocol? | NO |
| 6 | 🟡 Ready | [Client-side event aggregation via applesauce](./aggregator-relay.md) | Use applesauce RelayPool+EventStore instead of server-side aggregator? | NO |

## Surfacing Protocol

1. Each proposal stays in this index until selected for team discussion
2. Only ONE proposal is surfaced at a time (per ADR Signal group meeting)
3. When surfaced: create a focused upstream PR, link it here, move status to 🔵
4. When merged: mark as decided and move to the decisions archive
5. This branch is a living document — reorder priorities as understanding evolves

## Notes

- This index replaces the previous approach of opening multiple ADR PRs simultaneously
- The goal is to reduce cognitive load on the team by controlling what gets reviewed and when
- All proposals are self-contained markdown files that can be lifted into upstream PRs when ready
