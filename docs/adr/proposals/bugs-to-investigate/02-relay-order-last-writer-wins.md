# Bug 2: Relay-Order Last-Writer-Wins for Kind-1025 / Kind-1024

**Severity:** Critical  
**Status:** Under investigation — not a blocker for PR #1170  
**Fix estimate:** ~30 lines  
**Key files:** `src/server/auction-validator/state.ts` (functions `recordPathRelease` ~line 277, `recordSettlement` ~line 292)  
**Found:** 2026-07-28 adversarial analysis of `feat/1151-auction-validation` (head `215640d3`)

## Summary

`recordPathRelease()` and `recordSettlement()` unconditionally overwrite stored
state with whatever event arrives last. There is no dedup by event ID, no
"earliest wins" rule, and no deterministic tie-break. Two valid signed events
for the same target → the one delivered last by the validator's relays is
authoritative. Different validators seeing different relay delivery orders
publish contradictory verdicts.

## Root Cause

### `recordPathRelease` (state.ts ~line 277)

```ts
export const recordPathRelease = (
    state: ValidatorState,
    release: ParsedPathReleaseEvent,
    observedAt: number,
): ValidatorAuctionState | null => {
    for (const auctionState of Array.from(state.auctions.values())) {
        if (auctionState.bids.has(release.bidEventId)) {
            auctionState.pathReleases.set(release.bidEventId, release)  // ← OVERWRITE
            // ...
            return auctionState
        }
    }
}
```

### `recordSettlement` (state.ts ~line 292)

```ts
export const recordSettlement = (
    state: ValidatorState,
    settlement: ParsedSettlementEvent,
): ValidatorAuctionState | null => {
    // ...
    auctionState.settlement = settlement  // ← OVERWRITE
    // ...
}
```

Neither function checks:
- Is an event already stored for this target?
- Is the new event from the authorized party?
- Should we prefer the earlier event (deterministic tie-break)?

## Attack Scenarios

### Scenario 1: Bidder publishes two conflicting kind-1025 path releases

1. Bidder publishes kind-1025 #A — honest, valid derivation path, valid cashu token
2. Validator stores #A, validates → passes → NUT-7 confirms spent → publishes
   `settled_promptly`
3. Bidder publishes kind-1025 #B for the same `bidEventId` — different
   derivation path, different cashu token, **still validly signed by the same
   bidder key** (the bidder is authorized to sign kind-1025)
4. Validator overwrites #A with #B (last writer wins)
5. Validator validates #B → derivation check FAILS → verdict flips to
   `fraudulent_bid`
6. Verdict oscillates between `settled_promptly` and `fraudulent_bid` based on
   relay delivery order

### Scenario 2: Seller publishes two conflicting kind-1024 settlements

1. Seller publishes kind-1024 #A naming the real winner with correct payouts
2. Seller publishes kind-1024 #B for the same auction naming a different winner
   or different payouts (seller IS authorized to sign kind-1024)
3. Validator keeps whichever arrives last
4. Two validators on different relay sets publish contradictory verdicts

### Scenario 3: Cross-amplification with wrong-key events

The signature verification in `verifyIncomingEvent()` (subscriber.ts) only
checks that the event is properly signed for its `pubkey` — it does NOT verify
that `pubkey` is the authorized party. The role check happens later in
`validatePathRelease()` / `validateSettlementCompleteness()`.

So a malicious third party can publish a kind-1025 signed by THEIR key (not the
bidder's), and `recordPathRelease` will store it (overwriting any legitimate
release). The validator will eventually flag it as `fraudulent_bid`, but the
legitimate release has been displaced from storage.

## Impact

### Verdict manipulation via relay gaming
An attacker who controls relay delivery timing (or relies on natural relay
latency differences) can cause the validator to store whichever event benefits
them. This produces wrong verdicts from a correctly-behaving validator.

### Cross-validator disagreement
Two validators on different relay sets will store different events and publish
contradictory kind-30440 verdicts. With `auditor_quorum = 1` (the default),
clients trust whichever verdict they see first — no reconciliation exists.

### Combined with Bug 1 (oscillation)
A bidder can grief a seller by publishing contradictory path releases,
triggering verdict oscillation on top of the oscillation from Bug 1.

## Why PR #1170 Makes It Worse

- #1170's settlement validation (`validateSettlementCompleteness`) depends on
  the stored kind-1025 and kind-1024 being the correct/authoritative versions.
- #1170 adds `pathReleaseObservedAt` (state.ts) which correctly keeps the
  *earliest* observation time — but the release *object itself* is still
  last-writer-wins.
- #1170 adds NUT-7 refresh triggers on kind-1025/kind-1024 arrival, which means
  a malicious overwrite also triggers a NUT-7 re-poll, amplifying the wrong
  state.

## Recommended Fix

Three-part fix, all in `state.ts`:

### 1. Deterministic tie-break (lowest event ID wins)

```ts
export const recordPathRelease = (
    state: ValidatorState,
    release: ParsedPathReleaseEvent,
    observedAt: number,
): ValidatorAuctionState | null => {
    for (const auctionState of Array.from(state.auctions.values())) {
        if (auctionState.bids.has(release.bidEventId)) {
            const existing = auctionState.pathReleases.get(release.bidEventId)
            if (existing && existing.id <= release.rawEvent.id) {
                // Keep the existing event — deterministic tie-break
                // Still update observedAt if this is earlier
                return auctionState
            }
            auctionState.pathReleases.set(release.bidEventId, release)
            // ...
            return auctionState
        }
    }
}
```

Apply the same pattern to `recordSettlement`.

### 2. Role-check at storage time

Before storing, verify the signer pubkey matches the authorized party:

```ts
// In recordPathRelease:
const bidState = auctionState.bids.get(release.bidEventId)
if (bidState && release.bidderPubkey.toLowerCase() !== bidState.bid.bidderPubkey.toLowerCase()) {
    // Wrong signer — reject before overwriting
    return auctionState
}
```

This prevents a wrong-key event from displacing a legitimate one.

### 3. Track seen event IDs

Maintain a `Set<string>` of seen event IDs per auction state. When a genuine
conflict is detected (two different valid event IDs for the same target), emit
a `conflicting_events` signal rather than silently flipping.

## Deterministic vs Authoritative

The key design question is: when two validly-signed events conflict, which one
is "correct"?

- **Lowest event ID wins** (proposed above) — fully deterministic, all
  validators agree. But event IDs are hashes, so this is effectively random
  with respect to content. The "winner" may be the malicious event.
- **First stored wins** (reject overwrites) — non-deterministic across
  validators (whoever saw the attacker's event first keeps it).
- **Content-hash preference** — prefer the event that passes all validation
  checks. But this requires running validation at storage time, and both events
  may pass or fail different checks.

The recommendation is **lowest event ID wins** + **role-check at storage**.
This ensures all validators converge on the same stored event, and wrong-key
events can never displace right-key ones. The residual risk (the "winning"
event is a validly-signed-but-malicious one from the authorized party) is a
protocol-level issue that requires auditor quorum to resolve.

## Test Coverage Gap

No test currently exercises:
1. Two valid kind-1025 events for the same bid arriving in different orders
2. Two valid kind-1024 events for the same auction arriving in different orders
3. A wrong-key kind-1025 attempting to overwrite a legitimate one
4. Verdict stability when a second event arrives after settlement is complete
