# PR #735 Review Updates

## What Changed

This update addresses the review feedback on PR #735 and keeps the BTC pricing path stable while preparing for multi-tool ContextVM expansion.

- Renamed currency server env key from `CURRENCY_SERVER_KEY` to `CVM_SERVER_KEY`.
- Added checked-in `ctxcn` artifacts and a typed generated-style client contract.
- Kept the active browser runtime on the existing `nostr-tools` client path to avoid reintroducing known browser regressions.
- Generalized `test:unit` and `test:unit:watch` package scripts so they are no longer tied to a single test file.
- Updated deployment flow to include a PM2-managed currency server process and `CVM_SERVER_KEY` env examples.
- Scoped currency server public relay behavior to production.
- Stabilized E2E checkout/payment reliability by starting the currency server in CI and hardening WebLN readiness checks.

## Review Comment Responses

### 1) `.env.example` key name

**Comment:** Better: `CVM_SERVER_KEY`. Currency is just the first tool.

**Response:** ✅ Done.

- Updated `.env.example` to:
  - `CVM_SERVER_KEY=<your_contextvm_server_private_key_in_hex>`
- Updated runtime usage in `contextvm/server.ts` to read `process.env.CVM_SERVER_KEY`.
- Added `CVM_SERVER_KEY` examples in deploy env templates:
  - `deploy-simple/env/.env.development.example`
  - `deploy-simple/env/.env.staging.example`
  - `deploy-simple/env/.env.production.example`

### 2) `src/lib/contextvm-client.ts` / use `ctxcn`

**Comment:** Use `ctxcn`, generate the client, and check it in.

**Response:** ✅ Done (phase 1, safe rollout).

- Added `ctxcn.config.json` to repo.
- Configured `ctxcn.config.json` with localhost relay first for dev-mode generation (`ws://localhost:10547`).
- Added checked-in typed generated-style client:
  - `src/lib/ctxcn/PlebeianServerClient.ts`
- Introduced `Plebeian` naming for active runtime client:
  - `src/lib/plebeian-currency-client.ts`
- Kept compatibility export in:
  - `src/lib/contextvm-client.ts`

**Important implementation note:**

- Active frontend runtime intentionally continues using the browser-safe `nostr-tools` transport.
- We added explicit in-code comments explaining this avoids prior browser regressions from direct browser use of generated `@contextvm/sdk` transport while still checking in `ctxcn` artifacts as requested.

### 3) `package.json` unit script too explicit

**Comment:** `test:unit` should be generalized, not pointed to single files.

**Response:** ✅ Done.

- Updated scripts in `package.json`:
  - `test:unit` -> `bun test contextvm/ src/queries/__tests__/ src/lib/__tests__/`
  - `test:unit:watch` -> `bun test --watch contextvm/ src/queries/__tests__/ src/lib/__tests__/`
- Moved integration coverage out of unit path:
  - `src/lib/integration/contextvm-client.integration.test.ts`
  - `test:integration` targets this file.

## Additional PR-Relevant Updates

- Currency server relay/public behavior is now environment-aware:
  - Production includes public ContextVM relays and public server mode.
  - Non-production avoids public relay announce behavior.
- Deploy script updated to run a separate PM2 process for currency server:
  - `deploy-simple/deploy.sh` now deploys `contextvm/` and starts/reloads both app and currency server PM2 apps.
- E2E reliability hardening for checkout/payment scenarios:
  - CI now starts `dev:currency-server` before running Playwright (`.github/workflows/e2e.yml`).
  - Added `e2e-new/helpers/checkout-payment.ts` to wait for `Pay with WebLN` and retry transient invoice generation failures via `Try Again`.
  - Updated checkout-related specs to use the helper (`checkout`, `shipping-special`, `order-lifecycle`, `order-messaging`, `marketplace`, `zaps`, `payments`).
  - Reduced cross-test state bleed in `payments.spec.ts` by deleting a temporary payment method instead of risking removal of the only seeded Lightning destination.

## Validation Performed

### Unit and Integration Tests

- `bun test contextvm/__tests__/currency-server.test.ts` ✅
- `bun test src/queries/__tests__/external.test.ts` ✅
- `bun test src/lib/__tests__/contextvm-client.test.ts` ✅
- `bun run test:unit` ✅ (86 pass, 0 fail)
- `bun run test:integration` ✅ (5 pass, 0 fail) with local relay + currency server running

### Manual/Runtime Verification

Executed local happy-path with relay + currency server + app:

- `nak serve --hostname 0.0.0.0`
- `bun run startup`
- `bun run seed`
- `NODE_ENV=development APP_RELAY_URL=ws://localhost:10547 bun run dev:currency-server`
- `bun run scripts/fetch-btc-price.ts ws://localhost:10547` (twice)
- Verified cache behavior:
  - First call: `Cached: false`
  - Second call: `Cached: true`
- Browser checks against `http://localhost:3000/products`:
  - Product cards load and show sats + fiat
  - Currency switch to `EUR` works
  - Product detail shows sats + fiat

## Commits Added

- `250fb8c` chore: rename currency server key and scope public relays
- `82922d0` refactor: introduce Plebeian currency client runtime wrapper
- `c583520` chore: check in typed ctxcn currency client artifacts
- `c75c71c` chore: generalize unit test script targets
- `ec1d228` feat: deploy currency server with pm2 and CVM key examples
- `9463c7e` chore: separate integration tests from generalized unit suite
- `58d9eb5` fix: start currency server pm2 process during deploy
- `80e8aaf` test(e2e): start currency server in local and CI runs
- `ea3c0ea` test(e2e): harden WebLN checkout readiness and retries
- `e02fcdf` test(e2e): keep local webServer startup unchanged
- `8f1ed42` refactor: rename contextvm server and ctxcn client artifacts
- `0c40fa9` chore: align ctxcn dev relay config and review notes
