# Cold cross-family verification — PR #1298 draft review (card t_0f6a0798)

- Verifier: glm family (worker-reviewer-glm), cold pass dated 2026-10-28.
  The drafting lane is a different family; nothing below is taken from the
  draft on trust — every load-bearing claim was re-derived from the live PR,
  the head checkout, the pinned dependency sources, or execution at head.
- Draft under verification: `reviews/1298-draft.md` (fleet lane t_e736bb4b).
- PR: PlebeianApp/market#1298 `fix(relay): preserve stores and add compact
index maintenance`.
- Head confirmed live this session (`gh pr view 1298 --json ...`):
  **d205c158afe7a88a7b2d962e620bfc3b35889b20**, state **MERGED**
  2026-09-19T20:41:28Z (merge commit 3f394190338d2ca514a0b86d35a60de15ad79021),
  9 files, +965/−40, author plebomoto.
- Independent diff: `gh pr diff 1298 --repo PlebeianApp/market` →
  `artifacts/pr1298_review/raw/pr1298_diff_fetch_20261028.diff` (1233 lines, 9
  files), **byte-identical** (`cmp`) to the previously pinned copy at
  `artifacts/pr1298_review/raw/pr1298.diff` and to the drafting lane's pin
  `.1298-diff.patch` (sha256 ea040051…).
- Ground-truth checkout at head: `/home/c03rad0r/worktrees/pr1298-consistency`
  (`git rev-parse HEAD` = d205c158…). All anchors below were read in that
  worktree; the only untracked files there are scratch probes from prior lanes
  plus this lane's own probe, none touching PR code.
- No GitHub write of any kind from this lane: no comment, review, approval,
  label, or push to origin.

## VERDICT: REJECTED

The draft is the zero-finding form (`reviews/1298-draft.md:12-16`):

    Reviewed tip d205c158afe7a88a7b2d962e620bfc3b35889b20 — no new issues found. Approving.

That body fails all three bars for a publishable review:

1. **REAL — the "no new issues" premise is false, not merely unverified.**
   At least three concrete defects in the store-preservation / compact-index
   code path exist at the head SHA and were reproduced by execution at head in
   this session (pinned module cache, `GOPROXY=off`, go1.25.0):
   - `internal/searchindex/index.go:69-71` — adoption of an existing index
     directory returns nil with no raw-store parity check (stale-activation
     data loss in search).
   - `cmd/market-relay/main.go:266` — `ReplaceEvent` deletes every previously
     stored event from the search index with no `nostr.IsOlder` comparator, so
     an _older_ replacement evicts the newest live event from search while raw
     keeps it.
   - `internal/searchindex/index.go:54-57` — `create()` leaves a marker-less
     directory behind when `bleve.New` fails, wedging startup fail-closed.
2. **NOT DEDUPED — fails.** `prev_issues: EMPTY — first review of this PR`
   (`1298-draft.md:24`) is factually false. Live GitHub state: felixfelix-bot
   APPROVED review **5186090354** (2026-09-12), maxime-tt 6-item review
   **5653225909** (2026-09-13), felixfelix-bot comment **5718263024**
   (2026-09-17). Worse, the draft body is **byte-identical** (em dash U+2014
   included) to the already-posted review 5186090354 — publishing it would be a
   duplicate of a review that exists on the PR today, on a PR that is already
   merged.
3. **NOT SPAM — fails on accuracy grounds.** The provenance caveat
   (`1298-draft.md:51-57`) claims the family audit lanes "were never dispatched
   past status None" and that "no compact-index-maintenance audit artifact
   exists anywhere". Both committed artifacts exist on disk
   (`reviews/1298-index-store-consistency.md` (0d821ac) and
   `reviews/1298-compact-index-build-eviction-audit.md` (86792c5), both dated
   2026-09-27, i.e. _after_ the draft's 2026-09-24 write) — the draft's
   provenance was stale when written and is false now.

REJECTED therefore means: **the draft must not be published.** The publish task
(`t_ceaf51ff` / publish lane) consumes this verdict as a DO-NOT-POST signal.

## Per-finding adjudication

The draft contains **zero findings of its own**, so [KEEP]/[DROP]/[REWRITE]
over draft findings is vacuous. Adjudicated instead are (A) the draft's
substantive claims, and (B) the findings its input lanes produced — the ones a
correct merge should have carried (board comment on t_56477136, 2026-09-26
23:00 UTC).

### (A) Draft claims

- **[DROP] Zero-finding body** — three reproduced defects falsify "no new
  issues found" at d205c158; also a byte-duplicate of posted review 5186090354.
- **[DROP] `prev_issues: EMPTY`** — maxime-tt 5653225909 (6 items: 10s drain
  window vs `TimeoutStopSec=120`, mutex-is-shutdown-barrier note, hardcoded
  `2<<30`, hand-copied backend internals, `index.go:69` readability nit
  asserting it "behaves correctly", merge-message scope) and felixfelix-bot
  5186090354/5718263024 all precede the draft.
- **[DROP] Provenance "no audit artifact exists anywhere"** — stale; artifacts
  0d821ac/86792c5 are committed and carry findings; lanes t_4e7355d2 /
  t_e7c66830 did run (status done on the board).
- **[KEEP] The draft's diff summary** (`1298-draft.md:26-32`) — checked against
  the fetched diff: accurate (refuses silent empty re-index, adds fail-safe
  offline rebuild with incomplete marker + fsync before index files, Mkdir
  EEXIST refusal, DocCount validation, systemd + runbook updates).

### (B) Findings the draft should have carried

1. **[KEEP] RISK | `deploy-simple/relay/internal/searchindex/index.go:69` |
   index adoption ignores the raw store (no parity check at activation)**
   - (a) REAL: verified at head (index.go:69-71: `if _, err := os.Lstat(path);
