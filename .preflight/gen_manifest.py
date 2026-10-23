#!/usr/bin/env python3
"""Build MANIFEST.md: PR #1138 own-delta, every file with +/- , status, and an
evidence-based note derived from the last commit that touched it in the range.

Classification is mechanical (path + status), the note is the real commit subject,
so nothing here is invented.
"""
import subprocess, collections, re

REPO = "/home/c03rad0r/repos/market"
FORK = "c8c06fd74dd3d259dfc43bf79f7da2c3590eb664"
HEAD = "6be7496cc2089db2e2da04bb083312ae6d43a79d"

def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True).stdout

num = git("diff", "--numstat", "-M", f"{FORK}..{HEAD}")
status = {}
for line in git("diff", "--name-status", "-M", f"{FORK}..{HEAD}").splitlines():
    p = line.split("\t")
    status[p[-1]] = p[0][0]  # A/M/D/R

rows = []
BINARY = []
for line in num.splitlines():
    a, d, path = line.split("\t")
    if a == "-" or d == "-":     # binary files report '-'
        BINARY.append(path)
        a = d = "0"
    rows.append((path, a, d, status.get(path, "?")))

SKIP = {
    "bun.lock": "lockfile — skim only (dependency resolution)",
    "src/routeTree.gen.ts": "GENERATED (TanStack route tree) — do not review by hand",
    "ctxcn.config.json.bak": "BACKUP FILE (.bak) — should probably not be committed; skim",
    "scripts/instance-literals-baseline.txt": "generated baseline data — skim",
    "scripts/ndk-baseline.txt": "generated baseline data — skim",
}

def classify(path, st):
    base = path.rsplit("/", 1)[-1]
    if path in SKIP: return "skip"
    if path.startswith("e2e/"): return "e2e"          # must precede the test rule: e2e/tests/*.spec.ts
    if re.search(r"(^|/)__tests__/|\.test\.(ts|tsx)$|(^|/)tests?/", path): return "test"
    if path.startswith("docs/") or base in ("AUCTIONS.md", "AGENTS.md", "README.md"): return "docs"
    if path.startswith(".github/"): return "ci"
    if path.startswith("scripts/"): return "script"
    if path.startswith("contextvm/"): return "cvm"
    if path.endswith((".md",)): return "docs"
    if base in ("package.json", "tsconfig.json"): return "config"
    if path.startswith("deploy-simple/"): return "deploy"
    return "code"

groups = collections.OrderedDict()
for path, a, d, st in rows:
    groups.setdefault(classify(path, st), []).append((path, a, d, st))

order = ["code", "test", "e2e", "docs", "cvm", "ci", "script", "deploy", "config", "skip"]
labels = {
    "code": "Production code (auction modules, routes, components, server)",
    "test": "Unit/integration tests",
    "e2e": "Playwright e2e + fixtures + harness",
    "docs": "Docs / ADRs / specs",
    "cvm": "ContextVM service",
    "ci": "GitHub workflows",
    "script": "Repo scripts + baselines",
    "deploy": "Deployment assets",
    "config": "Package/TS config",
    "skip": "Generated / vendored / lockfile — skippable",
}

out = []
out.append("# MANIFEST — PR #1138 own delta\n")
out.append(f"Range: `{FORK}..{HEAD}` (merge-base with origin/master == PR base.sha)\n")
out.append(f"Totals: {len(rows)} files, +{sum(int(r[1]) for r in rows)} / -{sum(int(r[2]) for r in rows)}\n")
out.append("\nStatus: A=new, M=modified. `Note` is the subject of the last commit in range touching the file.\n")

for g in order:
    items = groups.get(g)
    if not items: continue
    items.sort(key=lambda r: -(int(r[1]) + int(r[2])))
    out.append(f"\n## {labels[g]} — {len(items)} files, +{sum(int(i[1]) for i in items)} / -{sum(int(i[2]) for i in items)}\n")
    out.append("\n| +/- | st | file | note (last commit in range) |")
    out.append("\n|---|---|---|---|")
    for path, a, d, st in items:
        note = SKIP.get(path) or git("log", "-1", "--format=%s", f"{FORK}..{HEAD}", "--", path).strip()
        note = note.replace("|", "\\|")[:120]
        out.append(f"\n| +{a} -{d} | {st} | `{path}` | {note} |")
    out.append("\n")

open(f"{REPO}/MANIFEST.md", "w").write("".join(out))
print("wrote MANIFEST.md")
print("binary_files:", BINARY)
for g in order:
    if g in groups:
        print(f"{g}: {len(groups[g])} files")
