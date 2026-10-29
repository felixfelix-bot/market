import sys
sys.path.insert(0, "/home/c03rad0r/.hermes/bot/governance")
import gate_engine as ge

g = ge.load_gates() if hasattr(ge, "load_gates") else ge.GATES
if isinstance(g, str):
    import json; g = json.loads(g)
known = ge.known_tags(g)
print("known_tags:", known)

text = """tags: no-code, docs — tier declaration only: read-only review card, no repo code change.
NO-OP dedup close. Review-of-record (felixfelix-bot CHANGES_REQUESTED 4981547214 + comment 5354414353) already sits at live head 6b8aeb6e of PR #1200; per fleet rule dedup, zero GitHub writes. First-party re-verification: 33/33 tests pass at head, carried items still open, CI green. Gate 2.5 cold audit CONFIRMED_W_AMENDMENTS. Gate state prs.1200.last_reviewed_sha recorded. Evidence: artifacts/pr1200_review/REPORT.md, pushed to https://github.com/felixfelix-bot/market/tree/review/pr1200-noop-20261029"""

tags = ge.tag_tokens(text.splitlines()[0], known)
print("line-1 tag_tokens:", tags)
tier = ge.classify_tier("plebeian-pr-reviews", tags, g)
print("classify_tier:", tier)
req = g["tiers"][tier]["require"] if "require" in g.get("tiers", {}).get(tier, {}) else g.get("tiers", {}).get(tier)
print("tier require:", req)
print("RE_PUSH:", bool(ge.RE_PUSH.search(text)))
print("RE_PR_REF:", bool(ge.RE_PR_REF.search(text)))