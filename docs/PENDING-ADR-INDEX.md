# Pending ADR Index — For Team Discussion

This document lists architectural decisions that have been drafted but not yet
formally reviewed by the team. Each item was previously opened as a separate PR
and closed to reduce notification noise. This index serves as a single entry
point for discussion before reopening any of them as formal PRs.

**Maintainer:** Please review the summaries below and let us know which ones to
surface as formal PRs for merge discussion.

---

## 1. E2E Test Stabilization Strategy

**Original PR:** #1181 (closed, content preserved)
**Title:** ADR: propose e2e test stabilization strategy

**Problem:** 20 e2e spec files with unpredictable failures. Root causes:
`networkidle` never resolves (NDK WebSocket), auth hydration races, relay
propagation timing, NWC wallet state seeding.

**Proposes:**
- Replace all `waitForLoadState("networkidle")` with `domcontentloaded` + element
  visibility assertion
- Test unskip protocol: 3 consecutive passing runs + cold restart before
  unskipping
- Skip comment policy: every `.skip` must explain why
- PR review readiness rule: behavior-changing PRs must include Playwright
  happy-path video
- 5-phase implementation prioritized by unblock potential

**Discussion points:**
- Is the happy-path video requirement practical for the team?
- Does the 5-phase prioritization match the team's view?
- Where should ADR numbering go? (gap: 0001, 0002, then 013, 014)

**Related:** #1116 (e2e reliability mega-PR, to be split), ADR-015

---

## 2. Relay Data Validation Enforcement

**Original PR:** #1182 (closed, content preserved)
**Title:** ADR: propose relay data validation enforcement

**Problem:** 9 query files doing raw `JSON.parse(event.content)` with zero
schema validation. 3 component files doing the same in render paths (crashes
the SPA on malformed data). Only 4 `safeParse()` calls vs 59 raw `.parse()`.
Only 9 Zod schema files for ~25+ Nostr kinds consumed.

**Security relevant:** relays accept events from anyone. Malformed or
adversarial events can crash queries, poison component state, or cause
render-time exceptions.

**Proposes:**
- All `event.content` parsing MUST go through Zod `safeParse` before entering
  query results or component state
- ESLint custom rule + code review checklist for enforcement
- Migration path: schema files added per Nostr kind, prioritized by criticality
  (payment kinds first)
- ADR uses two-section pattern: permanent rule + transient violation table

**Discussion points:**
- `safeParse` (graceful degradation) vs `parse` (throw on invalid) — which
  default?
- Strict schema (reject unknown fields) vs passthrough (validate known, allow
  extras)?
- Is the ESLint enforcement approach feasible?

**Related:** AGENTS.md "Treat relay data as untrusted until validated"

---

## 3. Error Boundary Strategy and Production Observability

**Original PR:** #1183 (closed, content preserved)
**Title:** ADR: propose error boundary strategy and production observability

**Problem:** Two architectural gaps leave production completely blind:
1. Zero React Error Boundaries in 410 audited files — any render error crashes
   the SPA to white screen with no recovery UI
2. Production console suppression is total — `frontend.tsx:17-20` replaces ALL
   console methods including `console.error` with empty functions

**Proposes:**
- Error boundary placement: per-route (minimum), per-feature (high-risk), app-shell (safety net)
- Restore `console.error` in production; add privacy-preserving structured
  error reporting (error message + stack + route + version — NO user data,
  pubkeys, payment details, wallet state)
- ESLint `no-floating-promises` to catch 9+ unhandled rejections at build time

**Discussion points:**
- Which error reporting mechanism fits? (self-hosted endpoint, Sentry/GlitchTip,
  Nostr-based)
- Per-feature boundaries vs per-route only — worth the overhead?
- Is `no-floating-promises` too aggressive for contributors?

---

## Already In Review (NOT part of this index)

These ADRs are already open as PRs with active discussion and are NOT included
in this index:

- **#1178** — Phase enums (state machines vs parallel boolean flags)
- **#1179** — Store layer dependency rules
- **#1180** — NIP-53 status resolver (code PR)
- **#1184** — NIP-53 chat reactions (code PR)
- **#1185** — NIP-53 CVM commentator (code PR)

---

## How to Use This Index

1. Review the three proposals above
2. For each, decide: **surface as PR** / **discuss further** / **defer**
3. We will reopen only the ones you select as individual focused PRs
4. Each reopened PR can be reviewed and merged independently
