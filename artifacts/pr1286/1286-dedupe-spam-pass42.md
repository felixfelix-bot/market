# PR #1286 dedupe + spam-check — pass 42 (fresh independent offload re-verification)

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues
vs 5 known prev-issues and spam-check each." Read-only vs GitHub. No push.

## Provenance and dedupe key (re-hashed live this pass)

- **Authoritative draft (parent task `t_31cab538`)**:
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — present, non-empty
  (3548 B), md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`. Seven numbered
  findings labelled D1-D7 here: 4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`.
- **PR head**: `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (re-confirmed live via
  `gh pr view 1286 --json headRefOid`).
- **Dedupe key = (draft md5, PR head OID) UNCHANGED since pass 21.** This is pass 42,
  i.e. the **22nd consecutive pass on an identical key**. By construction this pass
  carries no new information; see the HALT GATE at the bottom.
- **Comparison set = the five prev-issues**, i.e. the *only* issue comment on the PR,
  `#5617745226` by `felixfelix-bot` (2026-09-10T11:11:01Z), re-read live this pass
  (body quoted below where it decides a row). `reviews` = 0, `pulls/1286/comments` = 0
  → no `DUPLICATE-OF-UNLISTED` row is possible.
- PR: OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`. `gh pr diff --name-only`
  = 14 files; `src/lib/schemas/storefront.test.ts` is the only added test.

## Independent verification performed this pass (re-read at the SHA, not relayed)

Every cited site re-read with `git show 2ae85b6:<path>` (line-exact):

- D1 `src/server/StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`;
  `:89` compares `existing.pubkey` against **that one registry only** → the missing
  cross-pool check. `RESERVED_NAMES` (`:5-21`) still has no `terms`/`privacy` (prev #3 premise live).
- D2 `src/server/EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`
  → both legacy managers still armed as sellers.
- D3 `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` =
  `const page = parseStorefrontPage(content)` (lenient *render* parser as the publish gate);
  `:76` = `toast.success('Storefront page published')`; `src/lib/schemas/storefront.ts:89-92` =
  `flatMap` + `safeParse` dropping failed blocks then `StorefrontPageSchema.parse({version:1, blocks})`;
  `storefront.ts:77` = `blocks: z.array(StorefrontBlockSchema).max(40)` (no `.min`);
  `src/publish/storefront-page.ts:5` = `StorefrontPageSchema.parse(page)`;
  `:12` = `tags: [['d', 'storefront-page']]` (addressable event replaces the previous page).
- D4 `src/publish/storefront-page.ts:10` = `kind: 30024`; ADR-019:134 verbatim =
  `- Kind 30024 (addressable, application-specific), d=storefront-page,`.
- D5 `src/server/StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names',`;
  mirrored client-side `src/queries/storefront.tsx:20` = `'#d': ['storefront-names']`;
  ADR-019:110-111 = `d=${instanceNamespace}-storefront-names`, resolved through ADR-018
  "rather than a literal"; ADR-019:161-162 = domain comes from runtime instance config
  "(ADR-018), never a literal". `git ls-tree 2ae85b6:docs/adr/` has **no** ADR-018 file (verified).
- D6 `package.json:31` = `bun test $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...)`
  → excludes `src/lib/schemas/`; `.github/workflows/ci-unit.yml:47` = `run: bun run test:unit`;
  the only added test is under `src/lib/schemas/` → never executed.
- D7 `src/components/storefront/StorefrontRenderer.tsx`: `:57` static `{block.products.length}`
  count, `:58` global `/products` `SafeLink`, `:66` global `/community` link (draft cites `:59`,
  the `</section>` close); ADR-019:140-142 states display data is re-fetched/re-validated at
  render time.
- Prev-issue premises live at the SHA: `src/server/http/nip05.ts:12` =
  `const result = { names: { ...legacy.names, ...unified.names } }` (prev #2);
  `src/lib/schemas/storefront.ts:26` = `title: z.string().trim().min(1).max(160)` (prev #4).

## Dedupe + spam table

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to "cross-check `existing.pubkey` across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch plus a claimed specs/interop collision: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-21`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

## Notes

- The two axes are independent: D1/D2 are DUPLICATE-but-ACTIONABLE (real and worth a code
  change, but already tracked as prev #2, so a maintainer gains nothing by treating them as
  new); D7 is NEW-but-NIT. D5 shares a *file* with prev #3 yet has no root-cause or symptom
  overlap, so it is NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only
  because D7 is NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate;
  the NIT count is on the spam axis as instructed.
- Read-only vs GitHub: `gh pr view`, `gh pr diff`, and `gh api ...` GETs plus `git show` /
  `git ls-tree` / `md5sum` / `sha256sum` reads only. No comment, review, label, approval or
  other write was made. Nothing pushed.

## HALT GATE (unchanged recommendation)

The dedupe key = (draft md5 `0fc6675a…`, PR head `2ae85b6…`) has not changed since pass 21.
This pass (42) re-derived the same 7 rows from the same inputs; the canonical answer lives in
`1286-dedupe-spam-RESULT.md`. **Do not dispatch this dedupe task again until the key changes**
(new draft md5/sha256, or a new PR head OID) — the fleet has now spent ~40 worktrees and 60+
commits on an identical key. This file deliberately does not append to the 2041-line
`1286-dedupe-spam-report.md` chain.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
