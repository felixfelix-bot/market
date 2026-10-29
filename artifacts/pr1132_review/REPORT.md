# PR #1132 review — FULL REPORT

- Repo: `PlebeianApp/market`
- PR: #1132 "fix(checkout): improve shipping display, total cost clarity, and remove redundant cart preview"
- Author: `turizspace` (`is_own: false`)
- Dispatch pin: `b492322c682dc4b5b787f0076f8b527df8c47b67`
- Lane: worker-heavy (provider `zai`, model `tier/worker-heavy`)
- Date: 2026-10-29
- Outcome: **NO-OP — nothing published.** PR is CLOSED and both SHAs already carry our reviews.

---

## 1. Dispatch state vs live state (checked first)

`gh pr view 1132 --json state,headRefOid,closedAt,mergedAt,reviewDecision`:

| Field | Live value | Dispatch said |
|---|---|---|
| state | **CLOSED** | (implicitly OPEN) |
| closedAt | **2026-10-05T07:40:50Z** by `turizspace` | — |
| mergedAt | `null` (closed unmerged) | — |
| headRefOid | **`5382a05ba6c3dca00041ed0cbf481e108bbfbad2`** | `b492322c682d…` |
| reviewDecision | `CHANGES_REQUESTED` | — |

- `git cat-file -t b492322c` → `commit` (local object exists), and `b492322c` is an ancestor of the live head `5382a05b`. It is a superseded intermediate, not the tip.
- Post-pin commits: `fa334957` (merge of master), `abfa7bfa` "Resolve implementation", `5382a05b` "Update checkout-shipping.spec.ts". The author's branch on the fork is still at `5382a05b` (`git ls-remote turizspace refs/heads/fix/shipping-options`).
- Timeline (`gh api repos/…/issues/1132/timeline`) shows the only `closed` event is the author's own close on 2026-10-05 — no merge, no reopen.
- No successor PR for this change exists (`gh pr list --search "1132 in:body"`: only unrelated #1337).

## 2. Existing coverage by this lane (dedup of the review itself)

| When | Kind | SHA | URL |
|---|---|---|---|
| 2026-09-19 | COMMENTED review | `b492322c` (exactly the dispatch pin) | pullrequestreview-5258123343 |
| 2026-10-01 | COMMENTED review | `5382a05b` (live tip) | pullrequestreview-5378649017 |

Plus issue comments 2026-08-14, 08-18, 09-01, 09-09 (the last announcing the contribution PR).

So: the dispatch pin is already reviewed at head with a zero-findings delta verdict, AND the live tip is already reviewed at head with a zero-findings delta verdict. Posting another comment on a CLOSED PR would be duplicate/AACR noise with no route to merge.

## 3. Diff review performed anyway (27 files, +910/−246 at the pin)

Diff captured to `artifacts/pr1132_review/pr1132.diff` (1930 lines). Files:
`.github/workflows/e2e.yml`, `e2e/{scenarios/index.ts,tests/buyer-purchase.spec.ts,tests/checkout-shipping.spec.ts,tests/products.spec.ts}`,
`src/components/{CartItem,CartSummary}.tsx`, `src/components/checkout/OrderFinalizeComponent.tsx`,
`src/components/messages/ChatMessageBubble.tsx`, `src/components/orders/{OrderDetailComponent.tsx,detail/ShippingInfoDisplay.tsx}`,
`src/components/sheet-contents/{cart/CartContent.tsx,products/tabs.tsx}`,
`src/lib/{__tests__,stores,utils,queries}` files listed in the diff, `src/queries/{external,shipping}.tsx`.

### 3.1 Prev issues — verified, none re-raised

1. **[RISK] BTC double-convert in ShippingTab — FIXED at the pin.** `tabs.tsx:929-931` reads `productSats = Number(price) || 0` for `productCurrency === 'BTC'` with the comment "The form stores Bitcoin-denominated product prices in sats." No `* 1e8` on the stored value. Correctly absent.
2. **[NIT] Subtotal == Total in OrderFinalizeComponent — FIXED at the pin.** `OrderFinalizeComponent.tsx:32` `subtotalInSats = Math.max(0, totalInSats - totalShippingInSats)`; rendered as three rows (`Subtotal:` / `Shipping:` / `Total:`). Correctly absent.
3. **[NIT] `getPublishCurrency` dead code — still present at the pin** (`tabs.tsx:143`, 0 callers), i.e. same file + same symbol + same root cause as prev issue 3 → **duplicate, not re-raised**. (It is deleted in the later `abfa7bfa`; at the live tip `git grep getPublishCurrency 5382a05b -- src/` returns nothing.)

### 3.2 New-issue candidates — each considered, each rejected with evidence

| Candidate | Why rejected |
|---|---|
| `CartItem.tsx:17` — `cartStore` left in the import after the cart-preview block was deleted (`src/components/CartItem.tsx:17`, only occurrence is the import line; identical at `b492322c` too) | Dead import only. `tsconfig.json` sets `strict` but not `noUnusedLocals`; Bun/ESLint in this repo do not fail on it, and it has no runtime trigger. NIT-class style at most — fails the AACR "trigger → misbehavior" bar. Not raised. |
| `ShippingTab` combined-total builder — `Number.isFinite(shippingSats)` / `combinedSats` can be `NaN` when exchange rates are missing | Renders `'—'` via `formatSats`, i.e. a deliberate, visible "unknown" state, and the fiat→sats `NaN` path is the documented fail-closed behaviour of `MempoolService.convertCurrencyToSats` (`mempool.ts:79,82` return `NaN`, guarded at `cart.ts:1483-1492`). No wrong number is shown. Not a finding. |
| `parseShippingReference` return type changed `string` → `ParsedShippingReference` (breaking shape) | All 6 call sites migrated and verified by grep at both SHAs: `cart.ts:360`, `cart.ts:814`, `cart.ts:1729`, `shipping.tsx:664`, `OrderDetailComponent.tsx:207`, `ChatMessageBubble.tsx:326`. New unit coverage in `src/queries/__tests__/shippingReferences.test.ts` (colon-in-d-tag round-trip, 64-hex legacy path). Clean. |
| `shares.communityPercentage` is a new **required** field — could `.toFixed()` crash on old state | Single producer (`cart.ts:1598`) plus both `sellerData` fallback literals updated (`CartSummary.tsx:86`, `CartContent.tsx:82`). `sellerData` is not sessionStorage-persisted (`saveToStorage` serializes only `sellers/products/orders/invoices`) and remote hydration goes through `applyRemoteCartLocally` → `updateSellerData()`, which always rewrites `sellerData`. No crash path. |
| Per-item shipping cost row removed from `CartItem.tsx` (buyer could lose cost visibility) | This is the PR's stated intent ("remove redundant cart preview"); the replacement is the `selectedShippingMethods` block in `OrderFinalizeComponent.tsx` (grouped by method + currency, with item counts). Behaviour change is deliberate and documented in the commit message. |
| `e2e/tests/checkout-shipping.spec.ts:5` `test.use({ recordBuyerVideo: true })` unconditionally — note this line exists at the live tip `5382a05b`, not at the pin `b492322c` (post-pin addition) | Not a defect: it is an opt-in fixture flag, and the ungated-describe / inert-video items are already open thread items and are not re-raised. |

### 3.3 Result

**Zero qualifying NEW findings** at the dispatch pin and zero in the post-pin delta (`abfa7bfa` removes the dead `getPublishCurrency` + unused `currencyMode` param, adds cart drawer Subtotal/Shipping/Total, extends the e2e gate guard; `5382a05b` fixes the spec assertion).

## 4. Draft review comment (DO NOT POST)

Kept on disk for the record only. Not published, not dispatched to Gate 2.5.

```markdown
Thanks @turizspace — the dispatch pinned `b492322c`, so I re-checked it and the live tip.

Reviewed tip 5382a05ba6c3dca00041ed0cbf481e108bbfbad2 — no new issues found. Approving.

(The PR is already closed and both `b492322c` and `5382a05b` carry our reviews, so no separate comment was posted.)
```

## 5. Gate 2.5 (cross-family)

**Not dispatched.** Gate 2.5 exists to gate *publication*; there is no draft to publish (see §4) and the PR is CLOSED, so the gate cannot fire.
For the record, an earlier draft for this exact PR was already cold-audited by `worker-reviewer-glm` (`tier/review-glm`) and **REJECTED** — `~/reports/reviews/plebeian-pr-reviews-t_d61300b4-glm-1132-cold-audit.md`. That audit found the draft's two findings were one duplicate (the `getPublishCurrency` item, which matches prev_issues #3) and one spam ([INFO] about two `useQuery` calls), confirming the zero-new-findings conclusion from the opposite family. I did not re-dispatch glm for a comment that is not being published.

## 6. Publish

**Not published.** Reasons, in order:
1. PR state is CLOSED (author-closed 2026-10-05, unmerged). A review comment cannot be actioned and would not move any gate.
2. Both the dispatch pin and the live tip already carry our at-head reviews (5258123343, 5378649017) with zero findings. `gh pr comment` here would be an exact duplicate of the 2026-10-01 delta review.
3. No formal `gh pr review --approve` was attempted on the closed PR.

If the manager wants the §4 sentence on the thread regardless, it is ready to post verbatim.

## 7. Contribution PR (step 7)

**Skipped.** Two independent reasons:
- Gating condition not met: requires a *published* review containing >=1 real `[BLOCK]`/`[RISK]`. Published: zero. New BLOCK/RISK found: zero.
- Dedup also matches anyway: `turizspace/market#1` — "Fix PR PlebeianApp/market#1132: shipping currency, NaN guard, shared parser, #831 cost model" — is still **OPEN** (head `f32f7d1a`, updated 2026-09-09) and already covers this PR's review items from `felixfelix-bot:fix/shipping-options-rebase`.

## 8. State written

- `artifacts/pr1132_review/{pr1132.diff,felix_reviews.txt,PROGRESS.md,REPORT.md}`
- No GitHub writes. No kanban writes. No code changes.
- Detector state `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` → `prs.1132.last_reviewed_sha = 5382a05ba6c3dca00041ed0cbf481e108bbfbad2` already correct; left untouched (cross-profile write guard).

## 9. Honesty notes

- Local commits/pushes: none performed (`artifacts/pr1132_review/` remains untracked in the shared review worktree).
- Tests: none run — no fix was attempted and no code changed, so Gate 1/Gate 2 do not apply.
- Every `file:line` above was read from `git show <sha>:<path>` in this repo, not from the diff text alone.
