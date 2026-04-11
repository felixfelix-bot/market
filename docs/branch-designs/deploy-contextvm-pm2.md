# Design: Deploy ContextVM with PM2

## Branch

`feature/deploy-contextvm-pm2`

## Goal

Deploy the ContextVM server as a managed PM2 process alongside the main application.

## Why

Review feedback asked for deployment support so the ContextVM server can be started, supervised, and restarted consistently in deployed environments.

## Scope

- Update deployment orchestration to package and launch the ContextVM server
- Ensure environment templates/docs use `CVM_SERVER_KEY`
- Add explicit PM2 process definitions, names, and restart behavior for the server

## Non-goals

- No ctxcn generation work
- No runtime file rename unless this branch is later rebased onto that change
- No unit/integration script generalization beyond what deployment needs
- No E2E stabilization work

## Proposed Changes

1. Update deploy scripts to include the ContextVM runtime artifacts
2. Add a PM2 process entry for the ContextVM server
3. Ensure deploy stop/start/reload flows manage both the app and the server
4. Keep environment variable naming aligned with the reviewer-requested `CVM_SERVER_KEY`

## Validation

- Dry-run deploy script checks where possible
- Verify PM2 config/process definitions are syntactically correct
- Confirm logs and restart behavior are explicit

## Risks

- Deployment automation can drift from local runtime assumptions
- PM2 naming or paths can break remote restarts if not consistent
- This branch may depend on a later runtime rename if the final server path changes

## Success Criteria

- Deployment scripts clearly include the ContextVM server
- PM2 process management is explicit and repeatable
- Environment naming matches the broader ContextVM tool direction
