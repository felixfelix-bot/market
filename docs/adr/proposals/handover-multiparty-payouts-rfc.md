---
# Cover Note: Multiparty Payouts RFC + V4V Dev Splits

**Handover for:** @f1ba92d6-4cc8-4ff4-a002-1e4a8fe09ac2
**Status:** Reference — connects RFC protocol frame to existing V4V Dev Splits track
**Date:** 2026-07-30

## Summary

Two documents, one problem: how to split auction payouts among seller, validators, and optional V4V recipients using Cashu.

**The RFC** (Multiparty Payouts for Cashu Auctions) defines the protocol review frame. It separates six decision domains — economics, key derivation, Cashu transport, evidence, validator participation, interoperability — as sequential gates. No event encoding or implementation until gates pass. Same-mint first profile. 27-item definition of ready.

**The V4V Dev Splits track** (ADR + 12 locked decisions + implementation handover) is one concrete resolution path through those gates. It proposed: single reveal event, per-validator e-cash notes, mandatory validator fee floor, new kind 30409, P2PK locking, relay-only transport, settlement window, auto-refundable losing bids.

## How they connect

Each V4V decision maps to a specific RFC gate:

| V4V Decision | RFC Gate | Status |
|---|---|---|
| D1: Single reveal event | Gate C — token transport | Open |
| D2: Per-validator notes (no pool) | Gate A — payout roles | Open |
| D3: Validator fee mandatory | Gate E — compensation requiredness | Open |
| D4: V4V optional | Gate A — requiredness | Open |
| D5: New kind 30409 | Gate F — event kind assignment | Blocked by RFC |
| D6: Settlement window | Gate D — recovery | Open |
| D7: P2PK locking scheme | Gate C — NUT-11 lock profile | Open |
| D8: Losing bidder auto-refund | Gate D — refund state machine | Open |
| D9: Recipients locked to pubkeys | Gate B — key derivation | Open |
| D10: Public secret = no front-running | Gate F — privacy/linkability | Open |
| D11: Per-auction settlement window | Gate D — evidence/settlement | Open |
| D12: Relay-only transport | Gate C — transport alternatives | Open |

The V4V track resolved several gate questions but did so before the economics questions in Gate A were settled. The RFC corrects that ordering.

## Gap: recipient xpub publication

All payout recipients — seller, validators, V4V recipients — must publish their payout xpubs before bids lock. The bidder needs destination xpubs at bid creation to construct per-leg derivation paths. The RFC raises this abstractly under Gate B; the V4V track assumed it. Making it explicit strengthens both.

Three implications:

1. **Discovery problem.** Seller publishes xpub in the auction root (kind 30408). Validators need a separate publication mechanism (proposed kind 30409). V4V recipients need another.
2. **Binding timing.** Can an immutable auction root reference payout xpubs published after root creation?
3. **Privacy multiplier.** N recipients = N published xpubs. Cross-correlation across auctions becomes a real deanonymization vector.

## Proposal to maintainers

Present the RFC as the protocol frame. Present the V4V DECISIONS log as reference material showing one possible gate resolution. Use the RFC's definition of ready to sequence implementation. The V4V work becomes input, not a superseded branch.

## Related files

- `docs/adr/proposals/v4v-dev-splits-auction.md` — V4V Dev Splits ADR proposal
- `docs/adr/proposals/adr-v4v-dev-splits-DECISIONS.md` — 12 locked decisions log
- `docs/adr/proposals/HANDOVER-v4v-dev-splits.md` — implementation handover (non-normative)
- Multiparty Payouts RFC — external document under protocol review

---
