# Review — PR #399 `fix: correctly display sats price when editing fiat-priced products`

**Reviewed head:** `f0bf563f80fa126da83226b6181716f0c68a1b32` (base `579f35c1ddef8162e619b121eb334bbeb158c8f8`) · 2 files, +22/−6

**Verdict: CHANGES REQUESTED** — 1 `[BLOCK]`, 1 `[RISK]`, 2 `[INFO]`.

Separately from the code: this fix is already on `master` via merged #1231 (a cherry-picked takeover of this PR that preserves your authorship), and maxime-tt asked on 2026-08-16 for this PR to be closed in favor of #1231. Recommendation at the end.

## What the PR gets right

- `src/lib/stores/product.ts:228` — `price: isFiatCurrency ? '' : priceValue` is the correct root-cause fix: `loadProductForEditing` stops loading the fiat amount into the sats field. The sats field no longer renders "60" for a 60 GBP product (`getBitcoinDisplayValue`, tabs.tsx:126-130, reads raw `price`).
- `src/components/sheet-contents/products/tabs.tsx:203-212` — deriving sats from `fiatPrice` on load is the right shape, and it correctly waits for exchange rates instead of computing garbage.

## Findings

**[BLOCK] tabs.tsx:97-105 — the new sats→fiat sync writes `fiatPrice: "0.00"` into the store when rates are unavailable, and fiat-mode publish then emits it as the product price — the product goes live as free.**

Trace, all at the reviewed head:
- `convertSatsToCurrency` returns `0` when `exchangeRates` is falsy (tabs.tsx:48) and also when the loaded rates map lacks the selected currency (tabs.tsx:51-52).
- `fiatValue.toFixed(2)` on that `0` yields `"0.00"`, which this diff writes into the store: `productFormActions.updateValues({ price: satsValue.toString(), fiatPrice: fiatValueStr })` (tabs.tsx:102).
- Fiat-mode publish prefers it: `finalPrice = state.fiatPrice || state.price` (product.ts:391). `"0.00"` is a truthy string, so it wins over the real sats price.
- Nothing downstream rejects it: publish/update validation only checks non-empty and numeric (publish/products.tsx:117-118, :169-170), so the event ships with `['price', '0.00', <fiat>]`.
- This is introduced by this diff: at base, `handleBitcoinPriceChange` wrote only `price` to the store; the `fiatPrice` sync is new.

The merged takeover of this very PR confirms the hole: #1231 added the `hasExchangeRates` guard (commit `480410ec`) with a comment describing exactly this failure — "without them convertSatsToCurrency returns 0 and we would write fiatPrice: '0.00' into the store, which fiat-mode publish then emits as the product price. Skip the sats->fiat sync instead."

Fix: skip the sats→fiat sync when rates are unavailable (adopt the guard from `480410ec`), or better: never write a `fiatPrice` you computed from a converter that just returned 0.

**[RISK] tabs.tsx:204-212 — the load effect gates only on `exchangeRates` truthiness.** An empty rates object (or one missing the selected currency) passes the gate; `convertCurrencyToSats` then returns 0 (tabs.tsx:61) and the store gets `price: "0"` — the sats field shows 0 for a 60 GBP product. Master's successor gates on `Object.keys(exchangeRates).length > 0` and centralizes the derivation in `deriveSatsPriceFromFiat` (`src/lib/utils/productPriceResolution.ts`).

**[INFO] product.ts:391 — `state.fiatPrice || state.price` is string-truthiness as a fallback.** `"0.00"` and `"0"` are truthy and silently win; this is the enabler for the BLOCK above. The successor's `resolvePublishPrice` (productPriceResolution.ts:119-137) fails closed on invalid values instead.

**[INFO] Superseded on master — do not rebase, close instead.** #1231 ("Takeover of #399 by @BenGWeeks … Both commits are cherry-picked onto current master, so Ben remains the commit author") merged 2026-08-18 (`8841cc8d`) with your two commits preserved (`c8b4d646`, `7915135a`) plus the rates-guard (`480410ec`) and fail-closed publish (`2b51b504`). Issue #379 is closed. maxime-tt on 2026-08-16: "Closing this in favor of #1231 which is a newer, cleaner implementation of the same feature." Rebasing this branch would regress both hardenings the takeover added on top.

---
*Reviewed with the linus-review method (correctness-first) by the review-glm lane (GLM/zhipu family; authoring tool per PR footer is Claude Code — cross-family). Head SHA pinned: `f0bf563f80fa`. Gate 2.5 cold audit: independent fresh-context delegate pass (worker-reviewer-ds profile not provisioned on this node), verdict recorded in the review lane artifacts.*