# REPORT — Review of PR #1410 (PlebeianApp/market) — worker-reviewer-glm

**Task:** Review PR #1410 `fix(deploy): include dependency patches in release packages` (author maximotodev, branch fix/deploy-include-dependency-patches).
**Pinned SHA at dispatch:** `e989381b1388ceeabbe0d5abfc64be4926a71c18`. **Live head:** `bbe43a56598c8d0dd6adb1bfba75a3f55d6f1b9d` (merge-forward refresh; `e989381b` IS an ancestor — verified — and `git diff e989381b..bbe43a56` across all four changed files is EMPTY, so the hotfix diff is unchanged). Base: `614ff3a0def0ebc260747a3c0b76f7e88c383c3b`. Card: plebeian-pr-reviews `t_29774673`.
**Verdict: APPROVED — no change requests.** Published as felixfelix-bot PR review on the live head (body cites head SHA and states APPROVED).

## 1. Live-state re-derivation (never trust card premises)

- PR state: **MERGED** 2026-10-06T15:59:59Z via merge commit `68b1b7b9d459788613cd820d68792d52f3efa48c` (true merge — head IS ancestor of master, and master carries all three `cp -r patches` lines today).
- Prior reviews at head: plebibot COMMENTED `5430024165` (2026-10-06T14:35Z, "no blocking findings", submitted as COMMENT — a bot submission is not maintainer approval) and maintainer Franchovy APPROVED `5430373074` (15:00Z). **No felixfelix-bot review at this head** → this dispatch is a real review, not a dedup NO-OP. One issue comment (`6018095285`, github-actions preview notice).
- Required checks at head (check-runs, paginated): footprint, security-scan, prettier, unit-integration, e2e-grep, Deploy preview — all success; e2e-full, Tear down preview (PR event), Deploy preview (PR event) — skipped. The one failed `Tear down preview` is in the *preview* event run 37492175564: exit 127 during runner provisioning — preview-lane infra noise, unrelated to this diff.
- Incident premise: Deploy to Staging run 37336956656 failed with the exact error `err: error: Couldn't find patch file: 'patches/rxjs@7.8.2.patch'` at `78c10f48bb` (pre-fix base). Pre-merge failures also at `614ff3a0de` (base) and `09b420e0ed` (15:09Z, same-day, same incident window).

## 2. Correctness analysis (what the fix does and whether it is right)

The defect: release packages shipped `package.json` declaring `patchedDependencies` (`rxjs@7.8.2` → `patches/rxjs@7.8.2.patch`, package.json:111; bun.lock:81) but the `patches/` directory itself. Every affected activation path then runs `bun install --production` on the target host (deploy.yml:223 staging, release.yml:250 production, deploy-auctionsdev.yml:188 auctionsdev), which resolves `patchedDependencies`, needs the patch file, and dies. One uniform line fixes all three: `cp -r patches deploy-package/` (deploy-auctionsdev.yml:49, deploy.yml:56, release.yml:82). `preview-deploy.yml:118` already had it on base (verified: base grep = 1 hit in preview-deploy, 0 in the three fixed files).

No special cases, no per-workflow bespoke logic, exactly the minimal restoration of an invariant the base branch believed it had. The right fix for the right bug.

