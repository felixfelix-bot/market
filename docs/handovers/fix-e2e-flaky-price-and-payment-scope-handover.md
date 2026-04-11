# Handover: `feature/fix-e2e-flaky-price-and-payment-clean-split` appears out of scope for PR #735

## Branch

- Current branch: `feature/fix-e2e-flaky-price-and-payment-clean-split`
- Current HEAD: `185946c2` — `fix: make checkout invoice retry actionable`

## Why this handover exists

I re-read the PR description for `get-currency-context-vm` (#735) and compared it with:

- `git diff master..get-currency-context-vm`
- the current purpose of this branch
- the specific work recently done here

Conclusion: the work currently being investigated on this branch is **very likely out of scope for the PR’s intended merge to `master`**.

The PR is about a **BTC pricing fallback architecture**:

- new ContextVM currency server
- multi-source BTC aggregation + median
- SQLite cache
- frontend ContextVM-first fetch with Yadio fallback
- browser-safe ContextVM client
- related unit/integration/frontend tests
- possibly narrow BTC-price E2E coverage

The work on this branch is about **payment-flow / invoice-generation E2E stabilization**, especially around checkout and WebLN readiness. That is a different concern.

## What `git diff master..get-currency-context-vm` shows the PR is trying to do

The main PR branch adds these core feature files:

- `contextvm/currency-server.ts`
- `contextvm/schemas.ts`
- `contextvm/tools/price-sources.ts`
- `contextvm/tools/rates-cache.ts`
- `src/lib/contextvm-client.ts`
- `src/lib/constants.ts`
- `src/queries/external.tsx`
- `scripts/fetch-btc-price.ts`
- package/dependency/env support files
- unit/integration tests around those areas

It also includes some extra files that were already suspected to be optional or creep:

- `e2e-new/playwright-contextvm.config.ts`
- `e2e-new/tests/btc-price.spec.ts`
- `e2e-new/tests/contextvm-org.spec.ts`
- `e2e-new/tests/currency-contextvm.spec.ts`
- `.github/workflows/ci-unit.yml`
- `branch-plans.md`

Notably, the PR diff against `master` does **not** center around payment-flow stability or checkout invoice retry behavior.

## Why the current work looks out of scope

The recent investigation on this branch focused on failures in:

- `e2e-new/tests/checkout.spec.ts`
- `e2e-new/tests/order-lifecycle.spec.ts`
- `e2e-new/tests/order-messaging.spec.ts`
- `e2e-new/tests/shipping-special.spec.ts`
- `e2e-new/tests/payments.spec.ts`

These are payment-flow tests, not BTC-pricing fallback tests.

### Artifact-based finding

From local CI artifacts for the checkout failure:

- the page reached the `Invoices` step
- it did **not** merely wait too long for `Pay with WebLN`
- instead it showed explicit error UI:
  - `Unable to generate payment invoices`
  - `Try Again`
  - `Go Back`

That means the failure mode is about **invoice generation** and/or checkout payment readiness, not ContextVM BTC price fetching.

## Work completed on this branch so far

### Documentation update

Committed:

- `abd0db51` — `docs: record invoice generation failure state`

This updated `docs/branch-designs/fix-e2e-flaky-price-and-payment.md` with the artifact-based diagnosis.

### App-side checkout retry change

Committed:

- `185946c2` — `fix: make checkout invoice retry actionable`

This changed `src/routes/checkout.tsx` so the payment-step `Try Again` button actually retriggers invoice generation via a retry nonce.

### Important note about that app-side fix

This may be a reasonable product fix, but it is **not obviously part of PR #735’s intended pricing-fallback scope**.

So before merging anything from this branch into the ContextVM integration path, reassess whether `185946c2` belongs in:

- a separate payment/invoice reliability PR, or
- a later follow-up branch,

rather than the minimal pricing-fallback merge.

## Recommendation for the next LLM

### Do not continue broad implementation on this branch until scope is clarified

The likely correct move is:

1. **Pause further payment-flow changes** here unless the human explicitly wants to continue the separate E2E stabilization track.
2. **Do not merge this branch into `feature/contextvm-review-split-integration` yet.**
3. Treat the branch as a separate investigation/fix line for checkout/payment flake.

### If asked to continue this branch anyway

Focus only on proving whether the payment-flow fix is real and self-contained:

1. Run targeted specs only:
   - `e2e-new/tests/checkout.spec.ts`
   - `e2e-new/tests/order-lifecycle.spec.ts`
   - `e2e-new/tests/order-messaging.spec.ts`
   - `e2e-new/tests/shipping-special.spec.ts`
   - `e2e-new/tests/payments.spec.ts`
2. Determine whether `185946c2` actually reduces failures.
3. If it does, keep the fix narrowly scoped to checkout invoice retry behavior.
4. Do **not** generalize into more unrelated app/UI or CI refactors unless forced by evidence.

## Recommendation for the ContextVM PR path

For `feature/contextvm-review-split-integration` / PR #735:

- keep only the minimal pricing-fallback feature set
- avoid importing payment-flow E2E stabilization work
- at most, consider a narrow BTC-price E2E if it is independently validated

## Files most relevant to this handover

- `docs/branch-designs/fix-e2e-flaky-price-and-payment.md`
- `e2e-new/utils/payment-waits.ts`
- `e2e-new/tests/checkout.spec.ts`
- `e2e-new/tests/order-lifecycle.spec.ts`
- `e2e-new/tests/order-messaging.spec.ts`
- `e2e-new/tests/shipping-special.spec.ts`
- `e2e-new/tests/payments.spec.ts`
- `src/routes/checkout.tsx`

## Bottom line

The current branch is investigating and partially fixing **payment invoice generation / payment-step E2E flake**, while PR #735 is about **ContextVM BTC pricing fallback**.

Those are adjacent in CI, but they are not the same scope.

The safest assumption is that this branch should remain separate unless a human explicitly decides to merge a narrowly justified subset of it later.
