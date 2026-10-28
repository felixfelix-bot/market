# PROGRESS.md — PR #1138 review (re-run at moved head)

## Finding
Head moved since scheduling: `50199dce` -> **`6be7496cc2089db2e2da04bb083312ae6d43a79d`** (312 commits).
Preflight already in worktree (`PREFLIGHT-1138.md`, `MANIFEST.md`) covered this head; reused, re-derived.
Review surface = `eacc4256..6be7496cc` (6 commits, 10 files, +166/-27). Own delta 387/+/79922/-1579 == API.

## Status
- [x] head re-verified via gh api -> 6be7496cc, draft, mergeable=dirty, 133 behind master
- [x] review inventory -> 0 reviews at 6be7496cc before this run; 0 inline comments (no thread to answer)
- [x] own-delta scale check == API byte-for-byte
- [x] unit baseline at head: 131 pass / 0 fail / 726 expects (7 touched suites, detached worktree)
- [x] mutation A (revert dashboard call site) -> STILL GREEN -> call-site fix unpinned by tests (reported)
- [x] mutation B (delete proofYs guard) -> 2/3 fail -> guard test bites
- [x] probe: guard misses `mint` -> TypeError at useNut7Polling.ts:30 -> NIT raised
- [x] re-verified prior findings at head: 4992989990 BLOCK1 FIXED; RISK2+RISK3 LIVE; 5328118447 RISK1+RISK2 LIVE
- [x] drafted review body, verified every cited file:line against the head
- [x] POSTED review 5690837398 @ 6be7496cc, state=COMMENTED, body_len=11863 (matches file)
- [x] worktree /home/c03rad0r/worktrees/pr1138-head removed
- [x] REPORT.md written; PREFLIGHT/MANIFEST untouched

## Files touched
- docs/pr1138-review/review-body.md  (posted body, byte-identical to GitHub's copy)
- REPORT.md   (replaced a tracked PR#1280 deliverable — prior content preserved at git 380347a1:REPORT.md)
- PROGRESS.md