The guard (ported packaging-regression portion of #1371) is the part that is usually botched, and it isn't here:
- Discovery is structural: any workflow containing `mkdir -p deploy-package` (guard test :92-94).
- Non-vacuity: the four discovered workflows are pinned by name in the test (:281-288), so a workflow renaming itself out of discovery fails the pin.
- The required-sources set is `['package.json', 'bun.lock', 'patches']` (:290) — the exact three Bun dependency inputs — enforced per discovered workflow with a named failure (`${file}: no ${source} in deploy-package/`, :293).
- It runs in CI: `test:unit` = `bun test --isolate $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' …)` (package.json:32) — this file matches, so a future regression fails a required check instead of a production deploy.

## 3. First-party verification (all run by me at head `bbe43a56` in isolated worktree /tmp/wt1410)

| Claim (PR body / draft) | Method | Result |
|---|---|---|
| Guard: 32 passed, 0 failed, 97 assertions | `bun test src/lib/__tests__/preview-deploy-workflow-guard.test.ts` | 32 pass / 0 fail / 97 expect() — exact match |
| Regression control: 31 passed, 1 targeted failure naming the three workflows | sed-revert of the three `cp -r patches` lines, re-run | 31 pass / 1 fail, failure = `every partial deploy package stages its Bun dependency inputs`, missing array names exactly the three workflows |
| Guard non-vacuity | regex reproduction against head tree + drop-one-line probe | dropping the patches line empties `patches` from staged sources → test fails; discovered set == the 4 real packaging workflows |
| `deploy-relay.yml` out of scope correctly | read the workflow | stages `relay-package/` with shell scripts, systemd unit, caddyfiles — no package.json/bun.lock, so no patches requirement |
| Merge-forward "diff unchanged" | `git diff e989381b bbe43a56 -- <4 files> \| wc -l` | 0 |
| All three fixed workflows lacked patches on base | `git show 614ff3a0:<file> \| grep -c 'cp -r patches'` | 0 / 0 / 0 (preview-deploy: 1) |

## 4. Staging acceptance (was "pending" in the PR body — now resolved by deployment evidence)

Deploy to Staging at the merge commit `68b1b7b9d4` **succeeded 2026-10-06T16:09Z** — after the pre-merge failure at `09b420e0ed` (15:09Z) at the same incident window. `bun install --production` ran on the target host, the patch error did not recur, PM2 activation and Caddy steps completed. The PR body's honest hedge ("staging acceptance remains post-merge") is closed by evidence the author didn't have at review time.

## 5. GATE 2.5 — cold audit of the draft

Named gate-2 reviewer `worker-reviewer-ds` has **no profile on this node** (`~/.hermes/profiles/`: manager, urgency-triage, worker-admin, worker-base, worker-dq05, worker-heavy, worker-reviewer-glm, worker-reviewer-kimi, worker-reviewer-qwen, worker-tollgate). Same situation and same escape as pr1422 (review-of-record 5694363189): the cold audit was discharged as an **independent fresh-context delegate audit** of the draft (read-only, no GitHub writes), which is same-family and is **disclosed as such** in this report; no cross-family token is claimed anywhere.

Audit execution: deleg_12758da8, dispatched 09:15Z with instructions to append findings incrementally to `/tmp/pr1410_audit/audit-verdict.md` (survives provider loss). Verdict: see section 7 (final).

## 6. Publish + gate state

- Review posted via `gh pr review 1410 --repo PlebeianApp/market --body-file` (felixfelix-bot, COMMENT — a review-of-record on a merged PR, not a merge-blocking event), body cites head SHA `bbe43a56598c8d0dd6adb1bfba75a3f55d6f1b9d` and states APPROVED with zero change requests.
- Gate state `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json`: `prs["1410"]` was **absent** (root cause of card re-creation); entry added with `last_reviewed_sha = bbe43a56598c…`, `review_card = t_29774673`, review id/url, schema identical to pr1422. Backup written before the atomic read-modify-write; verified by re-reading the file after.

## 7. Final verdict

**APPROVED — no change requests.** Two non-blocking INFO items were raised (both latent-hardening notes about the guard, both true and both minor):
- [INFO] preview-deploy-workflow-guard.test.ts:87 — discovery filter is `.endsWith('.yml')`; a future `*.yaml` packaging workflow would escape discovery and the pin. Zero `.yaml` files exist in `.github/workflows/` today.
- [INFO] deploy-relay.yml correctly out of guard scope (no package.json/bun.lock shipped) — noted so nobody "fixes" it later.

GATE 2.5 audit outcome: **APPROVE_DRAFT_W_AMENDMENTS** (deleg_12758da8, audit-verdict.md). All 20 factual claims in the draft CONFIRMED by the cold audit; one wording correction (the failed `Tear down preview` at head is a teardown-job missing-checkout defect — `ssh-prepare.sh` absent from a workspace that has no checkout, exit 127; the script exists at base and head — not "runner provisioning" noise) applied to draft.md BEFORE posting. No blocking defects in the PR or the draft; the two INFO items stand. The auditor's final LLM call died on provider 503 after writing steps 1-14 to the incremental file; the parent completed steps 15-17 first-hand (guard rerun 32/0/97, base existence of ssh-prepare.sh, missed-defect sweep) — every command in the appended steps was run, none inherited unverified.

## Evidence

- artifacts/pr1410_review/raw/{pr1410_meta.json, reviews.json, issue_comments.json, check_runs.json}
- artifacts/pr1410_review/draft.md (pre-audit draft), audit-verdict.md (cold-audit verdict)
- artifacts/pr1410_review/update_gate_state.py (gate-state updater, run against manager profile state)
- Fork branch review/pr1410-glm-20261029 (felixfelix-bot/market) — this evidence trail