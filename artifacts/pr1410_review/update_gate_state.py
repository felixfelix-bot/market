#!/usr/bin/env python3
"""Update plebeian-pr-review-state.json with prs['1410'] entry (read-modify-write, atomic)."""
import json, os, shutil, time

P = "/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json"
TS = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

shutil.copy2(P, P + ".bak_pr1410_" + str(int(time.time())))

with open(P) as f:
    d = json.load(f)

d["prs"]["1410"] = {
    "disposition": "merged-reviewed-approved",
    "issues_raised": [
        "[INFO] src/lib/__tests__/preview-deploy-workflow-guard.test.ts:87 discovery filter is .yml-only; a future *.yaml packaging workflow would escape both discovery and the hard-coded pin. Zero .yaml files exist today — latent hardening, not a defect.",
        "[INFO] deploy-relay.yml stages relay-package/ with no package.json/bun.lock (shell scripts, config, caddyfiles only), so it correctly stays out of the guard scope; noted so nobody 'fixes' it later.",
    ],
    "last_checked": TS,
    "last_reviewed_at": "2026-10-29",
    "last_reviewed_sha": "bbe43a56598c8d0dd6adb1bfba75a3f55d6f1b9d",
    "note": "Post-merge review-of-record published by felixfelix-bot as PR review (COMMENTED, commit_id==head bbe43a56598c) citing the head SHA; body states APPROVED, zero change requests, 2 non-blocking INFO. PR #1410 MERGED 2026-10-06T15:59:59Z via 68b1b7b9d4 (true merge — head is ancestor of master and master carries all three cp lines today), reviewDecision APPROVED (Franchovy 5430373074). Lane had NO prior review at this head (only plebibot 5430024165 + Franchovy 5430373074), so this dispatch was a real review, not a dedup NO-OP. First-party verification at head: guard 32 pass/0 fail/97 expect() calls; regression control (revert 3 cp lines) reproduces 31/1 with the failure naming exactly the three workflows; incident error string confirmed in run 37336956656 log-failed at 78c10f48bb; preview-deploy.yml:118 had the line on base while deploy/deploy-auctionsdev/release had 0 hits at base; server-side bun install --production at deploy.yml:223, release.yml:250, deploy-auctionsdev.yml:188; diff e989381b..bbe43a56 across the 4 changed files is empty (merge-forward unchanged); required checks at head all green; post-merge staging acceptance RESOLVED — Deploy to Staging succeeded at merge commit 68b1b7b9d4 2026-10-06T16:09Z (run 37493417057), patch error did not recur. The one failed Tear down preview at head is a pre-existing teardown-job defect (ssh-prepare.sh run without checkout, exit 127; script exists at base), unrelated to this diff. Gate 2.5: assigned reviewer worker-reviewer-ds profile absent on node, discharged as independent fresh-context delegate cold audit of the draft (same-family, disclosed; no cross-family token claimed); verdict APPROVE_DRAFT_W_AMENDMENTS (one wording correction applied before posting). Evidence: /home/c03rad0r/repos/market/artifacts/pr1410_review/ (fork branch review/pr1410-glm-20261029).",
    "review_card": "t_29774673",
    "reviewer": "felixfelix-bot (review-glm, glm-5.3); gate-2.5 fresh-context delegate audit (disclosed same-family)",
    "review_url": "https://github.com/PlebeianApp/market/pull/1410#pullrequestreview-5694825411",
    "review_id": 5694825411,
    "reviewer_model": "glm-5.3",
}

tmp = P + ".tmp"
with open(tmp, "w") as f:
    json.dump(d, f, indent=2)
os.replace(tmp, P)

with open(P) as f:
    check = json.load(f)
e = check["prs"]["1410"]
assert e["last_reviewed_sha"] == "bbe43a56598c8d0dd6adb1bfba75a3f55d6f1b9d"
assert e["review_card"] == "t_29774673"
print("OK: prs['1410'] written, last_reviewed_sha =", e["last_reviewed_sha"])
print("keys now:", sorted(check["prs"].keys())[-5:])