# Review: PR #1298 — `fix(relay): preserve stores and add compact index maintenance`

**Reviewed at:** head `d205c158afe7a88a7b2d962e620bfc3b35889b20` — 9 files, +965/−40, 1 commit, base `master`.

**Method / scope of this review.** Findings come from reading the diff and the head files (`main.go`, `internal/searchindex/index.go`, `internal/searchindex/rebuild.go`, `main_test.go`, `index_test.go`, the systemd unit, the README and `docs/ops/relay-pruning.md`). I did **not** re-run the test suite, did not reproduce the OOM, and did not test against the live staging relay. Claims that rest on the PR's own evidence are attributed as such. The operational figures quoted below are the runbook's, not independently measured by me.

**Verdict — approve, conditional on one change.** Item 1 under *Required change* is the only blocker; everything else is either praise or a non-blocking note. If this needs to map to a review state, `REQUEST_CHANGES` is the honest signal, but only for item 1.

---

## What it does, and why

The relay host has a memory problem and a data-lifecycle problem, and this PR addresses the second one while being explicit about the first.

The PR's own runbook records the evidence: on 2026-09-11 the staging host (3.8 GiB VPS) had 29 GiB free of 79 GiB (62% used), with roughly **17 GiB in the search index, 4.1 GiB in raw events and 2.2 GiB in the system journal** — so there was **no immediate disk shortage** at snapshot time. Systemd recorded **39 cumulative automatic restarts**, and at 17:30:23 UTC the kernel killed `market-relay` for global memory exhaustion at **~3.4 GiB anonymous RSS**. The runbook states plainly that earlier restarts show the same OOM evidence and that **the snapshot does not establish which allocation path caused the memory failures**. That honesty matters and it is maintained throughout.

Two concrete defects in the deployed code are identified, and I verified both against the diff:

1. **Shutdown does not close either backend.** The `closeMaybe` helper type-asserts `interface{ Close() error }`, but these backends' `Close()` returns nothing, so the assertion fails and *both* stores are skipped. The runbook says exactly this ("skips closing both backends because its close helper checks the wrong method signature").
2. **A missing index destroys search history.** On a `metadata missing` error the code did `os.RemoveAll(SearchIndexDir)` and re-initialised an empty index — silently detaching 4.1 GiB of raw events from search, and only rebuilding over the raw data for events arriving afterwards. The runbook: "deletes the search directory on missing metadata without rebuilding old events."

The fix, in outline:

