# HANDOVER C — ADR Decisions Brief

**Date:** 2026-07-23
**From:** Team Call — Plebeian Market
**Classification:** Internal Planning Document

---

## 1. CVM Pubkey Derivation — ADR Outline

### Background

The CVM server needs a Nostr identity to sign live activity events (NIP-53,
kind 30311), auction verdicts, and MCP transport messages. How this identity
is derived from environment configuration involves security-critical decisions
that are currently undocumented.

### What the code actually does (verified)

Two independent keys, NOT a single derivation chain:

**Key 1: App identity (Bun web server)**
- `APP_PRIVATE_KEY` (env var, hex) → `getPublicKey()` → `appPublicKey`
- Used for: `/api/config`, app settings, event handler identity
- File: `src/server/runtime.ts:20`, `src/server/startup.ts:4,13-21`
- NO derivation relationship to CVM keys in current code

**Key 2: CVM server identity**
- `CVM_SERVER_KEY` (env var, hex private key) → `getPublicKey()` → CVM server pubkey
- This is the ONLY genuine cryptographic derivation step
- The CVM server pubkey is resolved via a tiered fallback:
  - Tier 1: `CVM_CURRENCY_SERVER_PUBLIC_KEY` / `CURRENCY_SERVER_PUBKEY` (explicit, service-specific)
  - Tier 2: `CVM_SERVER_PUBLIC_KEY` / `CVM_SERVER_PUBKEY` (explicit, general)
  - Tier 3: `getPublicKey(CVM_SERVER_KEY)` (derive from private key)
  - Tier 4: THROW (no hardcoded fallback, no silent default)
- File: `src/lib/cvm-identity.ts:22-35`, `src/server/runtime.ts:52-65`

**"Live activity pubkey" = CVM server pubkey**
- NOT a separately derived key. The same CVM server signer signs kind-30311 events.
- The live activity coordinate format: `30311:<cvm-server-pubkey>:<d-tag>`
- Browser trusts live activity events ONLY from the configured CVM pubkey
  (fail-closed: `src/queries/liveChat.tsx:30-43`)
- The d-tag is derived from the auction coordinate: `auction:<seller-pubkey-16hex>:<auction-d>`
  (`src/lib/nip53.ts:76-81`)

### ADR outline

```
# ADR-XXX: CVM Server Identity & NIP-53 Pubkey Model

## Context
- CVM server requires a Nostr identity for NIP-53 live activities, auction
  verdicts, and MCP transport
- Identity is configured via env vars with a tiered resolution fallback
- No documented decision on key separation, rotation, or trust model

## Decision
1. Key separation: APP_PRIVATE_KEY and CVM_SERVER_KEY are independent identities.
   The app server and CVM server MUST use different keys. Historical guard
   (rejecting CVM key = app key) was removed — should be restored.
2. Pubkey resolution: tiered fallback (explicit > derived > throw).
3. Live activity ownership: CVM server owns kind-30311 events (signs as author).
   Seller is referenced via tags, not as event author.
4. Client trust model: browser ONLY accepts kind-30311 from configured CVM pubkey.
   Fail-closed if pubkey missing.
5. Key rotation: CVM_SERVER_KEY can be rotated by updating env + restarting CVM.
   Old live activity events remain valid (signed by old key) until expiry.

## Invariants
- CVM server identity ≠ app server identity (never share keys)
- No hardcoded default pubkeys (fail-closed)
- Live activity events MUST be signed by the configured CVM server key
- Browser MUST verify event author = configured CVM pubkey

## Consequences
### Positive
- Clear separation of concerns between app and CVM identity
- Fail-closed prevents unauthorized live activities
- Rotation is straightforward (env + restart)

### Costs
- Two keys to manage operationally
- Key rotation invalidates in-flight live activity events
- Requires /api/config to serve CVM pubkey to browser (coupling)
```

### Open questions for operator
1. Should the app key = CVM key guard be restored (historically existed, was removed)?
2. Should there be a key derivation hierarchy (e.g., CVM key = HD child of app key) or should they remain fully independent?
3. What happens to live activity history when CVM key rotates?

---

## 2. ADR-015 Deprioritization + Staging Relay Strategy

### Decision from call

maximotodev's ADR-015 (PR #1174, relay persistence and staging recovery) is DEPRIORITIZED. No ADR. The relay is staging infrastructure — not a unique source of truth. Events can be re-fetched from the network.

