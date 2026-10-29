import json, os, shutil, datetime

p = "/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json"
ts = datetime.datetime.now(datetime.UTC).strftime("%Y%m%dT%H%M%SZ")
bak = p + ".bak_t_2d650d80_" + ts
shutil.copy2(p, bak)
print("backup:", bak)

with open(p) as f:
    d = json.load(f)

before = sorted(d["prs"].keys())
d["prs"]["1208"] = {
    "disposition": "open-reviewed-approved-dedup-noop",
    "last_checked": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "last_reviewed_at": "2026-10-29",
    "last_reviewed_sha": "055b6575eab0d21cd098d5f13defa03796395309",
    "note": "NO-OP dedup close (card plebeian-pr-reviews:t_2d650d80, 2026-10-29): the lane's review-of-record already sits at the live head — felixfelix-bot COMMENTED review 4936193369 (2026-08-14, substantive 7-point review: validation-before-signer ordering, no-leak error mapping, degraded mode, snapshotInput NIT, #1136 stack dep, 2556 test lines, deterministic representative selection) AND felixfelix-bot APPROVED review 4981203529 (2026-08-20, 'Re-reviewed — no new issues beyond existing feedback. Ready to merge.'), both commit_id == head 055b6575; maintainer Franchovy APPROVED at same head; reviewDecision=APPROVED. Per fleet rule a felixfelix-bot review at the live head IS the review-of-record: dedup, never re-post — zero GitHub writes this run. First-party re-verification at head (worktree /tmp/wt1208): PR delta vs merge-base 075def1f = 6 files +3439/-3 (cumulative 8/+4465 includes 2 files landed via #1136, already in origin/master); PR tests 141 pass/0 fail (4 files); full unit suite 322 pass/0 fail/1211 expect() across 21 files; prettier clean; CI at head 5 success + 1 skipped (e2e-full); zero @nostr-dev-kit in changed files; no console/TODO residue. Card was created 2026-10-05 solely because this prs['1208'] entry was absent. Gate 2.5: assigned reviewer worker-reviewer-ds profile absent on node, discharged as independent fresh-context delegate audit of the dedup decision — AUDIT_VERDICT: CONFIRMED, 7/0 (artifacts/pr1208_noop_20261029/audit-1208.md, fork branch review/pr1208-noop-20261029). mergeStateStatus=BLOCKED (maintainer: needs rebase for new CI) — merge-state note only, no new findings.",
    "review_card": "plebeian-pr-reviews:t_2d650d80",
    "reviewer": "felixfelix-bot (review-glm, glm-5.3); gate-2.5 fresh-context delegate audit (disclosed same-family)",
    "reviewer_model": "glm-5.3",
}
tmp = p + ".tmp"
with open(tmp, "w") as f:
    json.dump(d, f, indent=2)
os.replace(tmp, p)

with open(p) as f:
    d2 = json.load(f)
after = sorted(d2["prs"].keys())
print("before keys:", len(before), "after keys:", len(after))
print("1208 present:", "1208" in d2["prs"])
print("last_reviewed_sha:", d2["prs"]["1208"]["last_reviewed_sha"])
lost = set(before) - set(after)
print("lost keys:", lost)