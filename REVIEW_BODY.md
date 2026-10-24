Verdict: REQUEST CHANGES — 3 blocking issues

Consolidated verdict for head `247f9a25156832b66559d30648789d80efb9da00` (base `auctions`). This merges the correctness/behavioural review and the security/data-integrity review of this PR into one list. Both tracks reviewed this exact head read-only and posted nothing themselves, so this is the first consolidated verdict. Where the two tracks disagreed, the disagreement is shown explicitly under "Track disagreements" — the more conservative severity is used.

---

## BLOCK

**1. `src/lib/auction/settlementDescriptor.ts:545` — a `pending` settlement still authorizes fulfillment**

`getAuctionFulfillmentAuthority()` returns
`fulfillmentReady: classifyPhase(derived) === 'settled' && derived.hasMatchedClaimOrder`.

`classifyPhase()` (`:487-508`) returns `'settled'` from `d.settlementStatus` and never consults `derived.isSettlementPending` (set at `:429`). A seller-signed kind-1024 `settled` event whose matching path release has not been validated is structural validity `'pending'`, is kept in the settlement set (`validity !== 'invalid'`), and can satisfy `hasMatchedClaimOrder` — so the seller's **Process** button unlocks while the very same descriptor renders the card as "Validating…" (badge `verifying`, `:612-614`). This is the ordinary relay-propagation race, and it fails open in a money-adjacent gate, contradicting the function's own doc contract (`:510-532`: "a valid path release, and a complete payout chain").

**Required fix:** require full validity before authorizing — at minimum
`fulfillmentReady: classifyPhase(derived) === 'settled' && !derived.isSettlementPending && derived.hasMatchedClaimOrder` — and tighten `validateClaimOrder`'s input (`:446-448`) to the `'valid'` settlement subset so a claim bound to a `'pending'` settlement cannot match. Regression test: same auction/claim fixture under `pending`, `valid`, `invalid` — only `valid` may be `fulfillmentReady`.

**2. `src/lib/auction/settlementDescriptor.ts:499-500` (+ `src/components/orders/orderSettlementStatusView.ts:47`, `src/components/orders/OrderDetailComponent.tsx:154`) — "Griefed (No Fallback)" is spoofable by the seller's own kind-1024**

The PR newly maps a seller-authored kind-1024 `status='griefed_no_fallback'` straight to phase `'griefed-no-fallback'` and a distinct accusatory "Griefed (No Fallback)" order-card label. `isSettlementStructurallyValid` accepts that event on seller + root + coordinate alone (`:154-156`), and no code path derives grief from validator quorum — `deriveState` feeds `verdicts` only into `computeValidatedBids` (`:325-328`, `:589-592`). Accepted ADR-0004 §3/§6 is explicit: *"`griefed_no_fallback` moves from seller-derived to validator-quorum-derived … the source of truth is the validator quorum … the seller's kind-1024 is a confirmation, not the source of truth."* A single seller event can therefore unilaterally label a buyer as having griefed.

**Required fix:** derive grief from kind-30440 `griefed`/`griefed_pending_fallback` quorum in `deriveState` (at or above `auction.auditorQuorum`) and drive `classifyPhase`'s grief branch from that consensus. If that is out of scope for this PR, do not surface the distinct accusatory label from a seller event — keep seller-declared grief collapsed to a non-accusatory state until quorum derivation exists. Add a test proving a lone seller `griefed_no_fallback` does **not** produce the "Griefed (No Fallback)" display state.

**3. `src/components/orders/OrderDetailComponent.tsx:642` + `src/components/orders/OrderActions.tsx:82-83,103-116` — fulfillment authority is not bound to the order being mutated**

`auctionFulfillmentReady={auctionFulfillmentAuthority?.fulfillmentReady ?? false}` collapses the authority object to a bare boolean, discarding `claimOrderId` (`settlementDescriptor.ts:547`); `OrderActions` then applies that boolean to whatever `order` prop the page renders and mutates `order.order.id`. Because `useAuctionClaimOrders(coordinates)` (`OrderDetailComponent.tsx:466`) returns **all** kind-16 orders for the auction coordinate, authority earned by claim order A is reusable on a different order B for the same coordinate even though only A passed the 8-point `validateClaimOrder` check.

**Required fix:** preserve the identity-bearing authority across the action boundary — pass the authority object (or `claimOrderId`) into `OrderActions` and require `authority.fulfillmentReady && authority.claimOrderId === order.order.id` before Process/Ship becomes reachable. Regression test: canonical claim A plus another same-coordinate order B — A must enable A only; B must remain non-fulfillable.

---

## Non-blocking findings

