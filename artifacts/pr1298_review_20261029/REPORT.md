# REPORT — Review of PlebeianApp/market PR #1298

**PR:** fix(relay): preserve stores and add compact index maintenance
**Author:** plebomoto (external, `is_own: false`)
**Head reviewed:** `d205c158afe7a88a7b2d962e620bfc3b35889b20`
**State at review time:** **MERGED** 2026-09-19T20:41:28Z, merge commit
`3f394190338d2ca514a0b86d35a60de15ad79021`. 9 files, +965/−40.
**Lane:** reviewer `worker-heavy` (gate-1 family), cross-family gate by
`worker-reviewer-glm` (`tier/review-glm` @ zai).

## Outcome

- **Published review comment:**
  https://github.com/PlebeianApp/market/pull/1298#issuecomment-6484411325
  (13 lines / 3116 chars; body re-read from the API after posting).
- **Cross-family verdict: APPROVED** — all four findings KEEP.
- **No formal review, no approval, no request-changes, no merge.** The PR was
  already merged, so a formal `--approve` was neither possible nor appropriate;
  the finding set is posted as a comment (operator directive 2026-09-10 form
  does not apply — this review has findings, not zero findings).
- **Contribution fix card created:** `t_71b080a0` on board `plebeian`,
  assignee `worker-pr-fixer`, status `ready`.

## Findings (all reproduced at head by execution this session)

All four were run against the head checkout
`/home/c03rad0r/worktrees/pr1298-consistency` (`git rev-parse HEAD` =
d205c158), Go 1.25.0, pinned module cache warm.