!errors.Is(err, os.ErrNotExist) { return err }` — existing directory
     returns nil). Reproduced at head this session:
     `TestScratchStaleActivationAfterPostRebuildWrites` PASS — after the
     documented rebuild → restart → publish → runbook rename-swap → restart
     sequence, `search for 'persistent' returned 1 events; late event present
in search: false` while the same event IS found by raw ID lookup;
     `openStore` raised no error.
   - (b) NOT DEDUPED: no prior issue names missing parity at adoption. Maxime's
     item 5 is a _readability_ nit on the same branch explicitly asserting it
     "behaves correctly" — different root cause, different conclusion.
   - (c) NOT SPAM: concrete trigger, silent permanent misbehavior, executed
     reproduction.
   - Caveat for any rewrite: the trigger requires an out-of-band relay run
     between rebuild completion and activation (the runbook says "while the
     relay is still stopped"), so the comment should name that precondition
     explicitly. Note also `docs/ops/relay-pruning.md` (:255-259 in the head
     worktree) guards only marker absence and directory non-existence.
2. **[REWRITE] NIT | `deploy-simple/relay/internal/searchindex/rebuild.go:53` |
   marker-less index output directory**
   - (a) REAL but only for one clause, and mis-anchored. The demonstrated
     clause is the `create()` first-boot window at **index.go:54-57** (Mkdir →
     bleve.New, no marker ever written, no cleanup on failure): reproduced at
     head (`TestScratchFirstBootCrashWindowLeavesUnrecoverableEmptyIndexDir`
     PASS — every restart fails closed `metadata missing`, never repairs).
     The `markIncomplete`-failure-at-rebuild.go:53 clause is _not_ demonstrated
     (this lane could not force a `file.Sync()` EIO deterministically) and the
     claim "the next start adopts it" is wrong for that clause: a marker-less
     rebuild output sits at `search-compact`, which the next start never opens
     unless an operator activates it.
   - (b) NOT DEDUPED: same root-cause class as the create() wedge (one fix
     covers both), distinct from the RISK above.
   - (c) Mostly meets the bar; required rewrite: keep the demonstrated
     index.go:54-57 first-boot clause (fail-closed startup wedge, operator must
     remove the directory), drop or explicitly label the markIncomplete-failure
     clause as unproven, and do not claim adoption for the rebuild-output path.
3. **[REWRITE] RISK | `deploy-simple/relay/cmd/market-relay/main.go:266` |
   replace-eviction ignores `nostr.IsOlder`** — **missing from the canonical
   list** (see Missing issues, below).

## Missing issues (step 3 — inverse check)

- **M1 (ADD as its own finding, RISK) — `main.go:266` replace-eviction ignores
  `nostr.IsOlder`.** The canonical merged list (t*56477136 comment,
  2026-09-26 23:00 UTC) carries only 2 findings; the second, superseding audit
  (86792c5, committed 2026-09-27 21:44 CEST, i.e. ~21h \_after* the merge
  comment) added this RISK plus a `create()` RISK, and the merge consumed the
  stale r1 (INFO-only) version. So this RISK never entered any draft or
  canonical list. This lane reproduced it independently with its own probe
  (`probe_zzz_glm_probe_replace_older_test.go`, run as
  `TestGlmProbeOlderReplaceEvictsLiveSearchEntry` at head):
  `raw_has_newer=1 raw_has_older=0` / `search_finds_newer=0 search_finds_older=0`
  — the newest live event (693977da…) is evicted from search by publishing an
  older event, while raw correctly keeps the newer (pinned boltdb replace.go
  applies `nostr.IsOlder`, utils.go:102-105). Trigger is ordinary client
  behavior (republishing an old profile/contact/list event). Caveat: the
  eviction loop lines (main.go:289-296) are byte-identical at base 4cbe2b26 —
  pre-existing code the PR touched (it added the guards at 266-274 inside the
  same function) but did not introduce. A comment on it must say "pre-existing,
  resurfaced by this PR's touch of the function" to be honest; that is a
  judgment call for the publish task, but the defect is real and reproduced.
- **M2 (ADD as a second trigger of the KEEP RISK, not a separate finding) —
  `SaveEvent` partial-write divergence.** `compositeStore.SaveEvent`
  (main.go:257-262) writes raw first, search second. A search-side failure
  (ENOSPC on segment persist, index I/O error) after raw commits leaves the
  event durable in raw and permanently absent from search — same silent
  divergence class as the KEEP RISK, reachable with no runbook deviation, and
  retries cannot heal it (raw returns `ErrDupEvent`, which pinned khatru
  `adding.go:39-40` maps to accepted/OK). Reproduced at head by
  `TestScratchSearchFailureAfterRawCommitDivergesAndRetryCannotHeal`: raw
  committed + error surfaced + retry ErrDupEvent all confirmed (the probe's
  final assertion then panics on its own double-`close` at line 84 — a harness
  bug in a scratch test, not product behavior; PR's own tests are green).
  This one is also **pre-existing** at base (same ordering, no lock) — but the
  PR's own `checkWriteBudget` probe at main.go:254-256 makes the search-side
  failure _more_ reachable post-PR (free-space exhaustion now returns errors
  on the write path). Suggest folding it into the RISK as an additional
  trigger, or reporting with an explicit pre-existing caveat.
- **M3 (REPORT as availability limitation) — diff-introduced unbounded
  shutdown drain.** Close() takes `s.mu.Lock` (diff-added, main.go:208-216)
  while the diff-added QueryEvents wrapper (main.go:220-224) holds `RLock`
  across every `yield`; in pinned khatru the yield is `ws.WriteJSON`
  (responding.go:33) with no write deadline (handlers.go:131/133 set read
  deadlines only). Reproduced at head (`TestScratchCloseDrainBlockedByStalledSubscriber`:
  Close blocks ≥500 ms behind a stalled subscriber and only completes when the
  subscriber is released; `TestScratchCloseDrainBlocksNewQueriesBehindIt`: new
  queries queue behind the draining Close). Consequence: a stalled websocket
  subscriber hangs shutdown indefinitely, leaving systemd SIGKILL as the only
  exit — which is precisely the OOM-kill history this PR's runbook documents.
  Maxime's prior item 2 covers the "shutdown barrier, not write barrier" aspect
  only, not the unbounded-drain/availability aspect, so it is not a duplicate —
  but because severity is operator-visible availability rather than data
  integrity, report at RISK-or-below with the dedup note.
- **M4 (coverage limitation, not a finding) — dead lanes.** The crash/partial-
  write lane (t_be5fec37) and concurrency lane (t_1d983948) still have **no
  committed artifact**; their "absence of findings" is an absence of input, not
  evidence of correctness. No published comment should imply those surfaces
  were cleared. (This lane's executions above partially cover the crash-safety
  surface — M2, and the durability probe `TestScratchAcceptedWritesAreDiskDurableBeforeClose`
  PASSes — but a comment should not claim lane-completeness.)
- **No other new defect found.** Checked directly at head: `document()` field
  shape (`c/k/p/a`, `PubKey.Hex()[56:]`) is byte-identical to the pinned
  backend (eventstore/bleve/save.go:11-17); marker+fsync ordering precedes
  `bleve.New` (rebuild.go:49-56); `os.Mkdir` refuses existing/symlinked
  output; `DocCount` validation present (rebuild.go:108-114); no silent
  empty-index path (`ErrorIndexMetaMissing` taxonomy → fail-closed
  `openStore` main.go:185-193); `checkWriteBudget` fails closed; the PR's own
  test suite is green at head (`go test ./...` → ok both packages) and
  `go vet ./...` rc=0. Nothing else met the REAL bar; this lane does not pad
  the verdict with a low-quality finding.

## Bottom line for the publish task

DO NOT PUBLISH the draft body. It is (1) falsified by three reproduced defects,
(2) a byte-duplicate of an already-posted APPROVED review, and (3) aimed at a
PR that has been MERGED since 2026-09-19. If a comment is posted at all, it
must be a fresh draft carrying the KEEP RISK (index.go:69) and the rewritten
NIT, deduped against maxime-tt 5653225909 and felixfelix-bot 5186090354, and
adjudicating M1/M2/M3 above with their pre-existing caveats. The verdict
REJECTED and the adjudication above are also posted as a kanban comment on
card t_0f6a0798 (board plebeian-pr-reviews) for the publish task to consume.

## Reproducibility (all executed this session, 2026-10-28)

- Environment: go1.25.0 (toolchain from the lane's pinned module cache),
  `GOMODCACHE=.1298-head/.gomodcache`, `GOPROXY=off` — compiles against the
  exact pinned deps (`fiatjaf.com/nostr` 20260314, bleve v2.4.4).
- `gh pr view 1298 --repo PlebeianApp/market --json …` → head/state/merge facts
  (raw output in the session transcript; summary above).
- `gh pr diff 1298` → raw/pr1298_diff_fetch_20261028.diff; `cmp` vs pinned copy
  → identical.
- `go test ./cmd/market-relay/ -run TestGlmProbeOlderReplaceEvictsLiveSearchEntry -v`
  → PASS, `raw_has_newer=1 … search_finds_newer=0` (own probe; source at
  probe_zzz_glm_probe_replace_older_test.go).
- `go test ./cmd/market-relay/ -run 'TestScratchStaleActivation…|TestScratchFirstBootCrashWindow…' -v`
  → both PASS (raw/pr1298_scratch_all.log).
- `go test ./...` (PR's own tests, scratch probes stashed) → ok both packages
  (raw/pr1298_test_own.log); `go vet ./...` → rc=0 (raw/pr1298_vet.log).
- Prior-lane probes re-run: close-drain ×2 PASS; partial-write probe confirms
  divergence mechanism then panics in its own harness (documented above).
