# PR #1286 dedupe + spam-check — pass 58 (38th consecutive, key UNCHANGED)

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues
vs 5 known prev-issues and spam-check each." Read-only vs GitHub: only `gh pr view`,
`gh api ... GET`, `git show` / `git ls-tree` reads. No comment, review, label,
approval or other write was made. Committed locally, **not pushed**.

## Key re-verified LIVE this pass (independent, not copied)

- Draft (parent task `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  present, non-empty, 3548 B. `md5 0fc6675ab0cfab78d9b9a6d568e9ed5a`,
  `sha256 f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`.
  Seven findings D1-D7: 4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`.
- PR (live `gh pr view`): head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (OPEN,
  `isDraft: true`, MERGEABLE, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`).
- Comparison set: `issues/1286/comments` = **1** (only `#5617745226` by
  `felixfelix-bot`, 2026-09-10T11:11:01Z), `pulls/1286/reviews` = **0**,
  `pulls/1286/comments` = **0** -> the five prev-issues are the complete prior
  round, so no `DUPLICATE-OF-UNLISTED` row is possible.
- **Dedupe key UNCHANGED** — byte-identical to the pass-21..57 key. 38th consecutive pass.

## Independent evidence re-read at the SHA (never the working tree)

- D1 `StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`,
  `:89` validity tested against that one registry only. Prev-#2 comment verbatim:
  "Both managers validate independently and each only sees its own registry, so they
  can happily assign the same name to two different pubkeys ... cross-check
  `existing.pubkey` across both pools before **registering**/serving".
  `nip05.ts:12` = `const result = { names: { ...legacy.names, ...unified.names } }`.
  Prev #3 premise live: `RESERVED_NAMES` (`:5-53`) still lacks `terms`/`privacy`.
- D2 `EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager,
  this.nip05Manager, this.storefrontManager]`. ADR-019:125-127 verbatim: "Both legacy
  managers stay registered as **read-only** resolvers ... they reject new zap receipts".
- D3 `dashboard/account/storefront.tsx:67` = `const page = parseStorefrontPage(content)`
  (guard at `:68-70` only fires when the *whole* doc is null); success toast at `:76`;
  `publish/storefront-page.ts:5` = `StorefrontPageSchema.parse(page)` with
  `storefront.ts:77` = `blocks: z.array(StorefrontBlockSchema).max(40)` (no `.min`) so a
  block-dropped page re-passes; `:89-92` `flatMap` drops invalid blocks; `:12`
  `tags: [['d','storefront-page']]` (kind 30024 addressable -> new event replaces old).
- D4 `publish/storefront-page.ts:10` = `kind: 30024`; ADR-019:134 verbatim
  "Kind `30024` (addressable, application-specific)".
- D5 `StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`, mirrored at
  `queries/storefront.tsx:20` = `'#d': ['storefront-names']`; ADR-019:110-111 requires
  `d=${instanceNamespace}-storefront-names` resolved through ADR-018, and :161-162
  forbids literals. `git ls-tree $SHA:docs/adr/` contains **no** ADR-018 file (verified:
  0001-0007,0009,013-016,019 + `proposals/`).
- D6 `package.json:31` test:unit glob = `find contextvm src/queries/__tests__
  src/lib/__tests__ ...` (excludes `src/lib/schemas/`); `gh pr diff --name-only` (14
  files) shows `src/lib/schemas/storefront.test.ts` is the **only** added test; ADR-019:163-165
  requires the hostile-page renderer test.
- D7 `StorefrontRenderer.tsx:57` static `{block.products.length}` count, `:58` global
  `/products` `SafeLink`, `:66` global `/community` link (draft cites `:59`, the
  `</section>` close); ADR-019:140-142 requires render-time re-fetch/re-validate.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism ("each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally spans the **registering** path ("cross-check `existing.pubkey` across both pools before registering/serving"). D1 *is* that missing cross-check at `:88` rather than the serving merge; ADR-019:114-116 is the same requirement. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns | **DUPLICATE OF #2** — *stated marginal call:* mechanism differs (sale wiring vs serving merge), but root cause and the symptom prev #2 covers are the same — pools not unified, one name representable to two pubkeys, two buyers can each pay for `alice`. `:84` keeping `vanityManager`/`nip05Manager` in `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the registering path. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), the residue re-passes `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`; `blocks` `.max(40)`, no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the new `d=storefront-page` event (`:12`) replaces the live page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal code/ADR mismatch plus a claimed specs/interop collision: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 says "Kind `30024` (addressable, application-specific)" (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim holds is the separate code-truth worker's call; the mismatch names an exact change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` via ADR-018, ADR-019:161-162 forbids literals, yet the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the 14-file diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` — a citation imprecision that further supports NIT.)* |

Notes: D1/D2 are DUPLICATE-but-ACTIONABLE (already tracked as prev #2); D7 is NEW-but-NIT.
Buckets partition all seven (`4 + 2 + 1 = 7`); `X + Y = 6` only because D7 is NEW-but-NIT —
the NIT count is on the spam axis as instructed.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Verdict / halt gate (UNCHANGED — do not re-dispatch)

- **Dedupe key UNCHANGED since pass 21 — 38th consecutive pass on an identical key.**
  Classification independently reproduces pass-52..57: D1/D2 DUPLICATE-of-#2 but
  ACTIONABLE; D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW but NIT.
- **STOP dispatching this dedupe task until the key changes** (new draft md5/sha256 or a
  new PR head OID). Every further dispatch reproduces the same 7 rows with zero new
  information. Read `artifacts/pr1286/1286-dedupe-spam-RESULT.md`.