1. **[RISK] `deploy-simple/relay/cmd/market-relay/main.go:205` — Close() drain
   is unbounded behind a stalled subscriber.**
   `Close()` takes `s.mu.Lock()`; every `QueryEvents` yield (`main.go:218-224`)
   runs under `RLock`, and the pinned khatru yield is `ws.WriteJSON`
   (`khatru/responding.go:33`) with no write deadline
   (`handlers.go:131-133` sets read deadlines only). A stalled subscriber wedges
   `cleanup()` past `server.Shutdown`'s 10 s context until SIGKILL at
   `TimeoutStopSec=120` — the OOM-kill SIGKILL path the PR's own runbook
   documents. This wedge is **new in this PR**: before it, `Close` was a no-op
   (`closeMaybe` never matched the backends' `Close()` signature), so the
   process exited promptly.
   Reproduction: `TestScratchCloseDrainBlockedByStalledSubscriber` (Close
   blocked 26.63 s until the reader was released) and
   `TestScratchCloseDrainBlocksNewQueriesBehindIt` (new queries queue behind the
   blocked drain). Both PASS.

2. **[RISK] `deploy-simple/relay/cmd/market-relay/main.go:289` — replace
   eviction ignores `nostr.IsOlder`.**
   The eviction loop deletes every previously stored document from search, then
   skips the search save because raw refused the older event
   (`eventstore/boltdb/replace.go:38-48`, `shouldStore=false`). Republishing an
   older profile/contact/list event permanently evicts the newest live event
   from search while raw keeps it.
   Reproduction: `TestGlmProbeOlderReplaceEvictsLiveSearchEntry` →
   `raw_has_newer=1 raw_has_older=0`, `search_finds_newer=0
   search_finds_older=0`, event `693977da…` present in raw and permanently
   absent from search. PASS.
   **Honesty caveat carried into the published comment:** the loop is
   byte-identical at base `4cbe2b26`, so it is pre-existing; the PR added the
   guards at 266-274 inside the same function.

3. **[RISK] `deploy-simple/relay/internal/searchindex/index.go:69` —
   `Prepare` adopts an existing index directory with no raw-store parity check.**
   An out-of-band relay start between `--rebuild-search-to` completion and the
   runbook's `mv -T` activation leaves post-rebuild events durably in raw and
   permanently absent from search — no error, no log line.
   Reproduction: `TestScratchStaleActivationAfterPostRebuildWrites` (rebuild →
   start → publish → activate → start) → `late event present in search: false`,
   "startup raised no error and no invariant was checked". PASS.

4. **[NIT] `deploy-simple/relay/internal/searchindex/index.go:54` —
   `create()` leaves a marker-less directory behind when `bleve.New` fails.**
   Mkdir at :54, `bleve.New` at :57, no `.rebuild-incomplete` marker and no
   cleanup, so a crash in that window makes every subsequent start fail closed
   with `metadata missing` until an operator removes the directory.
   Reproduction: `TestScratchFirstBootCrashWindowLeavesUnrecoverableEmptyIndexDir`
   → "every restart fails closed … cannot open index, metadata missing". PASS.
   `Rebuild` already establishes the marker-before-`bleve.New` precedent
   (`rebuild.go:52-53`, with `index_test.go:196-201` asserting a failed rebuild
   keeps its marker), so the fix is a one-ordering change.

## Dedup

The task brief said `prev_issues: (none — first review of this PR)`. **That was
factually wrong and I did not rely on it.** Live GitHub surface at review time:

- review `5186090354` — felixfelix-bot, APPROVED, zero findings.
- review `5190605402` — c03rad0r, APPROVED, praise only.
- review `5653225909` — maxime-tt, six items: (1) `TimeoutStopSec=120` vs
  `RELAY_SHUTDOWN_TIMEOUT_MS` default 10000 ms; (2) `RLock` is a shutdown
  barrier not a write barrier; (3) hardcoded `2<<30` rebuild reserve; (4)
  hand-copied backend internals in `document()`; (5) readability nit at
  `index.go:69`; (6) merge-commit message scope.
- comment `5718263024` — felixfelix-bot "approved from our side".

Mapping: findings 1–4 are distinct root causes from all six maxime-tt items.
The only same-line collision is **finding 3 vs maxime-tt item 5** (`index.go:69`
both). Item 5 is a readability nit that explicitly concedes "it behaves
correctly"; finding 3 asserts the opposite in a named operational sequence with
a passing reproduction. The published comment says so in-line ("The existing nit
on this line is readability; the gap is missing parity"), and the glm verifier
adjudicated it as a genuine different root cause. Findings 1–4 are not
re-raises.

## Cross-family gate (GATE 2.5)

- Profile: `worker-reviewer-glm`, pinned `tier/review-glm` @ zai — pin verified
  against `docs/REVIEWER-POOL-RUNBOOK.md` §1 (D-115) and against the profile
  `config.yaml` before dispatch; dispatch result metadata confirmed from
  `~/.hermes/profiles/worker-reviewer-glm/state.db`: session
  `20261029_011741_e07a2e`, `model=tier/review-glm`, `billing_provider=zai`.
- Command: `hermes -p worker-reviewer-glm chat -Q -q '<context + draft>'`.
- Cold: the verifier re-read the claimed lines at head, re-ran **all four
  probes itself** in one command, and re-read the pinned dependency cites
  (`responding.go:33`, `handlers.go:131`, `replace.go:38-48`). It did not accept
  the draft's claims on trust.
- **VERDICT: APPROVED.** FINDING 1–4 all KEEP. Dedup check on finding 3
  explicitly cleared. Raw verdict:
  `artifacts/pr1298_review_20261029/raw-glm-verdict.txt`.
- Note: the first dispatch attempt stalled in open-ended context gathering and
  was killed at 600 s with no verdict; it was re-dispatched with a bounded,
  ordered step list (read specific line ranges → one combined probe run → one
  dependency check → verdict) and completed. No verdict was inferred from the
  first attempt.

## Contribution PR (step 7)

Eligible: the published review carries 3 [RISK] findings. Dedup performed
2026-10-29, all clear:

- (a) No open fix card for #1298 on boards `plebeian`, `default`, `admin`.
- (b) No `contrib-1298-*` branch on `felixfelix-bot/market`; no such PR on
  PlebeianApp/market (`gh pr list --state all --search contrib-1298` → `[]`).
  `plebomoto/market` returns 404 to the API — the author org/repo is not
  reachable as a fork, so the delicate check could not be run against it
  directly; the fork-side and PR-side checks are the available evidence.
- (c) `origin/master` (`d4757b40`) does not contain the fix —
  `git show origin/master:deploy-simple/relay/cmd/market-relay/main.go | grep
  IsOlder` returns nothing.

Card: **`t_71b080a0`** — "Contrib PR for #1298: fix search/raw divergence
(IsOlder eviction + Prepare parity + bounded Close drain)", board `plebeian`,
assignee `worker-pr-fixer`, status `ready`, idempotency key
`contrib-1298-store-integrity-20261029`. Body scopes the three [RISK] items with
TDD requirements, the pre-existing caveat for item 2, the probe locations for
reference, the verification commands, and an explicit no-approve/no-merge/
no-force-push constraint. The [NIT] (finding 4) was deliberately left out of the
card to keep the contribution PR small and reviewable.

## Commits

- `aa9ea8d5` — M1–M4: draft + glm verify context + PROGRESS.
- `e8456672` — M5 glm APPROVED + M6 review published.
- Pushed to `fork` (felixfelix-bot/market) branch
  `review/pr1298-fresh-20261029`; `git ls-remote` verified after each push
  (`e8456672b32f2cb415cc14f9ef5db0b0a3c58f09` observed).

## Caveats

- The PR is merged, so this review cannot gate it. Its value is (i) an accurate
  record of four live defects, (ii) the contribution-PR card.
- Finding 2's defect is pre-existing (identical at base); it is reported as such
  in the comment. Findings 1, 3, 4 are introduced by this PR.
- No test suite run of the whole repo was attempted beyond the four probes and
  the package tests: this lane's scope was review, not repair, and the PR's own
  suite is green at head per the author's validation and prior-lane logs.
- The task brief's `prev_issues: none` was contradicted by four live surfaces;
  treated as a brief error, documented here, and the dedup was done against the
  live data instead.
