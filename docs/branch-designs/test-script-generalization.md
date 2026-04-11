# Design: Test Script Generalization

## Branch

`feature/test-script-generalization`

## Goal

Generalize test scripts in `package.json` so they target the intended broader suites rather than a narrow set of ContextVM-specific paths.

## Why

Review feedback called out the current script definitions as too explicit. The scripts should represent stable suite boundaries instead of encoding one feature's file list.

## Scope

- Update `package.json` test scripts such as:
  - `test:unit`
  - `test:unit:watch`
- Keep integration test commands explicit and understandable
- Confirm workflow commands remain aligned with the new script behavior

## Non-goals

- No server runtime rename
- No ctxcn generation work
- No deploy/PM2 rollout changes
- No E2E flake fixes in this branch

## Proposed Changes

1. Review existing test directories and intended suite boundaries
2. Replace narrow file-path commands with broader suite-level commands
3. Verify CI workflows still call the correct script names
4. Document any intentionally separate suites that should stay explicit

## Validation

- `bun run test:unit`
- `bun run test:integration`

## Risks

- Broadening unit scripts may surface existing unrelated test failures
- CI duration may change if more tests are now included by default
- Watch-mode changes may need slightly different path handling than one-shot runs

## Success Criteria

- Unit scripts are no longer tightly coupled to ContextVM-specific files
- CI workflows still invoke meaningful suite boundaries
- Unit and integration suites remain understandable and reproducible
