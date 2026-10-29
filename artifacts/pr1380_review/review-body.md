## Delta review at `a5b9f50e` — auditor scoping verified; existing documentation items remain open

**Reviewed head:** `a5b9f50e0651b124f44679579a50102b4d4e34e1`. The card's `e75ab27e` pin is stale; this follows my lane's review 5328626780 at `3a44fa6a`. The branch was force-rebased, so I checked the surviving PR delta (`72402cdd..a5b9f50e`) rather than re-filing inherited base work.

All four publish-path verdict reads still pass the auction's declared auditors (`src/publish/auctions.tsx:1303`, `:1366`, `:1653`, `:1737`). The retry remains bounded and fail-closed (`src/queries/auctions.tsx:685-699`). The new `failed to fetch` classifier alternative is read-only and has a passing current-head CI case (`src/queries/auctions.tsx:645`; `src/queries/__tests__/auctionVerdictsRetry.test.ts:193-213`; unit job 108717627522). I observed all seven non-skipped checks green at this head, including unit-integration (1861 tests / 134 files) and e2e-grep; the latter was still in progress when review 5332383772 was posted. One green run does not disprove intermittency. Exact-head focused tests under CI's isolation mode: 15 pass / 0 fail across the retry and verdict trust-boundary files. Merge simulation against live `auctions` tip `6be7496c` returned one conflict-free tree (`62afb35a`); the PR's recorded base `eacc4256` is 6 commits behind. `git diff --check` and scoped Prettier are clean.

**[RISK] Existing documentation items, deduplicated rather than re-filed.** Current-head reviews 5332383772 / 5332383971 already require two text fixes: (1) `docs/adr/ADR-0004-auction-settlement-descriptor.md:317` says both path-release reads are reached when all verdicts are absent, but the empty result leaves every bid pending (`src/lib/auction/bidValidation.ts:219,255`) and the canonical-winner guard throws before the second read (`src/publish/auctions.tsx:1330-1332`); (2) the PR body's old base and unit/e2e evidence need re-anchoring to this head. I independently verified the control flow for item 1. These are not new findings.

**[INFO]** The proposed ADR amendment still awaits maintainer sign-off; this bot review is not that authorization.

**Changes requested:** the two already-filed documentation items above. No new code defect found in the auditor-scoping or retry-classifier delta.

Cold cross-family audit: worker-reviewer-glm (`tier/review-glm`; concrete fallback/candidate `glm-5.3` from `model_tiers.yaml`), REAL / DEDUP / SPAM-AACR / MISSED / PUBLISHABILITY PASS, with the publication-only calibrations folded into this body.

head: a5b9f50e0651b124f44679579a50102b4d4e34e1
reviewer_model: glm-5.3
review_tier: tier/review-glm
gate25: cold cross-family audit of this draft — VERDICT: APPROVED
secret-scan: clean
VERDICT: CHANGES_REQUESTED
