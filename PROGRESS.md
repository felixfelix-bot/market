# PROGRESS — PR #1226 review leg (fleet offload worker)

Task: Review PR #1226 (Franchovy, auction order details settlement status).
Brief state was STALE — live state re-established below.

## Findings so far

- [verified] PR #1226 is CLOSED (2026-09-19T20:43:54Z by Franchovy, "Superceded by #1361").
  Never merged. Not a draft-with-pending-review; review cannot be posted as requested.
  -> status: DEAD TARGET, no verdict postable
  -> files: none (gh api reads only)
- [verified] Successor is PR #1361 `feat(auctions): ... (supersedes #1226)`, OPEN, base
  `auctions`, head d1a4a647, mergeStateStatus=BLOCKED, reviewDecision=CHANGES_REQUESTED.
  -> status: REAL review target
- [verified] Prior felixfelix-bot review 5635730808 (2026-10-24) posted 3 BLOCKs and claimed
  B1/B3 fixed + B2 still holds at d1a4a647. Head unchanged since -> re-verifying independently.
- [verified] B1 fixed: settlementDescriptor.ts:613-616 requires latestSettlementValidity==='valid'
  && classifyPhase==='settled' && hasMatchedClaimOrder.
- [verified] B2 STILL HOLDS, mechanism confirmed: settlementStatus read straight from the
  seller-authored kind-1024 (`settlements.reduce` -> `latestSettlement?.status`), no
  kind-30440 grief quorum anywhere. ADR-0004:298-305 mandates quorum-derived grief.
- [verified] NEW nuance beyond prior review: `griefed` and `griefed_pending_fallback` ARE in
  VALIDATOR_CLAIMS (constants.ts:163-164) but neither is in VALIDATOR_CONFIRM_CLAIMS
  (:177) nor VALIDATOR_CONDEMN_CLAIMS (:180), so the verdict->quorum bridge cannot emit
  grief at all. Both ends (claim taxonomy + settlement read) are missing.
- [verified] Prior "grief in kind-1024 status" note is MORE than provenance: `isSettlementStructurallyValid`
  returns 'valid' for griefed_no_fallback on structural checks alone (settlementDescriptor.ts:186-189),
  i.e. a seller-authored claim needs no path-release/bid-chain evidence at all.
- [verified] COST OF B2 IS NOW CONCRETE: griefed_no_fallback classifies 'valid' AND is exempt from the
  B3 reserve-meting-bid guard, so classifyPhase returns 'griefed-no-fallback' UNCONDITIONALLY on a
  seller-signed kind-1024. Sellers can close a completed auction as "Griefed (No Fallback)" and it is
  displayed as validated to buyer + eligible fallback bidder.
- [verified] B2 test encodes the violation: settlementDescriptor.test.ts:683 seeds grief purely via
  makeSettlement({status:'griefed_no_fallback'}) with NO verdicts (makeInput default verdicts: []).
- [verified] NEW B4: verdicts queried by current replaceable-version id, not auction root.
  OrderDetailComponent.tsx:465 passes auctionData?.id; sibling consumers pass
  root||id (auctions.$auctionId.tsx:459, dashboard/...:282, AuctionBidder.tsx:150). Verdicts carry BOTH
  tags (validatorEvents.ts:112 '#a' = coordinate) and fetchAuctionVerdicts:610-611 ANDs '#e' with '#a'.
  For a republished auction (auction_root_event_id tag, auctionEvent.ts:154), #e:currentVersion matches
  nothing even though #a matches -> verdicts empty -> topBid null -> settled returns 'invalid' (:192)
  -> 'Awaiting Settlement'. Also *reintroduces* the grief class via the reserved #e.
- [verified] B3 fix confirmed: claimOrderAuthorizesFulfillment binds authority.claimOrderId === orderEventId (:634-641).
- [verified] CI at head d1a4a647 (2026-09-25T14:03): e2e-grep FAIL (6/7 other checks pass).
  Two e2e failures: (a) auction-settlement.spec.ts:869 kind-1024 never arrives (pre-existing),
  (b) THIS PR's own new test order-detail.spec.ts:147 'process order' button not visible.
  -> B4 gives a plausible shared root cause for (b): no verdicts -> fulfillmentReady false.
- [verified] push BLOCKED: felixfelix-bot 403 pull-only on PlebeianApp/market. Commits are LOCAL ONLY.
- NEXT: write REPORT.md, post verdict to #1361 (review is the only writable channel).
