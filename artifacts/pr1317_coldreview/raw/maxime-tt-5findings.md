**Review at head `9a4c4e36`** (base `auctions` `bfd66fc7`; 8 commits, 10 files, +431/−9; closes #1050) — **changes required**.

Not because the feature is wrong — it matches #1050 (global modal, title, auction, amount,
explanatory text, graphics, "Settle Auction" CTA). Because **CI is red, and this PR is what
made it red**: `e2e-grep` is failing with **3 failed + 4 flaky** tests on this head, while
`e2e-grep` is **green on both the base `bfd66fc7` and the merge-base `50199dce`**. Every
failure is in the *existing* winner settlement flow.

---

## What's good

- The UX matches the issue, and the dismissal path is done properly: `handleOpenChange`
  (`AuctionWonModal.tsx:79`) raises the "Leave settlement?" confirm rather than silently
  closing, which is the right call for a money-adjacent flow.
- Queue dedupe by `auctionRootEventId` (`auctionWon.ts:18`) is sensible for the
  multiple-wins case.
- `ConfettiBurst` is well built for what it is: no-ops under `prefers-reduced-motion`
  (`:28`), the portal canvas is `pointer-events-none` **and** `aria-hidden` (`:109`), and
  the interval, resize listener and `requestAnimationFrame` are all cleaned up (`:100–104`).
- Using `toRawEvent` for the parse boundary (`AuctionWonModal.tsx:26`) is the right seam
  discipline — see the non-blocking note about `getEventAddress`.

---

## Required 1 — The global modal breaks the existing winner settlement flow

The three failing tests (`e2e/tests/auction-settlement.spec.ts:711`, `:767`, `:956`) all
fail on the same assertion:

```
Locator: getByRole('button', { name: /release path/i })
Expected: visible
Timeout: 15000ms
```

That is the winner's **existing** on-page Release Path button. The new modal renders a
Radix `Dialog` with `open` unconditionally true (`AuctionWonModal.tsx:107`) from the root
layout (`__root.tsx:122`). A modal dialog makes the rest of the document inert and
`aria-hidden`, so any role-based query for the page's own button fails — exactly the
observed failure. The four flaky tests are the same class ("winner sees release-path card",
"winner sees path-released", "winner sees you-won after settlement").

This is not a test problem, it is an unresolved product decision: the winner now has **two
competing settlement surfaces** doing the same thing —

- the existing page flow, `settleAuctionAsWinner` called from `AuctionSettlement.tsx:126`,
  `auctions.$auctionId.tsx:626`, `dashboard/.../auctions.$auctionId.tsx:489`
- the new global modal, `AuctionWonModal.tsx:91` → the same action

So on the auction page the bidder sees the modal **and** the page's own release affordance,
with the modal covering the latter.

**Requested:** pick one resolution and carry it through:

1. **Modal replaces the page affordance** — remove or hide the old winner release surface
   and update the e2e specs to drive the modal instead; or
2. **They coexist** — do not render a *blocking* modal while the auction page's winner flow
   is on screen (a non-modal prompt/banner there, the modal everywhere else); or
3. if the split is genuinely fine as-is, say why, and update the affected specs so the
   intended interaction is what's asserted.

Whichever it is, this must land with `e2e-grep` green. `e2e-full` is skipped on this head,
so the skipped job gives no cover.

## Required 2 — Premature "resolved" marking silently loses wins

`useAuctionWinMonitor.ts:77` adds the auction to `resolvedRootEventIds` **before** computing
the top chain (`:79`) and before the reserve check (`:83`). Anything that goes wrong at or
after that point is permanent for the session — there is no retry, no error surfaced, and
the auction is never re-examined.

Two truncation sources sit in the same function:

- `fetchAuctionBidsByBidder(pubkey, 500)` (`:46`) — only the bidder's 500 most recent bids.
  A bidder with more than 500 bids after this auction is **never considered for it**.
- `fetchAuctionBids(rootEventId, 500)` (`:69`) — a 500-event window per auction. On a busy
  auction — precisely the volume the auctions work is defending against — the
  window-valid set is incomplete.

Combine that with relay lag on first poll and the failure mode is: the bidder's win is
missed on the one poll that mattered, the auction is marked resolved, and the modal never
appears. Note the inconsistency: an unresolved fetch (`:57`) or a throw (`:74`) leaves the
auction *unresolved* and retryable, while a *successful but possibly-incomplete* fetch is
marked resolved immediately — the opposite of what the data reliability warrants.

**Requested:** mark resolved only on a terminal conclusion (confirmed non-win, or settlement
terminal), and treat incomplete data as retryable. Consider paginating rather than capping
at 500.

## Required 3 — "You won" is derived from raw window-validity, but the CTA is quorum-gated

`getAuctionWindowValidBids` (`src/lib/auctionSettlement.ts:327`) filters on bid status, the
`e` tag, and `created_at ∈ [startAt, acceptanceEndAt]` — **that is all**. It does not apply
the validity rules the validator applies: the anti-snipe curve floor (`under_curve`),
increment (`under_increment`), mint allowlist, NUT-7 spent state, or the `timestamp_skew` /
`late_arrival` observation window. ADR-0003 is explicit that `observed_at` is authoritative
and `created_at` advisory; this path ranks by `created_at`.

Meanwhile the action the modal triggers is hard-gated on an auditor quorum.
`settleAuctionAsWinner` (`nip60.ts:2665`) → `publishBidderPathRelease`, which contains:

> *"Verify won_pending_settlement quorum before releasing the path. The bidder should not
> release their locked ecash unless a quorum …"* — `publish/auctions.tsx:1227`
> *"Quorum verification is a hard gate for path release (M2)"* — `:1265`

and throws `Cannot release path: … quorum requires N. Wait for more validators.` (`:1256–1259`).
The e2e specs encode this by seeding a `won_pending_settlement` verdict before the release
button works (`e2e/tests/auction-settlement.spec.ts:722`).

So the modal can tell a bidder **"You won!"** and offer a single CTA that is *guaranteed* to
be rejected. Compounding it: the reserve check is `bidAmount >= getAuctionReserve(auction)`
(`:83`), so with `reserve: 0` — a legitimate configuration, and exactly what the e2e seeds
use — *any* top bid reads as a win.

**Requested:** derive the candidate from the validated, quorum-aware pipeline instead of the
legacy window filter. It already exists and the settlement path already uses it:
`computeValidatedBids` (`src/lib/auction/bidValidation.ts:238`) with
`isQuorumEligibleVerdict` (`:137`), consumed by `settlementDescriptor.ts:331,549`, and its
`canonicalWinner` is the very thing the publish path cross-checks against
(`publish/auctions.tsx:1642`). Using it here is a small change and removes the whole class of
"promised a win the app cannot deliver".

## Required 4 — The queue is not scoped to the user and is never cleared

`auctionWonStore` (`auctionWon.ts:13`) is a module-global store. Its payload (`:3–7`) carries
no pubkey, and there is **no clear or reset action** — the only mutations are `enqueue` and
`dismissActive`, and nothing else in the codebase touches the store (verified). The modal is
mounted unconditionally (`__root.tsx:122`), and the monitor resets only its own internal
`resolvedRootEventIds` on pubkey change (`:31–33`) — never the queue.

Consequences: log out and log in as someone else and the previous user's win still renders —
and that user's signer would attempt settlement with the previous user's `bidEventId`. A
logged-out visitor can likewise see the last user's win, because `AuctionWonModal` never
checks authentication.

(This is the same ground Copilot raised; agreeing, and adding that the minimal fix is a
pubkey field on the payload plus a clear-on-pubkey-change — the store has no reset at all
today.)

## Required 5 — An already-released winner gets asked to settle again

`hasFinalSettlement` (`AuctionWonModal.tsx:55–65`) only looks for a **seller kind-1024**
settlement matching pubkey, root and coordinate. But the winner's own action publishes a
**bidder kind-1025** path release. The queue is in-memory, so after a reload the monitor
re-enqueues (it sees the same top chain and open settlement window) and the modal returns,
inviting the bidder to settle a second time — while their release is already on the relay.

The suite already encodes the expectation being violated: "winner sees path-released after
publishing path release" (`e2e/tests/auction-settlement.spec.ts:503`).

**Requested:** treat a validated path release for the active bid/rebid chain as resolved, in
both the modal's check and the monitor's eligibility test.

---

## Non-blocking

- **Head-of-line blocking in the queue.** The modal renders only `queue[0]`
  (`AuctionWonModal.tsx:40`) and `dismissActive` slices one (`auctionWon.ts:23`). If the head
  entry can never become verified — auction fetch fails, or either query never succeeds, so
  `hasVerifiedUnresolved` stays false (`:66`) — later wins are never surfaced and there is no
  per-entry removal or timeout.
- **No tests.** ~430 new lines across a store, a hook and two components, with no unit tests;
  `unit-integration` passed because there was nothing new to run. The store's dedupe and
  ordering, and the monitor's win-decision function, are trivially unit-testable, and R2/R5
  are exactly the bugs those tests would catch.
- **`getEventAddress` and its four call-site rewrites are unrelated to this PR.**
  `eventLike.ts:20` adds a duck-typed address builder and rewrites `queries/comments.tsx`,
  `queries/reactions.tsx`, `publish/comments.tsx`, `publish/reactions.tsx` to use it. The
  modal does not use it — it imports only `toRawEvent` (`AuctionWonModal.tsx:26`). By its own
  docstring it is a fetch-seam compatibility shim for the NDK/applesauce migration, and it
  changes shared comment/reaction code paths. Recommend splitting it out so the migration
  work is reviewed as migration work (cf. the `theme:applesauce` stream and #1283). The
  first commit, `b3204b94` ("fix(ndk): add fix to retrieve tagAddresses for plain relay
  data"), is likewise unrelated to the modal.
- **`getEventAddress` has no guard for a missing `d` tag.** It builds
  `` `${kind}:${pubkey}:${d ?? ''}` ``, so an addressable event without `d` yields a
  malformed coordinate silently, where `NDKEvent.tagAddress()` would have surfaced it.
- **Unrelated fix, worth noting for the migration:** comments/reactions still import
  `NDKEvent`, so the duck-typing bridge widens migration surface in a feature PR.

---

## Summary of what's needed

1. Resolve the two competing settlement surfaces and land with `e2e-grep` green (R1).
2. Mark an auction resolved only on a terminal conclusion; stop capping at 500 (R2).
3. Derive the win from `computeValidatedBids(...).canonicalWinner`, not the legacy window
   filter (R3).
4. Scope the queue to the authenticated pubkey and clear it on change (R4).
5. Treat the winner's own path release as resolved (R5).
6. Split out the `getEventAddress`/NDK shim and add unit tests for the store and monitor.

R3 and R4 are small changes with large correctness gains, and R1 is a decision that only the
author/team can make — everything else follows from it.

