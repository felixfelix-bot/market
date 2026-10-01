#!/usr/bin/env python3
"""Build artifacts/pr1306_dedup/raw_comments.md from raw gh captures, verbatim.

Read-only: consumes the files in this directory, writes ../raw_comments.md.
No network access, no GitHub mutation.
"""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

RAW = Path(__file__).resolve().parent
OUT = RAW.parent / "raw_comments.md"
CAPTURED_AT = "2026-10-01T14:36:26Z"  # date -u at capture time (metadata fetch)


def load_json_maybe_concatenated(path: Path):
    """Parse JSON that may be one array or several arrays concatenated (--paginate)."""
    text = path.read_text(encoding="utf-8")
    decoder = json.JSONDecoder()
    items, idx, n = [], 0, len(text)
    while idx < n:
        while idx < n and text[idx] in " \t\r\n":
            idx += 1
        if idx >= n:
            break
        obj, end = decoder.raw_decode(text, idx)
        if isinstance(obj, list):
            items.extend(obj)
        else:
            items.append(obj)
        idx = end
    return items, text


def fence(text: str) -> str:
    """Pick a backtick fence longer than any run inside text."""
    runs = re.findall(r"`+", text)
    width = max([len(r) for r in runs] + [3]) + 1
    return "`" * width


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


meta, _ = load_json_maybe_concatenated(RAW / "pr_metadata.json")
meta = meta[0]

reviews, reviews_raw = load_json_maybe_concatenated(RAW / "reviews.json")
rcomments, rcomments_raw = load_json_maybe_concatenated(RAW / "review_comments.json")
icomments, icomments_raw = load_json_maybe_concatenated(RAW / "issue_comments.json")

pr_view_bytes = (RAW / "gh_pr_view_comments.txt").read_bytes()
pr_view_text = pr_view_bytes.decode("utf-8")

body = meta.get("body") or "(no description body)"
body_fence = fence(body)
empty_fence = "```"

lines = []
w = lines.append

w("# PR #1306 — raw GitHub comments/reviews evidence dump")
w("")
w("- Target: PlebeianApp/market PR #1306 ("
  f"[{meta['html_url']}]({meta['html_url']}))")
w(f"- Title: {meta['title']}")
w(f"- Capture time (UTC): {CAPTURED_AT}, gh CLI authenticated as felixfelix-bot")
w("- Mode: READ-ONLY evidence gathering. No posts, comments, resolves, edits,")
w("  or other GitHub mutations were performed.")
w("- Companion artifact: `artifacts/pr1306_dedup/kanban_artifacts.md` (kanban-side")
w("  review-chain harvest, commit 82b3c9f7). This file covers the GitHub side only.")
w("")
w("## Summary of endpoint results")
w("")
w("| # | Endpoint | Exit | Items returned |")
w("|---|----------|------|----------------|")
w(f"| 1 | `gh pr view 1306 --comments --repo PlebeianApp/market` | 0 | 0 (stdout empty, 0 bytes) |")
w(f"| 2 | `gh api --paginate repos/PlebeianApp/market/pulls/1306/reviews` | 0 | {len(reviews)} |")
w(f"| 3 | `gh api --paginate repos/PlebeianApp/market/pulls/1306/comments` | 0 | {len(rcomments)} |")
w(f"| 4 | `gh api --paginate repos/PlebeianApp/market/issues/1306/comments` | 0 | {len(icomments)} |")
w("")
w("**Every command in this dump returned an EMPTY result set.** Each is called out")
w("below with the exact command, exit code, and byte-exact output. With zero items")
w("returned there are no per-item author/id/permalink attributes to record; the")
w("item counts are cross-checked against the PR metadata fields `comments` and")
w("`review_comments` and the issues endpoint `comments` field (see Cross-checks).")
w("")
w("---")
w("")
w("## PR identity (from `gh api repos/PlebeianApp/market/pulls/1306`)")
w("")
w(f"- number: {meta['number']}")
w(f"- title: {meta['title']}")
w(f"- state: {meta['state']} (merged: {meta.get('merged')}, merged_at: {meta.get('merged_at')})")
w(f"- author (login): {meta['user']['login']}")
w(f"- permalink: {meta['html_url']}")
w(f"- created_at: {meta['created_at']}")
w(f"- updated_at: {meta['updated_at']}")
w(f"- comments (issue-level count per pulls API): {meta['comments']}")
w(f"- review_comments (inline count per pulls API): {meta['review_comments']}")
w(f"- additions/deletions: {meta['additions']}/{meta['deletions']}")
w(f"- head sha: {meta['head']['sha']} · base: {meta['base']['ref']} <- head: {meta['head']['ref']}")
w("")
w("## Endpoint 1 — `gh pr view 1306 --comments --repo PlebeianApp/market`")
w("")
w("Exact command:")
w("")
w(empty_fence)
w("gh pr view 1306 --comments --repo PlebeianApp/market")
w(empty_fence)
w("")
w("- exit code: 0")
w(f"- stdout: **EMPTY — {len(pr_view_bytes)} bytes** (verified with `wc -c` = "
  f"{len(pr_view_bytes)} and `od -c` = `0000000`)")
