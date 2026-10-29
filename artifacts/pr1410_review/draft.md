# Review — PR #1410 `fix(deploy): include dependency patches in release packages`

**Reviewed head:** `bbe43a56598c8d0dd6adb1bfba75a3f55d6f1b9d` (merge-forward of reviewed hotfix `e989381b1388`; the diff between those two commits across all four changed files is empty — the hotfix diff is unchanged) · base `614ff3a0def0ebc260747a3c0b76f7e88c383c3b`

**Verdict: APPROVED — no change requests.**

## Why this is right

The package ships `package.json` with `patchedDependencies` (`rxjs@7.8.2` → `patches/rxjs@7.8.2.patch`, package.json:111, bun.lock:81) and every affected activation runs `bun install --production` server-side (deploy.yml:223, release.yml:250, deploy-auctionsdev.yml:188). Omitting `patches/` from the package makes that install fail — exactly the staging incident (`Couldn't find patch file: 'patches/rxjs@7.8.2.patch'`, run 37336956656 at `78c10f48bb`, confirmed in the failure log). The fix is one uniform `cp -r patches deploy-package/` line in each of the three workflows that lacked it (deploy-auctionsdev.yml:49, deploy.yml:56, release.yml:82); `preview-deploy.yml:118` already had it on base. No per-workflow special-casing, no bespoke logic. This is the minimal restoration of an invariant the base branch already believed it had.

The guard is the part that usually gets botched; here it doesn't. It discovers packaging workflows structurally (`mkdir -p deploy-package`), pins them non-vacuously to the four known files, and requires `package.json`, `bun.lock`, and `patches` among the staged sources (preview-deploy-workflow-guard.test.ts:279-296). It runs in CI (`test:unit` includes `src/lib/__tests__/*.test.ts`), so the next workflow edit that drops a dependency input fails a required check instead of a production deploy.

## First-party verification (at head `bbe43a56`)

- Guard suite: 32 pass / 0 fail / 97 assertions — matches the PR body claim exactly.
- Regression control: reverting the three `cp` lines reproduces the claimed 31 pass / 1 fail, the single failure naming exactly `deploy-auctionsdev.yml / deploy.yml / release.yml: no patches in deploy-package/`. The guard is not vacuous.
- Required checks at head: footprint, security-scan, prettier, unit-integration, e2e-grep — all green. `Deploy preview` green; e2e-full and Tear down are expected skips. (The one failed `Tear down preview` run at this head is from the preview event: the teardown job's "Prepare SSH key" step runs `bash infra/preview-vps/ssh-prepare.sh` with no checkout, so the script is absent from the workspace — exit 127. The script exists in the repo at base and head, so this is a pre-existing preview-lane defect, not this diff.)
- Scope discipline: exactly four files, +42/−1, as claimed. No NIP-46, dependency, or Bun-version changes smuggled in — the diff is three copy lines plus the guard.

## Staging acceptance is no longer pending

The PR body hedged that staging acceptance remained post-merge. It has since happened: Deploy to Staging at the merge commit `68b1b7b9d459` succeeded 2026-10-06T16:09Z — `bun install --production` ran, the patch error did not recur, and release activation completed. The incident is closed by deployment evidence, not by preview CI.

## Non-blocking notes

- [INFO] preview-deploy-workflow-guard.test.ts:87 — discovery filters `.endsWith('.yml')`; a future packaging workflow named `*.yaml` would escape both the discovery and the hard-coded pin. Zero `.yaml` files exist in `.github/workflows/` today, so this is latent hardening, not a defect.
- [INFO] The discovery predicate is the literal `mkdir -p deploy-package`; `deploy-relay.yml` stages `relay-package/` but ships no `package.json`/`bun.lock` (shell scripts, config, caddyfiles only), so it correctly stays out of the guard's scope.