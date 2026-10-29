# PROGRESS — PR #1317 cold review of delta draft (cfef7525)

## Finding (updated as verified)
Draft under audit: "Reviewed tip cfef7525 — no new issues found. Approving."
Card: plebeian-pr-reviews t_e5bfd820 (prior run verdict APPROVED, comment 372; artifact
reclaimed with worktree — this run re-verifies and re-ships the report).
Draft is ALREADY PUBLISHED as issue comment 5700061320 (byte-identity check pending)
with paired felixfelix-bot APPROVED review 5224768310 that carries the qualified wording.
=> re-posting to GitHub is forbidden (dedup). Output = on-disk report + branch push.

## Status (milestones)
- [x] M1: Evidence gathered — live PR state, delta shape (19 commits/12 files/+1105/-164),
      maxime-tt 5 findings (comment 5679431492), findings-oracle review 5219729164 at
      cfef7525 (CHANGES REQUIRED, 6 items), Copilot mid-delta reviews, #1323 MERGED,
      prior-run card verdict comment 372. Committed.
- [ ] M2: Draft bytes vs published comment 5700061320 (dedup proof) + CI check-runs at cfef7525
- [ ] M3: (b) five findings addressed — mechanism-level verification at cfef7525
- [ ] M4: (a)+(c) independent added-lines sweep for new BLOCK/RISK vs raised baseline
- [ ] M5: REPORT.md written, committed, pushed to fork branch

## Files touched (worktree /tmp/wt1317cold, branch review/pr1317-cold-20261029)
- PROGRESS.md, REPORT.md, artifacts/pr1317_coldreview/raw/* (evidence copies)

## Verified findings (M2-M4)
- M2 dedup: draft bytes == published comment 5700061320 (diff empty, trailing \n only in both). Paired review
  5224768310 (APPROVED, 15:29:00Z) carries the QUALIFIED wording: "no new issues beyond those already raised
  in the existing review at this head (felixfelix-bot comment 5219729164)". CI at cfef7525: 6 check-runs
  (e2e-grep, unit-integration, prettier, security-scan, footprint = success; e2e-full = skipped).
- M3 (b): all 5 maxime-tt required findings addressed at tip — mechanisms verified in code (see REPORT).
  Tests reproduced: auctionWon.test.ts 16/0, pathReleases+verdicts 12/0 (bun, worktree at cfef7525).
- M4 (a)+(c): independent added-lines sweep. NEW vs base found: TS2554 x2 (publish/auctions.tsx:1604,1669
  phantom 6th arg `true` — runtime-inert; call-site defect already raised by Copilot at c76ab196; commit
  80507d32 fixed only the runtime half) and TS2345 x2 (readonly-array nits in new test file, :388-389).
  tsc: base=308 errors / tip=312 (repo-wide pre-existing debt, no CI typecheck gate). Everything else maps
  to the raised baseline (maxime 5, Copilot 17 inline, felixfelix-bot 6 at tip incl. #1323 P2s + RISK).
- M4 (d): MERGED 2026-09-16T08:42:44Z, mergeCommit 8c634c15, Franchovy APPROVED 08:42:30Z on cfef7525e9.

## Verdict
APPROVED (matches prior run comment 372; independently re-derived). Caveat: "no new issues" is true only under
the "beyond already-raised" reading, which the published review body carries; the bare one-liner is ambiguous.
