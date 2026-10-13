# Plebeian Market — Coordination Index

## Architecture

Plebeian-manager is the ORCHESTRATOR. It coordinates 3 sub-manager tracks:

```
plebeian-manager (ORCHESTRATOR)
├── plebeian-my-prs (SUB-MANAGER: our PRs to upstream)
├── plebeian-market-reviews (SUB-MANAGER: reviewing others' PRs)
└── plebeian-market-ADRs (SUB-MANAGER: architectural decision records)
```

## Track Details

### plebeian-my-prs
- **Role**: Manage our own PRs to PlebeianApp/market
- **Worktree**: ~/worktrees/ws-plebeian-market/
- **Fork**: felixfelix-bot/market
- **Upstream**: PlebeianApp/market
- **Kanban**: plebeian-my-prs
- **Status**: NEW — needs bootstrap

### plebeian-market-reviews
- **Role**: Review other people's PRs to PlebeianApp/market
- **Worktree**: ~/worktrees/ws-plebeian-market/
- **Kanban**: plebeian-pr-reviews (existing, 10 tasks: 2 blocked, 8 done)
- **Status**: Active — has prior context

### plebeian-market-ADRs
- **Role**: Architectural Decision Records — discuss and document architecture
- **Worktree**: ~/worktrees/ws-plebeian-market/
- **Kanban**: plebeian-adr
- **Status**: Active — has prior context (was previously named plebeian-market-hermes)

## Dependency Graph

```
plebeian-market-ADRs ──blocks──> plebeian-my-prs
plebeian-market-ADRs ──blocks──> plebeian-market-reviews
```

ADR decisions should inform PR work and reviews. If an ADR is in progress that affects a PR, the orchestrator should pause PR work until the ADR is resolved.

## Cross-Group Messaging

Orchestrator sends to sub-managers via:
```bash
hermes send --to "signal:plebeian-my-prs" "message text"
hermes send --to "signal:plebeian-market-reviews" "message text"
hermes send --to "signal:plebeian-market-ADRs" "message text"
```

File-IPC at /tmp/hermes-self-delivery/ picks up inject files within 2s.

## Shared Resources

- All tracks share the same worktree: ~/worktrees/ws-plebeian-market/
- All tracks share the same fork: felixfelix-bot/market
- Each track has its OWN kanban board for isolated task tracking
- Each track uses its OWN branch for PR work (fork-first stacking)