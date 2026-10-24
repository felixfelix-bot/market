Review of this branch as the **live successor to #1226** — head `d1a4a647ddb87dfeb90f00de3cbb33c4d42d5285`, base `auctions`.

**Verdict: CHANGES REQUESTED — 1 of the 3 #1226 BLOCKs survives; it is the one this PR still ships unfixed.**

I reviewed the three blocking findings from the consolidated verdict on #1226 (review `5635730808`) against the code at this head, read-only. Two are genuinely fixed by `1a9c6907`; one is not, and it is the security-relevant one.

---

## BLOCK (1) — `griefed_no_fallback` is still seller-derived, not validator-quorum-derived

**Status: STILL HOLDS at `d1a4a647`.**

`src/lib/auction/settlementDescriptor.ts:540-556`:

```
function classifyPhase(d: DerivedState): SettlementPhase {
  if (!d.ended) return 'bidding-open'
  if (d.hasLatestSettlement) {
    switch (d.settlementStatus) {
      case 'settled':              return 'settled'
      case 'reserve_not_met':      return 'reserve-not-met'
      case 'griefed_no_fallback':  return 'griefed-no-fallback'
      case 'cancelled':            return 'cancelled'
```

`d.settlementStatus` is `latestSettlement?.status` (`:468`), i.e. read straight from the seller-authored **kind-1024** settlement event. `isSettlementStructurallyValid` returns `'valid'` for that status on seller + root + coordinate alone (`:188`, "reserve_not_met and griefed_no_fallback: basic structural checks pass").

There is **no** derivation of grief from kind-30440 validator claims anywhere in this tree:
- `git grep griefed d1a4a647 -- src/` surfaces only the kind-1024 status enum (`schemas/auction/settlementEvents.ts:109`, `constants.ts:145`), the display map (`orderSettlementStatusView.ts:47`), and the seller-status switch above. No quorum path.
- `src/lib/auction/verdictQuorum.ts:56-57` classifies verdicts into confirm/condemn only — it has no `griefed`/`griefed_pending_fallback` claim kind, so grief cannot be quorum-derived today even if the descriptor asked it to.

Accepted **ADR-0004** at this head is explicit that this is wrong:
- §3 (`:19`): "`griefed_no_fallback` moves from seller-derived to validator-quorum-derived."
- §"Confidence" (`:298-302`): "The seller may still publish kind-1024 with `griefed_no_fallback` as a formality, but **the source of truth is the validator quorum**."
- §"Wave budget" (`:369-373`): "`griefed_no_fallback` is determined by validator quorum (kind-30440 `griefed` claims), not by the seller's kind-1024 … the seller's kind-1024 with `griefed_no_fallback` is a confirmation, not the source of truth."

**Why it matters:** a single seller event moves the order card to the distinct, accusatory **"Griefed (No Fallback)"** label (`orderSettlementStatusView.ts:47`), publicly branding a buyer as having griefed, with no independent quorum. The seller is a counterparty to the outcome being labelled.

**Required fix (either is acceptable):**
1. Derive grief in `deriveState` from kind-30440 `griefed` / `griefed_pending_fallback` claims at or above `auction.auditorQuorum`, and drive `classifyPhase`'s grief branch from that consensus (requires extending `verdictQuorum.ts` to expose the grief claim family); **or**
2. Keep seller-declared grief collapsed to a non-accusatory state until quorum derivation exists — do not render the distinct accusatory label from a seller event alone.

Either way, add a test proving a lone seller `griefed_no_fallback` does **not** produce the "Griefed (No Fallback)" display state. Note `src/lib/__tests__/settlementDescriptor.test.ts:683` ("closed (griefed_no_fallback)") currently locks in the *unfixed* behavior and must be updated with the fix.

This was **BLOCK 2** of the #1226 consolidated verdict. It was raised there as a cross-track disagreement (the correctness track had marked the griefed phase "reviewed, no issue" because it verified the phase stays distinct from `cancelled` — which it does, and which ADR-0004 also requires). The two readings differ on *what was tested*: display separation vs. the source of the state. ADR-0004 §3/§369-373 settles it — the source must be quorum.

---

## BLOCKs from #1226 now FIXED at this head — verified, no action

**B1 — pending settlement authorizing fulfillment. FIXED.** At #1226's head `247f9a25`, `getAuctionFulfillmentAuthority` returned `classifyPhase(derived) === 'settled' && derived.hasMatchedClaimOrder` and `classifyPhase` never consulted `isSettlementPending` (computed-but-unused at `:429`), so a `pending` settlement unlocked Process. At `d1a4a647:610-616` it now reads:

```
const settlementIsValid = derived.latestSettlementValidity === 'valid'
return {
  fulfillmentReady: settlementIsValid && classifyPhase(derived) === 'settled' && derived.hasMatchedClaimOrder,
```

Requiring the positive `'valid'` classification (rather than testing `!isSettlementPending`) is the more robust form — a future third validity value cannot silently unlock authority. Good fix.

**B3 — authority not bound to the order being mutated. FIXED.** At #1226's head, `OrderDetailComponent.tsx:642` passed `auctionFulfillmentReady={auctionFulfillmentAuthority?.fulfillmentReady ?? false}`, discarding `claimOrderId`, so authority earned by claim order A applied to any same-coordinate order B. At `d1a4a647`: the authority **object** is passed (`OrderActions.tsx:23-46`), and the mutation boundary requires `claimOrderAuthorizesFulfillment(authority, order.order.id)` (`settlementDescriptor.ts:635-641`: `authority.fulfillmentReady && orderEventId && authority.claimOrderId === orderEventId`). Identical intent to the required fix, and it fails closed on missing/partial authority.

---

## Context — this branch's own merge state is unchanged from my 2026-09-27 round

- `reviewDecision = CHANGES_REQUESTED`, `mergeStateStatus = BLOCKED`; head frozen at `d1a4a647` since 2026-09-25.
- `e2e-grep` is **red** at this head (`36145039479` / job `108103961279`), on this PR's own three new auction specs; all other checks pass, `e2e-full` skipped. Mechanism and prescription were given in my 2026-09-27 review (`5331572484`) — the seeded bid's DLEQ keyset is synthetic (`dleqFixture.ts:81,89`) with no browser-injectable keyset, so the buttons never appear.
- The gating maintainer `CHANGES_REQUESTED` (`5291828374`) is anchored at `79010e92`, which is **not** an ancestor of this head; its object (`package.json` `e2e/scenarios` change) is gone from the branch.

Fixing this BLOCK does not by itself unblock the PR — the e2e-grep red and the anchor/body-truth items above are separate merge conditions — but it is the last surviving *security* finding from #1226 and should not be dropped in the supersede.

---

*Read-only review of the pushed head; no commits made by this review. Line numbers are as of `d1a4a647`.*
