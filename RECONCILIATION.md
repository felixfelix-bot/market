# RECONCILIATION — merged finding list for PlebeianApp/market#1226

**Task:** Reconcile both review tracks and post one consolidated verdict.
**PR:** PlebeianApp/market#1226 — `feat: auction order details — settlement status display & auction-aware order actions` (Franchovy)
**Head reviewed (both tracks pin the same SHA):** `247f9a25156832b66559d30648789d80efb9da00`
**Base:** `auctions`

## Source tracks (both retrieved, neither guessed)

| Track | Kanban card | Producer | Artifact |
|-------|-------------|----------|----------|
| Correctness / display, behavioural | `t_54658dfb` (board `plebeian-pr-reviews`) | `worker-merchant-qa` | `.../attachments/t_54658dfb/pr1226-settlement-display-findings.md` (24,214 B) |
| Security / data-integrity | `t_2aefcf2f` (board `plebeian-pr-reviews`) | `market-security-critical-remediation` | `.../attachments/t_2aefcf2f/PR1226-security-data-integrity-review.md` (12,251 B) |

Both tracks reviewed **read-only at the frozen head** and deliberately posted
nothing to GitHub (PR is a closed draft). Neither is a duplicate of the other's
scope, but they converge on the same money-adjacent authority bug (their BLOCK-1).

## Live premise (re-verified at the start of this run)

`gh pr view 1226 --repo PlebeianApp/market` →
`state=CLOSED`, `isDraft=true`, `mergedAt=null`, `closedAt=2026-09-19T20:43:54Z`,
`reviewDecision=APPROVED`, `mergeStateStatus=CLEAN`,
`headRefOid=247f9a25156832b66559d30648789d80efb9da00`, `reviewRequests=[]` (empty).

`gh pr checks 1226` → `e2e-grep pass`, `footprint pass`, `prettier pass`,
`security-scan pass`, `unit-integration pass`, `e2e-full skipping` → **5/5 pass**.

Timeline (issues/timeline API): `review_requested felixfelix-bot 2026-09-10T17:33:50Z`
(actor Franchovy); `review_dismissed` ×2 at `2026-09-10T19:52:58Z` / `19:53:04Z`;
`convert_to_draft 2026-09-13T14:10:01Z`; `closed 2026-09-19T20:43:54Z`.

## Merged finding list (deduplicated, reconciled)

### BLOCK

| ID | file:line | Finding | Track(s) | Public status |
|----|-----------|---------|----------|---------------|
| **B1** | `src/lib/auction/settlementDescriptor.ts:545` | `getAuctionFulfillmentAuthority()` returns `fulfillmentReady=true` on a settlement whose validity is `pending` (no validated path release). `classifyPhase()` (`:487-508`) reads `settlementStatus` and never consults `derived.isSettlementPending` (`:429`) — so the seller's **Process** button unlocks while the same descriptor renders the card as "Validating…". Fails open in a money-adjacent gate; violates the function's own doc contract (`:510-532`). Fix: add `&& !derived.isSettlementPending` (and feed `validateClaimOrder` only the `'valid'` settlement subset). Regression: pending/valid/invalid fixture — only `valid` may be ready. | C-1 + S-BLOCK-1 (**duplicate, reinforced**) | Already public — maximotodev P1, 2026-09-13T16:49:19Z, same head, unaddressed |
| **B2** | `src/lib/auction/settlementDescriptor.ts:499-500` (+ `orderSettlementStatusView.ts:47`, `OrderDetailComponent.tsx:154`) | The new **"Griefed (No Fallback)"** label is derived from the seller's own kind-1024 `status='griefed_no_fallback'`; `isSettlementStructurallyValid` accepts it on seller+root+coordinate alone (`:154-156`) and no code path derives grief from validator quorum (`verdicts` feed only `computeValidatedBids`). Accepted ADR-0004 §3/§6 requires this state be validator-quorum-derived; a single seller event can therefore unilaterally label a buyer as having griefed. Fix: derive grief from kind-30440 `griefed`/`griefed_pending_fallback` quorum (or do not surface the accusatory label from a seller event). | C-N-2 (collapsed to non-block) + S-BLOCK-2 (**promoted**) | Not previously public as a required fix — **new** |
| **B3** | `src/components/orders/OrderDetailComponent.tsx:642` + `OrderActions.tsx:82-83,103-116` | Fulfillment authority is collapsed to the bare boolean `auctionFulfillmentReady`, so `claimOrderId` (`settlementDescriptor.ts:547`) is discarded and the boolean is applied to whatever `order.order.id` the page renders. `useAuctionClaimOrders` (`:466`) returns **all** kind-16 orders for the coordinate, so authority earned by claim order A is reusable on order B. Fix: pass the authority object through and require `authority.fulfillmentReady && authority.claimOrderId === order.order.id`. Regression: claims A + B — A enables A only. | C-2 (BLOCK) + S-1 (non-block) (**promoted**) | Already public as maximotodev P1 #2, same head |

