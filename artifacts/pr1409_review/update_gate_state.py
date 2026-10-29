#!/usr/bin/env python3
"""Record prs["1409"].last_reviewed_sha in the plebeian review gate state.

Read-modify-write with atomic os.replace; backs up the original first.
Run AFTER the review is published on GitHub.
"""
import json
import os
import shutil
from datetime import datetime, timezone

STATE = "/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json"
PR = "1409"
SHA = "8cf24b9ec134844ef6ebca5d87393a59e8fd0ee7"

now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

backup = STATE + ".bak_pr1409_" + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
shutil.copy2(STATE, backup)
print("backup:", backup)

with open(STATE) as f:
    data = json.load(f)

prs = data.setdefault("prs", {})
entry = prs.get(PR, {})
entry["last_reviewed_sha"] = SHA
entry["last_checked"] = now
entry["disposition"] = "merged-reviewed-approved"
entry["note"] = (
    "PR #1409 (maximotodev, docs/adr0017-accepted-status) MERGED at head 8cf24b9e "
    "(2026-10-05T23:02:47Z, merge commit 614ff3a0) — post-merge fleet review-of-record "
    "posted by felixfelix-bot as COMMENTED review citing head SHA, body states APPROVED, "
    "zero change requests. Docs-only status flip (ADR-0017 Proposed->Accepted in ADR:5 + "
    "README:25), ratification wording matches #1407's Franchovy APPROVED (5417034899, "
    "2026-10-05T15:38Z) + merge (15:48Z); 7 choices byte-identical to base. Gate 2.5: "
    "true cross-family cold audit — kimi family (worker-reviewer-kimi profile, "
    "kimi-k2.7-code) audited the draft before posting; verdict in "
    "artifacts/pr1409_review/audit/audit-verdict.md."
)
prs[PR] = entry

tmp = STATE + ".tmp"
with open(tmp, "w") as f:
    json.dump(data, f, indent=2, sort_keys=False)
    f.write("\n")
os.replace(tmp, STATE)

# verify
with open(STATE) as f:
    check = json.load(f)
assert check["prs"][PR]["last_reviewed_sha"] == SHA, "verify failed"
print("written:", json.dumps(check["prs"][PR], indent=1)[:500])
print("prs keys count:", len(check["prs"].keys()))
print("has 1409:", "1409" in check["prs"].keys())
print("OK")