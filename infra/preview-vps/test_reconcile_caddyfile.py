#!/usr/bin/env python3
"""Unit tests for infra/preview-vps/reconcile_caddyfile.py.

Hermetic (ADR-0005): pure text in, pure text out — no network, no caddy binary,
no VPS. The fixtures mirror the real shared Caddyfile that broke the preview
deploys on 2026-09-11 (legacy `*.test-market.orangesync.tech` block proxying to
the nsite gateway on localhost:3002, and a legacy on_demand_tls ask endpoint on
127.0.0.1:6798).

Run:  python3 -m pytest infra/preview-vps/test_reconcile_caddyfile.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parent),
)

import reconcile_caddyfile as rc  # noqa: E402


# The real file, reduced to the blocks that matter.
LEGACY_CADDYFILE = """{
\ton_demand_tls {
\t\task http://127.0.0.1:6798/
\t}
}

# Market aggregator relay (strfry) - WoT-gated
market-agg.orangesync.tech {
\treverse_proxy localhost:7779
}

# nsite gateway - on-demand TLS for npub subdomains
*.nsite.orangesync.tech {
\ttls {
\t\ton_demand
\t}
\treverse_proxy localhost:3002
}

# Preview deployments - on-demand TLS for per-PR subdomains
# Per-PR routes are injected dynamically by the preview-deploy workflow.
# This wildcard catches any pr{N}.test-market.orangesync.tech that does not
# have a specific route and proxies to the nsite gateway as a fallback.
*.test-market.orangesync.tech {
\ttls {
\t\ton_demand
\t}
\treverse_proxy localhost:3002
}

# BEGIN MANAGED ROUTES (per-PR Caddy routes injected by workflow)
# END MANAGED ROUTES

# Routstr AI proxy
ai.orangesync.tech {
\treverse_proxy localhost:8010

\theader {
\t\tX-Content-Type-Options "nosniff"
\t}

\trequest_body {
\t\tmax_size 10MB
\t}
}
"""


def _blocks(text: str) -> list[str]:
    lines = text.split("\n")
    return [lines[start].strip() for start, _ in rc._top_level_spans(lines)]


# ── the observed failure: legacy wildcard → nsite gateway ─────────────────────

def test_replaces_legacy_nsite_wildcard_with_preview_gateway():
    new, changes = rc.reconcile(LEGACY_CADDYFILE)

    # The canonical block is present exactly once and dials the preview gateway.
    assert new.count("*.test-market.orangesync.tech {") == 1
    assert "reverse_proxy localhost:6799" in new
    # The legacy nsite-gateway wildcard route is gone (the nsite block is not).
    assert new.count("reverse_proxy localhost:3002") == 1
    assert "*.nsite.orangesync.tech" in new
    assert rc.MARK_BEGIN in new and rc.MARK_END in new
    # The stale explanatory comments go with the block they described.
    assert "proxies to the nsite gateway as a fallback" not in new
    assert any("stale site block" in c for c in changes)
    assert any("installed the managed preview route" in c for c in changes)


def test_removes_legacy_per_pr_block_too():
    text = LEGACY_CADDYFILE.replace(
        "*.test-market.orangesync.tech {",
        "pr4.test-market.orangesync.tech {",
    )
    new, changes = rc.reconcile(text)
    assert "pr4.test-market.orangesync.tech" not in new
    assert any("stale site block" in c for c in changes)
    assert new.count("reverse_proxy localhost:6799") == 1


def test_repoints_legacy_on_demand_tls_ask_endpoint():
    new, changes = rc.reconcile(LEGACY_CADDYFILE)
    assert "ask http://127.0.0.1:6799/ask" in new
    assert "6798" not in new
    assert any("repointed on_demand_tls" in c for c in changes)


def test_adds_ask_endpoint_when_global_block_has_none():
    text = "{\n\temail admin@example.com\n}\n\nfoo.example.com {\n\treverse_proxy localhost:1\n}\n"
    new, changes = rc.reconcile(text)
    assert "ask http://127.0.0.1:6799/ask" in new
    assert "\temail admin@example.com" in new
    assert any("added the on_demand_tls ask" in c for c in changes)


def test_adds_global_block_when_missing():
    text = "foo.example.com {\n\treverse_proxy localhost:1\n}\n"
    new, changes = rc.reconcile(text)
    assert new.startswith("{\n\ton_demand_tls {\n\t\task http://127.0.0.1:6799/ask")
    assert "foo.example.com {" in new
    assert any("added the global on_demand_tls" in c for c in changes)


# ── the shared box survives ───────────────────────────────────────────────────

def test_preserves_every_unrelated_block_byte_for_byte():
    new, _ = rc.reconcile(LEGACY_CADDYFILE)
    for block in (
        "market-agg.orangesync.tech {",
        "*.nsite.orangesync.tech {",
        "ai.orangesync.tech {",
        "# BEGIN MANAGED ROUTES (per-PR Caddy routes injected by workflow)",
        "\t\tmax_size 10MB",
        'X-Content-Type-Options "nosniff"',
    ):
        assert block in new
    # Nested braces inside preserved blocks are untouched.
    assert new.count('max_size 10MB') == 1
    assert rc._brace_balance(new) == 0


def test_idempotent_second_run_reports_no_changes():
    first, changes = rc.reconcile(LEGACY_CADDYFILE)
    assert changes
    second, changes2 = rc.reconcile(first)
    assert changes2 == []
    assert second == first


def test_upgrades_a_previous_managed_region_with_wrong_upstream():
    text = (
        "{\n\ton_demand_tls {\n\t\task http://127.0.0.1:6799/ask\n\t}\n}\n\n"
        + rc.MARK_BEGIN
        + "\n*.test-market.orangesync.tech {\n\treverse_proxy localhost:3002\n}\n"
        + rc.MARK_END
        + "\n"
    )
    new, changes = rc.reconcile(text)
    assert new.count("reverse_proxy localhost:3002") == 0
    assert new.count("reverse_proxy localhost:6799") == 1
    assert any("managed preview region" in c for c in changes)


# ── CLI ───────────────────────────────────────────────────────────────────────

def test_cli_writes_file_and_backs_up(tmp_path):
    target = tmp_path / "Caddyfile"
    target.write_text(LEGACY_CADDYFILE)

    rc.main(["--file", str(target)])

    written = target.read_text()
    assert "reverse_proxy localhost:6799" in written
    assert written.count("reverse_proxy localhost:3002") == 1
    backups = list(tmp_path.glob("Caddyfile.bak-preview-*"))
    assert len(backups) == 1
    assert backups[0].read_text() == LEGACY_CADDYFILE
    # Mode is preserved and the file survives a second (no-op) run.
    rc.main(["--file", str(target)])
    assert target.read_text() == written


def test_cli_dry_run_writes_nothing(tmp_path):
    target = tmp_path / "Caddyfile"
    target.write_text(LEGACY_CADDYFILE)
    rc.main(["--file", str(target), "--dry-run"])
    assert target.read_text() == LEGACY_CADDYFILE
    assert list(tmp_path.glob("Caddyfile.bak-preview-*")) == []


def test_cli_missing_file_exits_2(tmp_path):
    assert rc.main(["--file", str(tmp_path / "nope")]) == 2


def test_cli_reports_no_change_on_pristine_reconciled_file(tmp_path):
    clean, _ = rc.reconcile(LEGACY_CADDYFILE)
    target = tmp_path / "Caddyfile"
    target.write_text(clean)
    assert rc.main(["--file", str(target)]) == 0
    assert list(tmp_path.glob("Caddyfile.bak-preview-*")) == []
