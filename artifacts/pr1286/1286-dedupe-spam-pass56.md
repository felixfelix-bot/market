# PR #1286 dedupe + spam-check — pass 56 (36th consecutive, key UNCHANGED)

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues
vs 5 known prev-issues and spam-check each." Read-only vs GitHub: only `gh pr view`,
`gh api ... GET`, `git show` / `git ls-tree`. No comment, review, label, approval or
other write; committed locally, not pushed.

Prior passes 53-55 condensed the chain; this pass keeps the same condensed shape but
re-pastes the full 7-row table because the acceptance criteria require every draft
issue classified on both axes with a stated reason.

## Key re-verified LIVE this pass

- Draft (parent task `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  present, non-empty, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba` — seven findings
  D1-D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- PR: head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (OPEN, `isDraft: true`, MERGEABLE,
  base `auctions`, head `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`).
- Comparison set = the *only* issue comment `#5617745226` by `felixfelix-bot`
  (2026-09-10T11:11:01Z), whose five findings are: (1) `$vanityName.tsx` names never
  resolve; (2) `nip05.ts:11-13` independent per-registry validation + merge shadowing;
  (3) `StorefrontIdentityManager.ts:5-53` reserved list drops `terms`/`privacy`;
  (4) `storefront.ts:26` `heroBlock.title` skips `safeText`; (5) `queries/storefront.tsx`
  no `validUntil`/expiry gate. `issues/1286/comments` = 1, `pulls/1286/reviews` = 0,
  `pulls/1286/comments` = 0 -> no `DUPLICATE-OF-UNLISTED` row is possible.
- **Dedupe key UNCHANGED** — byte-identical to the pass-21..55 key. 36th consecutive pass.

## Independent evidence re-read this pass (at the SHA, never the working tree)

- D1 `StorefrontIdentityManager.ts:88` `const existing = this.registry.get(name)`
  (`:89` tests one registry only); prev-#2 comment verbatim: "Both managers validate
  independently and each only sees its own registry ... cross-check `existing.pubkey`
  across both pools before registering/serving". `nip05.ts:12`
  `const result = { names: { ...legacy.names, ...unified.names } }`.
- D2 `EventHandler.ts:84` `this.purchaseManagers = [this.vanityManager, this.nip05Manager,
  this.storefrontManager]`; ADR-019:125-127 verbatim "read-only resolvers ... reject new
  zap receipts".
- D3 `dashboard/account/storefront.tsx:67` `const page = parseStorefrontPage(content)`
  -> `publish/storefront-page.ts:5` `StorefrontPageSchema.parse(page)`, with
  `storefront.ts:89-92` `flatMap` dropping invalid blocks, `storefront.ts:77`
  `blocks: z.array(StorefrontBlockSchema).max(40)` (no `.min`), success toast at
  `storefront.tsx:76`, and `storefront-page.ts:12` `tags: [['d', 'storefront-page']]`
  (kind 30024 addressable -> new event replaces old).
- D4 `publish/storefront-page.ts:10` `kind: 30024`; ADR-019:134 verbatim
  "Kind `30024` (addressable, application-specific)".
- D5 `StorefrontIdentityManager.ts:73` `registryDTag: 'storefront-names'`, mirrored at
  `queries/storefront.tsx:20` `'#d': ['storefront-names']`; ADR-019:110-111 requires
  `d=${instanceNamespace}-storefront-names` resolved through ADR-018; ADR-019:161-162
  forbids literals; `git ls-tree $SHA:docs/adr/` contains **no** ADR-018 file (verified:
  ADR-0001..0007,0009,013..016,019 + a proposals dir).
- D6 `package.json:31` glob `find contextvm src/queries/__tests__ src/lib/__tests__ ...`
  (excludes `src/lib/schemas/`); `.github/workflows/ci-unit.yml:47` runs
  `bun run test:unit`; `gh pr diff --name-only` (14 files) shows
  `src/lib/schemas/storefront.test.ts` is the **only** added test; ADR-019:163-165
  requires the hostile-page renderer test.
- D7 `StorefrontRenderer.tsx:57` static `{block.products.length}` count, `:58` global
  `/products` `SafeLink`, `:66` global `/community` link (draft cites `:59`, the
  `</section>` close); ADR-019:140-142.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 already states the mechanism ("each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy spans "cross-check `existing.pubkey` across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`:88`), not the serving merge (`nip05.ts:12`); ADR-019:114-116 is the same requirement. Same-root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed inside their paid window; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so legacy receipts still mint entries for a name the unified registry owns | **DUPLICATE OF #2** — *marginal call, stated:* the mechanism differs (sale wiring vs serving merge), but the root cause and the symptom prev #2 covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice`. `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. Same-root-cause/symptom => duplicate. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` `.max(40)`, no `.min`), so one typo truncates the page, the success toast fires (`storefront.tsx:76`), and the new `d=storefront-page` event (`:12`) replaces the live page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal code/ADR text vs external- spec collision: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it "Kind `30024` (addressable, application-specific)" (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the required change is concrete either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, whose file is absent at this tip (verified), and ADR-019:161-162 forbids literals, yet the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: `src/lib/schemas/storefront.test.ts` is the sole added test in the 14-file diff (verified against `gh pr diff --name-only`), but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

Notes: D1/D2 are DUPLICATE-but-ACTIONABLE (already tracked as prev #2); D7 is NEW-but-NIT.
Buckets partition all seven (`4 + 2 + 1 = 7`); `X + Y = 6` only because D7 is NEW-but-NIT —
the NIT count is on the spam axis as instructed.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Verdict / halt gate (UNCHANGED — do not re-dispatch)

- **Dedupe key UNCHANGED since pass 21 — 36th consecutive pass on an identical key.**
  Classification reproduces pass-52/55 exactly: D1/D2 DUPLICATE-of-#2 but ACTIONABLE;
  D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW but NIT.
- **STOP dispatching this dedupe task until the key changes** (new draft md5/sha256 or a new
  PR head OID). Every further dispatch reproduces the same 7 rows with zero new information.
  Read `artifacts/pr1286/1286-dedupe-spam-RESULT.md`.
