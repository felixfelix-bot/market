# CI Test Failure Analysis (Post-Review Comment)

## Executive Summary

The CI failures were **not** caused by the original review comment about generalizing `test:unit`.

That comment was addressed correctly by broadening unit-test script targets in `package.json`. Unit and integration tests continue to pass.

The failing pipeline path was E2E startup/readiness, where Playwright began while the app server was not reliably reachable.

## What the Review Comment Meant

The reviewer feedback on `package.json` was:

> "Far too explicit. We want this generalized instead of pointing this to single test files."

This referred to unit scripts being tied to a specific file (`contextvm-client.test.ts`) instead of a suite path.

### Correct response that was implemented

- `test:unit` was generalized to directory targets.
- `test:unit:watch` was generalized similarly.
- Integration tests were separated into `test:integration`.

This aligns with the comment and is not the failure source.

## What Actually Triggered CI Failures

The failing signal in CI/local parity was:

- Playwright error: `ERR_CONNECTION_REFUSED` to `http://localhost:34567/`.

This points to E2E server reachability/timing, not unit script scoping.

### Contributing factors

1. **Server startup race window**
   - E2E orchestration started services and proceeded to tests with insufficient hard-fail guarantees if readiness was transient.

2. **Readiness probe consistency gap**
   - Probes and test base URL usage were mixed around `localhost`, which can involve IPv4/IPv6 resolution differences across environments.

3. **No immediate final health assertion before Playwright launch**
   - Even after initial readiness, there was no final guard to catch a quick server drop before tests started.

## Evidence Collected

- Unit suite passed: `bun run test:unit`.
- Integration suite passed: `bun run test:integration`.
- Failure occurred in E2E smoke/parity phase with connection refused at app URL.
- Dev server logs showed startup attempts but test runner still hit refusal in failure cases.

## Hardening Applied

### Local CI-parity script (`scripts/e2e-ci-parity.sh`)

- Added explicit `APP_HEALTH_URL` defaulting to `http://127.0.0.1:${TEST_PORT}/api/config`.
- Added strict readiness tracking with hard failure when app never becomes healthy.
- Added immediate pre-Playwright health check to fail early with logs if app drops.

### Playwright test base URL (`e2e-new/test-config.ts`)

- Updated `BASE_URL` to `http://127.0.0.1:${TEST_PORT}` for deterministic IPv4 loopback resolution.

### GitHub Actions E2E workflow (`.github/workflows/e2e.yml`)

- Aligned readiness probe to `http://127.0.0.1:34567/api/config`.
- Added readiness state check with explicit CI error and logs on timeout.
- Added immediate pre-test health re-check before starting E2E tests.

## Conclusion

The review comment response in `package.json` was appropriate and did not break CI.

The recurring failures were rooted in E2E service startup/readiness timing and probe consistency. The implemented hardening changes address those failure modes directly by:

- enforcing deterministic health checks,
- failing earlier with clearer diagnostics,
- and normalizing loopback addressing for test traffic.
