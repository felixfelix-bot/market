# Auction Validator — Known Bugs Under Investigation

This directory documents bugs found during adversarial analysis of the auction
validator (PR #1170, branch `feat/1151-auction-validation`).

These bugs are **not blockers for PR #1170** — they are pre-existing issues in
the validator architecture that PR #1170 makes more visible because it adds new
code paths that exercise them. They should be addressed in focused follow-up
work after #1170 merges.

## Bugs

| # | Severity | Title | Fix Estimate | Key File |
|---|----------|-------|--------------|----------|
| 1 | Critical | [Top-bid self-revalidation oscillation](./01-top-bid-oscillation.md) | ~10 lines | `lifecycle.ts:414` |
| 2 | Critical | [Relay-order last-writer-wins for kind-1025/1024](./02-relay-order-last-writer-wins.md) | ~30 lines | `state.ts:277,292` |

## Context

Both bugs were identified by adversarial analysis of the validator codebase on
the `feat/1151-auction-validation` branch (PR #1170 head `215640d3`).
maximotodev flagged both as "serious pre-existing concerns" in his review of
#1170, explicitly noting they are not part of the 7 blocking items and should
be handled as focused follow-up work.

PR #1170 exacerbates both:
- **Bug 1:** #1170 adds `assignCloseRoles()` which makes the oscillation
  exploitable at auction close (winner determination depends on the oscillation
  cycle). It also adds NUT-7 polling that triggers more revalidation cycles.
- **Bug 2:** #1170's settlement validation depends on stored kind-1025/1024
  events being correct. If a malicious event can overwrite a legitimate one,
  the settlement verdict is wrong.

## Analysis Source

Full adversarial analysis (covering 10 attack vectors total) is available in the
analysis report generated on 2026-07-28. See the commit history for the original
report file.
