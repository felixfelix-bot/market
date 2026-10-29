# Cross-family verification context — PR #1298 review draft

## Your job
Cold-verify the draft review at
`/home/c03rad0r/repos/market/artifacts/pr1298_review_20261029/draft-review-comment.md`
for PlebeianApp/market PR #1298, head `d205c158afe7a88a7b2d962e620bfc3b35889b20`
(author plebomoto, external author, PR is MERGED at 2026-09-19).

Verdict must be exactly one of APPROVED or REJECTED, with per-finding
adjudication. For EVERY finding in the draft, check all three bars:

(a) REAL — names a concrete trigger and the resulting misbehavior, with
    file:line that is correct at the head SHA. You must verify the claimed
    source lines yourself in the head checkout (see below). Speculative
    "may cause" without a demonstrated fault = REJECT that finding.
(b) NOT ALREADY RAISED — compare against prev_issues below.
(c) NOT SPAM — no false positives on correct code, no distraction findings,
    no re-raising a prior item under a different name.

If any finding fails, say REJECTED and name the finding number plus the
concrete defect in the draft's claim (wrong line, wrong mechanism, duplicate).

## Ground truth
- Head checkout (detached, exact head SHA):
  `/home/c03rad0r/worktrees/pr1298-consistency` (module root
  `deploy-simple/relay`). Verify with `git -C <path> rev-parse HEAD`.
- Diff: `gh pr diff 1298 --repo PlebeianApp/market`
- Pinned deps: `fiatjaf.com/nostr v0.0.0-20260314085316-2cec1c943486` in
  `/home/c03rad0r/go/pkg/mod/fiatjaf.com/nostr@v0.0.0-20260314085316-2cec1c943486/`
  (`eventstore/bleve`, `eventstore/boltdb`, `khatru`).
- Reproductions already written and runnable at head (untracked scratch probes
  in the head worktree, package main):
  - `zzz_glm_probe_replace_older_test.go` → `TestGlmProbeOlderReplaceEvictsLiveSearchEntry`
  - `scratch_close_drain_probe_test.go` → `TestScratchCloseDrainBlockedByStalledSubscriber`, `TestScratchCloseDrainBlocksNewQueriesBehindIt`
  - `scratch_stale_activation_test.go` → `TestScratchStaleActivationAfterPostRebuildWrites`
  - `scratch_firstboot_crash_test.go` → `TestScratchFirstBootCrashWindowLeavesUnrecoverableEmptyIndexDir`
  Run e.g. `cd <head>/deploy-simple/relay && go test ./cmd/market-relay/ -run '<Name>' -count=1 -v`.
  You may run them, and you may write your OWN probe. Do not modify PR code.

## prev_issues (must not be re-raised)
Live GitHub state on PR #1298 at review time:
- felixfelix-bot APPROVED review 5186090354 — zero findings ("no new issues found").
- c03rad0r APPROVED review 5190605402 — praise only.
- maxime-tt review 5653225909 — six items:
  1. `TimeoutStopSec=120` in the unit vs `RELAY_SHUTDOWN_TIMEOUT_MS` default
     10000 ms — effective drain window is 10 s; document or raise it.
  2. `RLock` makes the mutex a shutdown barrier, not a write barrier (writer
     serialisation not guaranteed).
  3. `searchindex.Rebuild(..., 2<<30)` hardcoded 2 GiB reserve vs configurable
     `RELAY_MIN_FREE_BYTES`.
  4. `document()` field names/types and the `rawEventStore` bucket name are
     hand-copied backend internals; should fail loudly on a dependency bump.
  5. `Prepare`'s existing-directory branch at `index.go:69`
     (`if _, err := os.Lstat(path); !errors.Is(err, os.ErrNotExist) { return err }`)
     is a READABILITY nit — "it behaves correctly".
  6. Merge-commit message scope reminder.
- felixfelix-bot comment 5718263024 — "approved from our side".

Draft finding 3 touches the same `index.go:69` line as prev item 5. Judge
whether the draft's claim (missing raw-store parity check → stale activation
silently drops events from search) is a genuinely different root cause from
prev item 5's readability nit, and say so explicitly.

## Out of scope for your verdict
Do not judge style, length or tone beyond "is it spam". Do not require the
review to be exhaustive. Do not re-raise prev_issues. Do not post anything to
GitHub — you are read-only here.
