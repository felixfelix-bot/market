# ADR: PR Trust Pipeline — Deferred Components

**Status**: PROPOSED
**Number**: ADR-xxx (assigned at upstream merge; formerly 0016 on `adr/consolidated-collection`)
**Date**: 2026-08-05
**Authors**: Felix (c03rad0r)

## Context

A full PR Trust Pipeline was designed and prototyped on the
`felixfelix-bot/market` fork. The pipeline adds automated trust signals
(coverage, mutation testing, visual proof, Buzz notifications) to every PR.

After review, only **preview deployment** and **nsite test evidence publishing**
were promoted to the upstream PR. The remaining components are deferred to
avoid overwhelming reviewers with fork-specific CI infrastructure.

## Deferred Components

All code lives in branch `feat/pr-trust-pipeline-archival` on
`github.com/felixfelix-bot/market`.

### 1. Coverage Gate (1,732 lines)

- `scripts/check-coverage.ts` — DIY diff-aware coverage gate using LCOV
- `scripts/check-coverage.test.ts` — full test suite
- `.github/workflows/coverage-gate.yml` — GitHub Action
- Replaces Codecov with a self-hosted LCOV-based gate
- **Deferred because**: Upstream uses Codecov. Switching requires team decision
  on coverage thresholds and whether to drop Codecov entirely.

### 2. Mutation Testing (1,004 lines)

- `scripts/stryker-changed-files.ts` — diff-scoped Stryker runner
- `scripts/stryker-changed-files.test.ts` — test suite
- `.github/workflows/mutation.yml` — GitHub Action
- `stryker.config.json` — configuration
- **Blocked**: `@stryker-mutator/bun-runner` does not exist (404 on npm).
  Requires migrating from `bun:test` to Vitest. See
  `ADR-vitest-mutation-testing-migration.md`.

### 3. Buzz NIP-29 Notifications (152 lines)

- `scripts/buzz-notify.sh` — posts CI results to Plebeian #ci Buzz group
- **Deferred because**: Fork-specific integration. Upstream doesn't use Buzz.

### 4. E2E Diff-Aware Spec Selection (543 lines)

- `e2e/lib/diff-specs.ts` — analyzes git diff, selects only affected specs
- `e2e/lib/diff-specs.test.ts` — test suite
- **Deferred because**: Useful for any project, but adds complexity. Better
  proposed as a standalone PR after the core pipeline is merged.

### 5. Full Pipeline Plan (520 lines)

- `docs/plans/pr-trust-pipeline.md` — the complete design document
- Reference material for future pipeline work.

## Decision

Defer all components listed above. Ship only preview deployment + nsite
publishing upstream. Archive the rest for future reference.

Revisit when:

- Team decides on Codecov vs DIY coverage gate
- `bun:test` → Vitest migration is accepted (unblocks Stryker)
- E2E diff-aware specs can be proposed as a standalone improvement

## Consequences

- Upstream PR stays small and focused (~1,650 lines vs 6,000)
- Reviewers see only the preview deploy feature + nsite evidence
- All deferred code is preserved in the archival branch for easy retrieval
- Future PRs can cherry-pick from the archival branch
