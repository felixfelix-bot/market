# PR #1286 dedupe + spam-check — pass 121 (fleet offload, read-only)

Task: dedupe + spam-classify every issue in the parent draft review of
PlebeianApp/market PR #1286. Canonical answer remains
`artifacts/pr1286/1286-dedupe-spam-RESULT.md`; this pass re-derives it from the
tree at the SHA and confirms the key is unchanged.

## Provenance (all reads; nothing posted to GitHub)

- Authoritative draft artifact (parent task `t_31cab538`):
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — present, 3548 B,
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a` (byte-identical to the pass-21 baseline).
  Seven numbered findings: 4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`.
- PR head verified live: `gh pr view 1286 --json headRefOid` ==
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (== briefed SHA); state OPEN,
  `isDraft: true`, `mergeable: MERGEABLE`, `updatedAt 2026-09-10T11:11:01Z`,
  title "feat: nip05 cms vanity url intergration", author `hkarani`.
- Comparison set = the five prev-issues, sourced from the single prior review
  comment `#5617745226` (felixfelix-bot, 2026-09-10T11:11:01Z). `pulls/1286/reviews`
  = 0 and `pulls/1286/comments` = 0, so no `DUPLICATE-OF-UNLISTED` row is possible.
- `gh pr diff --name-only` = 14 files; exactly one test/spec
  (`src/lib/schemas/storefront.test.ts`).
- Overlap judged by root cause from the cited code at the SHA
  (`git show <SHA>:<path>`), not by title or file name.

## Sites re-read at the SHA in this pass

- `src/server/StorefrontIdentityManager.ts:73` `registryDTag: 'storefront-names'`;
  `:88` `const existing = this.registry.get(name)` (unified registry only);
  `:89` the `validUntil`/`pubkey` guard; `:5-53` `RESERVED_NAMES`.
- `src/server/EventHandler.ts:84`
  `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- `src/server/http/nip05.ts:12` unified-wins merge (prev #2 premise).
- `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67`
  `const page = parseStorefrontPage(content)`; `:76` `toast.success('Storefront page published')`.
- `src/publish/storefront-page.ts:5` re-`parse`, `:10` `kind: 30024`, `:12` `['d','storefront-page']`.
- `src/lib/schemas/storefront.ts:26` `title: z.string().trim().min(1).max(160)` (no `safeText`);
  `:77` `blocks: z.array(StorefrontBlockSchema).max(40)` (no `.min`); `:89-92` `flatMap` drop.
- `src/queries/storefront.tsx:20` `'#d': ['storefront-names']` (literal mirrored client-side).
- `src/components/storefront/StorefrontRenderer.tsx:57` static
  `{block.products.length} product references published by this seller.`; `:58` `/products`.
- `package.json:31` `test:unit` globs `contextvm src/queries/__tests__ src/lib/__tests__`
  only; `.github/workflows/ci-unit.yml` runs exactly `bun run test:unit`.
- `docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md:110-111`
  `d=${instanceNamespace}-storefront-names` resolved through ADR-018, `:114-116`
  reject a name held in either legacy registry, `:125-127` legacy managers read-only
  and reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`
  (verbatim), `:140-142` display data re-fetched/re-validated at render time,
  `:161-165` guardrail requiring a renderer-hostility unit test.
- `git ls-tree <SHA> docs/adr/` = 13 ADRs + `proposals/`, **no ADR-018** at this tip.

## Dedupe key / HALT condition

- Dedupe key = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`). **Unchanged since pass 21** — this
  pass is a repeat re-derivation; it produces no new information and does not
  change the verdict. Gate further dedupe dispatch on the key changing.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause by a different path. Prev #2 verbatim: "Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", remedy "cross-check `existing.pubkey` across both pools **before registering**/serving". D1 *is* that missing cross-check on the registration path — `:88` `this.registry.get(name)` is scoped to the unified registry only, and ADR-019:114-116 is the same requirement. Near-duplicate by root cause => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127); two pubkeys can each pay for `alice` | **DUPLICATE OF #2** — *marginal call, stated:* the mechanism differs (purchase wiring at `:84`, `purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`, vs the serving merge at `nip05.ts:12`), but the root cause and symptom prev #2 already covers are identical — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). Prev #2's remedy explicitly spans the registering path. Same-root-cause => duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so a typo silently drops blocks and a truncated page publishes behind a success toast, overwriting the previous page | **NEW** — none of the five concerns the publish-vs-render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — different root cause, different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops failed blocks (`storefront.ts:89-92` `flatMap`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)`, no `.min`), so `"type":"textt"` truncates the page, `toast.success` fires (`:76`), and the `d=storefront-page` event (`storefront-page.ts:12`) replaces the prior page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 states | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch naming an exact change: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 says `Kind 30024 (addressable, application-specific)` (verified verbatim at the SHA). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim holds is the separate code-truth worker's call; the ADR/code mismatch is actionable either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — the registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; the same literal is mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) and same *file* as prev #5 (`queries/storefront.tsx`), but a different line, function and root cause: nothing in the five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: `registryDTag: 'storefront-names'` (`:73`) and `'#d': ['storefront-names']` (`queries/storefront.tsx:20`) are hard-coded, ADR-019:110-111/161-162 forbid the literal, and no ADR-018 file exists at this tip (`git ls-tree` = 13 ADRs + proposals). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob (`package.json:31`), so CI never runs it; `StorefrontIdentityManager`, `StorefrontRenderer` and `publishStorefrontPage` have no coverage | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — the ADR-019:161-165 renderer-hostility guardrail is unenforced: this is the only test/spec in the 14-file diff (verified via `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) globs only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml` runs exactly that — so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated; a page whose coordinates are all dead still asserts "N product references published by this seller" and links to global `/products` | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, `{block.products.length} product references...`) and link to the global `/products` / `/community` instead of resolving coordinates, so the harm is a misleading count/link — no correctness, security or data-loss defect. ADR-019:140-142 states render-time re-fetch as architectural intent, and the draft's own tag is `[NIT]`. Required change (non-blocking): resolve the coordinates at render, or drop the count/link claim. *(Draft cites `:59`, the `</section>` close; count/link are `:57`-`:58` — a citation imprecision that further supports NIT.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already
  tracked as prev #2, so a maintainer gains nothing by treating them as new.
- D7 is NEW-but-NIT: the case where `X + Y = total` does not hold, because X
  counts NEW-and-ACTIONABLE only and the NIT count is on the spam axis as
  instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ... GET`
  reads plus `git show` / `git ls-tree` reads were issued; no comment, review,
  label, approval or other API write was made, and nothing was pushed.
- Dedupe key unchanged since pass 21 (see HALT condition above).

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
