#!/usr/bin/env python3
"""Dump deduplicated error snippets + line numbers for specific specs."""
import json, re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "e2e" / "baseline-results" / "flake-results"
SPECS = ["auth", "products", "product-page", "pii-exposure-remediation", "payments"]

def strip_ansi(s):
    return re.sub(r'\x1b\[[0-9;]*m', '', s)

def walk(node, out):
    if not isinstance(node, dict): return
    for sp in node.get("specs", []):
        title = sp.get("title","")
        for te in sp.get("tests", []):
            for r in te.get("results", []):
                if r.get("status") in ("failed","timedOut","interrupted"):
                    for e in r.get("errors", []):
                        msg = strip_ansi((e.get("message") or "").strip())
                        out.append((title, msg))
    for ch in node.get("suites", []):
        walk(ch, out)

for spec in SPECS:
    seen = {}
    for f in sorted(BASE.glob(f"pw-{spec}.spec-run*.json")):
        try: d = json.loads(f.read_text())
        except: continue
        tmp = []
        walk(d, tmp)
        for title, msg in tmp:
            # dedup by first 120 chars of message + test title
            key = (title, msg[:120])
            if key not in seen:
                seen[key] = msg
    print(f"\n{'='*70}\nSPEC: {spec}  ({len(seen)} distinct failures)\n{'='*70}")
    for (title, _), msg in seen.items():
        # extract the locator/snippet line
        loc = ""
        for line in msg.split("\n"):
            if "Locator:" in line or "snippet" in line.lower() or re.match(r"\s*\d+\s*\|", line) or "page.goto" in line or "timed out" in line.lower():
                loc += line.strip() + " | "
        print(f"\n  TEST: {title[:70]}")
        print(f"    {loc[:300]}")