**MAJOR — `src/components/orders/OrderDetailComponent.tsx:183` + `src/components/orders/orderSettlementStatusView.ts:22-33` — `null` descriptor conflated with "auction has not ended".**
`getSettlementDescriptor` also returns `null` for **ended** auctions (`settlementDescriptor.ts:796, 799, 888, 994`), so an ended/closed auction renders "Awaiting Settlement / Waiting for the auction to end…" where the canonical card renders nothing. Suggest a discriminated descriptor result, or have the call site use `endAt < now` to distinguish "not ended" from "ended, no view for this viewer".

**MAJOR — `src/components/orders/orderSettlementStatusView.ts:20-21, 51-57` — `settlement-window-expired` collapses to "Awaiting Settlement".**
A routine terminal outcome (`settlementDescriptor.ts:507`) falls through the catch-all, producing a self-contradicting card: heading "Awaiting Settlement" over the descriptor's own body "The settlement window closed without your path release…". `AUCTIONS.md §4.3.3` has no row for this phase either. Suggest a distinct display state plus an exhaustive `satisfies Record<SettlementPhase, …>` mapper so a new phase fails to compile, and add the doc row.

**MAJOR — `src/components/orders/OrderDetailComponent.tsx:518-549` — "Evidence" line asserts an unverified redemption state.**
The order page never supplies `nut7States` (the canonical card polls the mint at `AuctionSettlement.tsx:206`), so `isSettlementPendingRedemption` (`settlementDescriptor.ts:435-437`) is always true and the "Evidence:" row always claims "Settlement accepted · Awaiting redemption"; "Verified · Settlement confirmed" is unreachable here. Suggest passing `nut7States` (and adding it to the memo deps) or rendering a neutral string for the unknown case.

**MAJOR — `src/components/orders/OrderDetailComponent.tsx:551-571` — stale status during recompute.**
`descriptorReady` resets only in the `!descriptorInput` branch, so on any input change the card renders the **previous** descriptor (`settlementValidating` false at `:586-587`) while the synchronous authority (`:578-581`) has already flipped — momentary status/action disagreement. Suggest `setDescriptorReady(false)` as the first statement of the effect.

**MAJOR — `src/queries/__tests__/orders.test.ts:172-229`, `src/lib/__tests__/settlementDescriptor.test.ts:1257-1351`, `e2e/tests/order-detail.spec.ts:157-159, 346-364` — nothing in CI would fail if this mapping regressed.**
No `settlement-window-expired` case; no `pending`-settlement authority case; the only assertion that would exercise the card is commented out (`:157-159`); the test *named* "views auction order details and settlement status" (`:346`) never asserts the card. Two asserted combinations (`orders.test.ts:200-203, 219`) are unreachable, giving false confidence. Suggest adding the missing cases (B1 + B2 regression tests especially) and either restoring the commented assertion or renaming `:346`.

**MAJOR — `src/components/orders/OrderDetailComponent.tsx:202-207` — "Winning Bid:" labels an amount that is not the winning bid in the fallback state.**
In `Settlement Went to Fallback`, `descriptor.bidAmount` is the viewer's **own losing** bid (`settlementDescriptor.ts:776`). Suggest making the label part of the descriptor (`amountLabel` / `displayAmount: {value,label}`).

**MAJOR — `src/components/orders/OrderActions.tsx:54, 82, 100-101` — a presentation-only detector is used for control flow.**
`isAuctionOrder()` (broad "any parseable kind-30408 `a` tag") — documented PRESENTATION-ONLY at `src/queries/orders.tsx:210-257` — gates `fulfillmentReady`, suppresses `showCancel`/`showConfirm`, and hides the stock dialog. A crafted kind-30408 `a` tag on a normal product order can strip the seller's Cancel/Confirm buttons. Suggest keying suppression/gating off a validated claim/settlement context rather than the raw tag detector. *(See disagreement D2 — the correctness track treated the suppression itself as fine; both readings are compatible: the suppression is intended, the detector is not authoritative.)*

**MAJOR — `src/lib/auction/settlementDescriptor.ts:274-276` — amount comparison truncates.**
`parseInt(amountStr, 10)` accepts `"50000.9"→50000` and `"50000x"→50000`, so a malformed `amount` tag can satisfy the equality in `validateClaimOrder`. Suggest requiring `^\d+$` (or `Number.isSafeInteger` after a strict parse) before comparing.

**NIT — `src/components/orders/OrderDetailComponent.tsx:586-587`, `:515, 564-567`.** `auctionError`/`descriptorFailed` are folded into the same "Validating…" flag, so a permanent failure is indistinguishable from loading and has no retry. It fails closed, but an error rendered as loading is not diagnosable. Suggest a terminal "Status unavailable — reload" state.