### Staging relay strategy: "Yolo-nuke"

When staging relay search index/data is corrupted or stale:
1. DELETE the search index and relay data (it's staging, not production)
2. Restart the relay
3. Events re-populate from connected relays via negentropy sync

No need for elaborate recovery procedures or data preservation on staging.

### Two improvements to extract BEFORE nuking

**Improvement A: Health-Z liveness check**
- Current health endpoint checks if the process is alive (liveness)
- Should check if the relay is FUNCTIONAL (readiness/functionality)
- A relay that's alive but can't serve events is not healthy
- Implement: health check should attempt a read operation (e.g., query a known event)
  and report unhealthy if the read fails
- This is a small focused PR, independent of any ADR

**Improvement B: Startup scripts analyze + restart**
- Current behavior: on startup, if search index is corrupt, recursively delete
  the search directory (destructive auto-recovery)
- Proposed: startup script should (a) detect the problem, (b) log a diagnostic
  message, (c) restart the indexing layer, not just blindly delete
- For staging: yolo-nuke is fine. For production: need the smarter restart behavior.
- This improvement should land BEFORE the yolo-nuke becomes the default strategy

### Action items
- [ ] Close PR #1174 with comment explaining deprioritization (maximotodev or Franchovy to do)
- [ ] Implement health-Z check (functionality, not just liveness)
- [ ] Implement startup diagnostic + restart behavior
- [ ] Document yolo-nuke as staging strategy in operational runbook (not ADR)

---

## 3. ADR Numbering Crisis — Resolution Paths

### Current state (3 incompatible schemes)

**Scheme A — Formal (upstream/master docs/adr/):**
```
0001 (AGENTS.md model)     0002 (NDK→Applesauce)
[gap 0003-0012]
013  (NIP-17 transport)    014  (NIP-17 migration)
```

**Scheme B — Implicit (issue #1064 catalog):**
```
001=Bun  002=TanStack Router  003=TanStack Query  004=Store class
005=Tailwind+shadcn  006=NDK(superseded)  007=strangler-fig seam
008=fetchEventsWithTimeout(contradicted)  009=NDK outbox(contradicted)
010=LOCAL_RELAY_ONLY  011=nak serve  012=NIP-59 gift wrap
013=NIP-60 Cashu  014=HD wallet derivation
```

**Scheme C — Franchovy's fork:**
```
0001=AGENTS.md  0002=NIP-17  0003=NDK migration
```
Completely different mapping from Scheme A.

### Proposed numbers by various contributors

| Contributor | Number | Topic | Where |
|---|---|---|---|
| Our fork (adr-verification branches) | 003 | Phase enums | Local only |
| Our fork (adr-verification branches) | 004 | Store dependency layering | Local only |
| maximotodev | 015 | Relay persistence | PR #1174 (CLOSED) |
| Franchovy (v2-merge ADR) | 016 | V2 integration branch | Self-assigned, PR #1167 (CLOSED) |
| Our ADR PRs | XXX | All 5 use placeholder | PRs #1164, #1165, #1175, #1176, #1177 |

### Three resolution paths

**Path A: Accept the collision, renumber everything (clean slate)**
- Formally document all implicit decisions (001-014 from issue #1064) as proper
  ADR files, filling the gap
- Assign numbers 015+ to new proposals in merge order
- Pros: clean, no ambiguity, every number has a file
- Cons: significant documentation effort; some implicit decisions are
  contradicted/superseded and documenting them formally is odd

**Path B: Accept two tracks — "implicit" and "formal" (pragmatic)**
- Implicit ADRs (001-014) are cataloged in issue #1064, never become files
- Formal ADRs start at a new namespace (e.g., ADR-F001, ADR-F002)
- Or: formal ADRs continue using descriptive names until merge (ADR-XXX-topic)
  and get sequential numbers only when accepted
- Pros: no collision, easy to add new ADRs
- Cons: two numbering tracks is confusing

**Path C: Collapse to a single new scheme (reset)**
- Accept that the implicit catalog and formal ADRs are different things
- Formal ADRs get their own fresh numbering starting at 0001
- Implicit decisions get renamed to "Architecture Notes" (AN-001 through AN-014)
- This is what ADR-0001 already implies (ADRs are formal decisions, not catalogs)
- Pros: cleanest conceptual model, no ambiguity
- Cons: requires renaming existing ADR-0001 and ADR-0002

### Recommendation
**Path C** is cleanest. Rename the implicit catalog to "Architecture Notes"
(AN-001 through AN-014). Formal ADRs keep their current numbers (0001, 0002,
013, 014) and new ones get assigned 0003+ in merge order. The gap 0003-0012
can be filled as formal ADRs or left reserved.

But this is a team decision. Raise in next call.

---

## 4. Our ADR PRs — Status and What Each Needs

### Summary table

| PR | Title | CI | Reviews | What's needed |
|---|---|---|---|---|
| #1164 | Phase enums (state machines) | PRETTIER FAIL | Franchovy: "investigate further" | Fix prettier + test coverage analysis + check maximotodev overlap |
| #1165 | Store layer dependency rules | PRETTIER FAIL | Franchovy: "may not cover full scope" | Fix prettier + address scope concern (contextvm/e2e imports) |
| #1175 | E2E test stabilization | No checks | Zero engagement | Ping reviewers; fix if CI triggers |
| #1176 | Relay data validation enforcement | No checks | Zero engagement | Ping reviewers; fix if CI triggers |
| #1177 | Error boundary + observability | No checks | Zero engagement | Ping reviewers; fix if CI triggers |

### Detailed action items per PR

**#1164 (Phase Enums)**
- [ ] Fix prettier CI failure (format the ADR markdown)
- [ ] Prepare test coverage analysis for LightningPaymentProcessor (Franchovy's
  prerequisite: "full happy path test coverage + significant edge case tests
  before we make these changes")
- [ ] Check if maximotodev's "removing possibility to skip payments" work
  overlaps — if so, coordinate priority
- [ ] Do NOT market as a feature (team call decision)
- [ ] Verify no feature branch conflicts if changes go to master

**#1165 (Store Layer Rules)**
- [ ] Fix prettier CI failure
- [ ] Address Franchovy's scope concern: the proposed layering covers src/ stores
  but he notes contextvm/ and e2e/ also import from libs/. Either (a) expand
  scope to cover all consumers, or (b) explicitly document that the ADR covers
  src/ internal layering only and external imports are a separate concern
- [ ] Consider whether cart.ts's OrderStatus type (which collapses payment
  lifecycle) should be addressed here or in the phase enums ADR

**#1175 (E2E Test Stabilization)**
- [ ] Verify prettier passes (CI hasn't triggered yet on upstream — may need
  to check if branch protection is configured)
- [ ] Ping Franchovy / maximotodev for review (all 3 new PRs have zero engagement)
- [ ] The happy-path video requirement may need team discussion before acceptance

**#1176 (Relay Data Validation)**
- [ ] Same as #1175 — verify CI, ping reviewers
- [ ] May need to coordinate with hkarani's auction validation work (#1170)
  — our ADR provides the enforcement mechanism, his PR is an implementation

**#1177 (Error Boundary & Observability)**
- [ ] Same — verify CI, ping reviewers
- [ ] The error reporting mechanism choice (self-hosted vs Sentry vs Nostr-based)
  may need team discussion

### Common CI issue
#1164 and #1165 both fail prettier. This is likely because the ADR markdown
needs formatting (line length, indentation). Fix: run `bun run format` or
`npx prettier --write` on the ADR files before pushing.

---

## 5. Meta-ADR Alignment with Franchovy's #1152

### What #1152 proposes ("Law + Enforcement" model)

Franchovy's issue #1152 proposes a strict documentation architecture:
- **ADRs = The Law** — immutable, self-contained, comprehensive. Located in
  docs/adr/. Full technical detail (event structures, state machines, protocols).
  Once accepted, modified only via amendments or supersession.
- **AGENTS.md = The Enforcement** — operational focus, references ADRs, living
  and mutable. Brief excerpts allowed if they aid immediate context.
- **Handbook = docs/handbook/** — user-facing guides, references ADRs for
  technical detail, does not redefine them.
- **Eliminates ad-hoc spec files** (CLAUDE.md, SPEC.md, gamma_spec.md) — all
  specs migrate into ADRs.

### What our meta-ADR proposes ("Persistent Rule + Transient Violations")

Our pattern: each ADR has two sections:
- **Upper section (permanent):** the architectural rule, the decision, the
  rationale. Stays even after all implementation is complete.
- **Lower section (transient):** specific file:line violations of the rule.
  Entries removed as PRs fix each one. Section deleted when migration complete.

### How they align

The two proposals are COMPLEMENTARY, not competing:

| Concern | #1152 (Franchovy) | Our meta-ADR |
|---|---|---|
| ADR immutability | Yes — modifications only via amendments/supersession | Yes — permanent section is immutable |
| ADR self-containment | Yes — full technical detail | Yes — includes code references |
| Enforcement mechanism | AGENTS.md references | Not addressed (orthogonal) |
| Migration tracking | Migration plans in ADRs | Yes — transient violations section |
| Spec consolidation | Eliminates ad-hoc specs | Not addressed (orthogonal) |
| Post-migration state | ADR stays (immutable record) | Upper section stays, lower section deleted |

### Recommendation

**Merge the two proposals.** #1152 should be promoted to a formal ADR that
adopts the "Law + Enforcement" model AND incorporates our persistent/transient
section pattern. Specifically:

1. #1152 becomes the master documentation governance ADR
2. It adopts our two-section pattern as the standard ADR structure:
   - Permanent section defines the rule (the "Law")
   - Transient section tracks current violations (migration enforcement)
3. AGENTS.md enforcement (from #1152) handles operational enforcement
4. The transient section handles migration enforcement (from our proposal)

This gives the team a single coherent documentation model instead of two
overlapping proposals. The team discussed this informally and "would appreciate
if we make sure it's denoted somewhere" — #1152 is the right place.

### Action items
- [ ] Draft a comment on #1152 proposing the merge of the two patterns
- [ ] Show how our relay validation ADR (#1176) and error boundary ADR (#1177)
  already follow this structure — concrete examples
- [ ] Offer to help promote #1152 to a formal ADR incorporating both proposals

---

## 6. Additional Call Decisions (for reference)

- **hkarani's auction validation:** He is writing the auction validation ADR
  into PR #1170. May adjust it. Discuss in next meeting. Our relay validation
  ADR (#1176) provides the enforcement mechanism that would catch the class
  of bugs his ADR addresses — coordinate to avoid duplication.

- **State machines ADR (#1164):** Stays proposed. NOT marketed as a feature.
  It's an internal code quality improvement, not a user-facing capability.

- **NIP-53 PRs (#1171, #1172, #1173):** Three feature PRs from our fork,
  awaiting review. Not ADR-related but may need the CVM pubkey derivation
  ADR to be in place for proper documentation.

---

## Appendix: ADR Landscape Summary

### All ADRs across all branches/forks

| Source | Number | Title | Status |
|---|---|---|---|
| upstream/master | 0001 | Hierarchical AGENTS.md | Accepted |
| upstream/master | 0002 | NDK→Applesauce strangler-fig | Accepted |
| upstream/master | 013 | NIP-17 Order Message Transport | Proposed |
| upstream/master | 014 | NIP-17 Order Transport Migration | Proposed |
| upstream/master | (unnumbered) | Add Product Workflow Boundaries | Proposed |
| upstream branch | TBD | Currency Conversion Service Architecture | Issue |
| upstream branch | (unnumbered) | UI Component Migration & Widget Book | Proposed |
| upstream branch | 016 (self-assigned) | V2 Integration Branch Strategy | Proposed (PR #1167 CLOSED) |
| upstream branch | 015 | Relay Persistence & Staging Recovery | Proposed (PR #1174 CLOSED) |
| fork PR #1164 | XXX | Phase Enums (state machines) | Proposed |
| fork PR #1165 | XXX | Store Layer Dependency Rules | Proposed |
| fork PR #1175 | XXX | E2E Test Stabilization | Proposed |
| fork PR #1176 | XXX | Relay Data Validation Enforcement | Proposed |
| fork PR #1177 | XXX | Error Boundary & Observability | Proposed |
| issue #1064 | 001-014 | Implicit architecture catalog | Catalog (not formal ADRs) |
| issue #1152 | — | Documentation Structure (Law+Enforcement) | Open |
| issue #1151 | — | Auction Validation Protocol | Open (hkarani) |
| issue #1153 | — | Component/UI Migration & Widget Book | Open (Franchovy) |