- **Lifecycle:** `compositeStore` holds the two real backends, a `sync.RWMutex` and a `closed` flag. `Close()` takes the write lock, sets `closed`, then closes search and raw. All store methods take the read lock, refuse to run when closed, and the query path wraps iteration in a closure that holds the lock for the duration. A failed search init now closes the raw store so its lock is released.
- **Never delete:** missing or unrecognised index metadata now fails startup with a message telling the operator to build a replacement, and a missing index over a non-empty raw store is refused unless `--rebuild-search-to` is used.
- **New `internal/searchindex` package:** an explicit compact Bleve mapping (text fields with `Store`, `IncludeTermVectors`, `IncludeInAll` and `DocValues` all off, numeric `CreatedAt`, no catch-all) plus an offline rebuild that opens the raw BoltDB **read-only** (so the live relay's exclusive lock is respected and the run fails fast with "stop the relay before rebuilding"), verifies the expected bucket exists, requires a **new** output directory, writes and fsyncs a `.rebuild-incomplete` marker (file **and** directory) *before* the index exists, flushes in bounded batches (≥100 documents or ≥1 MiB of content), re-checks free space per batch, validates `DocCount()` against the raw count, and removes the marker only on success. Output is never activated automatically.
- **Write budget:** `RELAY_MIN_FREE_BYTES` (default `536870912`, 512 MiB) is checked before every save/replace; reads remain available.
- **Operational hardening:** `GOMEMLIMIT=1GiB`, `TimeoutStopSec=120`, journal rate limits (`LogRateLimitIntervalSec=30s`, `LogRateLimitBurst=200`).
- **Documentation:** the README documents the new knobs and the rebuild procedure, and `docs/ops/relay-pruning.md` adds the investigation snapshot, data-boundary rules, backup/downtime prerequisites, an atomic `mv -T` activation procedure, and — valuably — the rollback caveat that restoring a pre-rebuild index after new writes have landed would omit those events.

## What is good here

- **The safety posture is consistent and conservative:** fail closed, never delete, never auto-activate, prove completion with a marker and a count, and keep reads available while writes are refused. This is the right shape for a fix whose predecessor silently destroyed derived data.
- **The tests are substantive rather than decorative.** Eight top-level tests. The one that matters most is `TestShutdownDrainsAcceptedWrites`: it starts a concurrent writer, closes the store mid-flight, then asserts that **every event accepted before shutdown is present in both the raw store and the search index after reopening**, and that writes after shutdown are rejected. That is the correct test for the drain claim. The negative cases are also the right ones: live raw-store lock, existing/symlink rebuild destination, low free space, corrupt raw record, and that incomplete output cannot be opened by the relay.
- **Evidence, not assertion.** The investigation is written down with actual kernel/systemd readings, and the README explains *why* the pinned `fiatjaf.com/nostr` should not be upgraded (the newer version changes content field shape, timestamp representation and the default kind allowlist — which would drop marketplace events). That is the kind of compatibility analysis that is usually missing.
- **Honest non-goals.** The PR states it does not compact the existing 17 GiB index, does not prune raw events, and that `GOMEMLIMIT` is a soft runtime budget that **does not bound mmap and does not prove the historical OOM allocation path is fixed**.
- **Dependency hygiene:** `bleve/v2`, `bbolt` and `golang.org/x/sys` move from indirect to direct `require` entries, and no dependency versions are bumped.

## Required change

**1. The shutdown grace period is only half-wired.** The unit sets `TimeoutStopSec=120` and the PR description speaks of a "120-second shutdown grace period", but the application's own drain window is still `RELAY_SHUTDOWN_TIMEOUT_MS`, whose default remains **10000 ms** — unchanged by this PR and not documented in the README or the runbook. The effective graceful window is therefore **10 seconds**; the remaining 110 seconds only delay the SIGKILL. This matters precisely for the case this PR is designed to handle, because `Close()` takes the write lock and will block until in-flight store operations finish, which is exactly when a longer window would help.

Please either raise the default to match the systemd value, or document the pairing (for example: "`TimeoutStopSec=120` bounds the kill; `RELAY_SHUTDOWN_TIMEOUT_MS` bounds the drain, default 10 s — raise it to match") so an operator does not reasonably conclude that a 120-second drain is in effect when it is not.

## Non-blocking notes

**2. The mutex is a shutdown barrier, not a write barrier.** `RLock` permits multiple concurrent holders, so `ReplaceEvent`'s read-modify-write sequence (raw query → raw replace → search delete of superseded documents → search save) can still interleave with a concurrent `SaveEvent` or `ReplaceEvent`. This is **not a regression** — there was no lock at all before — and it may be mitigated upstream, but the comment "drain their active store operations and refuse new ones before closing either backend" should not be read as guaranteeing serialisation between writers.

**3. The rebuild reserve is a hardcoded magic number.** `searchindex.Rebuild(..., 2<<30)` in `main.go` fixes the offline rebuild's free-space requirement at 2 GiB, while the relay's write path uses the configurable `RELAY_MIN_FREE_BYTES`. Consider a named constant, or wiring the rebuild to configuration for consistency.

**4. Duplicated backend internals.** `document()`'s field names and types (`c`, `k`, `p`, `a`, including the `Hex()[56:]` author suffix) and the `rawEventStore` bucket name are hand-copied from the pinned backend so existing indexes stay openable without migration. This is a reasonable choice — and it is documented, and the fixture test compares legacy and compact results — but the copy must track the dependency. A loud failure (a test or an assertion) on a dependency bump would be safer than a silent divergence, especially since the compact mapping now differs from the backend's dynamic mapping.

**5. Minor readability nit.** In `Prepare`, the "index directory already exists" branch is written as `if _, err := os.Lstat(path); !errors.Is(err, os.ErrNotExist) { return err }`. It behaves correctly (it returns the nil error), but it reads as though it is returning a problem. An explicit `return nil` with a comment would be clearer.

**6. Scope reminder for the merge commit message.** This PR should land as a **data-preservation and lifecycle hardening** fix. The runbook itself notes that "actual staging savings and elimination of memory failures require an explicit rollout and observation under representative traffic", and the larger disk/OOM work is out of scope here (tracked separately in #1297). Merging this should not be recorded as having resolved the restart problem.

## Verification notes

**Checked directly:** the diff and head files listed above; the close-path change and its lock discipline; the `closed`-flag guard on every store method; the marker-before-index ordering including the file and directory fsyncs; batch bounding; `DocCount()` validation; read-only raw open with a 1-second lock timeout; the refusal paths in `Prepare` and `Rebuild`; the `RELAY_MIN_FREE_BYTES` parsing and default; the systemd unit changes; the README and runbook content; the presence of `install-staging-relay.sh` on `master` (so the README's reference is not dangling).

**Not checked:** I did not execute `go test -race ./...` or any part of the suite, did not reproduce the memory failure, did not measure the compact-index savings, and did not verify the migration path against a real 17 GiB index. The claims that the compact mapping produces identical query results and reduces index size rest on the PR's fixture test, which the description reports at 150 events with identical legacy-versus-compact results and unchanged raw bytes — a reasonable fixture, but not a projection to production scale.

**Merge state, for the record:** `mergeable_state` is `blocked`, with one agent approval and a queued external check suite. All GitHub Actions checks on the head are green (`security-scan`, `unit-integration`, `footprint`, `e2e-grep`, `prettier`), and `e2e-full` is skipped. This is a substantive change to a payment-adjacent, data-bearing surface, so it should carry a maintainer approval rather than relying on an automated one.
