# Cold-audit of draft PR review — PR #399 (PlebeianApp/market)

Audit of: /home/c03rad0r/repos/market/artifacts/pr399_review/draft.md
Head: f0bf563f80fa126da83226b6181716f0c68a1b32 (worktree /tmp/wt399) · Base: 579f35c1

---

## Claim 1 — convertSatsToCurrency returns 0 when exchangeRates falsy (tabs.tsx:48) and when rates map lacks currency (tabs.tsx:51-52)

**CONFIRMED**

Command: `awk 'NR>=40 && NR<=65 {printf "%d|%s\n", NR, $0}' /tmp/wt399/src/components/sheet-contents/products/tabs.tsx`

Output (head worktree):
- line 48: `if (!exchangeRates) return 0` — exact match at cited line.
- lines 51-52: `const rate = exchangeRates[targetCurrency as SupportedCurrency]` / `return rate ? btcAmount * rate : 0` — missing currency → rate undefined (falsy) → returns 0. Exact match at cited lines.

Incidental (relevant to Claim 4): convertCurrencyToSats returns 0 when rates map lacks currency at line 61 (`if (!rate) return 0`) — matches the draft's citation.

## Claim 2 — handleBitcoinPriceChange at head writes fiatPrice to store incl. computed '0.00' (tabs.tsx:97-105, updateValues at :102); BASE did NOT write fiatPrice

**CONFIRMED**

Command (head): `awk 'NR>=90 && NR<=115 {printf "%d|%s\n", NR, $0}' /tmp/wt399/src/components/sheet-contents/products/tabs.tsx`

Output at head (worktree /tmp/wt399):
- lines 97-105: `handleBitcoinPriceChange` — when `currency !== 'SATS' && currency !== 'BTC'` (fiat selected): `fiatValue = convertSatsToCurrency(satsValue, currency)` (:98), `fiatValueStr = fiatValue.toFixed(2)` (:99), `productFormActions.updateValues({ price: satsValue.toString(), fiatPrice: fiatValueStr })` (:102). When fiatValue is 0 (rates unavailable per Claim 1), fiatValueStr === '0.00' and it IS written into the store — including the else-branch at :103-104 writing only `price`.
- Also confirmed incidental: `Math.round(numValue)` for SATS entry at head line 94 (draft claim 8).

Command (base): `git -C /home/c03rad0r/repos/market show 579f35c1:src/components/sheet-contents/products/tabs.tsx | grep -n -A8 'handleBitcoinPriceChange'` (plus `sed -n '90,112p'` for the full function)

Output at base 579f35c1: `handleBitcoinPriceChange` at base line 90 writes ONLY `productFormActions.updateValues({ price: satsValue.toString() })` (base :96). The fiat branch (base :99-103) only calls `setFiatDisplayValue(fiatValue.toFixed(2))` — local display state, NOT the store's `fiatPrice`. The `fiatPrice` store write is introduced by this diff. The BLOCK's "introduced by this diff" framing is correct.

## Claim 3 — Fiat-mode publish prefers state.fiatPrice via string-truthiness at product.ts:391; '0.00' truthy wins; downstream validation only checks non-empty + numeric

**CONFIRMED w-CORRECTION** (path prefix omitted in draft, resolves unambiguously)

Command: `awk 'NR>=380 && NR<=400 {printf "%d|%s\n", NR, $0}' /tmp/wt399/src/lib/stores/product.ts`

Output: line 391 at head: `finalPrice = state.fiatPrice || state.price` inside `if (state.currencyMode === 'fiat')` (line 389). Exact match at cited line.

`'0.00'` is a non-empty string → truthy in JS → wins over `state.price`. Verified logic; no numeric validation before this point (also confirmed by Claim 3b/3c below — price validation is non-empty + non-NaN only).

Commands: `awk 'NR>=110 && NR<=125 {printf "%d|%s\n", NR, $0}' /tmp/wt399/src/publish/products.tsx` and `awk 'NR>=160 && NR<=178 ...`

Output: publish validation at lines 117-118: `if (!formData.price.trim() || isNaN(Number(formData.price))) { throw new Error('Valid product price is required') }` — identical block at lines 169-170. Confirms: only checks non-empty and non-NaN. `'0.00'` passes both (truthy non-empty; Number('0.00')=0, not NaN). `'0'` also passes. Nothing downstream rejects a zero price.

