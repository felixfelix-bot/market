# REPORT — PR #1200 review (`ci(relay): add bounded staging readiness gate`)

Card: plebeian-pr-reviews:t_3b93223b (worker-reviewer-glm, tier/review-glm, glm-5.3)
PR: PlebeianApp/market #1200, author maximotodev, head `6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93`
Date: 2026-10-29. Method: linus-review. Verdict shape: NO-OP dedup close.

## Decision

**NO-OP DEDUP — ZERO GitHub writes.** The fleet's review-of-record already sits at the live head: felixfelix-bot CHANGES_REQUESTED review id 4981547214 (2026-08-20, commit_id == head `6b8aeb6e`) plus felixfelix-bot consolidated issue comment id 5354414353 (2026-08-20, same head). Per the fleet rule, a felixfelix-bot review at a PR's live head IS the review-of-record — dedup, never re-post. The PR head has not moved since 2026-07-30 (commit authored 2026-07-30T23:15:38+02:00); reviewDecision=CHANGES_REQUESTED already reflects the open items; a fresh post would add nothing and duplicate the lane.

The `gh pr review` step of the task is therefore discharged by the existing review-of-record (id 4981547214 cites the head SHA in its commit_id; the review body opens "Reviewed commit `6b8aeb6e`"), not by a new post. No APPROVED statement is required because there ARE change requests — they are already on the record at this head.

## Live state re-verified (2026-10-29)

- `gh pr view 1200 --json` → state=OPEN, headRefOid=6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93, reviewDecision=CHANGES_REQUESTED, mergedAt=null, closedAt=null (raw/pr_meta.json).
- Reviews on the PR (5, all at commit 6b8aeb6ea1b4): felixfelix-bot APPROVED 4851923082 (Aug 4, superseded); maxime-tt COMMENTED 4852408282 (Aug 4, 8 items); Franchovy CHANGES_REQUESTED 4852771391 (Aug 4, body "See comment", zero live inline comments); felixfelix-bot COMMENTED 4936204000 (Aug 14); **felixfelix-bot CHANGES_REQUESTED 4981547214 (Aug 20) — review-of-record**.
- Issue comments: felixfelix-bot 5354414353 (Aug 20, 8 consolidated items) and 5604800185 (Sep 9, fixes offered via contribution PR maximotodev/market#10 — live check: still OPEN, never merged, so the head never absorbed the fixes).
- CI at head: 5 success + 1 skipped (prettier, unit-integration, security-scan, footprint, e2e-pricing green; e2e-full skipped).

## What the review-of-record carries (12 distinct open items at head)

Review 4981547214 body (4 new items):

1. [RISK] Workflow doesn't distinguish exit code 75 (readiness timeout, process up, operator review) from 70 (structural failure) — the installer invocation in deploy-relay.yml has no `id:`/output capture/conditional; any non-zero exit fails the step identically.
2. [NIT] `check_growth` error messages lack the context prefix that `check_runtime_sample`'s direct errors carry (can't tell which phase a growth failure came from).
3. [NIT] `validate_payload()` extracted for testability but has zero test coverage (missing binary, symlinked artifact, mismatched unit all untested).
4. [NIT] `rollback()` performs `du`/`df` I/O (install-staging-relay.sh:333-335) while the service is stopped — outage clock ticking during measurement.

Issue comment 5354414353 (8 consolidated items):

1. [BLOCK] `observe()` remains untested and un-testable — uses bash `SECONDS` + bare `sleep "$SAMPLE_SECONDS"`, not the `readiness_now`/`readiness_sleep` seams the PR itself introduces; zero `observe_case` among the 33 tests. Testability is the PR's headline, so its refactored steady-state function being outside the harness is the main gap.
2. [RISK] Workflow public-endpoint `sleep 5` (deploy-relay.yml:152 staging / :219 production) — the fixed-sleep assumption the PR argues against, left half-applied in the same workflow.
3. [RISK] No upper bound on `RELAY_READINESS_SECONDS` — validate_config (install-staging-relay.sh:53-58) checks `> 0` only; a typo like 60000 blocks the activation gate until the job timeout.
4. [RISK] `observe()` on bash `SECONDS` (global mutable) while `wait_for_readiness` uses `readiness_now` — two time bases in one script.
5. [NIT] `check_journal_window` `-n 1000` tail (install-staging-relay.sh:583/:589) — chatty relay can push restart/OOM evidence past the tail ⇒ false "clean".
6. [NIT] Stale `elapsed` in the timeout path (install-staging-relay.sh:572) — uses last in-loop `now`, understates the diagnostic.
7. [NIT] No shellcheck CI step (zero `shellcheck` references in .github/workflows/).
8. [NIT] `test_readiness_wiring` is grep/line-number based, not behavioral.

Plus Franchovy's CHANGES_REQUESTED 4852771391 (body "See comment"; no live inline comments to enumerate).

All 12 items verified still present in the code at head this run (see Verification below). The CHANGES_REQUESTED stance remains correct: the BLOCK item is the PR's own headline deliverable left half-done, and both RISK classes (workflow sleep, unbounded config, SECONDS) are unfixed.

