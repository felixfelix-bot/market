# PR #1286 dedupe + spam-check — pass 80 (fleet offload)

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
Repo: PlebeianApp/market. PR #1286, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
(re-confirmed live this pass: OPEN, `isDraft=true`, MERGEABLE, base `auctions`,
head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`).
Read-only: `gh` GET + `git show`/`git ls-tree` only. No GitHub write, no push.

## Provenance and dedupe key

- Authoritative draft (parent task artifact): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  — present, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`. Seven findings,
  4 `[BLOCK]` / 2 `[RISK]` / 1 `[NIT]`, labelled D1-D7 below.
- Dedupe key = (draft md5 `0fc6675a…`, PR head `2ae85b6f…`) — **unchanged since pass 21**.
  This pass is an independent re-derivation, not a new finding; it reproduces the same result.
- Comparison set (the five prev-issues) = the *only* issue comment on the PR,
  `#5617745226` by `felixfelix-bot` (2026-09-10T11:11:01Z), re-read verbatim this pass.
  Live counts: reviews = 0, review comments = 0, issue comments = 1, so no
  `DUPLICATE-OF-UNLISTED` row is possible.
  1. `src/routes/$vanityName.tsx` — storefront names never resolve (route reads only the
     `d=vanity-urls` / `useVanitySync` pool; `resolveVanity` at `:21`).
  2. `src/server/http/nip05.ts:11-13` — legacy/unified merge shadowing; both managers
     validate independently, each sees only its own registry -> one name assignable to two
     pubkeys. Remedy verbatim: "Unify on one registry or cross-check `existing.pubkey`
     across both pools before **registering**/serving."
  3. `src/server/StorefrontIdentityManager.ts:5-53` — reserved list drops `terms`/`privacy`.
  4. `src/lib/schemas/storefront.ts:26` — `heroBlock.title` skips `safeText`.
  5. `src/queries/storefront.tsx:39-56` — `fetchStorefrontPage` applies no `validUntil`
     expiry gate.
- The draft under review does **not** re-raise prev #1, so no D-item can overlap it.

## Live evidence re-read at the SHA (not the working tree)

- D1 `StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`; the only
  validity check is `:89` (`existing.pubkey !== pubkey && existing.validUntil > now`) against
  that ONE registry. `RESERVED_NAMES` at `:5-53` still lacks `terms`/`privacy` (prev #3 premise live).
- D2 `EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- D3 `dashboard/account/storefront.tsx:67` = `const page = parseStorefrontPage(content)` (lenient
  render parser) feeding `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`);
  `storefront.ts:89-92` drops failed blocks via `flatMap` + `safeParse`; `storefront.ts:77` =
  `blocks: z.array(...).max(40)` with no `.min`; success toast at `storefront.tsx:76`;
  `storefront-page.ts:12` = `tags: [['d', 'storefront-page']]` -> the new event replaces the old.
- D4 `publish/storefront-page.ts:10` = `kind: 30024`; ADR-019:134 verbatim =
  `Kind \`30024\` (addressable, application-specific)`.
- D5 `StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`, mirrored client-side
  at `queries/storefront.tsx:20` = `'#d': ['storefront-names']`. ADR-019:109-110 requires
  `d=${instanceNamespace}-storefront-names` resolved through ADR-018 rather than a literal;
  ADR-019:161-162 forbids literals for the instance domain. `git ls-tree $SHA:docs/adr/`
  contains **no** ADR-018 file (verified).
- D6 `package.json:31` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ ...`
  (excludes `src/lib/schemas/`); `.github/workflows/ci-unit.yml:47` runs `bun run test:unit`;
  `src/lib/schemas/storefront.test.ts` is the only `*.test.ts` in the 14-file diff
  (`gh pr diff --name-only` verified), so it never executes. ADR-019:163-165's hostile-page
  renderer test is unmet.
- D7 `StorefrontRenderer.tsx`: static count at `:57` (`{block.products.length} product references
  published by this seller.`), global `/products` SafeLink at `:58`, `/community` at `:66`
  (draft cites `:59`, the `</section>` close). ADR-019:140-142 = display data re-fetched and
  re-validated at render time.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** [BLOCK] `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy verbatim says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: reject a name held by a different pubkey in *either* legacy registry inside `validateRegistration`. *Already tracked as prev #2.* |
| **D2** [BLOCK] `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns | **DUPLICATE OF #2** — *marginal call, stated:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path; ADR-019:123-127 is that requirement. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause / same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts (ADR-019:123-127). *Already tracked as prev #2.* |
| **D3** [BLOCK] `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region (same file, different line and concern); prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** [BLOCK] `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** [RISK] `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:109-110 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** [RISK] `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** [NIT] `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is [NIT]. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as
  prev #2, so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause
  or symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because
  D7 is NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT
  count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, `gh api ...` GET reads and
  `git show`/`git ls-tree` reads were issued; no comment, review, label, approval, or other
  write was made. Nothing was pushed.
- **HALT stands:** the dedupe key has been constant since pass 21 (this is pass 80). A further
  dispatch cannot produce new information until the draft md5 or the PR head changes. Read
  `artifacts/pr1286/1286-dedupe-spam-RESULT.md` rather than appending to the chain again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
