# PR #1380 delta review — draft for Gate 2.5

Reviewed head: a5b9f50e0651b124f44679579a50102b4d4e34e1 (the card pin e75ab27e is stale). This is a delta review following our lane's review 5328626780 at 3a44fa6a.

The current branch was force-rebased, so I compared the surviving PR-owned delta (72402cdd..a5b9f50e) rather than treating the inherited base changes as new PR work.

The auditor-scoping fix remains correct and fail-closed. The new browser `Failed to fetch` retry case is present in current-head CI; all seven non-skipped checks pass, including unit-integration and e2e-grep. No new BLOCK/RISK finding in this delta.

Two current-head reviews already record the ADR latency contradiction and stale PR-description evidence as required before merge, so this review does not duplicate them.

Draft review body:

---
## Delta review at `a5b9f50e` — auditor scoping verified; existing documentation items remain open

**Reviewed head:** `a5b9f50e0651b124f44679579a50102b4d4e34e1`. The card's `e75ab27e` pin is stale; this follows my lane's review 5328626780 at `3a44fa6a`. The branch was force-rebased, so I checked the surviving PR delta (`72402cdd..a5b9f50e`) rather than re-filing inherited base work.

All four publish-path verdict reads still pass the auction's declared auditors (`src/publish/auctions.tsx:1303`, `:1366`, `:1653`, `:1737`). The retry remains bounded and fail-closed (`src/queries/auctions.tsx:685-699`). The new `failed to fetch` classifier alternative is read-only and has a passing current-head CI case (`src/queries/auctions.tsx:645`; `src/queries/__tests__/auctionVerdictsRetry.test.ts:193-213`; unit job 108717627522). I observed all seven non-skipped checks green at this head, including unit-integration (1861 tests / 134 files) and e2e-grep. Merge simulation against the current `auctions` base returned one conflict-free tree; `git diff --check` is clean.

**[RISK] Existing documentation items, deduplicated rather than re-filed.** Current-head reviews 5332383772 / 5332383971 already require two text fixes: (1) `docs/adr/ADR-0004-auction-settlement-descriptor.md:317` says both path-release reads are reached when all verdicts are absent, but the empty result leaves every bid pending (`src/lib/auction/bidValidation.ts:219,255`) and the canonical-winner guard throws before the second read (`src/publish/auctions.tsx:1330-1332`); (2) the PR body's old base and unit/e2e evidence need re-anchoring to this head. I independently verified the control flow for item 1. These are not new findings.

**[INFO]** The proposed ADR amendment still awaits maintainer sign-off; this bot review is not that authorization.

**Changes requested:** the two already-filed documentation items above. No new code defect found in the auditor-scoping or retry-classifier delta.

Reviewed head: `a5b9f50e0651b124f44679579a50102b4d4e34e1`.

Gate 2.5: to be filled only after the actual cold audit.
---

Do not publish this draft. Audit it read-only and return REAL / DEDUP / SPAM-AACR / MISSED / PUBLISHABILITY plus VERDICT.
