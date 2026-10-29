# REPORT — PR #1226 review leg (fleet offload worker)

**Task:** Review PR #1226 `feat: auction order details — settlement status display`
(Franchovy). Brief said: OPEN, MERGEABLE, REVIEW_REQUIRED, CI 5/5 SUCCESS, review
re-requested 2026-09-10T17:33Z.
**Outcome:** The brief was **stale**. #1226 is **closed, never merged**. The review was
delivered on its open successor **#1361**, which is the actual standing gate.
**Status: COMPLETE.** Verdict posted with `REQUEST_CHANGES`.

---

## 1. The review target had moved (blocking discovery)

Live state at task start vs. the brief:

| Field | Brief | Live |
|---|---|---|
| state | OPEN | **CLOSED** (2026-09-19T20:43:54Z by Franchovy, "Superceded by #1361") |
| isDraft | — | `true` |
| merged | — | `null` (never merged) |
| reviewDecision | REVIEW_REQUIRED | **APPROVED** (c03rad0r, 2026-09-13T12:49Z) |
| CI | 5/5 SUCCESS | n/a — closed |
| reviewRequests | c03rad0r, felixfelix-bot, maximotodev | `[]` |

The brief's 2026-09-11 snapshot describes a moment that passed before the PR was closed
eight days later. There was no actionable review on #1226: GitHub rejects a review on a
closed PR, and the branch was abandoned by its author with an explicit supersede note.

Timeline establishing this (`gh api .../issues/1226/timeline`):
- 2026-09-13T12:49Z — c03rad0r **approved** 247f9a25.
- 2026-09-13T14:10Z — Franchovy converts back to **draft**.
- 2026-09-19T20:43Z — Franchovy **closes**: "Superceded by #1361".
- 2026-10-24T00:09Z — felixfelix-bot posts `CHANGES_REQUESTED` (5635730808) on the
  already-closed PR; 2026-10-24T02:10Z adds a follow-up naming #1361 as the standing gate.

A stale verdict here would have been worse than no verdict: the pre-run scan note
(`REVIEW_REQUESTS=[]` "known bug") correctly flagged that the review-request list was
empty, but the operational conclusion drawn from it — "gh search is buggy, the PR is
still awaiting us" — does not survive contact with `state: CLOSED`.

## 2. Successor PR #1361

```
number: 1361   state: OPEN   draft: false
title: feat(auctions): auction order details — settlement status display & auction-aware order actions (supersedes #1226)
head:  d1a4a647ddb87dfeb90f00de3cbb33c4d42d5285  (2026-09-25T14:03:06Z)
base:  auctions   mergeable: MERGEABLE   mergeStateStatus: BLOCKED
reviewDecision: CHANGES_REQUESTED
```

Head is unchanged since the previous review (2026-10-24), so I re-derived every claim
from the tree rather than inheriting the prior verdict. I fetched it as `pr1361`
(`git fetch origin pull/1361/head:pr1361`) and read files via `git show` — **not** by
checking out, because this worktree carries another writer's uncommitted changes
(`MANIFEST.md`, `artifacts/pr1306_dedup/*`, `src/lib/auction/reserveGuard.ts`,
`e2e/baseline-results/`). I did not touch any of them.

Diff scope: 13 files, +2271/−61.

## 3. Findings

### B2 — "Griefed (No Fallback)" still seller-decided — **BLOCK (survives)**

Reaches ADR-0004 exactly as before, and I found the prior note understated it.

Mechanism, both ends confirmed:
- `settlementDescriptor.ts:453-468` reduces `settlements` and sets
  `settlementStatus = latestSettlement?.status`. Those are `ParsedSettlementEvent`,
  i.e. **kind-1024** (`constants.ts:41`), whose `status` is a five-line zod enum
  (`schemas/auction/settlementEvents.ts:109`). `input.verdicts` never reaches this
  decision — it is consumed only by `computeValidatedBids`.
- No grief quorum can form even in principle: `griefed` and
  `griefed_pending_fallback` **are** in `VALIDATOR_CLAIMS` (`constants.ts:163-164`), but
  are in neither `VALIDATOR_CONFIRM_CLAIMS` (`:177`) nor `VALIDATOR_CONDEMN_CLAIMS`
  (`:180`); `computeVerdictQuorum` tallies only those two sets
  (`verdictQuorum.ts:56-57`). A validator grief claim is therefore always *neutral*, and
  nothing maps a quorum back to `griefed_no_fallback`.

ADR-0004 contradicts the code verbatim:
> `griefed_no_fallback` | Validator quorum (kind-30440) | Network consensus — ADR-0004:298
> **`griefed_no_fallback` moves from seller-derived to validator-quorum-derived.** […]
> The descriptor determines grief from `griefed` quorum in kind-30440 verdicts, not from
> the seller's kind-1024 claim. — ADR-0004:301-305 (restated :369-373)

**Cost (new analysis):** `isSettlementStructurallyValid` returns `'valid'` for
`griefed_no_fallback` on seller/root/coordinate alone (`:185-189`), and grief is exempt
from the reserve-meeting-bid guard that covers `cancelled`/`reserve_not_met`
(`:181-186`). So a seller-signed kind-1024 with `status=griefed_no_fallback` is
classified **valid unconditionally**, and `classifyPhase` returns
`'griefed-no-fallback'` (`:552-553`). A seller can close an auction that a bidder
validly won, and the order page presents "Griefed (No Fallback)" as a validated terminal
outcome to the buyer and to any fallback bidder. That is the seller-spoofable negative
ADR-0004 exists to prevent.

