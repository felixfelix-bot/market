# Cold cross-family review — PR #1317 delta-review draft (head cfef7525)

**Verdict: APPROVED** (matches the prior run of this same card, comment 372 on t_e5bfd820; independently re-derived here from live API + repo bytes, not from the prior run's text)

- **Reviewer:** worker-reviewer-glm (zhipu / GLM family) — cross-family vs the draft author's lane (felixfelix-bot publishes under the Kimi/Moonshot family label).
- **Draft under audit:** `Reviewed tip cfef7525 — no new issues found. Approving.`
- **PR:** PlebeianApp/market#1317 `feat(auctions): auction won modal` (author hkarani, base `auctions`, head branch `feat/1050-auction-winning-modal`)
- **Card:** plebeian-pr-reviews t_e5bfd820 ("Cross-family cold review: PR #1317 delta review draft (cfef7525)")
- **Evidence:** `artifacts/pr1317_coldreview/raw/` in this branch (worktree `/tmp/wt1317cold`, branch `review/pr1317-cold-20261029` on fork `felixfelix-bot/market`)

---

## 0. Dedup state — the draft is ALREADY PUBLISHED; no re-post is made

The exact draft text is live on the PR as **issue comment 5700061320** (felixfelix-bot, 2026-09-16T15:28:56Z), byte-identical to the draft (verified: `diff` empty after normalising the trailing newline). It was posted together with the formal **APPROVED review 5224768310** (2026-09-16T15:29:00Z, commit_id `cfef7525e9`), whose body carries the qualified claim:

> "The delta review (9a4c4e36..cfef7525) found no new issues **beyond those already raised in the existing review at this head** (felixfelix-bot comment 5219729164)."

So the review-of-record at this head already exists, and its body states the correct scope qualifier the bare one-liner omits. Per the review-only exception and the fleet dedup rule, this cold audit does **not** post anything to the PR: no comment, no review, no metadata. The audit's output is this report + the pushed evidence branch. (The earlier 19.5 KB review 5219729164 at the same head — verdict CHANGES REQUIRED, 6 findings — is the findings oracle; see §3.)

## 1. (a) Is "no new issues" credible for 9a4c4e36..cfef7525 (19 commits, 12 files, +1105/−164)?

**Shape verified exactly:** `git rev-list --count` = 19; `git diff --shortstat` = 12 files, +1105/−164. Both SHAs exist; cfef7525 is an ancestor of `origin/auctions` (content-merged, squash-style).

**Yes — under the "beyond already-raised" reading, and only under it.** The delta was not merely trusting the closure claims:

- I ran the full unit battery at the tip in a clean worktree: `bun test src/lib/__tests__/auctionWon.test.ts` → **16 pass / 0 fail**; `bun test src/queries/__tests__/auctionPathReleases.test.ts src/queries/__tests__/auctionVerdicts.test.ts` → **12 pass / 0 fail**. Matches both prior reviews' numbers.
- I swept every hunk of all 12 delta files (diffs read in full; the three largest — monitor, modal, publisher — read both as diffs and as full tip files).
- I ran `tsc --noEmit` at **base** (9a4c4e36) and **tip** (cfef7525) with identical flags and compared histograms: base 308 errors, tip 312. The delta adds **2× TS2554** (`src/publish/auctions.tsx:1604,1669` — `fetchAuctionVerdicts(...)` called with 6 args against a 5-param signature; the trailing `true` is a phantom `verifySignatures` that the function never had) and **2× TS2345** (readonly-array nits at `auctionWon.test.ts:388-389`), and resolves the runtime half of the already-raised call-site defect (see §3, last bullet).
- The 2 TS2554s are **runtime-inert** (position-5 `undefined` → default fetcher; 6th arg ignored by JS) and the repo has **no typecheck gate in CI** (6 check-runs at cfef7525: e2e-grep / unit-integration / prettier / security-scan / footprint = success, e2e-full = skipped; no tsc job; 308 pre-existing errors at base make a clean tsc structurally unreachable today). Both sit on lines the PR added, and the call-site defect family was **already raised by Copilot** at c76ab196 (`publish/auctions.tsx` "passing `true` as fetchFn ... TypeScript type error"). Commit 80507d32 ("publisher passing true as fetchFn") fixed the runtime half (boolean no longer lands in the `fetchFn` slot) but left the dead 6th arg in place. Not a BLOCK/RISK; it is residue of a raised item, and it persists on merged `origin/auctions` today.

## 2. (b) The 5 maxime-tt required findings are addressed — mechanism-verified at cfef7525

Prior review recovered verbatim from issue comment 5679431492 (2026-09-15T11:29:26Z, at head 9a4c4e36): 5 required findings + non-blocking list. The task's claimed fix mechanisms all exist at the tip, and I read each implementation:

1. **R1 competing settlement surfaces** → `shouldUseNonBlockingAuctionWinPrompt` (`winNotification.ts:20-23`) matches `/auctions/:id`, `/dashboard/products/auctions/:id`, `/dashboard/orders/:id`; on those paths the modal renders a **non-modal** `aside[role=dialog][aria-modal=false]` (`AuctionWonModal.tsx:216-266`) so the page's own Release Path affordance (`AuctionSettlement.tsx:126`, `auctions.$auctionId.tsx:626`, dashboard detail `:489`) stays interactive. The 3 previously failing e2e specs drive `/auctions/<id>` (covered) and `e2e-grep` is green at the tip. The pre-existing settle surfaces on the two covered detail routes keep their own CTAs — the modal no longer blocks them. (`AuctionSettlement` is mounted only on `auctions.$auctionId.tsx` among routes; `bids.tsx`/`auctions.tsx` dashboard lists import only query helpers — checked, no second missed surface of the raised class.)
2. **R2 premature "resolved" marking** → `terminalRootEventIds` (`useAuctionWinMonitor.ts:43`) is written only on genuinely terminal conditions: `:78` (auction unavailable after `fetchAuctionWithRetry` = 3 attempts), `:90` (settlement deadline passed), `:107` (final settlement observed). No-winner / other-bidder / under-reserve results now **remove** any previously announced entry and `continue` (re-pollable) instead of being burnt (`:129-150`).
3. **R3 window-valid vs quorum-gated CTA** → win derivation now goes through `getValidatedAuctionBids` → `computeValidatedBids({postSettlement:false}).canonicalWinner` (`winNotification.ts:32-37,82-84`), the same validated pipeline the publisher cross-checks (`publish/auctions.tsx:1270` re-resolution + the `won_pending_settlement` quorum gate at `:1306-1321`, preserved verbatim). Reserve is still checked at enqueue (`:144-149`).
4. **R4 queue not scoped/never cleared** → payload now carries `bidderPubkey` (`auctionWon.ts:3-7`); `retainForBidder` on auth change (`auctionWon.ts:39-41`, monitor `:47-52`), `clear` on logout (`auth.ts:306` — verified in the delta diff), `removeForAuction` for targeted removal; modal gates rendering on `isActiveBidder` (`:54`) and re-checks the account immediately before settling (`handleSettle` first lines), clearing the queue if the account changed mid-flight.
5. **R5 already-released winner re-prompted** → `hasValidatedPathReleaseForAuctionWin` (`winNotification.ts:92-133`) walks the winning rebid chain and requires a **validated** release per leg (`validatePathRelease` with `postCloseDecision:'winner'`), consumed in both modal (`:85-87`) and monitor (`:156`); the publisher emits one kind-1025 per leg, so the predicate is satisfiable in production. The monitor also announced-dedupes via `announcedBidIdsByRoot` so a re-enqueue loop needs a genuinely different canonical winner.

Cross-check: the delta's own commit messages map 1:1 to these (b8b969bb cross-account queue, de05a4ce validator-verified winner, f8d28c9f premature-resolved, de05a4ce/77ce2eca winning-bidder, 76f599a6 re-resolve-before-publish, 85361cd7 non-blocking settlement panel, 62827cf5 e2e fix). The post-merge felixfelix-bot comments (5710484483 etc.) confirm the same mechanisms were the closure record.

## 3. (c) No new BLOCK/RISK beyond what was already raised

**The raised baseline is large.** At the review tip cfef7525 there is a 19.5 KB felixfelix-bot review (5219729164, posted 08:28 pre-merge) with 6 findings: [P2]1 read-side settlement closure (`status === 'settled'` only vs publisher refusing on any settlement — fixed in follow-up #1323, MERGED 09:40:59Z), [P2]2 component placement per ADR-0007 (outstanding debt, acknowledged post-merge), [P3]3 5s uncapped re-resolution cadence, [P3]4 `getEventAddress` ride-along scope, [P3]5 no e2e for the win prompt, [P3 RISK]6 "auction unavailable ⇒ absent" deletes an announced win (the exact `:78` behavior). Plus Copilot: 4 inline at 9a4c4e36 (forged-settlement dismissal, FIFO head starvation, double-dismiss race, cancelled-after-await race, premature-resolved, scan amplification) and 13 inline mid-delta at 85361cd7/c76ab196 (incl. the `valid_bid_placed`-vs-quorum asymmetry and the fetchFn call-site defect), plus maxime-tt's 5.

My independent sweep of the delta's added lines found **nothing new that rises to BLOCK or RISK**:

- The "unavailable ⇒ absent" terminal marking (`monitor:78`) — raised ([P3 RISK]6 at this head).
- The `status:'settled'` narrowing (`winNotification.ts:141-150`) — raised ([P2]1 at this head; #1323).
- 500/200 caps and 30-day lookback, serial scan, NUT-7 per-5s cadence — raised (Copilot inline + [P3]3).
- The 2× TS2554 phantom arg — residue of the raised fetchFn call-site defect (Copilot, c76ab196); runtime-inert, no CI gate, persists on merged auctions.
- The 2× TS2345 in the new test file — type-level nits on `as const` fixtures; the tests run and pass (bun does not typecheck).
- Benign re-probes from the prior run, re-confirmed by me at the tip: query-key suffix (`'verified'|'unverified'` appended; **zero** `getQueryData(auctionKeys.*)` readers in `src/` — re-grepped, prefix-based invalidation still hits both variants); `fetchBidNut7States` extraction preserves the always-replace + unknown-on-mint-failure semantics (read the full diff); `latestLeg` hoist; per-root `continue` isolation is still missing at `:75` — the outer try/catch still swallows the whole scan on one root's throw, which is the already-raised scan-failure isolation class (Copilot c76ab196 `useAuctionWinMonitor.ts:75` "Isolate failures per root").

**Verdict on the draft's claim:** the closure claims are all real, and the new-in-delta observations are either already on the record or sub-advisory type-check nits the repo does not gate. "No new issues [beyond those already raised]" is accurate. The bare one-liner is ambiguous — read as "the merged head is clean" it would be false (#1323's [P2]1 documents a live read-side inconsistency at this exact head, and the P3/RISK items remain open) — but the **published** review body supplies the qualifier, so the review-of-record is not misleading.

## 4. (d) MERGED — confirmed

`gh pr view 1317 --repo PlebeianApp/market --json` → `state: MERGED`, `mergedAt: 2026-09-16T08:42:44Z`, `mergeCommit: 8c634c15…`, `reviewDecision: APPROVED`. Maintainer **Franchovy APPROVED at 2026-09-16T08:42:30Z** on `cfef7525e9` (review 5220459952) — matches the task's claim exactly. CI at the reviewed tip: e2e-grep, unit-integration, prettier, security-scan, footprint = success; e2e-full = skipped. Follow-up #1323 (the two P2 fixes) MERGED at 09:40:59Z onto `feat/1050-auction-winning-modal`.

## 5. Deviations / honesty notes

- The prior run of this card completed with the same verdict (comment 372) but its worktree artifact was reclaimed on completion; this run re-derived everything from the live API and repo bytes and re-shipped the report to a durable branch. Any claim above that I did not personally re-verify is marked; the prior run's CI summary was re-verified (check-runs list matches).
- tsc at the tip OOMs at default heap; ran with `NODE_OPTIONS=--max-old-space-size=6144` in worktrees at base/tip, same flags both sides.
- Full `test:unit` was NOT run in this run (the prior run reports 1105/1113 with 8 nip60DepositIdentity failures it attributed to its ad-hoc install; CI's unit-integration is green at this SHA — that CI result is the authoritative signal). I ran the delta's targeted suites (28 tests, all green).
- Per the fleet dedup rule, nothing was posted to GitHub from this run; the branch push is evidence-only. The market repo root was left untouched (contended by sibling lanes); all artifacts live under `artifacts/pr1317_coldreview/` on the pushed branch.