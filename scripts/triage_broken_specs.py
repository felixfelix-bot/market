#!/usr/bin/env python3
"""
Triage tool: walk Playwright JSON reports (nested suites) for the 10 broken specs,
extract error messages, and categorize each failure.

Categories:
  SELECTOR_DRIFT - locators do not match current DOM
  MISSING_DEP    - ffmpeg or other system dependency missing
  TIMEOUT        - test or navigation timeout
  APP_BUG        - actual application error (crash, wrong behavior)
  TEST_BUG       - assertion or setup issue in the test itself
"""
import json
import re
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).resolve().parent.parent / "e2e" / "baseline-results" / "flake-results"

BROKEN = [
    "auth", "buyer-purchase", "cart", "community.progressive-loading",
    "marketplace", "navigation", "payments", "pii-exposure-remediation",
    "product-page", "products",
]


def collect_errors(node, spec_errors):
    """Recursively walk suites -> specs -> tests -> results -> errors."""
    if not isinstance(node, dict):
        return
    for sp in node.get("specs", []):
        for te in sp.get("tests", []):
            for r in te.get("results", []):
                if r.get("status") in ("failed", "timedOut", "interrupted"):
                    for e in r.get("errors", []):
                        msg = (e.get("message") or "").strip()
                        if msg:
                            spec_errors.append({
                                "spec_title": sp.get("title", ""),
                                "status": r.get("status"),
                                "message": msg,
                            })
    for ch in node.get("suites", []):
        collect_errors(ch, spec_errors)


def categorize(msg, status):
    m = msg.lower()
    # MISSING_DEP
    if "ffmpeg" in m or "missing dependency" in m or "command not found" in m \
       or "shared library" in m or "cannot find module" in m and "node" in m:
        return "MISSING_DEP"
    # SELECTOR_DRIFT
    if re.search(r"locator|getbyrole|getbytext|getbytestid|selector|\.fill\(|\.click\(|"
                 r"element.*not found|not visible|strict mode|resolved to|awaiting", m) \
       and ("timed out" in m or "not found" in m or "not visible" in m
            or "does not satisfy" in m or "strict mode" in m
            or "no element found" in m or "error: locator" in m):
        return "SELECTOR_DRIFT"
    # TIMEOUT
    if "timed out" in m or "timeout" in m and "exceeded" in m:
        if "locator" in m or "click" in m or "fill" in m or "navigation" in m:
            # ambiguous - could be selector or nav; check for nav keywords
            if re.search(r"navigation|goto|navigat|load|waitfor", m):
                return "TIMEOUT"
            return "SELECTOR_DRIFT"
        return "TIMEOUT"
    if "page.goto" in m or "navigation" in m:
        return "TIMEOUT"
    # APP_BUG
    if re.search(r"uncaught|exception|crash|referenceerror|typeerror|"
                 r"console error|page error|error: ", m):
        if re.search(r"expect|locator|tobe", m):
            return "TEST_BUG"
        return "APP_BUG"
    # default by status
    if status == "timedOut":
        return "TIMEOUT"
    return "TEST_BUG"


def main():
    report = {}
    for spec in BROKEN:
        files = sorted(BASE.glob(f"pw-{spec}.spec-run*.json"))
        errors = []
        for f in files:
            try:
                d = json.loads(f.read_text())
            except Exception as ex:
                continue
            errs = []
            collect_errors(d, errs)
            for e in errs:
                e["run_file"] = f.name
            errors.extend(errs)
        if not errors:
            report[spec] = {"category": "NO_ERRORS_FOUND", "count": 0, "samples": []}
            continue
        cats = defaultdict(list)
        for e in errors:
            c = categorize(e["message"], e["status"])
            cats[c].append(e)
        # dominant category
        dominant = max(cats.items(), key=lambda kv: len(kv[1]))
        report[spec] = {
            "total_error_entries": len(errors),
            "category_counts": {k: len(v) for k, v in cats.items()},
            "dominant_category": dominant[0],
            "sample_errors": [e["message"][:500] for e in dominant[1][:2]],
        }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
