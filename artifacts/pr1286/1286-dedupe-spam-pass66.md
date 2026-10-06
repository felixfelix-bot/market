# Dedupe + spam-check — draft review of PlebeianApp/market PR #1286 — pass 66

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
PR: PlebeianApp/market #1286, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`.
Read-only: `gh pr view` / `gh pr diff` / `gh api ...` GET plus `git show` / `git ls-tree` only.
No comment, review, label, approval or other GitHub write was made. Nothing was pushed.

## Provenance (re-confirmed live this pass)

- **Authoritative draft** (parent task `t_31cab538`):
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — present, non-empty, 3548 B.
  Seven numbered findings (labelled D1-D7 here): 4 `[BLOCK]` / 2 `[RISK]` / 1 `[NIT]`.
- **Dedupe key** = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`,
  sha256 `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`,
  PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) — **unchanged since pass 21** (this is pass 66).
- **Reviewed PR** live: OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, `updatedAt` 2026-09-10T11:11:01Z,
  `headRefOid` = the key's head SHA (verified).
- **Comparison set** (the five prev-issues) = the previously published review round: the *only*
  issue comment, `#5617745226` by `felixfelix-bot` (2026-09-10T11:11:01Z), re-read live in full.
  `reviews` = `[]` and review comments = 0, so no `DUPLICATE-OF-UNLISTED` row is possible.
  Its five findings: (1) `$vanityName.tsx` storefront names never resolve; (2) `nip05.ts:11-13`
  merge shadowing / independent per-registry validation; (3) `StorefrontIdentityManager.ts:5-53`
  reserved list drops `terms`/`privacy`; (4) `storefront.ts:26` `heroBlock.title` skips `safeText`;
  (5) `queries/storefront.tsx` no `validUntil` expiry gate.

## Method

- **Novelty** is judged by *root cause*, not title or file name: identical file+line, the same root
  cause reached by a different path, or the same symptom already covered => DUPLICATE. Every
  duplicate call names the prev-issue number.
- **Spam check** is judged independently of the draft's own `[SEVERITY]` tag: ACTIONABLE only if
  concrete and accurate enough to drive a code change (real bug / security hole /
  data-loss-correctness risk / spec violation), else NIT.
- The underlying *truth* of each bug is **not** judged here — that is the separate code-truth worker.

## Evidence re-read at the SHA (not the working tree)

Every citation in the draft was independently re-resolved at `2ae85b6` this pass:

- D1 `git show $SHA:src/server/StorefrontIdentityManager.ts | sed -n 80,94p` → `:88` =
  `const existing = this.registry.get(name)`; `:89` validates against that one registry only.
  `RESERVED_NAMES` at `:5` still lacks `terms`/`privacy` (prev #3 premise live).
  ADR-019:115 verbatim requires rejecting a name "currently held in either legacy registry by a
  different pubkey".
- D2 `src/server/EventHandler.ts` `:84` =
  `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
  ADR-019:127 verbatim: the legacy managers must "reject new zap receipts".
- D3 `src/routes/_dashboard-layout/dashboard/account/storefront.tsx` `:67` =
  `const page = parseStorefrontPage(content)`, success toast at `:76`;
  `src/lib/schemas/storefront.ts:89` = the `flatMap` drop (`return parsed.success ? [parsed.data] : []`),
  `:77` = `blocks: z.array(StorefrontBlockSchema).max(40)` (no `.min`);
  `src/publish/storefront-page.ts:5` = `StorefrontPageSchema.parse(page)`,
  `:12` = `tags: [['d', 'storefront-page']]` (new event replaces old).
- D4 `src/publish/storefront-page.ts:10` = `kind: 30024`; ADR-019:134 verbatim =
  `- Kind 30024 (addressable, application-specific), d=storefront-page,`.
- D5 `src/server/StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`, mirrored
  client-side at `src/queries/storefront.tsx:20` = `'#d': ['storefront-names']`.
  ADR-019:110-111 requires `d=${instanceNamespace}-storefront-names` "resolved through ADR-018's
  instance config rather than a literal"; ADR-019:162 repeats "never a literal".
  `git ls-tree --name-only $SHA:docs/adr/` (verified) lists ADR-0001..0009, ADR-013..016, ADR-019 —
  **no ADR-018 file** at this tip. Note the ADR's real path here is
  `docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md` (332 lines).
- D6 `package.json:31` `test:unit` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ ...`
  (excludes `src/lib/schemas/`); `gh pr diff --name-only` shows `src/lib/schemas/storefront.test.ts`
  is the **only** test/spec file among the 14 changed files, so it never executes;
  `.github/workflows/ci-unit.yml:47` runs exactly `bun run test:unit`. ADR-019:163 is the
  renderer-hostility unit test.
- D7 `src/components/storefront/StorefrontRenderer.tsx`: static count at `:57`
  (`{block.products.length} product references published by this seller.`), global `/products`
  `SafeLink` at `:58`, `/community` at `:66`; the draft cites `:59`, the `</section>` close of the
  same block. ADR-019:141 is the render-time re-fetch intent.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:115 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause / same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region, not the same schema gap; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch plus a claimed specs/interop collision: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:141 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already
  tracked as prev #2, so a maintainer gains nothing by treating them as new.
  D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no
  root cause or symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7,
  only because D7 is NEW-but-NIT — the case the task's `X+Y = total` shortcut does not
  anticipate; the NIT count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff` GET reads plus `git show` /
  `git ls-tree` reads were issued; no comment, review, label, approval, or other write
  was made. Nothing was pushed.
- **HALT stands: gate any further dedupe dispatch on the key changing** (new draft
  md5 or new PR head). The key has been constant since pass 21 (this is pass 66), so a
  further dispatch cannot produce new information. Read
  `artifacts/pr1286/1286-dedupe-spam-RESULT.md` rather than appending to the chain.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
