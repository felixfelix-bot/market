import importlib.util, json, os
spec = importlib.util.spec_from_file_location("ge", "/home/c03rad0r/.hermes/bot/governance/gate_engine.py")
ge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ge)

result_text = """tags: no-code, docs — read-only Gate 2.5 cold audit (no repo mutation, no publish)
Gate 2.5 cold cross-family audit of the kimi draft review for PlebeianApp/market PR #1319 at head 5067affba283 (parent t_be3205cc). Verdict: APPROVE. Draft bytes recovered from published felixfelix-bot review 5258236911 (worktree path on card was reclaimed; parent/sibling cards had empty results). All 24 sampled file:line citations verified first-hand at 2817bb5a and the PR head: patterns A-F (auth.ts:119-153, 98-103, 158/184/212, 489-498, 516-521, :32), nip46-mock.ts:53-57/292-293, auth.spec.ts:437-438/474-475/542-543. PR #1290 CLOSED unmerged confirmed. NIT#1 substance confirmed (272839a4 and 2817bb5a auth.ts byte-identical; hash stale only). NIT#2 confirmed (all 5 symbols absent from master auth.ts). INFO confirmed (ADR delta vs master = I2 bullet only; 91d43aa ancestor of master). Two minor discrepancies: draft's own NIT anchors off by 3 lines (hash at :42 not :39; Patterns header at :42 not :36), and the draft does not flag the PR body's '7 code patterns' vs the doc's 8-row/6-letter count. No BLOCK/RISK hiding, no hallucinated citations, no unfounded attributions. Full report: ~/.hermes/kanban/boards/plebeian-pr-reviews/attachments/t_5218c4d6/REPORT.md and ~/reports/reviews/plebeian-pr-reviews-t_5218c4d6-glm.md"""

g = ge.load_spec() if hasattr(ge, "load_spec") else None
if g is None:
    # try common loaders
    for name in ("load_gates", "load_config", "spec", "GATES"):
        if hasattr(ge, name):
            print("found loader attr:", name)

try:
    gates = ge.load_gates() if hasattr(ge, 'load_gates') else json.load(open(os.path.expanduser('~/.hermes/bot/gates.json')))
except Exception as e:
    print("loader err:", e)
    gates = None

print("known_tags:", sorted(ge.known_tags(gates)) if gates else "n/a")
print("tag_tokens:", ge.tag_tokens(result_text, ge.known_tags(gates)) if gates and hasattr(ge, 'tag_tokens') else "n/a")
try:
    tier = ge.classify_tier('plebeian-pr-reviews', ge.tag_tokens(result_text, ge.known_tags(gates)), gates)
    print("tier:", tier)
    if isinstance(gates, dict):
        print("tiers[tier].require:", gates.get('tiers', {}).get(tier, {}).get('require'))
except Exception as e:
    print("classify err:", repr(e))

# does the text arm RE_PR_REF?
print("RE_PR_REF match:", bool(ge.RE_PR_REF.search(result_text)) if hasattr(ge, 'RE_PR_REF') else "no attr")
print("RE_PUSH match:", bool(ge.RE_PUSH.search(result_text)) if hasattr(ge, 'RE_PUSH') else "no attr")