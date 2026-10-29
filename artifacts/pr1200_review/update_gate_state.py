#!/usr/bin/env python3
"""Record prs["1200"].last_reviewed_sha in the plebeian PR review gate state.

Read-modify-write with .bak backup first, os.replace atomic swap.
"""
import json
import os
import shutil
import datetime

GP = "/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json"
TID = "t_3b93223b"
SHA = "6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93"
TS = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

bak = f"{GP}.bak-pr1200-noop-20261029"
if os.path.exists(GP):
    shutil.copy2(GP, bak)
    print(f"backup written: {bak}")

with open(GP) as f:
    d = json.load(f)

prs = d.setdefault("prs", {})
before = prs.get("1200")
prs["1200"] = {
    "disposition": "open-changes-requested-dedup-noop",
    "last_checked": TS,
    "last_reviewed_at": "2026-10-29",
    "last_reviewed_sha": SHA,
    "note": (
        "NO-OP dedup close (card plebeian-pr-reviews:t_3b93223b, 2026-10-29): the lane's "
        "review-of-record already sits at the live head — felixfelix-bot CHANGES_REQUESTED review "
        "4981547214 (2026-08-20, commit_id == head 6b8aeb6e) carrying 4 new items (RISK exit-75 "
        "vs 70 invisible to the workflow caller — no id/continue-on-error on the installer step; "
        "NIT check_growth messages lack context prefix; NIT validate_payload extracted but "
        "untested; NIT rollback() du/df I/O during service downtime), PLUS felixfelix-bot "
        "consolidated issue comment 5354414353 (2026-08-20) carrying the 8 consolidated items "
        "(BLOCK observe() untested/un-testable via the readiness_now/readiness_sleep seams the "
        "PR itself introduces; RISK workflow public-endpoint sleep 5, no upper bound on "
        "RELAY_READINESS_SECONDS, observe() on bash SECONDS; NIT -n 1000 journal tail, stale "
        "elapsed, no shellcheck CI, grep-based wiring test) — 12 distinct open items total, all "
        "verified still present in code at head. The comment supersedes felixfelix-bot's own "
        "earlier APPROVED review 4851923082 (2026-08-04). Earlier history: maxime-tt COMMENTED "
        "4852408282 (8 items, 2026-08-04), Franchovy CHANGES_REQUESTED 4852771391 (2026-08-04). "
        "Fixes were offered as contribution PR maximotodev/market#10 (comment 5604800185, "
        "2026-09-09) — live check 2026-10-29: still OPEN, never merged, head unchanged since "
        "2026-07-30. Per fleet rule a felixfelix-bot review at the live head IS the "
        "review-of-record: dedup, never re-post — zero GitHub writes this run. First-party "
        "re-verification at head (worktree /tmp/wt1200): bash -n clean; readiness test 33/33 "
        "pass rc=0; shellcheck 15×SC2015 info-only; carried items confirmed still open at head "
        "(observe() SECONDS+bare sleep at install-staging-relay.sh:629/:631/:651, workflow "
        "sleep 5 at deploy-relay.yml:152/:219, validate_config :53-58 no upper bound, -n 1000 "
        "journal tails :583/:589, stale elapsed :572, zero shellcheck refs in .github/, zero "
        "observe_case in test file); CI at head 5 success + 1 skipped (e2e-full). One new "
        "INFO-grade observation recorded in the artifact report only (not posted, dedup): the "
        "readiness test is not wired into any pull_request-triggered workflow "
        "(deploy-relay.yml runs it only on master push / dispatch; ci-unit.yml does not "
        "reference it), so the 33 tests never run on PR branches. Card was created 2026-10-05 "
        "solely because this prs['1200'] entry was absent. Gate 2.5: assigned reviewer "
        "worker-reviewer-ds profile absent on node, discharged as independent fresh-context "
        "delegate cold audit of the draft verdict (disclosed same-family) — AUDIT_VERDICT: "
        "CONFIRMED_W_AMENDMENTS, 3 amendments applied before this gate-state write (see "
        "artifacts/pr1200_review/audit-1200.md, fork branch review/pr1200-noop-20261029)."
    ),
    "review_card": "plebeian-pr-reviews:t_3b93223b",
    "reviewer": (
        "felixfelix-bot (review-glm, glm-5.3); gate-2.5 fresh-context delegate audit "
        "(disclosed same-family)"
    ),
    "reviewer_model": "glm-5.3",
}

tmp = GP + ".tmp"
with open(tmp, "w") as f:
    json.dump(d, f, indent=1)
    f.write("\n")
os.replace(tmp, GP)
print(f"prs['1200'] written: last_reviewed_sha={SHA}")
print(f"before entry existed: {bool(before)}")

# verify
with open(GP) as f:
    d2 = json.load(f)
assert d2["prs"]["1200"]["last_reviewed_sha"] == SHA
print("verified: gate-state key 1200 present, sha matches")
print("total prs keys:", len(d2["prs"]))