FIX LEG for PR PlebeianApp/market#1226 — required-fix list from the consolidated review verdict.

REVIEW: https://github.com/PlebeianApp/market/pull/1226#pullrequestreview-5635730808 (CHANGES_REQUESTED, 2026-10-24T00:09:49Z @ head 247f9a25156832b66559d30648789d80efb9da00)
BOARD CONTEXT: `market t_c9b109fb` ("Fix PR#1226 auction order-details v2", currently blocked) — the two legs must stay linked: that card is the canonical fix leg for this PR; this card carries the consolidated required-fix list produced by merging the correctness track (t_54658dfb) and the security/data-integrity track (t_2aefcf2f).

PREDICATE: the PR is CLOSED (never merged), isDraft=true, head frozen at 247f9a25 since 2026-09-13. Do not implement until the author or operator revives feat/auction-order-details-v2. CI at this head is 5/5 SUCCESS.

=== BLOCK (required fixes — these gate approval) ===

B1. src/lib/auction/settlementDescriptor.ts:545 — `getAuctionFulfillmentAuthority()` returns `fulfillmentReady: true` on a settlement whose validity is `pending` (no validated path release). `classifyPhase()` (:487-508) reads `settlementStatus` and never consults `derived.isSettlementPending` (:429), so the seller's Process button unlocks while the same descriptor renders the card as "Validating…". Fix: add `&& !derived.isSettlementPending` to the authority predicate, and feed `validateClaimOrder` (:446-448) only the `'valid'` settlement subset. Regression test: same auction/claim fixture under pending/valid/invalid — only `valid` may be fulfillmentReady.

B2. src/lib/auction/settlementDescriptor.ts:499-500 (+ src/components/orders/orderSettlementStatusView.ts:47, src/components/orders/OrderDetailComponent.tsx:154) — the new "Griefed (No Fallback)" label is derived from the seller's own kind-1024, contradicting ADR-0004 §3/§6 ("source of truth is the validator quorum … the seller's kind-1024 is a confirmation, not the source"). `isSettlementStructurallyValid` accepts the event on seller+root+coordinate alone (:154-156); `verdicts` feed only `computeValidatedBids` (:325-328, :589-592). Fix: derive grief from kind-30440 `griefed`/`griefed_pending_fallback` quorum at/above `auction.auditorQuorum` and drive `classifyPhase`'s grief branch from that consensus; if out of scope, do not surface the accusatory label from a seller event. Test: a lone seller `griefed_no_fallback` must NOT produce the "Griefed (No Fallback)" display state.

B3. src/components/orders/OrderDetailComponent.tsx:642 + src/components/orders/OrderActions.tsx:82-83,103-116 — fulfillment authority is collapsed to the bare boolean `auctionFulfillmentReady`, discarding `claimOrderId` (settlementDescriptor.ts:547) and applying it to whatever `order.order.id` is rendered. `useAuctionClaimOrders` (OrderDetailComponent.tsx:466) returns ALL kind-16 orders for the coordinate, so claim A's authority is reusable on order B. Fix: preserve the authority object across the action boundary and require `authority.fulfillmentReady && authority.claimOrderId === order.order.id`. Regression test: claims A + B — A enables A only; B stays non-fulfillable.

=== MAJOR (non-blocking, but must-fix for the display itself) ===

