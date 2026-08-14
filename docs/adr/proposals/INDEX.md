# ADR Proposals Index

Canonical catalog of fork-only ADR proposals on `adr/consolidated-collection`.
Consolidated 2026-08-14 from a 30-branch survey of the `felixfelix-bot/market`
fork (see `docs/adr/ADR-BACKLOG-HANDOVER.md` for the handover context).

**Numbering policy (uniform):** every fork-only ADR lives here UNNUMBERED as
`proposals/<kebab-name>.md`. A number is assigned only when the respective ADR
is merged upstream. Former fork numbers are preserved below as provenance
metadata only. Pre-consolidation commits in this branch's history carry a
superseded fork numbering scheme (0015/0016/0017 claims) — ignore those.

**Formatting note:** during consolidation the repo formatter (prettier) was
applied across `docs/adr/`; content differences vs. source branches introduced
by that pass are render-equivalent formatting only.

## Status Legend

- 🔵 **In review** — PR open, team discussion active
- 🟡 **Ready to surface** — content complete, waiting for the right moment
- 📝 **Draft** — early draft, needs revision before surfacing
- ✅ **Accepted upstream** — merged into upstream/master
- — not previously surfaced/indexed

---

## Master Catalog

| File                                                                                                                         | Status | Provenance branch(es)                                                                                                                                | Former #                      | Upstream PR                               | Notes                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| [phase-enums.md](./phase-enums.md)                                                                                           | 🔵     | consolidated; drafts on docs/adr-phase-enums (389L), docs/adr-refinement + docs/adr-verification (243L)                                              | XXX                           | #1178                                     | D3: live-PR proposal form kept over longer ADR-XXX drafts                      |
| [store-layer-deps.md](./store-layer-deps.md)                                                                                 | 🔵     | consolidated; identical ADR-XXX on docs/adr-store-layer, docs/adr-refinement, docs/adr-verification (491L)                                           | XXX                           | #1179                                     | D3: live-PR proposal form kept over ADR-XXX draft                              |
| [aggregator-relay.md](./aggregator-relay.md)                                                                                 | 🟡     | consolidated; expanded ADR-XXX form from docs/pending-adrs-index substituted 2026-08-14                                                              | XXX                           | #1115 (closed, prior art)                 | D3: no live PR, 8 H2 beats 7 H2 concise form                                   |
| [relay-data-validation.md](./relay-data-validation.md)                                                                       | 🟡     | consolidated; expanded ADR-XXX from docs/adr-relay-data-validation substituted                                                                       | XXX                           | #1176 (closed, replaced)                  | D3: 8 H2 beats 3 H2                                                            |
| [error-boundary-observability.md](./error-boundary-observability.md)                                                         | 🟡     | consolidated; expanded ADR-XXX from docs/adr-error-boundary-observability substituted                                                                | XXX                           | #1177 (closed, replaced)                  | D3: 8 H2 beats 3 H2                                                            |
| [e2e-test-stabilization.md](./e2e-test-stabilization.md)                                                                     | 🟡     | consolidated; expanded ADR-XXX from docs/adr-e2e-test-stabilization substituted                                                                      | XXX                           | #1116 (history), #1175 (closed, replaced) | D3: 9 H2 beats 4 H2; coordinate numbering w/ maximotodev PR #1174 (ADR-015)    |
| [notification-counting-scoped-map.md](./notification-counting-scoped-map.md)                                                 | 🟡     | collection chain (adr-collection ⊃ proposals-index ⊃ pending-adrs-index)                                                                             | —                             | —                                         | Notification Phase 1, ships standalone                                         |
| [notification-event-cache-architecture.md](./notification-event-cache-architecture.md)                                       | 🟡     | collection chain                                                                                                                                     | —                             | —                                         | Notification Phase 2, requires applesauce migration                            |
| [notification-derived-state.md](./notification-derived-state.md)                                                             | 🟡     | collection chain                                                                                                                                     | —                             | —                                         | Notification Phase 3, depends on Phase 2                                       |
| [websocket-origin-validation.md](./websocket-origin-validation.md)                                                           | 🟡     | collection chain; backs code on adr-input-validation-h1h2 (H1)                                                                                       | —                             | —                                         | Security                                                                       |
| [nwc-wallet-encryption.md](./nwc-wallet-encryption.md)                                                                       | 🟡     | collection chain; backs code on adr-encrypted-storage-h8 (H8)                                                                                        | —                             | —                                         | Security                                                                       |
| [payment-input-validation.md](./payment-input-validation.md)                                                                 | 🟡     | collection chain; backs code on adr-input-validation-h1h2 (H2)                                                                                       | —                             | —                                         | Security                                                                       |
| [security-remediation-strategy.md](./security-remediation-strategy.md)                                                       | 🟡     | collection chain; umbrella for audit #996 / closed PR #1118 H1–H8; backs adr-sha-pinning + adr-ssh-hardening-h3h4 code                               | —                             | —                                         | Security meta                                                                  |
| [handover-multiparty-payouts-rfc.md](./handover-multiparty-payouts-rfc.md)                                                   | —      | adr-collection                                                                                                                                       | —                             | —                                         | RFC handover doc, not previously indexed                                       |
| [HANDOVER-v4v-dev-splits.md](./HANDOVER-v4v-dev-splits.md)                                                                   | —      | adr-collection; also carried on docs/adr-e2e-parallelization                                                                                         | —                             | —                                         | v4v splits handover                                                            |
| [PLAN-v4v-dev-splits-implementation.md](./PLAN-v4v-dev-splits-implementation.md)                                             | —      | docs/adr-e2e-parallelization only (never carried by collection chain; added 2026-08-14)                                                              | —                             | —                                         | v4v splits implementation plan, status "awaiting Felix approval"               |
| [adr-v4v-dev-splits-DECISIONS.md](./adr-v4v-dev-splits-DECISIONS.md)                                                         | —      | adr-collection; also on docs/adr-e2e-parallelization                                                                                                 | —                             | —                                         | v4v splits decisions log                                                       |
| [v4v-dev-splits-auction.md](./v4v-dev-splits-auction.md)                                                                     | —      | adr-collection; also on docs/adr-e2e-parallelization                                                                                                 | —                             | —                                         | v4v auction split detail                                                       |
| [v4v-ui-agnostic-audit-and-plan.md](./v4v-ui-agnostic-audit-and-plan.md)                                                     | ✅     | collection chain; now carried by upstream/master                                                                                                     | —                             | —                                         | Accepted upstream — no further fork action                                     |
| [pr-trust-pipeline-deferred.md](./pr-trust-pipeline-deferred.md)                                                             | —      | consolidated (demoted); identical blob on adr/vitest-migration                                                                                       | 0016                          | —                                         | 0016 collides w/ upstream zap-ndk-isolation                                    |
| [e2e-test-parallelization.md](./e2e-test-parallelization.md)                                                                 | —      | consolidated (demoted); renumbered copy ADR-016 on docs/adr-e2e-parallelization (1-line title diff only)                                             | 0017 (also 016)               | —                                         | 0017 was internally disputed (untrusted-content draft claimed it)              |
| [vitest-mutation-testing-migration.md](./vitest-mutation-testing-migration.md)                                               | —      | consolidated (demoted); identical on adr/vitest-migration; proposal form on adr-collection; supersedes ADR-015 draft on docs/adr-e2e-parallelization | (unnumbered)                  | —                                         | Backs PR Trust Pipeline coverage gate                                          |
| [auctions-validation-protocol.md](./auctions-validation-protocol.md)                                                         | —      | snapshot copy (blob 73ae30dd) from feat/direct-lightning-bid-funding; identical on docs/closed-pr-handover, docs/adr-e2e-parallelization             | 0003                          | —                                         | D4: integration branch authoritative until its PR merges                       |
| [direct-lightning-bid-funding.md](./direct-lightning-bid-funding.md)                                                         | —      | snapshot copy (blob b6642aa4) from feat/direct-lightning-bid-funding; identical on docs/closed-pr-handover                                           | 0004                          | —                                         | D4: integration branch authoritative until its PR merges                       |
| [currency-conversion-fallback.md](./currency-conversion-fallback.md)                                                         | —      | adr/currency-conversion-fallback                                                                                                                     | TBD                           | —                                         | Status "Issue" — 3 overlapping client rate layers + server aggregator          |
| [explicit-relay-persistence-and-isolated-staging-recovery.md](./explicit-relay-persistence-and-isolated-staging-recovery.md) | —      | agent/adr-staging-relay-recovery                                                                                                                     | 015                           | —                                         | 015 collides w/ upstream production-safe-ndk-filters                           |
| [product-format-stock-shipping-orthogonal-dimensions.md](./product-format-stock-shipping-orthogonal-dimensions.md)           | —      | docs/adr-016-product-orthogonal-dimensions                                                                                                           | 016                           | #1201 (context: digital-detection fix)    | 016 collides w/ upstream zap-ndk-isolation                                     |
| [semantic-color-tokens.md](./semantic-color-tokens.md)                                                                       | —      | docs/adr-semantic-color-tokens                                                                                                                       | XXX                           | —                                         | All colors via CSS variable / Tailwind tokens                                  |
| [status-communication.md](./status-communication.md)                                                                         | —      | docs/adr-status-communication                                                                                                                        | XXX                           | —                                         | Shared status components; pairs with semantic-color-tokens                     |
| [untrusted-content-rendering-and-markdown-descriptions.md](./untrusted-content-rendering-and-markdown-descriptions.md)       | —      | docs/adr-untrusted-content                                                                                                                           | XXX (claimed 0017, withdrawn) | prior art #475, #684 (closed)             | 0017 claim withdrawn under uniform policy                                      |
| [v2-merge-deployment-strategy.md](./v2-merge-deployment-strategy.md)                                                         | 📝     | adr/v2-merge-deployment-strategy (cleaned per Q3: leaked AI text stripped, Draft status)                                                             | (draft claimed 0016, stale)   | —                                         | Internal ADR references use stale external numbering — revise before surfacing |

