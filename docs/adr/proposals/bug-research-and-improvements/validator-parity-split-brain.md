# Validator Parity / Split-Brain Attack

## Status: NEEDS INVESTIGATION

## Problem
With an even number of validators, a disagreement on the auction winner can arise with no deterministic resolution mechanism. Half the validators may report one winner, the other half a different winner.

## Current State
No validator quorum system exists in the codebase yet. The quorum design (N-of-M validators needed to approve a result) is still being designed. Key open questions:

1. **Happy path only?** Does the planned quorum handle only the positive case (N validators say "valid" → valid), or also the negative case (N validators say "invalid" → invalid)?
2. **Minimum quorum:** Can quorum be 1? If so, that validator is a single point of failure for bid ordering.
3. **Even-number protection:** Is there a deterministic tiebreaker for even validator counts?

## Potential Mitigations
- Enforce odd validator count at the protocol level
- Require quorum > N/2 (strict majority)
- Byzantine fault tolerance: N ≥ 3f+1 where f is max tolerated Byzantine validators
- Consider whether negative-path quorum is needed (validators can actively reject a result)

## References
- Felix flagged this as a concern during ADR discussion
- Related to auction validator design in AUCTIOINS.md (the auction spec draft)