**NIT — `src/components/orders/OrderDetailComponent.tsx:186-198`, `:148-168`.** a11y: decorative status icons are not `aria-hidden`; no `role="status"`/`aria-live` for the async change; `Settled` and `Settlement Event Observed` share one `CheckCircle` glyph (not colour-only — a text label is present). Suggest distinct icons, `aria-hidden` on decorative icons, and a polite live region.

**NIT — `src/components/orders/OrderDetailComponent.tsx:170-176`, `:148-168`.** Duplicated display vocabulary vs `AuctionSettlement.tsx:256-265` and the descriptor's own `tone`/`icon`; kinds hardcoded (`orders.tsx:237`, `orderColumns.tsx:109`). Suggest rendering `descriptor.tone/icon/title` and keeping one shared badge-text map.

**NIT — `src/lib/auction/settlementDescriptor.ts:366-374`.** Stale/incorrect trust comment: it claims relay-sourced ids "aren't signature/hash-verified in this fetch pipeline"; the shipped NDK 3.0.3 verifies non-trusted relay events synchronously (`@nostr-dev-kit/ndk` subscription validation). The `synthetic` guard is sound, but the rationale is wrong and could mislead a maintainer. Suggest correcting the comment.

**NIT — `src/components/orders/orderSettlementStatusView.ts:57`.** The catch-all under-claims (fail-safe, never asserts "Settled"), but a future `SettlementPhase` would silently mislabel. Covered by the exhaustive-mapper suggestion above.

**NIT — `src/components/orders/OrderDetailComponent.tsx:565`.** `console.error('getSettlementDescriptor failed:', err)` logs a raw error object derived from auction/mint inputs. No secret is evident, but per repo convention consider logging a message/context only.

---

## Track disagreements

These are recorded rather than silently resolved; the more conservative severity is used in each case.

**D1 — "Griefed (No Fallback)" spoofability.** The security/data-integrity track called this a BLOCK (seller-spoofable, contradicts ADR-0004). The correctness track marked it "reviewed, no issue", because it verified the griefed phase is kept *distinct* from `cancelled` — which it is, and which ADR-0004 does require. The two readings are not in conflict about the code; they differ in what was tested: the correctness track checked the display *separation*, the security track checked the *source* of the state. ADR-0004 §3/§6 at this head is unambiguous that the source must be the validator quorum, so the security reading controls. **Escalated to BLOCK 2.**

**D2 — `isAuctionOrder()` used for control flow.** The security track promoted this to a MAJOR (crafted `a` tag can strip a seller's buttons); the correctness track treated the auction-order action suppression as acceptable. Compatible: the suppression is intended for real auction orders; the *detector* is documented presentation-only and must not be the authority behind the suppression. Kept as a **MAJOR**, not a BLOCK — it degrades to a UI-level denial of action rather than a money loss or a false "paid" state, and it requires a crafted `a` tag.

**D3 — rebase precondition (context, not a finding).** An earlier public review required rebasing onto current `auctions` after #1247 changed auction query results to plain/event-like values; this head still calls `.rawEvent()` at `OrderDetailComponent.tsx:470, 477, 499, 508`. Both prior tracks flagged it and it remains a merge precondition, but it is a branch-hygiene requirement rather than an independent code defect, so it is not counted as a BLOCK item.

---

## Questions to the author

1. No i18n framework exists at this head, so no keys are missing — but this PR adds ~15 inline user-facing literals. Is hardcoding accepted for now (matching `AuctionSettlement.tsx`), or should the card consume the descriptor's `title`/`message` so the vocabulary stays single-sourced?
2. Phase `closed` (unrecognised settlement status, `settlementDescriptor.ts:503-504`) is labelled "Settlement Event Observed". Is that the intent, or should an unrecognised status be explicit?
3. Grief derivation: is moving `griefed_no_fallback` to kind-30440 quorum in scope here, or would you prefer the non-accusatory fallback (collapse the seller-declared label until quorum derivation exists)?

---

## Context

- **CI is 5/5 SUCCESS at this head**: `e2e-grep` pass, `footprint` pass, `prettier` pass, `security-scan` pass, `unit-integration` pass (`e2e-full` skipping).
- This review request was **re-issued by Franchovy at 2026-09-10T17:33:50Z** after the prior reviews were dismissed (two `review_dismissed` events at 2026-09-10T19:52:58Z and 19:53:04Z), so **this verdict supersedes those**.
- Live state at the time of posting: PR is `CLOSED` (`closedAt=2026-09-19T20:43:54Z`), never merged (`mergedAt=null`), `isDraft=true`, `reviewDecision=APPROVED`, and the head has been frozen at `247f9a25` since 2026-09-13. If the branch is revived, BLOCKs 1–3 are the merge blockers and the MAJORs are the must-fix list for the display itself.