The test **encodes** the violation: `__tests__/settlementDescriptor.test.ts:683-691`
seeds grief with `makeSettlement({status:'griefed_no_fallback'})` and **no verdicts**
(`makeInput` default `verdicts: []`, `:281`), then asserts the grief outcome. It should
assert the opposite for a claim-only fixture.

### B4 — verdicts fetched by current version id, not the root — **BLOCK (new)**

`OrderDetailComponent.tsx:465-469` uses `useAuctionVerdicts(auctionData?.id ?? '', …)`.
Every sibling consumer passes the **root**: `auctions.$auctionId.tsx:459`,
`dashboard/products/auctions.$auctionId.tsx:282`, `AuctionBidder.tsx:150`
(`auctionRootEventId || auctionId`).

This matters because verdicts carry **both** tags — `auctionCoordinate` is parsed from
`a` (`schemas/auction/validatorEvents.ts:112`) — and `fetchAuctionVerdicts` sets `#e`
*and* `#a` (`queries/auctions.tsx:610-611`), so the relay ANDs them. A kind-30408
replacement carries `auction_root_event_id` (`schemas/auction/auctionEvent.ts:154`).
For a republished auction `#e: <current version id>` matches no verdict while
`#a: <coordinate>` does → `auctionVerdicts` empty.

Consequence: empty verdicts → no bid reaches quorum → `canonicalWinner` null → `settled`
returns `'invalid'` (`:192-193`) → order page shows "Awaiting Settlement" while the
auction page shows "Settled". It would also suppress grief verdicts on republished
auctions once B2 is fixed, so both belong in the same change.

### B1 / B3 — confirmed fixed (not inherited)

- **B1** `settlementDescriptor.ts:613-616`: `settlementIsValid && classifyPhase ===
  'settled' && hasMatchedClaimOrder`; fails closed on `pending`. ✅
- **B3** `claimOrderAuthorizesFulfillment` (`:634-641`) requires
  `authority.claimOrderId === orderEventId`, null-safe. ✅

### CI is red at head — and one failure is this PR's own new test

`e2e-grep` **fails** on `d1a4a647`; the other six checks pass (`auctions-surface`,
`footprint`, `instance-literals`, `prettier`, `security-scan`, `unit-integration`).
The brief's "CI 5/5 SUCCESS" was from September and no longer holds.

- `e2e/tests/order-detail.spec.ts:147` — **new in this PR**. `getByRole('button',
  {name:/process order/i})` not visible, while the assertions above it (`Auction Item`
  header, `Pending` status) passed. Per AGENTS.md, order progress derives from the
  validated settlement + canonical claim — precisely the authority path B4 empties. B4
  is a plausible shared root cause; needs ruling in/out, not a re-run.
- `e2e/tests/auction-settlement.spec.ts:869` — "kind-1024 settlement event should arrive
  on the relay" (45 s timeout). Looks pre-existing/unrelated, but it is red on this
  branch regardless.

### Non-blocking
- `order-detail.spec.ts:138-139` — the settlement-card content assertion is **commented
  out** with "TODO: Needs CVM configuration". The PR's headline behaviour is that card,
  and the e2e asserts everything around it except its content.
- The two-way statement of the `settlementIsValid` guard (positive classification +
  `isSettlementPending`) is a good defensive choice. No action.

## 4. Deliverables (all observed in tool output)

| Deliverable | Where | Evidence |
|---|---|---|
| Review verdict `REQUEST_CHANGES` | #1361, review **5691384997**, commit `d1a4a647` | API returned `{"state":"CHANGES_REQUESTED","id":5691384997,"user":"felixfelix-bot","submitted_at":"2026-10-29T00:22:26Z"}` |
| Provenance pointer | #1226, comment **6484324481** | API returned `html_url: .../pull/1226#issuecomment-6484324481` |
| Verdict text (on disk) | `artifacts/pr1226_review/verdict_1361.md` | posted verbatim via `-F body=@file` |

Review permalink: https://github.com/PlebeianApp/market/pull/1361#pullrequestreview-5691384997

## 5. Honest gaps

1. **Commits are LOCAL ONLY — unpushed.** `git push origin HEAD:refs/heads/preflight/pr1138-20261023`
   was refused: `remote: Permission to PlebeianApp/market.git denied to felixfelix-bot`
   (HTTP 403). The bot is pull-only on this repo. Two commits exist locally only:
   `7752ae69`, `873de33c` (PROGRESS.md), plus the final report commit. I could not
   satisfy the "commit AND push" mandate; I am reporting it rather than claiming it.
2. **I did not run the unit suite locally.** The worktree holds another writer's
   uncommitted changes, and full e2e needs explicit approval per e2e/AGENTS.md. CI is
   the authority on tests here, and CI is red — stated as such, not smoothed over.
3. **B4's causal link to the `order-detail.spec.ts:147` failure is a hypothesis**, not
   proven. It is labeled as plausible in the review, with the evidence chain given so it
   can be cheaply ruled in or out (check whether the seeded auction carries
   `auction_root_event_id`).
4. **The board card `t_c9b109fb` was not advanced.** The task framed it as the blocked
   "fix leg" with this as its "missing review leg". The review leg is now delivered, but
   I hold no verified board credentials or schema in this session and did not invent a
   transition. Whoever owns the board should move it on the strength of review 5691384997.

## 6. Recommendation to the orchestrator

Drop #1226 from the review queue permanently (closed, superseded, branch abandoned) and
re-point the review leg to **#1361**. #1361 should not be merged until **B2** and **B4**
are fixed and `e2e-grep` is green. The prior review's claim that B2 was merely
"provenance" should be corrected: it is a live seller-spoofing path.
