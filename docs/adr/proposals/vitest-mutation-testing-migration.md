# ADR: Migrate Unit Tests from bun:test to Vitest

## Status

Proposed — Number: ADR-xxx (assigned at upstream merge; formerly carried
unnumbered as `ADR-vitest-mutation-testing-migration.md` on
`adr/consolidated-collection`; supersedes the older
`ADR-015-vitest-migration-for-stryker` draft on `docs/adr-e2e-parallelization`)

## Date

2026-08-05

## Context

The PR Trust Pipeline (`feat/pr-trust-pipeline`) adds automated trust layers
to the market repository: diff-aware coverage gates, Playwright trace/video
evidence, and a human-consumption merge gate. One planned layer — mutation
testing via Stryker — cannot be implemented without changing the test runner.

### The Problem

Stryker (the industry-standard mutation testing framework for JavaScript/
TypeScript) requires a "test runner plugin" to execute the project's test
suite against injected mutations. The market repository uses Bun's built-in
test runner (`bun:test`).

As of August 2026:

- `@stryker-mutator/bun-runner` does not exist on npm (404 — never published)
- The only community alternative (`@stryker-mutator/bun-runner` by menoncello,
  v0.4.0) is stale: built against Stryker API v8 (current is v9.6.1), and
  has a critical correctness bug (#19: crash-at-load mutants are silently
  misreported as "Survived," producing false confidence in test quality)
- Stryker's official runner ecosystem covers: Jest, Mocha, Vitest, Karma,
  and Jasmine — no Bun support is on the roadmap

### What We Lose Without Mutation Testing

The DIY coverage gate (`scripts/check-coverage.ts`) enforces that every
modified line is executed by some test. However, coverage alone cannot
distinguish between:

- A test that calls a function AND asserts the result (strong test)
- A test that calls a function but asserts nothing (dead coverage)

Stryker closes this gap by mutating source code and verifying that tests
fail — proving tests are actually checking outputs, not just touching lines.

### Current Mitigation

The trust pipeline ships without mutation testing. The following layers
provide partial defense against weak tests:

1. Diff-aware coverage gate (every modified line must be exercised)
2. Playwright trace + video evidence (visual proof of behavior)
3. Human-consumption merge gate (reviewer must personally verify artifacts)
4. Code review (human judgment catches missing assertions)

These are sufficient for v1 but do not fully replace mutation testing's
automated anti-gaming guarantee.

## Decision

**Defer mutation testing. Migrate from `bun:test` to Vitest when the
following trigger conditions are met.**

### Trigger Conditions (ALL must be true)

1. Stryker publishes official Bun support, OR the project decides to
   migrate to Vitest for other reasons (e.g., better watch mode,
   ecosystem compatibility, snapshot testing)
2. The migration is scoped as a dedicated PR touching only test
   infrastructure — no behavioral changes to application code
3. The PR Trust Pipeline has been merged and is stable on master

### Migration Plan (when triggered)

1. Add `vitest` as devDependency
2. Replace `bun:test` imports with `vitest` imports in all test files
3. Update `package.json` scripts: `test:unit` → `vitest run`
4. Update CI workflows: `bun test` → `bunx vitest run` (or `npx vitest run`)
5. Verify LCOV coverage output is compatible with existing gate
6. Add `@stryker-mutator/vitest-runner` as devDependency
7. Add `.stryker.conf.json` with diff-scoped mutation, timeout (10 min),
   and score thresholds
8. Add mutation testing job to CI (warning-only initially, then enforcing)

### Scope Constraint

The migration must be mechanical: `import { test, expect } from 'bun:test'`
→ `import { test, expect } from 'vitest'`. No test logic changes, no
assertion changes, no new tests. If behavioral differences surface between
`bun:test` and Vitest (e.g., mock implementations, snapshot formats), those
are documented and resolved case-by-case.

## Consequences

**Positive:**
- Unblocks the PR Trust Pipeline upstream PR (no Stryker dependency)
- Clear decision record for future contributors
- Trigger conditions prevent premature migration
- Vitest migration would bring Stryker mutation testing + broader ecosystem
  compatibility (e.g., snapshot testing, better watch mode, in-source testing)

**Negative:**
- Mutation testing gap remains until migration happens
- Tests could theoretically game coverage without detection (mitigated by
  human review + Playwright evidence)
- Future migration will touch every test file (mechanical but large diff)

**Neutral:**
- `bun:test` continues to work perfectly for our current needs
- Bun's LCOV coverage output is already consumed by the DIY gate
- The migration is deferred, not cancelled — trigger conditions are explicit

## References

- PR Trust Pipeline plan: `docs/plans/pr-trust-pipeline.md`
- Stryker spike findings: kanban task `t_886f5dc9` on board `pr-trust-pipeline`
- Stryker documentation: https://stryker-mutator.io/docs/
- Stryker supported runners: https://stryker-mutator.io/docs/stryker-js/test-runners
- Bun test module: https://bun.sh/docs/test
- Vitest: https://vitest.dev/