CORRECTION (minor, non-blocking): the draft cites "publish/products.tsx:117-118, :169-170" — the actual repo path is `src/publish/products.tsx` (there is no top-level `publish/` directory; `src/publish/` exists). The citation is a path-prefix abbreviation, not a wrong file; both line numbers resolve exactly. Similarly "product.ts" = `src/lib/stores/product.ts`, "tabs.tsx" = `src/components/sheet-contents/products/tabs.tsx`. Recommend the posted review spell out full paths for the GitHub context, but no claim is affected.

## Claim 4 — [RISK] Load effect at tabs.tsx:203-212 gates only on exchangeRates truthiness; convertCurrencyToSats returns 0 when rates map lacks currency (tabs.tsx:61) → price '0'

**CONFIRMED**

Command: `awk 'NR>=195 && NR<=220 {printf "%d|%s\n", NR, $0}' /tmp/wt399/src/components/sheet-contents/products/tabs.tsx`

Output: effect at lines 204-212 (comment at 203 — the draft's "What the PR gets right" cites 203-212, the RISK finding cites 204-212; both resolve). Line 205: gate is `if (storeCurrencyMode === 'fiat' && fiatPrice && !price && exchangeRates)` — truthiness only, no key-count check. Line 208: `convertCurrencyToSats(fiatValue, currency)`; line 209: `productFormActions.updateValues({ price: satsValue.toString() })`.

`convertCurrencyToSats` at tabs.tsx:61: `if (!rate) return 0` — exact match at the cited line (verified in the Claim 1 read of lines 40-65). So a rates object present but missing the selected currency (or `{}`) passes the gate and stores `price: "0"`.

Plausibility of the degenerate-rates scenario (supporting, not in draft): verified `useBtcExchangeRates` (src/queries/external.tsx:188) → `btcExchangeRatesQueryOptions` (line 149) → `fetchBtcExchangeRates` (line 70): returns `data.BTC` from `https://api.yadio.io/exrates/BTC` as-is, and `getCachedRates` (line 29) returns whatever `rates` object is in localStorage. Nothing guards against an empty or partial map, so the scenario is reachable from a degenerate API payload or cache. On fetch *error* the query throws → `exchangeRates` undefined → gate holds (that path is safe). Draft's RISK framing (not BLOCK) is proportionate.

## Claim 5 — Master carries the fix + hardening: hasExchangeRates guard with the '0.00' comment in handleBitcoinPriceChange (~tabs.tsx:105-114 on master); productPriceResolution.ts with fail-closed resolvePublishPrice

**CONFIRMED**

Commands:
- `git -C /home/c03rad0r/repos/market show origin/master:src/components/sheet-contents/products/tabs.tsx | grep -n -B3 -A25 "handleBitcoinPriceChange"`
- `git -C /home/c03rad0r/repos/market cat-file -t origin/master:src/lib/utils/productPriceResolution.ts`

Output: master tabs.tsx lines 99-118 contain `handleBitcoinPriceChange` with the guard at master line 109: `if (currency !== 'SATS' && currency !== 'BTC' && hasExchangeRates) {` preceded by the comment at master :105-108: "Requires exchange rates: without them convertSatsToCurrency returns 0 and we would write fiatPrice: '0.00' into the store, which fiat-mode publish then emits as the product price. Skip the sats->fiat sync instead." — matches the draft's quote in the BLOCK almost verbatim. `hasExchangeRates` defined at master :52 as `!!exchangeRates && Object.keys(exchangeRates).length > 0` — confirms both the guard and the empty-object gate the draft's RISK says master uses.
- `productPriceResolution.ts` exists on origin/master (blob). `resolvePublishPrice` at master productPriceResolution.ts:119-137 (draft cited 119-137 — exact). It returns `{status:'error'}` on invalid values (fail-closed) instead of silently falling back. `deriveSatsPriceFromFiat` present and gates on `hasExchangeRates` and returns null when it doesn't apply. Draft's master claims all hold.

## Claim 6 — Takeover lineage: #1231 contains c8b4d646 + 7915135a (BenGWeeks) plus 480410ec and 2b51b504; 8841cc8d is ancestor of origin/master

**CONFIRMED**

Commands:
- `gh pr view 1231 --repo PlebeianApp/market --json commits --jq '.commits[] | [.oid[0:8], .authors[].login, .messageHeadline] | @tsv'`
- `git -C /home/c03rad0r/repos/market merge-base --is-ancestor 8841cc8d origin/master`

Output:
```
c8b4d646  BenGWeeks       fix: correctly display sats price when editing fiat-priced products
7915135a  BenGWeeks       fix: remove redundant Math.round in convertCurrencyToSats usage
480410ec felixfelix-bot  fix: guard sats/fiat conversion when exchange rates unavailable (#123...)
2b51b504 c03rad0r        fix: keep derived sats price unresolved until rates arrive, fail clos...
```
- All four commits present in #1231's commit list; c8b4d646 and 7915135a authored by BenGWeeks (authorship preserved).
- `git merge-base --is-ancestor 8841cc8d origin/master` → exit 0: "YES: 8841cc8d IS an ancestor of origin/master". Merge commit 8841cc8d0c92ef1f by Franchovy, "fix: correctly display sats price when editing fiat-priced products (#1231)", dated Tue Aug 18 2026 — matches the draft's "merged 2026-08-18".

NOTE for claim 8/additional-defects: 7915135a is titled "remove redundant Math.round in convertCurrencyToSats usage" — i.e. the PR's OWN second commit already touched a Math.round. This needs checking against the draft's claim 8 (Math.round at head tabs.tsx:94) and for missed defects.

## Claim 7 — All cited file:line citations resolve at head worktree /tmp/wt399

**CONFIRMED** (one path-prefix abbreviation noted, all line numbers exact)

Commands: `awk 'NR>=N {printf "%d|%s\n", NR, $0}' /tmp/wt399/<file>` per citation (and grep for existence).

Every citation resolved:
- product.ts:228 → `price: isFiatCurrency ? '' : priceValue` (src/lib/stores/product.ts:228) — price guard, exact.
- product.ts:391 → `finalPrice = state.fiatPrice || state.price` — exact (verified in Claim 3).
- tabs.tsx:48 → `if (!exchangeRates) return 0` — exact.
- tabs.tsx:51-52 → rates-map lookup + `return rate ? btcAmount * rate : 0` — exact.
- tabs.tsx:97-105 → handleBitcoinPriceChange fiat branch incl. `updateValues({price, fiatPrice})` at :102 — exact.
- tabs.tsx:126-130 → getBitcoinDisplayValue reads raw `price` (`parseFloat(price)`, `satsValue.toString()`) — exact (Claim 8).
- tabs.tsx:203-212 → load effect with comment at :203, effect body 204-212 — exact. (The RISK finding cites 204-212 — also exact.)
- src/publish/products.tsx:117-118 and :169-170 → `if (!formData.price.trim() || isNaN(Number(formData.price)))` price validation — exact (Claim 3). NOTE: draft writes "publish/products.tsx"; the actual path is `src/publish/products.tsx`. Abbreviation, resolves unambiguously; recommend full paths in posted review.

## Claim 8 — Non-cited sanity claims: getBitcoinDisplayValue renders raw store price (tabs.tsx:126-130); Math.round on sats entry at head (:94); #1231 body quote

**CONFIRMED**

- tabs.tsx:126-130 at head: `getBitcoinDisplayValue` returns `parseFloat(price)`-derived string (`satsValue.toString()` for SATS unit) — renders the raw store `price`. Exact match; supports the draft's statement that the sats field renders the raw store price and that loading fiat amount into `price` showed "60" pre-fix.
- tabs.tsx:94 at head: `const satsValue = bitcoinUnit === 'SATS' ? Math.round(numValue) : convertBtcToSats(numValue)` — Math.round on sats entry present, introduced by this diff (base had `numValue` unrounded). Exact.
- #1231 PR body (gh pr view 1231 --json body): "Takeover of #399 by @BenGWeeks — all credit to Ben. His branch fell far behind master... Both commits are cherry-picked onto current master, so Ben remains the commit author." — matches the draft's quoted fragment exactly (draft quotes: 'Takeover of #399 by @BenGWeeks … Both commits are cherry-picked onto current master, so Ben remains the commit author').
- maxime-tt comment on #399 (gh pr view 399 --json comments): 2026-08-16T23:18:43Z: "Closing this in favor of #1231 which is a newer, cleaner implementation of the same feature. #1231 has been reviewed and approved." — verbatim match with the draft.
- Issue #379: CLOSED / closedAt 2026-07-07T14:50:55Z / stateReason COMPLETED — matches "Issue #379 is closed (2026-07-07)".
- PR #399 head commits: a908bd0a + f0bf563f (both BenGWeeks), state OPEN, mergeable CONFLICTING — matches context.
- #1231: MERGED, mergedAt 2026-08-18T15:53:46Z; merge commit 8841cc8d (Franchovy, Aug 18 2026) — matches "merged 2026-08-18 (8841cc8d)".

## Claim 9 — Additional defects in the 2-file diff the draft may have missed

**Investigated — no additional BLOCKING defect found; three optional amendments (MINOR/NIT-level) identified**

Command: `git -C /home/c03rad0r/repos/market diff 579f35c1..f0bf563f` (full 2-file diff, +22/−6 — matches draft header exactly)

Areas examined per the audit brief:
a) **Load-effect dependency array (tabs.tsx:212)**: `[storeCurrencyMode, fiatPrice, price, currency, exchangeRates]` — all values read inside the effect are listed; no missing dep. No defect.
b) **form defaultValues (tabs.tsx:67-74)**: unchanged from base (verified `git show 579f35c1:...tabs.tsx | sed -n '67,87p'`) — `price`/`fiatPrice` defaults and the onSubmit write-back are identical at base and head. The internal form has NO `<form>`/`form.handleSubmit` in tabs.tsx (only a `quantity` form.Field at :338); its onSubmit appears unreachable — but that is **pre-existing dead code at base too** (verified: base has the same useForm with no handleSubmit usage), NOT introduced by this diff. Correctly not a PR finding.
c) **onSubmit path**: the real submit path is ProductFormContent.tsx (form.handleSubmit at :259 → productFormActions.publishProduct at :226). Its publish-button gating getValidationMessage (ProductFormContent.tsx:47-53) checks name/description/images/shipping but **not price** — independently corroborates the draft's BLOCK trace ("nothing downstream rejects it"). Also `getPublishCurrency` (tabs.tsx:152-176) is dead code at both base and head (grep count 1 = definition only) — pre-existing, not a diff defect.

