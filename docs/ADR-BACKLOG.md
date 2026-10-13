# ADR Backlog — Internal Priority Index

Private tracking of all ADR proposals. Not for upstream PR — this is the
internal control document for deciding what to surface to the team and when.

**Rule:** Only ONE ADR is surfaced to the team at a time. It is opened as a PR
only after discussion in a team meeting. The rest stay here as drafts until
their priority slot arrives.

---

## In Active Review (PRs already open upstream)

These are already open as PRs with team discussion happening. Not managed
by this backlog.

| ADR | PR | Title | Status |
|-----|-----|-------|--------|
| — | #1178 | Phase enums (state machines vs boolean flags) | Open, in discussion |
| — | #1179 | Store layer dependency rules | Open, in discussion |

---

## Backlog (Drafts on this branch, NOT yet surfaced)

Sorted by priority. Next to surface is #1.

### Priority 1: Relay Aggregation Strategy
- **File:** `docs/adr/ADR-XXX-relay-aggregation-strategy.md`
- **Problem:** Dead-relay fan-out causing latency and inconsistent state (#1046)
- **Why high priority:** Affects every user interaction. Applesauce migration
  may resolve this client-side, but needs team agreement on direction.
- **Decision needed:** Client-side (Applesauce only) vs server-side (Khatru)
  vs hybrid (bootstrap relay)
- **Blocking:** Closes out the closed PR #1115 with a clear architectural
  decision rather than leaving it ambiguous
- **Surfacing plan:** Present at next architecture discussion. Key question
  for hzrd149: does RelayPool handle dead-relay failover adequately?

### Priority 2: E2E Test Stabilization Strategy
- **File:** `docs/adr/ADR-XXX-e2e-test-stabilization-strategy.md`
- **Problem:** 20 e2e specs with unpredictable failures, blocking CI confidence
- **Why important:** Every PR is currently reviewed without reliable CI signal
- **Decision needed:** networkidle migration policy, unskip protocol, happy-path
  video requirement
- **Related code:** #1116 (e2e reliability PR — needs splitting; safe test
  fixes cherry-picked, broken test fixes dropped)
- **Surfacing plan:** After relay aggregation. Tie to the clean #1116 split.

### Priority 3: Relay Data Validation Enforcement
- **File:** `docs/adr/ADR-XXX-relay-data-validation-enforcement.md`
- **Problem:** 9 query files doing raw JSON.parse with zero validation —
  adversarial relay events can crash the SPA
- **Why important:** Security-relevant. AGENTS.md says "treat relay data as
  untrusted" but there's no enforcement mechanism
- **Decision needed:** safeParse vs parse default, strict vs passthrough schema,
  ESLint enforcement feasibility
- **Surfacing plan:** After e2e stabilization. Security angle may accelerate it.

### Priority 4: Error Boundary Strategy & Production Observability
- **File:** `docs/adr/XXX-error-boundary-and-observability.md`
- **Problem:** Zero React Error Boundaries + total console suppression in prod.
  Render errors = white screen, no recovery, no diagnostics.
- **Why lower priority:** Doesn't block development, but hurts production
  reliability and debugging
- **Decision needed:** Error reporting mechanism (self-hosted, Sentry,
  Nostr-based), per-route vs per-feature boundaries
- **Surfacing plan:** Lower urgency. Can wait until after the Applesauce
  migration settles.

---

## Workflow

1. **Draft:** ADR is written and lives on this branch as `docs/adr/ADR-XXX-*.md`
2. **Prioritize:** Position in this index determines surfacing order
3. **Surface:** Present at team meeting (one at a time). Get verbal agreement
   on the decision before opening a PR.
4. **Open PR:** Once discussed and direction agreed, open a focused PR with
   the ADR. Team reviews and merges.
5. **Number:** Assign final ADR number when ready to merge (current gap:
   0001, 0002, then 013, 014)

## Branch

All drafts live on `docs/pending-adrs-index` on the felixfelix-bot fork:
https://github.com/felixfelix-bot/market/tree/docs/pending-adrs-index

This branch tracks upstream/master and is only ever used for ADR drafts.
No code changes. No rebases onto feature branches.
