# PR #1286 dedupe + spam-check — pass 63 (fleet offload)

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."

Key-unchanged pass. Re-derives the classification independently from the live sources
and confirms the bounded result in `1286-dedupe-spam-RESULT.md` is still correct.
It does not supersede that file.

## Key (re-verified this pass, read-only)

- Authoritative draft: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  - present, 3548 B, 7 findings (D1-D7: 4 `[BLOCK]` / 2 `[RISK]` / 1 `[NIT]`)
  - md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a` / sha256 `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`
- PR `PlebeianApp/market` #1286: OPEN, `isDraft: true`, MERGEABLE,
  head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`,
  branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`.
- Composite key (draft md5/sha256 + PR head) **UNCHANGED since pass 21** — 43rd consecutive unchanged pass.
- GitHub write surface (`gh api` GET only): issue comments = exactly one, `#5617745226`
  by `felixfelix-bot` (the five prev-issues); reviews = `[]`; review comments = `[]`.
  No `DUPLICATE-OF-UNLISTED` row is possible.

## Independent verification (every cite re-read with `git show <SHA>:<path>` at the SHA)

- D1 `StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`; validity at `:89`
  (`existing && existing.pubkey !== pubkey && existing.validUntil > Math.floor(Date.now()/1000)`) checked
  against that one registry only. `RESERVED_NAMES` `:5-53` still lacks `terms`/`privacy`
  (`grep -n "'terms'\|'privacy'"` exit 1 — prev #3 premise live).
- D2 `EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- D3 `dashboard/account/storefront.tsx:67` = `const page = parseStorefrontPage(content)`; success toast
  follows at `:76` ("Storefront page published"). `storefront.ts:89-92` `flatMap` drops invalid blocks;
  `:77` `blocks: z.array(...).max(40)` (no `.min`); `publish/storefront-page.ts:5` re-parses with
  `StorefrontPageSchema.parse`; `:12` `tags: [['d','storefront-page']]`.
- D4 `publish/storefront-page.ts:10` = `kind: 30024`; ADR-019:134 verbatim
  `- Kind `30024` (addressable, application-specific), `d=storefront-page`,`. Draft cites `:10` correctly.
- D5 `StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`, mirrored at
  `queries/storefront.tsx:20` = `'#d': ['storefront-names']`; ADR-019:110-111 requires
  `d=${instanceNamespace}-storefront-names` via ADR-018 and :161-162 forbids literals;
  `git ls-tree <SHA>:docs/adr/` has **no** ADR-018 file (verified).
- D6 `package.json:31` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ! -name '*.integration.test.ts'`;
  `src/lib/schemas/storefront.test.ts` is the only added test in the diff (verified vs
  `gh pr diff --name-only`, 14 files) and sits outside that glob, so it never executes. ADR-019:163 guardrail unmet.
- D7 `StorefrontRenderer.tsx`: count at `:57` (`{block.products.length} product references published by this seller.`),
  global `/products` `SafeLink` at `:58`, `</section>` at `:59`, `/community` at `:66`. Draft cites `:59`, the section close.
- Prev premises re-checked: #1 `$vanityName.tsx:21` `vanityActions.resolveVanity(vanityName)` still the only resolver
  (and the draft does not re-raise it); #2 merge `nip05.ts:12` `const result = { names: { ...legacy.names, ...unified.names } }`;
  #3 reserved list `:5-53` (no terms/privacy); #4 `storefront.ts:26` `title: z.string().trim().min(1).max(160),` with no `safeText`;
  #5 `queries/storefront.tsx:56` `useStorefrontPage` subscription with no `validUntil` gate.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism (each manager validates independently and "each only sees its own registry") and its remedy requires cross-checking `existing.pubkey` across both pools "before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`), not the serving merge; ADR-019:114-116 states the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* mechanism differs (sale wiring vs serving merge) but the root cause prev #2 names ("the pools are not unified") and the symptom it already covers (two pubkeys each pay for `alice`; `/alice` != `alice@host`) are identical. `:84` keeping both legacy managers in `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy spans the registering path. Same root cause / same symptom => duplicate. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast, overwriting the previous page at `d=storefront-page` | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`), a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops invalid blocks (`storefront.ts:89-92`), `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`:5`) which passes (`blocks` is `.max(40)`, no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the `d=storefront-page` event (`:12`) replaces the prior page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — code/ADR mismatch at an exact, verifiable spot: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)`, `d=storefront-page` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the mismatch names an exact change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018 and :161-162 forbids literals, but the value is hard-coded (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` — a citation imprecision that further supports NIT.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a change, but already tracked as prev #2, so a
  maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to D3: D5 shares a *file* with prev #3 yet no root cause or symptom, so NEW;
  D3 shares no file with any prev issue, so NEW.
- Buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is NEW-but-NIT;
  the NIT count is on the spam axis as instructed.
- Read-only: only `gh pr view`, `gh pr diff`, `gh api ... GET`, `git show`, `git ls-tree` reads were
  issued. No comment, review, label, approval or other write was made; nothing was pushed.
- **HALT stands:** the key has not changed in 43 passes; gate any further dedupe dispatch on the key
  changing (new draft md5 or new PR head). Read `1286-dedupe-spam-RESULT.md` rather than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
