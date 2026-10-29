# DRAFT VERDICT (under Gate 2.5 cold audit) — PR #1200, head 6b8aeb6ea1b4

Reviewer: worker-reviewer-glm (tier/review-glm, glm-5.3). Method: linus-review (correctness-first, blunt, never person-directed). Date: 2026-10-29.

## Decision: NO-OP DEDUP CLOSE — zero GitHub writes

The fleet rule (memory): a felixfelix-bot review/comment at a PR's live head IS the review-of-record — dedup, never re-post.

Live state (re-verified 2026-10-29, raw/pr_meta.json):

- PR #1200 state=OPEN, headRefOid=6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93, unchanged since 2026-07-30, reviewDecision=CHANGES_REQUESTED, author=maximotodev.
- felixfelix-bot CHANGES_REQUESTED review id 4981547214 (2026-08-20T10:13:10Z), commit_id == live head. Its body carries 8 items: BLOCK (observe() untested/un-testable, raised by maxime-tt Aug 4, still unaddressed), RISK (workflow public-endpoint sleep 5; no upper bound on RELAY_READINESS_SECONDS; observe() uses bash SECONDS), NITs (check_journal_window -n 1000 tail; stale elapsed in timeout path; no shellcheck CI; grep-based test wiring).
- felixfelix-bot consolidated issue comment id 5354414353 (2026-08-20T10:04:27Z) — same 8 items, same head, supersedes the earlier felixfelix-bot APPROVED review 4851923082 (2026-08-04) which is now stale (pre-dates maxime-tt's 8-item COMMENTED review 4852408282 and Franchovy's CHANGES_REQUESTED 4852771391, both 2026-08-04).
- felixfelix-bot issue comment 5604800185 (2026-09-09): fixes offered as contribution PR maximotodev/market#10 — never merged; head unchanged, all 8 items still open.

Posting a new review would duplicate the review-of-record. The honest action: dedup, record last_reviewed_sha in gate state, close the card.

## Independent re-verification at head (isolated worktree /tmp/wt1200, 2026-10-29)

- bash -n on installer and test file: clean.
- Test suite: bash deploy-simple/relay/tests/install-staging-relay-readiness.test.sh → 33/33 ok, rc=0 (raw/test_run_head.log).
- shellcheck installer: 15 SC2015 (info) only, nothing higher (raw/shellcheck_head.txt).
- Carried items confirmed still present at head:
  - observe() uses bash SECONDS + bare sleep, not readiness_now/readiness seams: install-staging-relay.sh:629, :631, :651.
  - Workflow fixed sleeps: deploy-relay.yml:152 (staging verify) and :219 (production verify).
  - validate_config (install-staging-relay.sh:53-58) checks RELAY_READINESS_SECONDS > 0 only — no upper bound.
- CI at head: 5 success + 1 skipped (e2e-full); prettier/unit-integration/security-scan/footprint/e2e-pricing green.

## My own new sweep (linus method) — candidates the prior reviews did NOT raise

1. [INFO] The new test suite is not wired into any PR-branch CI. deploy-relay.yml (the only workflow referencing it, line 55) triggers on push to master + workflow_dispatch — no pull_request trigger. ci-unit.yml (which does run on pull_request) does not reference the relay tests. Consequence: the readiness tests only execute after merge (master push) or manual dispatch; on the PR itself they never run. Not a defect in the PR's code, but the PR's headline (a tested readiness gate) is unverified by CI until it hits master. Pre-existing workflow trigger shape; the PR added the step to a workflow that was already master-push-only.

2. [INFO] Exit 75 vs 70 distinction is invisible to the workflow caller. install-staging-relay.sh:27 defines READINESS_TIMEOUT_STATUS=75 and on_exit (:411-452) carefully preserves it, but the deploy-relay.yml step that invokes the installer (line 146: `"$deploy_dir/install-staging-relay.sh" "$deploy_dir"`) has no id, no continue-on-error, no output capture — any non-zero exit fails the step identically. (felixfelix-bot's Aug-20 review-of-record did NOT raise this; my earlier lane draft did, but it was never posted. Recording here as an artifact note only — it does not change the verdict.)

Both are INFO-grade: neither is a correctness defect in the PR's own diff; both belong in a follow-up, not a re-review.

## Why CHANGES_REQUESTED (the review-of-record's verdict) is still correct

The head has not moved since Jul 30. The BLOCK item (observe() untested/un-testable despite testability being the PR's headline) and both RISK items remain unfixed in the code at head. reviewDecision=CHANGES_REQUESTED reflects this. A fresh re-post would add zero information and duplicate the lane.

## Gate state action

Record prs["1200"].last_reviewed_sha = 6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93 in ~/.hermes/profiles/manager/state/plebeian-pr-review-state.json (with .bak first), so the detector stops re-creating card t_3b93223b.

## Gate 2.5 disclosure

Assigned cold auditor worker-reviewer-ds does not exist on this node (only worker-reviewer-glm/-kimi/-qwen). Discharged as an independent fresh-context delegate audit — same family as the drafter (disclosed, no cross-family token claimed).
