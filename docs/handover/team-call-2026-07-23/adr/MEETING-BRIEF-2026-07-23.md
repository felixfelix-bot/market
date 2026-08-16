# Plebeian Market — Meeting Brief (2026-07-23)

## 1. EXECUTIVE SUMMARIES — EVERYTHING ON THE TABLE

### YOUR ADRs (under review)

**PR #1164 — Phase Enums (booleans -> enums)**
Problem: LightningPaymentProcessor (869 lines) tracks payment state via 3
parallel boolean flags (isGeneratingInvoice, isPaymentInProgress,
isCheckingForReceipt). Three booleans = 2^3 = 8 possible states, 4 of which
are impossible but TypeScript can't prevent. This caused 6 confirmed bugs:
double-pay races, stale-flag windows, settlement conflation, re-entry after
failure, manual-verify blind spots, expired-invoice reuse.

Decision: Replace parallel booleans with a single PaymentPhase discriminated
union (idle -> invoice_requested -> invoice_ready -> attempting ->
wallet_acked -> awaiting_receipt -> settled -> fulfilled, plus failed/expired).
Held in one useReducer. Transitions are explicit and validated. Rule: any
component with 3+ boolean useState flags representing lifecycle phases MUST
use a discriminated union.

Status: OPEN, awaiting reviewer feedback. You asked Franchovy whether the
detailed analysis belongs in the ADR or a companion doc.

**PR #1165 — Store Layer Dependency Rules**
Problem: 5 store files (cart.ts, nip60.ts, ndk.ts, product.ts, collection.ts)
import upward into @/queries/ and @/publish/ layers — violating the intended
downward dependency direction. Worst case: cart.ts (1,892 lines) imports from
6 query modules, creates its own private QueryClient (separate cache, double-
fetching), and has a type-level circular dependency with queries/v4v.tsx.

Decision: Three rules:

1. Stores must not import from @/queries/_ or @/publish/_
2. Shared DTO types must live in @/lib/types/ (not stores)
3. No private QueryClient instances in stores

Remediation: Pattern A (dependency injection for <=3 calls) or Pattern B
(service layer extraction for >3 calls, recommended for cart.ts). Enforced via
ESLint no-restricted-imports + no-restricted-syntax.

Status: OPEN. The local fork already has a version of this ADR adopted.

### UPSTREAM ADRs (other maintainers)

**Currency Conversion Service Architecture** (Franchovy, branch only, no PR yet)
Problem: 4 overlapping conversion layers with no single source of truth:

- MempoolService (pure math, returns NaN on missing rates)
- queries/external.tsx (CVM-first, Yadio fallback)
- cvm-identity.ts (throws if unconfigured)
- contextvm/tools/price-sources.ts (4-source median server-side)

Key finding: When CVM goes down, client degrades to single-source Yadio while
the server uses a robust 4-source median. Client and server strategies are
structurally inconsistent. NaN poisoning breaks form validation. CVM identity
resolver is a hard dependency of /api/config — if CVM isn't configured, the
entire app fails to load.

Your opinion angle: This overlaps with your store-layer ADR (cart.ts has its
own currency conversion path). Worth noting the cart.ts OrderStatus = 'paid'
collapses the payment lifecycle distinctions AGENTS.md mandates.

