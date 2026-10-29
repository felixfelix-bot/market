# PR #1331 review report — live-head delta

Status: independent review complete; Gate 2.5 cold audit dispatched, not yet published.

## Scope and identities

- Repository: `PlebeianApp/market`.
- PR: #1331, `ci(workflows): run pull_request checks for every PR base, not just main/master`.
- Author/branch: `felixfelix-bot` / `pr/ci-pr-trigger-all-bases`.
- Task pin: `9020aa13db36f168678d27efe9d7dbf4e7a047c4` (historical).
- Reviewed live head: `5dfe8215940af671da280924b166205662562c4f`.
- Base: `master` at `d4757b409b58e0ecf7c43e53629dd464c32dfb4e`.
- Previous verdict from this lane: review 5374232612 at `ec9f3e32ba04ab21cec1f37f97996d2a7d87484a`.
- Current-head review 5646697681 is explicitly a worker verification, not a verdict, so it does not replace this review.
- Artifact worktree: `/home/c03rad0r/worktrees/pr1331-live-review`; branch `review/pr1331-live-20261029`.
- The dirty primary worktree was not modified.

## Delta analysis

`git ls-tree` confirms byte-identical PR-owned blobs at `ec9f3e32` and `5dfe8215`:

- `.github/workflows/ci-ndk-guard.yml`: `ed29a70926990c735b4a5a63b986062baa902de1`
- `.github/workflows/ci-unit.yml`: `0ff72aaefad67a5c1a82b3ce3d59d5179ad62b34`
- `.github/workflows/e2e.yml`: `fcaf5d66537485614579651a093bb61277cadfb2`
- `.github/workflows/prettier.yml`: `0f151958b46e7047537d30308fbda1d456b111ea`
- `src/lib/__tests__/pr-workflow-trigger-scope-guard.test.ts`: `4655e14f656644ab14f23e4749b1bee493dd6e0b`

The 19-file head-to-head delta consists of inherited `master` changes. The live PR diff against its own base is still five files, 227 insertions and four deletions. `master` is an ancestor of the head; the branch has five PR commits.

## Independent review findings

No new change requests.

The four workflows now have a bare `pull_request` trigger at `ci-ndk-guard.yml:18`, `ci-unit.yml:12`, `e2e.yml:9`, and `prettier.yml:9`. This removes the base-ref filter that prevented check suites for stacked PRs. Push filters, manual/scheduled triggers, and jobs remain unchanged. The workflow files are not changed to `pull_request_target`, and this PR adds no permissions or secret-handling changes. The staging `workflow_run` consumer remains gated to successful push runs on `master`.

The new guard's text-parser limitations were already disclosed in reviews 5331956802 and 5562785745. They are non-blocking, are not exercised by the current workflow files, and are deliberately not reposted as new findings. The repo-wide CI-cost/policy sign-off remains a maintainer decision; this review makes no merge-readiness or maintainer-approval claim.

## Commands and observed results

1. `git diff --check d4757b409b58...5dfe8215940a...`
   - Clean, exit 0.

2. PyYAML comparison of the four head workflows against base.
   - All parse successfully.
   - `pull_request` is `None` in all four.
   - Other trigger mappings and `jobs` compare equal to base.

3. `node evidence/pr1331-review/verify.mjs` (final archive-based harness).
   - Extracts the exact live head using `git archive`, not the artifact worktree.
   - GREEN: new guard plus `e2e-workflow-gate-membership`, `e2e-workflow-artifact-path`, and `preview-deploy-workflow-guard` = 50 pass / 0 fail / 131 expect().
   - RED: restore `branches: [main, master, 'auctions/**']` below `pull_request` in the scratch `e2e.yml`; guard = 11 pass / 2 fail / 21 expect(). Failures identify `e2e.yml` in the per-file assertion and directory sweep.
   - Harness exits 0 only for this expected GREEN/RED combination.

4. `node evidence/pr1331-review/check-format.mjs`.
   - Prettier 3.8.3 against exact-head tree and repo configuration: all five PR files clean, exit 0.

5. Live GitHub check-runs for `5dfe8215940a...`.
   - Eight total, all completed.
   - Success: `unit-integration`, `e2e-grep`, `prettier`, `security-scan`, `footprint`, `Deploy preview`.
   - Configuration-skipped: `e2e-full`, `Tear down preview`.
   - The `unit-integration` job's unit and integration steps both succeeded.
   - No local full unit/integration/e2e suite was run; focused local checks and existing live CI are the evidence here.

### Harness correction history

Two preliminary scratch-harness attempts were invalid and are not used as verdict evidence: one expected files absent from the artifact worktree; the next lacked sibling-test fixtures and omitted the repository Prettier configuration. Both were corrected by extracting the exact full head tree. Only final archive-based results above support the draft.

## Gate 2.5

- Profile preflight observed: `Active Hermes profile: worker-reviewer-glm`; `Model: tier/review-glm`.
- Concrete configured model id: `glm-5.3` (tier/review-glm fallback in `model_tiers.yaml`).
- Round 1 prompt: `evidence/pr1331-review/gate25-prompt-v1.md`.
- Read-only nested runner: `evidence/pr1331-review/run-gate25-v1.sh`.
- Verdict: pending at time of this checkpoint. No approval from Gate 2.5 is claimed yet.

## Remaining publication steps

1. Read and independently assess the Gate 2.5 verdict; revise/re-dispatch if needed.
2. Re-check the PR head immediately before posting.
3. Publish the audited text via `gh pr review 1331 --repo PlebeianApp/market --comment --body-file ...`.
4. Read back the review and record its id/URL.
5. Update manager `prs.1331.last_reviewed_sha` using backup + fresh JSON load + atomic `os.replace`, preserving concurrent writers.
6. Verify state and detector coverage; update this report and `PROGRESS.md`; commit and push the final artifacts.
