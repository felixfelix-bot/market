# Design: ContextVM Server Runtime Rename

## Branch

`feature/contextvm-server-runtime-rename`

## Goal

Rename the ContextVM server entrypoint to a generic server name and align relay publicity behavior with the deployment environment.

## Why

Review feedback asked for a tool-agnostic server naming model because currency is only the first ContextVM tool. The current `currency-server.ts` name and related references are too specific.

## Scope

- Rename `contextvm/currency-server.ts` to `contextvm/server.ts`
- Update package scripts and any direct file references
- Update workflow and helper script references that invoke the server entrypoint
- Limit public relay announcement behavior to production

## Non-goals

- No ctxcn client generation work
- No deployment/PM2 rollout changes
- No broad E2E stabilization work
- No unrelated test refactors

## Proposed Changes

1. Move the runtime file to `contextvm/server.ts`
2. Update scripts such as `dev:currency-server` if they still point at the old file
3. Update CI or test helpers that launch the server directly
4. In the server runtime, ensure development and staging use scoped relay behavior while production enables public announcement

## Validation

- `bun run dev:currency-server`
- `bun run test:unit`
- `bun run test:integration`

## Risks

- Missed path references can break startup scripts or CI
- Environment-specific relay logic can affect integration tests if dev/prod behavior is not kept explicit

## Success Criteria

- All references use the new server path
- Development and test workflows still start correctly
- Public relay announcement only occurs in production
