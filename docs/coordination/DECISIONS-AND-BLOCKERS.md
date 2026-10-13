# Plebeian Market — Decisions and Blockers

## Current Decisions

### D-001: Fork-First PR Stacking
- **Date**: 2026-07-21
- **Decision**: All PR work goes on felixfelix-bot/market fork. Stack PRs to avoid overwhelming upstream reviewers. Higher layers stay on fork.
- **Rationale**: Same pattern as Amperstrand/balloon projects. Minimizes reviewer burden.

### D-002: Shared Worktree, Separate Kanbans
- **Date**: 2026-07-21
- **Decision**: All 3 sub-tracks share ~/worktrees/ws-plebeian-market/ but have separate kanban boards. Branch isolation prevents conflicts.
- **Rationale**: Plebeian market is a single repo. Multiple worktrees of the same repo would cause branch confusion. Kanban isolation gives each track its own task visibility.

## Current Blockers

(none yet — hierarchy just established)

## Resolved Blockers

(none yet)