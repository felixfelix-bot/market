# ADR-WRITER HANDOVER — Plebeian Market ADR Backlog

**Date:** 2026-08-14
**To:** ADR-writer context window (dedicated)
**From:** Manager session (plebeian-my-prs), consultant stress-test complete
**Source material:** `~/repos/market/PR-SALVAGE-CLOSED-9PRS.md` (9 closed-PR salvage analysis), `~/repos/market/PR-SALVAGE-462-472.md` (full 462/472 report)

## Mission

Write and stage **4 ADRs** (was 6 — two demoted after stress-test, one merged) that unlock re-implementation of features from closed PRs. These ADRs go into `docs/adr/proposals/` as drafts first; each becomes an upstream PR when dispatched (serialized — see Process).

**Repo:** `~/repos/market` (PlebeianApp/market). Default branch `master`.
**We are:** felixfelix-bot — PULL-ONLY (comment/review/push-to-fork only; no close/merge/label/review-request permissions — review requests via comment ping to maximotodev + Franchovy).

## FINAL CLASSIFICATION (decided — do not re-litigate)

**PR-now (NO ADR — handled by PR-implementer window, not you):**

1. #995 deposit-modal form-state fix (NOT verbatim cherry-pick — see warnings)
2. #472 order-details UX (labeling rationale goes in PR body, not an ADR)
3. #684 phase-1 `parseCoordsFromLink()` + tests (pure function)
4. #995 Nip60Wallet token re-theming (26 mechanical sites)

**ADR-first (YOUR SCOPE — priority order):**

### ADR 1 — Untrusted content rendering & description format

_Merged from #475 markdown + #684 URL sanitization. Cheapest, unblocks most: #475 re-open (time-sensitive — BenGWeeks coordination pending) and #684 phases 2–3._

- **Locks:** (a) markdown is the description wire format — interop tradeoff accepted (old clients render raw source); (b) untrusted Nostr content renders via react-markdown defaults ONLY — never rehype-raw, never dangerouslySetInnerHTML, no raw HTML — codified for ALL untrusted relay-sourced content; (c) external URLs (BTC Map/OSM/Google links) scheme-allowlisted before `href` (XSS surface); (d) remark-breaks single-line-break semantics.
- **Does NOT decide:** which surfaces render markdown beyond product page + collection summary (cards/OG stay plain — put list in ADR as accepted scope, not open question).
- **Prior art:** PR #475 branch `feat/markdown-descriptions` @ `aac45ffada09` (renderer is safe-by-default already: default urlTransform blocks `javascript:`, noopener noreferrer). PR #684 commit `4424b8ac` (parser regexes, vendor URL handling).
- **Precedent for consolidated ADR:** ADR-0003 is a multi-part comprehensive validation protocol.

### ADR 2 — Product reviews, kind 31555

_From #462. Highest value; starts the auth debate early._

- **Locks:** (a) kind 31555 schema — `d` = `a:30402:<pubkey>:<d-tag>`, `rating` tags 0–1 normalized, aggregate formula — RATIFIES the existing orphan zod schema `src/lib/schemas/productReview.ts` (in-tree, zero consumers, only 2 kind-31555 refs in repo — verified); (b) review auth: **open reviews vs NIP-17 verified-buyer** — THE decision, must be resolved before any implementation (NIP-17 order-proof mechanism exists per ADR-013/014); (c) spam/sybil posture — accept risk or mitigate, explicitly.
- **Does NOT decide:** relay I/O routing — io.ts Wave 0 already locked (ADR-0002 + src/AGENTS.md hard-bans new NDK imports). Cite, don't re-decide.
- **Prior art:** PR #462 branch `feat/product-reviews` @ `ab64dd48e0` (still exists upstream, verified ls-remote). 95% salvage. Reviews tab on product page still disabled.

### ADR 3 — Storefront/stall data model + product linkage on kind 30402

_From #694. Biggest design space; needs most maintainer discussion — hence third._

- **Locks:** (a) storefront representation: new event kind vs 30402 `h`-tag hierarchy vs kind-0 tags — REFRAMED off NIP-15 (master is NIP-99 30402; NIP-15 survives only as read-only migration source); (b) product→stall linkage: `h`/`a` tag on 30402 (recommended) vs stall_id in content — grouping is dead without it; (c) merge semantics precedent (stall overrides kind 0 for shop fields); (d) shipping stays in existing shipping-options tags (30017 shipping zones rejected).
- **Ties to:** open issue #435 "separate shop identity".
- **Prior art:** PR #694 commit `06063c0b` (~1000 lines; `shopProfile.tsx` query/publish layer is spec-correct and conflict-free; profile.tsx/ProfilePage.tsx heavily rewritten since — stale).