w("- stderr: empty (0 bytes)")
w("- Interpretation of the empty output (fact, not opinion): gh emits nothing on")
w("  stdout for `--comments` when the PR has no comments; the PR itself renders")
w("  normally without `--comments` (see Appendix A for its description body).")
w("")
w("stdout, verbatim (empty):")
w("")
w(empty_fence)
w(pr_view_text)
w(empty_fence)
w("")
w("## Endpoint 2 — `gh api --paginate repos/PlebeianApp/market/pulls/1306/reviews`")
w("")
w("Exact command:")
w("")
w(empty_fence)
w("gh api --paginate repos/PlebeianApp/market/pulls/1306/reviews")
w(empty_fence)
w("")
w("- exit code: 0; stderr empty (0 bytes)")
w(f"- **EMPTY result: {len(reviews_raw.encode('utf-8'))} bytes**")
w(f"- items returned: **{len(reviews)}** — no reviews exist on this PR")
w("")
w("stdout, verbatim:")
w("")
w(empty_fence)
w(reviews_raw.strip())
w(empty_fence)
w("")
w("## Endpoint 3 — `gh api --paginate repos/PlebeianApp/market/pulls/1306/comments` (inline review comments)")
w("")
w("Exact command:")
w("")
w(empty_fence)
w("gh api --paginate repos/PlebeianApp/market/pulls/1306/comments")
w(empty_fence)
w("")
w("- exit code: 0; stderr empty (0 bytes)")
w(f"- **EMPTY result: {len(rcomments_raw.encode('utf-8'))} bytes**")
w(f"- items returned: **{len(rcomments)}** — no inline review comments exist on this PR")
w("")
w("stdout, verbatim:")
w("")
w(empty_fence)
w(rcomments_raw.strip())
w(empty_fence)
w("")
w("## Endpoint 4 — `gh api --paginate repos/PlebeianApp/market/issues/1306/comments` (issue-level comments)")
w("")
w("Exact command:")
w("")
w(empty_fence)
w("gh api --paginate repos/PlebeianApp/market/issues/1306/comments")
w(empty_fence)
w("")
w("- exit code: 0; stderr empty (0 bytes)")
w(f"- **EMPTY result: {len(icomments_raw.encode('utf-8'))} bytes**")
w(f"- items returned: **{len(icomments)}** — no issue-level comments exist on this PR")
w("")
w("stdout, verbatim:")
w("")
w(empty_fence)
w(icomments_raw.strip())
w(empty_fence)
w("")
w("## Cross-checks")
w("")
w("Exact command:")
w("")
w(empty_fence)
w("gh api repos/PlebeianApp/market/issues/1306 --jq '{comments, state, author: .user.login}'")
w(empty_fence)
w("")
w("stdout, verbatim:")
w("")
w(empty_fence)
w('{"author":"felixfelix-bot","comments":0,"state":"closed"}')
w(empty_fence)
w("")
w("This matches: pulls API `comments: 0`, `review_comments: 0`; reviews/comments/")
w("issue-comments endpoints all `[]`. No auth or permission errors occurred on any")
w("command (all exit 0, all stderr empty).")
w("")
w("## Appendix A — PR description (opening post), verbatim")
w("")
w("The only prose ever authored on PR #1306 itself is the PR description by")
w(f"@{meta['user']['login']} (created {meta['created_at']},")
w(f"permalink {meta['html_url']}). Included verbatim for completeness:")
w("")
w(body_fence)
w(body)
w(body_fence)
w("")
w("## Appendix B — raw capture files (this directory)")
w("")
w("| file | bytes | sha256 |")
w("|------|-------|--------|")
for p in sorted(RAW.iterdir()):
    if p.name == Path(__file__).name:
        continue
    w(f"| `{p.name}` | {p.stat().st_size} | {sha256(p)} |")
w("")
w(f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} by "
  "`raw/build_raw_comments.py` from the captures above.")

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
print(f"counts: reviews={len(reviews)} review_comments={len(rcomments)} "
      f"issue_comments={len(icomments)} pr_view_stdout_bytes={len(pr_view_bytes)}")
