# Plebeian Market — Closed PR Progress Preservation Handover

**Date:** 2026-08-14
**Source:** 9 PRs closed during 30-PR triage (see ~/plans/plebeian-pr-merge-plan.md)
**Purpose:** Ensure no useful progress is lost from closed PRs. Two audiences:

1. **ADR-writer context windows** — turn design decisions into ADR backlog entries
2. **PR-implementer context windows** — re-implement features on tip of main

**Maintainer (Felix/c03rad0r) directives quoted verbatim from closing comments.**

**STATUS: COMPLETE** — all 7 PRs analyzed by 3 consultants. 6 ADR backlog entries + final implementation order below. Default branch is `master`. Analysis baseline: upstream/master @ `95bf1fc5`. Local refs: `pr/995`, `pr/475`, `pr/405` fetched in ~/repos/market; full 462/472 report at `~/repos/market/PR-SALVAGE-462-472.md`.

**TL;DR:** #462 reviews 95% salvage (ADR-gated) · #475 markdown 95% (re-open w/ author) · #472 order UX 100% (merge-ready) · #684 BTC map 60% (kills runtime Nominatim) · #995 wallet (deposit fix cherry-pick NOW; sheet post-ADR) · #694 storefront 30% (ADR-first, reframed off NIP-15) · #405 RESOLVED upstream (skip).

---

## PART A — FEATURE BACKLOG RECORD

