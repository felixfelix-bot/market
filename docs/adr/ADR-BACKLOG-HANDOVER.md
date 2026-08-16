# ADR Backlog Handover

**Branch identity:** `adr/consolidated-collection` on `felixfelix-bot/market` is
THE ADR consolidation branch. It is fork-internal: it collects every fork-only
ADR proposal in one place and is **never opened as a PR against
PlebeianApp/market**. Individual proposals are surfaced upstream one at a time
as focused PRs (see the surfacing protocol in the index).

**Catalog:** [`docs/adr/proposals/INDEX.md`](./proposals/INDEX.md) — one row per
proposal file (name, status, provenance branches, former fork number, related
upstream PR, notes) plus the full 30-branch survey disposition table.

## Numbering Policy

Fork proposals are **unnumbered**. An `ADR-NNNN` number is assigned only when
the respective ADR is merged upstream, by the person performing that merge.
Former fork numbers (0003, 0004, 0015, 0016, 0017, TBD, XXX) appear only as
provenance in Status headers and the INDEX — they reserve nothing.

## Pending Salvage Drafts (from closed-PR preservation, 2026-08-14)

Sources: [`docs/handover/closed-pr-preservation-2026-08-14.md`](../handover/closed-pr-preservation-2026-08-14.md) and
[`docs/handover/PR-SALVAGE-462-472.md`](../handover/PR-SALVAGE-462-472.md) —
salvaged onto fork/master 2026-08-17 via branch `adr/consolidation-salvage`
(previously carried only on branch `docs/closed-pr-handover`)
(full 7-entry backlog in that doc's PART D). All three salvage ADRs have since
been drafted and merged to fork/master — this section is kept as historical
record:

1. **Product review event model (kind 31555)** — from PR #462, branch
   `feat/product-reviews` @ `ab64dd48e0`. Schema ratification (`d` =
   `a:30402:<pubkey>:<d-tag>`, rating tags 0–1, aggregate formula; matches
   orphan `src/lib/schemas/productReview.ts` on master), review auth (open vs
   verified-buyer via NIP-17 order proof per ADR-013/014), spam/sybil
   mitigation. **Auth must be decided before implementation** (salvage ≈95%).
   **Drafted:**
   [`proposals/product-review-event-model.md`](./proposals/product-review-event-model.md)
   — merged fork PR #6 @ `d71fdd9c`.
2. **Storefront/stall data model + product linkage on kind 30402** — from
   PR #694, commit `06063c0b`. REFRAMED away from NIP-15 30017 (master is
   NIP-99 30402): storefront event kind vs 30402 `h`-tag hierarchy; `stall_id`
   vs `h`/`a` linkage; merge semantics (stall overrides kind 0); ties to open
   issue #435 (salvage ≈30%, ADR first).
   **Drafted:**
   [`proposals/storefront-data-model.md`](./proposals/storefront-data-model.md)
   — merged fork PR #7 @ `e1572812`.
3. **Pickup location storage + no runtime geocoding** — from PR #684, commit
   `4424b8ac`. Per-shipping-option `pickup-lat`/`pickup-lon` tags
   (recommended; schemas exist in the PR) vs single kind 0 link; eliminate
   runtime Nominatim (master geocodes at render, `PickupLocationDialog.tsx:60`);
   URL scheme sanitization for external links (XSS).
   **Drafted:**
   [`proposals/pickup-location-storage.md`](./proposals/pickup-location-storage.md)
   — merged fork PR #8 @ `651f190e`.

Already covered by this collection (no new draft needed): backlog entry #4
(markdown description format policy) =
[`proposals/untrusted-content-rendering-and-markdown-descriptions.md`](./proposals/untrusted-content-rendering-and-markdown-descriptions.md).
Still outstanding from the same backlog, draft when scheduled: merchant-vs-V4V
payment destination semantics (from #472) and wallet UI surface architecture
(from #995). Both were demoted in the 2026-08-14 stress-test — #472 semantics
is display-only, #995 wallet UI belongs to the wallet-hardening track (per
ADR-WRITER-HANDOVER) — draft either only if explicitly re-scheduled.

## Next Actions Per ADR

| ADR / proposal                                                                                            | Next action                                                                                             |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| phase-enums (#1178) / store-layer-deps (#1179)                                                            | In review upstream — shepherd PRs to merge; number assigned there                                       |
| Notification Phase 1 (scoped-map counting)                                                                | Surface next after #1178/#1179: focused upstream PR                                                     |
| Security trio + remediation strategy                                                                      | Surface per INDEX priority order (2–5)                                                                  |
| aggregator-relay / relay-data-validation / error-boundary / e2e-test-stabilization                        | Ready (🟡); surface per priority order 6–11                                                             |
| v2-merge-deployment-strategy                                                                              | 📝 Draft — revise stale internal ADR references before any surfacing                                    |
| auctions-validation-protocol / direct-lightning-bid-funding                                               | Wait for `feat/direct-lightning-bid-funding` PR outcome; that branch stays authoritative (D4)           |
| e2e-test-parallelization                                                                                  | Coordinate with e2e stabilization proposal (#1175 lineage); only one e2e track should surface at a time |
| vitest-mutation-testing-migration                                                                         | Pairs with PR Trust Pipeline proposal; surface together                                                 |
| pr-trust-pipeline-deferred                                                                                | Decide deferred-component disposition, then surface                                                     |
| currency-conversion-fallback                                                                              | Draft status is "Issue" — needs decision framing before surfacing                                       |
| explicit-relay-persistence / product-orthogonal-dimensions / semantic-color-tokens / status-communication | Unranked — review for relevance before surfacing                                                        |
| untrusted-content-rendering-and-markdown-descriptions                                                     | Ready for maintainer + prior-art author review (credit #475/#684 authors, check re-open intent)         |
| Salvage drafts 1–3 above                                                                                  | Drafted & merged to fork/master (PRs #6–#8) — review/auth decisions pending per INDEX Notes             |
| v4v splits doc set (4 files)                                                                              | Dormant until V4V work resumes; PLAN status is "awaiting Felix approval"                                |

## Ground Rules (from repo AGENTS.md)

- ADR drafts must address: payment state lifecycle separation, event kind
  justification, relay data untrusted until schema-validated, new relay I/O via
  `src/lib/nostr/io.ts`.
- Credit original authors (BenGWeeks, Harshdev098, hkarani) in surfaced PRs;
  check whether they prefer re-opening their branches.
- Nothing from this branch goes upstream except as focused single-ADR PRs.
