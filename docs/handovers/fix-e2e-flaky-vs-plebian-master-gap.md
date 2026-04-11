# Handover: payment-flake work not addressed on `plebian/master`

## Branches compared

- Current branch: `feature/fix-e2e-flaky-price-and-payment-clean-split`
- Upstream baseline checked: `plebian/master`

Comparison used:

- `git diff HEAD..plebian/master`
- focused on:
  - `e2e-new/tests/checkout.spec.ts`
  - `e2e-new/tests/order-lifecycle.spec.ts`
  - `e2e-new/tests/order-messaging.spec.ts`
  - `e2e-new/tests/shipping-special.spec.ts`
  - `e2e-new/tests/payments.spec.ts`
  - `e2e-new/utils/payment-waits.ts`
  - `src/routes/checkout.tsx`

## Short conclusion

Some surrounding test code has diverged on `plebian/master`, but the core payment-flake findings from this branch do **not** appear to have been addressed upstream.

In particular, `plebian/master` does **not** include the two main things this branch discovered/worked on:

1. a documented diagnosis that the failing payment step can land in an explicit invoice-generation error state
2. the small app-side retry fix that makes checkout `Try Again` reliably retrigger invoice generation

## What `plebian/master` changed instead

`plebian/master` has edits in several affected specs, but they mainly:

- remove the shared helper `e2e-new/utils/payment-waits.ts`
- inline simpler `Pay with WebLN` waits/click loops directly in each spec
- keep assuming the relevant success path is: `Invoices` heading appears -> `Pay with WebLN` appears -> click until success

That means upstream has changed the shape of the tests, but not obviously solved the failure mode this branch isolated.

## Parts that still appear unaddressed on `plebian/master`

### 1. Explicit invoice-generation error state is still not handled in the tests

This branch found from artifacts that checkout can reach the payment step and show:

- `Unable to generate payment invoices`
- `Try Again`
- `Go Back`

That is different from simply "WebLN button was slow to render".

Upstream spec changes do **not** appear to account for that state. They generally still wait for `Pay with WebLN` to become visible.

### 2. The app-side retry fix is not on `plebian/master`

This branch added a small state nonce in `src/routes/checkout.tsx` so clicking `Try Again` reliably retriggers the invoice-generation effect.

That change is **not** present on `plebian/master`.

So the specific product-side mitigation discovered here still seems absent upstream.

### 3. The artifact-based diagnosis is not preserved upstream

Both of these branch-only docs are absent on `plebian/master`:

- `docs/branch-designs/fix-e2e-flaky-price-and-payment.md`
- `docs/handovers/fix-e2e-flaky-price-and-payment-scope-handover.md`

So the context that:

- the page reaches `Invoices`
- the failure can be invoice-generation error UI
- this may be out of scope for the ContextVM pricing PR

is not available on upstream `master` from these docs.

### 4. Upstream still does not provide a clearly evidenced resolution for payment-step flake

Even though the helper was removed upstream, there is no clear sign in the inspected diff that upstream added:

- retry-on-error handling in the spec logic
- assertions for `Try Again` / `Go Back`
- app-side instrumentation or readiness guarantees
- a different product fix for invoice generation failure

So the root problem investigated here still looks unresolved.

## What may already be superseded on `plebian/master`

These branch ideas are probably **not** worth reviving as-is unless evidence says otherwise:

- the shared helper file `e2e-new/utils/payment-waits.ts`
  - upstream deleted it and moved back to per-spec logic
- the exact helper-based refactor approach
  - upstream has chosen a different shape for the tests

If future work continues, it should likely be rebased onto current upstream test structure rather than trying to reintroduce the helper mechanically.

## Recommended next step for a future assignee

If someone picks this up later, start from `plebian/master` and re-check the failure with current tests.

Then, if the same invoice-generation error still occurs:

1. reproduce one failing payment-flow spec
2. confirm whether the UI still shows `Unable to generate payment invoices`
3. decide whether to carry forward the checkout retry fix from this branch:
   - commit on this branch: `185946c2` — `fix: make checkout invoice retry actionable`
4. adapt any fix to the current upstream spec layout instead of restoring `payment-waits.ts`

## Bottom line

`plebian/master` has moved on structurally, but it does **not** appear to have addressed the most important findings from this branch:

- invoice-generation error state at payment step
- actionable retry behavior in checkout
- preserved diagnosis/context for that failure mode
