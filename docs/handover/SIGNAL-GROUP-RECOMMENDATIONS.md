# Signal Group Recommendations
**For:** Operator (c08r4d0r)
**From:** Orchestrator analysis of team call + project state
**Date:** 2026-07-23

---

## CURRENT GROUPS (7)

| Group | Role | Status |
|-------|------|--------|
| plebeian-manager | Orchestrator | ACTIVE — this group |
| plebeian-my-prs | Our PRs to upstream | ACTIVE — briefed, producing handover |
| plebeian-market-reviews | Reviewing others' PRs | ACTIVE — briefed, producing handover |
| plebeian-market-ADRs | Architecture decisions | ACTIVE — briefed, producing handover |
| plebeian-call-agenda | Weekly call prep | ACTIVE |
| plebeian-market-web-shop | Web shop operations | INDEPENDENT |
| plebeian-merchant-module | Merchant features | INDEPENDENT |

---

## RECOMMENDED NEW GROUPS

### 1. plebeian-marketing-onboarding — HIGH PRIORITY

**Why:** The marketing/content person has NO dedicated context window. They received a V2 marketing PDF, wrote a content brief, and have no group to work in. Their work (announcements, educational content, user onboarding) needs its own persistent context.

**What it would handle:**
- V2 marketing plan revisions (using Handover D)
- "Under the Hood" educational content series
- Feature announcements based on merged PRs
- User onboarding flows and documentation
- Gamma Markets compatibility messaging
- Seller spotlight stories
- Success metrics tracking

**Feeds from:**
- plebeian-my-prs → what's merged (announceable)
- plebeian-market-ADRs → architecture changes to explain
- plebeian-market-reviews → external contributor highlights

**Context needed:**
- V2 Content & Announcement Brief (Handover D)
- Merge status of each objective
- Original marketing PDF + team call corrections
- Gamma Markets spec context

---

### 2. plebeian-devops-infra — MEDIUM PRIORITY

**Why:** The staging relay Health-Z improvement and start-up script work have no home. These are near-term tasks ("next few days, maybe tomorrow"). maximotodev's relay ops, deploy hardening, and CI diagnostics need tracking. The yolo-nuke strategy needs execution with the 2 prerequisite improvements.

**What it would handle:**
- Health-Z liveness check upgrade (Handover E)
- Reindex tool implementation
- Start-up script improvements
- Staging relay yolo-nuke execution
- Deploy workflow monitoring
- CI diagnostics and fixes

**Context needed:**
- Handover E (staging relay strategy)
- compositeStore architecture (BoltDB source of truth, Bleve disposable)
- Go relay codebase at `deploy-simple/relay/`
- systemd + PM2 deployment architecture

---

### 3. plebeian-gamma-interop — MEDIUM PRIORITY (can defer)

**Why:** Gamma Markets cross-client compatibility is Objective 1 (the strongest V2 story). But verifying it requires testing against Conduit, Shopstr, and other clients. This is a distinct workstream that doesn't fit neatly into "our PRs" or "reviews."

**What it would handle:**
- Cross-client compatibility testing (Conduit, Shopstr)
- NIP-99 spec compliance verification
- Issue #1122 tracking (spec inconsistency)
- End-to-end flow testing (list → discover → buy → settle across clients)
- Reporting interop bugs to upstream spec or other clients

**Context needed:**
- NIP-99 spec
- Gamma Markets protocol documentation
- Plebeian's merged interop PRs (6 PRs)
- Privacy scanner implementation details

---

## GROUPS NOT RECOMMENDED

| Proposed Group | Why Not |
|---|---|
| plebeian-auctions | Auction PRs span existing groups (my-prs, reviews, ADRs). No need for separate group unless volume increases significantly. |
| plebeian-community | External contributor coordination is handled by plebeian-market-reviews. |
| plebeian-security | Security concerns are distributed across ADRs (#1176, #1177), reviews (#1170), and our PRs. No standalone need. |

---

## COORDINATION INFRASTRUCTURE (STILL MISSING)

The time capsule identified that `~/worktrees/ws-plebeian-market/docs/coordination/` doesn't exist. Channel prompts reference TRACKS-REGISTRY.yaml, INDEX.md, and DECISIONS-AND-BLOCKERS.md but they were never created.

**Recommendation:** Create these files to enable cross-group coordination:

1. **TRACKS-REGISTRY.yaml** — maps each workstream to its owning group + status
2. **INDEX.md** — master index of all handover docs, meeting notes, ADRs
3. **DECISIONS-AND-BLOCKERS.md** — living document of decisions made + current blockers

These should live in the repo (or a shared location) that all groups can reference.

---

## INFORMATION FLOW DIAGRAM

```
                    ┌─────────────────────┐
                    │  plebeian-manager    │
                    │  (ORCHESTRATOR)      │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ plebeian-my-prs │ │ plebeian-reviews │ │ plebeian-ADRs   │
│ (our PRs)       │ │ (ext PRs)        │ │ (architecture)  │
└────────┬────────┘ └────────┬─────────┘ └────────┬────────┘
         │                   │                    │
         │    ┌──────────────┤                    │
         │    │              │                    │
         ▼    ▼              ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              NEW: plebeian-marketing-onboarding          │
│              (announcements, content, onboarding)        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              NEW: plebeian-devops-infra                  │
│              (relay, deploy, CI, Health-Z)              │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              NEW: plebeian-gamma-interop (deferred)      │
│              (cross-client compatibility)               │
└─────────────────────────────────────────────────────────┘
```

---

*Analysis based on team call action items + project state assessment.*
