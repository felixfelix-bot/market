# REPORT — PR #399 review (worker-reviewer-glm, gate2:ds)

**Task:** Review PlebeianApp/market PR #399 `fix: correctly display sats price when editing fiat-priced products` (author BenGWeeks), head `f0bf563f80fa126da83226b6181716f0c68a1b32`, base `579f35c1ddef8162e619b121eb334bbeb158c8f8`. OPEN, mergeable CONFLICTING, 2 files +22/−6.

**Outcome:** CHANGES REQUESTED review published as felixfelix-bot (review id 5696417699, commit_id == head, 2026-10-29T10:43:36Z), citing the head SHA. Gate state prs["399"] recorded with last_reviewed_sha so the detector stops re-creating this card.

## Review verdict — 1 BLOCK / 1 RISK / 2 INFO

- **[BLOCK] src/components/sheet-contents/products/tabs.tsx:97-105** — the new sats→fiat store sync in `handleBitcoinPriceChange` writes `fiatPrice: "0.00"` when exchange rates are unavailable (`convertSatsToCurrency` returns 0 at tabs.tsx:48/:51-52). Fiat-mode publish prefers it via string-truthiness (`finalPrice = state.fiatPrice || state.price`, src/lib/stores/product.ts:391 — "0.00" is truthy) and nothing downstream rejects it (src/publish/products.tsx:117-118/:169-170 non-empty+numeric only; ProductFormContent.tsx:47-53 publish gating has no price check). The product publishes as free. Introduced by this diff — at base the function wrote only `price` to the store. The merged takeover #1231 added the `hasExchangeRates` guard (commit 480410ec) with a comment describing this exact failure.
- **[RISK] tabs.tsx:204-212** — the load effect gates only on `exchangeRates` truthiness; an empty/partial rates map passes and `convertCurrencyToSats` returns 0 (tabs.tsx:61), storing `price: "0"`. The gate is `!price` (:205) so a landed "0" is truthy forever and the effect never repairs it when rates arrive. Master's successor gates on `Object.keys().length > 0` and centralizes in `deriveSatsPriceFromFiat` (src/lib/utils/productPriceResolution.ts), which treats "0"-next-to-positive-fiat as unresolved and repairs it.
- **[INFO] src/lib/stores/product.ts:391** — string-truthiness fallback is the BLOCK enabler; successor's `resolvePublishPrice` (productPriceResolution.ts:119-137) fails closed.
- **[INFO]** Superseded: #1231 is a cherry-picked takeover preserving Ben's authorship (c8b4d646, 7915135a), MERGED 2026-08-18 as 8841cc8d (ancestor of master) plus hardenings 480410ec and 2b51b504. Issue #379 closed. maxime-tt (2026-08-16): "Closing this in favor of #1231." Recommendation: close as superseded — a rebase would re-apply only Ben's two commits and drop both hardenings, reintroducing the BLOCK into master's lineage.

**What the PR gets right:** product.ts:228 `price: isFiatCurrency ? '' : priceValue` is the correct root-cause fix (stops loading fiat into the sats field rendered raw by `getBitcoinDisplayValue`); the load-effect derivation (tabs.tsx:203-212) is the right shape.

## Supersession/dedup analysis

- No formal review verdict existed on #399 before this run: prior reviews were copilot COMMENTED (2025-12-21), BenGWeeks 3x COMMENTED (2026-01-02), and 4x felixfelix-bot COMMENTED analysis (2026-07-21) with no APPROVED/CHANGES_REQUESTED. This is the first review-of-record, not a dedup NO-OP.
- Takeover #1231 verified: PR body quotes "Takeover of #399 by @BenGWeeks... Both commits are cherry-picked onto current master, so Ben remains the commit author"; commit list = c8b4d646 + 7915135a (BenGWeeks) + 480410ec (felixfelix-bot, rates guard) + 2b51b504 (c03rad0r, fail-closed publish); merge commit 8841cc8d is an ancestor of origin/master.

## GATE 2.5 — cold audit

