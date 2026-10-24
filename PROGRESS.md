# PROGRESS — t_1af2045b Audit compact index maintenance, PR #1298 (market)

Task: audit the "compact index maintenance" half of PlebeianApp/market#1298
head d205c158afe7a88a7b2d962e620bfc3b35889b20. Read-only audit; no GitHub writes.

Worktree: /home/c03rad0r/worktrees/market-pr1298-idx (branch worker-heavy/t_1af2045b)
Frozen diff artifact (parent task t_be5fec37): /home/c03rad0r/worktrees/t_be5fec37/pr1298.diff

## Environment facts established
- module cache: /home/c03rad0r/gopath-local/pkg/mod ; `go mod download` works
- pinned dep dir: .../fiatjaf.com/nostr@v0.0.0-20260314085316-2cec1c943486
- `deploy-simple/relay` is NOT in the repo-root bun workspace (standalone go module)
- github.com DNS was transiently unresolvable; resolved on retry, push succeeded
- PR #1298 is ALREADY MERGED (3f394190) -> post-merge advisory audit only

## Verification observed
- go test ./internal/searchindex/            -> ok 4.564s (PR tests pass at head)
- go vet ./internal/searchindex/ ./cmd/...   -> clean
- probes A-I (searchindex), probe J (cmd/market-relay) -> see REPORT.md

## Findings (full text in REPORT.md + attached artifact)
- F1 [RISK] index.go:56   Prepare only installs compact mapping when dir absent
- F2 [RISK] rebuild.go:123 stale marker permanently blocks startup
- F3 [RISK] rebuild.go:96  flush threshold checked after append (batch budget breach)
- F4 [RISK] main.go:315    reserve on save/replace but not delete; replace window
- F5 [RISK] index.go:69    consistency checked only as "index absent"
- F6 [INFO] index.go:23    duplicated field extraction vs pinned backend
REFUTED: Prepare path divergence (probes A/B); Close-vs-iteration deadlock
(proves khatru defers writes: deleting.go errgroup.Go, expiration.go).

## Milestones
- [x] context read (frozen diff + pinned upstream dep source)
- [x] probes written + run; 2 hypotheses refuted, 6 findings confirmed
- [x] REPORT.md + artifact attached to kanban t_1af2045b (attachments 50, 51)
- [x] commit 6c9e1b69 + 7d0be4da; pushed to fork, ls-remote verified
- [x] comment on card