M1. OrderDetailComponent.tsx:183 + orderSettlementStatusView.ts:22-33 — `null` descriptor conflated with "auction has not ended"; ended auctions also return null (settlementDescriptor.ts:796,799,888,994) so ended/closed auctions show "Awaiting Settlement" where the canonical card shows nothing. Fix: discriminated descriptor result or `endAt < now` at the call site.
M2. orderSettlementStatusView.ts:20-21,51-57 — `settlement-window-expired` (settlementDescriptor.ts:507) falls through the catch-all to "Awaiting Settlement", producing a self-contradicting card. Fix: explicit case + exhaustive `satisfies Record<SettlementPhase,…>` mapper + an AUCTIONS.md §4.3.3 row.
M3. OrderDetailComponent.tsx:518-549 — the page never supplies `nut7States` (canonical card polls at AuctionSettlement.tsx:206), so the "Evidence:" row always claims "Settlement accepted · Awaiting redemption"; "Verified · Settlement confirmed" is unreachable. Fix: pass `nut7States` (and add to memo deps) or render a neutral string.
M4. OrderDetailComponent.tsx:551-571 — `descriptorReady` resets only in the `!descriptorInput` branch → stale status during recompute while the sync authority already flipped. Fix: `setDescriptorReady(false)` as the first statement of the effect.
M5. Tests: orders.test.ts:172-229, settlementDescriptor.test.ts:1257-1351, e2e/tests/order-detail.spec.ts:157-159,346-364 — nothing in CI fails if the mapping regresses (no expired-phase case, no pending-authority case, the only card assertion is commented out, the spec named "…and settlement status" asserts no card). Two asserted combinations (orders.test.ts:200-203,219) are unreachable. Fix: add the B1/B2/M1 regression cases and restore/rename the e2e assertion.
M6. OrderDetailComponent.tsx:202-207 — "Winning Bid:" labels the viewer's own losing bid in the `Settlement Went to Fallback` state (settlementDescriptor.ts:776). Fix: make the label part of the descriptor.
M7. OrderActions.tsx:54,82,100-101 — the presentation-only `isAuctionOrder()` detector (queries/orders.tsx:210-257) is used for control flow; a crafted kind-30408 `a` tag can strip a seller's Cancel/Confirm. Fix: key suppression/gating off a validated claim/settlement context.
M8. settlementDescriptor.ts:274-276 — `parseInt(amountStr, 10)` truncates (`"50000.9"→50000`, `"50000x"→50000`). Fix: require `^\d+$` / `Number.isSafeInteger` before comparing.

=== NIT ===
N1. OrderDetailComponent.tsx:586-587,515,564-567 — error folded into "Validating…"; add a terminal "Status unavailable — reload" state.
N2. OrderDetailComponent.tsx:186-198,148-168 — a11y: `aria-hidden` decorative icons, add `role="status"`/`aria-live`, distinct icons for the two CheckCircle states.
N3. OrderDetailComponent.tsx:170-176,148-168 — duplicated display vocabulary vs AuctionSettlement.tsx:256-265 and descriptor.tone/icon.
N4. settlementDescriptor.ts:366-374 — stale trust comment (NDK 3.0.3 does verify relay signatures by default).
N5. orderSettlementStatusView.ts:57 — catch-all under-claims; covered by the exhaustive-mapper fix in M2.
N6. OrderDetailComponent.tsx:565 — `console.error` logs a raw error object; log a message/context instead.

=== QUESTIONS (to the author) ===
Q1. ~15 inline user-facing literals: accept hardcoding, or consume the descriptor's `title`/`message`?
Q2. Phase `closed` labelled "Settlement Event Observed" (settlementDescriptor.ts:503-504) — intent, or make the unrecognised status explicit?
Q3. Is moving `griefed_no_fallback` to kind-30440 quorum in scope for this PR, or is the non-accusatory fallback preferred?

=== MERGE PRECONDITION (context, not an independent finding) ===
Rebase onto current `auctions`: #1247 changed auction query results to plain/event-like values; this head still calls `.rawEvent()` at OrderDetailComponent.tsx:470,477,499,508.

=== TRACK DISAGREEMENTS (recorded, conservative severity used) ===
D1. Security track called griefed-label spoofability a BLOCK; correctness track marked it "reviewed, no issue" (it verified the phase is kept distinct from `cancelled`). ADR-0004 text at this head settles it: the source must be validator quorum → escalated to BLOCK B2.
D2. Security track promoted `isAuctionOrder()`-in-control-flow to MAJOR; correctness track treated the suppression as acceptable. Compatible (suppression intended, detector not authoritative) → kept as MAJOR M7, not a BLOCK.

ARTIFACTS (pushed to fork):
- Reconciliation record: RECONCILIATION.md
- Posted review body: REVIEW_BODY.md
- Branch: felixfelix-bot/market worker-heavy/AV-DELIVERY-1226-reconcile
- Source tracks: ~/.hermes/kanban/boards/plebeian-pr-reviews/attachments/t_54658dfb/pr1226-settlement-display-findings.md and .../t_2aefcf2f/PR1226-security-data-integrity-review.md

DONE WHEN: B1-B3 fixed with the named regression tests, M1-M8 addressed or explicitly deferred by the author, and a fresh review at the rebased head clears the BLOCKs.