### MAJOR (non-blocking)

| ID | file:line | Finding | Source |
|----|-----------|---------|--------|
| M1 | `OrderDetailComponent.tsx:183` + `orderSettlementStatusView.ts:22-33` | `null` descriptor is conflated with "auction not ended" although `getSettlementDescriptor` also returns `null` for **ended** auctions (`settlementDescriptor.ts:796, 799, 888, 994`), so ended/closed auctions render "Awaiting Settlement / Waiting for the auction to end…" where the canonical card renders nothing. | C-3 |
| M2 | `orderSettlementStatusView.ts:20-21, 51-57` | `settlement-window-expired` (a routine terminal outcome, `settlementDescriptor.ts:507`) falls through the catch-all to "Awaiting Settlement", producing a self-contradicting card: heading "Awaiting Settlement" over the body "The settlement window closed without your path release…". `AUCTIONS.md §4.3.3` has no row for the phase either. Fix: explicit case + exhaustive switch + doc row. | C-4 (S-4 mentions it as minor) |
| M3 | `OrderDetailComponent.tsx:518-549` | The order page never supplies `nut7States` (canonical card polls the mint at `AuctionSettlement.tsx:206`), so `isSettlementPendingRedemption` (`settlementDescriptor.ts:435-437`) is always true and the "Evidence:" row always claims "Settlement accepted · Awaiting redemption"; "Verified · Settlement confirmed" is unreachable on this surface. | C-5 |
| M4 | `OrderDetailComponent.tsx:551-571` | `descriptorReady` resets only in the `!descriptorInput` branch, so on any input change the card keeps rendering the **previous** descriptor (`settlementValidating` false at `:586-587`) while the sync authority (`:578-581`) has already flipped → stale status and brief status/action disagreement. Fix: `setDescriptorReady(false)` first in the effect. | C-6 |
| M5 | `orders.test.ts:172-229`, `settlementDescriptor.test.ts:1257-1351`, `e2e/tests/order-detail.spec.ts:157-159, 346-364` | Nothing in CI would fail if the mapping regressed: no `settlement-window-expired` case, no `pending`-settlement authority case, the only card assertion is commented out (`:157-159`), and the test *named* "views auction order details and settlement status" (`:346`) never asserts the card. Two asserted combinations (`orders.test.ts:200-203, 219`) are unreachable. | C-7 |
| M6 | `OrderDetailComponent.tsx:202-207` | Amount is labelled "Winning Bid:" but in the `Settlement Went to Fallback` state `descriptor.bidAmount` is the viewer's **own losing** bid (`settlementDescriptor.ts:776`). Fix: make the label part of the descriptor. | C-8 |
| M7 | `OrderActions.tsx:54, 82, 100-101` | The `isAuctionOrder()` broad kind-30408 `a`-tag detector — documented PRESENTATION-ONLY (`queries/orders.tsx:210-257`) — is used for control flow (gates `fulfillmentReady`, suppresses Cancel/Confirm, hides the stock dialog). A bogus kind-30408 `a` tag on a product order can strip the seller's buttons. Fix: key suppression/gating off a validated claim/settlement context. | S-1 (raised; **promoted** — see disagreement D2) |
| M8 | `settlementDescriptor.ts:274-276` | `parseInt(amountStr, 10)` truncates: `"50000.9"→50000` and `"50000x"→50000` can satisfy the amount equality in `validateClaimOrder`. Fix: require `^\d+$` / `Number.isSafeInteger` before comparing. | S-2 |

### NIT / minor

