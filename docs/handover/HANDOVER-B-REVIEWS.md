# HANDOVER B — Review Queue Brief

**Date:** 2026-07-24
**Author:** Felix
**Purpose:** Prioritized review queue for incoming team members. Per-operator guidance from team call.
**Scope:** 5 PRs requiring review attention. Research only — no comments posted, no approvals given.

---

## Review Queue Priority Order

| Priority | PR | Author | Title | Target | State | Action Owner |
|----------|-----|--------|-------|--------|-------|--------------|
| **1** | [#1132](https://github.com/PlebeianApp/market/pull/1132) | turizspace | Shipping display improvements | `master` | CHANGES_REQUESTED | **Our team** — 2 reviewers needed |
| **2** | [#1160](https://github.com/PlebeianApp/market/pull/1160) | turizspace | Loading indicators (user names/avatars) | `master` | CHANGES_REQUESTED | **Our team** — 2 reviewers needed |
| **3** | [#1170](https://github.com/PlebeianApp/market/pull/1170) | hkarani | Auction validation (ADR #1151) | `auctions` | REVIEW_REQUIRED | **Wait for hkarani** — adding ADR file |
| **4** | [#1136](https://github.com/PlebeianApp/market/pull/1136) | maximotodev | NIP-17 order read integration helper | `master` | REVIEW_REQUIRED | **Our team** — formal approve needed |
| **5** | [#1168](https://github.com/PlebeianApp/market/pull/1168) | Franchovy | Auction order details | `auctions` | CHANGES_REQUESTED | **Wait for Franchovy** — needs to address blockers |

---

## PR #1132 — Shipping Display (turizspace)

**Branch:** `fix/shipping-options` → `master`
**Size:** +412 / -135 across 14 files
**CI:** ✅ All green
**Updated:** 2026-07-23T14:54Z (maximotodev review ~3h ago)
**Status:** Operator directive — expecting follow-up reviews from AT LEAST 2 team members.

### Blocking Review Items (maximotodev, 4 issues)

These are the specific items a reviewer must verify when turizspace pushes fixes:

1. **`ShippingInfoDisplay.tsx:17` — Currency mismatch.** Aggregate `totalAmount` is sats from order event, but rendered with shipping option's `price.currency`. Displays e.g. "100000 USD" when it means sats. Fix: display only current/base shipping-option metadata or omit the amount entirely.

2. **`tabs.tsx:109` — NaN in form state.** `convertCurrencyToSatsValue` returns `NaN` when rates unavailable. `.toString()` writes `"NaN"` into `productFormStore.price`. Fix: guard with `Number.isFinite()` and show conversion unavailability in UI.

3. **`tabs.tsx:946` — Incoherent cost model.** Input persists `shipping.extraCost` while "Total with shipping" shows converted sats. Two different models in one UI. Fix: pick ONE — either edit shipping total and derive extra, OR edit extra and show `base + extra = total`.

4. **`ChatMessageBubble.tsx:323` — Untrusted shipping ref parsing.** Shipping refs parsed without a shared canonical parser. Fix: split at first 2 separators, require kind `30406`, validate 64-hex pubkey, preserve remainder as `d` tag. Verify fetched event kind/coordinate matches before display.

### Prior Reviews (context)

- **felixfelix-bot** (4x COMMENTED, Jul 21): Original items (extract inline conversion, move formatter, replace magic `30406`). All RESOLVED/STALE per maximotodev.
- **Franchovy** (CHANGES_REQUESTED, Jul 22): Found `convertBetweenCurrencies is not defined` runtime error — turizspace fixed this today.

### Reviewer Checklist

- [ ] Confirm 4 maximotodev blockers are addressed in next push
- [ ] Verify `convertBetweenCurrencies` error is resolved
- [ ] Check no regression in cart/checkout flow
- [ ] 2 independent team member approvals required per operator

---

## PR #1160 — Loading Indicators (turizpace)

**Branch:** `feat/improve-loading-indicator-for-user-names-avatars` → `master`
**Size:** +248 / -75 across 4 files
**CI:** ✅ All green
**Updated:** 2026-07-23T13:15Z (turizpace push ~5h ago)
**Status:** Operator directive — expecting follow-up reviews from AT LEAST 2 team members.

### Blocking Review Items (maximotodev, 3 issues)

turizpace claims all 3 addressed in commits `5db81a6` + `c2113aa` (12:41-12:42 UTC today). **Re-review has NOT been completed.** maximotodev's CHANGES_REQUESTED is still active.

1. **[P1] `UserCard.tsx:49` — Kind-0 profile normalization.** Validly signed events can contain non-string fields (NDK doesn't runtime-validate). Whitespace-only `displayName` wins `||` before trimming, masking valid `name`. Fix: normalize kind-0 values before string methods.

2. **[P1] `UserCard.tsx:80` — Loading state misclassification.** `isPending || isFetching` misclassifies disabled queries as actively loading. A disabled no-data query is pending but idle → renders "Loading..." forever. Fix: use `isLoading` for replacement UI.

3. **[P2] `UserCard.tsx:186` — Keyboard accessibility.** Copy interaction uses `asChild` making `h2`/`p` the trigger — neither is focusable. Fix: make control keyboard-accessible.

### Prior Reviews (context)

- **Franchovy** (APPROVED x2, latest Jul 22): Non-blocking note on `isLoading` vs `isFetching` semantics.
- turizpace posted at 12:44Z claiming all 3 addressed: normalized kind-0 fields, switched to `isLoading`, keyboard-accessible copy.

### Reviewer Checklist

- [ ] Verify P1 normalization fix handles non-string kind-0 fields
- [ ] Verify `isLoading` replaces `isPending || isFetching`
- [ ] Verify copy control is keyboard-focusable
- [ ] 2 independent team member approvals required per operator
- [ ] Franchovy already approved — 1 more formal approval may suffice

---

## PR #1170 — Auction Validation (hkarani)

**Branch:** `feat/1151-auction-validation` → `auctions`
**Size:** +1,871 / -269 across 22 files
**CI:** ✅ All green (e2e-pricing, footprint, prettier, security-scan, unit-integration)
**Updated:** 2026-07-23T12:41Z (hkarani commits ~5h ago)
**Status:** ZERO reviews. hkarani picking it back up to add ADR file. **Wait for his update before reviewing.**

### What the PR Does

Implements ADR #1151 (Auction Validation). Tightens auction settlement verification:
- Requires valid kind-1024 settlement event (consistent winner, path release, payout data) before emitting `settled_promptly`/`settled_late` verdicts
- Adds pure `validatePathRelease(...)` and `validateSettlementCompleteness(...)` validators
- Fixes rebid-chain handling so token amount checks validate current leg delta
- Updates NUT-7 spent-state checks

### Key Files

- `src/lib/auction/validation.ts` (+571/-6)
- `src/server/auction-validator/lifecycle.ts` (+131/-36)
- `src/lib/auctionSettlement.ts` (+38/-54)
- `src/lib/cashu/nut7.ts` (+26/-7)
- `src/server/auction-validator/state.ts` (+48/-4)
- `src/server/auction-validator/subscriber.ts` (+37/-29)
- 6 test files

### Operator's Design Guidance (critical for review)

When hkarani pushes the ADR update, watch for these design principles:

1. **Mint reachability must NOT be required in validation.** It's redundant — mint reachability is already a prerequisite for bidding. Requiring it again in settlement validation adds unnecessary coupling.

2. **Validator MAY optionally maintain mint reachability status.** This is acceptable as an optimization — the validator tracks it once so every participant doesn't independently DoS the mint with reachability checks. This is a caching/observability concern, not a validation gate.

3. **hkarani may adjust the ADR** (#1151). Check if the ADR changes align with the above principles before reviewing the code changes.

### Reviewer Checklist (when hkarani is ready)

- [ ] Confirm ADR file is added (closes #1151 formally)
- [ ] Verify mint reachability is NOT a validation requirement
- [ ] Check if optional mint status tracking is present (acceptable)
- [ ] Review `validatePathRelease` and `validateSettlementCompleteness` purity
- [ ] Verify rebid-chain token amount checks validate current leg delta
- [ ] Confirm NUT-7 spent-state checks are correct
- [ ] Review for conflicts with #1144 (both touch `validation.ts`)

### Conflict Warning

#1144 (Franchovy, settlement steps) also modifies `src/lib/auction/validation.ts`. If both merge, there will be a conflict. hkarani's PR is the more focused validation-only change. Coordinate merge order.

---

## PR #1136 — NIP-17 Order Read Integration Helper (maximotodev)

**Branch:** `fix/1084-nip17-order-read-integration-helper` → `master`
**Size:** +1,026 / -0 (pure addition, 2 files)
**CI:** ✅ All green
**Updated:** 2026-07-20T23:53Z (3 days ago — stable)
**Status:** Near merge-ready. Franchovy already APPROVED. Needs our formal approval.

### What the PR Does

Pure-function ADR-014 read integration boundary. Merges legacy public order-message events (kind 14, 16, 17) with already-unwrapped NIP-17 order messages. Returns protocol/domain records only — no NDK, no React Query, no relay I/O. Clean protocol boundary, discriminated union types, deterministic dedup. Supersedes #1128.

### Remaining Items (non-blocking, from our review)

1. **Supersedes #1128** — suggest closing #1128 and porting test cases
2. **Missing `AGENTS.md`** in `src/lib/orders/` — #1128 had one
3. **Add test case** for non-zero decimal like `12.50` (tests cover integers and `.00` only)
4. **Comment explaining** single `p` tag requirement on NIP-17 rumors

### Reviewer Checklist

- [ ] Confirm 4 non-blocking items — decide if any block merge
- [ ] If all non-blocking: formal APPROVE to unblock
- [ ] Franchovy already approved — this is the second approval needed

---

## PR #1168 — Auction Order Details (Franchovy)

**Branch:** `feat/auction-order-details` → `auctions`
**Size:** +627 / -39 across 6 files
**CI:** ✅ All green
**Updated:** 2026-07-23T01:33Z (Franchovy, ~16h ago — no commits since reviews)
**Status:** WAITING ON FRANCHOVY. Not a new review — he needs to address changes-requested from our review + maximotodev's. Track for when he pushes updates.

### Blocking Items — felixfelix-bot review (3 items)

1. **Gate auction queries behind `isAuctionOrder`.** Three auction query hooks fire on every order page, including product orders with empty `auctionCoordinates`.
2. **Revert/auction-gate layout change.** `flex flex-wrap gap-2` → `flex gap-3` in `OrderActions.tsx` applies to ALL orders, breaks wrapping on narrow screens.
3. **Annotate commented-out e2e assertions.** Test limitation vs app bug — currently ambiguous.

### Blocking Items — maximotodev review (6 items)

1. **`orders.tsx:210`** — Auction identity from first parseable `a` tag only. Must reuse `getAuctionClaimPublicMarkerFields()` canonical parser.
2. **`OrderDetailComponent.tsx:135`** — `settlements[0]` + array presence not trustworthy. Must resolve exact settlement from claim marker, cross-check seller/root/coordinate/winner/amount.
3. **`OrderActions.tsx:40`** — Generic `getOrderStatus()` action matrix reopens payment after settlement. Must define auction settlement→fulfillment action matrix.
4. **`e2e/scenarios/index.ts:901`** — E2E fixture would fail production protocol parsers. Must build with production tag builders.
5. **Keep distinct states** — path release, seller settlement attestation, mint verification, and fulfillment must be distinct states with evidence-based copy.
6. **Restore `flex-wrap`** on shared product action container (same as our item #2).

### Tracking Note

This PR is a clean subset of #1144 (settlement steps). Once Franchovy addresses blockers, #1168 could be first auction-order PR to land on `auctions` branch. No file overlap with our NIP-53 stack (#1171-1173).

---

## Time Capsule Delta

**No PRs have moved since the initial research time capsule (~22:52 UTC).**

Most recent activity timestamps:
- #1132: 14:54 UTC (maximotodev review, ~3h before capsule)
- #1160: 13:15 UTC (turizpace push, ~5h before capsule)
- #1168: 01:33 UTC (Franchovy, ~16h before capsule — stale)
- #1170: 12:41 UTC (hkarani commits, ~5h before capsule)
- #1136: Jul 20 (3 days before capsule — stable)

No new commits, reviews, or comments detected on any of the 5 PRs between the initial research and this document.

---

## Conflict Matrix Summary

Our NIP-53 stack (#1171→#1172→#1173, base: `auctions`):
- **#1138** (Auctions V1 umbrella): 5 file overlaps — structural, expected
- **#1170**: No file overlap. Both target `auctions`. #1170 touches `validation.ts`, we touch `nip53.ts` / `LiveChatPanel.tsx` — different modules
- **#1168**: No file overlap. Different modules on same branch
- **#1132, #1160, #1136**: Target `master`, no overlap

The `auctions` branch is contested (10 PRs target it). Any merge will force rebase of others. Our stack must merge in strict order: #1171 → #1172 → #1173.
