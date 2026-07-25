# Plebeian Market — Team Call Meeting Notes

**Date:** 2026-07-23
**Source:** Audio recordings from c08r4d0r number 3 + PDF marketing plan
**Status:** Updated 2026-07-26 — progress tracked against GitHub
**Original status:** PLANNING ONLY — no implementation actions taken

---

## 0. PROGRESS TRACKER (updated 2026-07-26)

### Immediate Action Items — 4 done, 2 partial, 4 pending/unknown (of 10)

- [x] **1.** #1171 Change 1: CVM status-first — DONE. #1171 closed, replaced by #1180 (MERGEABLE, awaiting review)
- [x] **2.** #1171 Change 2: CVM pubkey derivation chain — DONE. #1180 implements `resolveCvmServerPubkey()` chain
- [x] **3.** Fix prettier on #1171, #1164, #1165 — DONE. All 3 closed. New PRs #1180, #1178, #1179, #1191 all MERGEABLE (no CI failures)
- [x] **4.** Close #1150 (dead PR) — DONE. Closed 2026-07-25
- [~] **5.** Review #1132, #1160 (turizspace) — PARTIALLY DONE. We reviewed (4 comments on #1132). Waiting on Franchovy + maximotodev CHANGES_REQUESTED to be addressed by turizspace
- [ ] **6.** Prepare briefing on hkarani #1170 — NOT DONE. hkarani updated Jul 24, CI green, needs human review
- [~] **7.** Monitor #1168 (Franchovy) — ONGOING. Our CHANGES_REQUESTED sent Jul 22, Franchovy hasn't responded since Jul 23
- [ ] **8.** Revise V2 marketing plan with 6 corrections — STATUS UNKNOWN
- [ ] **9.** Improve Health-Z liveness check — NOT DONE
- [ ] **10.** Improve start-up scripts for search index handling — NOT DONE

### Additional cleanup completed (beyond original scope)

- [x] Close #1115 (aggregator relay, 20 days stale) — Closed 2026-07-25
- [x] Close #1116 (e2e + CI, 209 files unreviewable) — Closed 2026-07-25
- [x] Close #1118 (SHA-pin CI security) — Closed 2026-07-25
- [x] Close #1172, #1173, #1164, #1165, #1175, #1176, #1177 (stacked PRs) — All closed/replaced 2026-07-25
- [x] Open #1191 (e2e reliability, focused fix) — Replaces scope from #1116

### Planning Items (next meeting) — 0 of 6 complete

- [ ] **11.** Discuss hkarani's adjusted ADR for auction validation — Blocked: hkarani hasn't pushed update
- [ ] **12.** Resolve ADR numbering crisis (3 incompatible schemes) — Not started
- [ ] **13.** Align ADR strategy with Franchovy's #1152 framework — Not started
- [ ] **14.** Coordinate #1138 (Auctions V1 umbrella) merge timing — Not started
- [ ] **15.** Consider CVM pubkey derivation ADR — Partially: #1180 implements the pattern, standalone ADR not drafted
- [ ] **16.** Verify Gamma Markets cross-client compatibility — Not started

### Current open PRs (as of 2026-07-26)

| PR    | Title                                     | Base     | Review Status   | Mergeable |
| ----- | ----------------------------------------- | -------- | --------------- | --------- |
| #1180 | NIP-53 status resolver (CVM status-first) | auctions | REVIEW_REQUIRED | Yes       |
| #1178 | ADR phase enums (state machines)          | master   | REVIEW_REQUIRED | Yes       |
| #1179 | ADR store layer dependency rules          | master   | REVIEW_REQUIRED | Yes       |
| #1191 | e2e reliability fix                       | master   | REVIEW_REQUIRED | Yes       |

All 4 are clean, mergeable, zero conflicts. Bottleneck is review, not code quality.

---

## 1. V2 MARKETING & EDUCATIONAL CONTENT PLAN — FEEDBACK

### What was discussed:

The marketing person wrote a V2 marketing plan (PDF attached). Team reviewed and provided directional feedback on positioning and feature emphasis.

### Corrections to the V2 Marketing Plan:

**1. NIP-99 Interoperability (CLARIFY)**

- Current plan says "NIP-99 Native — Stalls visible across entire Nostr ecosystem"
- CORRECTION: The real goal is **NIP-99 + Gamma Markets compatibility**
- Specifically: Plebeian Market must correctly show all Conditor's, Shopster's, and other Gamma Market sites' content
- Must support the full flow from one client to another (browse → buy → settle)
- Current risk: small differences may prevent correct processing of other clients' content
- ACTION: Verify Gamma Markets cross-client compatibility

**2. Decentralized Auctions (KEEP)**

