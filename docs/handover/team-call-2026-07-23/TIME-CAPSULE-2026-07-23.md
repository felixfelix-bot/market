# Plebeian Market — Time Capsule: Current State (2026-07-23)

> PURPOSE: This document is a complete snapshot of all research, sub-manager
> findings, PR/ADR/contributor state, and strategic analysis as of 2026-07-23.
> Created BEFORE audio recording transcription to preserve context.
> Reference this file after audio notes are processed to reconnect with
> the pre-audio state of understanding.

---

## TABLE OF CONTENTS

1. [Project Snapshot](#1-project-snapshot)
2. [Contributor Landscape](#2-contributor-landscape)
3. [Our PR Portfolio (12 PRs)](#3-our-pr-portfolio-12-prs)
4. [External PRs Requiring Attention](#4-external-prs-requiring-attention)
5. [ADR Landscape (17 Total)](#5-adr-landscape-17-total)
6. [Sub-Manager Research Reports](#6-sub-manager-research-reports)
7. [Signal Group Hierarchy](#7-signal-group-hierarchy)
8. [Strategic Risks & Cross-Cutting Analysis](#8-strategic-risks--cross-cutting-analysis)
9. [Immediate Actions Available](#9-immediate-actions-available)
10. [Meeting Brief Context](#10-meeting-brief-context)

---

## 1. PROJECT SNAPSHOT

- **Repo:** github.com/PlebeianApp/market
- **Stats:** 9 stars, 9 forks, 155 open issues, GPL-3.0
- **Default branch:** master (core marketplace)
- **Feature branch:** `auctions` (NIP-53 live auctions, Cashu settlement — massive active workstream)
- **Runtime:** Bun (not Node). Tests via `bun:test` (unit) + Playwright (e2e)
- **Nostr backend:** NDK primary, applesauce adapter migration in progress (Wave 0)
- **Fork:** github.com/felixfelix-bot/market (our fork)
- **Fork workflow:** branch on felixfelix-bot/market, PR upstream to PlebeianApp/market
- **Local clone:** ~/repos/market (branch: docs/adr-e2e-test-stabilization)
- **Remotes:** origin=felixfelix-bot, plebian=PlebeianApp/market, c03rad0r=c03rad0r/market, franchovy=Franchovy/plebeian-market
- **PR pipeline:** 30 open PRs total (8 ours, 22 from others)

---

## 2. CONTRIBUTOR LANDSCAPE

### maximotodev / plebomoto (Diego Aguero) — LEAD MAINTAINER

- **Commits:** 665+ (plebomoto account) + 103 (maximotodev account)
- **Role:** De facto lead. Merge gatekeeper. ALL our PRs need his approval.
- **Recent focus:** Ops (staging deploy hardening, CI fixes, relay pruning runbooks, e2e diagnostics)
- **Owns:** ADR-015 (relay persistence) on upstream branch agent/adr-staging-relay-recovery (PR #1174)
- **Active PR:** #1136 (NIP-17 order read helper) — near merge-ready, Franchovy APPROVED
- **Relationship:** GOOD. Responsive, thorough reviewer. Our PR #1169 was split into 3-PR stack per his detailed review.
- **What he wants:** Focused, reviewable PRs. He flags scope creep aggressively. Values security-conscious work.

### Franchovy (Frankfurt) — ARCHITECTURE LEAD

- **Commits:** 16 (but very active last 2 weeks)
- **Role:** De facto ADR/documentation lead. Reviews most PRs.
- **Owns 3 open ADR issues:**
  - #1151 (Auction Validation Protocol) — assigned to hkarani for implementation
  - #1152 (Documentation Structure) — "Law + Enforcement" model
  - #1153 (Component/UI Migration & Widget Book)
- **Major PRs:**
  - #1138 (Auctions V1 umbrella — 100 files, +34K lines, merges auctions→master)
  - #1168 (auction order details — settlement status display)
  - #1144 (settlement steps — superset of #1168)
  - #953 (CMS using Puck — 7 weeks stale, needs splitting)
- **Also proposed (branch only, no PR):**
  - Currency Conversion Service Architecture
  - V2 Integration Branch Strategy (PR #1167 was CLOSED without merge — needs discussion)
- **Relationship:** COMPLEX. He authored the ADR system. Our 5 parallel ADR PRs risk being seen as competing unless explicitly aligned with his framework (#1152).
- **Feedback on our ADRs:**
  - #1164 (phase enums): "Investigate further. Needs test coverage for existing code. Check no current feature branches conflict."
  - #1165 (store layer): "The need is clearly necessary... question is whether proposed system covers full scope." Notes external consumers (contextvm/, e2e/) import from libs/ — our layering may be incomplete.

### hkarani (Hezron Karani) — PRIMARY AUCTION CONTRIBUTOR

- **Commits:** 79
- **Focus:** Auction mechanics, wallet UI, checkout/login flow
- **CRITICAL PR:** #1170 (auction validation, 22 files, +1871/-269, CI green, ZERO reviews)
  - Implements Franchovy's ADR issue #1151
  - Security-critical settlement verification (kind-1024 events, NUT-7 spent-state, rebid chains)
  - No file overlap with our NIP-53 stack
  - THIS IS THE #1 PR WE SHOULD REVIEW
- **Other PRs:** #1147 (anti-snipe), #1146 (bid input), #1142 (notifications), #995 (wallet), #974 (login), #684 (btc map), #472 (order UX)
- **Relationship:** COLLABORATIVE. Already engaged with us on #1142/#1147. Receptive, ships fast.
- **Key overlap:** His #1170 directly relates to our #1176 (relay data validation ADR). His PR is the concrete implementation; our ADR is the general principle. They COMPLEMENT, not compete.

### turizspace (MK-Turiz, Ruiru, Kenya) — UX CONTRIBUTOR

- **Commits:** 13
- **Focus:** Loading indicators, shipping display, image compression
- **#1008 (image compression):** Closest to merge-ready. All feedback addressed, CI green. 12 days stale pending re-review.
- **#1132 (shipping display):** Active. maximotodev raised 4 new issues today. We already reviewed (4 comments).
- **#1160 (loading indicators):** All blockers addressed TODAY. CI green. Franchovy approved. Nearly merge-ready.
- **Relationship:** Independent. No active collaboration needed. We caused one conflict (#1132 collections.tsx), already resolved.

### BenGWeeks (Ben Weeks, Cambridge, UK) — DORMANT

- PR #475 (markdown rendering) — 6 months stale, draft, conflicting. DEAD.

### Harshdev098 — DORMANT

- PR #694 (NIP-15 shop profiles) — 4 months stale, conflicting, no response to our comments. DEAD.

### felixfelix-bot (US) — CONTRIBUTOR

- 6 commits upstream, 12 open PRs (8 active + 4 stale/blockers)
- Focus: ADRs, NIP-53 live chat features, e2e test stabilization, security
- Repo: github.com/felixfelix-bot (account ID 301398501)

---

## 3. OUR PR PORTFOLIO (12 PRs)

### NIP-53 Stack (auctions branch) — 3 PRs

| PR    | Title                                      | Status          | CI                       | Action Needed                      |
| ----- | ------------------------------------------ | --------------- | ------------------------ | ---------------------------------- |
| #1171 | Status resolver + CVM identity enforcement | REVIEW_REQUIRED | ⚠️ prettier FAIL         | Fix prettier (blocks entire stack) |
| #1172 | Chat message reactions                     | REVIEW_REQUIRED | No CI (stacked on #1171) | Wait for #1171                     |
| #1173 | CVM commentator                            | REVIEW_REQUIRED | No CI (stacked on #1172) | Wait for #1172                     |

**Stack order:** #1171 → #1172 → #1173. Must merge in order. Each PR's diff shrinks as earlier PRs merge.
**Key files:** src/lib/nip53.ts, src/components/LiveChatPanel.tsx, src/components/LiveChatMessage.tsx, src/queries/liveChat.tsx, contextvm/tools/live-activity-worker.ts

### ADR PRs (master branch) — 5 PRs

| PR    | Title                             | Status          | CI               | Action Needed                                                    |
| ----- | --------------------------------- | --------------- | ---------------- | ---------------------------------------------------------------- |
| #1164 | Phase enums (state machines)      | REVIEW_REQUIRED | ⚠️ prettier FAIL | Fix prettier. Franchovy wants test coverage analysis.            |
| #1165 | Store layer dependency rules      | REVIEW_REQUIRED | ⚠️ prettier FAIL | Fix prettier. Franchovy questions scope (contextvm/e2e imports). |
| #1175 | E2E test stabilization strategy   | REVIEW_REQUIRED | No CI triggered  | Wait. Fresh (created today).                                     |
| #1176 | Relay data validation enforcement | REVIEW_REQUIRED | No CI triggered  | Wait. Should reference hkarani #1170.                            |
| #1177 | Error boundary + observability    | REVIEW_REQUIRED | No CI triggered  | Wait. Unique coverage, no overlaps.                              |

**Quick win:** One `prettier --write` pass across all branches fixes 5 PRs.

### Stale/Blocked PRs — 4 PRs

| PR    | Title                         | Age               | Issue                                                   | Recommendation                                               |
| ----- | ----------------------------- | ----------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| #1150 | Auction query parallelization | CHANGES_REQUESTED | EMPTY DIFF after revert. maximotodev says CLOSE.        | Close. Start fresh if needed.                                |
| #1115 | Aggregator relay (Khatru)     | 20 days           | Zero maintainer engagement                              | Ping maximotodev or reduce scope                             |
| #1116 | Test-infra mega-PR            | 19 days           | 209 files, 80+ upstream commits absorbed — unreviewable | Close and reopen with focused diff, or shave off focused PRs |
| #1118 | Security CI SHA-pinning       | 17 days           | Hard merge conflict (CONFLICTING)                       | Rebase against current master                                |

**ZERO of our 12 PRs are approved.**

---

## 4. EXTERNAL PRs REQUIRING ATTENTION

### Tier 1 — REVIEW NOW

| PR        | Author  | Why                                                                                                                                  |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **#1170** | hkarani | Auction validation. Filed today. 22 files. ZERO reviews. Implements ADR #1151. Security-critical. Directly related to our #1176 ADR. |

### Tier 2 — MONITOR CLOSELY

| PR        | Author    | Why                                                                                                                                                                                                                                                                                   |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#1138** | Franchovy | "Auctions V1" umbrella. 100 files, +34K lines. Merges auctions→master. **5 direct file overlaps** with our NIP-53 stack: LiveChatPanel.tsx, LiveChatMessage.tsx, nip53.test.ts (306 lines!), contextvm worker + tests. Structural — will absorb whatever's on auctions at merge time. |
| **#1144** | Franchovy | Settlement steps. +1516/-286 on auctions branch. e2e-pricing FAILING. 6 validation blockers from maximotodev.                                                                                                                                                                         |
| **#1168** | Franchovy | Auction order details. +627/-39. Clean subset of #1144. CI green. We already reviewed (3 blockers). No file overlap with us.                                                                                                                                                          |

### Tier 3 — NEARLY READY (quick wins to help unblock project)

| PR    | Author      | Status                                                                          |
| ----- | ----------- | ------------------------------------------------------------------------------- |
| #1136 | maximotodev | NIP-17 order helper. Franchovy APPROVED. CI green. Minor items remain.          |
| #1160 | turizspace  | Loading indicators. All blockers addressed today. CI green. Franchovy approved. |
| #1132 | turizspace  | Shipping display. Active. maximotodev raised 4 issues today. We reviewed.       |
| #1008 | turizspace  | Image compression. 12 days stale. Ready pending re-review.                      |

### Tier 4 — WAITING ON AUTHOR

| PR           | Author  | Issue                                                                                                  |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------ |
| #1142        | hkarani | Notifications. Changes requested. Conceptual overlap with our NIP-53 (subscribes to live-chat events). |
| #1147, #1146 | hkarani | Small UI tweaks. Changes requested.                                                                    |

### DEAD — DO NOT REVIEW

| PR         | Author      | Why                                             |
| ---------- | ----------- | ----------------------------------------------- |
| #684, #472 | hkarani     | Conflicting, months stale, CI failing           |
| #694       | Harshdev098 | 4 months stale, conflicting, no response        |
| #475       | BenGWeeks   | 6 months stale, no reviews                      |
| #953       | Franchovy   | CMS, 7 weeks stale, needs splitting into 5+ PRs |
| #995, #974 | hkarani     | Stale, targeting master, changes requested      |

### CONFLICT STATUS FOR OUR NIP-53 STACK

- No external PR directly conflicts with our files
- Only #1138 (Franchovy's umbrella) shares files — structural, expected
- 10 PRs target the `auctions` branch — contested branch, any merge forces rebase of others
- Our stack must merge in strict order: #1171 → #1172 → #1173

---

## 5. ADR LANDSCAPE (17 Total)

### Accepted on master (5):

| ADR                                 | Title                                | Proposer      | Status   |
| ----------------------------------- | ------------------------------------ | ------------- | -------- |
| ADR-0001                            | Hierarchical AGENTS.md and ADR docs  | us (c03rad0r) | Accepted |
| ADR-0002                            | Nostr I/O migration NDK → applesauce | us (c03rad0r) | Accepted |
| ADR-013                             | NIP-17 order message transport       | us (c03rad0r) | Proposed |
| ADR-014                             | NIP-17 order transport migration     | us (c03rad0r) | Proposed |
| ADR-add-product-workflow-boundaries | (unnumbered)                         | us (c03rad0r) | Proposed |

### Proposed by us in open PRs (5):

| PR    | ADR Title                                     | Key Decision                                                                                                                                                             |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #1164 | Payment Lifecycle State Machine (Phase Enums) | Replace 3 parallel boolean flags with single PaymentPhase discriminated union. Rule: any component with 3+ boolean useState flags MUST use discriminated union.          |
| #1165 | Store Layer Dependency Rules                  | Three rules: (1) stores must not import from @/queries/_ or @/publish/_, (2) shared DTO types in @/lib/types/, (3) no private QueryClient in stores. ESLint enforcement. |
| #1175 | E2E Test Stabilization Strategy               | networkidle→domcontentloaded migration, test unskip protocol (3 consecutive passes), PR review readiness rule (happy-path video). Documents PR #1116 history.            |
| #1176 | Relay Data Validation Enforcement             | All event.content parsing MUST go through Zod safeParse gate. ESLint rule to flag raw JSON.parse on event.content. 12 current violations with file:line refs.            |
| #1177 | Error Boundary + Production Observability     | Per-route + per-feature + app-shell error boundaries (currently ZERO). Restore console.error in production. Add structured error reporting. Floating promise linting.    |

### Proposed by others (4):

| Author      | ADR                                                               | Branch/Status                                               |
| ----------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| maximotodev | ADR-015: Explicit Relay Persistence and Isolated Staging Recovery | upstream branch agent/adr-staging-relay-recovery (PR #1174) |
| Franchovy   | Currency Conversion Service Architecture                          | branch only, no PR                                          |
| Franchovy   | Component/UI Migration & Widget Book                              | issue #1153, no PR                                          |
| Franchovy   | V2 Integration Branch Strategy                                    | PR #1167 — CLOSED without merge                             |

### Local-only drafts (2):

- Semantic Color Token Enforcement (775 raw color violations, CSS variable mandate)
- Status Communication Component Standard (standardize Alert/InlineError/Spinner)

### Meta-ADR (drafted in meeting brief, not committed):

- ADR Structure: Persistent Rule + Transient Action Items pattern
- Upper section = permanent architectural rule (stays after implementation)
- Lower section = transient violations list (entries removed as PRs fix them)

### KEY NUMBERING ISSUES:

1. **ADR-015 conflict RESOLVED** — we renamed to ADR-XXX, maximotodev keeps 015
2. **ADR-0003 CONTESTED** — our Phase Enums (verification branch) vs Franchovy's UI Migration (assumed by v2-merge ADR)
3. **THREE incompatible numbering schemes exist:**
   - Scheme A (formal): 0001, 0002, [gap 0003-0012], 013, 014
   - Scheme B (implicit from issue #1064): 001-014 cataloging existing decisions
   - Scheme C (Franchovy's fork): 0001, 0002=NIP-17, 0003=NDK migration
4. **10-number gap** (0003-0012) exists because issue #1064 cataloged 14 implicit decisions but never wrote formal ADR files
5. **Needs:** Team decision on numbering. Either accept gap, fill it, or renumber.

### ADR Dependency Graph:

```
ADR-0001 (AGENTS.md) ─── foundation for all ADRs
├── ADR-0002 (NDK→applesauce)
│   ├── ADR-013 → ADR-014 (NIP-17 transport + migration)
│   ├── #1176 (Relay Validation) — "applesauce provides validation"
│   └── max ADR-015 (relay persistence)
├── #1164 (Payment State Machine) → #1165 (Store Layer Rules)
├── #1177 (Error Boundary) ← #1176 (Relay Validation)
├── Color Tokens → Status Communication → Franchovy UI Migration (#1153)
└── [META] ADR Structure Pattern — governs all future ADRs
```

### MISSING ADRs (gap analysis found 3 strong candidates):

1. **Authentication & Identity Management (HIGH)** — Three login paths (NIP-07, NIP-46, raw nsec). NIP-46 local signer key stored UNENCRYPTED in localStorage. Cashu wallet seed as hex in localStorage. No documented security decision.
2. **Server Boundary & Transport Strategy (HIGH)** — Three execution contexts (Bun HTTP, ContextVM MCP, client React). Auction endpoints migrated from REST to ContextVM Nostr transport with no ADR. Two parallel ContextVM client implementations exist.
3. **Auction Settlement Trust Model (MEDIUM)** — AUCTIONS.md (101KB) is thorough spec but NOT an ADR. Documents design pivot from path-oracle to bidder-held-path. Key undocumented decisions: "no third party holds key material", "validator demotes to auditor".

---

## 6. SUB-MANAGER RESEARCH REPORTS

All 3 Plebeian sub-managers received context briefings and completed research.
Each dispatched their own subagents. Results below are condensed.

### 6.1 plebeian-my-prs (our PRs sub-manager)

**Status:** COMPLETE. Researched all 12 PRs via `gh pr view` + CI checks.

**Key findings:**

- ZERO of 12 PRs are approved
- 3 NIP-53 PRs: prettier fail blocking entire stack
- 5 ADR PRs: prettier fail / no CI triggered
- #1150: DEAD (empty diff after revert, maximotodev says close)
- #1115: 20 days stale, zero engagement
- #1116: 19 days stale, 209 files, unreviewable
- #1118: hard merge conflict, needs rebase
- Quick win: one `prettier --write` pass across all branches unblocks 8 PRs

**Recommended priority:**

1. Close #1150 (maximotodev explicitly recommended)
2. Fix prettier on #1171 (unblocks NIP-53 stack)
3. Fix prettier on #1164 and #1165 (quick wins)
4. Rebase #1118 (security work shouldn't sit stale)
5. Clean up or close #1116 (unreviewable)
6. Ping maximotodev on #1115 (20 days, zero engagement)

### 6.2 plebeian-market-reviews (external PRs sub-manager)

**Status:** COMPLETE. Dispatched 3 parallel subagents (hkarani's PRs, other contributors' PRs, ADR issues + conflict matrix). 21 open PRs + 3 ADR issues analyzed.

**Review priority tiers:**

- TIER 1 (review now): hkarani #1170 (auction validation, 22 files, ZERO reviews, implements #1151)
- TIER 2 (monitor): Franchovy #1138 (5 file overlaps with our stack), #1144, #1168
- TIER 3 (nearly ready): #1136 (maximotodev, Franchovy approved), #1160/#1132 (turizspace)
- TIER 4 (waiting on author): #1142, #1147, #1146 (hkarani), #1008 (turizspace)
- DEAD: #684, #472, #694, #475, #953, #995, #974

**Critical conflict finding:**

- #1138 (Auctions V1 umbrella) has 5 direct file overlaps with our NIP-53 stack:
  LiveChatPanel.tsx (+190), LiveChatMessage.tsx (+28), nip53.test.ts (+306),
  live-activity-worker.ts (+364), live-activity-worker.test.ts (+108)
- The nip53.test.ts (306 lines) suggests Franchovy has competing NIP-53 test coverage
- Need to coordinate to avoid duplicate/divergent implementations

### 6.3 plebeian-market-ADRs (ADR sub-manager)

**Status:** COMPLETE. Dispatched 3 parallel subagents (PR status, ADR landscape, gap analysis).

**Key findings:**

- All 5 our ADR PRs are blocked (REVIEW_REQUIRED, prettier fail or no CI)
- Franchovy feedback on #1164: wants test coverage analysis + check for feature branch conflicts
- Franchovy feedback on #1165: questions whether layering covers full scope (contextvm/e2e imports)
- THREE incompatible numbering schemes (see Section 5)
- 3 missing ADRs identified: Auth/Identity (HIGH), Server Boundary (HIGH), Auction Settlement Trust Model (MEDIUM)
- #1152 (Franchovy's Documentation Structure) aligns with our meta-ADR proposal — could be merged
- hkarani #1170 is NOT a conflict with our #1176 — it's the concrete implementation of our ADR's pattern

**Recommended next steps:**

1. Fix prettier CI on #1164 and #1165
2. Address Franchovy's scope concern on #1165
3. Prepare test coverage analysis for #1164
4. Raise numbering scheme crisis in next call
5. Consider drafting Auth & Identity ADR or Server Boundary ADR
6. Investigate merging meta-ADR with #1152

---

## 7. SIGNAL GROUP HIERARCHY

### Active Plebeian Groups (7):

| Group                    | Role         | Purpose                                    |
| ------------------------ | ------------ | ------------------------------------------ |
| **plebeian-manager**     | ORCHESTRATOR | This group. Coordinates all Plebeian work. |
| plebeian-my-prs          | SUB-MANAGER  | Managing our own PRs to upstream           |
| plebeian-market-reviews  | SUB-MANAGER  | Reviewing others' PRs on upstream          |
| plebeian-market-ADRs     | SUB-MANAGER  | Architectural Decision Records             |
| plebeian-call-agenda     | COORDINATOR  | Prepares weekly call agendas               |
| plebeian-market-web-shop | INDEPENDENT  | Web shop operations                        |
| plebeian-merchant-module | INDEPENDENT  | Merchant features                          |

### Channel Prompt Key Groups:

- Orchestrator: `group:rBB1J3KQuLy+dE4Te97ZxSsnPyQ+j3PclpFdxHnk2Ho=`
- plebeian-my-prs: `group:Y1khFZRsYeAHnhjvW1vaQd531mewVMCoD8q9QwPCURs=`
- plebeian-market-reviews: `group:PcJ7DYOjstuANFz0qUsJ9kFmLA+w2d+kkdufVs05jpA=`
- plebeian-market-ADRs: `group:/n8BZdL5KPkOGyGSVbQ1IMD4xXV5501hRgwMvcjMnew=`
- plebeian-call-agenda: `group:RQYkJiPjwFHTywpRRJgr3addRzHJ5G90C5KQW9wKiwE=`
- plebeian-market-web-shop: `group:HY2ZBrtWpdi5Y2qZkfN9yiwBbB1zQnnqB3HJd6//ynw=`
- plebeian-merchant-module: `group:cRHuPBVVZA9WcyRZn7xA6vJjbMEiDMZ+kVpiGT0g+6Y=`

### Infrastructure Gap:

- `~/worktrees/ws-plebeian-market/docs/coordination/` does NOT exist
- No TRACKS-REGISTRY.yaml, INDEX.md, or DECISIONS-AND-BLOCKERS.md
- Channel prompts reference these files but they were never created
- Sub-managers can't do proper cross-track coordination

### Possibly Missing Groups:

- **plebeian-marketing-onboarding** — for the marketing write-up person's work (telling public about features, onboarding users). Currently no group handles this.
- **plebeian-auctions** — auctions are a massive parallel workstream (NIP-53, Cashu settlement, multiple contributors) needing dedicated coordination
- **plebeian-community** — for interoperating with external contributors (reviews, coordination, conflict avoidance)

---

## 8. STRATEGIC RISKS & CROSS-CUTTING ANALYSIS

### Risk 1: Auctions Branch Convergence

ALL auction PRs target the same `auctions` branch:

- Ours: #1171, #1172, #1173 (NIP-53 live chat)
- hkarani: #1170, #1147, #1146, #1142
- Franchovy: #1168, #1144, #1138

Merge order coordination is CRITICAL. 10 PRs on one branch = any merge forces rebase of all others.

### Risk 2: Two Parallel ADR Tracks

- Our PR-based ADRs (#1164-#1177) vs Franchovy's issue-based ADRs (#1151-#1153)
- Risk of fragmentation — two competing documentation systems
- Resolution: our ADRs should explicitly reference Franchovy's framework (#1152) as canonical structure

### Risk 3: #1176 ADR vs hkarani #1170 Perception

- Our relay data validation ADR (#1176) and hkarani's auction validation PR (#1170)
- Could look competitive if not positioned correctly
- Resolution: #1176 should cite #1151/#1170 as concrete implementation, position itself as cross-cutting enforcement layer

### Risk 4: Franchovy #1138 Umbrella PR

- 100 files, +34K lines, merges entire auctions branch to master
- Contains 306 lines of nip53.test.ts — competing NIP-53 test coverage
- Contains versions of LiveChatPanel.tsx, LiveChatMessage.tsx that overlap with our #1171-1173
- If this merges before our PRs, we'll have conflicts
- Need to coordinate merge timing

### Risk 5: PR #1116 Strategy

- 209 files, 19 days stale, contains 80+ upstream commits
- Unreviewable in current state
- Meeting brief recommends: don't target upstream, shave off focused PRs
- This is documented in the ADR (#1175) as the strategy

### cart.ts Convergence Point

4 ADRs all touch cart.ts (1,892 lines):

- Store Layer ADR (#1165): 5 query imports, private QueryClient
- Payment State Machine ADR (#1164): OrderStatus = 'paid' collapses lifecycle
- Franchovy's Currency Conversion: cart.ts has own conversion path
- Add Product Workflow: cart/product draft state contamination
- Resolution: Store Layer ADR's Pattern B (Service Layer extraction) is the remediation

---

## 9. IMMEDIATE ACTIONS AVAILABLE

### Quick Wins (can do now, low risk):

1. Fix prettier on #1171, #1164, #1165 — one `prettier --write` pass unblocks 5 PRs
2. Close #1150 — maximotodev explicitly recommended
3. Rebase #1118 — security PR with hard conflict

### Strategic Decisions Needed (require operator input):

1. Review hkarani #1170 — aligns with our #1176 ADR, highest priority external PR
2. Align ADR strategy with Franchovy — reference #1152 in our ADR PRs
3. Resolve ADR numbering crisis (3 incompatible schemes)
4. Decide on #1116 strategy (close and split vs aggressive rebase)
5. Ping maximotodev on #1115 (20 days, zero engagement)
6. Coordinate with Franchovy on #1138 merge timing (5 file overlaps with our stack)

### Coordination Infrastructure:

1. Create coordination directory: ~/worktrees/ws-plebeian-market/docs/coordination/
2. Create TRACKS-REGISTRY.yaml, INDEX.md, DECISIONS-AND-BLOCKERS.md
3. Create missing Signal groups if needed

---

## 10. MEETING BRIEF CONTEXT

A detailed meeting brief was prepared earlier today for the Plebeian team call:
`~/repos/market/docs/adr/MEETING-BRIEF-2026-07-23.md` (406 lines)

It covers:

1. Executive summaries of all our ADRs + upstream ADRs
2. ADR-015 numbering conflict (flagged for call discussion)
3. PR #1107 analysis (should stay closed — all fixes consolidated in #1116)
4. PR #1116 strategy (don't target upstream, shave off focused PRs)
5. Relay Data Validation ADR rationale (security-relevant, contradicts AGENTS.md)
6. ADR Pattern Meta-ADR proposal (persistent top + transient bottom)
7. Error Boundary & Production Observability explanation
8. Centralized Environment Configuration (deprioritized)
9. Recommended actions for the call

The team call happened. Audio recordings with detailed discussion notes are
expected to arrive as Signal voice messages. Those recordings will be
transcribed and processed against this document.

---

## KEY FILES

| File                                                  | Purpose                                        |
| ----------------------------------------------------- | ---------------------------------------------- |
| THIS FILE                                             | Time capsule — complete project state snapshot |
| ~/repos/market/docs/adr/MEETING-BRIEF-2026-07-23.md   | Pre-call meeting brief (406 lines)             |
| ~/repos/market/docs/HIGH-LEVEL-OVERVIEW-2026-07-23.md | Orchestrator's high-level overview             |
| ~/repos/market/docs/adr/                              | All ADR files (accepted + proposed)            |
| ~/repos/market/AGENTS.md                              | Repo-level contributor guidance                |
| ~/repos/market/docs/AGENTS.md                         | Docs directory guidance                        |

---

_Snapshot taken: 2026-07-23 ~23:00 UTC_
_Next step: Process incoming audio recordings from team call against this baseline_
