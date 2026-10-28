# REPORT.md — PR #1138 "Auctions V1" delta review

**Task:** review PlebeianApp/market PR #1138 (Franchovy, DRAFT, base master).
**Run:** 2026-10-28. Branch `preflight/pr1138-20261023`.
**Dispatch freeze:** `~/.hermes/bot/.dispatch_frozen` did **not** exist on this host (`ls` → ENOENT). Noted only; the freeze was not lifted, modified, or worked around, and nothing was dispatched.

---

## 1. Head verification — IT MOVED, reviewed the new head

| | |
|---|---|
| Scheduled head | `50199dce5a11c1d33d42bfe8bdda55447e6ab5d7` |
| **Head at review time (verbatim)** | **`6be7496cc2089db2e2da04bb083312ae6d43a79d`** |
| Moved? | **YES — 312 commits** (`git rev-list --count 50199dce..6be7496cc` = 312) |
| Base | `master`, `base.sha = c8c06fd74dd3d259dfc43bf79f7da2c3590eb664` |
| State | `open`, `draft: true`, `mergeable: false`, `mergeable_state: dirty`, 133 commits behind `master` (`d4757b40`, 2026-10-17) |

This head is not new to anyone who read the preflight already in this worktree: `PREFLIGHT-1138.md` + `MANIFEST.md` (commits `e872ce8a`, `b3fceb18`, `c18ea56a`) had independently established `6be7496cc` as the live tip and produced the 387-file manifest. That work was reused rather than redone; every fact it supplied was re-derived here before being relied on (see §3).

## 2. Review inventory — a review was owed, and it is now posted

Before this run: `gh api …/pulls/1138/reviews` filtered on `commit_id == 6be7496cc…` → **0**. The nearest posted review (5328118447, 2026-09-26) covered `eacc4256`, which is 6 commits behind the tip.

**Posted:** review **5690837398**, `state: COMMENTED`, `commit_id: 6be7496cc2089db2e2da04bb083312ae6d43a79d`, body length 11863 chars (byte-equal to `docs/pr1138-review/review-body.md`).
URL: https://github.com/PlebeianApp/market/pull/1138#pullrequestreview-5690837398

Used `--comment`, not `--approve`: the PR is a draft, conflicting with master, has no e2e evidence at this head, and carries live unresolved RISKs. Nothing was approved.

## 3. Diff scope — the PR's own delta, verified against the API

`c8c06fd7..6be7496cc` = `git diff --shortstat` **387 files changed, 79922 insertions(+), 1579 deletions(-)** — an exact match to the API's `changed_files`/`additions`/`deletions`. So the range *is* the PR's own delta, not a merge-base artifact.

Within it, the genuinely unreviewed window is `eacc4256..6be7496cc`: **6 commits, 10 files, +166 / −27** (re-measured: `git rev-list --count` = 6, `git diff --shortstat` = 10 files / 166 / 27). That window is what the review reads line by line.

The 10 files: `useNut7Polling.ts` + its test, `piiSentinelFixture.ts` (new), six privacy suites refactored onto it, and the seller-dashboard route. Commit lineage: `34c333ef` → `6ee42e60` → `a64ec4fe` → `a305ecda` → `95eeefca` → `6be7496cc` (a merge of `eacc4256` and `95eeefca`; `git diff 95eeefca..6be7496cc` is empty, so the merge introduced nothing new).

Also noted: `#1138` is the **base** of the stack, not a stacked child (`base.ref=master`, head repo is `PlebeianApp/market`), so no parent's files leak into this diff — the inverse holds, our merged #1280 content is *inside* it.

## 4. Verification performed (real execution, not inspection only)