- Correct. Anti-snipe, notifications, settlement flows — all valid.

**3. Self-Hostable Community Instances (KEEP)**

- Correct. Valid goal.

**4. NIP-17 Private Orders (REMOVE AS SEPARATE ITEM)**

- NIP-17 is NOT a separate feature — it's part of the NIP-99 Gamma Market spec interoperability
- Don't mention separately in marketing

**5. Architecture Upgrades (PARTIALLY CORRECT)**

- Applesauce migration: VALID — mention this
- State machines: JUST IN DISCUSSION — do NOT mention in marketing claims
- Remove state machines from the "Architecture & Security Upgrades" section

**6. CMS Layer + Component Migration (NEW — ADD THIS)**

- Missing from original plan entirely
- Allows sellers to deploy their own **custom-built static websites** that are:
  - Compatible with NIP-99 Gamma Markets
  - Built using the Plebeian CMS
  - Published to Nostr
  - Viewable by any compatible client
- This is a major rollout objective — anyone can build a custom site using Plebeian CMS
- Connects to Franchovy's #1153 (Component/UI Migration)

### Revised V2 Rollout Objectives (high-level):

1. NIP-99 + Gamma Markets compatibility (full cross-client interop)
2. Decentralized auctions (anti-snipe, notifications, settlement)
3. Self-hostable community instances
4. CMS layer (custom seller storefronts, NIP-99 compatible)
5. Applesauce migration (architecture upgrade)

---

## 2. PR STATUS UPDATES FROM THE CALL

### turizspace PRs (#1132, #1160):

- Expecting **follow-up reviews from at least 2 team members**
- Both are nearly merge-ready (CI green, feedback addressed)
- These are quick wins to unblock the project

### Franchovy #1168 (Auction Order Details):

- Needs Franchovy to **address the changes requested**
- Not a new review — Franchovy needs to make updates himself
- Once updated, this is the first auction-order PR that could land on `auctions`

### Our #1171 (NIP-53 Status Resolver) — TWO DECISION-LEVEL CHANGES:

**Change 1: Client-side status resolution is architecturally WRONG**

- Current approach: client derives live activity status from start_at and bidding cutoff
- CORRECT approach: **always resolve to CVM status**
- Logic:
  - If no CVM detected → there is NO live event
  - If CVM stops publishing/updating at expected frequency → show **network error / live availability error**
  - Client must NOT derive start_at and bidding cutoff as start/end of live event
- REASONING: The live event can ONLY work when CVM is present to host data and regularly update. Resolving status from client side without CVM connection is meaningless — there would be no CVM to serve the data.

**Change 2: CVM identity enforcement pubkey derivation**

- The CVM server pubkey used for identity enforcement MUST come from the **same prioritization path** as all other CVM server pubkey derivations in the app
- Priority chain (most specific → least specific):
  1. CVM server live activity pubkey
  2. Falls back to → CVM server pubkey
  3. Falls back to → CVM server private key
  4. (Possibly) falls back to → app private key
- This logic ALREADY EXISTS in the app — need to FIND it (locations to check: `server/`, `contextvm/`, `src/queries/`)
- Must ensure our implementation uses the same derivation pattern
- POTENTIAL ADR: Document this pubkey derivation pattern alongside the rest of CVM and NIP-53 functionality

### hkarani #1170 (Auction Validation):

- hkarani is **picking back up** this PR
- Will add the ADR file into it
- May adjust the ADR content — **discuss in next meeting**
- Mint reachability gate: **should NOT require mint reachability** at any point
  - It's already required for bidders to make bids
  - Requiring it in validation is redundant
  - OPTIONAL: validator could maintain mint reachability status as available info
  - This avoids everyone independently DoSing the mint

### #1174 / ADR-015 (maximotodev's Relay Persistence):

