# npub Rotation Cost — Adding Sybil Resistance

## Status: PROPOSED IMPROVEMENT, deferred

## Problem

Nostr npubs (public keys) are free and unlimited. An attacker can generate unlimited identities at zero cost, making Sybil attacks trivial. In the auction context, this enables the griefer rotation attack (see griefer-sybil-npub-rotation.md).

## Possible Improvements

### Cost-added npub types

- Require NIP-05 verification for auction participation (ties npub to a domain/payment)
- Introduce "stamped" npubs endorsed by WOT peers (vouching with skin in the game)
- Proof-of-work npubs (NIP-13) — computational cost to generate
- Cashu-token-gated participation: bidders must present a Cashu token to bid (rate-limited by mint)

### Rate limiting via Cashu

- Felix has a demo for adding cost to rate-limit npub creation/rotation
- Concept: use Cashu tokens as proof-of-payment for auction participation rights
- Could be combined with WOT for layered defense

## Trade-offs

- Any cost barrier reduces accessibility for legitimate new users
- NIP-05 requires domain ownership or paid verification service
- Proof-of-work is accessible but environmentally costly and may not deter motivated attackers
- Cashu gating is native to the ecosystem but adds friction

## Status

Deferred — focus is on the ADR for dev splits / V4V donations. This is a future improvement track.
