# Salvage / ADR Assessment — Closed PRs #462 & #472 (PlebeianApp/market)

Analyzed 2026-08-14 against upstream/master @ 95bf1fc5. Note: repo default branch is `master` (not `main`).
Both PR branches still exist ON PlebeianApp/market (verified via ls-remote, HEADs match PR head OIDs) and locally as `upstream/feat/product-reviews` / `upstream/feat/order-details-ux-changes`.

---

## PR #462 — feat: implement product reviews using Kind 31555

- Author: BenGWeeks · CLOSED 2026-08-14 · closes #43
- Branch: https://github.com/PlebeianApp/market/tree/feat/product-reviews @ ab64dd48e0
- PR: https://github.com/PlebeianApp/market/pull/462

### What it does

Full product-review feature on kind 31555: query reviews for a product via `#d` filter, publish signed review events (thumb rating + 4 category ratings), star-rating UI (display + input), aggregate ratings per category, and enables the Reviews tab on the product page.

### Commits

5934d95e50 (feat) → 43ecf105ed (prettier) → 6b62331679 (Copilot fixes) → ab64dd48e0 (Copilot fixes x2, head)

### Files touched (+669/−43, 8 files)

- NEW src/queries/reviews.tsx (+160), src/publish/reviews.tsx (+111), src/components/ProductReviews.tsx (+135), StarRating.tsx (+126), LeaveReviewDialog.tsx (+117)
- src/queries/queryKeyFactory.ts (+5), src/routes/products.$productId.tsx (+15/−1)
- src/routeTree.gen.ts (−42) — generated-file artifact, discard

### Salvageable value vs master

~95% salvageable. Master already has orphan groundwork: `src/lib/schemas/productReview.ts` (zod, kind 31555, IDENTICAL tag structure) and `scripts/gen_review.ts` seeder — both with zero consumers. The product route still disables the Reviews tab ("Product Reviews are not implemented yet", `getIsTabDisabled`). No review UI/queries/publish exist on master. The PR's event format exactly matches the existing schema — it complements rather than conflicts.

### Design decisions for ADR backlog

1. **Kind 31555 event schema (ADR required by AGENTS.md "no new event kinds without explicit ADR")**: `d` = `a:30402:<pubkey>:<d-tag>`; `rating` tags normalized 0–1 (required `thumb` + optional value/quality/delivery/communication); content = free text. Aggregate formula per external "gamma_spec.md": `thumb×0.5 + 0.5×categoryAvg`. ADR should ratify this schema (vendor gamma_spec.md or cite canonically) and note it matches `ProductReviewSchema` already in-tree.
2. **Review auth**: PR allows any authenticated user to review any product (open reviews). Alternative: verified-buyer via NIP-17 order proof (mechanism exists per ADR-013/014). Open reviews = sybil risk. Must be decided explicitly.
3. **Spam mitigation**: none in PR (no rate limiting, moderation, or relay trust); aggregation is client-side and unweighted. ADR should state accepted risk or required mitigations.
4. **Validation**: PR hand-parses tags (parseFloat fallback 0, no d-tag format check) instead of using the existing zod `ProductReviewSchema` — re-impl should validate untrusted relay data through it (AGENTS: relay data untrusted until validated).
5. **Relay I/O routing**: PR uses NDK directly (ndkActions, NDKEvent, NDKFilter) in queries/publish — Wave 0 guidance says new relay I/O routes through `src/lib/nostr/io.ts` / NDK footprint guard.

### Re-implementation sketch (on tip of master)

Branch is 590 commits behind; products.$productId.tsx drifted ~675 lines → reapply content, don't rebase. Suggested split:

1. ADR for kind 31555 (schema + auth decision + spam posture) + schema-validated transform in src/lib (reuse ProductReviewSchema).
2. Query/publish hooks routed via `src/lib/nostr/io.ts` + `reviewKeys` in queryKeyFactory.
3. UI: StarRating, ProductReviews, LeaveReviewDialog, enable Reviews tab (replace placeholder).
   Dependencies all exist on master: ui/dialog, ui/button, ui/textarea, UserNameWithBadge, authStore, sonner. e2e must mock per ADR-0005 (local relay seed via gen_review.ts pattern). Regenerate routeTree.gen.ts; never commit its deletion.

---

## PR #472 — feat: Various UX changes to Order Details Page

- Author: hkarani · CLOSED 2026-08-14 · closes #382
- Branch: https://github.com/PlebeianApp/market/tree/feat/order-details-ux-changes @ 5dc461f69d
- PR: https://github.com/PlebeianApp/market/pull/472

### What it does

Order-details polish: makes Order Timeline and per-product cards collapsible (default collapsed, expand-all toggle), removes V4VRecipientsCard from payment details and the Package icon from the products header, and labels each invoice as "(Merchant)" or "(v4v)" alongside the recipient name.

### Commits

3ff68ef467 (collapsibles) → 83a2250c8c (remove v4v shares + package icon) → 5dc461f69d (merchant vs v4v label, head)

### Files touched (+82/−25, 2 files)

- src/components/orders/OrderDetailComponent.tsx (+79/−24)
- src/components/orders/detail/InvoiceCard.tsx (+3/−1)

### Salvageable value vs master

100% applicable — none of it landed by other means. Master still: renders V4VRecipientsCard (line ~515), shows Package icon in products header (~317), non-collapsible timeline (~527), and InvoiceCard shows bare 'Merchant Payment' vs recipientName with no v4v marker. OrderDetailComponent has drifted (~375 lines differ) so reapply manually, but the touched sections are structurally similar.

### Design decisions for ADR backlog

1. **Merchant-vs-v4v payment distinction** (ties to AGENTS "do not collapse payment lifecycles into booleans"): the `(Merchant)`/`(v4v)` suffix is display-level only — `invoice.type` remains a full state. ADR should record that labels are presentation, not state collapse, and pick a canonical labeling convention.
2. **V4VRecipientsCard removal**: v4v shares are payment-relevant state. PR removes only the render; `sellerV4VShares` query stays. ADR should record this is display-only and specify where v4v payment info remains accessible (V4VManager etc.) so payment transparency isn't silently lost.
3. **Collapsed-by-default timeline**: the timeline is where payment/settlement progression (requested→settled→fulfilled) is visible. ADR note: collapsing must not obscure settlement proof; consider keeping the latest/active state event always visible.
4. **Product row header** reads title from raw `product.tags` with 'Product' fallback — consistent with tag-first data preference; note it bypasses ProductCard's richer rendering when collapsed.

### Re-implementation sketch (on tip of master)

Single small PR, 2 files, low conflict risk (InvoiceCard ~identical; OrderDetailComponent sections recognizable). Improvements over original: use the existing shadcn `Collapsible` primitive (`src/components/ui/collapsible.tsx`, pattern in DashboardListItem) instead of hand-rolled `useState<Set>` + conditional rendering, for accessibility and repo consistency. Dependencies: Button, ChevronUp/ChevronDown icons — all present. Keep `sellerV4VShares` query intact per ADR decision above.
