# PR #1286 dedupe + spam-check — pass 38 (independent re-verification)

Dispatch: worker-heavy/1286-dedupe-spam-f7 ("Dedupe draft PR #1286 review issues vs 5
known prev-issues and spam-check each"). Read-only. No GitHub write.

## Inputs (re-read this pass, not relayed)

- Authoritative draft: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  — PRESENT, 3548 B, 7 numbered findings (D1-D7): 4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`.
- Dedupe key = draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`,
  PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`. All three **unchanged** since
  pass 21 — so this pass reproduces the same classification; no new information exists.
- PR #1286: OPEN, isDraft true, MERGEABLE, base `auctions`, head
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`.
- Comparison set = the previously published review round = the *only* issue comment
  `#5617745226` by `felixfelix-bot` (2026-09-10T11:11:01Z, 2668 B). Reviews = 0,
  review comments = 0 => no `DUPLICATE-OF-UNLISTED` row is possible.
- Prev-issue 1 `$vanityName.tsx`, 2 `nip05.ts:11-13`, 3
  `StorefrontIdentityManager.ts:5-53`, 4 `storefront.ts:26`, 5 `queries/storefront.tsx`
  (no `validUntil` gate) — all five found verbatim in `#5617745226`.

## Citations re-checked at 2ae85b6 (git show / git ls-tree, read-only)

- D1 `StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`
  (validity checked at `:89` against that one registry only).
- D2 `EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- D3 `dashboard/account/storefront.tsx:67` = `const page = parseStorefrontPage(content)`;
  `storefront.ts:89-92` drops invalid blocks via `flatMap`; `storefront.ts:77` =
  `blocks: z.array(...).max(40)` (no `.min`); `publish/storefront-page.ts:5` =
  `StorefrontPageSchema.parse(page)`; `:12` = `tags: [['d', 'storefront-page']]`.
- D4 `publish/storefront-page.ts:10` = `kind: 30024`; ADR-019:134 verbatim =
  "Kind `30024` (addressable, application-specific)".
- D5 `StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`; mirrored at
  `queries/storefront.tsx:20` = `'#d': ['storefront-names']`; ADR-019:110-111 requires
  `d=${instanceNamespace}-storefront-names` via ADR-018; `git ls-tree $SHA:docs/adr/`
  contains **no** ADR-018 file.
- D6 `package.json:31` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ ...`
  (excludes `src/lib/schemas/`); `.github/workflows/ci-unit.yml:47` runs `bun run test:unit`;
  `src/lib/schemas/storefront.test.ts` is the only test in the 14-file diff and tests
  `parseStorefrontPage`'s drop behaviour, so it never runs under CI.
- D7 `StorefrontRenderer.tsx:57` static `{block.products.length}`, `:58` `/products`,
  `:66` `/community` (draft cites `:59`, the `</section>` close).
- Prev-issue premises live at the SHA: `nip05.ts:12` = `{ ...legacy.names, ...unified.names }`;
  `RESERVED_NAMES` (`:5-53`) still lacks `terms`/`privacy`.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("both managers validate independently and each only sees its own registry") and its remedy says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 is that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** *(marginal call, stated)* — the mechanism differs (sale wiring vs serving merge) but the root cause and symptom prev #2 covers are the same: the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. Same-root-cause / same-symptom counts as duplicate per the task rule. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`) and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch (plus a claimed specs/interop collision): the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it "Kind `30024` (addressable, application-specific)" (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` via ADR-018 and ADR-019:161-162 forbids literals, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip. Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real, worth a code change, but already tracked as
  prev #2, so treating them as new adds nothing. D7 is NEW-but-NIT.
- Both axes are independent: D5 shares a *file* with prev #3 yet no root cause, so NEW;
  D3 shares no file with any prev issue, so NEW.
- Counting: buckets partition all seven (4 + 2 + 1 = 7). The task's `X + Y = total`
  shortcut assumes no NEW-but-NIT; D7 is exactly that case, so X + Y = 6 while the
  NIT count sits on the spam axis as instructed.
- Read-only: only `gh pr view`, `gh pr diff`, `gh api ...` GETs and `git show` /
  `git ls-tree` reads were issued. No comment, review, label, approval or other write.
  Nothing pushed.
- **HALT stands** (unchanged since pass 21): gate any further dedupe dispatch on the key
  changing (new draft md5/sha256 or new PR head). Consult
  `artifacts/pr1286/1286-dedupe-spam-RESULT.md`; do not append to the loop chain.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