`worker-reviewer-ds` profile is not provisioned on this node (`~/.hermes/profiles/` holds glm/kimi/qwen reviewers only), so per fleet precedent (pr1200, pr1410, pr1422) the gate was discharged as an independent fresh-context delegate cold audit of the draft (same family as the drafting lane — disclosed, no cross-family token claimed).

**AUDIT_VERDICT: APPROVE_DRAFT_W_AMENDMENTS** — all 10 claims CONFIRMED, 0 refuted. Amendments applied to the posted review before publishing:
1. Full file paths spelled out (draft abbreviated `publish/products.tsx`; actual `src/publish/products.tsx`).
2. Sticky-"0" aggravation folded into the [RISK] (gate is `!price`, so a stored "0" is never repaired).
3. Two optional NITs found by the auditor (updateValues→isDirty/autosave side effect on mere load; unguarded display effect showing "0.00") were judged accepted trade-offs by the audit (master's successor does the same; PR body references known draft/auto-save follow-ups) and were not added.

Audit evidence: audit-verdict.md in this directory (verbatim copy of /tmp/pr399_audit/audit-verdict.md, deleg_aaffcf9f).

## Verification method (all first-hand at /tmp/wt399, detached at head)

- Read the full 2-file diff; traced every touched path end-to-end: store load (product.ts:216-248) → form effects (tabs.tsx:194-232) → handlers (tabs.tsx:90-149) → publish resolution (product.ts:370-420) → event tag write (src/publish/products.tsx:86) → downstream validation (publish/products.tsx:117-118/:169-170).
- Confirmed JS semantics with node: `!!'0.00'` → true, `Number('0.00')` → 0 (not NaN), `(0).toFixed(2)` → "0.00".
- Confirmed the diff introduces the store-write: `git show 579f35c1:...tabs.tsx` — base's fiat branch only called `setFiatDisplayValue`, never `updateValues({fiatPrice})`.
- Confirmed master carries fix + hardening: `git show origin/master:...tabs.tsx` (hasExchangeRates guard at :109 with the '0.00' comment at :105-108), `origin/master:src/lib/utils/productPriceResolution.ts` (resolvePublishPrice fails closed).
- Supersession lineage via gh: #1231 commits, merge state, merge-base --is-ancestor 8841cc8d origin/master.

## Gate state

`~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` prs["399"]:
- disposition: open-changes-requested-blocked-findings
- last_reviewed_sha: f0bf563f80fa126da83226b6181716f0c68a1b32
- review_id: 5696417699, review_url: https://github.com/PlebeianApp/market/pull/399#pullrequestreview-5696417699
- issues_raised: the 4 findings above
- note: full dedup + audit trail
- Backup: plebeian-pr-review-state.json.bak-pr399-20261029

## Artifacts

- artifacts/pr399_review/draft.md — final review body (byte-identical to what was posted)
- artifacts/pr399_review/review-body.md — posted copy
- artifacts/pr399_review/audit-verdict.md — cold-audit verdict (167 lines)
- artifacts/pr399_review/PROGRESS.md — finding->status->files
- artifacts/pr399_review/raw/{pr399_meta.json,issue379.json} + rebase_comment.txt + prior_bot_reviews.txt — dedup evidence
- artifacts/pr399_review/update_gate_state.py + fix_gate_state.py — gate-state writes (idempotent, with backup)
- Branch review/pr399-glm-20261029 on fork felixfelix-bot/market (evidence trail)

## Reproduction of the BLOCK (for the record)

At head, with a fiat currency selected and rates unavailable (or rates map missing that currency):
1. User types sats in the bitcoin field → `handleBitcoinPriceChange` (tabs.tsx:90).
2. `convertSatsToCurrency(satsValue, currency)` → 0 (tabs.tsx:48 or :51-52).
3. `(0).toFixed(2)` → "0.00" → `updateValues({ price: sats, fiatPrice: "0.00" })` (tabs.tsx:102).
4. Publish → `continuePublishing` → currencyMode 'fiat' → `finalPrice = state.fiatPrice || state.price` → "0.00" (product.ts:391).
5. Validation passes ("0.00" is non-empty, numeric) → event tags `['price', '0.00', <fiat>]` (src/publish/products.tsx:86).
Product is listed at 0.00 fiat — free.