("Record of features we want to get merged" — per Felix's prompts)

### A1. PR #995 — Wallet sheet slider [WALLET HARDENING TRACK]

- **Link:** https://github.com/PlebeianApp/market/pull/995
- **Branch:** `feat/wip-wallet-sheet-slider` (hkarani)
- **Commits:** wallet sheet component → open wallet sheet → nip60 wallet sheet styling → fix deposit modal done-state on subsequent deposits
- **Felix's directive:** "add this to a record of improvements that we should consider including when we revisit wallet hardening"
- **Status: ANALYZED — deposit-modal fix `8e3581719` is a still-broken bug on master (cherry-pick now); theming salvageable; sheet = UX reference pending wallet-surface ADR. See C5.**

### A2. PR #475 — Markdown descriptions [FEATURE BACKLOG]

- **Link:** https://github.com/PlebeianApp/market/pull/475
- **Branch:** `feat/markdown-descriptions` (BenGWeeks)
- **Commits:** markdown rendering+editor for product/collection descriptions → editor min-height → single line break support
- **Felix's directive:** "add this to a record of features that we want to get merged"
- **Note:** Felix asked BenGWeeks about re-opening on tip of main — await author response before implementing
- **Status: ANALYZED — see C5. Salvage ≈95%. Zero markdown on master. One compact ADR (format policy + sanitization). Re-open on tip = right call.**

### A3. PR #694 — NIP-15 shop profiles [FEATURE BACKLOG]

- **Link:** https://github.com/PlebeianApp/market/pull/694
- **Branch:** `patch-1` (Harshdev098)
- **Commits:** "feat: Add support for NIP-15 shop profiles" (1 commit)
- **Felix's directive:** "add this to a record of features that we want to implement & merge"
- **Known gap (from prior review):** products lack `stall_id` in kind 30018 content → `groupProductsByStall` non-functional until product creation updated
- **Status:** ANALYZED — see Part C1. Salvage ≈30%. Master uses kind 30402 now; NIP-15 is legacy. ADR-FIRST required (stall/storefront data model). Issue #435 open.

### A4. PR #684 — BTC map link on profile [FEATURE BACKLOG + ADR]

- **Link:** https://github.com/PlebeianApp/market/pull/684
- **Branch:** `feat/btc-maps-intergration` (hkarani)
- **Commits:** "feat: add btc map link to profile" (1 commit)
- **Felix's directive:** "add this to your record of features that we want to get merged and link to it in our ADR backlog"
- **Status:** ANALYZED — see Part C1. Salvage ≈60%. parseCoordsFromLink() drop-in reusable. Also fixes runtime Nominatim geocoding smell on master (PickupLocationDialog.tsx:60).

### A5. PR #462 — Product reviews (kind 31555) [FEATURE BACKLOG + ADR]

- **Link:** https://github.com/PlebeianApp/market/pull/462
- **Branch:** `feat/product-reviews` (BenGWeeks)
- **Commits:** kind 31555 reviews → prettier → Copilot feedback fixes (x2)
- **Felix's directive:** "add this to your backlog in the ADRs and your record of features we want to get merged... Please link to this branch in your records"
- **Status: ANALYZED — see C3. Salvage ≈95%. Branch still exists @ ab64dd48e0. Orphan schema+seeder already on master. ADR MANDATORY (auth, spam, schema).**

### A6. PR #472 — Order details UX [FEATURE BACKLOG + ADR]

- **Link:** https://github.com/PlebeianApp/market/pull/472
- **Branch:** `feat/order-details-ux-changes` (hkarani)
- **Commits:** collapsible timeline/products → remove v4v shares in payment details → merchant-vs-v4v payment distinction
- **Felix's directive:** "add this to your record of features we still want to get merged & add the core design decisions to our ADR backlog. Be sure to link to this branch for context"
- **ADR relevant:** merchant-vs-v4v payment distinction ties to repo payment-lifecycle state separation rules
- **Status: ANALYZED — see C4. 100% applicable, nothing landed. One small PR, 2 files, low conflict.**

### A7. PR #405 — "More from seller" race condition [INVESTIGATION + ADR]

- **Link:** https://github.com/PlebeianApp/market/pull/405
- **Branch:** `fix/more-from-seller-issues` (BenGWeeks)
- **Commits:** race condition fix + current-product filter → hide section when no other products
- **Felix's directive:** "investigate whether this race condition is still present on the tip of main. If still relevant, please put an ADR to address it in our ADR backlog and please link to this branch for context. Also include this in your record of features we want to get merged"
- **Status: RESOLVED-SUPERSEDED — race condition GONE from master. PR landed upstream as `ab4cbdcf` + Franchovy's `8b281bef` refactor (synchronous store-derived ownership). No ADR, no re-impl. Evidence in C5.**

---

## PART B — SUPERSEDED (progress already carried forward)

### B1. PR #1205 — superseded by #1230 (ours, active)

- https://github.com/PlebeianApp/market/pull/1205
- hkarani's Lightning bid funding concept continues in #1230 (commit 2fd27684, review requested)

### B2. PR #1198 — superseded by #1213 (ADR coherence, draft/epic)

- https://github.com/PlebeianApp/market/pull/1198
- ADR-0004 renumbered to ADR-0006 in #1213

---

## PART C — CONSULTANT ANALYSES

### C1. PR #694 — NIP-15 shop profiles (consultant: glm-5.3)

- **Commit:** `06063c0bc76f3b1722fc2d5b3323b3e7b41fee7e` (2026-03-18, branch `patch-1` on PlebeianApp/market)
- **Files:** `src/queries/shopProfile.tsx` (+204, new); `src/routes/.../account/profile.tsx` (+474/−183); `src/components/pages/ProfilePage.tsx` (+108/−33). ~1000 lines.
- **What it does:** Full NIP-15 stall layer — `shopProfile.tsx` queries/publishes kind 30017 stall events (`d` tag = content.id per spec). Profile dashboard split into Personal (kind 0) and Shop (30017) collapsible sections, multi-stall pill picker, `groupProductsByStall()`.
- **Critical context:** master's product format is now **kind 30402 (NIP-99)** via `src/publish/products.tsx:43`. NIP-15 survives only as read-only legacy source for migration tool (`src/queries/migration.tsx`). Issue #435 (separate shop identity) still OPEN.
- **Salvage ≈ 30%:** query/publish layer is spec-correct and portable, BUT (a) `getProductStallId()` parses 30018 content — grouping dead on 30402 main; (b) 30017 shipping zones duplicate existing shipping-options system; (c) kind 30017 for UI-only fields conflicts with migrate-away direction. ShopProfile interface, merge helper (`mergeShopWithProfile`: stall overrides kind 0), grouping skeleton survive.
- **ADR decisions:** (i) stall data model — 30017 vs Plebeian-specific storefront event vs 30402 `h` hierarchy tag vs kind 0 tags; (ii) product→stall linkage — stall_id in content vs `h`/`a` tag on 30402; (iii) fallback/merge semantics precedent; (iv) one-stall-per-product vs many-to-many; (v) shipping in stall content vs existing shipping-options tags.
- **Re-impl:** ADR FIRST, then 3 PRs: (1) storefront event query/publish module via `src/lib/nostr/io.ts` (ADR-0002 Wave 0, no direct NDK); (2) product creation stall picker + linkage tag on 30402 publish (hard dependency — grouping dead without it); (3) profile display/grouping UX. Heavy conflicts in profile.tsx/ProfilePage.tsx (rewritten); shopProfile.tsx conflict-free.

### C2. PR #684 — BTC map link (consultant: glm-5.3)

- **Commit:** `4424b8acd354d716bdc01a36213b5f8669d9ea3c` (2026-03-09, branch `feat/btc-maps-intergration`)
- **Files:** `PickupLocationDialog.tsx` (+87/−82); `ProfilePage.tsx` (+11/−33); `src/lib/schemas/shippingOption.ts` (+8); `account/profile.tsx` (+29/−1). ~250 lines.
- **What it does:** Replaces Nominatim geocoding with `pickupMapLink` string on kind 0 profile; dialog parses lat/lon from BTC Map/OSM/Google URLs client-side; adds "Open Map" external links.
- **Key finding:** master STILL geocodes via `nominatim.openstreetmap.org` at runtime (`PickupLocationDialog.tsx:60`) — external-service dependency, exact pattern ADR-0005 bans in tests. `parseCoordsFromLink()` regexes are pure, drop-in reusable.
- **Caveat:** PR regresses capability — collapses multi-location pickup to one link; `pickupMapLink` on kind 0 non-standard, uses `as any`; added `pickup-lat`/`pickup-lon` schemas are orphaned.
- **Salvage ≈ 60%:** parser + schema + dialog skeleton survive; data model needs rework.
- **ADR decisions:** (i) source of truth — per-shipping-option `pickup-lat`/`pickup-lon` tags (multi-location, spec-friendly, schemas exist in PR) vs single kind 0 link — recommend former; (ii) eliminate runtime Nominatim — parse at save time, never geocode at render; (iii) vendor URLs = untrusted data — sanitize scheme before `href` (XSS surface PR didn't address).
- **Re-impl:** standalone, no deps. 3 small PRs: (1) `parseCoordsFromLink()` + tests (pure, zero conflict); (2) store coords/mapLink on shipping options in publish flow; (3) rewrite dialog geocode effect. Small conflicts in dialog; ProfilePage/profile hunks stale — redo manually.

### C3. PR #462 — Product reviews kind 31555 (consultant: glm-5.3; full report: repos/market/PR-SALVAGE-462-472.md)

- **Branch lives:** `feat/product-reviews` @ `ab64dd48e0` still exists on PlebeianApp/market (verified ls-remote). Commits: `5934d95e50` → `43ecf105ed` → `6b62331679` → `ab64dd48e0`.
- **Files (+669/−43):** NEW `src/queries/reviews.tsx` (+160), `src/publish/reviews.tsx` (+111), `src/components/{ProductReviews,StarRating,LeaveReviewDialog}.tsx` (+135/+126/+117); `queryKeyFactory.ts` (+5), `products.$productId.tsx` (+15/−1); `routeTree.gen.ts` (−42, generated — discard).
- **Salvage ≈ 95%.** Master already has orphan groundwork: `src/lib/schemas/productReview.ts` (zod, kind 31555, IDENTICAL tag structure, zero consumers) + `scripts/gen_review.ts` seeder. Reviews tab still disabled ("not implemented yet"). PR format matches existing schema exactly.
- **ADR decisions (MANDATORY — new event kind):** (1) kind 31555 schema: `d`=`a:30402:<pubkey>:<d-tag>`, `rating` tags 0–1 (thumb required + value/quality/delivery/communication), content free text, aggregate formula; (2) review auth: open reviews (PR's approach) vs verified-buyer via NIP-17 order proof (ADR-013/014 mechanism exists) — MUST DECIDE; (3) spam mitigation: none in PR — sybil risk, accept or mitigate; (4) validation: PR hand-parses tags, should reuse ProductReviewSchema (AGENTS: relay data untrusted); (5) relay I/O: direct NDK vs io.ts Wave-0 rule.
- **Re-impl:** 590 commits behind, reapply content don't rebase. 3 PRs: (1) ADR + schema-validated transform; (2) query/publish hooks via io.ts + reviewKeys; (3) UI + enable tab. All deps on master; seed e2e via gen_review.ts pattern; regenerate routeTree.gen.ts.

### C4. PR #472 — Order details UX (consultant: glm-5.3; full report: repos/market/PR-SALVAGE-462-472.md)

- **Branch lives:** `feat/order-details-ux-changes` @ `5dc461f69d` still exists. Commits: `3ff68ef467` → `83a2250c8c` → `5dc461f69d`.
- **Files (+82/−25):** `OrderDetailComponent.tsx` (+79/−24), `detail/InvoiceCard.tsx` (+3/−1).
- **Salvage = 100% applicable** — nothing landed by other means. Master still renders V4VRecipientsCard (~line 515), Package icon (~317), non-collapsible timeline (~527), bare 'Merchant Payment' label.
- **ADR decisions:** (1) merchant-vs-v4v labeling: suffix is presentation-only, `invoice.type` stays full state — ADR ratifies labels-aren't-state-collapse + canonical naming (ties to AGENTS payment-lifecycle rule); (2) V4V card removal is display-only — `sellerV4VShares` query must remain; specify where v4v info stays accessible (V4VManager); (3) collapsed-by-default timeline must not obscure settlement proof — keep latest state event visible.
- **Re-impl:** one small PR, 2 files, low conflict. Improvement: use existing shadcn `Collapsible` primitive (`ui/collapsible.tsx`) instead of hand-rolled `useState<Set>`.

### C5. PRs #995 / #475 / #405 (consultant: glm-5.3, tip of upstream/master = 95bf1fc5)

#### PR #995 — Wallet sheet slider (hkarani, 161 commits behind)

- **Commits:** `6b350ff678be` (sheet component) → `f42c2fc2b777` (header wiring) → `8897936d1466` (nip60 theming) → `8e35817198c1` (deposit modal fix). Branches fetched locally as `pr/995`.
- **Files (+/−):** `WalletSheetContent.tsx` NEW +653; `Header.tsx` +8/−17; `ui.ts` +15/−1 (`'wallet'` DrawerType, `walletPage`, `openWalletPage()`); `SheetRegistry.tsx` +6; `Nip60Wallet.tsx` +43/−41; `DepositLightningModal.tsx` +5/−2. ~730 lines.
- **What it does:** Header wallet Popover → full-height right Sheet with 7-page internal wallet (home/deposit/withdraw/send/receive/manageMints/proofs); Nip60Wallet re-themed from hardcoded white-on-dark to tokens; deposit-modal "Done" state fix.
- **Salvage:**
  - ✅ **STILL-BROKEN BUG:** deposit modal fix `8e3581719` applies nearly verbatim — master `DepositLightningModal.tsx:23-27` still syncs `selectedMint` only on open, no `setAmount('')`/`setCopied(false)`/`cancelDeposit()`. CHERRY-PICK CANDIDATE (nit: keep `defaultMint/mints` in deps for mid-open mint changes).
  - ✅ Nip60Wallet token re-theming — master still has 24 hardcoded `bg-white/`/`text-gray-400` occurrences.
  - ⚠️ 653-line sheet duplicates logic master now ships as Dialog components (`src/feature/wallet/components/Deposit/Withdraw/Send/Receive*Modal`). UX reference; code needs rework to reuse modals.
- **ADR decision:** "Wallet UI surface architecture" — single sheet w/ internal nav vs per-action Dialogs (current master); wallet entry in uiStore vs component-local; token theming rule. One ADR for wallet-hardening backlog, this branch = sheet-side reference.
- **Re-impl:** Phase 1 (merge-now, independent): cherry-pick deposit fix. Phase 2: token re-theming (mechanical). Phase 3 (post-ADR): sheet shell + Header swap + ui.ts/SheetRegistry plumbing (Header Popover hunk still applies at master:148-163).

#### PR #475 — Markdown descriptions (BenGWeeks, 590 commits behind)

- **Commits:** `aac45ffada09` (rendering+editor) → `85683d18ca61` (min-height) → `d366e6b468ab` (remark-breaks single line breaks).
- **Files:** `markdown-editor.tsx` NEW +191; `markdown-renderer.tsx` NEW +72; package.json +3 (react-markdown ^10.1.0, remark-breaks ^4.0.0); `InfoTab.tsx`/`NameTab.tsx` +6/−6 each; `textarea.tsx` +17/−12 (forwardRef); 2 route touch-points.
- **Salvage ≈ 95%.** Master has ZERO markdown deps/components — descriptions still plain `whitespace-pre-wrap` `<p>` (products route `getTabContent`, master:160). Renderer safe-by-default: no rehype-raw, no dangerouslySetInnerHTML, default urlTransform blocks `javascript:` URLs, `noopener noreferrer`. Lockfile churn obsolete — repo now on bun (`bun.lock`); regenerate with `bun add`, discard package-lock hunk.
- **ADR decision (one compact ADR):** (a) markdown as description format — protocol implication (old clients render raw source); (b) which surfaces render markdown (product page + collection summary; NOT cards/OG tags); (c) sanitization policy: "react-markdown defaults, never rehype-raw, no raw HTML" codified for untrusted Nostr content; (d) remark-breaks single-line-break semantics.
- **Re-impl:** Branch from master, `bun add react-markdown remark-breaks`, resurrect both components verbatim, check `textarea.tsx` forwardRef drift (29 lines), 2 small route conflicts. ~half-day. Re-opening on tip (as Felix floated with BenGWeeks) is the right call.

#### PR #405 — More-from-seller race condition (BenGWeeks) — **VERDICT: RESOLVED UPSTREAM, NO ACTION**

- **Commits:** `20ed1b0cde24` (race+filter) → `f8a60b609d8e` (hide when empty). **Landed upstream as `ab4cbdcf`** (Ben Weeks, 2026-03-24, near-identical diff) + **`8b281bef`** (Franchovy refactor).
- **Evidence race is GONE on master:**
  - `ProductCard.tsx:44-46`: ownership now synchronous store derivation — `useAuth()` → `isOwnProduct = isAuthenticated && user?.pubkey === product.author.pubkey`. No async `getUser`, no useState/useEffect race. Strictly cleaner than PR's approach.
  - `products.$productId.tsx:755`: current-product filter + hide-when-empty present.
  - Seller query correctly keyed (`productsByPubkeyQueryOptions(pubkey)`, master:344-349) — re-keys on seller change, no stale leak. Same corrected pattern in `auctions.$auctionId.tsx:448-451, 1070`.
- **ADR:** Not warranted (Felix's directive was conditional "if still relevant"). Record as **resolved-superseded**. Optional backlog line: "ownership = synchronous store derivation in ProductCard; never async getUser in list-item components."
- **Re-impl:** NONE. Do not rebase — fully superseded.

### C6. Notes

- Default branch is `master`, not `main` (consultant 3 corrected during analysis).
- Full 462/472 report saved at `~/repos/market/PR-SALVAGE-462-472.md` (untracked — copy into final handover).

---

## PART D — ADR WRITER INSTRUCTIONS (FINAL ADR BACKLOG)

For each ADR below:

1. Read the linked PR diff + prior-art branch for design context
2. Follow repo ADR format: docs/adr/ADR-0NN-title.md (see existing ADR-0001…0016, 013-016 for style)
3. Cite the closed PR + branch SHA as "Prior art"
4. Address repo constraints (AGENTS.md): payment state lifecycle separation, event kind justification, relay data untrusted until schema-validated, new relay I/O via src/lib/nostr/io.ts

**ADR backlog entries (priority order):**

1. **ADR: Product review event model (kind 31555)** [from #462, branch `feat/product-reviews` @ `ab64dd48e0`] — schema ratification (`d`=`a:30402:<pubkey>:<d-tag>`, rating tags 0-1, aggregate formula — matches orphan `src/lib/schemas/productReview.ts` on master); review auth: open vs verified-buyer via NIP-17 order proof (ADR-013/014 mechanism); spam/sybil mitigation; MUST resolve auth before implementation.
2. **ADR: Merchant vs V4V payment destination semantics** [from #472, branch `feat/order-details-ux-changes` @ `5dc461f69d`] — labels are presentation-only, `invoice.type` stays full lifecycle state; canonical naming; v4v info remains queryable (V4VManager) after UI removal.
3. **ADR: Storefront/stall data model + product linkage on kind 30402** [from #694, commit `06063c0b`] — REFRAMED: NOT NIP-15 30017 (master is NIP-99 30402); decide storefront event kind vs 30402 h-tag hierarchy; stall_id vs h/a tag linkage; merge semantics precedent (stall overrides kind 0); ties to open issue #435 "separate shop identity".
4. **ADR: Markdown description format policy** [from #475, commit `aac45ffada09`] — markdown as description format (protocol implication: old clients render raw source); which surfaces render (product page + collection summary, NOT cards/OG); sanitization: react-markdown defaults, never rehype-raw, no raw HTML — codify for all untrusted Nostr content; remark-breaks single-line-break semantics.
5. **ADR: Pickup location storage + no runtime geocoding** [from #684, commit `4424b8ac`] — per-shipping-option `pickup-lat`/`pickup-lon` tags (RECOMMENDED, schemas exist in PR) vs single kind 0 link; eliminate runtime Nominatim (master currently geocodes at render, PickupLocationDialog.tsx:60); URL scheme sanitization for external links (XSS).
6. **ADR: Wallet UI surface architecture** [from #995, commit `6b350ff6`] — single sheet w/ internal page nav vs per-action Dialogs (current master); wallet entry point in uiStore vs component-local; token theming rule (master still has 24 hardcoded color classes in Nip60Wallet). Wallet-hardening track.
7. **#405 race condition: NO ADR** — resolved upstream (`ab4cbdcf` + `8b281bef`). Record one design rule in feature backlog only: "ownership = synchronous store derivation in ProductCard; never async getUser in list-item components."

## PART E — PR IMPLEMENTER INSTRUCTIONS (FINAL ORDER)

For re-implementing on tip of master (default branch is `master`, NOT main):

1. Branch from latest origin/master
2. Re-apply concepts, NOT the old diff — codebase moved 160-590 commits (use per-PR conflict notes in Part C)
3. Use old branch as reference for design decisions only
4. Follow all 5 quality gates (TDD, tests pass, docs, atomic commits, push to fork `felixfelix-bot/market`)
5. Request review from maximotodev + Franchovy (comment ping — bot lacks review-request permission)
6. Respecting authorship: BenGWeeks/Harshdev098/hkarani authored originals — credit in PR description, check if they want to re-open instead (Felix already asked on #475, #694, #462)

**Implementation order (dependency-aware, final):**

1. **#995 deposit-modal fix** — cherry-pick `8e3581719`, still-broken bug on master, 1 file, independent, no ADR needed. FASTEST WIN.
2. **#472 order details UX** — 100% salvage, 2 files, low conflict, zero deps. Use shadcn Collapsible.
3. **#684 BTC map link** — 60% salvage, standalone, kills runtime Nominatim dependency. 3 small PRs (parser+tests → tags on shipping options → dialog rewrite).
4. **#475 markdown** — 95% salvage, ~half-day. Check BenGWeeks re-open response first; if re-opening, support his branch instead of new PR.
5. **#995 wallet surface** — post-ADR only (phase 2 theming can go early, phase 3 sheet needs ADR #6).
6. **ADR-GATED: #462 reviews** (95% salvage; ADR #1 must resolve auth model first) and **#694 storefront** (30% salvage; ADR #3 must resolve data model first).
7. **#405: SKIP** — resolved upstream, nothing to do.
