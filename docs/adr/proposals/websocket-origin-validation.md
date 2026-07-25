# Relay WebSocket Origin Validation Policy

## Status
Proposal — not yet surfaced to team

## Problem

The Plebeian Market relay (`wss://relay.plebeian.market`) accepts WebSocket connections without validating the `Origin` header. This enables cross-site WebSocket hijacking (CSWSH): a user logged into Plebeian visits `evil.com`, which opens `new WebSocket("wss://relay.plebeian.market")`. The browser attaches the user's session context to the handshake, and the attacker now holds a relay connection authenticated as the victim. From there they can read the victim's events, inject events on their behalf, or drive any relay-mediated workflow.

CSWSH is on the OWASP cheat sheet for a reason — the WebSocket API does not enforce the same-origin policy by default, and `Origin` is the only signal the server has about which page opened the socket. Ignoring it means any origin is trusted by default, which is the wrong default for a relay that carries signed events and payment-adjacent traffic.

The fix implemented in PR #1074 (finding H1) is mechanically simple — read `Origin`, compare it to an allowlist or the `Host` header, reject otherwise. The hard part is the **access-control policy**, not the code. Several decisions affect who can use the relay and how, and those decisions should be made explicitly rather than emerging by accident from a code review.

## Proposed Approach

Add an `Origin` validation gate in the WebSocket upgrade path of the Bun server. The logic lives in a pure module (`src/lib/security/webSocketOrigin.ts`) so it can be unit-tested without a server:

- **Non-browser clients (no `Origin` header)** → allowed. Bots, crawlers, monitoring tools, and server-to-server relay sync do not send `Origin`; blocking them would break federation and operational tooling.
- **Browser clients with `Origin` matching `ALLOWED_ORIGINS` env var** → allowed. Operators maintain an explicit allowlist (`https://plebeian.market`, staging, auctions subdomain if separate).
- **Browser clients with `Origin` matching the `Host` header (same-origin)** → allowed. Covers the common case of the app connecting to its own relay without requiring configuration.
- **Everything else** → rejected with `403 Forbidden` and an explanatory message.

The same-origin check must use proper URL parsing (compare the origin's host against the `Host` header), not `String.includes(host)`. The latter is bypassable: `evil-plebeian.market` would match a host check for `plebeian.market`. This is flagged in the implementation but should be ratified by the ADR.

## Decision Points

- **Allowlist management**: env var only (current), hardcoded production list with env override, or a dynamic registration mechanism? The env var approach puts the burden on operators to keep the list current.
- **Production origin set**: which exact origins go in `ALLOWED_ORIGINS` for production? At minimum `https://plebeian.market`; does `auctions.plebeian.market` exist as a separate frontend? Is staging on a subdomain?
- **NIP-46 bunker handling**: browser-based bunkers (extensions, web signers) send an `Origin`. Should known bunker implementations be whitelisted, or should kind-24133 (NIP-46 request) events be exempted from origin checks? Blocking bunkers silently would be a regression.
- **Localhost policy**: auto-allow `localhost` / `127.0.0.1` origins for development, or require explicit configuration? Auto-allow reduces dev friction but is a special case in production-path code.
- **Same-origin heuristic correctness**: ratify that the check uses URL parsing, not `String.includes`. Edge cases like subdomain spoofing must be tested.
- **Tor / onion service origins**: if Plebeian is reachable via a `.onion` address, that origin is `http://xxxxx.onion`. Include it in the allowlist, or serve Tor from a separate relay endpoint?
- **Error response shape**: `403` with an explanatory body (current), or silent connection drop? An explanatory body helps legitimate clients debug; a silent drop leaks less information.
- **Rate limiting on rejected upgrades**: blocking is sufficient for correctness, but a rotating-origin attacker can hammer the handshake endpoint. Is a connection-attempt rate limit needed alongside the origin check?

## Dependencies

- PR #1074 — contains the implementation (`src/lib/security/webSocketOrigin.ts`) and tests (`src/lib/security/__tests__/webSocketOrigin.test.ts`, 7 tests). The code is ready; this ADR gates the policy decisions before it merges.
- Coordination with whoever operates the relay in production, to confirm the canonical `ALLOWED_ORIGINS` value and whether NIP-46 / Tor paths are in active use.

## Related

- PR #1074 (finding H1) — implementation
- PR #1118 — earlier bundled version of the same change
- Issue #996 — security audit findings
- [Security Remediation Strategy](./security-remediation-strategy.md) — categorizes this as a Track A (ADR-gated) item
- [Untrusted Input Validation in Payment Flows](./payment-input-validation.md) — companion proposal that also ratifies the WebSocket origin gate from the payment-flow side
- OWASP: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_WebSocket_Hijacking_Prevention_Cheat_Sheet.html>
- Implementation: `src/lib/security/webSocketOrigin.ts`
- Tests: `src/lib/security/__tests__/webSocketOrigin.test.ts`