| ID | file:line | Finding | Source |
|----|-----------|---------|--------|
| N1 | `OrderDetailComponent.tsx:586-587` | `auctionError`/`descriptorFailed` are folded into the same "Validating…" flag → a permanent failure is indistinguishable from loading, with no retry. (It does fail closed, so not blocking.) | C-9, S-5 (log-object part) |
| N2 | `OrderDetailComponent.tsx:186-198`, `:148-168` | a11y: decorative status icons not `aria-hidden`; no `role="status"`/live region for the async change; `Settled` and `Settlement Event Observed` share one `CheckCircle` glyph (not colour-only — text label present). | C-10 |
| N3 | `OrderDetailComponent.tsx:170-176`, `:148-168` | Duplicated display vocabulary vs `AuctionSettlement.tsx:256-265` / `descriptor.tone/icon`; hardcoded kinds (`orders.tsx:237`, `orderColumns.tsx:109`). The M3 divergence is this already materialising. | C-11 |
| N4 | `settlementDescriptor.ts:366-374` | Stale/incorrect trust comment: claims relay ids "aren't signature/hash-verified in this fetch pipeline"; NDK 3.0.3 verifies non-trusted relay events synchronously. Fix: correct the comment. | S-3 |
| N5 | `orderSettlementStatusView.ts:57` | Catch-all under-claims (fail-safe) but a future `SettlementPhase` would silently mislabel — make the mapper exhaustive over `SettlementPhase`. | S-4 |
| N6 | `OrderDetailComponent.tsx:565` | `console.error` logs a raw error object derived from auction/mint inputs; no secret evident, but consider logging a message/context only. | S-5 |

### QUESTIONS

| ID | Question |
|----|----------|
| Q1 | (C-12) No i18n framework exists at this head, so no keys are missing — but the PR adds ~15 inline user-facing literals. Accept hardcoding for now, or consume the descriptor's `title`/`message` so vocabulary stays single-sourced? |
| Q2 | (C-13) Phase `closed` (unrecognised settlement status, `settlementDescriptor.ts:503-504`) is labelled "Settlement Event Observed". Intent, or should the unknown status be explicit? |
| Q3 | (S-area-1) Relay events reaching these functions are signature-verified by NDK; the concern is not forgery of a relay event but **seller-authority overreach** (B2). Confirm grief is meant to move to quorum derivation in this PR or a follow-up? |

## Cross-track disagreements (surfaced in the body, not silently resolved)

### D1 — BLOCK-2 "Griefed (No Fallback)" is seller-spoofable
- **Security track (`t_2aefcf2f`)**: BLOCK — a single seller kind-1024 can spoof
  the griefed label; ADR-0004 §3/§6 requires validator-quorum derivation.
- **Correctness track (`t_54658dfb`)**: marked "reviewed, no issue" (N-2), treating
  `griefed-no-fallback` as correctly kept distinct from `cancelled` per ADR-0004.
- **Resolution:** the correctness note only confirms the phase is kept *distinct*;
  it does not test the *source* of the state. Both tracks' own references cite
  ADR-0004, and the ADR text at this head is unambiguous ("source of truth is the
  validator quorum … the seller's kind-1024 is a confirmation, not the source").
  The security track read the source of truth; the correctness track read the
  display separation. **The security track is correct.** Per the conservative
  default, this is escalated to a **BLOCK (B2)** and the disagreement is recorded
  here and in the posted body.

### D2 — is `isAuctionOrder()` control-flow use blocking or non-blocking?
- **Security track**: promoted the broad-detector-in-control-flow issue to MAJOR S-1
  (griefing/DoS: strip a seller's buttons with a bogus `a` tag).
- **Correctness track**: treated `OrderActions` suppression as **fine**
  ("reviewed, no issue" — consistent with the "no invoice to confirm" rationale),
  and only asked that broad auction detection stay presentation-only.
- **Resolution:** the correctness track reviewed the *rationale* for suppression
  on genuine auction orders; the security track reviewed the *authority* of the
  detector used to decide. These are compatible — the suppression is intended, the
  detector is not authoritative. Merged as **MAJOR (M7)**, not a BLOCK: it needs a
  crafted `a` tag on a product order to trigger, degrades to a UI DoS rather than a
  money loss or a false "paid" state, and the merge-base head is already a closed
  draft. Recorded as a visible disagreement with the conservative (higher) severity.

### D3 — does C-1 / S-BLOCK-1 need a rebase precondition?
- Both tracks reference the same head. maximotodev's public P1 also required a
  rebase onto `auctions` after #1247 (query results became plain/event-like; this
  head still calls `.rawEvent()` at `OrderDetailComponent.tsx:470, 477, 499, 508`).
  Both prior tracks flagged the rebase. It is **not** an independent code finding —
  it is a merge precondition for the frozen branch and is carried as context in the
  body, not counted as a BLOCK item.

## Verdict derived strictly from the merged list

- BLOCK items: **3** (B1, B2, B3)
- Any BLOCK present → verdict = **REQUEST CHANGES**.
- No BLOCK co-exists with an approve. ✔

Counts for the report: **3 BLOCK, 8 MAJOR, 6 NIT, 3 QUESTION.**
