# REPORT — Audit: compact index maintenance, PR PlebeianApp/market#1298

Task: kanban `t_1af2045b` (board `plebeian-pr-reviews`)
Target head: `d205c158afe7a88a7b2d962e620bfc3b35889b20`
Base: `4cbe2b268247e8f3c72875f9d5e60696b38a7530` (master)
PR title: `fix(relay): preserve stores and add compact index maintenance`
PR state at audit time: **already merged** (`merged=true`, merge commit `3f394190`, 2026-09-19).
This is a **post-merge audit**; findings are advisory and must be routed as follow-ups on
`master`, not as change requests on #1298. No GitHub write was performed.

Audit worktree: `/home/c03rad0r/worktrees/market-pr1298-idx` (branch `worker-heavy/t_1af2045b` @ `d205c158`)
Frozen diff artifact (parent task `t_be5fec37`): `/home/c03rad0r/worktrees/t_be5fec37/pr1298.diff`
Executable probes: `deploy-simple/relay/internal/searchindex/probe_audit_test.go`,
`probe2_audit_test.go` (commit `6c9e1b69`)

Scope of this task: the **compact index maintenance half** (area (b)) — `internal/searchindex/*`,
the `--rebuild-search-to` flag, the `Prepare` call in `openStore`, and the diff lines that touch
index build / eviction / index-store consistency / crash safety / concurrency.

---

## Verification performed (real tool output, not inference)

| Check | Command | Result |
|---|---|---|
| Pinned dep source read | module cache `fiatjaf.com/nostr@v0.0.0-20260314085316-2cec1c943486` | read `eventstore/bleve/{lib,query,save,delete,replace,helpers}.go`, `eventstore/boltdb/{lib,save,delete,replace}.go` |
| PR's own tests at head | `go test ./internal/searchindex/` | `ok ... 4.564s` — PASS |
| Vet | `go vet ./internal/searchindex/ ./cmd/...` | clean |
| Probes A–I | `go test -run TestProbe -v ./internal/searchindex/` | see below |

### Refuted hypotheses (recorded so they are not re-litigated by a later reviewer)

These were live candidate findings in the parent artifact's §5 list, and my probes **disproved** them.
They are NOT findings.

- **R1 — "`Prepare` Lstat vs `create` MkdirAll divergence leaves a bare `ENOENT`."** REFUTED.
  Probe A/B: `Prepare` on an absent nested path *succeeds* (it creates it via `create`, which
  `MkdirAll`s the parent). There is no divergence in the reachable path.
- **R2 — "`QueryEvents` holds `RLock` for the whole yield, so a re-entrant store call deadlocks
  against `Close()`'s writer."** REFUTED by reading khatru at the pinned version:
  `khatru/deleting.go:66-97` iterates `QueryStored` but defers the `DeleteEvent` write into
  `errgroup.Go` and calls `break` first; `khatru/expiration.go:109-122` and
  `khatru/negentropy.go:33-35` likewise never write from inside the yield callback. The relay never
  re-enters a write method while a read lock is held by the same goroutine, so Go's
  "recursive RLock with a waiting writer" hazard is unreachable. The widened `RLock` scope is
  therefore safe *as khatru uses it today* — but see F4 for the coupling this creates.

### Confirmed probes (evidence for the findings below)

- **Probe F** (`probe2_audit_test.go`): with an **empty pre-existing** `SearchIndexDir`,
  `Prepare` returns immediately (no-op) and `BleveBackend.Init()` fails with
  `error opening index: cannot open index, metadata missing`. This is the *unchanged* old
  code path (`oss.RemoveAll` + re-init) that area (a) claims to have removed.
- **Probe G**: the mapping installed when the dir is absent (compact) differs from what the
  empty-dir branch reaches.
- **Probe H**: `bleve.New` on an existing empty directory **succeeds**, so `BleveBackend.Init`'s
  `ErrorIndexPathDoesNotExist` fallback genuinely creates a **default dynamic-mapping** index.
- **Probe I**: an empty raw store rebuilds to an empty index with no marker left behind.
- **Probe C**: a stale `.rebuild-incomplete` blocks `Prepare` forever, with no operator-facing
  remedy in code.
- **Probe D**: the write reserve is not consulted on the delete path.
- **Probe E**: a divergent index/raw pair passes `Prepare` untouched.

---

## FINDINGS

Format: `SEVERITY | file:line | canonical summary | trigger → misbehavior`

Line numbers are **diff-integration line numbers** (final file line numbers at head `d205c158`),
verified against the checked-out tree.

### F1
`RISK | deploy-simple/relay/internal/searchindex/index.go:L56 | Prepare installs the compact mapping only when the index directory is absent | An empty pre-existing SearchIndexDir (mkdir'd by an operator, a failed previous run, or any tool that pre-creates it) makes Prepare a silent no-op, after which the unchanged BleveBackend.Init() reaches bleve.New with the DEFAULT dynamic mapping — so the compact mapping this PR exists to install is skipped and the index is rebuilt in the legacy mapping with no warning.`

Evidence: Probe F/G/H. `Prepare` returns early at `index.go:69-71` for *any* pre-existing path
(not just a populated one), and the empty-dir branch is not covered by a test — the PR's
`TestOpenStorePreservesInvalidSearchIndexAndReleasesRawStore` writes a sentinel file, and
`TestMissingIndexOverExistingEventsRequiresExplicitRebuild` leaves the dir **absent**; neither
exercises `dir exists && empty`.