**V2 Integration Branch Strategy** (Franchovy, PR #1167 — CLOSED without merge)
Problem: Three large feature streams (Auctions, CMS, V2 UI migration) are
running in parallel, all touching overlapping files. Rebasing each
independently against master creates compounding conflict overhead.

Decision: Create a long-lived v2-integration branch as convergence point.
Short-lived feature branches target v2-integration, not master. Extend the
VITE_ENABLE_V2_THEME gate with sub-flags (VITE_ENABLE_V2_AUCTIONS,
VITE_ENABLE_V2_CMS). Three-stage progression: Dev-only -> Opt-in Beta ->
Default. The v2-integration branch is periodically rebased on master.

IMPORTANT: PR #1167 was closed without merge and without a PR body. This
suggests it was either premature or needs rework. Worth asking Franchovy
about in the call.

**UI Component Migration & Widget Book** (Franchovy, branch only, no PR yet)
Problem: UI components are scattered, duplicated, and inconsistent. No fixed
rules for component location, styling, or API contracts. 775+ raw color
classes bypass the CSS variable system. Hardcoded colors. Dark mode
incoherent.

Decision:

- Single globals.css with token system at top, @layer legacy for deprecation
- Component directory: ui/ (shadcn primitives) -> ui-wrappers/ -> shared/ ->
  nostr/ -> layout/ -> dialogs/. Import only from below in hierarchy.
- Standardized params: forwardRef, cn() className merging, callbacks
- Widget Book test harness (Bun-based, Playwright-driven, LIBRARY= scoping)
- Migration model: Keep/Modify/Extract/Replace classification per component

This is the big one from Franchovy. It connects to your store-layer ADR
(component organization) and overlaps with the error boundary ADR idea (new
components need error boundaries).

### NUMBERING CONFLICT — FLAG THIS IN THE CALL

**CRITICAL: Two different ADR-015s exist.**

- YOUR ADR-015: E2E Test Stabilization Strategy (on fork, part of PR #1116)
- MAXIMOTODEV's ADR-015: Explicit Relay Persistence and Isolated Staging
  Recovery (PR #1174, upstream branch agent/adr-staging-relay-recovery)

These cannot both be ADR-015. This needs to be resolved in the call. Your ADR
could become ADR-016 or 017, or maximotodev's could renumber. The upstream
ADR numbering already has gaps (0001, 0002, then jumps to 013, 014), so this
is a known issue.

---

## 2. ADR-015 FIX — DONE LOCALLY

Fixed. The Related section now references PR #1116 instead of #1107. Also
added a Notes section explaining:

- Why PR #1116 is a mega-PR (stacked chain was unwieldy to rebase)
- Proposed path: don't target #1116 upstream, shave off focused PRs

The fix is on branch fix/test-infra-and-e2e-reliability, not pushed yet.
Ready to push when you approve.

---

## 3. PR #1107 — WHAT IS IT, SHOULD IT CLOSE?

**What it was:** "fix(e2e): auth login button hydration race + dialog overlay

- cart/pii reliability" — 30 files, 2,455 additions.

**What it fixed:** 4 root causes of e2e test failures:

1. Auth login button hydration race (React hadn't attached click handler)
2. Zombie dialog overlay intercepting pointer events
3. networkidle never settles (NDK WebSockets keep connections alive)
4. Cart persistence timeouts

**What was wrong with it:** It also included a relay aggregator microservice
(~1,000 lines of Python: scraper.py, write-policy.py, strfry.conf,
docker-compose) that had nothing to do with e2e fixes. Scope creep.

**Current status:** CLOSED (not merged). Closed on 2026-07-04.

**Should it stay closed?** YES. All useful e2e fixes from #1107 are already
consolidated into PR #1116. The relay aggregator scope was inappropriate. Do
not reopen. If #1116 gets split, the e2e fixes should be extracted into a
new focused PR, not a resurrection of #1107.

**Could it be consolidated with #1116?** It already IS consolidated — #1116
contains everything from #1107 plus more. The question is whether #1116 itself
should be split (see next section).

---

## 4. PR #1116 STRATEGY — YOUR PROPOSAL IS RIGHT

Your instinct is correct. Here's the reasoning:

**What happened:** PR #1116 started as a stacked PR chain — 5+ focused PRs
targeting the ADR-015 phases. Every time master moved, the entire chain needed
rebasing. With 5+ interdependent PRs, this meant: merge conflicts cascading
up the stack, CI re-runs across all PRs, reviewer confusion about which PR
to review first. So you consolidated everything into one branch.

**What PR #1116 contains now (209 files, +34K lines):**

- ACTUAL test-infra fixes (valuable, should merge): prettier CI fix, bunfig.toml
  isolation, networkidle -> domcontentloaded migration, auth hydration fix,
  cart tooltip overlay fix, WebLN stale locator fix
- AUCTION components (3,000+ lines): AuctionBidder, AuctionCard,
  AuctionTimelineChart, LiveChatPanel, etc.
- AUCTION unit tests (3,000+ lines)
- WALLET components: Nip60Wallet, SendEcashModal, DepositLightningModal
- AUCTIONS.md spec (2,174 lines)
- Scripts: gen_auctions.ts, diagnose-nut7.ts, dev-seed.ts
- ADR-015 itself

**Your proposed strategy (documented in the ADR-015 Notes section now):**

1. PR #1116 does NOT target upstream
2. Identify tightly-scoped pieces and shave them off as individual upstream PRs
3. First candidate: the actual test-infra fixes (prettier, bunfig, networkidle,
   auth hydration) — maybe 10-15 files, focused, easy to review
4. Second candidate: auction components (if targeting the auctions branch or
   v2-integration branch, not master)
5. Over time, #1116 shrinks as pieces are promoted

**This is the right approach because:**

- Upstream reviewers see focused, reviewable PRs
- Each PR has a clear purpose (not "209 files of mixed concerns")
- The ADR defines the phasing — PRs follow the ADR's phases
- Once the ADR is accepted, you CAN re-stack focused PRs if desired
- The stacking rebase problem is mitigated by keeping the stack shallow (2-3
  PRs max, not 5+)

**What to say in the call:** "PR #1116 was a pragmatic consolidation because
the stacked chain was unwieldy to rebase. I propose that #1116 stays as a
local staging area. We identify tightly-scoped pieces, shave them off as
focused PRs targeting the appropriate branch. The ADR defines the phasing —
once accepted, I can re-stack focused PRs. This gives reviewers small,
independently reviewable PRs while preserving the work already done."

---

## 5. RELAY DATA VALIDATION ENFORCEMENT — YES, OWN ADR

**Should this be its own ADR? Absolutely.** Here's why:

**The problem:** AGENTS.md says "Treat relay data as untrusted until
validated." This is NOT enforced. Found:

- 9 query files doing raw JSON.parse(event.content) with zero schema validation
- 3 component files doing the same (worse — crashes the render)
- Only 4 safeParse() calls vs 59 raw .parse() calls
- Only 9 Zod schema files for ~25+ Nostr kinds consumed

**Specific violations:**

- queries/authors.tsx:17-20 — kind-0 metadata parsed 4x with no try/catch
- queries/payment.tsx:144,812 — payment data parsed without schema
- queries/v4v.tsx:79,93 — v4v config parsed without schema
- components/auth/NostrConnectQR.tsx:241 — JSON.parse in render path
- components/migration/MigrationForm.tsx:886 — same

**Why it's ADR-worthy (not just a refactoring task):**

- Security-relevant: relay data is adversarial. Anyone can publish malformed
  events to a relay.
- Contradicts an existing AGENTS.md constraint — the rule exists but has no
  enforcement mechanism
- Connects to ADR-0002 (applesauce has validation primitives)
- Will recur in every new feature touching Nostr events
- Clear quantifiable evidence (12 violations, file:line refs)
- The decision IS missing: "Should ALL event.content parsing require a Zod
  schema or safeParse gate?" — teams will keep choosing ad-hoc approaches
  unless a decision is documented

**What the ADR should decide:**

- Rule: All event.content parsing MUST go through a Zod safeParse gate before
  entering query results or component state
- Enforcement: ESLint rule or CI grep that flags raw JSON.parse on event.content
- Migration path: phase in schema files per Nostr kind, starting with
  payment-critical kinds (1023, 1024, 1025, 30408)
- Connection to ADR-0002: applesauce's event parsing can replace raw
  JSON.parse as the migration progresses

---

## 6. THE ADR PATTERN META-ADR

You described a pattern for structuring ADRs that the team has already
discussed informally:

**The pattern:**

- TOP SECTION: Human-readable. Explains the problem and the design decision
  in terms a human (or LLM) can understand. This section is PERMANENT — it
  defines the pattern/rule and stays even after implementation is complete.
- BOTTOM SECTION: Actionable. Lists specific places in the codebase where the
  pattern is broken, with file:line references. This section is TRANSIENT —
  as PRs fix each violation, the corresponding entries are removed. When all
  violations are fixed, the section becomes empty and can be deleted.

**Why this is good:**

- Future PRs can reference the TOP SECTION as the standard to comply with
- The BOTTOM SECTION serves as a tracking board for migration
- When migration is complete, the ADR doesn't become stale — it becomes a
  clean statement of the architectural rule
- LLMs implementing future features read the TOP SECTION and know the rule

**Where to put this:**
Option A: A standalone ADR (e.g., "ADR-XXX: ADR Structure — Persistent Rule

- Transient Action Items"). This is a governance/process ADR.

Option B: Add it to ADR-0001 (Hierarchical AGENTS.md) as an amendment. ADR-0001
already defines the documentation model. Adding a section on ADR structure
extends it naturally.

Recommendation: **Option A — standalone ADR.** ADR-0001 is about AGENTS.md
hierarchy. ADR structure is a separate governance concern. A standalone ADR
is cleaner and can be referenced by all future ADRs.

**Draft ADR structure for this pattern:**

```
# ADR-XXX: ADR Structure — Persistent Architectural Rule + Transient Action Items

## Context
ADRs that mix permanent architectural decisions with specific codebase
violations become stale once the violations are fixed. Reviewers can't tell
which parts of an ADR are the rule vs. the migration tracking.

## Decision
All ADRs should have two clearly separated sections:

### Persistent Section (upper)
- Explains the problem, the decision, and the invariants
- Written for humans and LLMs who need to understand the rule
- Remains valid even after all implementation is complete
- Future PRs reference this section as the standard to comply with

### Transient Section (lower, labeled "Current Violations" or "Migration Items")
- Lists specific file:line references where the pattern is currently broken
- Functions as a migration tracking board
- Entries are REMOVED as PRs fix each violation
- Section is DELETED when all violations are resolved
- The ADR remains valid without it

## Consequences
Positive: ADRs don't become stale after migration. The rule persists.
Cost: Requires discipline to update the transient section as PRs land.
```

---

## 7. ERROR BOUNDARY & PRODUCTION OBSERVABILITY — EXPLAINED

**What is an SPA?**

SPA = Single Page Application. Traditional websites load a new HTML page from
the server every time you click a link. An SPA loads ONE HTML page once, then
uses JavaScript to change what's on screen without reloading. Think of it
like a desktop app running in the browser. Plebeian Market is an SPA — React
renders the entire UI in JavaScript.

**Why this matters for errors:** In a traditional website, if one page has a
bug, you navigate to another page and it works. In an SPA, if a JavaScript
error crashes the rendering, the ENTIRE app dies — you get a blank white
screen. There's no "next page" to navigate to. The app is a single process.

**What is an Error Boundary?**

React Error Boundary is a component that catches errors in its child
components. Instead of the whole app crashing, the error boundary catches it
and shows a fallback UI ("Something went wrong, click here to retry"). Think
of it like a try/catch but for UI rendering.

**The problem right now:**

- Plebeian Market has ZERO error boundaries. Not one. In 410 files.
- If ANY component throws during rendering (e.g., JSON.parse on malformed
  relay data hits a component), the entire app crashes to a white screen
- The user has no way to recover except refreshing the page

**What is "console.error suppression"?**

In frontend.tsx:17-20, production builds replace ALL console methods with
empty functions:

```
if (process.env.NODE_ENV !== 'development') {
    console.log = () => {}
    console.debug = () => {}
    console.error = () => {}   // ← KILLS all error logging in production
    console.info = => {}
}
```

This was probably done to keep the console clean for end users. But it also
means: when an error happens in production, NOBODY knows about it. Not the
user (they see a white screen), not the developers (console.error is silenced),
not any error tracking system (there isn't one). Production debugging is
completely blind.

**What an ADR for this would look like:**

The ADR should decide:

1. **Error boundary placement:** At minimum, one at the app root (catches
   everything, shows global fallback). Better: per-route boundaries (only the
   broken route shows fallback, rest of app keeps working). Best: per-feature
   boundaries (broken component is isolated).

2. **Production error tracking:** Replace the nuclear console suppression with:
   - Keep console.log/debug silenced in production (fine)
   - RESTORE console.error (or replace with structured error reporting)
   - Add an error reporting service (Sentry, or a self-hosted equivalent)
   - At minimum: log errors to a relay event or backend endpoint

3. **Floating promise policy:** 9+ promises have no .catch(). If they reject,
   the error is silently swallowed. Should this be lint-enforced?

**What to say in the call:** "Right now, any render error in production
crashes the entire app to a white screen with no recovery. And we've silenced
console.error in production, so we have zero visibility into what's breaking.
This is an architectural gap — we need a decision on error boundary placement
and production observability before the app grows further."

---

## 8. CENTRALIZED ENVIRONMENT CONFIGURATION

Per your instruction: deprioritized for now. Keeping the analysis for later.

14 files scatter process.env reads. No config module. Server secrets read at
module scope. Client components read NODE_ENV directly. This is a P1 issue
but can wait.

---

## 9. RECOMMENDED ACTION FOR THE CALL

**Bring two new ADR proposals:**

1. **Relay Data Validation Enforcement** — strongest candidate. Security-
   relevant, contradicts AGENTS.md, clear evidence, connects to ADR-0002.

2. **Error Boundary & Production Observability** — second strongest. Zero
   error boundaries + blind production is alarming and easy to demonstrate.

**Use the new ADR pattern** (persistent top + transient bottom) for both.

**Also raise:**

- ADR-015 numbering conflict (yours vs maximotodev's)
- PR #1116 strategy (don't target upstream, shave off focused PRs)
- The ADR pattern meta-ADR (governance decision the team has discussed)

**Ask Franchovy about:**

- V2 integration branch strategy (PR #1167 was closed — why? needs rework?)
- UI component migration timeline (when does this get PR'd?)
