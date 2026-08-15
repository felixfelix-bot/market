# Griefer / Sybil npub Rotation Attack

## Status: KNOWN ISSUE, needs improvement

## Problem

A griefer wins an auction but never delivers payment (never reveals their derivation path / secret). They then rotate their npub (generate a new Nostr identity) and repeat the attack indefinitely. Since Nostr npubs are free and unlimited, there is zero cost to this attack.

Currently, web-of-trust (WOT) is the only defense mechanism. Without WOT, there is no way to distinguish a griefer's new npub from a legitimate new user.

## Impact

- Sellers lose time and potentially other bids (locked notes may expire)
- Validators waste resources ordering bids for auctions that never settle
- Trust in the auction system degrades

## Current Defenses

- Web-of-trust: Participants can check if an npub is vouched for by trusted peers
- This is insufficient alone — WOT is a heavy design lift and has cold-start problems for new users

## Possible Improvements

- See: bid-bond-anti-griefing.md (e-cash collateral)
- See: npub-rotation-cost.md (adding cost to npub creation)
- Felix has a demo for adding cost to rate-limit npub creation (link TBD)
