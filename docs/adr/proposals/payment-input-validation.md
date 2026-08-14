# Untrusted Input Validation in Payment Flows

## Status

Proposal — not yet surfaced to team

## Problem

`ZapPurchaseManager.generateInvoice()` receives a client-supplied `zapRequest` (a Nostr event) and, before the fix in PR #1118, trusted the event's `pubkey` and `tags` without verifying the cryptographic signature. A malicious client could forge a zap request with any pubkey and arbitrary tags — claiming to be another user, injecting fake `lnurl` metadata, or manipulating payment routing fields. The invoice would be generated against forged inputs, and the downstream payment state would reflect an event that was never actually signed by the purported author.

This is a server-side trust boundary failure. The rule in Nostr is that every relay and every server-side consumer verifies event signatures before trusting any field — `pubkey`, `tags`, `content`. The server cannot know whether a client constructed the event honestly or fabricated it; the signature is the only proof. Skipping verification means the server treats attacker-controlled bytes as authenticated identity, which is exactly the failure mode signatures exist to prevent.

The payment-lifecycle constraint in the repo's `AGENTS.md` is relevant here: _"Do not collapse payment lifecycles into booleans. Keep requested, attempted, wallet acknowledged, settled/proven, receipt published, merchant confirmed, expired, failed, refunded, and fulfilled states distinct."_ Adding a verification gate introduces a new rejection path (`signature verification failed → 400`), and the ADR should clarify whether that rejection is a distinct payment state or a pre-lifecycle input validation gate. The latter is correct — verification happens _before_ any payment state is entered — but it should be stated explicitly so the lifecycle model stays clean.

## Proposed Approach

Make `verifyEvent()` mandatory for every client-supplied event before any payment state transition. The check uses `nostr-tools/pure`'s `verifyEvent()` — the standard Nostr signature verification function — and fails closed:

```typescript
// In ZapPurchaseManager.generateInvoice(), after parsing zapRequest:
if (!verifyEvent(zapRequest as unknown as Event)) {
	throw new ZapInvoiceError('zapRequest signature verification failed', 400)
}
```

Verification covers the full event: `id`, `pubkey`, `signature`, `kind`, `created_at`, `tags`, `content`. Malformed events (missing fields, wrong length) return `false` from `verifyEvent()` and are rejected. The rejection happens before any payment state is entered, so the payment lifecycle is unaffected — the gate sits _in front of_ the lifecycle, not inside it.

Beyond signature verification, the server should also validate event _shape_: expected `kind`, expected `pubkey` (matches the authenticated session where applicable), required `tags` (e.g. `amount`, `lnurl`, `p`), and a `content` schema where the content carries structured data. Signature verification proves _who_ signed; shape validation proves _what_ they signed. Both are needed — a correctly signed event of the wrong kind, or with missing payment tags, is still invalid for the payment flow even though its signature is authentic.

The test suite (`ZapPurchaseManager.signature.test.ts`, 218 lines) covers valid signed requests passing, unsigned events rejected, tampered signatures rejected, and missing-field events rejected. A `toWire()` helper JSON-round-trips events to strip `nostr-tools`' `Symbol("verified")` cache — this mirrors how requests actually arrive over HTTP (as JSON bodies), since `JSON.parse` strips symbol-keyed properties. Without `toWire()`, an in-process mutated event would still verify against the cached symbol, hiding the very attack the test is meant to catch.

## Decision Points

- **Verification gate vs payment state**: confirm that signature verification is an input validation gate that _precedes_ the payment lifecycle, not a new payment state. The lifecycle states (requested, attempted, acknowledged, settled, etc.) begin only after verification passes. This keeps the lifecycle model in `AGENTS.md` intact.
- **Blanket rule scope**: should this ADR establish that **all** client-supplied events processed server-side must be signature-verified, not just payment events? Other surfaces that accept client events: event submission endpoints, comment/reaction submission, profile updates, auction lifecycle events. Payment-specific verification is the minimum; a blanket rule is the safer default.
- **Shape validation strictness**: alongside signature verification, how strictly do we validate event shape? Require specific `kind`, `pubkey` matching the session, mandatory tags, and a `content` schema? Or signature-only and let downstream code reject malformed payloads?
- **`verifyEvent()` placement**: verify once at the request boundary (current), or re-verify at each state transition? Once at the boundary is sufficient and cheaper; re-verification is defense-in-depth but redundant if the boundary is trusted.
- **Error response shape**: `400` with `'signature verification failed'` (current), or a more generic error to avoid signaling to an attacker which field failed? For a public Nostr relay, signaling signature failure is standard; for a payment endpoint, less detail may be preferable.
- **Rate limiting on verification failures**: repeated forged-event attempts from the same client — block, rate-limit, or just log? Verification is cheap, but a flood of invalid events could be a DoS vector.

## Dependencies

- PR #1118 — contains the `verifyEvent()` integration in `ZapPurchaseManager.ts` and the 218-line test suite. These changes are standard security fixes and can merge without waiting for the full ADR; the ADR ratifies the blanket-verification rule and the lifecycle-gate decision.
- Reference branch: `security/zap-sig-verification` (or `adr-input-validation-h1h2`) in the `felixfelix-bot/market` fork.
- No upstream library or architecture dependency — `nostr-tools/pure` is already in the dependency tree.

## Related

- PR #1118 — implementation (`src/server/ZapPurchaseManager.ts`, `src/server/__tests__/ZapPurchaseManager.signature.test.ts`)
- Issue #996 — security audit findings (finding H2)
- [Security Remediation Strategy](./security-remediation-strategy.md) — categorizes signature verification as a direct-implementation item; this ADR ratifies the broader rule
- [Relay WebSocket Origin Validation Policy](./websocket-origin-validation.md) — companion server-side trust-boundary proposal (H1), originally bundled with this change in PR #1118
- Repo `AGENTS.md` — payment lifecycle state constraint
