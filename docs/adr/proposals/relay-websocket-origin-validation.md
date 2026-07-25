# docs(adr): propose relay WebSocket origin validation policy (H1)

> **Note:** Extracted from the closed PR #1118 bundle and the H1 finding in #1074. Code lives on branch `security/relay-origin-validation` in the `felixfelix-bot/market` fork. Detailed handover: `~/work/adrs/unique/03_Handover__ADR__Relay_WebSocket_Origin_Validation_Policy.md`.

---

## Motivation

The Plebeian Market relay (`wss://relay.plebeian.market`) accepts WebSocket upgrade requests without validating the `Origin` header. This enables cross-site WebSocket hijacking (CSWSH):

1. User is logged into Plebeian in browser tab A.
2. User visits `evil.com` in tab B.
3. `evil.com` runs `new WebSocket("wss://relay.plebeian.market")`.
4. The browser attaches the victim's session cookies/auth to the WebSocket handshake.
5. Attacker now holds a relay connection authenticated as the victim — can read their feed, post as them, or drive any relay-gated flow.

OWASP classifies missing Origin validation on WebSocket endpoints as a known anti-pattern. The fix shipped in #1074 (finding H1) is straightforward; the **access control policy** around it is not.

## What this ADR covers

- **Rule**: WebSocket upgrade requests MUST validate the `Origin` header against an allowlist plus a same-origin heuristic.
- **Module**: `src/lib/security/webSocketOrigin.ts` — pure functions `getAllowedOrigins()` and `isWebSocketOriginAllowed(origin, host)`.
- **Heuristic**:
  - Non-browser clients (no `Origin` header) → allowed (bots, relay-to-relay sync, programmatic tools).
  - Browser clients with `Origin` in `ALLOWED_ORIGINS` env var → allowed.
  - Browser clients where `Origin` host matches `Host` header → allowed (same-origin).
  - Everything else → rejected with HTTP 403.
- **Tests**: `src/lib/security/__tests__/webSocketOrigin.test.ts` — 7 tests covering no-origin allow, cross-origin block, same-origin allow, allowlist positive/negative, malformed origin, parsing.
- **Integration**: `src/index.tsx` server `fetch()` handler calls `isWebSocketOriginAllowed(req)` before `server.upgrade(req)`.

## Open decision points

@Franchovy @maximotodev — input welcome on each:

1. **Allowlist management.** Env var (current), hardcoded constants, dynamic registration, or combination? Env var pushes operational burden onto deploy configs; a hardcoded list drifts across staging/prod. Recommendation: env var with a documented default set (`plebeian.market`, `staging.plebeian.market`, `auctions.plebeian.market`).

2. **NIP-46 bunker compatibility.** Browser-based bunkers (NIP-46 remote signers running as extensions or web apps) send an `Origin` header. If their origin isn't allowlisted, every bunker connection breaks. Options: (a) whitelist known bunker implementations, (b) exempt kind-24133 events from origin checks, (c) document that bunkers must use a whitelisted frontend. NIP-46 compatibility is a hard constraint — pick before merge.

3. **Localhost dev mode.** Auto-allow `localhost`/`127.0.0.1` origins unconditionally? Reduces dev friction but creates a production footgun if the dev branch logic leaks. Recommendation: auto-allow only when `NODE_ENV !== 'production'`.

4. **Same-origin parsing fix.** The current `origin.includes(host)` heuristic is vulnerable: `evil-plebeian.market` would match a host of `plebeian.market`. The ADR should mandate proper URL parsing (`new URL(origin).host === host`) rather than substring matching. This is a correctness bug in the existing implementation, not a policy choice — flag it explicitly.

5. **Tor `.onion` support.** If Plebeian is reachable via a Tor onion service, origins look like `http://xxxxx.onion`. Include onion addresses in the allowlist, or document that Tor access uses a separate relay endpoint?

6. **Error response format.** Current implementation returns 403 with `"Forbidden: WebSocket origin not allowed"`. Alternatives: silent connection drop, or generic 403 without reason string (less info leakage). Tradeoff is debuggability vs. attacker reconnaissance.

7. **Programmatic browser-based access.** A web-based nostr bot or in-browser relay sync tool sends an `Origin` and gets blocked. Is "no Origin = allowed" sufficient, or do we need an explicit API token path for browser-based programmatic clients?

## Dependencies

- **NIP-46** (bunker compat — see decision point 2)
- **NIP-47** (NWC wallet connections may also originate from browser contexts)
- Bun WebSocket upgrade API (`server.upgrade()`)

## Related

- PR #1074 (finding H1 — original audit)
- PR #1118 (closed — bundled fix, superseded by ADR-driven approach)
- Issue #996 (security audit findings)
- Implementation branch: `felixfelix-bot/market@security/relay-origin-validation`
- OWASP CSWSH Prevention Cheat Sheet
- Companion proposal: [`payment-input-validation.md`](./payment-input-validation.md) (H2 — same PR bundle)

## Reference implementation

The code on `security/relay-origin-validation` is merge-ready once the ADR settles the decision points above. The pure module pattern (`webSocketOrigin.ts`) keeps the policy testable independently of the server entry point.
