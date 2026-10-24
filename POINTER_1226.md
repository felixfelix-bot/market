Follow-up on the consolidated verdict posted here (review 5635730808): this PR is **closed and never merged** (closed 2026-09-19 by @Franchovy), and its branch is superseded by **#1361** (`feat/1226-auction-order-details`, open).

I re-verified the three #1226 BLOCKs against the live successor head `d1a4a647ddb87dfeb90f00de3cbb33c4d42d5285` (PR #1361) and posted the delta there: https://github.com/PlebeianApp/market/pull/1361#pullrequestreview-5636361837

Delta:
- **B1 (pending settlement authorized fulfillment)** — FIXED at `d1a4a647:610-616` (`settlementIsValid && classifyPhase === 'settled' && hasMatchedClaimOrder`).
- **B3 (authority not bound to the mutated order)** — FIXED at `d1a4a647` (`claimOrderAuthorizesFulfillment` requires `authority.claimOrderId === orderEventId`).
- **B2 (seller-spoofable "Griefed (No Fallback)")** — **STILL HOLDS** at `d1a4a647:540-556`: grief is still read from the seller-authored kind-1024 status, with no kind-30440 quorum derivation (`verdictQuorum.ts` has no grief claim kind), contradicting ADR-0004 §3/§369-373. This is the one surviving blocker, and it was **not** carried into #1361's review thread, so it is recorded here for provenance.

No further review is needed on this closed PR; the standing gate is #1361.
