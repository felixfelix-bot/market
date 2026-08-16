# Plebeian Market — High-Level Project Overview

**Date:** 2026-07-23 | **Prepared by:** plebeian-manager orchestrator
**Sources:** 3 parallel research subagents (our PRs, external contributors, ADR landscape) + Signal sub-manager briefings + GitHub live data

---

## 1. PROJECT SNAPSHOT

- **Repo:** PlebeianApp/market — 9 stars, 9 forks, 155 open issues, GPL-3.0
- **Default branch:** master (core marketplace) + `auctions` branch (NIP-53 live auctions, Cashu settlement)
- **Runtime:** Bun (not Node), React/TanStack, NDK → applesauce migration in progress
- **PR pipeline:** 30 open PRs (8 ours, 22 from others)

---

## 2. CONTRIBUTOR LANDSCAPE

### maximotodev / plebomoto (Diego Aguero) — LEAD MAINTAINER

- 665+ commits. Merge gatekeeper. All our PRs need his approval.
- Recent focus: ops (staging deploy hardening, CI fixes, relay pruning runbooks)
- Owns ADR-015 (relay persistence) on upstream branch agent/adr-staging-relay-recovery
- PR #1136 (NIP-17 order helper) — near merge-ready, we already reviewed
- **Relationship:** Good. Responsive, thorough reviewer. Our PR #1169 was split into 3 per his review.

### Franchovy (Frankfurt) — ARCHITECTURE LEAD

