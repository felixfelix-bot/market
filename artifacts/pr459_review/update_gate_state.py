#!/usr/bin/env python3
"""Record prs["459"].last_reviewed_sha in the plebeian review gate state.

Read-modify-write with atomic os.replace; backs up the original first.
Run AFTER the review is published on GitHub.
"""
import json
import os
import shutil
import sys
from datetime import datetime, timezone

STATE = "/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json"
PR = "459"
SHA = "db60d4d7ec896944e79ed2734f42b7ec670a156e"

now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

backup = STATE + ".bak_pr459_" + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
shutil.copy2(STATE, backup)
print("backup:", backup)

with open(STATE) as f:
    data = json.load(f)

prs = data.setdefault("prs", {})
entry = prs.get(PR, {})
entry["last_reviewed_sha"] = SHA
entry["last_checked"] = now
entry["disposition"] = "open-reviewed-request-changes"
entry["note"] = (
    "PR #459 (BenGWeeks, feat/product-social-preview) OPEN at head db60d4d7 — formal "
    "REQUEST_CHANGES review posted by felixfelix-bot citing head SHA (blocks: useDocumentMeta "
    "hook called after conditional early returns :390 vs :258/:267/:289 — rules-of-hooks crash "
    "on direct-link; head commit's price/currency guard dead code :231/:396 vs :117). Superseded "
    "by MERGED #1232 (same feature, SSR impl, gate state prs.1232); maintainer maxime-tt comment "
    "5310184633 recommends closing in favor of #1232. Prior felixfelix-bot reviews at this head "
    "were COMMENTED-only (4745911927/4745913371 byte-identical dup, 4745927618, 4745940450). "
    "Gate 2.5: cold audit run as fresh-context subagent (worker-reviewer-ds absent on node)."
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
print("written:", json.dumps(check["prs"][PR], indent=1)[:400])
print("prs keys now:", sorted(check["prs"].keys()))
print("OK")