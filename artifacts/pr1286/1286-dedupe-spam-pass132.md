# PR #1286 — dedupe vs 5 prev-issues + spam check (pass 132, READ-ONLY)

Repo: PlebeianApp/market · PR #1286 · head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
State: OPEN / isDraft=true / MERGEABLE · base `auctions` · author hkarani · 14 files
Card: plebeian-pr-reviews:t_be177680 · branch worker-heavy/1286-dedupe-spam-f7

Authoritative draft artifact: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
(3548 B, md5 0fc6675ab0cfab78d9b9a6d568e9ed5a = unchanged baseline; 7 findings D1-D7)

Comparison set (live, read-only): issue comments = 1 (#5617745226, felixfelix-bot = the five
prev-issues); reviews = 0; review comments = 0. No unlisted prior round ⇒ no
DUPLICATE-OF-UNLISTED row possible.

## CITED LINES RE-READ AT THE PINNED SHA (this pass)

- D1 StorefrontIdentityManager.ts:88 `const existing = this.registry.get(name)` — registry-only.
- D2 EventHandler.ts:84 `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- D3 storefront.tsx:67 `const page = parseStorefrontPage(content)`; storefront.ts:89 flatMap drop;
  storefront-page.ts:5 `StorefrontPageSchema.parse(page)`; storefront.ts:77 `.max(40)` (no `.min`);
  storefront-page.ts:12 `tags: [['d','storefront-page']]`.
- D4 storefront-page.ts:10 `kind: 30024`; ADR-019:134 "Kind `30024` (addressable, application-specific)".
- D5 StorefrontIdentityManager.ts:73 `registryDTag: 'storefront-names'`; queries/storefront.tsx:20
  `'#d': ['storefront-names']`; ADR-019:110-111 `d=${instanceNamespace}-storefront-names`;
  ADR-019:161-162 "never a literal"; no ADR-018 file at tip.
- D6 storefront.test.ts (only new test) under src/lib/schemas/; package.json:31 test:unit glob =
  `find contextvm src/queries/__tests__ src/lib/__tests__`.
- D7 StorefrontRenderer.tsx:57-58 static count + global `/products`; :66 `/community`.
- prev#1 $vanityName.tsx:21 `vanityActions.resolveVanity(vanityName)` (30000 d=vanity-urls only).
- prev#2 nip05.ts:12 `{ ...legacy.names, ...unified.names }`.
- prev#3 RESERVED_NAMES (:5-53) lacks `terms`/`privacy`.
- prev#4 storefront.ts:26 `title: z.string().trim().min(1).max(160)` (no safeText).
- prev#5 no validUntil gate in fetchStorefrontPage (queries/storefront.tsx:39-54).

## DEDUPE + SPAM TABLE

| Draft issue | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** [BLOCK] `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry (name still buyable while held in `nip05-names`/`vanity-urls`; unified-wins at `nip05.ts:12` repoints it) | **DUPLICATE OF #2** — same root cause via a different path. Prev#2: "Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", prescribing a cross-check of `existing.pubkey` "across both pools before **registering**/serving". D1 is exactly that cross-check missing on the registration path (`:88`) vs prev#2's serving merge (`nip05.ts:12`). ADR-019:114-116 states the identical requirement. | **ACTIONABLE** — a paid name sold twice (earlier holder silently repointed); required change: reject a name held by a different pubkey in EITHER legacy registry. *Already tracked as prev#2.* |
| **D2** [BLOCK] `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a unified-owned name | **DUPLICATE OF #2** — *marginal call stated explicitly:* mechanism differs (sale wiring vs serving merge) but root cause (pools not unified ⇒ one name representable to two pubkeys) and symptom ("two pubkeys can each pay for `alice`", `/alice` ≠ `alice@host`) are prev#2's. `:84 purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`; prev#2's remedy spans "registering/serving"; ADR-019:125-127 mandates read-only demotion. | **ACTIONABLE** — a second buyer can pay for a name the unified registry already owns; required change: register legacy managers as read-only resolvers that reject new zap receipts (ADR-019:125-127). *Already tracked as prev#2.* |
| **D3** [BLOCK] `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — publish gate reuses the lenient RENDER parser; invalid blocks silently dropped | **NEW** — none of the five touches the publish-vs-render validation split. Prev#4 = missing `safeText` on `heroBlock.title` (different field/root cause); prev#5 = page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops invalid blocks (`storefront.ts:89` flatMap), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`storefront-page.ts:5`), which passes (`.max(40)`, no `.min`), so one typo truncates the page, the success toast fires (`:76`), and the `d=storefront-page` event (`:12`) overwrites the prior page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly. |
| **D4** [BLOCK] `src/publish/storefront-page.ts:10` — kind `30024` claimed NIP-23 long-form draft, not "addressable, application-specific" per ADR-019:134 | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — spec-conformance mismatch with a named edit either way: kind hard-coded `30024` (`:10`) vs ADR-019:134 verbatim "Kind `30024` (addressable, application-specific)". Required change: use a free addressable 3xxxx kind and correct ADR-019:134. *(Whether NIP-23 collides in practice is the code-truth worker's call; the code/ADR discrepancy names an exact change regardless.)* |
| **D5** [RISK] `src/server/StorefrontIdentityManager.ts:73` — registry `d` literal `storefront-names` vs ADR-019:110-111 `d=${instanceNamespace}-storefront-names`; mirrored client-side `queries/storefront.tsx:20` | **NEW** — same FILE as prev#3 (`:5-53 RESERVED_NAMES`) but different line, function and root cause; nothing in the five concerns the registry `d` tag or instance namespacing. Deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation + multi-instance namespace collision: literal hard-coded server-side (`:73`) and client-side (`queries/storefront.tsx:20`), ADR-019:161-162 forbids literals, no ADR-018 file at tip. Required change: resolve `d` from instance config on both sides. |
| **D6** [RISK] `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — asserted guardrail unenforced: the only added test in the 14-file diff sits under `src/lib/schemas/`, but `test:unit` (`package.json:31` = `find contextvm src/queries/__tests__ src/lib/__tests__ …`) excludes it, so CI is green regardless. Required change: move the spec under `src/lib/__tests__/` (or widen the glob). |
| **D7** [NIT] `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns renderer coordinate resolution (prev#5 = page-expiry gate). | **NIT** — display fidelity only: a static count (`:57`) plus a global `/products` (`:58`) / `/community` (`:66`) link replace coordinate resolution; the harm is a misleading count/link, not correctness, security or data-loss; ADR-019:140-142 is architectural intent, not a testable invariant. The draft's own tag is [NIT], and it cites `:59` (the `</section>` close) — citation imprecision further supports NIT. |

## REQUIRED CLOSING LINE

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

Buckets partition all seven. D1/D2 are DUPLICATE-but-ACTIONABLE; D7 is NEW-but-NIT — the two
axes were kept independent. X+Y = 6 rather than 7 only because D7 is NEW-but-NIT (the task
explicitly allows "an issue can be NEW-but-NIT"); Z counts NITs on the spam axis as instructed.

## READ-ONLY CONFIRMATION

Only `gh pr view`, `gh api … (GET)` and `git show` / `git ls-tree` reads were issued. No GitHub
comment, review, label, approval or any other API write was made.
