# Extending Auctions Without Imposing a Hard End Time

> **Summary:** This article proposes a "moving bound" auction design where the effective end time is derived from the highest bidder's Cashu timelock rather than a seller-imposed deadline, enabling auctions that run as long as genuine competition continues. The proposal addresses sniping, free-extension attacks, and unbounded exposure — but reveals two hard problems: self-rebidding is capital-inefficient because each rebid must lock the full new amount (delta-based rebids allow trolls to win with a fraction committed), and exponential bid increments must be anchored to the starting price rather than the previous bid to prevent whales from pricing out competitors with a large opening bid. The biggest open challenge is refund latency: losing bidders must wait for the full settlement grace period to expire even if the seller claims immediately, and we are exploring whether a collaborative close mechanism (analogous to Lightning) could enable early refunds. We are seeking input on increment formula design, collaborative refund protocols, and whether Spilman channel techniques for Cashu timelocks could apply to auction settlement.

**Date:** May 2, 2026 (revised from April 26 original)
**Branch:** `auctions/cashu-p2pk-path-oracle-v1`
**Original commit reviewed:** `ed1baef` (April 17, 2026)
**Latest upstream:** `bce6a096` (April 24, 2026)

> **Note:** This is a revised version of the original article, incorporating design discussions with the auction feature's architect, [Schlaus Kwab](nostr:npub182jczunncwe0jn6frpqwq3e0qjws7yqqnc3auccqv9nte2dnd63scjm4rf). The moving-bound proposal is unchanged from the original, but sections on self-rebidding, exponential increment design, and open challenges have been added or substantially revised. The original was based on commit `ed1baef` from April 17. The branch has since advanced with additional commits including progress bar UI, dev mode grace periods, and orphaned token cleanup. Some or all of the design suggestions below may already be implemented or superseded on the current tip. Treat this as a snapshot of a conversation, not the final word.

---

## The problem

The current auction implementation uses a **bounded soft-close** to prevent sniping. When a bid arrives near the end of the auction, the closing time extends by a fixed amount — but only up to a seller-defined `max_end_at`. The AUCTIONS codex is explicit about this:

> Anti-sniping is only acceptable with a hard upper bound (`max_end_at`).
> Without a hard upper bound, anti-sniping is not acceptable.

The concern is real. Without a bound, the auction could theoretically run forever, and lower bidders' Cashu ecash would remain locked indefinitely.

But [Chief Monkey](nostr:npub1a3um269aaf3u5cy37kuykrrrnsg2pyv7za06pxjduv25lq5sdujs2qmdj6) wants auctions where **the seller does not impose a hard end time on the bidders**. The auction should last as long as bidders are genuinely competing. Setting `max_end_at` at creation time means the seller is declaring "this auction will definitely end by X" — and that constraint comes from the seller, not from bidder behavior.

This post explores whether we can remove that constraint while keeping the auction safe for all participants.

---

## Background: why sniping matters

Sniping is when a bidder places a last-second bid just before a hard close, leaving no time for others to respond. In a fixed-deadline auction, sniping is the dominant strategy — you never want to show your hand early. The equilibrium is an auction where nobody bids until the final seconds, which breaks price discovery.

Soft-close auctions solve this by extending the clock when bids arrive near the end. The current implementation uses this approach with `extension_rule: anti_sniping:<window_seconds>:<extension_seconds>` plus a `max_end_at` cap.

## The tension: bounded vs unbounded

The codex rejects unbounded extensions because of a specific concern: **locktime**.

Each bid locks Cashu ecash to a P2PK pubkey with a timelock. The locktime is baked into the proof at creation time — you can't change it later. In the current design, the locktime is set to `max_end_at + settlement_grace_seconds` so that:

1. The seller can always settle before the locktime expires
2. Non-winners can reclaim after the locktime expires

Without `max_end_at`, there's no single locktime that works for all bids. An early bid placed when the auction had 1 hour left needs a different locktime than a bid placed when the auction had 24 hours left.

## The key insight: each bid carries its own deadline

Every bid already has its own locktime. That locktime is the deadline after which the bidder can reclaim their funds. What if we use that deadline as the auction's effective end time?

**Proposed rule:**

```
effective_end_at = highest_bid_locktime - settlement_grace_period
```

The auction ends at a fixed interval before the current highest bidder's locktime expires. When a new bid arrives, it comes with its own (later) locktime, which pushes the effective end forward.

This means:

- The **bound exists** — the auction definitely ends before the highest bid expires
- The bound is **determined by bidders** — not imposed by the seller at creation time
- The bound is **moving** — it shifts forward with each new bid
- The seller always has a **settlement window** — the grace period between effective end and locktime

