## Review — #1226 review leg, re-verified independently at `d1a4a647`

**Context:** this verdict is posted on #1361 because the review target for this leg
(#1226) is **closed** (2026-09-19T20:43:54Z by @Franchovy, "Superceded by #1361") and
GitHub will not accept a review on it. #1361 is the standing successor; head is
unchanged since the last review (`d1a4a647`, 2026-09-25T14:03:06Z), so this re-checks
the prior findings from the code rather than inheriting them.

**Verdict: changes requested.** One blocker survives, one is new, and CI is red at head.

### Delta vs. the previous review (5635730808)

Confirmed fixed at `d1a4a647`:
- **B1 (pending settlement authorized fulfillment)** — `settlementDescriptor.ts:613`
  now requires `latestSettlementValidity === 'valid' && classifyPhase === 'settled' &&
  hasMatchedClaimOrder`. Fails closed on `pending`. ✅
- **B3 (authority not bound to the mutated order)** — `claimOrderAuthorizesFulfillment`
  (`settlementDescriptor.ts:634-641`) requires `authority.claimOrderId === orderEventId`
  and fails closed on a null/partial authority. ✅

### B2 — "Griefed (No Fallback)" is still seller-decided, not quorum-decided **[BLOCK]**

This still holds, and the prior note understated its cost. Confirmed mechanism, both ends:

1. **The status is read straight off the seller-authored kind-1024.**
   `settlementDescriptor.ts:453-468` reduces `settlements` and takes
   `settlementStatus = latestSettlement?.status`. `settlements` are
   `ParsedSettlementEvent` (kind 1024, `constants.ts:41`), and `status` is a
   five-line zod enum field (`schemas/auction/settlementEvents.ts:109`). No kind-30440
   input reaches this decision — `input.verdicts` is consumed only by
   `computeValidatedBids`.

2. **No grief quorum can form even in principle.** `griefed` and
   `griefed_pending_fallback` *are* in `VALIDATOR_CLAIMS` (`constants.ts:163-164`), but
   they are in neither `VALIDATOR_CONFIRM_CLAIMS` (`:177`) nor
   `VALIDATOR_CONDEMN_CLAIMS` (`:180`), and `computeVerdictQuorum`
   (`verdictQuorum.ts:56-57`) only tallies those two sets. A validators' grief claim
   therefore produces a *neutral* verdict — it can never become a quorum signal, and
   nothing maps a quorum back to `griefed_no_fallback`.

This contradicts **ADR-0004** directly:

> `griefed_no_fallback` | Validator quorum (kind-30440) | Network consensus | Requires proving no path release was observed anywhere — needs quorum
> — ADR-0004:298

> **`griefed_no_fallback` moves from seller-derived to validator-quorum-derived.** […] The descriptor determines grief from `griefed` quorum in kind-30440 verdicts, not from the seller's kind-1024 claim.
> — ADR-0004:301-305 (restated at :369-373)

**Why this is a blocker, not a nit.** `isSettlementStructurallyValid` returns
`'valid'` for `griefed_no_fallback` on structural checks alone
(`settlementDescriptor.ts:186-189` — seller, root, coordinate only, no path-release or
bid-chain evidence), and grief is deliberately exempt from the B3
reserve-meeting-bid guard (`:181-186`). So a **seller-signed kind-1024 with
`status=griefed_no_fallback` classifies as validated unconditionally** and
`classifyPhase` returns `'griefed-no-fallback'` (`:552-553`). A seller can close an
auction that a bidder validly won and the order page will present "Griefed (No
Fallback)" as a validated terminal outcome to both the buyer and any fallback bidder.
That is the exact seller-spoofable negative ADR-0004 exists to prevent.

The test currently **encodes** the violation rather than catching it:
`__tests__/settlementDescriptor.test.ts:683-691` seeds grief purely via
`makeSettlement({ status: 'griefed_no_fallback' })` with `verdicts: []` (the
`makeInput` default, `:281`) and asserts the grief outcome. A correct test needs a
kind-30440 grief quorum for the positive case and must assert that the seller-authored
claim alone does **not** reach this phase.

### B4 — verdicts fetched by current version id, not the auction root **[BLOCK]**

New in this pass; it subsumes the earlier root-id concern for the order surface.
`OrderDetailComponent.tsx:465-469` calls `useAuctionVerdicts(auctionData?.id ?? '', …)`.
Every sibling consumer passes the **root**: `auctions.$auctionId.tsx:459`,
`dashboard/products/auctions.$auctionId.tsx:282`,
`AuctionBidder.tsx:150` all use `auctionRootEventId || auctionId`.

That distinction is load-bearing because verdict events carry **both** tags —
`auctionCoordinate` is parsed from `a` (`schemas/auction/validatorEvents.ts:112`) — and
`fetchAuctionVerdicts` sets `#e` *and* `#a` together
(`queries/auctions.tsx:610-611`), so the relay ANDs them. A kind-30408 replacement
carries `auction_root_event_id` (`schemas/auction/auctionEvent.ts:154`). For a
republished auction, `#e: <current version id>` matches no verdict even though
`#a: <coordinate>` does → `auctionVerdicts` is empty.

Consequence, same chain as before: empty verdicts → no bid reaches quorum →
`canonicalWinner` is null → `settled` returns `'invalid'` at
`settlementDescriptor.ts:192-193` → the order page shows "Awaiting Settlement" while
the auction page shows "Settled". The `#e` filter is also what would suppress grief
verdicts for republished auctions once B2 is fixed, so this should be corrected in the
same change.

Fix: `useAuctionVerdicts(auctionData ? getAuctionRootEventId(auctionData) || auctionData.id : '', …)`,
matching the siblings, and add a republished-auction case to `queries/__tests__/orders.test.ts`.

### CI is red at head, and one failure is this PR's own test

`e2e-grep` fails on `d1a4a647`; the other six checks pass.

- `e2e/tests/order-detail.spec.ts:147` — **introduced by this PR** (the spec is new in
  the diff). `getByRole('button', { name: /process order/i })` is not visible, while
  the assertions on the lines above it (the `Auction Item` header and the `Pending`
  status) passed. Per AGENTS.md, order progress must come from the validated
  settlement + canonical claim — exactly the authority path B4 empties. B4 is a
  plausible shared root cause; it needs to be ruled in or out rather than re-run.
- `e2e/tests/auction-settlement.spec.ts:869` — "kind-1024 settlement event should
  arrive on the relay" (45 s timeout). Looks pre-existing/unrelated to this diff, but
  it is red on this branch and blocks merge all the same.

### Non-blocking

- **`Settlement Card` assertion is commented out** (`order-detail.spec.ts:138-139`,
  "TODO: Needs CVM configuration for seeded bid to show up"). The headline behaviour of
  this PR is the settlement status card, and the seller-view e2e asserts everything
  around it except its content. Worth a tracked follow-up.
- The two refusal paths for `settlementIsValid` are correctly stated two ways (positive
  classification + `isSettlementPending`); good defensive choice, no action.

### What I could verify and what I could not

Verified by reading the head tree and CI logs: B1/B3 fixed, B2 mechanism and its ADR
contradiction, B4, and the two e2e failures. I did **not** run the unit suite locally
(this checkout has another writer's uncommitted changes in the tree, and full e2e
requires explicit approval), so the CI result is the authority here — and it is red.
No claim above rests on the previous review's text; each is traced to a file and line
at `d1a4a647`.
