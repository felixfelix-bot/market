# PROGRESS — PR #1387 review (gate 1, worker-reviewer-ds)

Task: review PlebeianApp/market `feat/coco-v2-wallet-auction-lifecycle` @ `7d8d1ed47fba`
(PR #1387, author maximotodev, base branch `auctions`).

| # | Finding (short) | Status | Files touched |
|---|---|---|---|
| 1 | Rebid chains are created by the bid path but refused by release/receive | reported [BLOCK] | REPORT.md, REPORT_1387_DRAFT.md |
| 2 | (withdrawn) reset DB prefix — gate 2 proved the wallet DB IS deleted | withdrawn | same |
| 3 | Missing Send operation returns "refunded" success | reported [RISK] | same |
| 4 | Publication cache discarded before durable status write | reported [RISK] | same |
| 5 | Keyset validation dropped in two validators (cashu-ts v5 swap) | reported [RISK] | same |
| 6 | Fresh-reset DB prefix `plebeian-market-coco-v2-` never matches `plebeian_coco_v2_` | reported [NIT] | same |
| 7 | `readEnv` 6-arm nested ternary | reported [NIT] | same |
| 8 | Stale "immutable identities" in PR body; CONFLICTING mergeable; wallet-UI rewrite bundled | reported [INFO] | same |

Checked and cleared (no finding): `--no-sourcemap` CLI arg parsing (build.ts:65-72
maps it to `sourcemap:false`), `fetchAuctionVerdicts` 6-arg call removal (function
has 5 params; both forms pass `undefined`), republish-cache durability
(localStorage-backed), fail-closed mint allowlist / environment gating.

Verification status: NOT run. This worktree has no `@cashu/coco-core` installed
(vendored tarball inputs), so unit/integration/build were not executed; no test,
build, or CI claim is made in the review.

Gate 2: DONE — real cold audit on the worker-reviewer-kimi lane
(HERMES_PROFILE=worker-reviewer-kimi hermes -z, output /tmp/gate2_1387_out.txt).
It confirmed finding 1 as a blocker, kept 3, downgraded 4/5, and correctly
falsified draft finding 2 (withdrawn before posting).

Publish: DONE — CHANGES_REQUESTED, review 5635293825 on commit 7d8d1ed4
https://github.com/PlebeianApp/market/pull/1387#pullrequestreview-5635293825
Gate state: last_reviewed_sha set for PR 1387.