### ADR 4 — Pickup location storage + no runtime geocoding

_From #684 (storage half only). Smallest. May batch into ADR 1's PR if maintainers prefer fewer round-trips._

- **Locks:** (a) per-shipping-option `pickup-lat`/`pickup-lon` tags as source of truth (NOT single kind-0 link — that collapses multi-location pickup); zod schemas already drafted in PR #684; (b) one-line rule: no third-party geocoding at runtime — coordinates parsed at save time (master currently geocodes via nominatim.openstreetmap.org at render, `PickupLocationDialog.tsx:60` — verified live egress, also an ADR-0005 test-isolation violation).
- **Prior art:** PR #684 commit `4424b8ac`.

**Backlog-record-only (NOT yours — feature backlog, no ADR):**

- #995 wallet sheet: decision belongs to the future wallet-hardening track (locking sheet-vs-dialogs now would pre-empt it; ADR-0007 already covers component architecture + hardcoded-colors-as-debt; branch `feat/wip-wallet-sheet-slider` = sheet-side UX reference).
- #472 labeling rationale: PR-body paragraphs + one backlog line (cross-ref existing proposal `docs/adr/proposals/v4v-ui-agnostic-audit-and-plan.md` which already designates V4VManager as canonical v4v surface).
- #405: resolved upstream (`ab4cbdcf` + `8b281bef`). Keep one design-rule line: "ownership = synchronous store derivation; never async getUser in list-item components."

## WHY TWO WERE DEMOTED (context, so you don't re-add them)

- **#472 merchant-vs-v4v labeling ADR** → dropped: diff is display-only; AGENTS.md already locks "do not collapse payment lifecycles"; `invoice.type` untouched; v4v-visibility question already answered by the v4v-ui proposal. An ADR restating accepted constraints = highest eye-roll risk.
- **#995 wallet-surface ADR** → deferred: navigation topology has zero protocol/payment/data-model impact; decision owner is the wallet-hardening track, not this backlog.

## FORMAT & NUMBERING RULES

1. Read 2–3 existing ADRs first for style (ADR-0003 consolidated format, ADR-013/014 for protocol decisions).
2. **Numbering: verify against UPSTREAM tip before assigning numbers** — local tree is stale (upstream #1213 renumbered ADR-0004→0006; local missing 0006, 0008–0012). `git fetch upstream && git ls-tree upstream/master docs/adr/`
3. Drafts go to `docs/adr/proposals/` — accepted status only after maintainer approval.
4. Cite closed PR + branch SHA as "Prior art" section in each ADR.
5. Every ADR must cite relevant AGENTS.md constraints: payment state separation, relay data untrusted until schema-validated, no new event kinds without docs (this IS the docs), io.ts Wave 0.
6. Safe checks for docs-only: `git diff --check` + `bun run format:check`.

## PROCESS (max-1-open-PR serialization)

- One ADR PR upstream at a time, in priority order. Next starts only after previous merges/closes.
- Push to `fork` remote (felixfelix-bot/market), never upstream/c03rad0r direct.
- Review requests: comment ping `@maximotodev @Franchovy` (bot lacks review-request permission).
- 48h response expectation; authorship credit for original PR authors (BenGWeeks, hkarani, Harshdev098) in any implementation PR that follows — coordinate re-open vs new-PR where authors are active (#475: Felix already asked BenGWeeks).
- Quality gates apply even to docs PRs: atomic commits, conventional messages, pushed.

## WARNINGS FOR THE PR-IMPLEMENTER (pass along)

- #995 deposit-modal fix: file is now `src/feature/wallet/components/DepositLightningModal.tsx`, 515 lines, has `variant: 'bid'|'topup'` auction-funding mode + payment-lifecycle callbacks (`onPaymentAcknowledged`/`onFundingFailed`). NOT a verbatim cherry-pick of `8e3581719`. Re-apply as targeted effect fix: form-state reset only (`setAmount('')`, copied flag, `cancelDeposit()`), keep `defaultMint/mints` in deps, state the form-vs-payment-state boundary in the PR body, add re-open regression test.

## REFERENCE FILES

- `~/repos/market/PR-SALVAGE-CLOSED-9PRS.md` — full salvage analysis (Parts A–E)
- `~/repos/market/PR-SALVAGE-462-472.md` — deep 462/472 report
- `~/plans/plebeian-pr-merge-plan.md` — 30-PR merge plan (active-PR tiers)
- Local ADR refs: fetch as `pr/995`, `pr/475`, `pr/405` in ~/repos/market