**Optional amendments found (none blocking, none refuting the draft):**
1. **(MINOR) Sticky-'0' not repaired by the load effect.** The effect gate is `!price` (tabs.tsx:205). If the RISK scenario fires once (rates degenerate → store gets `price: "0"`), `price` is truthy forever after, so the effect never re-runs to repair it when rates arrive. Master's `deriveSatsPriceFromFiat` explicitly treats `'0'` next to a positive fiatPrice as unresolved and repairs it once rates arrive (productPriceResolution.ts doc comment: "'0' is truthy, so a plain `!price` check would never repair those drafts"). This is an aggravation of the draft's existing [RISK], not a new finding category — worth one sentence in the RISK.
2. **(MINOR) The load effect writes via updateValues → isDirty:true + debounced draft autosave on mere load** (product.ts:302-308 `updateValues` sets `isDirty: true` and calls `debouncedSave()`; ProductFormContent.tsx:142-146 then shows the "Discard Edits" header action). Introduced by this diff (the effect is new — verified absent at base). However, master's successor effect does exactly the same (uses `updateValues({price: derivedSats})` in the derive effect, master tabs.tsx:217-225), and the PR body itself references known "follow-up issues with the draft/auto-save system" (issue #379 comment) — so it's an accepted trade-off, at most a NIT.
3. **(NIT) The fiat-display effect (tabs.tsx:215-232) is also unguarded**: with rates unavailable it calls `convertSatsToCurrency` → 0 → displays '0.00' in the fiat input (display-only; it calls `setFiatDisplayValue`, not updateValues). 480410ec hardened this too ("the field would display a placeholder '0.00'"). Cosmetic; the draft's BLOCK/RISK already cover the store-writing variants.