## How it works in practice

### Bid flow

1. Bidder requests a path grant from the oracle (as today)
2. Oracle computes `current_effective_end` from the latest bid
3. Oracle enforces a locktime constraint:

   ```
   locktime >= current_effective_end + settlement_grace + minimum_extension
   ```

   This guarantees each new bid genuinely extends the auction by at least `minimum_extension` (e.g., 5 minutes), and the seller always gets the full grace period.

4. Oracle returns `{ derivationPath, childPubkey, locktime }` — the locktime is **oracle-dictated**, not bidder-chosen
5. Bidder locks ecash with the specified locktime
6. Bidder publishes bid event
7. `effective_end_at` updates to `locktime - grace`

### Settlement

After `effective_end_at` passes with no new bids, the seller requests a settlement plan. The oracle validates bids, resolves the winner, and the seller derives the child private key to redeem the locked ecash — all within the grace window.

If the seller misses the window, the winner can reclaim. This is correct — the seller failed to perform.

### Non-winners

Lower bidders' locktimes expire normally. They reclaim their ecash after their locktime passes, exactly as today. No funds are trapped.

## Why this avoids the problems with pure unbounded auctions

### No evaporating bids

In a naive unbounded design, the current highest bidder's locktime could expire, leaving the auction with no valid standing bid. The price would need to "drop" to the next-lower bid, which is confusing and potentially exploitable.

With the moving bound, the auction ends _before_ the highest bid expires. The standing bid never evaporates.

### No free-extension attack

In a naive unbounded design, an attacker could place a bid, wait for their locktime to expire, reclaim (net cost: zero), and repeat — extending the auction indefinitely at no cost.

With the moving bound, each bid's locktime must extend beyond the current effective end. The attacker's bid _becomes_ the new highest bid, and the auction doesn't end until _that_ locktime minus grace. The attacker can't reclaim without ceasing to be the highest bidder — and if they do, the auction settles with whoever is.

### No unbounded exposure

With a naive unbounded design plus a doubling increment, bidders face infinite potential exposure. "I'll bid up to 10,000 sats" is meaningless if 20 more doubling rounds could follow.

With the moving bound, the maximum exposure is bounded by the locktime — which is always known at bid time. A bidder can see "the current effective end is in 30 minutes" and make an informed decision.

---

## The self-rebidding problem

The moving-bound design works cleanly when **different bidders** take turns — each new bidder locks fresh funds with a new locktime. The hard case is when **the same bidder wants to raise their own bid**.

Consider a bidder who has placed a bid of 5,000 sats and now wants to bid 8,000 sats. Three approaches exist, and all have problems:

### Option A: Lock only the delta

The bidder locks an additional 3,000 sats with the new locktime. The total "bid" is now 5,000 sats (old locktime) + 3,000 sats (new locktime).

**This does not work.** The bid is split across two locktimes. When the older leg's locktime expires, the bidder can reclaim those 5,000 sats while the auction is still live — leaving only the 3,000-sat leg as the "highest bid." An attacker can troll an auction by placing repeated small rebids, then reclaiming the older legs. The result is a bidder winning with only a fraction of their apparent commitment actually locked.

### Option B: Lock the full new amount

The bidder locks 8,000 sats with the new locktime. The previous 5,000-sat bid remains locked under the old locktime until it expires.

**This is safe but capital-inefficient.** The bidder now has 13,000 sats locked (5,000 old + 8,000 new). The old bid unlocks when its locktime expires, but until then the capital is unavailable. For bidders with limited ecash, this limits their ability to rebid — which favors participants with larger balances (whales).

### Option C: Seller-assisted release

The seller signs something that releases the old bid, allowing the bidder to reuse those funds for the new bid.

**This requires the seller to be online and cooperative at rebid time.** In an asynchronous Nostr marketplace, the seller may be offline. This approach is incompatible with the core design goal: auctions should work without requiring any party to be continuously available.

### Conclusion: abandon rebid chains

Each bid must be **atomic and independent**. A rebid locks the full new amount (Option B). The capital inefficiency is temporary — old bids unlock when their timelocks expire. This is the same model as a traditional auction where you provide a new deposit each time you raise your bid.

The inefficiency is real, but it is a feature, not a bug: it discourages frivolous rebidding and ensures every bid represents a genuine, fully-backed commitment.

---

## Convergence without whale advantage

The moving bound prevents sniping by giving other bidders time to respond. But without an artificial time cap, the auction needs a mechanism to converge to a conclusion. Exponential bid increments are one such mechanism — but the design of the increment formula matters.

### The whale attack on naive exponential increments

A natural first design is to base the minimum increment on the previous bid's size. If each bid must be at least double the previous bid:

```
min_next_bid = current_highest_bid * 2
```

This converges quickly (~20 rounds to reach millions of sats), but it creates a **whale advantage**. A whale can open with a large bid — say 80,000 sats — which immediately sets the next minimum at 160,000 sats. A bidder who was genuinely willing to pay up to 100,000 sats is priced out after a single round, not because the market reached that price through competition, but because the formula made the increment proportional to the whale's opening move.

**Key learning: the size of the previous bid must not be an input to the formula that determines the minimum increment for the next bid.** Otherwise, a well-funded bidder can use their opening bid to set the increment curve, effectively privatizing the auction after round one.

### Alternative: starting-price-based increments

The increment formula could be anchored to the auction's starting price rather than the current highest bid:

```
min_increment(round_n) = starting_price * scalar^n
```

Where `scalar` is a seller-chosen parameter (e.g., `scalar = 2` for aggressive convergence, `scalar = 1.5` for gentler) and `n` is the number of extension rounds. This means:

- A 1,000-sat auction with `scalar = 2` requires +1,000, then +2,000, then +4,000...
- A whale opening at 80,000 sats doesn't change the increment curve — the next bidder still only needs +1,000 (or whatever the formula dictates for the current round)
- The curve is **predictable and visible** from the moment the auction is created

The seller-exposed scalar gives auction creators control over how aggressively their auction converges:

- `scalar = 1.0` — fixed linear increment (current behavior)
- `scalar = 1.5` — gentle exponential, good for art/collectibles
- `scalar = 2.0` — aggressive exponential, good for flash sales
- `scalar > 2.0` — very aggressive, fast convergence

### Other possible approaches

- **Fixed schedule**: a pre-published table of increments (round 1: +1%, round 2: +2%, round 3: +4%...). Fully predictable but less flexible.
- **Absolute cap**: instead of exponential growth, a simple hard cap on the number of extension rounds (e.g., max 10 extensions). Crude but simple.
- **Time-based decay**: the minimum increment grows as a function of time elapsed since auction start, not bid count. This decouples the formula from bid dynamics entirely.

The right answer may be a combination. We're interested in feedback on which approach best resists manipulation while remaining intuitive for sellers and bidders.

---

## Implementation strategy: settlement policy versioning

The current branch (`cashu_p2pk_path_oracle_v1`) is being hardened for merge into main. The moving-bound design described above should **not** block that merge — it should be introduced as a follow-up.

The codebase already supports this cleanly. Every auction event carries a `settlement_policy` tag (currently `cashu_p2pk_path_oracle_v1`), and the oracle gates on it. This is the version discriminator.

The vast majority of the auction infrastructure is **policy-agnostic**:

- Path oracle (kind 30410, grant/redeem flow)
- HD key derivation (`auctionHd.ts`, `auctionP2pk.ts`)
- P2PK lock and ecash receive
- Token envelopes (bid, refund, release DMs)
- Settlement plan computation and winner resolution
- Bid event structure (kind 1023)

The version-specific code is small and localized:

- `getAuctionEffectiveEndAt()` formula
- Locktime source (client-set vs oracle-dictated)
- Auction creation validation (`max_end_at`, `extension_rule` vs `minimum_extension`, `increment_mode`)
- Oracle endpoint validation rules

A suggested path forward:

