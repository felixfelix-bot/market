# Design: ctxcn Client Check-in and Naming Cleanup

## Branch

`feature/ctxcn-client-checkin-and-naming`

## Goal

Adopt `ctxcn` for the frontend ContextVM client workflow, check in the generated client artifact intended for version control, and normalize client naming in the codebase.

## Why

Review feedback requested using `ctxcn` as the preferred client-generation path and checking generated client files into the repository so they do not need to be regenerated during every branch review.

## Scope

- Add `ctxcn.config.json` for a dev-oriented generation workflow
- Generate and check in the intended client artifact(s)
- Clean up class/file naming around the generated client
- Update imports and usages in frontend code to the final canonical names

## Non-goals

- No server runtime rename
- No deployment/PM2 changes
- No broad CI workflow rewrites
- No E2E stabilization changes unless strictly required for renamed imports

## Proposed Changes

1. Add `ctxcn.config.json`
2. Generate and check in the client artifact under the appropriate source directory
3. Rename generated or wrapper files to align with reviewer guidance
4. Update consuming frontend/query code to use the canonical client name
5. Keep runtime assumptions explicit so browser usage remains safe

## Validation

- `bun run test:unit`
- `bun run build` if the branch introduces build-time client usage
- Targeted tests covering client or query usage

## Risks

- Generated artifacts can cause noisy diffs if config is unstable
- Naming cleanup can break imports across app and test code
- Browser/runtime assumptions must remain compatible with the current frontend environment

## Success Criteria

- `ctxcn` configuration is present and documented by the checked-in artifact
- Client naming is consistent
- Frontend imports compile and tests pass with the generated client in place