## First-party verification at head (isolated worktree /tmp/wt1200)

- `bash -n` on installer and test file: clean.
- `bash deploy-simple/relay/tests/install-staging-relay-readiness.test.sh` → 33/33 ok, rc=0 (raw/test_run_head.log).
- `shellcheck deploy-simple/relay/install-staging-relay.sh` → 15× SC2015 (info-level) only, nothing higher (raw/shellcheck_head.txt).
- Carried items confirmed at head: observe() `deadline=$((SECONDS + OBSERVE_SECONDS))` :629, bare `sleep "$SAMPLE_SECONDS"` :631/:651; `sleep 5` at deploy-relay.yml:152/:219; validate_config :53-58 no upper bound; `-n 1000` :583/:589; stale elapsed :572; zero shellcheck refs in .github/workflows/; zero `observe_case` in the test file.
- Diff scope: 3 files, +622/−83 (deploy-relay.yml +3, install-staging-relay.sh +281/−83, new test file +338).
- The two fixed `sleep 5` calls in the script itself (activation main-flow and rollback, base :544/:306) are correctly gone — replaced by `wait_for_readiness`. The workflow-side `sleep 5`s are outside the script's reach, which is exactly carried item 2.

## My own new sweep (linus method) — after cold-audit correction

1. [INFO] The new readiness test suite is not wired into any pull_request-triggered workflow. deploy-relay.yml (the only workflow referencing it, line 55) triggers on push to master (paths-filtered) + workflow_dispatch — no pull_request trigger. ci-unit.yml runs on pull_request but never references the relay tests. Consequence: the 33 tests only execute after merge (master push) or manual dispatch; on the PR itself they never run. Novel (not in any prior review; cold-audit CONFIRMED as genuinely new). INFO-grade: the trigger shape is pre-existing, and wiring it into PR CI is a follow-up decision, not a defect in this diff.
2. The exit-75/70 workflow-invisibility point I initially drafted as "new" is NOT new — it is review-of-record 4981547214's own RISK #1 (and comment 5604800185 lists it among the items the contribution PR fixes). Recorded as already-covered; its RISK grade in the review-of-record stands. Dropped from my new-items list.

Both live in this report only — deliberately NOT posted to the PR, per the dedup rule. If the lane later posts a fresh review at a NEW head, item 1 is worth including then.

## Gate 2.5 cold audit (disclosed same-family)

The card's named gate-2 profile `worker-reviewer-ds` does not exist on this node (only worker-reviewer-glm/-kimi/-qwen). Discharged as an independent fresh-context delegate audit of the draft verdict — same family as the drafter, disclosed, no cross-family token claimed.

Verdict: **CONFIRMED_W_AMENDMENTS** (artifacts/pr1200_review/audit-1200.md). Three amendments, all applied before the gate-state write and to this report:

1. The 8-item enumeration lives in issue comment 5354414353, not review 4981547214's body; the review body carries 4 different items — 12 distinct open items total, not 8.
2. My "new" exit-75 observation was a false novelty claim — it duplicates the review-of-record's RISK #1; dropped/re-labeled.
3. Evidence hygiene: draft cited raw/pr_meta.json before the file was copied into the repo's raw/ dir (now present, byte-copied from the live API pull).

The auditor also independently confirmed: live head/decision, all 5 review ids + timestamps, byte-identical review body (diff vs live API), 33/33 tests, head authored 2026-07-30, all 8 carried items at exact cited lines, CI check-runs at head, contribution PR #10 still OPEN/unmerged, and the NO-OP dedup decision itself.

## Actions taken

1. Recovered full review history (raw/review*\*.md, raw/issuecomment*\*.md) — byte-verified against the live API.
2. Re-verified live PR state, head SHA, review decision, CI at head.
3. Verified the head in an isolated worktree: syntax, tests, shellcheck, carried-item line cites.
4. Ran my own linus-method sweep for genuinely new issues; cold-audited the draft (CONFIRMED_W_AMENDMENTS, applied).
5. Recorded `prs["1200"].last_reviewed_sha = 6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93` in `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` (backup `.bak-pr1200-noop-20261029` first, atomic os.replace) via artifacts/pr1200_review/update_gate_state.py — the detector should stop re-creating card t_3b93223b.
6. Zero writes to PlebeianApp/market: no review, no comment, no status. The review-of-record (4981547214) already cites the head SHA and carries the CHANGES_REQUESTED verdict.
7. Artifacts committed and pushed to fork branch `review/pr1200-noop-20261029`.

## Files

- artifacts/pr1200_review/PROGRESS.md — finding → status → files table
- artifacts/pr1200_review/REPORT.md — this file
- artifacts/pr1200_review/draft-verdict.md — the audited draft (amendments listed in audit-1200.md; superseded text left as-is for the audit trail)
- artifacts/pr1200_review/audit-1200.md — cold-audit verdict (CONFIRMED_W_AMENDMENTS)
- artifacts/pr1200_review/update_gate_state.py — gate-state writer (run; backup + atomic write)
- artifacts/pr1200_review/raw/ — review bodies + metadata (byte-verified vs live API), test run log, shellcheck log, issue comments, pr metadata
