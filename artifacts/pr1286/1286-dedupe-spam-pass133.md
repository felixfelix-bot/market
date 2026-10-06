# PR #1286 — dedupe vs 5 prev-issues + spam check (pass 133, READ-ONLY)

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
Repo: PlebeianApp/market · PR #1286 · head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
Workspace: /home/c03rad0r/repos/market · branch `worker-heavy/1286-dedupe-spam-f7`
Card: `plebeian-pr-reviews:t_be177680`

## Inputs verified live this pass (read-only)

- Authoritative draft artifact PRESENT: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, 7 findings D1–D7 (4 BLOCK, 2 RISK, 1 NIT).
- PR live state: OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head `2ae85b6…` UNCHANGED, author `hkarani`, updatedAt 2026-09-10T11:11:01Z, 14 files.
- Comparison set: issue comments = 1 (`#5617745226`, felixfelix-bot) = the five prev-issues;
  reviews = 0; review comments = 0. No unlisted prior round ⇒ no `DUPLICATE-OF-UNLISTED` row possible.
- ADR dir at tip has NO `ADR-018` file (so ADR-019:110-111 / :161-162 resolution prerequisites are unmet at this tip).
- Cited lines re-read at the SHA via `git show 2ae85b6…:<path>` (see evidence section below).

## Deliverable — dedupe + spam table

