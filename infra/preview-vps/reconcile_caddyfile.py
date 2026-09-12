#!/usr/bin/env python3
"""Reconcile the preview-deployment regions of the VPS Caddyfile.

The preview VPS is a SHARED box: /etc/caddy/Caddyfile already carries nsite,
tollgate, strfry and continuum routes, and an earlier revision of the preview
deploy added blocks of its own. A presence grep ("is the string in the file?")
is therefore not enough to keep the preview route healthy.

Observed failure (2026-09-11, run 34613164958): the live Caddyfile still held a
legacy block

    # Preview deployments - on-demand TLS for per-PR subdomains
    # … proxies to the nsite gateway as a fallback.
    *.test-market.orangesync.tech {
        tls {
            on_demand
        }
        reverse_proxy localhost:3002
    }

pointing the whole preview wildcard at the nsite gateway, while the previous
provision.sh step-10 guard saw `test-market.orangesync.tech` present, printed
"route already present" and never installed the real route to the preview
gateway on localhost:6799. Every pr{N} subdomain answered the nsite gateway's
404 "Invalid address" page, so the deploy's health check failed 12/12 even
though every deploy step succeeded.

This module owns those two preview blocks deterministically:

  * the preview wildcard site block lives inside BEGIN/END markers and is
    rewritten to `reverse_proxy <upstream>` (the preview gateway);
  * any OTHER top-level site block whose header names the preview wildcard
    domain is removed — that is the legacy block an earlier revision of this
    repository wrote, and leaving it in place shadows the route;
  * the global `on_demand_tls` ask endpoint is pointed at the preview gateway's
    `/ask` URL (a legacy `127.0.0.1:6798` ask target left Caddy unable to get
    certificates for on-demand hostnames).

Everything else in the file is preserved byte-for-byte. The transformation is a
pure function (`reconcile`) so it runs hermetically in CI, and it is idempotent:
reconciling an already-correct file reports no changes and writes nothing.

CLI (on the VPS, as root):

    sudo python3 - --file /etc/caddy/Caddyfile \\
        --wildcard '*.test-market.orangesync.tech' \\
        --upstream localhost:6799 --ask http://127.0.0.1:6799/ask

Exits 0 on success (with or without changes), 2 on a missing file, 3 when the
result would be an unbalanced Caddyfile.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import shutil
import stat
import sys
from typing import List, Optional, Sequence, Tuple

MARK_BEGIN = "# BEGIN PREVIEW MARKET ROUTES"
MARK_END = "# END PREVIEW MARKET ROUTES"

DEFAULT_WILDCARD = "*.test-market.orangesync.tech"
DEFAULT_UPSTREAM = "localhost:6799"
DEFAULT_ASK = "http://127.0.0.1:6799/ask"

_ASK_LINE_RE = re.compile(r"^(?P<indent>\s*)ask\s+(?P<url>\S+)\s*$")


def _is_top_level_header(line: str) -> bool:
    """True when ``line`` opens a top-level Caddyfile block."""
    if line[:1] in (" ", "\t"):
        return False
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        return False
    return "{" in stripped


def _top_level_spans(lines: Sequence[str]) -> List[Tuple[int, int]]:
    """Inclusive (start, end) line index pairs for each top-level block."""
    spans: List[Tuple[int, int]] = []
    i = 0
    while i < len(lines):
        if _is_top_level_header(lines[i]):
            depth = 0
            j = i
            while j < len(lines):
                depth += lines[j].count("{") - lines[j].count("}")
                if depth <= 0:
                    break
                j += 1
            if j >= len(lines):  # unbalanced tail: treat it as one block
                j = len(lines) - 1
            spans.append((i, j))
            i = j + 1
            continue
        i += 1
    return spans


def _managed_block(wildcard: str, upstream: str) -> List[str]:
    return [
        MARK_BEGIN,
        "# Preview deployments: pr{N} subdomains are served by the preview",
        "# gateway, which maps the Host header to the per-PR compose ports and",
        "# wakes a stopped preview on request. Managed by",
        "# infra/preview-vps/provision.sh (reconcile_caddyfile.py) — edits here",
        "# are overwritten on the next deploy.",
        "#",
        "# PITFALL: never point this wildcard at the nsite gateway",
        "# (localhost:3002). An earlier revision did that as a \"fallback\" and",
        "# every preview answered the nsite gateway's 404 \"Invalid address\"",
        "# page (#1257 run 34613164958).",
        wildcard + " {",
        "\tlog {",
        "\t\toutput file /var/log/caddy/access.json {",
        "\t\t\troll_size 50MiB",
        "\t\t\troll_keep 3",
        "\t\t}",
        "\t\tformat json",
        "\t}",
        "\ttls {",
        "\t\ton_demand",
        "\t}",
        "\treverse_proxy " + upstream,
        "}",
        MARK_END,
    ]


def reconcile(
    text: str,
    *,
    wildcard: str = DEFAULT_WILDCARD,
    upstream: str = DEFAULT_UPSTREAM,
    ask: str = DEFAULT_ASK,
) -> Tuple[str, List[str]]:
    """Return (new_text, changes).

    ``changes`` is empty when the input is already reconciled — the caller can
    then skip writing (and skip backing up / reloading Caddy).
    """
    changes: List[str] = []
    lines = text.split("\n")

    # 1. Drop the managed region written by a previous reconcile run: it is
    #    rebuilt below, so a wrong upstream/ask in it cannot survive.
    kept: List[str] = []
    inside_managed = False
    had_managed = False
    for line in lines:
        marker = line.strip()
        if marker == MARK_BEGIN:
            inside_managed = True
            had_managed = True
            continue
        if marker == MARK_END:
            inside_managed = False
            continue
        if not inside_managed:
            kept.append(line)
    if had_managed:
        changes.append("replaced the managed preview region")
    lines = kept

    # 2. Remove legacy top-level site blocks for the preview wildcard domain.
    key = wildcard.lstrip("*.").strip()
    drop: set[int] = set()
    if key:
        for start, end in _top_level_spans(lines):
            header = lines[start].strip()
            if key not in header:
                continue
            first = start
            while first - 1 >= 0 and lines[first - 1].strip().startswith("#"):
                first -= 1
            drop.update(range(first, end + 1))
            changes.append(
                "removed a stale site block for "
                f"{key} (header: {header!r})"
            )
    if drop:
        lines = [line for idx, line in enumerate(lines) if idx not in drop]

    # 3. Point the global on_demand_tls ask endpoint at the preview gateway.
    global_span = next(
        (s for s in _top_level_spans(lines) if lines[s[0]].strip() == "{"),
        None,
    )
    if global_span is None:
        lines = ["{", "\ton_demand_tls {", "\t\task " + ask, "\t}", "}", ""] + lines
        changes.append(f"added the global on_demand_tls ask endpoint ({ask})")
    else:
        start, end = global_span
        ask_idx = next(
            (k for k in range(start, end + 1) if _ASK_LINE_RE.match(lines[k])),
            None,
        )
        if ask_idx is None:
            lines.insert(end, "\t\task " + ask)
            changes.append(f"added the on_demand_tls ask endpoint ({ask})")
        elif lines[ask_idx].strip() != "ask " + ask:
            previous = lines[ask_idx].strip()
            lines[ask_idx] = "\t\task " + ask
            changes.append(f"repointed on_demand_tls {previous} -> ask {ask}")

    # 4. (Re)install the managed preview wildcard block at the end of the file.
    while lines and lines[-1].strip() == "":
        lines.pop()
    if lines:
        lines.append("")
    lines.extend(_managed_block(wildcard, upstream))

    new_text = "\n".join(lines)
    if new_text.rstrip("\n") == text.rstrip("\n"):
        return text, []
    if not new_text.endswith("\n"):
        new_text += "\n"
    changes.append(f"installed the managed preview route ({wildcard} -> {upstream})")
    return new_text, changes


def _brace_balance(text: str) -> int:
    return text.count("{") - text.count("}")


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").split("\n")[0])
    parser.add_argument("--file", required=True, help="Caddyfile to reconcile in place")
    parser.add_argument("--wildcard", default=DEFAULT_WILDCARD)
    parser.add_argument("--upstream", default=DEFAULT_UPSTREAM)
    parser.add_argument("--ask", default=DEFAULT_ASK)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-backup", action="store_true")
    args = parser.parse_args(argv)

    if not os.path.isfile(args.file):
        print(f"reconcile-caddyfile: no such file: {args.file}", file=sys.stderr)
        return 2

    with open(args.file, "r", encoding="utf-8") as fh:
        text = fh.read()

    new_text, changes = reconcile(
        text,
        wildcard=args.wildcard,
        upstream=args.upstream,
        ask=args.ask,
    )

    if not changes:
        print("reconcile-caddyfile: already reconciled (no changes)")
        return 0

    for change in changes:
        print(f"reconcile-caddyfile: {change}")

    if _brace_balance(new_text) != 0:
        print(
            "reconcile-caddyfile: refusing to write an unbalanced Caddyfile "
            f"(brace balance {_brace_balance(new_text):+d})",
            file=sys.stderr,
        )
        return 3

    if args.dry_run:
        print("reconcile-caddyfile: dry run — nothing written")
        return 0

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d%H%M%S")
    backup = f"{args.file}.bak-preview-{stamp}"
    if not args.no_backup:
        shutil.copy2(args.file, backup)
        print(f"reconcile-caddyfile: backup written to {backup}")

    mode = stat.S_IMODE(os.stat(args.file).st_mode)
    tmp = f"{args.file}.reconcile.tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(new_text)
    os.chmod(tmp, mode)
    os.replace(tmp, args.file)
    print(f"reconcile-caddyfile: wrote {args.file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