- **Unit baseline:** detached worktree at `6be7496cc`, symlinked `node_modules`, ran the 7 touched suites → **131 pass / 0 fail / 726 expect() calls**.
- **Mutation A — revert the dashboard fix** (`useNut7Polling(parsedBids, …)` → raw `bids`): suite **stayed green (131/0)**. Recorded honestly: the seller-dashboard call-site fix is **unpinned by any test**. The only e2e touching that route (`e2e/tests/auction-invalid-event-gate.spec.ts:266`) asserts a malformed-auction notice, not NUT-7 evidence.
- **Mutation B — delete the `proofYs` guard** in `useNut7Polling.ts:27-29`: **2 of 3 tests fail** (`TypeError: undefined is not an object (evaluating 'mintUrl.trim')`). The guard's test really bites.
- **Probe — the guard's blind spot:** a projection with `proofYs` but no `mint` throws the same `TypeError` at `useNut7Polling.ts:30` (`probe_nut7.test.ts`, run at the head, then deleted). This is the NIT in the posted review.
- **CI at head:** 8 check-runs — 7 success (Build, prettier, e2e-grep, instance-literals, footprint, auctions-surface, Deploy to AuctionsDev), **`e2e-full` skipped**. No e2e evidence at this SHA.
- **Prior findings re-verified against the code, not relayed:**
  - 4992989990 BLOCK 1 (fail-open quorum) — **FIXED**: `auctions.tsx:1362` and `:1364` throw on null-fetch / parse-fail.
  - 4992989990 RISK 2 + RISK 3 — **LIVE**: `auctions.tsx:1373-1381` counts raw relay verdicts with no per-validator latest dedup and no eligibility screen (contrast `bidValidation.ts:386-394`, `:398-412`); `publisher.ts:95-102` republishes only the arriving bid, so the demoted winner's `won_pending_settlement` is not retracted.
  - 5328118447 RISK 1 — **LIVE**: `git grep -ic dleq src/server/auction-validator/` → zero matches; `pickWinningBid` (`lifecycle.ts:459`) sorts by `bid.amount` over `valid_bid_placed`.
  - 5328118447 RISK 2 — **LIVE**: `isWithinRelayTagIndexBudget` (`nip53.ts:56`) is referenced only from `nip53.test.ts`; `buildLiveActivityTags` emits `['a', params.auctionCoord]` at `:126` unasserted.
  - 4987152393 BLOCKs 1–2 (restart flips verdicts to `bid_invalid`): `index.ts:94` awaits `recoverObservedAt` before `subscriber.start()` at `:111`, and `subscriber.ts:415` prefers `seedObservedAt`. Recorded as addressed by the code as written.
- **New finding raised by this review:** the *public* detail route (`src/routes/auctions.$auctionId.tsx:479-485`) calls `computeValidatedBids` **without** `nut7States`, while `AuctionSettlement.tsx:207` polls with them — the same defect class `a305ecda` just fixed on the seller surface, mirrored on the buyer surface.
- **Small concrete finding:** `ctxcn.config.json.bak` (9 lines) is committed by `3239b2bb` in this PR's range and is not in master.
- **Inline threads:** `gh api …/pulls/1138/comments` → `[]` and GraphQL `reviewThreads.totalCount` = 0 (per the preflight, re-confirmed by the empty comments endpoint). Nothing to reply to in-thread; the review body answers the three unanswered prior reviews by name instead.

## 5. Verdict posted

No new BLOCKs in the delta — the four substantive changes in it are correct and (for the `proofYs` guard) genuinely test-covered. Two RISKs from prior reviews remain live and unfixed, plus the tag-index budget and the public-page NUT-7 gap, none introduced by this delta. `COMMENTED`, explicitly not an approval and not a merge authorisation.

## 6. Files touched

- `docs/pr1138-review/review-body.md` — the posted review body (byte-identical to what GitHub holds, 11863 chars).
- `REPORT.md` — this file. NOTE: this path was a **tracked** file holding the 2026-10-12 PR #1280 round-4 report; `PREFLIGHT-1138.md` deliberately wrote elsewhere to avoid that collision. The prior content is intact at `git show 380347a1:REPORT.md` and was not modified in history — only the worktree copy was replaced, per the task's "full report at `<worktree>/REPORT.md`" contract.
- `PROGRESS.md` — crash-recovery log.

`MANIFEST.md` and `PREFLIGHT-1138.md` were left as the prior worker wrote them; no review-owed claim in them was contradicted by this run.

## 7. Remaining steps

None. The review is posted at the live tip and the reviewed SHA is recorded (`6be7496cc2089db2e2da04bb083312ae6d43a79d`) in the review's own footer and in §1 above, so the next sweep can tell coverage is at tip. Two follow-ups belong to the author, not to this card: rebase onto `master` and un-draft, and run `e2e-full` at the tagged head.
