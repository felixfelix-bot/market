# PROGRESS — PR #1298 review

Head: d205c158afe7a88a7b2d962e620bfc3b35889b20 (base 4cbe2b26, merge-base == base)
Worktree: ~/worktrees/pr1298   Scratch probes: ~/probe1298/relay

## Findings (evidenced)
1. [RISK] searchindex/index.go:62-71 `Prepare` treats an EXISTING index dir as proof of
   validity/completeness. A valid-but-detached (or empty) index over a non-empty raw
   store starts cleanly. Measured PROBE_A: prepare_err=<nil>, search_hits=0, raw_hits=1.
   Contradicts the function's own comment (index.go:60-61 "never ... silently opens an
   empty index over old data"). No DocCount-vs-raw reconciliation anywhere at startup.
2. [RISK] main.go:78 + 205-216 `store.Close()` runs via `defer cleanup()` AFTER
   `server.Shutdown(shutdownCtx)` returns, and takes `mu.Lock()` with no context/deadline.
   Neither RELAY_SHUTDOWN_TIMEOUT_MS nor TimeoutStopSec bounds the drain; only systemd
   SIGKILL does. Probe in progress.
3. [NIT] rebuild.go:123 `os.Remove(marker)` not followed by a directory fsync, while
   markIncomplete (129-143) fsyncs file+dir. Asymmetric; fail-closed but can re-report a
   good index as incomplete after a crash.
4. [INFO] main.go:266-312 ReplaceEvent deletes previous search docs before knowing the
   incoming event was stored -> older revision arriving late deletes the newer event's
   search doc. PROBE_C: newer_in_raw=1 search_hits=0. PRE-EXISTING (unchanged by PR).

## Dedup — do NOT re-raise (maxime-tt comment 2026-09-13)
- RELAY_SHUTDOWN_TIMEOUT_MS default 10000 vs TimeoutStopSec=120 half-wired
- RLock is a shutdown barrier, not a write barrier / ReplaceEvent interleaving
- rebuild reserve hardcoded 2<<30 vs configurable RELAY_MIN_FREE_BYTES
- duplicated backend internals must track pinned dependency
- Prepare Lstat branch readability
- scope reminder for merge commit message

## Verification done
- go build ./... OK; go vet ./... OK; go test -race -count=1 ./... OK (2 pkgs)
- TestCompactRebuild... logs 94.5% reduction (PR body says 87.8%, README "roughly 88%")
- Deployed backend read: bleve SaveEvent writes c/k/p/a; Close() returns nothing.

## Status
- [x] fetch + dedup
- [x] read all 9 files
- [x] run suite at head
- [ ] probes 2 (shutdown bound) + residue variant
- [ ] draft review
- [ ] gate 2.5 cross-family (worker-reviewer-glm)
- [ ] publish
- [ ] contribution-PR task if >=1 BLOCK/RISK
