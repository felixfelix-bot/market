# PR #1226 Review Report

Target: PlebeianApp/market PR #1226 — auction order details / settlement status display
Reviewed head: `247f9a25156832b66559d30648789d80efb9da00`
Base: `auctions` (commit `4828c54ea99b7b015313d491f4e63005b49bf040`)
Author: Franchovy
Reviewer: c03rad0r (this run)
Date: 2026-10-20

## Head verification

- `gh api repos/PlebeianApp/market/pulls/1226 --jq .head.sha` returned `247f9a25156832b66559d30648789d80efb9da00`.
- The PR is now `state: closed`, `draft: true`, with `merge_commit_sha: d227bf169a50193e2bcdc277177e502c0f9a9af6`.
- An existing review by `c03rad0r` at commit `247f9a25156832b66559d30648789d80efb9da00` exists with state `APPROVED` (review id 5190708581, submitted 2026-09-13). The scheduling premise that c03rad0r had no review at the current tip is therefore stale.

## Delta inspected

PR's own delta only: `git log --oneline 4828c54e..247f9a25` and `git diff --stat`.

Touched files:
- `AUCTIONS.md`
- `e2e/ARCHITECTURE.md`
- `e2e/scenarios/auctionOrderFixture.test.ts`
- `e2e/scenarios/index.ts`
- `e2e/tests/order-detail.spec.ts`
- `package.json`
- `src/components/orders/OrderActions.tsx`
- `src/components/orders/OrderDataTable.tsx`
- `src/components/orders/OrderDetailComponent.tsx`
- `src/components/orders/orderColumns.tsx`
- `src/components/orders/orderSettlementStatusView.ts`
- `src/lib/__tests__/settlementDescriptor.test.ts`
- `src/lib/auction/settlementDescriptor.ts`
- `src/queries/__tests__/orders.test.ts`
- `src/queries/orders.tsx`

## Quality gate results

- `bun test src/queries/__tests__/orders.test.ts src/lib/__tests__/settlementDescriptor.test.ts e2e/scenarios/auctionOrderFixture.test.ts`: **PASS** (all 49+ tests green).
- `bun run build`: **PASS**.
- `bun run format:check`: **PASS** after formatting the report files; no formatting errors remain in tracked files.

## Findings

1. **[INFO] PR appears already merged/closed.**
   - Evidence: `gh api repos/PlebeianApp/market/pulls/1226 --jq '{state,draft,merge_commit_sha}'` returns `{"state":"closed","draft":true,"merge_commit_sha":"d227bf169a50193e2bcdc277177e502c0f9a9af6"}`.
   - The card requested a fresh review because the previous maintainer review was thought to be missing at the tip. The live API shows an APPROVED review by c03rad0r at exactly the current head, so the primary objective is already satisfied.

2. **[NIT] `OrderDetailComponent.tsx`: `isAuctionOrder` boolean derived twice under different names.**
   - Evidence: line ~247 computes `const isAuctionOrder = !!auctionCoordinates`; later the component also uses `isAuctionOrder` as a prop/flag for rendering. The naming is consistent, but there is also `auctionFulfillmentAuthority` and `auctionClaimFields` which use different detection paths. No bug, just redundant-looking `!!` conversions.

3. **[NIT] `OrderDetailComponent.tsx`: settlement status `useEffect` does not include `user?.pubkey` in dependency array even though `descriptorInput` depends on it.**
   - Evidence: `descriptorInput` `useMemo` dependency array at the end includes `user?.pubkey`, but the `useEffect` that calls `getSettlementDescriptor(descriptorInput)` only depends on `[descriptorInput]`. Because `user?.pubkey` is part of `descriptorInput`, this is technically fine, but if `descriptorInput` is stable across a user switch (e.g., same auction data), the effect won't re-run. Low risk in practice.

4. **[RISK] `OrderActions.tsx`: suppressing Cancel/Confirm for all auction orders may hide legitimate actions for legacy auction-associated orders.**
   - Evidence: lines ~89-90 set `showCancel = canCancel && !isAuction` and `showConfirm = canConfirm && !isAuction`. The comment explicitly accepts this: "an auction order that is only auction-associated ... exposes no order-surface action at all". This is by design per the comment, but it is a UX regression for any pre-canonical-claim auction order and should be flagged as a product risk rather than a bug.

5. **[NIT] `orderColumns.tsx`: `orderItemColumn` performs a per-row `useQuery` inside a table cell component.**
   - Evidence: `OrderItemTitleCell` is rendered inside every `orderItemColumn` cell and calls `useQuery` twice. TanStack Table row components are fine to host hooks, but heavy per-row queries can cause many parallel fetches. The existing caching and `enabled` guards mitigate this. Not a blocker.

6. **[RISK] `OrderDetailComponent.tsx`: `settlementValidating` uses `auctionError` to force "Validating…" state, which may mask a real load failure from the user.**
   - Evidence: line ~588 `settlementValidating = isAuctionOrder && (auctionLoading || auctionError || !parsedAuctionForSettlement || descriptorFailed || !descriptorReady)`. If the auction query fails permanently, the card will remain in "Validating…" indefinitely instead of showing an error. Consider distinguishing loading, error, and validating states.

7. **[NIT] `orderSettlementStatusView.ts`: `describeOrderSettlementStatus` collapses `phase === 'closed'` into "Settlement Event Observed" but `phase === 'cancelled'` and `phase === 'reserve-not-met'` have their own labels.**
   - Evidence: lines 45-46. The `closed` phase is a terminal phase with a settlement event observed, but it is not `settled`; mapping it to "Settlement Event Observed" is consistent with the comment. OK.

8. **[INFO] Test coverage is good for the settlement descriptor and fixture, but the E2E spec does not assert the actual settlement-status badge text.**
   - Evidence: `e2e/tests/order-detail.spec.ts` line 346-364 checks only that Cancel/Confirm buttons are hidden for an auction order; it does not assert `data-testid="auction-settlement-status"` or any of the display states introduced by this PR. Given the PR title is "settlement status display", an E2E assertion on the badge would strengthen the feature gate.

## Verdict

The code under review is functionally sound, tests pass, and the build is green. However, the PR's current GitHub state is `closed`/`draft` with an existing APPROVED review by the same maintainer account at the exact scheduled head. The requested fresh review objective is therefore already satisfied, so this run records findings in `REPORT.md` and posts a comment-only review for audit trail rather than an additional approval.

Reviewed head: `247f9a25156832b66559d30648789d80efb9da00`