| Draft issue | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** [BLOCK] `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry (name still buyable while held elsewhere; unified-wins at `nip05.ts:12` repoints it) | **DUPLICATE OF #2** — same root cause, different path. Prev#2: "Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", prescribing a cross-check of `existing.pubkey` "across both pools before **registering**/serving". D1 is that cross-check missing on the registration path (`:88 this.registry.get(name)`) vs prev#2's serving merge (`nip05.ts:12`). ADR-019:114-116 states the identical requirement. | **ACTIONABLE** — a paid name sold twice (earlier holder silently repointed). Required change: reject a name held by a different pubkey in EITHER legacy registry. *Already tracked as prev#2.* |
| **D2** [BLOCK] `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a unified-owned name | **DUPLICATE OF #2** — *marginal call stated explicitly:* mechanism differs (sale wiring vs serving merge) but root cause (pools not unified ⇒ one name representable to two pubkeys) and symptom ("two pubkeys can each pay for `alice`") are prev#2's. `:84 purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`; prev#2's remedy spans "registering/serving"; ADR-019:125-127 mandates read-only demotion. | **ACTIONABLE** — a second buyer can pay for a name the unified registry already owns. Required change: register legacy managers as read-only resolvers that reject new zap receipts (ADR-019:125-127). *Already tracked as prev#2.* |
| **D3** [BLOCK] `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — publish gate reuses the lenient RENDER parser; invalid blocks silently dropped | **NEW** — none of the five touches the publish-vs-render validation split. Prev#4 = missing `safeText` on `heroBlock.title` (different field/root cause); prev#5 = page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops invalid blocks (`storefront.ts:89` flatMap), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`storefront-page.ts:5`), which passes (`.max(40)`, no `.min`), so one typo truncates the page, the success toast fires (`:76`), and the `d=storefront-page` event (`:12`) overwrites the prior page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly. |
| **D4** [BLOCK] `src/publish/storefront-page.ts:10` — kind `30024` claimed NIP-23 long-form draft, not "addressable, application-specific" per ADR-019:134 | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — spec-conformance mismatch with a named edit either way: kind hard-coded `30024` (`:10`) vs ADR-019:134 verbatim "Kind `30024` (addressable, application-specific)". Required change: use a free addressable 3xxxx kind and correct ADR-019:134. *(Whether NIP-23 collides in practice is the code-truth worker's call; the code/ADR discrepancy names an exact change regardless.)* |
| **D5** [RISK] `src/server/StorefrontIdentityManager.ts:73` — registry `d` literal `storefront-names` vs ADR-019:110-111 `d=${instanceNamespace}-storefront-names`; mirrored client-side `queries/storefront.tsx:20` | **NEW** — same FILE as prev#3 (`:5-53 RESERVED_NAMES`) but different line, function and root cause; nothing in the five concerns the registry `d` tag or instance namespacing. Deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation + multi-instance namespace collision: literal hard-coded server-side (`:73 registryDTag: 'storefront-names'`) and client-side (`queries/storefront.tsx:20 '#d': ['storefront-names']`), ADR-019:161-162 forbids literals, no ADR-018 file at tip. Required change: resolve `d` from instance config on both sides. |
| **D6** [RISK] `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — asserted guardrail unenforced: the only added test in the 14-file diff sits under `src/lib/schemas/`, but `test:unit` (`package.json:31` = `find contextvm src/queries/__tests__ src/lib/__tests__ …`) excludes it, so CI is green regardless (ADR-019:163 renderer-hostility test guardrail unmet). Required change: move the spec under `src/lib/__tests__/` (or widen the glob). |
| **D7** [NIT] `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns renderer coordinate resolution (prev#5 = page-expiry gate). | **NIT** — display fidelity only: a static count (`:57`) plus a global `/products` (`:58`) / `/community` (`:66`) link replace coordinate resolution; the harm is a misleading count/link, not correctness, security or data-loss; ADR-019:140-142 is architectural intent, not a testable invariant. The draft's own tag is [NIT], and it cites `:59` (the `</section>` close) rather than the code at `:56-58`/`:65-66` — citation imprecision further supports NIT. |

## REQUIRED CLOSING LINE

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

Buckets partition all seven. D1/D2 are DUPLICATE-but-ACTIONABLE; D7 is NEW-but-NIT — the two
axes were kept independent. X+Y = 6 rather than 7 only because D7 is NEW-but-NIT (the task
explicitly allows "an issue can be NEW-but-NIT"); Z counts NITs on the spam axis as instructed.

## Evidence re-read at `2ae85b6` this pass

- D1 `StorefrontIdentityManager.ts:84-93` — `validateRegistration` reads `this.registry.get(name)` only.
- D2 `EventHandler.ts:84` — `purchaseManagers = [vanityManager, nip05Manager, storefrontManager]` (both legacy managers still constructed and armed).
- D3 `account/storefront.tsx:66-76` (`parseStorefrontPage` then success toast) · `schemas/storefront.ts:85-95` (flatMap drop, then `StorefrontPageSchema.parse` on the residue) · `publish/storefront-page.ts:5,12,10`.
- D4 `publish/storefront-page.ts:10 kind: 30024` vs ADR-019:134.
- D5 `StorefrontIdentityManager.ts:73 registryDTag: 'storefront-names'` + `queries/storefront.tsx:20 '#d': ['storefront-names']` vs ADR-019:110-111.
- D6 `src/lib/schemas/storefront.test.ts:1` (sibling of `storefront.ts`, not under `__tests__/`) vs `package.json:31` glob.
- D7 `StorefrontRenderer.tsx:52-68` (productGrid/collectionRow bodies).
- Prev sites: prev#1 `$vanityName.tsx:21` (`vanityActions.resolveVanity`) · prev#2 `nip05.ts:10-12` (merge) · prev#3 `StorefrontIdentityManager.ts:5-53` (no `terms`/`privacy`) · prev#4 `schemas/storefront.ts:26` (`title: z.string().trim().min(1).max(160)`, no `safeText`) · prev#5 `queries/storefront.tsx:39-54` (no `validUntil` filter).
- ADR-019 read: :110-111, :114-116, :125-127, :134, :140-144, :161-163. `docs/adr/` at tip contains NO ADR-018.

## READ-ONLY CONFIRMATION

Only `gh pr view`, `gh api … (GET)`, `gh pr diff` and `git show` / `git ls-tree` reads were issued.
No GitHub comment, review, label, approval or any other API write was made.
