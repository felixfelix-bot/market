
# PR #1410 Draft Review Audit — Incremental Findings
Auditor: cold-audit subagent (read-only; no GitHub writes, no commits)
Draft under audit: /home/c03rad0r/repos/market/artifacts/pr1410_review/draft.md
PR: PlebeianApp/market #1410, head bbe43a56598c8d0dd6adb1bfba75a3f55d6f1b9d, base 614ff3a0def0ebc260747a3c0b76f7e88c383c3b

## Step 1 — Draft read + workspace setup
- Draft read in full (26 lines): Verdict APPROVED; sections: why-right, first-party verification, staging acceptance, 2 INFO notes.
- /tmp/pr1410_audit created. Worktree /tmp/wt1410 confirmed present (treated read-only).

## Step 2 — Claim (b): diff e989381b1388..bbe43a56 across the 4 changed files is EMPTY
- Cmd: git -C /home/c03rad0r/repos/market diff e989381b1388 bbe43a56598c8d0dd6adb1bfba75a3f55d6f1b9d -- .github/workflows/deploy.yml .github/workflows/deploy-auctionsdev.yml .github/workflows/release.yml src/lib/__tests__/preview-deploy-workflow-guard.test.ts | wc -l
- Output: 0
- VERDICT: CONFIRMED. Merge-forward commit changed nothing in the hotfix diff.

## Step 3 — Claim: scope discipline "exactly four files, +42/-1"
- Cmd: git -C /home/c03rad0r/repos/market diff 614ff3a0 bbe43a56 --stat
- Output: deploy-auctionsdev.yml +1, deploy.yml +1, release.yml +1, preview-deploy-workflow-guard.test.ts +40/-1 => "4 files changed, 42 insertions(+), 1 deletion(-)"
- VERDICT: CONFIRMED.

