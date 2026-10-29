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
- M5 Cross-family gate (GATE 2.5) — DONE. Dispatched to pinned profile
  `worker-reviewer-glm` (state.db session 20261029_011741_e07a2e, model
  tier/review-glm @ zai — pin verified against REVIEWER-POOL-RUNBOOK D-115).
  **VERDICT: APPROVED** — all four findings KEEP (1-4), dedup check on
  finding 3 vs maxime-tt item 5 explicitly cleared (functional data-loss gap
  vs readability nit, acknowledged in the draft text). Raw verdict:
  raw-glm-verdict.txt. First dispatch attempt stalled on context-gathering and
  was killed at 600 s; re-dispatched with a bounded step list, completed.
- M6 Publish — DONE. Comment posted:
  https://github.com/PlebeianApp/market/pull/1298#issuecomment-6484411325
  (13 lines, 3116 chars, verified by re-read of the posted body). No approval,
  no merge, no request-changes — comment only (PR already merged).
- M7 Contribution card — see REPORT.md.
- M7 Contribution card — DONE. `t_71b080a0` on board `plebeian`, assignee
  worker-pr-fixer, status ready, idempotency key
  contrib-1298-store-integrity-20261029. Dedup clear: no 1298 fix card on
  plebeian/default/admin; no contrib-1298-* branch on felixfelix-bot/market;
  no such PR on PlebeianApp/market; origin/master d4757b40 lacks the IsOlder
  fix. (plebomoto/market API → 404; noted as a caveat.)
- M8 REPORT.md written — DONE. Full report: REPORT.md (this directory).