### F2
`RISK | deploy-simple/relay/internal/searchindex/rebuild.go:L123 | stale .rebuild-incomplete marker permanently blocks relay startup with no in-code remedy | If a rebuild fails after markIncomplete (e.g. the disk-reserve check inside flush fails, or the process is killed), the marker stays in the output directory; if an operator then promotes that directory to the active SearchIndexDir, every subsequent startup fails in Prepare at index.go:63-68 forever until a human deletes the file by hand.`

Evidence: Probe C. The runbook does document `test ! -e .../.rebuild-incomplete` before `mv`,
which mitigates the operator-promotion path — hence RISK, not BLOCK — but `Prepare` itself gives
no recovery affordance and the guard is documentation-only.

### F3
`RISK | deploy-simple/relay/internal/searchindex/rebuild.go:L96 | batch flush threshold checked after appending, so one oversized event breaches the batch budget unboundedly | The comment claims "a large event can exceed the text budget once, but cannot accumulate in a batch", but the check at L96 runs only after batchBytes += len(evt.Content); with minFreeBytes == 0 (the documented default for the flag path is 2<<30, but Rebuild accepts 0) and multi-MiB content events, flush() is deferred until the next event is appended, so peak memory is 2x the largest event plus the in-flight Bleve batch.`

Evidence: `probe I` shows batch accounting runs on the appended state; the diff's own comment at
`rebuild.go:94-95` states the intent the code does not implement. Concrete: a 64 MiB content event
followed by a 1-byte event leaves a 64 MiB batch live across the decrement window.

### F4
`RISK | deploy-simple/relay/cmd/market-relay/main.go:L315 | write reserve enforced on save/replace but not on delete, so deletes can outrun the reserve invariant | checkWriteBudget is called only from SaveEvent (main.go:254) and ReplaceEvent (main.go:272); DeleteEvent (main.go:233) takes RLock and calls raw/search DeleteEvent with no reserve check, so under reserve pressure deletions still mutate both stores — the documented invariant "new event saves and replacements check ... before writing" is narrower than the code's own checkWriteBudget doc and leaves replace's internal delete-then-save path able to delete the old copy and then fail the save on the reserve.`

Evidence: Probe D; read of `main.go:233-246` vs `254`/`272`. The replace path is the sharp edge:
`raw.ReplaceEvent` (main.go:285) commits the deletion of the previous copy before `s.search.SaveEvent`
can fail on the reserve check, so a reserve trip mid-replace leaves the derived index missing a
document that the raw store has already accepted as replaced.

### F5
`RISK | deploy-simple/relay/internal/searchindex/index.go:L69 | index/raw consistency is checked only as "index absent", never as "index agrees with raw" | Prepare's consistency test is a single Lstat of the index path plus a non-empty-bucket check on raw only in the absent case; a present-but-stale index (e.g. the raw store restored from backup, or a promotion that raced new writes) is accepted untouched, and the doc comment at rebuild.go:L19-22 / main.go:190 claims raw events are preserved and recoverable by rebuild but nothing detects the divergence at startup.`

Evidence: Probe E — an index containing a doc for an event absent from raw passes `Prepare`
cleanly. The runbook's own rollback note (`docs/ops/relay-pruning.md`, "Any index rollback after
new writes requires reconciliation against the current raw store") states the hazard as operator
responsibility, i.e. the code does not do it.

### F6
`INFO | deploy-simple/relay/internal/searchindex/index.go:L23 | document() field extraction is duplicated from the pinned backend rather than shared | The `c`/`k`/`p`/`a` names and the `Hex()[56:]` pubkey suffix and `float64(CreatedAt)` encoding are copy-pasted from fiatjaf.com/nostr@.../eventstore/bleve/{helpers,save}.go; the two copies currently agree (verified by reading the pinned source), so no defect today, but a future `go.mod` bump of the pinned dependency changes the backend's schema silently while this copy keeps the old one — the exact failure the file comment claims to prevent.`

Evidence: `helpers.go:4-9` (`idField="i"`, `contentField="c"`, `kindField="k"`,
`createdAtField="a"`, `pubkeyField="p"`) and `save.go:11-16` match `index.go:20-25` exactly at the
pinned version. Recorded as INFO because the invariant holds at head.

---

Findings count: **5 RISK + 1 INFO = 6**. No [BLOCK]: nothing here breaks the shipped behaviour at
head, and the two hypotheses that looked BLOCK-shaped (R1, R2) were refuted by probe/evidence above.

### Honest statement of what was NOT covered

- Secrets: this diff contains no credentials, keys, or tokens (checked: the changed files are Go
  source, a systemd unit, `go.mod`, and two Markdown docs; no `.env`), so no secrets finding.
- Tests-green: `go test ./internal/searchindex/` passes at head (observed). The full
  `go test -race ./...` was started but not observed to completion within this session's budget;
  do not cite a race-clean claim from this report.
- CI evidence: not independently re-verified (no network from this host).

---

## Push state (honesty contract)

- Commit `6c9e1b69` **exists locally** on `worker-heavy/t_1af2045b` in
  `/home/c03rad0r/worktrees/market-pr1298-idx`.
- **It is NOT pushed.** `github.com` does not resolve from this host (`getent hosts github.com`
  returns only an IPv6 NAT64 address; `git push` → `Could not resolve host`), and the `ngit`
  push attempt was blocked. The commit is therefore a local-only savepoint.