## Step 4 — Claim (c): preview-deploy.yml had `cp -r patches deploy-package/` on BASE at :118
- Cmd: git -C /home/c03rad0r/repos/market show 614ff3a0def0ebc260747a3c0b76f7e88c383c3b:.github/workflows/preview-deploy.yml | grep -n patches
- Output: `118:          cp -r patches deploy-package/`
- VERDICT: CONFIRMED (line number on base matches draft's preview-deploy.yml:118 exactly).

## Step 5 — Claim (a) part 1: file:line citations resolve in head tree (/tmp/wt1410)
- bun.lock:81 -> `"rxjs@7.8.2": "patches/rxjs@7.8.2.patch",` CONFIRMED
- deploy.yml:223 -> `bun install --production` CONFIRMED
- release.yml:250 -> `bun install --production` CONFIRMED
- deploy-auctionsdev.yml:188 -> `bun install --production` CONFIRMED
- deploy-auctionsdev.yml:49 -> `cp -r patches deploy-package/` CONFIRMED
- deploy.yml:56 -> `cp -r patches deploy-package/` CONFIRMED
- release.yml:82 -> `cp -r patches deploy-package/` CONFIRMED
- preview-deploy.yml:118 -> `cp -r patches deploy-package/` CONFIRMED
- package.json:111 -> `"patchedDependencies": {` (rxjs entry itself on following lines — checked in Step 6)

## Step 6 — Claim: package.json patchedDependencies at :111 (rxjs -> patches/rxjs@7.8.2.patch)
- Cmd: awk 'NR>=111 && NR<=113' /tmp/wt1410/package.json
- Output: `"patchedDependencies": {` / `"rxjs@7.8.2": "patches/rxjs@7.8.2.patch"` / `}`
- VERDICT: CONFIRMED.

## Step 7 — Claim: test:unit includes src/lib/__tests__/*.test.ts (guard runs in CI)
- Cmd: grep -n '"test:unit"' /tmp/wt1410/package.json -> line 32: `test:unit": "bun test --isolate $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...`
- VERDICT: CONFIRMED (src/lib/__tests__ covered by the find expression).

## Step8 — Guard-test file citations in head tree
- preview-deploy-workflow-guard.test.ts:87 -> `.filter((file) => file.endsWith('.yml'))` CONFIRMED (endsWith('.yml') INFO note accurate)
- requiredSources at :290 -> `const requiredSources = ['package.json', 'bun.lock', 'patches']` CONFIRMED (within the new test block 279-296)
- New test at :279 -> `test('every partial deploy package stages its Bun dependency inputs', () => {` CONFIRMED; block ends ~:296 with `})` after expect(missing).toEqual([]) at :295
- test count via grep -cE '^[[:space:]]*(test|it)\(': 32 top-level test declarations (execution may differ; see Step 11 for the authoritative bun run)
- Literal `expect(` occurrences in source: 89 (bun's "97 assertions" counts executions incl. loop iterations — verifying empirically in Step 11)

## Step 9 — Claim: zero .yaml files in .github/workflows/ today (INFO note 1)
- Cmd: ls /tmp/wt1410/.github/workflows/ -> ci-ndk-guard.yml, ci-unit.yml, deploy-auctionsdev.yml, deploy-relay.yml, deploy.yml, e2e.yml, prettier.yml, preview-deploy.yml, preview-infra-tests.yml, promote-production.yml, release.yml — all .yml
- VERDICT: CONFIRMED (latent-hardening note accurate; also means discovery misses preview-infra-tests.yml? no — that file is .yml so it IS discovered; it just doesn't match the `mkdir -p deploy-package` predicate).

## Step 10 — Claim: deploy-relay.yml stages relay-package/, no package.json/bun.lock (INFO note 2)
- Cmd: grep -n 'relay-package|package\.json|bun\.lock|mkdir' deploy-relay.yml -> mkdir -p relay-package at :58, copies shell scripts/config/caddyfiles/systemd only; no package.json or bun.lock staged.
- VERDICT: CONFIRMED — deploy-relay.yml correctly out of guard scope (no `mkdir -p deploy-package`, so not a packaging workflow).

## Step 11 — Incident claim (6)/(d): run 37336956656 failed at 78c10f48bb with exact patch error
- Cmd: gh run view 37336956656 --repo PlebeianApp/market --json headSha,conclusion,workflowName
- Output: conclusion=failure, headSha=78c10f48bb674bd979955986b8c6c0cd9520b23b, workflowName="Deploy to Staging", 2026-10-05T15:57Z
- gh run view 37336956656 --log-failed | grep patch -> `err: error: Couldn't find patch file: 'patches/rxjs@7.8.2.patch'`
- VERDICT: CONFIRMED — error string matches draft exactly; draft's `78c10f48bb` is a valid prefix of the actual headSha.

## Step 12 — Check-runs at head (f) / claim (8)
- Cmd: gh api 'repos/PlebeianApp/market/commits/bbe43a56.../check-runs?per_page=100'
- Output: footprint success (x2), security-scan success, prettier success, unit-integration success, e2e-grep success, e2e-full SKIPPED (2026-10-06T14:07Z), Deploy preview success (one) + skipped (one), Tear down preview: one skipped + one FAILURE started 2026-10-06T16:00:07Z (preview event, later than the 14:07 CI batch).
- Draft's claim "footprint, security-scan, prettier, unit-integration, e2e-grep — all green; e2e-full and Tear down expected skips" -> CONFIRMED for the required-check batch at 14:07Z; the failed Tear-down-preview is the separate preview-lane run, as the draft parenthetically notes. Verifying exit 127 in Step 14.

## Step 13 — Claim (7)/(e): post-merge staging success at merge commit 68b1b7b9d4, 2026-10-06T16:09Z
- Cmd: gh run list --workflow 'Deploy to Staging' --repo PlebeianApp/market --created '2026-10-06..2026-10-08' --json ...
- Output: run 37493417057, headSha=68b1b7b9d459788613cd820d68792d52f3efa48c, conclusion=SUCCESS, createdAt=2026-10-06T16:09:09Z, event=workflow_run.
- VERDICT: CONFIRMED — draft's `68b1b7b9d459` is a valid prefix; timestamp matches (16:09Z).

## Step 14 — Claim (8) detail: Tear down preview failure = exit 127, preview-lane noise, not this diff
- Cmd: gh run view 37492175564 --repo PlebeianApp/market --log-failed
- Output: `bash: infra/preview-vps/ssh-prepare.sh: No such file or directory` then `##[error]Process completed with exit code 127.` — failing step is #4 "Prepare SSH key + pinned host key"; steps 1-3 succeeded.
- exit code 127 CONFIRMED; preview-lane (Preview Deploy workflow, PR-close event) CONFIRMED; unrelated to this diff (diff touches only 3 deploy packaging lines + test) — pending confirmation the missing script/checkout is pre-existing on base, see Step 16.
- CORRECTION CANDIDATE: draft says "exit 127 during runner provisioning". The failure is NOT during runner provisioning — the runner provisioned fine; the "Prepare SSH key + pinned host key" step failed because `infra/preview-vps/ssh-prepare.sh` was not found in the workspace (the teardown job appears to have no checkout step). Substantive conclusion (infra noise, not this diff) still holds if the same failure is systemic; verifying.

## Gate 2.5 verdict — synthesized by worker-reviewer-glm after auditor 503 (transcript steps 1-14 above are the auditor's own writes; steps 15+ below are the parent's first-hand completion)

The cold-audit delegate's final LLM call died on HTTP 503 (all providers exhausted) at Step 14, exit_reason=max_iterations. Per the incremental-file protocol, its findings survive above. Steps 15-17 below were completed by the parent (worker-reviewer-glm), each command run first-hand:

## Step 15 — Guard suite at head (claim g): 32 pass / 0 fail / 97 expect()
- Cmd: cd /tmp/wt1410 && NODE_OPTIONS=--max-old-space-size=6144 bun test src/lib/__tests__/preview-deploy-workflow-guard.test.ts
- Output: `32 pass / 0 fail / 97 expect() calls`
- VERDICT: CONFIRMED (independently reproduced by parent at 09:29Z).

## Step 16 — Step-14 residual: is the missing ssh-prepare.sh pre-existing on base?
- Cmd: git cat-file -e 614ff3a0:infra/preview-vps/ssh-prepare.sh -> rc 0 (script EXISTS at base; also present at head tree /tmp/wt1410/infra/preview-vps/ssh-prepare.sh)
- The teardown job (preview-deploy.yml:605+) has no checkout step, so the script is always absent from its workspace — systemic preview-lane defect, pre-existing, unrelated to this diff.
- VERDICT: the auditor's CORRECTION CANDIDATE holds; the draft's "runner provisioning" phrasing was wrong and has been amended in draft.md. Substantive conclusion (infra noise, not this diff) unchanged.

## Step 17 — Missed-defect sweep (claim h)
- Full diff re-read: 4 files, +42/-1 — three one-line `cp -r patches deploy-package/` additions (byte-identical to the pre-existing preview-deploy.yml:118 line) plus the guard test. No hidden hunks, no drive-by changes, no secret-bearing lines, no special cases introduced.

AUDIT_VERDICT: APPROVE_DRAFT_W_AMENDMENTS — all 20 factual claims in the draft CONFIRMED (audit steps 1-14 + parent steps 15-17); one wording correction (teardown failure is a missing-checkout/missing-script defect, not "runner provisioning") applied to draft.md before posting. No blocking defects found in the PR or the draft. The two INFO items in the draft are accurate as stated.
