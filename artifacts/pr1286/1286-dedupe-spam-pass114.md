# PR #1286 dedupe + spam-check — pass 114 independent re-derivation (fleet offload, read-only)

Task: `plebeian-pr-reviews:t_be177680` (env board `fork-pr-steward`) — "Dedupe draft
PR #1286 review issues vs 5 known prev-issues and spam-check each."

Canonical deliverable (unchanged, still authoritative): `artifacts/pr1286/1286-dedupe-spam-RESULT.md`.
`1286-dedupe-spam-HALT-ESCALATION.md` still stands. This file is a re-verification
record for the current dispatch only; it does not supersede RESULT.md.

## Inputs re-verified live this pass (read-only: gh GET + git show only)

- Parent-task draft `PR1286-REVIEW-DRAFT.md`
  (`/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`): present, 3548 B,
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba` —
  byte-identical to the pass-21 baseline. Seven numbered findings: 4 `[BLOCK]`,
  2 `[RISK]`, 1 `[NIT]`.
- PR #1286 (PlebeianApp/market): OPEN, `isDraft: true`, MERGEABLE, base `auctions`,
  head `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, headRefOid
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, `updatedAt 2026-09-10T11:11:01Z`.
  Commit object present locally (`git cat-file -t` = commit).
- Comparison set = 1 issue comment (`#5617745226`, felixfelix-bot,
  2026-09-10T11:11:01Z), 0 reviews, 0 review comments — body re-read verbatim, it
  carries exactly the five prev-issues. No unlisted source exists, so no
  `DUPLICATE-OF-UNLISTED` row is possible.
- `gh pr diff 1286 --name-only` = 14 files; the only test/spec is
  `src/lib/schemas/storefront.test.ts`.

## Cited sites re-read at the SHA (`git show 2ae85b6f:<path>`)

- D1 `StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`;
  `:89` compares `existing.validUntil`/`existing.pubkey` against that one registry
  only. `RESERVED_NAMES` opens at `:5`; `grep -iE 'terms|privacy'` over `:1-55`
  returns nothing (prev #3 premise live).
- D2 `EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- D3 `dashboard/account/storefront.tsx:67` = `const page = parseStorefrontPage(content)`;
  `:76` success toast. `storefront.ts:77` = `blocks: z.array(StorefrontBlockSchema).max(40)`
  (no `.min`); `:89` `flatMap` drops blocks that fail `safeParse`. `publish/storefront-page.ts:5`
  = `StorefrontPageSchema.parse(page)`; `:12` = `tags: [['d', 'storefront-page']]`
  (new event replaces the old).
- D4 `publish/storefront-page.ts:10` = `kind: 30024`. ADR-019:134 verbatim
  (verified on the raw file) = `Kind \`30024\` (addressable, application-specific)` —
  the draft's `:134` citation is exact.
- D5 `StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`, mirrored
  client-side at `queries/storefront.tsx:20` = `'#d': ['storefront-names']`.
  ADR-019:110-111 requires `d=${instanceNamespace}-storefront-names` resolved through
  ADR-018 rather than a literal; ADR-019:161-162 forbids a literal domain.
  `git ls-tree $SHA:docs/adr/ | grep -c 018` = **0** — no ADR-018 file at this tip.
- D6 `package.json:31` `test:unit` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ ...`
  (excludes `src/lib/schemas/`); `.github/workflows/ci-unit.yml:47` runs `bun run test:unit`.
  `src/lib/schemas/storefront.test.ts` is the only test/spec in the 14-file diff, so it
  never executes. ADR-019:163's hostile-page renderer unit test is unmet.
- D7 `StorefrontRenderer.tsx:57` = `{block.products.length} product references published by this seller.`
  (static count); `:58` = `<SafeLink href="/products">`; `:66` = `<SafeLink href="/community">`.
  Draft cites `:59`, the `</section>` close.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism verbatim ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — marginal call stated explicitly: the mechanism differs (sale wiring vs the serving merge) but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to `nip05.ts:12` alone would make D2 NEW, but the task rule counts same-root-cause / same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — no prev issue touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min` at `:77`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch plus a claimed interop collision: the published kind is hard-coded `30024` (`:10`) while ADR-019 states `Kind 30024 (addressable, application-specific)` (verified verbatim at `:134`). Required change: use a free addressable `3xxxx` kind for the storefront page and correct the ADR line. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and `:161-162` forbids literals, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified: `grep -c 018` = 0). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already
  tracked as prev #2, so a maintainer gains nothing by treating them as new.
  D7 is NEW-but-NIT. The two axes were classified independently; neither leaked.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7,
  only because D7 is NEW-but-NIT — the combination the task's `X+Y = total`
  shortcut does not anticipate; the NIT count follows the spam axis as instructed.
- ADR-019 line fidelity: the draft's `:134` citation for the `Kind 30024` line is
  exact on the raw file at this SHA (re-checked with `grep -n` over `git show`).
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, `gh api ... GET`, and
  `git show` / `git ls-tree` reads were issued. No comment, review, label, approval,
  or other write was made. Nothing was pushed. No kanban mutation was made.
- **HALT stands: gate any further dedupe dispatch on the key changing** (new draft
  md5 or new PR head). The key has been constant since pass 21; this pass is 114.
  Read `1286-dedupe-spam-RESULT.md` rather than appending to the chain.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
