# Plebeian Market V2 — Content & Announcement Brief

Prepared for: Content & Announcements
Date: July 2026
Scope: What V2 means, what is actually shipped (merged code only), and what is ready to talk about publicly.

HOW TO READ THIS: "Shipped" means the code is merged to the main branch and will reach users. Anything marked "on a branch" or "in review" is written and working internally but NOT yet in users' hands — do not announce it as a live feature. The readiness labels reflect only what is merged.

## 1. WHAT V2 MEANS

V2 is about making Plebeian Market a true part of the wider Nostr marketplace ecosystem, not an island. The headline promise is interoperability: a listing or auction created in Plebeian should be discoverable and usable from other Nostr marketplace apps (Conduit, ShopStr, and other "Gamma Market" clients), and vice versa. On top of that foundation, V2 adds real peer-to-peer auctions, community-run instances, and under-the-hood upgrades that make the whole thing faster and easier to maintain.

## 2. THE 5 V2 OBJECTIVES

### OBJECTIVE 1 — NIP-99 / GAMMA MARKETS INTEROPERABILITY

**Readiness: READY (with one known spec gap to track)**

Goal: When a seller lists something on Plebeian, people using other Nostr marketplace apps can see it, buy it, and complete the order — and Plebeian can do the same with listings from those other apps. One marketplace, many doors in.

What's shipped (merged):

- Private order messages now follow the shared Nostr spec, so other clients can correctly read orders coming from Plebeian (6 merged PRs).
- Content coming into Plebeian from other clients is cleaned and sanitised before display, so broken or incompatible data doesn't break the page.
- Order details are isolated, so one order can't interfere with another.
- A privacy scanner now strips buyers' personal delivery details out of public events before they're broadcast. Strong trust/privacy story.

Known gap: One open issue (#1122) where the marketplace spec itself is internally inconsistent (wording around "digital product" vs "digital delivery" conflicts). This is a spec-level problem across the ecosystem, not a Plebeian-only bug, but it's unresolved.

### OBJECTIVE 2 — DECENTRALIZED AUCTIONS

**Readiness: IN PROGRESS — code exists on a branch, NOT yet on main**

Goal: Real peer-to-peer auctions where people bid directly against each other, with protections against last-second sniping and a proper way to settle who won and move the item to them.

What's been built (on the auctions branch, ~30 PRs):

- Live, real-time bid streaming.
- Wallet integration (NIP-60 / Cashu) so buyers can deposit funds and place bids using Nostr-native money.
- Anti-snipe rules: auctions have a hard end time, and bids near the deadline extend the clock so nobody gets sniped at the last second.
- A minimum number of bids must be placed before an auction can settle.
- Hardened settlement process, including recovery if something goes wrong mid-settlement.
- A complete bidding interface: live countdown timers, a "confirm the rules" step before bidding, highlighting of key bids, sorting, participant details, and an advanced details section.
- You can't bid on your own auction.

IMPORTANT — NOT ON MAIN YET: All of the above is on a development branch. The umbrella pull request (#1138) that brings it all into the main app is still open and awaiting final review. Nothing here is in users' hands today.

Still missing even on the branch: bidder notifications, a "you won!" celebration screen, and a full validation system for auction rules.

### OBJECTIVE 3 — SELF-HOSTABLE COMMUNITY INSTANCES

**Readiness: EARLY STAGE**

Goal: Let groups — a local meetup, a hobby collective, a regional economy — run their own Plebeian instance so they have a marketplace tailored to their community.

What's shipped (merged): Community pages now load efficiently (lazy-loading). Content sanitisation improvements (shared with Objective 1).

Reality check: This is thin. No meaningful self-hosting infrastructure has been merged yet. The vision is clear but the code to deliver it is not there.

### OBJECTIVE 4 — APPLESAUCE MIGRATION (Internal Upgrade)

**Readiness: EARLY STAGE — behind-the-scenes change, not a user-facing feature**

Goal: Swap out the internal "plumbing" of Plebeian for a newer, better-maintained library so the app runs faster and is easier for developers to work on. Done gradually, piece by piece, so nothing breaks.

What's shipped (merged): The foundational plumbing layer ("Wave 0 I/O seam") is in place. The way Plebeian reads orders has been switched over to the new system.

Note: This is engineering infrastructure. State machines (a related topic that came up in discussion) are explicitly NOT part of this objective — PM confirmed that's discussion only.

### OBJECTIVE 5 — CMS LAYER + COMPONENT MIGRATION (Seller Websites)

**Readiness: EARLY STAGE — nothing merged**

Goal: Let sellers build their own custom storefront websites using Plebeian's tools, publish those sites to Nostr, and have them viewable from any compatible Nostr marketplace app.

What's shipped: Nothing yet. A pull request (#953) has been open since May but has NOT been merged.

## 3. WHAT'S READY TO ANNOUNCE NOW

Only items with merged code on the main branch. Listed by priority:

1. **Cross-marketplace compatibility (Objective 1).** Plebeian now speaks the shared Nostr marketplace language — orders, listings, and messages work across apps like Conduit and Shopstr. This is the strongest, most concrete V2 story available.

2. **Buyer privacy protection (Objective 1).** Personal delivery details are automatically stripped from public data before anything is broadcast. Strong trust angle.

3. **Performance & maintainability groundwork (Objective 4).** Frame carefully — it's a "faster, more reliable Plebeian" story, not a feature list. Keep it high-level.

## 4. WHAT TO HOLD ON

Do NOT announce these as live or shipping yet:

- **Decentralized auctions (full feature):** ~30 PRs of work exists, but it's on a branch. The merge PR (#1138) is still in review. Not in users' hands.
- **Auction notifications, "you won" screen, rule validation:** Not built yet, even on the branch.
- **CMS / seller custom websites:** PR #953 open since May, never merged. Stalled.
- **Self-hostable community instances:** Vision only; no real infrastructure merged.
- **State machines:** PM confirmed this is discussion-only, NOT a V2 objective.

## 5. KEY NARRATIVE ANGLES

1. **"One marketplace, many doors."** The interoperability story. A seller on Plebeian isn't locked in — their listing is visible and buyable from any compatible Nostr marketplace app. Frame V2 around openness and the end of walled gardens.

2. **"Your delivery details stay yours."** The privacy scanner is a genuinely good trust story — we proactively scrub personal info from public data before it ever leaves the app. In a decentralized world, this kind of built-in privacy protection is a differentiator.

3. **"Real auctions, coming soon" (teaser, not announcement).** When auctions land on main, this is the flagship feature: peer-to-peer bidding with Nostr-native money, anti-snipe fairness, and no middleman holding the funds. Hold the full piece until the merge lands, but it's worth seeding anticipation.

4. **"Built for the long haul."** The Applesauce migration and the gradual, careful approach to V2 show engineering discipline. For a developer/technical audience, this is a "we're doing this right, not fast" credibility story. Keep it honest — early stage, real progress, more to come.

## QUICK REFERENCE — READINESS AT A GLANCE

1. Gamma Markets Interoperability — READY (1 spec gap open)
2. Decentralized Auctions — IN PROGRESS (on branch, not on main)
3. Self-Hostable Instances — EARLY STAGE
4. Applesauce Migration — EARLY STAGE (internal/infra)
5. CMS / Seller Websites — EARLY STAGE (nothing merged)
