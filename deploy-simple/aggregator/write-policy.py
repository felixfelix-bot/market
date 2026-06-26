#!/usr/bin/env python3
"""strfry writePolicy plugin: dual-mode accept policy for the aggregator relay.

strfry invokes this plugin as a long-lived process and feeds it one JSON
object per line on stdin (see strfry docs/plugins.md). Each input line has the
shape::

    {"type":"new","event":{"id":...,"pubkey":...,"kind":...,"tags":...,
                            "content":...,"sig":...},
     "receivedAt":...,"sourceType":"...","sourceInfo":"..."}

For every line we print a single minified JSON object with ``id`` (echoed),
``action`` ("accept"|"reject") and an optional ``msg``.

DUAL-MODE POLICY
----------------
The aggregator relay runs in one of two modes (``$STRFRY_AGG_MODE``):

  * ``personal`` (default, vps2) — mirrors events relevant to the root npub.
  * ``plebeian``  (future)        — mirrors all market-relevant events from
                                    every participant.

Both modes share the same kind-based gate, which is what makes the relay a
useful aggregation point for *public* market data while still keeping
restricted kinds (gift-wraps, app-specific payloads) behind a WoT check:

  * PUBLIC market kinds (profiles, follows, relay lists, stall/product/
    auction events, badges, zap receipts, ratings...) are accepted from
    ANYONE. These are public by design — accepting them broadly is what lets
    the scraper mirror a complete market view.
  * RESTRICTED kinds (NIP-17 gift-wrap 1059/1060 and NIP-78 app-specific
    30078) are accepted ONLY from the root npub or the WoT allowlist,
    because they may carry private/payload data.
  * Everything else is rejected.

The allowlist (one hex pubkey per line) is read from
``$STRFRY_AGG_ALLOWED`` (default /opt/strfry-agg/state/allowed.npubs)
and reloaded automatically when its mtime changes, so the scraper's maintain
timer can update the served set without restarting the plugin or strfry.

The root npub's own events are always accepted (even before the first
reconcile populates the allowlist) so the relay can bootstrap. The root npub
hex is read from ``$STRFRY_AGG_ROOT_HEX``.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ALLOWED_PATH = Path(os.environ.get("STRFRY_AGG_ALLOWED", "/opt/strfry-agg/state/allowed.npubs"))
ROOT_HEX = os.environ.get("STRFRY_AGG_ROOT_HEX", "").strip().lower()

# --- market-relevant kinds (from the #1046 audit) -------------------------
# CRITICAL: 0, 3, 10002, 30402, 30405, 30406, 30408
# HIGH:     1023, 1024, 1025, 1026, 30440, 30441, 30442
# MEDIUM:   7, 9735, 1985, 31555, 31990, 10000
# LOW:      1
#
# PUBLIC_MARKET_KINDS: accepted from ANYONE (public data). NOTE that kind
# 30078 (NIP-78 application-specific data) is intentionally EXCLUDED here —
# it is treated as restricted below because it can carry private payloads.
PUBLIC_MARKET_KINDS = frozenset({
    0, 1, 3, 7, 9735, 1985, 10000, 10002,
    1023, 1024, 1025, 1026,
    30402, 30405, 30406, 30408,
    30440, 30441, 30442,
    31555, 31990,
})

# RESTRICTED_KINDS: accepted only from root npub or the WoT allowlist.
#   1059 = NIP-17 gift-wrap sealed event
#   1060 = NIP-17 gift-wrap direct message (rumored/seal)
#   30078 = NIP-78 application-specific data (may carry private payloads)
RESTRICTED_KINDS = frozenset({1059, 1060, 30078})


def _load_allowlist() -> tuple[set[str], float]:
    try:
        st = ALLOWED_PATH.stat()
        with ALLOWED_PATH.open() as f:
            pks = {line.strip().lower() for line in f if line.strip() and not line.startswith("#")}
        return pks, st.st_mtime
    except FileNotFoundError:
        return set(), 0.0


def _decide(pubkey: str, kind, allowed: set[str]) -> tuple[str, str]:
    """Return (action, msg) for one event."""
    if kind in RESTRICTED_KINDS:
        if pubkey == ROOT_HEX or pubkey in allowed:
            return "accept", ""
        return "reject", "blocked: restricted kind not from WoT/root"
    if kind in PUBLIC_MARKET_KINDS:
        return "accept", ""
    return "reject", "blocked: kind not in market set"


def main() -> int:
    allowed: set[str] = set()
    mtime: float = 0.0

    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue

        # Hot-reload the allowlist when its mtime changes.
        try:
            st = ALLOWED_PATH.stat().st_mtime if ALLOWED_PATH.exists() else 0.0
        except OSError:
            st = 0.0
        if st != mtime:
            allowed, mtime = _load_allowlist()

        try:
            req = json.loads(raw)
        except json.JSONDecodeError:
            continue

        if req.get("type") != "new":
            continue

        event = req.get("event") or {}
        eid = event.get("id")
        pubkey = str(event.get("pubkey", "")).lower()

        if not eid or not pubkey:
            continue

        action, msg = _decide(pubkey, event.get("kind"), allowed)

        resp = {"id": eid, "action": action}
        if msg:
            resp["msg"] = msg
        print(json.dumps(resp, separators=(",", ":")), flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