None of these changes the verdict or adds a second BLOCK.

## Claim 10 — Verdict logic: CHANGES REQUESTED + close (not rebase)

**CONFIRMED — verdict logic is sound**

- The BLOCK is real, reachable, and introduced by this diff (Claims 1-3): rates unavailable → convertSatsToCurrency returns 0 → `fiatPrice: "0.00"` written to store by the NEW code → fiat-mode publish emits '0.00' as the price (string-truthiness at product.ts:391, pre-existing at base :389 but previously unreachable for this value) → no downstream validation rejects it (publish/products.tsx:117-118/:169-170 non-empty + non-NaN only; publish button gating has no price check). JS semantics verified: `!!'0.00'` → true, `Number('0.00')` → 0 (not NaN), `(0).toFixed(2)` → "0.00". A free-product publish is a correctness BLOCK; CHANGES REQUESTED is the right call for an OPEN PR. #1231's own hardening commit 480410ec (verified: adds `hasExchangeRates` guard + the exact '0.00' comment) independently confirms the maintainer-side review judged this same hole real.
- Close-vs-rebase: maxime-tt's comment (2026-08-16, verbatim verified) directs closure in favor of #1231; #1231 is MERGED (2026-08-18, 8841cc8d, ancestor of origin/master — verified) carrying Ben's two commits plus the two hardening commits (480410ec, 2b51b504 — verified in #1231's commit list). A rebase of #399 onto master would re-apply ONLY Ben's two commits and drop both hardenings (they exist solely in #1231's lineage) — i.e., rebase would reintroduce the BLOCK into master's lineage. PR #399 is mergeable: CONFLICTING (verified). Recommending closure over rebase is consistent with the maintainer's stated direction and is the technically correct recommendation.
- No prior CHANGES_REQUESTED review exists on #399 (reviews list: copilot + BenGWeeks + felixfelix-bot, all COMMENTED) — the draft would be the first substantive blocking review; nothing redundant.
- Draft footer claims verified: PR body/commits carry the Claude Code footer ("🤖 Generated with [Claude Code]") — the cross-family authoring-tool note is accurate.

---

# FINAL CLAIM TABLE

| # | Claim | Verdict |
|---|-------|---------|
| 1 | convertSatsToCurrency returns 0 when rates falsy (tabs.tsx:48) / currency missing (tabs.tsx:51-52) | CONFIRMED |
| 2 | handleBitcoinPriceChange writes fiatPrice incl. '0.00' at head (:97-105, updateValues :102); BASE did NOT write fiatPrice | CONFIRMED |
| 3 | Fiat publish prefers state.fiatPrice || state.price (product.ts:391); '0.00' truthy wins; validation only non-empty+numeric (publish/products.tsx:117-118/:169-170) | CONFIRMED (path is `src/publish/products.tsx`) |
| 4 | Load effect (tabs.tsx:203-212) gates on rates truthiness only; convertCurrencyToSats returns 0 on missing currency (tabs.tsx:61) → price '0' | CONFIRMED |
| 5 | Master has hasExchangeRates guard + '0.00' comment (~:105-114); productPriceResolution.ts with fail-closed resolvePublishPrice | CONFIRMED |
| 6 | #1231 carries c8b4d646, 7915135a (BenGWeeks) + 480410ec, 2b51b504; 8841cc8d ancestor of origin/master | CONFIRMED |
| 7 | All cited file:line citations resolve at /tmp/wt399 | CONFIRMED (path-prefix abbreviations only) |
| 8 | getBitcoinDisplayValue renders raw store price (:126-130); Math.round at :94; #1231 body quote; maxime-tt quote; #379 closed | CONFIRMED |
| 9 | No missed blocking defects in the 2-file diff | CONFIRMED (3 optional MINOR/NIT amendments found) |
| 10 | CHANGES REQUESTED verdict + close-not-rebase recommendation | CONFIRMED |

Corrections (non-blocking): (a) draft cites "publish/products.tsx" — actual path `src/publish/products.tsx`; suggest full paths in the posted review. (b) Optional: add the sticky-'0' repair note to the [RISK]; note the updateValues→isDirty/autosave side effect and the unguarded display effect as NITs if desired.

AUDIT_VERDICT: APPROVE_DRAFT_W_AMENDMENTS
