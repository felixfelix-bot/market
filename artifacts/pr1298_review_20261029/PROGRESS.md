# PROGRESS — Review PR #1298 (fresh review lane, 2026-10-29)

Task: Felix-style review of PlebeianApp/market#1298 at head
d205c158afe7a88a7b2d962e620bfc3b35889b20, cross-family gated, then publish.

Placement note: repo-root PROGRESS.md/REPORT.md are tracked and owned by a
concurrent lane (dirty MANIFEST.md + pr1306_dedup artifacts in the working
tree); this lane's deliverables live at artifacts/pr1298_review_20261029/.

## Milestones

- M1 Evidence — DONE. `gh pr view/diff 1298` fetched. Head live =
  d205c158…, state **MERGED** 2026-09-19, 9 files +965/−40, author plebomoto
  (external). Diff byte-read in full; head checkout at
  /home/c03rad0r/worktrees/pr1298-consistency (rev-parse = head).
  Files: artifacts/pr1298_review_20261029/(draft-review-comment.md,
  glm-verify-context.md).
- M2 prev_issues established (dedup base) — DONE. Live GitHub surface:
  review 5186090354 (felixfelix-bot, APPROVED, zero findings), review
  5190605402 (c03rad0r, APPROVED, praise), review 5653225909 (maxime-tt,
  6 items: 10s drain vs TimeoutStopSec=120; RLock-not-write-barrier;
  hardcoded 2<<30; hand-copied backend internals; index.go:69 readability
  nit; merge-message scope), comment 5718263024 (felixfelix-bot approval
  prep). NOTE: the task brief said "prev_issues: none — first review";
  that is factually wrong — four surfaces exist and are the dedup base.
- M3 Reproductions at head — DONE (run this session, go1.25.0, module cache
  warm, PROXY default). Four probes PASS:
  - TestGlmProbeOlderReplaceEvictsLiveSearchEntry → raw_has_newer=1
    search_finds_newer=0 (main.go:289 eviction ignores nostr.IsOlder).
  - TestScratchCloseDrainBlockedByStalledSubscriber + ...BlocksNewQueries →
    Close() wedges behind stalled subscriber (main.go:205 vs 218-224).
  - TestScratchStaleActivationAfterPostRebuildWrites → late event absent
    from search after activation, no error (index.go:69).
  - TestScratchFirstBootCrashWindowLeavesUnrecoverableEmptyIndexDir →
    marker-less dir wedges every restart (index.go:54-57).
- M4 Draft written (4 findings: 3 RISK + 1 NIT) — DONE.
  File: draft-review-comment.md.
- M5 Cross-family dispatch to worker-reviewer-glm — see below.
- M6 Publish — see below.
- M7 Contribution-PR card — see below.
