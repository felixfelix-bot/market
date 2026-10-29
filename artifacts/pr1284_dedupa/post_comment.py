#!/usr/bin/env python3
"""Post a markdown file as a verbatim kanban comment.

Used to land the DEDUP A evidence on the PR #1284 dedup card; kept so the exact
posting path is auditable. Body is passed as a single argv element (no shell
quoting), and --dry-run exercises everything except the write.

    python3 post_comment.py dedup_a_comment.md            # post
    python3 post_comment.py dedup_a_comment.md --dry-run  # verify only
"""
import argparse
import subprocess
import sys
from pathlib import Path


def build_cmd(body: str, board: str, card: str) -> list[str]:
    return ["hermes", "kanban", "--board", board, "comment", card, body]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("body_file", type=Path, help="markdown file to post verbatim")
    ap.add_argument("--board", default="plebeian-pr-reviews")
    ap.add_argument("--card", default="t_75341e70")
    ap.add_argument("--dry-run", action="store_true", help="print the command, write nothing")
    args = ap.parse_args()

    body = args.body_file.read_text()
    cmd = build_cmd(body, args.board, args.card)
    assert cmd[-1] == body and cmd[-2] == args.card, "body/card must not be interpolated"

    print(f"{'DRY-RUN ' if args.dry_run else ''}posting {len(body)} chars to {args.card}")
    if args.dry_run:
        print(f"argv len={len(cmd)}  body argv slot len={len(cmd[-1])}")
        return 0

    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout.strip() or res.stderr.strip())
    return res.returncode


if __name__ == "__main__":
    sys.exit(main())
