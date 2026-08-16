# HANDOVER D — V2 Marketing & Content Brief

**For:** Content & Announcements / Marketing person
**From:** Plebeian team call (2026-07-23)
**Status:** Ready for use — no implementation required

---

## YOUR ROLE

You write content that tells the public what Plebeian Market is building. This brief gives you the verified, merge-checked facts so you never announce something that isn't actually shipped.

---

## THE GOLDEN RULE

**Only announce what's merged to main.** Code on a branch is "in progress" — it's real, it works internally, but it's NOT in users' hands. If you're unsure, check: "Is this merged to the `master` branch?" If no → don't announce it as a feature.

---

## THE 5 V2 OBJECTIVES (with verified readiness)

### 1. NIP-99 / Gamma Markets Interoperability — READY

**What it means:** A listing on Plebeian is visible and buyable from other Nostr marketplace apps (Conduit, Shopstr). And vice versa — Plebeian can show and process listings from those apps.

**What's actually shipped (merged to main):**

- Private order messages follow the shared Nostr spec (6 merged PRs)
- Content from other clients is cleaned/sanitized before display
- Order details are isolated (one order can't break another)
- **Buyer privacy scanner** — strips personal delivery details from public events before broadcast

**Known gap:** Issue #1122 — the marketplace spec itself has an inconsistency ("digital product" vs "digital delivery"). This is an ecosystem-level spec issue, not Plebeian-only.

**What you CAN say:** "Plebeian Market now speaks the shared Nostr marketplace language. Your listings work across apps. Your delivery details stay private."

**What NOT to say:** Don't claim 100% compatibility with every client. The spec gap (#1122) exists.

---

### 2. Decentralized Auctions — IN PROGRESS (NOT on main)

**What it means:** Real peer-to-peer bidding. Anti-snipe protection. Nostr-native money (NIP-60/Cashu). No middleman holding funds.

**What's been built (on the `auctions` branch, ~30 PRs):**

- Live real-time bid streaming
- Wallet integration (NIP-60/Cashu)
- Anti-snipe rules (hard end time + deadline extension)
- Minimum bid count before settlement
- Hardened settlement with recovery
- Full bidding interface (countdown, confirm-rules step, sorting, participant details)
- Self-bid prevention (can't bid on your own auction)

**What's NOT built yet (even on the branch):**

- Bidder notifications
- "You won!" celebration screen
- Full validation system for auction rules

**The umbrella PR (#1138) that merges all this to main is still in review.**

**What you CAN say:** "Auctions are coming. Real P2P bidding, Nostr-native money, anti-snipe fairness. We're building it carefully." (teaser, not announcement)

**What NOT to say:** Don't say auctions are live. Don't promise specific features that aren't on main yet.

---

### 3. Self-Hostable Community Instances — EARLY STAGE

**What it means:** Groups (meetups, collectives, local economies) run their own Plebeian instance.

**What's shipped:** Community pages lazy-load efficiently. Content sanitization (shared with Objective 1).

**Reality:** Thin. No real self-hosting infrastructure merged yet.

**What you CAN say:** "We envision community-run marketplaces. Early days." (vision, not promise)

---

### 4. Applesauce Migration — EARLY STAGE (internal)

**What it means:** Swapping internal Nostr plumbing for a newer library. Faster, more maintainable.

**What's shipped:** Wave 0 I/O seam is in place. Order reading switched to new system.

**What you CAN say:** "We're upgrading our internals for speed and maintainability. Gradual, careful, nothing breaks." (high-level credibility story)

**CRITICAL: Do NOT mention state machines.** PM confirmed this is discussion-only, NOT a shipped feature or even a committed objective.

---

### 5. CMS Layer (Seller Websites) — EARLY STAGE (nothing merged)

**What it means:** Sellers build custom storefront websites using Plebeian CMS, publish to Nostr, viewable from any compatible client.

**What's shipped:** Nothing. PR #953 has been open since May, never merged.

**What you CAN say:** Nothing yet. This is a roadmap vision, not a feature.

---

## CORRECTIONS FROM THE TEAM CALL

The original marketing PDF had several items that the team corrected:

| Original Plan Item                                | Correction                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "NIP-99 Native — Stalls visible across ecosystem" | Clarify: this is NIP-99 + **Gamma Markets compatibility**. Must work with Conduit, Shopstr, and other Gamma Market clients. Full flow from one client to another. |
| "NIP-17 Private Orders" listed separately         | **Remove as separate item.** NIP-17 is part of NIP-99/Gamma Markets interoperability. Don't mention separately.                                                   |
| "State machines" in architecture upgrades         | **Remove from marketing.** Discussion-only, not shipped, not committed.                                                                                           |
| CMS layer missing from plan                       | **Add as major objective.** Sellers deploy custom NIP-99 compatible storefronts via Plebeian CMS.                                                                 |

---

## NARRATIVE ANGLES (approved by team)

1. **"One marketplace, many doors."** — Interoperability story. No walled gardens. Your listing works everywhere.

2. **"Your delivery details stay yours."** — Privacy scanner is a genuine differentiator. Built-in, not opt-in.

3. **"Real auctions, coming soon."** — Tease the auctions. P2P bidding, Nostr-native money, anti-snipe. Hold full piece until merge lands.

4. **"Built for the long haul."** — Engineering discipline. Careful, gradual upgrades. For technical audience.

---

## "UNDER THE HOOD" EDUCATIONAL SERIES

The original plan proposed 5 topics. Here's the team-verified version:

| Topic                                       | Status                              | Source Material                  |
| ------------------------------------------- | ----------------------------------- | -------------------------------- |
| 1. Decentralized auctions & price discovery | TEASE ONLY (not on main yet)        | auctions branch PRs, AUCTIONS.md |
| 2. Anti-snipe protection                    | TEASE ONLY                          | hkarani #1147                    |
| 3. NIP-17 private orders                    | PART OF interop story, not separate | ADR-013, ADR-014                 |
| 4. Applesauce migration                     | READY (Wave 0 shipped)              | ADR-0002                         |
| 5. Security & reliability work              | READY (mention generally)           | Our ADRs #1176, #1177            |

**Best content to write NOW:** The interop story (#1 above) and the privacy scanner (#2). Both are merged, verified, and strong narratives.

---

## SUCCESS METRICS (from original plan, validated)

- Migrated + new stalls
- Sales volume (sats)
- Self-hosted instances (when infra exists)
- Engagement (zaps, newsletter subs)
- Featured shop success stories

---

_This brief supersedes the original V2 Marketing PDF. All readiness labels verified against merge status as of 2026-07-23._
