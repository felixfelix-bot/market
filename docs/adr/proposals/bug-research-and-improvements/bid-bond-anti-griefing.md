# Bid Bond — E-Cash Collateral Anti-Griefing

## Status: PROPOSED IMPROVEMENT, needs design

## Concept
At bid time, the bidder locks an additional e-cash note as collateral (a "bid bond"). If the winner fails to follow through (doesn't reveal the derivation path within the settlement window), the bond is slashed.

## Open Design Questions

### Who is the bond locked to?
Options:
- **Validator quorum escrow:** Locked to the npub of the validator set. Requires validators to coordinate on slashing.
- **Time-locked to a burn/slash address:** The bond auto-unlocks to a pre-agreed destination after timeout. No coordination needed.
- **Locked to the seller as compensation:** Simplest — if the winner doesn't pay, the seller keeps the bond. But this gives sellers incentive to grief winners.

### What e-cash mechanisms enable slashing?
Cashu locking mechanisms under consideration:
- **Timeout-locked notes:** The same derivation-path unlock mechanism used for auction bids. If the winner reveals their secret (settles), the bond returns to them. If not, the timeout fires and the note unlocks to the slash destination.
- **Multi-sig with validators:** Requires validator key holders to sign the slash. More complex but allows for dispute resolution.

### Timeout / dispute mechanism
- Settlement window must be defined per-auction
- After timeout, anyone can trigger the slash (the note auto-unlocks)
- Question: is there a dispute window AFTER timeout where the winner can claim "I tried to reveal but the network/mint was down"?

### What happens to slashed funds?
Options:
- Burned (deflationary, simplest)
- Redistributed to seller as compensation for wasted time
- Split between seller and validators as fee
- Added to a treasury/fund

## Comparison to Other Systems
- **RoboSats:** Uses fidelity bonds (on-chain BTC time-locked) for coordinator trust
- **Traditional auctions:** Require deposit to bid
- **DEX protocols (e.g., CoW Swap):** Solver bonds that get slashed for invalid settlements

## Recommendation
Start with the simplest design: timeout-locked to the seller as compensation, auto-slashed after settlement window expiry. Iterate toward validator-mediated slashing if seller-griefing becomes a problem.
