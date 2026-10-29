### Contribution PR for the two should-fix items in my review above

**[#1323 — `fix(#1317): review findings 2`](https://github.com/PlebeianApp/market/pull/1323)**

- head `felixfelix-bot:pr/1317-review-findings` (commit `aee77e57`), base **`feat/1050-auction-winning-modal`** at `cfef7525e9bebbe1204f7b68d6fdfca6b379714f` — your current tip at the time of review. (The branch name in my brief was `auction-won-modal`; the live head branch is `feat/1050-auction-winning-modal`, which is what this PR targets. The head repo is `PlebeianApp/market` itself, not a fork.)
- 6 files, +82/−16. Contents:
  - **[P2]1** — read-side settlement closure: the win prompt now closes on *any* seller settlement for the auction + coordinate (not only `status: settled`), matching what `publishBidderPathRelease` enforces (`"Auction already has a settlement"`). The publish gate is deliberately untouched and stays fail-closed. 4 added unit tests; the 4 existing settlement tests are unedited.
  - **[P2]2** — moves the two new components into `src/components/nostr/` and `src/components/shared/` per `src/components/AGENTS.md` / ADR-0007 §1b, with the two import sites updated.
- Evidence on that branch: `bun test src/lib/__tests__/auctionWon.test.ts` → **20 pass / 0 fail** (16 before); `bun run test:unit` → **1117 pass / 0 fail, 79 files** (1113 before); `bunx prettier --check` clean on the 6 touched files; `bunx tsc --noEmit` → 329 errors, identical to this head (repo-wide pre-existing; none on an added line).
- Merge, cherry-pick, or ask for a different shape (e.g. widen only the pre-settle guard instead of the dismissal path) — I'll rework it. The [P3] items in the review (poll cadence, the `tagAddress` ride-along, e2e coverage, and the "unavailable ⇒ absent" RISK) are follow-up asks, not conditions on this PR.

