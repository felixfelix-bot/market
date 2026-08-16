# Plebeian Market — Team Call Action Package

**2026-07-23 | Planning only — no implementation**

---

## DECISIONS MADE

| #   | Decision                                            | Rationale                                                                                                       |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | **CVM is source of truth for live activity status** | Live event only works when CVM hosts + updates data. Client-side timestamp derivation is architecturally wrong. |
| 2   | **No ADR for relay persistence (#1174)**            | Staging-only issue. Yolo-nuke search index instead.                                                             |
| 3   | **State machines: proposed ADR, NOT marketed**      | Discussion stage only. Remove from marketing claims.                                                            |
| 4   | **NIP-17 folds into NIP-99 interop**                | Not a separate marketing bullet.                                                                                |
| 5   | **CMS layer = major rollout objective**             | Sellers deploy custom NIP-99 storefronts via Plebeian CMS.                                                      |
| 6   | **Mint reachability NOT required in validation**    | Redundant — already required for bidding. Validator may optionally maintain status.                             |
| 7   | **hkarani owns auction validation ADR**             | Writing into #1170. Discuss adjustments next meeting.                                                           |

---

## ACTION ITEMS

### DO THIS WEEK

| Who                         | What                                | Detail                                                                                                                                                                                               |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **plebeian-my-prs**         | Fix #1171 architecture              | Replace client-side status derivation with CVM-status-first. If no CVM → no event. If CVM stale → network error. Use existing `configStore.state.config.cvmServerPubkey` — do NOT add new env reads. |
| **plebeian-my-prs**         | Fix prettier on #1171, #1164, #1165 | One `bun run format` pass. Unblocks 5 PRs.                                                                                                                                                           |
| **plebeian-my-prs**         | Close #1150                         | Empty diff after revert. maximotodev explicitly recommended.                                                                                                                                         |
| **plebeian-my-prs**         | Rebase #1118                        | Hard merge conflict on security PR.                                                                                                                                                                  |
| **plebeian-market-reviews** | Review #1132 + #1160 (turizspace)   | Operator expects 2 team member follow-up reviews. Both nearly merge-ready.                                                                                                                           |
| **plebeian-market-reviews** | Monitor #1170 (hkarani)             | Picking back up, adding ADR file. Prepare to review when ready.                                                                                                                                      |
| **devops**                  | Upgrade Health-Z                    | Currently static `"ok"`. Must probe Bleve + BoltDB, return 503 on divergence.                                                                                                                        |
| **devops**                  | Build reindex tool                  | Does not exist. Needed before yolo-nuke or search is permanently degraded.                                                                                                                           |
| **marketing**               | Revise V2 plan                      | 6 corrections (below). Only announce merged code.                                                                                                                                                    |

### NEXT MEETING

- Discuss hkarani's adjusted auction validation ADR
- Resolve ADR numbering (3 incompatible schemes exist)
- Align our ADRs with Franchovy's #1152 framework
- Coordinate #1138 (Auctions V1 umbrella) merge timing — 5 file overlaps with our NIP-53 stack
- Consider CVM pubkey derivation ADR

---

## #1171 ARCHITECTURE CHANGE (detailed)

### Change 1: CVM status-first

**Wrong:** Client derives live activity status from `start_at` / bidding cutoff timestamps.
**Right:** Always resolve to CVM status.

- No CVM detected → no live event
- CVM stops updating at expected frequency → show network/live availability error
- Client must NOT treat timestamps as event boundaries

**Found in codebase:** `nip53.ts` currently has `deriveLiveActivityStatus()` (timestamp-based) and `resolveLiveActivityStatus()` (accepts relayStatus param). The CVM author filtering happens in caller `liveChat.tsx:40`. nip53.ts itself does NOT reference CVM pubkey — this is correct, keep it that way.

### Change 2: Pubkey derivation chain

The canonical function is `resolveCvmServerPubkey()` in `src/lib/cvm-identity.ts:22-35` (duplicated in `src/server/runtime.ts:52-64`).

| Tier | Source                  | Env Vars                                                       |
| ---- | ----------------------- | -------------------------------------------------------------- |
| 1    | Service-specific pubkey | `CVM_CURRENCY_SERVER_PUBLIC_KEY` \|\| `CURRENCY_SERVER_PUBKEY` |
| 2    | General CVM pubkey      | `CVM_SERVER_PUBLIC_KEY` \|\| `CVM_SERVER_PUBKEY`               |
| 3    | Derive from private key | `CVM_SERVER_KEY` → `getPublicKey()`                            |
| 4    | THROW                   | No hardcoded fallback                                          |

Browser flow: `resolveCvmServerPubkey()` → `/api/config` → `configStore.state.config.cvmServerPubkey` → consumers.

**Action for #1171:** Read from `configStore.state.config.cvmServerPubkey` (same as `liveChat.tsx` already does). Do NOT add independent env reads.

**Inconsistencies found:**

- Function duplicated in 2 files (DRY violation)
- `PlebeianServerClient.ts:79` has hardcoded production pubkey bypassing the chain
- E2E test references stale "self-detection guard" that no longer exists

---

## STAGING RELAY: YOLO-NUKE STRATEGY

### Architecture

```
compositeStore {
    raw:    BoltDB    ← SOURCE OF TRUTH (safe)
    search: Bleve     ← DISPOSABLE (nuke target)
}
```

### Before nuking — 2 improvements to extract:

**1. Health-Z upgrade** (`deploy-simple/relay/cmd/market-relay/main.go:93-96`)

- Current: returns `"ok\n"` unconditionally
- Target: probe Bleve query + BoltDB count, compare, return 503 with JSON if divergent
- The `compositeStore` already has both handles — small Go change (~30-50 lines)

**2. Reindex tool** (does NOT exist — must build)

- Iterates `raw.QueryEvents({})` → feeds each into `search.SaveEvent()`
- Without this, nuking = permanent search degradation
- Can be `market-relay reindex` subcommand or standalone tool

### Nuke procedure (after improvements):

```bash
sudo systemctl stop market-relay
sudo rm -rf /var/lib/market-relay/search
sudo systemctl start market-relay
market-relay reindex
curl http://localhost:10549/healthz  # verify counts match
```

---

## V2 MARKETING — 6 CORRECTIONS

| Original                       | Correction                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| "NIP-99 Native"                | Clarify: NIP-99 + **Gamma Markets compatibility**. Must work with Conduit, Shopstr, other clients. Full cross-client flow. |
| NIP-17 listed separately       | **Remove.** Part of NIP-99 interop.                                                                                        |
| State machines in architecture | **Remove from marketing.** Discussion only.                                                                                |
| CMS layer missing              | **Add as major objective.** Custom seller storefronts, NIP-99 compatible.                                                  |
| "Architecture upgrades"        | Keep Applesauce migration. Remove state machines.                                                                          |

**Only 3 things are announceable NOW** (merged to main):

1. Cross-marketplace compatibility (NIP-99/Gamma Markets interop)
2. Buyer privacy protection (delivery details stripped from public events)
3. Performance groundwork (Applesauce Wave 0)

**Everything else is on a branch or not built. Do NOT announce.**

---

## PR STATUS AT A GLANCE

### Our PRs (0 approved of 12)

| PR    | Status                   | Action                                                 |
| ----- | ------------------------ | ------------------------------------------------------ |
| #1171 | prettier fail            | Architecture changes (above) + format fix              |
| #1172 | no CI (stacked)          | Wait for #1171                                         |
| #1173 | no CI (stacked)          | Wait for #1172                                         |
| #1164 | prettier fail            | Format fix. Franchovy wants test coverage.             |
| #1165 | prettier fail            | Format fix. Franchovy questions scope (contextvm/e2e). |
| #1175 | no CI                    | Wait                                                   |
| #1176 | no CI                    | Reference hkarani #1170 as concrete implementation     |
| #1177 | no CI                    | Wait                                                   |
| #1150 | EMPTY DIFF               | **Close.** maximotodev recommended.                    |
| #1115 | 20 days stale            | Ping maximotodev                                       |
| #1116 | unreviewable (209 files) | Close or shave off focused PRs                         |
| #1118 | merge conflict           | Rebase                                                 |

### External PRs needing attention

| PR        | Author      | Action                                                                                     |
| --------- | ----------- | ------------------------------------------------------------------------------------------ |
| **#1170** | hkarani     | **REVIEW when updated.** Auction validation, 22 files, implements #1151. Zero reviews yet. |
| #1132     | turizspace  | Follow-up review (2 team members expected)                                                 |
| #1160     | turizspace  | Follow-up review (2 team members expected)                                                 |
| #1168     | Franchovy   | Wait for his changes-requested update                                                      |
| #1136     | maximotodev | Near merge-ready. Franchovy approved.                                                      |
| #1138     | Franchovy   | **MONITOR.** Auctions V1 umbrella, 5 file overlaps with our stack.                         |

---

## SIGNAL GROUPS — 3 RECOMMENDED ADDITIONS

| Group                             | Priority       | Purpose                                                                        |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| **plebeian-marketing-onboarding** | HIGH           | Marketing person has no context window. V2 content, announcements, onboarding. |
| **plebeian-devops-infra**         | MEDIUM         | Health-Z, relay ops, deploy, reindex tool. Near-term tasks.                    |
| plebeian-gamma-interop            | MEDIUM (defer) | Cross-client compatibility testing. Can wait.                                  |

---

## REFERENCE FILES — CLICK TO OPEN

Base: `felixfelix-bot/market` branch `docs/team-call-2026-07-23-package`

| Document                                                                                                                                                        | What's in it                                                                  | Who should read                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| **[MASTER-PACKAGE (this file)](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/MASTER-PACKAGE-2026-07-23.md)**             | Decisions, action items, per-person sections, index                           | Everyone — start here                   |
| [Meeting Notes](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/MEETING-NOTES-2026-07-23.md)                               | 7 decisions, 16 action items, full call writeup                               | Everyone                                |
| [Time Capsule](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/TIME-CAPSULE-2026-07-23.md)                                 | 25KB full project state — all contributors, all PRs, all ADRs                 | Need deep context on project state      |
| [High-Level Overview](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/HIGH-LEVEL-OVERVIEW-2026-07-23.md)                   | Condensed project state, quick read                                           | Need overview fast                      |
| [V2 Content & Announcement Brief](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/V2-CONTENT-BRIEF-2026-07.md)             | Merge-verified marketing reference, what to announce/hold                     | Marketing person                        |
| [Pre-Call Meeting Brief](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/adr/MEETING-BRIEF-2026-07-23.md)                  | 406 lines ADR analysis, code smells, strategic recommendations                | Architecture discussion                 |
| [Handover A: #1171 Architecture](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/handover/HANDOVER-A-1171-ARCHITECTURE.md) | CVM status-first change + pubkey derivation chain codebase map                | plebeian-my-prs, anyone touching NIP-53 |
| [Handover A: Our PRs](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/handover/HANDOVER-A-MY-PRS.md)                       | All our PRs, quick wins, #1115/#1116/#1118 recommendations                    | plebeian-my-prs                         |
| [Handover B: Review Queue](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/handover/HANDOVER-B-REVIEWS.md)                 | turizspace #1132/#1160, hkarani #1170, Franchovy #1168, priority order        | plebeian-market-reviews                 |
| [Handover C: ADR Decisions](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/handover/HANDOVER-C-ADRS.md)                   | ADR-015 deprioritized, numbering crisis, CVM pubkey ADR outline, missing ADRs | plebeian-market-ADRs                    |
| [Handover D: Marketing Brief](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/handover/HANDOVER-D-MARKETING.md)            | V2 corrections, narrative angles, "Under the Hood" series                     | Marketing person                        |
| [Handover E: Staging Relay](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/handover/HANDOVER-E-STAGING-RELAY.md)          | Health-Z upgrade, reindex tool, yolo-nuke procedure                           | DevOps / maximotodev                    |
| [Signal Group Recommendations](https://github.com/felixfelix-bot/market/blob/docs/team-call-2026-07-23-package/docs/handover/SIGNAL-GROUP-RECOMMENDATIONS.md)   | 3 new groups proposed, information flow diagram                               | Operator / coordination                 |

---

## FOR EACH PERSON — YOUR SECTION

### maximotodev (Diego Aguero) — Lead Maintainer

You are the merge gatekeeper. Everything goes through your review.

**Your immediate items:**

- Your PR #1136 (NIP-17 order helper) is near merge-ready. Franchovy approved. 4 minor Codex threads remain.
- Your ADR-015 (relay persistence, PR #1174) is **deprioritized by team decision** — no ADR needed. Staging relay will be yolo-nuked instead. But 2 improvements should be extracted first: Health-Z upgrade + reindex tool. See → `handover/HANDOVER-E-STAGING-RELAY.md`
- Please review #1171 (our NIP-53 status resolver) once we push the architecture changes (CVM status-first). ETA this week.
- #1150 (our dead PR) — we're closing it per your recommendation.
- #1115 (our aggregator relay, 20 days stale) — needs your eyes when you have time.

**What we need from you:** Continue being the thorough reviewer you are. We're aligning our ADRs with Franchovy's framework to reduce friction.

---

### Franchovy — Architecture Lead

You own the ADR system and the Auctions V1 umbrella. We want to collaborate, not compete.

**Your immediate items:**

- #1168 (auction order details): needs your changes-requested update. CI green. 3 blockers from our review + maximotodev's validation concerns.
- #1144 (settlement steps): e2e-pricing failing. Needs rebase onto current auctions branch.
- #1138 (Auctions V1 umbrella): we need to coordinate merge timing. Our NIP-53 stack (#1171-1173) touches 5 of the same files (LiveChatPanel, LiveChatMessage, nip53.test.ts, contextvm worker). We should agree on merge order.
- Your #1152 (Documentation Structure) aligns with our meta-ADR proposal (persistent rule + transient violations). We'd like to merge these concepts.
- Your #1153 (Component/UI Migration) — we contributed the 775 raw color violation data. Happy to help further.

**Our ADRs that touch your areas:**

- #1165 (store layer) — you flagged scope concern (contextvm/e2e imports). We're addressing.
- #1176 (relay validation) — complements hkarani's #1170 which implements your #1151. Not competing.

**What we need from you:** Guidance on ADR numbering (3 schemes exist). And merge timing coordination for the auctions branch.

---

### hkarani (Hezron Karani) — Primary Auction Contributor

You're building the most security-critical auction code. Your #1170 is the #1 PR needing review.

**Your immediate items:**

- #1170 (auction validation): team confirmed you're picking it back up and adding the ADR file. When ready, we'll review immediately.
- **Mint reachability:** team decision — do NOT require it in validation. It's already required for bidding. You MAY optionally maintain mint reachability status to avoid everyone DoSing the mint independently.
- The ADR you're writing into #1170 — we'll discuss adjustments at the next meeting.
- #1147 (anti-snipe), #1146 (bid input): changes requested. Waiting on you.
- #1142 (notifications): changes requested. Conceptual overlap with our NIP-53 live chat — we subscribe to similar events.

**What we need from you:** When #1170 is updated, ping us. We have context on the validation architecture and are ready to review fast.

---

### turizspace (MK-Turiz) — UX Contributor

Your PRs are nearly across the line.

**Your immediate items:**

- #1160 (loading indicators): all maximotodev blockers addressed. Franchovy approved. Team expecting 2 follow-up reviews this week.
- #1132 (shipping display): convertBetweenCurrencies bug fixed today. maximotodev raised 4 new issues. Active.
- #1008 (image compression): 12 days stale. e2e fixed (6/6 pass). Needs maximotodev re-review.

**What we need from you:** Nothing blocked on our side. Your work is independent of ours. Keep shipping.

---

### Content & Marketing Person

You wrote the V2 marketing plan. The team reviewed it and gave 6 corrections.

**Your immediate items:**

- Revise the V2 plan with the 6 corrections (see "V2 MARKETING — 6 CORRECTIONS" above)
- **Golden rule:** only announce merged code. 3 things are ready NOW:
  1. Cross-marketplace compatibility (NIP-99/Gamma Markets interop)
  2. Buyer privacy protection (delivery details stripped from public events)
  3. Performance groundwork (Applesauce Wave 0)
- Everything else (auctions, CMS, self-hosting) is on a branch or not built. Do NOT announce as live features.
- State machines: remove from marketing entirely. Discussion only.
- NIP-17: fold into NIP-99 interop, don't list separately.
- CMS layer: ADD as major objective (sellers deploy custom NIP-99 storefronts).

**Your reference docs:** → `V2-CONTENT-BRIEF-2026-07.md` and → `handover/HANDOVER-D-MARKETING.md`

---

### BenGWeeks (Ben Weeks) — Dormant

Your PR #475 (markdown rendering) is 6 months stale, conflicting, no reviews. We've nudged. If you want to revive it, start fresh against current master — the codebase has moved significantly.

---

### Harshdev098 — Dormant

Your PR #694 (NIP-15 shop profiles) is 4 months stale, conflicting. We posted 4 comments asking how to proceed. The core `shopProfile.tsx` module is viable for cherry-pick into a fresh PR if you want to restart.

---

_Compiled by plebeian-manager + 3 sub-managers + 2 research subagents. No implementation actions taken._