---

## Notification System (3-Phase Sequence)

Phase 1 is a standalone bridge fix; Phase 2 requires the NDK→applesauce
migration; Phase 3 depends on Phase 2.

| Phase | File                                                                         | Key Question                                                                           |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1     | [Scoped-map notification counting](./notification-counting-scoped-map.md)    | Replace global-decrement counters with scoped maps to fix cross-auction contamination? |
| 2     | [Local event cache architecture](./notification-event-cache-architecture.md) | IndexedDB + negentropy sync (NIP-77) to replace 15 relay subscriptions?                |
| 3     | [Derived read/unread notification state](./notification-derived-state.md)    | EventStore as single source of truth — derive counts, persist only timestamps?         |

## Auction Bug Research & Improvements

Bugs and improvement areas found during adversarial analysis of the auction
validator (PR #1170). Not blockers for #1170 — documented for focused follow-up.
See [`bug-research-and-improvements/`](./bug-research-and-improvements/README.md).

---

## Surfacing Protocol

1. Each proposal stays in this index until selected for team discussion
2. Only ONE proposal is surfaced at a time (per ADR Signal group meeting)
3. When surfaced: create a focused upstream PR, link it here, move status to 🔵
4. When merged upstream: assign its ADR number, mark ✅, move to the decisions archive
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

Newly consolidated 2026-08-14 (not yet ranked): pr-trust-pipeline-deferred,
e2e-test-parallelization, vitest-mutation-testing-migration,
auctions-validation-protocol, direct-lightning-bid-funding,
currency-conversion-fallback, explicit-relay-persistence-and-isolated-staging-recovery,
product-format-stock-shipping-orthogonal-dimensions, semantic-color-tokens,
status-communication, untrusted-content-rendering-and-markdown-descriptions,
v2-merge-deployment-strategy.

---

## Surveyed Branch Dispositions (30/30, 2026-08-14)

Every ADR-bearing candidate branch surveyed, with its disposition in this
consolidation.

| #   | Branch                                       | Disposition                 | Reason                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `adr/consolidated-collection`                | **included (base)**         | This branch. Its 3 numbered ADRs demoted to unnumbered proposals per uniform numbering policy                                                                                                                                                                       |
| 2   | `adr/currency-conversion-fallback`           | included                    | → currency-conversion-fallback.md (formerly ADR-TBD)                                                                                                                                                                                                                |
| 3   | `adr-encrypted-storage-h8`                   | excluded (code-only)        | No docs/adr files; ADR = nwc-wallet-encryption.md proposal; code branch untouched                                                                                                                                                                                   |
| 4   | `adr-input-validation-h1h2`                  | excluded (code-only)        | No docs/adr files; ADRs = websocket-origin-validation.md, payment-input-validation.md                                                                                                                                                                               |
| 5   | `adr-sha-pinning`                            | excluded (code-only)        | No dedicated ADR file; covered by security-remediation-strategy.md                                                                                                                                                                                                  |
| 6   | `adr-ssh-hardening-h3h4`                     | excluded (code-only)        | No dedicated ADR file; covered by security-remediation-strategy.md                                                                                                                                                                                                  |
| 7   | `adr/ui-components-migration`                | excluded (superseded)       | ADR draft is an expanded copy of already-accepted upstream ADR-0007; branch's 16 nondocs files are a separate concern                                                                                                                                               |
| 8   | `adr/v2-merge-deployment-strategy`           | included                    | → v2-merge-deployment-strategy.md (Draft; leaked AI text stripped per Q3)                                                                                                                                                                                           |
| 9   | `adr/vitest-migration`                       | excluded (duplicate)        | ADR-0016-pr-trust + ADR-vitest blobs byte-identical to consolidated subset                                                                                                                                                                                          |
| 10  | `agent/adr-staging-relay-recovery`           | included                    | → explicit-relay-persistence-and-isolated-staging-recovery.md (demoted from colliding 015)                                                                                                                                                                          |
| 11  | `cherry-pick-adr`                            | excluded (not ADR)          | Adds a migration _plan_ doc + Wave-0 seam; superseded by accepted ADR-0002 + AGENTS Wave-0                                                                                                                                                                          |
| 12  | `docs/adr-016-product-orthogonal-dimensions` | included                    | → product-format-stock-shipping-orthogonal-dimensions.md (demoted from colliding 016)                                                                                                                                                                               |
| 13  | `docs/adr-collection`                        | excluded (chain stage)      | Older superset stage; content fully subsumed by this branch; its vitest proposal form honored via demotion                                                                                                                                                          |
| 14  | `docs/adr-e2e-parallelization`               | partially included          | 289-commit integration branch (R1: ADR content only): ADR-0003 blob included via feat-branch copy; e2e-parallelization content included via consolidated ADR-0017 form (1-line title diff); ADR-015 vitest draft superseded by vitest-mutation-testing-migration.md |
| 15  | `docs/adr-e2e-test-stabilization`            | included                    | Expanded ADR-XXX form substituted into e2e-test-stabilization.md per D3                                                                                                                                                                                             |
| 16  | `docs/adr-error-boundary-observability`      | included                    | Expanded ADR-XXX form substituted into error-boundary-observability.md per D3                                                                                                                                                                                       |
| 17  | `docs/adr-phase-enums`                       | content reconciled          | 389L expanded draft loses to live-PR #1178 proposal form (D3 live-PR criterion outranks H2 count); loser noted in phase-enums row                                                                                                                                   |
| 18  | `docs/adr-proposals-index`                   | excluded (chain stage)      | Superset of pending-adrs-index; subsumed                                                                                                                                                                                                                            |
| 19  | `docs/adr-refinement`                        | excluded (duplicate)        | Older 243L phase-enums + identical store-layer blobs; superseded                                                                                                                                                                                                    |
| 20  | `docs/adr-relay-data-validation`             | included                    | Expanded ADR-XXX form substituted into relay-data-validation.md per D3                                                                                                                                                                                              |
| 21  | `docs/adr-semantic-color-tokens`             | included                    | → semantic-color-tokens.md                                                                                                                                                                                                                                          |
| 22  | `docs/adr-status-communication`              | included                    | → status-communication.md                                                                                                                                                                                                                                           |
| 23  | `docs/adr-store-layer`                       | content reconciled          | 491L ADR-XXX loses to live-PR #1179 proposal form (D3 live-PR criterion); loser noted in store-layer-deps row                                                                                                                                                       |
| 24  | `docs/adr-untrusted-content`                 | included                    | → untrusted-content-rendering-and-markdown-descriptions.md (ADR-0017 claim withdrawn)                                                                                                                                                                               |
| 25  | `docs/adr-verification`                      | excluded (duplicate)        | Phase-enums + store-layer blobs identical to refinement; analysis branch with 134 nondocs files                                                                                                                                                                     |
| 26  | `docs/agents-adr`                            | excluded (merged)           | Fully merged into upstream (0 commits ahead); dead                                                                                                                                                                                                                  |
| 27  | `docs/agents-adr-governance`                 | excluded (not ADR)          | AGENTS.md bot-taxonomy edits only; not ADR-bearing                                                                                                                                                                                                                  |
| 28  | `docs/closed-pr-handover`                    | content included via copies | ADR-0003/0004 blobs identical to feat branch — copies taken from feat branch; handover/salvage docs stay on that branch (see ADR-BACKLOG-HANDOVER.md)                                                                                                               |
| 29  | `docs/pending-adrs-index`                    | content included            | Earliest chain stage; its relay-aggregation ADR-XXX substituted into aggregator-relay.md; 4 other ADR-XXX forms were already proposal-identical                                                                                                                     |
| 30  | `feat/direct-lightning-bid-funding`          | content included (snapshot) | ADR-0003/0004 copied as proposals (D4 snapshot; integration branch stays authoritative until its PR merges)                                                                                                                                                         |

---

## Notes

- This index replaces the previous approach of opening multiple ADR PRs simultaneously
- The goal is to reduce cognitive load on the team by controlling what gets reviewed and when
- All proposals are self-contained markdown files that can be lifted into upstream PRs when ready
- The collection chain (pending-adrs-index ⊂ proposals-index ⊂ adr-collection ⊂ consolidated-collection) history is preserved; this catalog supersedes all earlier per-stage indexes