1. **Consider merging v1 as-is** — bounded `max_end_at` + `anti_sniping` extension rule. Solid, tested, and addresses the core use case.
2. **Introduce `cashu_p2pk_path_oracle_v2`** as a separate PR. Same auction kind (30408), same bid flow, same settlement infrastructure — just a different `settlement_policy` value and the moving-bound logic.
3. **Both policies coexist on relays.** Old auctions settle under v1 rules forever (you can't change rules retroactively). New auctions can use either policy at the seller's choice.

This framing — settlement policies within the same auction kind, not "auctions v1 vs v2" — matches the existing `settlement_policy` tag design and avoids suggesting that the two approaches are fundamentally different products.

---

## Challenges we need help with

We are looking for input from anyone with expertise in Cashu timelocks, ecash protocol design, or auction mechanism design. The following are open problems where we have not yet found a satisfying solution.

### 1. Timelock refund delay vs. settlement window

Each bid's ecash is locked with a timelock set to `locktime = effective_end_at + settlement_grace_period`. The grace period exists to give the seller time to settle after the auction ends — they may be offline when the auction concludes, or the mint may be temporarily unavailable.

The problem: **losing bidders must wait for the full locktime + grace period to expire before they can reclaim their funds**, even if the seller claimed their payment within the first few minutes. The timelock is a worst-case bound, but in the common case, the seller settles quickly and the losing bidders' funds are unnecessarily trapped.

With the current `settlement_grace_period` of 1 hour, every losing bidder waits at least that long after the auction ends. If we shorten the grace period to reduce waiting time, we risk the seller being unable to settle if they or the mint are briefly offline.

**Is there a protocol where the seller's settlement action could unlock early refunds for losing bidders?** Something analogous to a Lightning cooperative close — where the timelock serves as the force-close fallback, but collaboration between parties gives everyone a faster resolution? The seller is already signing settlement transactions. Could that signature also serve as a release signal for non-winners, without requiring a separate interactive protocol?

This would require the seller to be online and cooperative. In the best case (seller online), everyone gets their funds quickly. In the worst case (seller offline), the timelock still works as the fallback. The question is whether this can be made cryptographically sound within Cashu's proof model.

### 2. Optimal increment formula design

As discussed in the convergence section, the increment formula must be independent of the current highest bid to prevent whale manipulation. But we're not confident that anchoring to the starting price is the only (or best) approach.

**What is the right mathematical basis for an increment formula that:**

- Resists manipulation by any single bidder
- Converges reliably (the auction always ends)
- Is simple enough for sellers to understand and configure
- Is predictable enough for bidders to make informed decisions

We're particularly interested in whether there are established results from auction theory or mechanism design that apply here.

### 3. Spilman channel techniques and Cashu timelocks

Spilman channels are being designed on top of Cashu and deal with the same fundamental building blocks: P2PK locks, timelocks, and settlement between parties who may be offline. **Are there techniques from Spilman channel design — particularly around collaborative close, timelock management, or refund acceleration — that could apply to the auction settlement problem?**

The auction settlement flow is structurally similar to a channel close: one party (the seller) needs to claim funds within a window, and other parties (losing bidders) need their funds back as soon as possible after the outcome is determined.

### 4. Self-rebidding without capital waste

As discussed in the self-rebidding section, atomic rebids (locking the full new amount) are safe but capital-inefficient. A bidder who rebids three times has three separate locks outstanding, with only the latest being meaningful.

**Is there a way to invalidate or merge previous locks when a new bid is placed, without requiring the seller to be online?** The oracle is already involved in granting derivation paths. Could the oracle issue a "replacement" grant that supersedes the previous one, allowing the bidder to reclaim the old lock immediately while only the new lock remains active? What are the trust implications?

---

## Open questions

1. **What should `minimum_extension` default to?** Something small like 5 minutes seems right — enough for a response but not so large that a single bid adds hours.

2. **What should `settlement_grace_period` be?** The current `AUCTION_SETTLEMENT_GRACE_SECONDS` is 3600 (1 hour), which is very conservative. With the moving bound, the grace period directly adds to the auction duration (each bid extends by `grace + minimum_extension`). However, if a collaborative close mechanism exists, the grace period becomes a worst-case fallback rather than the normal refund path. In the common case (seller online), losing bidders get fast refunds via collaborative close regardless of the grace period length. This means a longer grace period could be used for safety (handling seller downtime, mint downtime) without penalizing losing bidders in the normal case. The right value depends on whether collaborative close is part of the design.

3. **Should there be an absolute maximum duration?** Even with the moving bound, an auction could theoretically run for weeks if bids keep arriving. A very generous absolute cap (e.g., 7 days from `start_at`) might be worth considering as a safety net.

4. **How does this interact with the existing `AUCTIONS.md` codex?** Section 6.1 explicitly states "Without a hard upper bound, anti-sniping is not acceptable." This proposal replaces the hard upper bound with a moving bound — the codex would need updating.

5. **Locktime oracle enforcement**: currently the client computes the locktime. With this design, the oracle must dictate it. This shifts trust slightly — the oracle could set an unreasonably short locktime. But the oracle is already trusted (it holds the derivation paths), so this is consistent with the existing threat model.

---

## Summary

The moving-bound approach gives us unbounded auctions that are safe for all participants:

- **Bidders** get an auction that lasts as long as genuine competition continues
- **Seller** gets a deterministic settlement window and can always claim the winner's ecash
- **Non-winners** reclaim their funds after their locktime expires, as today
- **Snipers** face both a time response window (moving bound) and an economic deterrent (exponential increments)
- **No party** imposes an arbitrary end time on the others

The remaining challenges — capital-efficient rebidding, fast refunds for losing bidders, and manipulation-resistant increment formulas — are areas where we are actively seeking input. If you have ideas, we'd love to hear them.

The bound exists — it's just determined by the bidders' own locktimes rather than by a seller-chosen `max_end_at`.

Feedback welcome. This is a design exploration, not a committed implementation plan.
