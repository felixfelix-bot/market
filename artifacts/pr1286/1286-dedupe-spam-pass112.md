# PR #1286 dedupe + spam-check — pass 112 re-derivation (fleet offload, read-only)

Task: `t_be177680` (board `plebeian-pr-reviews`) — "Dedupe draft PR #1286 review
issues vs 5 known prev-issues and spam-check each."

Canonical deliverable: `artifacts/pr1286/1286-dedupe-spam-RESULT.md` (unchanged).
This file is a re-verification record for the current dispatch only; it does not
supersede RESULT.md, and `1286-dedupe-spam-HALT-ESCALATION.md` still stands.

## Dedupe key re-verified live this pass (read-only)

- Draft `PR1286-REVIEW-DRAFT.md` md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`,
  sha256 `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`,
  3548 B (`/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`) —
  byte-identical to the pass-21 baseline. Seven findings: 4 `[BLOCK]`,
  2 `[RISK]`, 1 `[NIT]`.
- PR #1286 head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, OPEN, `isDraft: true`,
  MERGEABLE, `updatedAt 2026-09-10T11:11:01Z`, author `hkarani`.
- `gh pr diff 1286 --name-only` = 14 files (verified), with exactly one test/spec:
  `src/lib/schemas/storefront.test.ts`.
- Comparison set = 1 issue comment `#5617745226` / 0 reviews / 0 review comments,
  so no `DUPLICATE-OF-UNLISTED` row is possible.

## Cited sites re-read at the SHA (`git show 2ae85b6f`)

- `src/server/StorefrontIdentityManager.ts:73` `registryDTag: 'storefront-names'`;
  `:88-89` `const existing = this.registry.get(name)` + single-registry validity
  check; `RESERVED_NAMES` `:5-53` still lacks `terms`/`privacy`.
- `src/server/http/nip05.ts:12` `{ ...legacy.names, ...unified.names }` (unified wins).
- `src/server/EventHandler.ts:84` `purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`.
- `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67`
  `const page = parseStorefrontPage(content)` (lenient); `:76` success toast.
- `src/publish/storefront-page.ts:5` `StorefrontPageSchema.parse(page)`; `:10`
  `kind: 30024`; `:12` `tags: [['d', 'storefront-page']]`.
- `src/lib/schemas/storefront.ts:26` `heroBlock.title: z.string().trim().min(1).max(160)`
  (no `safeText`); `:77` `blocks: z.array(...).max(40)` (no `.min`); `:89` `flatMap`
  drop of invalid blocks.
- `src/queries/storefront.tsx:20` `'#d': ['storefront-names']`.
- `src/components/storefront/StorefrontRenderer.tsx:57` static count, `:58` global
  `/products`, `:66` global `/community` (draft cites `:59`, the `</section>` close).
- `package.json:31` `test:unit` glob = `contextvm src/queries/__tests__ src/lib/__tests__`;
  `.github/workflows/ci-unit.yml:47` `bun run test:unit`.
- `docs/adr/ADR-019-...md` present (332 lines); the cited ADR lines verify at
  `:110-111` (namespaced `d` via ADR-018), `:114-116` (reject names held in either
  legacy registry), `:124-126` (legacy managers read-only, reject new receipts),
  `:133` (the "Kind 30024 (addressable, application-specific)" claim the draft cites
  as `:134`), `:140-142` (render-time re-fetch), `:161-162` (no literals),
  `:163-165` (hostile-page renderer test). No ADR-018 file exists at this tip.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 is the legacy/unified merge-shadowing gap whose stated remedy is to cross-check `existing.pubkey` "across both pools before registering/serving"; D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`), and the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:124-126) | **DUPLICATE OF #2** — marginal call stated explicitly: the mechanism differs (sale wiring vs the serving merge) but the root cause and symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice`. `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the *registering* path. Restricting prev #2 to `nip05.ts:12` alone would make D2 NEW, but the task rule counts same-root-cause / same-symptom as duplicate. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:124-126). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — no prev issue touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — different root cause, different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min` at `:77`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch plus a claimed interop collision: the published kind is hard-coded `30024` (`:10`) while ADR-019 states "Kind `30024` (addressable, application-specific)" (verified verbatim; the draft cites `:134`, the line is `:133` — a one-line citation offset). Required change: use a free addressable `3xxxx` kind for the storefront page and correct the ADR line. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and `:161-162` forbids literals, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. (Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.) |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already
  tracked as prev #2, so a maintainer gains nothing by treating them as new.
  D7 is NEW-but-NIT.
- Buckets partition all seven: `X + Y = 6` (not 7) only because D7 is NEW-but-NIT —
  the third axis the task's `X+Y = total` shortcut does not anticipate; the NIT
  count follows the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `git show` reads were
  issued. No comment, review, label, approval, or other write was made. Nothing was
  pushed. No kanban mutation was made.
- **HALT stands: gate any further dedupe dispatch on the key changing** (new draft
  md5 or new PR head). The key has been constant since pass 21; this pass is 112. Read
  `1286-dedupe-spam-RESULT.md` rather than appending to the chain.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