- 16 commits but very active last 2 weeks. De facto ADR/documentation lead.
- Owns 3 open ADR issues: #1151 (Auction Validation), #1152 (Documentation Structure), #1153 (Component/UI Migration)
- Major PRs: #1138 (Auctions V1, 192 files/34K lines), #1168 (settlement status), #1144 (settlement steps), #953 (CMS)
- V2 integration branch strategy (PR #1167) was CLOSED without merge — needs discussion
- Currency conversion service ADR on branch only (no PR yet)
- **Relationship:** Complex. He authored the ADR system. Our 5 parallel ADR PRs risk being seen as competing unless explicitly aligned with his framework (#1152).

### hkarani (Hezron Karani) — PRIMARY AUCTION CONTRIBUTOR

- 79 commits. Focus: auction mechanics, wallet UI, checkout/login flow.
- CRITICAL: PR #1170 (auction validation, 22 files) implements Franchovy's ADR #1151. NO REVIEWS YET.
- Other PRs: #1147 (anti-snipe), #1146 (bid input), #1142 (notifications), #995, #974, #684, #472
- **Relationship:** Collaborative. Already engaged with us on #1142/#1147. Receptive to feedback, ships fast.
- **Key overlap:** His #1170 directly relates to our #1176 (relay data validation ADR). We should review #1170 and ensure our ADR complements his implementation.

### turizspace (MK-Turiz, Kenya) — UX CONTRIBUTOR

- 13 commits. Focus: loading indicators, shipping display, image compression.
- #1008 (image compression) is closest to merge-ready (all feedback addressed, CI green)
- #1132 had a conflict with our collections.tsx migration — already resolved
- **Relationship:** Independent. No active collaboration needed.

### BenGWeeks (Cambridge, UK) — DORMANT CONTRIBUTOR

- PR #475 (markdown rendering) — 7 months stale, draft, conflicting. Low priority.

### Harshdev098 — DORMANT CONTRIBUTOR

- PR #694 (NIP-15 shop profiles) — 4+ months stale, conflicting. We've nudged, no response.

---

## 3. OUR PR PORTFOLIO (felixfelix-bot → upstream)

### NIP-53 Stack (auctions branch)

| PR    | Title                          | Status          | CI                           | Action Needed                      |
| ----- | ------------------------------ | --------------- | ---------------------------- | ---------------------------------- |
| #1171 | Status resolver + CVM identity | REVIEW_REQUIRED | ⚠️ prettier FAIL             | Fix prettier (blocks entire stack) |
| #1172 | Chat message reactions         | REVIEW_REQUIRED | No CI yet (stacked on #1171) | Wait for #1171 fix                 |
| #1173 | CVM commentator                | REVIEW_REQUIRED | No CI yet (stacked on #1172) | Wait for #1172                     |

### ADR PRs (master branch)

| PR    | Title                             | Status          | CI                  | Action Needed           |
| ----- | --------------------------------- | --------------- | ------------------- | ----------------------- |
| #1164 | Phase enums (state machines)      | REVIEW_REQUIRED | ⚠️ prettier FAIL    | Fix prettier            |
| #1165 | Store layer dependency rules      | REVIEW_REQUIRED | ⚠️ prettier FAIL    | Fix prettier            |
| #1175 | E2E test stabilization            | REVIEW_REQUIRED | No CI triggered yet | Wait                    |
| #1176 | Relay data validation enforcement | REVIEW_REQUIRED | No CI triggered yet | Reference hkarani #1170 |
| #1177 | Error boundary + observability    | REVIEW_REQUIRED | No CI triggered yet | Wait                    |

### Stale/Blocked PRs

| PR    | Title                         | Age               | Issue                                                | Recommendation                     |
| ----- | ----------------------------- | ----------------- | ---------------------------------------------------- | ---------------------------------- |
| #1150 | Auction query parallelization | CHANGES_REQUESTED | **EMPTY DIFF after revert** — maximotodev says CLOSE | Close. Start fresh if needed.      |
| #1115 | Aggregator relay (Khatru)     | 20 days           | Zero maintainer engagement                           | Ping maximotodev or reduce scope   |
| #1116 | Test-infra mega-PR            | 19 days           | Unreviewable (80+ upstream commits absorbed)         | Close and reopen with focused diff |
| #1118 | Security CI SHA-pinning       | 17 days           | Hard merge conflict (CONFLICTING)                    | Rebase against current master      |

### Summary: ZERO of our 8 PRs are approved. Priority fixes:

1. Close #1150 (dead)
2. Fix prettier on #1171, #1164, #1165 (quick wins)
3. Rebase #1118 (security work shouldn't sit stale)
4. Clean up #1116 (close or restructure)

---

## 4. ADR LANDSCAPE (17 total ADRs)

### Accepted on master (5):

- ADR-0001: Hierarchical AGENTS.md + ADR docs (ours)
- ADR-0002: NDK → applesauce migration (ours)
- ADR-013: NIP-17 order message transport (ours)
- ADR-014: NIP-17 order transport migration (ours)
- ADR-add-product-workflow-boundaries (ours, unnumbered)

### Proposed by us (5 in open PRs):

- #1164: Payment Lifecycle State Machine (Phase Enums)
- #1165: Store Layer Dependency Rules
- #1175: E2E Test Stabilization Strategy
- #1176: Relay Data Validation Enforcement
- #1177: Error Boundary + Production Observability

### Proposed by others (4):

- maximotodev: ADR-015 (relay persistence) on upstream branch
- Franchovy: Currency Conversion Service Architecture (branch only)
- Franchovy: Component/UI Migration & Widget Book (issue #1153, no PR)
- Franchovy: V2 Integration Branch Strategy (PR #1167 — CLOSED)

### Local-only drafts (2):

- Semantic Color Token Enforcement (775 raw color violations)
- Status Communication Component Standard

### Meta-ADR (drafted, not committed):

- ADR Structure: Persistent Rule + Transient Action Items pattern

### KEY ISSUES:

1. **ADR-015 conflict RESOLVED** — we renamed to ADR-XXX, maximotodev keeps 015
2. **ADR-0003 contested** — our Phase Enums (verification branch) vs Franchovy's UI Migration (assumed by v2-merge ADR)
3. **10-number gap** (0003-0012) — needs a numbering registry
4. **Parallel ADR tracks** — our 5 PR-based ADRs vs Franchovy's 3 issue-based ADRs = fragmentation risk
5. **cart.ts convergence** — 4 ADRs touch this file (Store Layer, Payment State Machine, Currency Conversion, Add Product Workflow)

### ADR Dependency Graph:

```
ADR-0001 (AGENTS.md) ─── foundation
├── ADR-0002 (NDK→applesauce)
│   ├── ADR-013 → ADR-014 (NIP-17 transport + migration)
│   ├── #1176 (Relay Validation) — "applesauce provides validation"
│   └── max ADR-015 (relay persistence)
├── #1164 (Payment State Machine) → #1165 (Store Layer Rules)
├── #1177 (Error Boundary) ← #1176 (Relay Validation)
├── Color Tokens → Status Communication → Franchovy UI Migration (#1153)
└── [META] ADR Structure Pattern — governs all future ADRs
```

---

## 5. SIGNAL GROUP HIERARCHY

### Active Plebeian Groups:

1. **plebeian-manager** (ORCHESTRATOR) — this group
2. **plebeian-my-prs** — our PRs sub-manager
3. **plebeian-market-reviews** — reviewing others' PRs sub-manager
4. **plebeian-market-ADRs** — ADR sub-manager
5. **plebeian-call-agenda** — weekly call prep
6. **plebeian-market-web-shop** — shop operations
7. **plebeian-merchant-module** — merchant features

### Infrastructure Gap:

- `~/worktrees/ws-plebeian-market/docs/coordination/` does NOT exist
- No TRACKS-REGISTRY.yaml, INDEX.md, or DECISIONS-AND-BLOCKERS.md
- Channel prompts reference these files but they were never created

### Possibly Missing Groups:

- **plebeian-marketing-onboarding** — for marketing write-up person, feature announcements, user onboarding
- **plebeian-auctions** — auctions are a massive parallel workstream needing dedicated coordination
- **plebeian-community** — for interoperating with external contributors (reviews, coordination, conflict avoidance)

---

## 6. CROSS-CUTTING ANALYSIS

### Auctions Branch Convergence Risk:

ALL auction PRs target the same `auctions` branch:

- Ours: #1171, #1172, #1173 (NIP-53 live chat)
- hkarani: #1170, #1147, #1146, #1142
- Franchovy: #1168, #1144, #1138
  Merge order coordination is critical to avoid conflicts.

### Validation Architecture Alignment:

- Our #1176 ADR (general relay data validation principle)
- hkarani #1170 (concrete auction-specific implementation of Franchovy #1151)
- These should be positioned as complementary layers, not competing approaches.

### ADR Strategy Alignment Needed:

- Our PR-based ADRs (#1164-#1177) vs Franchovy's issue-based ADRs (#1151-#1153)
- Our ADRs should explicitly reference Franchovy's framework (#1152) as the canonical structure
- #1176 should cite #1151 as the implementation and position itself as the cross-cutting enforcement layer

---

## 7. IMMEDIATE ACTIONS (No implementation, planning only)

### Quick Wins (can do now):

1. Fix prettier on #1171, #1164, #1165 (unblocks 3 PRs)
2. Close #1150 (maximotodev explicitly recommended)
3. Rebase #1118 (security PR with hard conflict)

### Strategic Decisions Needed:

1. Review hkarani #1170 (auction validation) — aligns with our #1176 ADR
2. Align ADR strategy with Franchovy — reference #1152 in our ADR PRs
3. Resolve ADR numbering (ADR-0003 contested, 10-number gap)
4. Decide on #1116 strategy (close and split vs. aggressive rebase)
5. Ping maximotodev on #1115 (20 days, zero engagement)

### Coordination:

1. Create coordination infrastructure (TRACKS-REGISTRY.yaml, INDEX.md)
2. Coordinate auctions branch merge order
3. Help unblock turizspace's PRs (#1008 is merge-ready)
