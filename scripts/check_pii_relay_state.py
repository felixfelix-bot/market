#!/usr/bin/env python3
"""Query the local nak relay for kind 16 (order) events that carry PII,
grouped by the e2e fixture users. Used to confirm the PII-modal relay state."""
import subprocess, json, sys

RELAY = "ws://localhost:10547"
USERS = {
    "devUser1(merchant)": "86a82cab18b293f53cbaaae8cdcbee3f7ec427fdf9f9c933db77800bb5ef38a0",
    "devUser2(buyer)":    "d943e96d62695b318a9c0658a3bd3fafaaf441a069d8bfd04dc9ff39c69cc782",
    "devUser3(new)":      "2edec1b799cd2f41f70a5ff0edc10d2260a57d62f39072aab4eb8174b7ca912a",
}
PII_TAGS = {"name", "phone", "email", "address", "delivery", "firstlineofaddress",
            "city", "zippostcode", "country", "contact"}

for label, pk in USERS.items():
    filt = json.dumps({"kinds": [16], "authors": [pk], "limit": 100})
    try:
        out = subprocess.run(
            ["nak", "req", RELAY, filt],
            capture_output=True, text=True, timeout=20,
        )
    except Exception as ex:
        print(f"{label}: query error {ex}")
        continue
    pii_count = 0
    total = 0
    for line in out.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        e = obj.get("event", obj) if isinstance(obj, dict) else {}
        if e.get("kind") != 16:
            continue
        total += 1
        tag_names = {t[0].lower() for t in e.get("tags", []) if t}
        has_pii = bool(tag_names & PII_TAGS) or any(
            k in (e.get("content") or "").lower() for k in ("phone", "email", "@", "address")
        )
        if has_pii:
            pii_count += 1
    print(f"{label}: {total} kind-16 events, {pii_count} with PII indicators")