- Team decision: **NOT high enough priority for an ADR**
- All concerns relate to **staging relay** — the one having issues
- INSTEAD OF ADR: "yolo-nuke" strategy
  - Nuke the search index (it's staging data, not unique source)
  - Can nuke data too if needed
- BEFORE nuking, extract value from current situation:
  1. **Improve Health-Z liveness check** — should reflect actual server state (not just liveness, but functionality — does it actually work?)
  2. **Improve start-up scripts** — should be able to analyze the problem, restart the indexing server/base
- These two improvements are near-term (next few days, maybe tomorrow)
- After extracting these improvements → proceed with yolo nuke strategy

---

## 3. ACTION ITEMS — WHO DOES WHAT

> Checklist legend (standard GitHub markdown): `[x]` done · `[ ]` pending · `[~]` partially done / in progress. Status as of 2026-07-26.

### IMMEDIATE (this week) — status as of 2026-07-26:

- [x] **1.** **DONE** — Address #1171 Change 1: Resolve to CVM status-first _(owner: plebeian-my-prs · HIGH)_ — SUPERSEDED by #1180 (status resolver with hard time boundaries + CVM identity enforcement)
- [x] **2.** **DONE** — Address #1171 Change 2: CVM pubkey derivation chain _(owner: plebeian-my-prs · HIGH)_ — SUPERSEDED by #1180 (implements `resolveCvmServerPubkey()` chain)
- [x] **3.** **DONE** — Fix prettier on #1171, #1164, #1165 _(owner: plebeian-my-prs · HIGH)_ — Old PRs closed. New PRs #1178, #1179, #1180 created Jul 25; #1191 CI green including prettier
- [x] **4.** **DONE** — Close #1150 (dead PR) _(owner: plebeian-my-prs · MEDIUM)_ — Closed 2026-07-25
- [~] **5.** **PARTIALLY DONE** — Follow-up review on #1132, #1160 (turizspace) _(owner: plebeian-market-reviews · HIGH)_ — We reviewed (4 comments on #1132). Waiting on Franchovy + maximotodev CHANGES_REQUESTED to be addressed by turizspace
- [ ] **6.** **PENDING** — Prepare briefing on hkarani #1170 _(owner: plebeian-market-reviews · MEDIUM)_ — NOT DONE. hkarani updated Jul 24, CI green, needs human review (only Copilot bot so far)
- [~] **7.** **ONGOING** — Monitor #1168 for Franchovy's update _(owner: plebeian-market-reviews · MEDIUM)_ — Our CHANGES_REQUESTED sent Jul 22. Franchovy hasn't responded since Jul 23
- [ ] **8.** **UNKNOWN** — Revise V2 marketing plan with feedback _(owner: NEW GROUP? · MEDIUM)_ — Status unknown
- [ ] **9.** **UNKNOWN** — Improve Health-Z liveness check _(owner: devops/relay ops · HIGH)_ — Status unknown
- [ ] **10.** **UNKNOWN** — Improve start-up scripts for search index handling _(owner: devops/relay ops · MEDIUM)_ — Status unknown

### CLEANUP COMPLETED (bonus work, beyond original scope):

- [x] Old stale PRs #1115, #1116, #1118 all cleaned up (closed/rebased, 2026-07-25)
- [x] Old PRs #1172, #1173, #1164, #1165, #1175, #1176, #1177 all consolidated (closed/replaced by the new clean stack)
- [x] New PR #1191 (e2e reliability, focused fix) created — bonus work not in original action items

### PLANNING (next meeting) — all PENDING as of 2026-07-26:

> Note: #1178 (phase enums / state machines ADR) and #1179 (store layer dependency rules ADR) are now **open PRs** awaiting review.

- [ ] **11.** **PENDING** — Discuss hkarani's adjusted ADR for auction validation _(owner: All)_ — hkarani updated #1170 Jul 24, CI green, but no human review yet
- [ ] **12.** **PENDING** — Resolve ADR numbering crisis _(owner: All)_ — 3 incompatible schemes. Not started
- [ ] **13.** **PENDING** — Align our ADR strategy with Franchovy's #1152 framework _(owner: plebeian-market-ADRs)_ — Not started
- [ ] **14.** **PENDING** — Coordinate #1138 (Auctions V1 umbrella) merge timing _(owner: All)_ — 5 file overlaps with our stack. Not started
- [ ] **15.** **PENDING** — Consider drafting CVM pubkey derivation ADR _(owner: plebeian-market-ADRs)_ — #1180 implements the pattern. Standalone ADR not drafted
- [ ] **16.** **PENDING** — Verify Gamma Markets cross-client compatibility _(owner: NEW GROUP?)_ — NIP-99 interop testing. Not started

### DEFERRED / DEPRIORITIZED:

- **ADR-015 (relay persistence)** — NO ADR. Yolo-nuke staging instead.
- **State machines in marketing** — Remove from marketing claims. ADR stays as proposed (now open as #1178).
- **NIP-17 as separate marketing bullet** — Fold into NIP-99 interoperability.

---

## 4. SIGNAL GROUP GAP ANALYSIS

### Groups that exist (7):

1. plebeian-manager (orchestrator)
2. plebeian-my-prs
3. plebeian-market-reviews
4. plebeian-market-ADRs
5. plebeian-call-agenda
6. plebeian-market-web-shop
7. plebeian-merchant-module

### Groups MISSING (recommended):

**1. plebeian-marketing-onboarding (HIGH PRIORITY)**

- The marketing person needs a dedicated context window for:
  - V2 marketing plan revisions
  - "Under the Hood" educational content series
  - Feature announcements based on GitHub activity
  - User onboarding flows
  - Gamma Markets compatibility messaging
- Currently no group handles marketing/content/onboarding
- Would feed from plebeian-my-prs (what's shipped) and plebeian-market-ADRs (architecture changes to explain)

**2. plebeian-devops-infra (MEDIUM PRIORITY)**

- Health-Z improvement, start-up scripts, relay staging ops
- Currently these tasks have no home
- maximotodev's relay work, deploy hardening, CI diagnostics need tracking
- Could be the group for staging relay "yolo-nuke" execution + Health-Z improvement

**3. plebeian-gamma-interop (MEDIUM PRIORITY)**

- Gamma Markets cross-client compatibility is a major objective
- Conditor, Shopster, other Gamma Market clients
- Needs dedicated testing + coordination context
- Connects to marketing (positioning) and reviews (PRs that affect interop)

### NOT recommended (yet):

- **plebeian-auctions** — auction PRs span existing groups (reviews, my-prs, ADRs). No need for separate group unless volume increases significantly.
- **plebeian-community** — external contributor coordination is handled by plebeian-market-reviews.

---

## 5. HANDOVER DOCUMENTS NEEDED

### A. For plebeian-my-prs sub-manager:

**#1171 Architecture Change Brief**

- Change 1: Replace client-side status resolution with CVM-status-first approach
- Change 2: Use existing CVM pubkey derivation chain (document the path)
- Context: operator explained reasoning — live event only works when CVM hosts + updates data
- Also: prettier fix across #1171, #1164, #1165 + close #1150

### B. For plebeian-market-reviews sub-manager:

**turizspace Review Follow-up + hkarani Monitor Brief**

- #1132, #1160: operator expects 2 team member follow-up reviews
- #1168: track for Franchovy's changes-requested update
- #1170: hkarani picking back up, adding ADR, may adjust — prepare to review when ready
- Mint reachability: don't require in validation, optional status maintained by validator

### C. For plebeian-market-ADRs sub-manager:

**ADR Decisions from Team Call**

- ADR-015 (relay persistence): DEPRIORITIZED — no ADR, yolo-nuke staging
- CVM pubkey derivation: potential new ADR (operator requested)
- ADR numbering: still needs resolution
- hkarani adding ADR to #1170 — review when ready
- Our ADRs still need: prettier fixes + Franchovy alignment

### D. For marketing person (NEW):

**V2 Marketing Plan Revision Brief**

- 6 specific corrections (see Section 1 above)
- Revised rollout objectives (5 items)
- "Under the Hood" series can reference our ADRs as source material
- Remove: state machines, NIP-17 as separate bullet
- Add: CMS layer, Gamma Markets compatibility

### E. For devops (NEW or existing):

**Staging Relay Strategy**

- No ADR — yolo-nuke approach
- Extract 2 improvements first: Health-Z + start-up scripts
- Health-Z: reflect functionality, not just liveness
- Start-up scripts: analyze problem, restart indexing server/base
- Then: nuke search index + data as needed (it's staging)

---

## 6. CONTEXT WINDOWS REQUIRED

Each of these needs a separate, persistent context to avoid contamination:

1. **plebeian-my-prs** — needs #1171 architecture change context (CVM status-first, pubkey derivation chain). This is complex and must be done right.
2. **plebeian-market-reviews** — needs turizspace review queue + hkarani #1170 monitoring context
3. **plebeian-market-ADRs** — needs ADR decisions (deprioritize ADR-015, consider CVM pubkey ADR, numbering)
4. **NEW: plebeian-marketing-onboarding** — needs V2 marketing plan revision context (6 corrections, revised objectives)
5. **NEW: plebeian-devops-infra** (or fold into existing) — staging relay Health-Z + start-up scripts
6. **NEW: plebeian-gamma-interop** (deferred) — Gamma Markets compatibility verification

---

## 7. KEY DECISIONS MADE IN THIS CALL

1. **CVM is the source of truth for live activity status** — client does not derive status from timestamps
2. **No ADR for relay persistence** — staging relay issues solved with operational fixes, not architecture
3. **State machines stay as proposed ADR** but are NOT marketed as a feature yet
4. **NIP-17 folds into NIP-99 interoperability** for marketing purposes
5. **CMS layer is a major rollout objective** — not previously highlighted
6. **Mint reachability not required in validation** — redundant, optional status maintained by validator
7. **hkarani owns the auction validation ADR** — he'll write it into #1170

---

_Meeting notes prepared from audio recordings. No implementation actions taken._
_For sharing with team members after operator review._
