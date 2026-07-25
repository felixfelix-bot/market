# Pending ADR Index — For Team Discussion

This document lists architectural decisions drafted but not yet formally
reviewed by the team. All ADR drafts live on this branch. We surface them
**one at a time** at team meetings, get verbal agreement on direction, then
open a focused PR for merge.

---

## Drafts on This Branch

1. **[Relay Aggregation Strategy](docs/adr/ADR-XXX-relay-aggregation-strategy.md)**
   - Problem: Dead-relay fan-out causes latency and inconsistent state (#1046)
   - Question: Client-side (Applesauce RelayPool/EventStore) vs server-side aggregator (Khatru) vs hybrid?

2. **[E2E Test Stabilization Strategy](docs/adr/ADR-XXX-e2e-test-stabilization-strategy.md)**
   - Problem: 20 e2e specs with unpredictable failures, unreliable CI
   - Question: networkidle migration, unskip protocol, happy-path video requirement

3. **[Relay Data Validation Enforcement](docs/adr/ADR-XXX-relay-data-validation-enforcement.md)**
   - Problem: 9 query files doing raw JSON.parse with zero validation — adversarial events can crash SPA
   - Question: safeParse vs parse, strict vs passthrough schema, ESLint enforcement

4. **[Error Boundary Strategy & Production Observability](docs/adr/ADR-XXX-error-boundary-and-observability.md)**
   - Problem: Zero error boundaries + total console suppression in production
   - Question: Error reporting mechanism, boundary granularity

---

## Already In Active Review (NOT part of this backlog)

- **#1178** — Phase enums (state machines vs boolean flags)
- **#1179** — Store layer dependency rules

---

## How This Works

1. All ADR drafts live on this branch as `docs/adr/ADR-XXX-*.md`
2. We surface **one at a time** at team meetings
3. After verbal agreement on direction, we open a focused PR
4. Team reviews and merges independently — no blocking chain
