# PROGRESS — t_? Audit compact index maintenance, PR #1298 (market)

Task: audit the "compact index maintenance" half of PlebeianApp/market#1298
head d205c158afe7a88a7b2d962e620bfc3b35889b20. Read-only audit; no GitHub writes.

Worktree: /home/c03rad0r/worktrees/market-pr1298-idx (branch pr1298 @ d205c158)
Frozen diff artifact (parent task): /home/c03rad0r/worktrees/t_be5fec37/pr1298.diff

## Environment facts established
- module cache: /home/c03rad0r/gopath-local/pkg/mod ; `go mod download` works
- pinned dep dir: .../fiatjaf.com/nostr@v0.0.0-20260314085316-2cec1c943486
- `deploy-simple/relay` is NOT in the repo-root bun workspace (standalone go module)
- install-relay.sh creates DATA_DIR + RAW_DB_DIR only; does NOT create SearchIndexDir

## Findings (full text in REPORT.md)
- F1 [BLOCK] index.go:69 Lstat-vs-MkdirAll divergence -> nil success => relay won't start
- F2 [RISK]  markIncomplete leaves stale marker on early-return failure paths
- F3 [RISK]  rebuild.go:96 flush-on-threshold memory spike (unbounded content)
- F4 [RISK]  main.go checkWriteBudget omits DeleteEvent
- F5 [RISK]  pair-divergence not detected/repaired by Prepare or startup

## Milestones
- [x] context read (diff + upstream dep source) -> 5 findings
- [ ] verification build/tests
- [ ] REPORT.md + kanban artifact + commit/push
