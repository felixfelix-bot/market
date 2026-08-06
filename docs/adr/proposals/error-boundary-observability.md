# docs(adr): propose error boundary strategy and production observability

> **Note:** This replaces #1177, which was accidentally closed when our fork was deleted and re-created. The branch and commits are identical. Conversation history is on #1177. Apologies to the team for the mix-up.

---

## Motivation

Two architectural gaps leave production completely blind.

1. **Zero React Error Boundaries** in the entire app (410 files audited). Any render error crashes the SPA to a white screen — no recovery UI, no fallback. The user has no way to recover except refreshing the page.

2. **Production console suppression is total.** `src/frontend.tsx:17-20` replaces ALL console methods (including `console.error`) with empty functions in production. When errors happen in production, nobody knows — not the user, not the developers, not any tracking system.

## What this ADR covers

- **Error boundary placement**: per-route (minimum), per-feature (high-risk areas), app-shell (safety net)
- **Production error reporting**: restore `console.error`, add privacy-preserving structured error reporting (error message + stack trace + route + version — explicitly NO user data, pubkeys, payment details, wallet state)
- **Floating promise policy**: ESLint `no-floating-promises` to catch 9+ unhandled rejections at build time
- **Current violations table**: specific missing-boundary locations, console suppression line, floating promises — removed as fixed

## Privacy approach

Error reports contain ONLY technical diagnostics:
- **Include**: error message, sanitized stack trace, route/URL (path only), app version, timestamp, boundary that caught it
- **Exclude**: user npub/pubkey, payment details, relay URLs, localStorage, wallet state, any PII

Implementation mechanism (self-hosted endpoint vs Sentry/GlitchTip vs Nostr-based) left open for team discussion.

@Franchovy @maximotodev — input welcome on:
1. Which error reporting mechanism fits the project (self-hosted, Sentry, or Nostr-based)
2. Whether per-feature boundaries are worth the overhead or per-route is sufficient
3. Whether `no-floating-promises` is too aggressive for contributors
