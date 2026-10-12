# PROGRESS — t_1888c870 (Verify PR #1280 round-4 findings closed and push new head)

Board: plebeian-my-prs. Repo: market. Worktree: /home/c03rad0r/repos/market (cwd; task's declared scratch ws
/home/c03rad0r/worktrees/t_78fa7b4b is EMPTY).

## Findings so far (chronological)

1. [PREMISE] PR #1280 is **MERGED**, not open. mergedAt 2026-09-24T23:56:08Z into base `auctions`,
   merge commit `ea7b4b12`, PR head at merge `2386aed3b75ad7db785e9dfcda65422a8642cef6`. `gh pr view`
   state=MERGED. => "push new head" has no open PR to push to.
2. [PREMISE] Local branch `feat/adr-0011-dleq-impl` HEAD = `a6e4967d`, unrelated to the merge:
   - `0fe6fc3a` (reviewed head) IS an ancestor of `a6e4967d`.
   - `a6e4967d` is NOT an ancestor of `2386aed3` (PR merge head).
   - `git for-each-ref --contains a6e4967d` => EMPTY. **The local fix commits were never pushed anywhere.**
3. [PREMISE] Local B-fix commits are dated 2026-10-01 (AFTER the 2026-09-24 merge):
   - `5e7546bc` B2 toRawEvent seam — 2026-10-01 16:35
   - `8e59f695` B3 dleq_required anchor — 2026-10-01 16:54
   - `a6e4967d` B1 derive authoritative price/leader/reserve — 2026-10-01 17:16
   - `d3b3f006`, `82b3c9f7` are docs(pr1306), unrelated to #1280.
4. [BLOCKER] All four parent fix tasks have EMPTY results and non-terminal status:
   - t_5931ea84 "Resolve B1" worker-heavy — status=ready, result=""
   - t_a348f4c1 "Resolve P1 code findings B2,B3,B4" worker-heavy — status=ready, result=""
   - t_84050f47 "Fix doc-vs-code contradictions D1 and D2" worker-base — status=ready, result=""
   - t_096a525b "Fix docs merge-order item" worker-base — status=todo, result=""
   => the deliverables this gate was meant to verify were never produced/recorded. gate is premature.
5. [WIP] Uncommitted working-tree change to `src/lib/auction/reserveGuard.ts` adds
   `resolveReserveNotMetPublish()` (B4 seller override) — present but NOT committed, NOT pushed.

## Verification results (recorded)

6. [BUILD] Toolchain: bun 1.4.2. NO typecheck/tsc script in package.json and NO tsc gate in PR CI
   (only release.yml / deploy*.yml mention tsc; ci-unit.yml, prettier.yml, e2e.yml do not).
   `git diff --check` exit 0.
7. [FORMAT] `bun run format:check` FAILS (11 files) but ONLY on untracked artifacts + my PROGRESS.md.
   Restricting to tracked files: 5 files, ALL in `artifacts/pr1306_dedup/` — added by the unrelated
   docs(pr1306) commits d3b3f006/82b3c9f7, NOT the ADR-0011 surface. ADR-0011 surface prettier-clean.
8. [TESTS] `bun run test:unit` at local head a6e4967d: 1277 pass / **13 FAIL** / 1290 tests, EXIT=1.
   Of the 13: 4 are `lockAuctionBidFunds ADR-0011 Blocker 2` (auctionBidLockDleq.test.ts) — the PR's
   OWN surface — plus 8 nip60DepositIdentity + 1 LiveChatPanel timeout.
   BUT: each failing file PASSES 4/4 and 8/8 when run standalone. `git diff 0fe6fc3a a6e4967d` over
   auctionBidLockDleq.test.ts and nip60.ts is EMPTY (identical to reviewed head). => full-suite
   module-mock pollution (documented in repo AGENTS.md "Never mock.module() the third-party package"),
   PRE-EXISTING at the reviewed/merged head, not caused by the local fix commits. Confirming by running
   the full suite at 0fe6fc3a in a scratch worktree.

## Per-finding status at local head a6e4967d
- B1 — FIXED in commit a6e4967d (validatedBidView.ts + route/seller-dashboard derivations). Local only, unpushed.
- B2 — FIXED in commit 5e7546bc (toRawEvent seam + rawEventSeamGuard.test.ts). Local only, unpushed.
- B3 — FIXED in commit 8e59f695 (immutability.ts + bidValidation.ts + ADR text). Local only, unpushed.
- B4 — NOT CLOSED. resolveReserveNotMetPublish() exists ONLY as an uncommitted working-tree edit to
  src/lib/auction/reserveGuard.ts. `git grep HEAD` finds no dlequEvidenceOverride/allowOverride in HEAD.
- D1 — NOT CLOSED. AUCTIONS.md:1448 still reads `DLEQ -->|ok / not yet checked| DOK[Client: bid fully
  valid<br/>settlement CTAs enabled]` — BYTE-IDENTICAL at 0fe6fc3a and a6e4967d.
- D2 — NOT CLOSED. AUCTIONS.md:1115 still states the lock path is DLEQ-only unconditionally —
  BYTE-IDENTICAL at 0fe6fc3a and a6e4967d.
- merge-order — NOT CLOSED. PR #1321 closed/unmerged; no evidence of a reopened PR or a re-sequenced
  docs commit-set. (verify at head)

## Status
- Step 1 (build/typecheck/lint/test) — DONE (above). No typecheck gate exists.
- Step 2 (per-finding evidence) — DONE for B1/B2/B3/B4/D1/D2 (above); merge-order pending
- Step 3 (headline falsification re-run) — pending
- Step 4 (D1/D2 doc-vs-code) — DONE: both still contradict
- Step 5 (push + PR comment) — BLOCKED (PR #1280 MERGED; branch never pushed; B4/D1/D2/merge-order parents incomplete)
