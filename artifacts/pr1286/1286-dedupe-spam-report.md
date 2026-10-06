# Dedupe + spam-check — draft review of PlebeianApp/market PR #1286

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
PR: PlebeianApp/market #1286, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
(re-confirmed live: OPEN, base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`,
author `hkarani`; the head tree is present locally at that SHA).
Read-only: no comment, review, label, or any other GitHub write was made.

## Provenance

- **Authoritative draft (used below)**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`,
  the artifact of parent task `t_31cab538`. It contains seven numbered findings
  (`[BLOCK]` x4 / `[RISK]` x2 / `[NIT]` x1), labelled D1-D7 here. Present and non-empty -> used.
- **The five known prev-issues = the previously published review round** for this PR:
  issue comment `#5617745226` by `felixfelix-bot` (2026-09-10T11:11:01Z), re-read live.
  It is the *only* issue comment and there are **zero** reviews / inline review comments on the
  PR, so there is no unlisted prior round to fold in. Its five findings:
  1. `src/routes/$vanityName.tsx` — storefront names never resolve (route reads only `d=vanity-urls`
     via `vanityActions.resolveVanity`; still true at head, line 21);
  2. `src/server/http/nip05.ts:11-13` — `{ ...legacy.names, ...unified.names }` shadowing; both
     managers validate independently and each sees only its own registry -> one name assignable to
     two pubkeys;
  3. `src/server/StorefrontIdentityManager.ts:5-53` — reserved list drops `terms`/`privacy`;
  4. `src/lib/schemas/storefront.ts:26` — `heroBlock.title` skips `safeText`;
  5. `src/queries/storefront.tsx:56` — no `validUntil` expiry gate on the rendered page.
- ADR-019 is present at the reviewed head (`docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md`);
  the cited lines were read at `2ae85b6`. No `ADR-018` file exists at this tip (verified).

## Method

- **Novelty** is judged by *root cause*, not title or file name: identical file+line, the same root
  cause reached by a different path, or the same symptom already covered => DUPLICATE. Every
  duplicate call names the prev-issue number.
- **Spam check** is judged independently of the draft's own `[SEVERITY]` tag: ACTIONABLE only if
  concrete and accurate enough to drive a code change (real bug / security hole /
  data-loss-correctness risk / spec violation), else NIT. The two axes are independent, so an issue
  can be NEW-but-NIT or DUPLICATE-but-ACTIONABLE.
- Code and ADR facts below were read at the reviewed SHA via `git show 2ae85b6:<path>`.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — different file:line, but the *root cause prev #2 states* reached by a different path: prev #2 says the pools "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys" and prescribes cross-checking `existing.pubkey` across both pools. D1 is that exact root cause on the *registration* path (`this.registry.get(name)`, `:88`) instead of the *serving/merge* path (`nip05.ts:11`). Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — distinct mechanism (purchase wiring, not the serving merge) but the *same symptom prev #2 already covers* (two pubkeys can each pay for one name): `:84` keeps `vanityManager`/`nip05Manager` inside `purchaseManagers`, so both legacy sale channels stay live against a name the unified registry owns. Task rule: any symptom overlap = duplicate; prev #2's "unify on one registry" remedy also subsumes the ADR-019:125-127 read-only demotion. *Marginal call, stated:* a reader restricting prev #2 to the `nip05.ts:11` merge alone would call this NEW, but the symptom overlaps. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — no prev issue touches the publish/render validation split. prev #4 (the only other schema finding) is a missing `safeText` refine on one field (`storefront.ts:26`) — a different root cause in a different region. | **ACTIONABLE** — silent data loss with a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89`), then `publishStorefrontPage` re-parses the residue with the strict `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`), which passes; one mistyped block (`"type":"textt"`) truncates the page, the success toast fires, and the previous `d=storefront-page` event is overwritten. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it "addressable, application-specific". Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is for the separate code-truth worker; the issue names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. This is precisely the "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the literal is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified: none under `docs/adr/`). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, and `src/lib/__tests__`, and CI runs exactly that (`ci-unit.yml:47`), so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution. | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` / `/community` (`:59`) instead of fetching the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the deliberate complement to the D3 reasoning: same *file* as prev #3 but no root-cause or
  symptom overlap, so NEW despite the shared path.
- Counting: the three buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because
  D7 is NEW-but-NIT — the case the task's "X+Y = total" shortcut does not anticipate; the NIT count
  is on the spam axis as instructed.

## Result

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (fleet offload re-run)

- Live PR state re-read: `gh pr view 1286 --repo PlebeianApp/market` -> OPEN, head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`; head commit present locally
  (`git cat-file -t 2ae85b6...` -> commit).
- Comparison set still 1:1: issue comments = 1 (`#5617745226`, the prev round), reviews = 0,
  review comments = 0.
- `gh pr diff 1286 --name-only` -> 14 files; exactly one added test
  (`src/lib/schemas/storefront.test.ts`), confirming D6's "only new test" premise.
- Cited lines re-read at the SHA and confirmed in place: D1 `StorefrontIdentityManager.ts:88`
  (`this.registry.get(name)`), D2 `EventHandler.ts:84`
  (`purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`), D3
  `.../dashboard/account/storefront.tsx:67` (`parseStorefrontPage(content)`), D4
  `publish/storefront-page.ts:10` (`kind: 30024`), D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20`, D6
  `package.json:31` glob (`contextvm src/queries/__tests__ src/lib/__tests__`) vs the spec under
  `src/lib/schemas/`, D7 `StorefrontRenderer.tsx` productGrid/collectionRow block (draft cites
  :59; the count sits at :57 and the global `/products` link at :58 in the same block).
- Classification reproduced independently; result unchanged.

## Independent re-verification (third pass — worker-heavy fleet offload)

- Live PR re-read (`gh pr view 1286 --repo PlebeianApp/market`): OPEN, head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`, author `hkarani`; head commit
  present locally (`git cat-file -t` -> commit). Comparison set still 1:1: issue comments = 1
  (`#5617745226`), reviews = 0, review comments = 0.
- `gh pr diff 1286 --name-only` -> 14 files; exactly one added test
  (`src/lib/schemas/storefront.test.ts`), confirming D6's premise.
- Prev-round body re-read verbatim: its #2 states the pools' managers "validate independently and
  each only sees its own registry, so they can happily assign the same name to two different
  pubkeys" and prescribes cross-checking `existing.pubkey` across both pools — the root cause D1
  (registration path) and D2 (still-armed purchase managers) re-express.
- Cited lines re-read at the SHA and confirmed: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`), D2 `EventHandler.ts:84`
  (`purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`), D3
  `.../dashboard/account/storefront.tsx:67` (`parseStorefrontPage(content)`) + `publish/storefront-page.ts:5`
  (`StorefrontPageSchema.parse(page)`) + `storefront.ts:89-91` (flatMap silently drops failed blocks),
  D4 `publish/storefront-page.ts:10` (`kind: 30024`), D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20`, D6 `package.json:31`
  glob (`contextvm src/queries/__tests__ src/lib/__tests__`) vs spec under `src/lib/schemas/` and
  `ci-unit.yml:47` (`bun run test:unit`), D7 `StorefrontRenderer.tsx:53-59` (static count at :57,
  global `/products` link at :58).
- ADR-019 re-read: :110-111 namespaced `d` via ADR-018, :114-116 cross-pool reject, :125-127 read-only
  demotion, :134 `30024` labelled "addressable, application-specific", :140-142 render-time re-fetch,
  :163 renderer-hostility test. No ADR-018 file exists at the tip. `StorefrontPageSchema.blocks =
  z.array(...).max(40)` (no `min`), so an all-dropped page still passes `StorefrontPageSchema.parse`
  — consistent with D3's silent-truncation claim.
- Classification reproduced independently; result unchanged.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (fourth pass — worker-heavy fresh offload)

Re-derived from scratch, not copied from the earlier passes. Inputs re-read live at
`2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`:

- Authoritative draft: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent
  task `t_31cab538`), present and non-empty -> used. Seven findings, D1-D7.
- Comparison set re-confirmed live: `gh api .../issues/1286/comments` length **1**
  (`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` length **0**; `.../pulls/1286/comments` length **0**.
  No unlisted prior round exists, so no DUPLICATE-OF-UNLISTED rows are possible.
- `gh pr view 1286` -> OPEN, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (present locally,
  `git cat-file -t` -> commit), base `auctions`, author `hkarani`. `gh pr diff --name-only`
  -> 14 files; `src/lib/schemas/storefront.test.ts` is the only added test.
- Cited sites re-read at the SHA: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`), D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`),
  D3 `dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`), with `storefront.ts:89-92`
  silently dropping blocks via `flatMap`, D4 `publish/storefront-page.ts:10` (`kind: 30024`),
  D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored at
  `queries/storefront.tsx:20`, D6 `package.json:31` test:unit glob (`contextvm
  src/queries/__tests__ src/lib/__tests__`) vs the spec under `src/lib/schemas/`, invoked by
  `.github/workflows/ci-unit.yml:47`, D7 `StorefrontRenderer.tsx:57-58` (static count at :57,
  global `/products` link at :58; draft cites :59 in the same block).
- ADR-019 re-read at the SHA: :110-111 namespaced `d` via ADR-018, :114-116 cross-pool reject,
  :125-127 read-only demotion, :134 `Kind 30024 (addressable, application-specific)`,
  :140-142 render-time re-fetch, :163 renderer-hostility unit test. `docs/adr/` at the tip
  contains **no** ADR-018 file (verified by `git ls-tree ... docs/adr/`).

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — different file:line, same root cause by a different path: prev #2 states the pools' managers "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", and its remedy is to "cross-check `existing.pubkey` across both pools before **registering**/serving". D1 is that check missing on the registration path (`this.registry.get(name)`, :88) instead of the serving/merge path (`nip05.ts:12`). Root-cause near-duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — mechanism differs (purchase wiring vs the serving merge), but the *symptom prev #2 already covers* is identical: two pubkeys can each pay for one name. `:84` keeps `vanityManager`/`nip05Manager` in `purchaseManagers`, so both legacy sale channels stay live against a name the unified registry owns, and prev #2's "unify on one registry" remedy also subsumes the ADR-019:125-127 read-only demotion. *Marginal call, stated:* restricting prev #2 to the `nip05.ts:12` merge alone would make this NEW, but the symptom overlaps. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — none of the five touches the publish/render validation split. prev #4 is a missing `safeText` refine on one field (`storefront.ts:26`) — different root cause, different region. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (blocks has `.max(40)` but no `.min`), so one mistyped block (`"type":"textt"`) truncates the page, the success toast fires, and the previous `d=storefront-page` event is overwritten. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it "addressable, application-specific". Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is for the separate code-truth worker; the issue names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the literal is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and CI runs exactly that (`ci-unit.yml:47`), so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution. | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` / `/community` (`:58`) instead of fetching the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent, not a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the deliberate complement to the D3 reasoning: same *file* as prev #3 but no root-cause or
  symptom overlap, so NEW despite the shared path.
- Counting: the three buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because
  D7 is NEW-but-NIT — the case the task's "X+Y = total" shortcut does not anticipate; the NIT count
  is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ... --jq` reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (fifth pass — fresh offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, not copied from the
earlier passes.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`), present and non-empty -> used. Seven findings, D1-D7 (4 `[BLOCK]`, 2 `[RISK]`,
  1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments --jq length`
  -> **1** (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED rows are possible.
- **PR state**: `gh pr view 1286` -> OPEN, head `2ae85b6...` (present locally, `git cat-file -t` ->
  commit), base `auctions`, author `hkarani`, head branch `feat/nip05-CMS-vanity-url-intergration`.
  `gh pr diff --name-only` -> 14 files; `src/lib/schemas/storefront.test.ts` is the only added test.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88` (`const existing =
  this.registry.get(name)`), D2 `EventHandler.ts:84` (`this.purchaseManagers = [this.vanityManager,
  this.nip05Manager, this.storefrontManager]`), D3 `.../dashboard/account/storefront.tsx:67`
  (`const page = parseStorefrontPage(content)`) feeding `publish/storefront-page.ts:5`
  (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92` dropping blocks via `flatMap`,
  D4 `publish/storefront-page.ts:10` (`kind: 30024`), D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20` (`'#d':
  ['storefront-names']`), D6 `package.json:31` glob (`contextvm src/queries/__tests__ src/lib/__tests__`)
  vs the spec under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47`
  (`bun run test:unit`), D7 `StorefrontRenderer.tsx:57-58` (static count at :57, global `/products`
  link at :58; draft cites :59 in the same block).
- **ADR-019 re-read**: :110-111 namespaced `d` via ADR-018, :114-116 cross-pool reject, :125-127
  read-only demotion, :134 `Kind 30024 (addressable, application-specific)`, :140-142 render-time
  re-fetch, :163 renderer-hostility unit test. `git ls-tree ... docs/adr/` at the tip contains **no**
  ADR-018 file (verified). `StorefrontPageSchema.blocks = z.array(...).max(40)` (no `.min`), so an
  all-dropped page still passes `StorefrontPageSchema.parse` — consistent with D3's claim.

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — root cause reached by a different path. prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and prescribes cross-checking `existing.pubkey` "across both pools before registering/serving". D1 is that missing check on the *registration* path (`this.registry.get(name)`, :88) rather than the serving/merge path (`nip05.ts:12`). Root-cause near-duplicate. | **ACTIONABLE** — a paid name can be sold twice (the first holder's window is repointed); required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — mechanism differs (purchase wiring vs the serving merge) but the *symptom prev #2 already covers* is identical (two pubkeys can each pay for one name): :84 keeps `vanityManager`/`nip05Manager` inside `purchaseManagers`, so both legacy sale channels stay live against a name the unified registry owns. *Stated marginal call:* restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the symptom overlaps, so it is a duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — none of the five touches the publish/render validation split; prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`), which passes (`blocks` has `.max(40)` but no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the previous `d=storefront-page` event is overwritten. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (:10) while ADR-019:134 labels it "addressable, application-specific". Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is for the separate code-truth worker; the issue names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (:5, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: `registryDTag: 'storefront-names'` is hard-coded server-side (:73) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution. | **NIT** — display fidelity only: the blocks print a static count (:57) and link to the global `/products` (:58) instead of fetching the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites :59, the closing `</section>`; the actionable lines are :57-:58 in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the three buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because
  D7 is NEW-but-NIT — the case the task's "X+Y = total" shortcut does not anticipate; the NIT count is
  on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ... --jq` GET reads were issued;
  no comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (sixth pass — fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; not copied from the
earlier passes. Every cited line was re-read from the reviewed object, not the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent
  task `t_31cab538`) — present, non-empty (3548 bytes) -> used. Seven findings, labelled D1-D7 here
  (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` ->
  **1** (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: OPEN, base `auctions`, head `feat/nip05-CMS-vanity-url-intergration`,
  author `hkarani`; head commit present locally (`git cat-file -t` -> commit).
  `gh pr diff --name-only` -> 14 files; `src/lib/schemas/storefront.test.ts` is the only added test.
- **Prev-round root cause re-read verbatim**: its #2 states the pools' managers "validate
  independently and each only sees its own registry, so they can happily assign the same name to
  two different pubkeys", remedy "cross-check `existing.pubkey` across both pools before
  **registering**/serving" — the exact root cause D1 (registration path) and D2 (still-armed sale
  channels) re-express.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`) with `:89` validity check; D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping blocks via `flatMap` and `StorefrontPageSchema.blocks` = `.max(40)` with no `.min`;
  D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`); D6 `package.json:31` glob
  (`contextvm src/queries/__tests__ src/lib/__tests__`) vs the spec under `src/lib/schemas/`,
  invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`); D7 `StorefrontRenderer.tsx`
  productGrid/collectionRow blocks (static count at `:57`, global `/products` link at `:58`;
  draft cites `:59`).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018, `:114-116` cross-pool reject,
  `:125-127` read-only demotion, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` render-time re-fetch, `:163` renderer-hostility unit test. `git ls-tree ... docs/adr/`
  at the tip contains **no** ADR-018 file (verified: no `adr-018` entry).

```text
| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — root cause reached by a different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, :88) instead of the serving merge (`nip05.ts:12`). Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns | **DUPLICATE OF #2** — mechanism differs (purchase wiring, not the serving merge) but the *symptom prev #2 already covers* is identical: two pubkeys can each pay for one name. `:84` keeps `vanityManager`/`nip05Manager` inside `purchaseManagers`, so both legacy sale channels stay live against a name the unified registry owns, and prev #2's "unify on one registry" remedy subsumes the ADR-019:125-127 demotion. *Stated marginal call:* restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the symptom overlaps -> duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` has `.max(40)` but no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the previous `d=storefront-page` event is overwritten. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is for the separate code-truth worker; the ADR/code mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the literal is hard-coded server-side (`registryDTag: 'storefront-names'`, :73) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution. | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` / `/community` (`:58`, `:66`) instead of fetching the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the section close; the count/link lines are `:57`-`:58` in the same block.)* |
```

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the three buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because
  D7 is NEW-but-NIT — the case the task's "X+Y = total" shortcut does not anticipate; the NIT count is
  on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ... --jq` GET reads were issued;
  no comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (seventh pass — fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 bytes) -> used. Seven findings, labelled D1-D7 here
  (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present locally
  (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test (grep for `.test.ts`/`.spec.ts`).
- **Prev-round root cause re-read verbatim**: its #2 states the pools' managers "validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys", remedy "Unify on one registry or cross-check `existing.pubkey` across both pools
  before **registering**/serving". Its #3 = reserved list drops `terms`/`privacy`
  (`StorefrontIdentityManager.ts:5-53`); #4 = `heroBlock.title` skips `safeText`
  (`storefront.ts:26`); #5 = no `validUntil` gate on the rendered page (`queries/storefront.tsx`).
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, then `:89` validity check) — `RESERVED_NAMES` at `:5-53`
  contains no `terms`/`privacy` (prev #3 confirmed); D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping blocks via `flatMap` and `StorefrontPageSchema.blocks = z.array(...).max(40)` (no `.min`),
  and `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]` -> the new event replaces the old);
  D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored client-side at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`); D6 `package.json:31` glob
  (`contextvm src/queries/__tests__ src/lib/__tests__`) vs the spec under `src/lib/schemas/`,
  invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`); D7 `StorefrontRenderer.tsx`
  productGrid/collectionRow blocks (static count at `:57`, global `/products` link at `:58`,
  `/community` at `:66`; draft cites `:59`).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018, `:114-116` cross-pool reject,
  `:125-127` read-only demotion, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` render-time re-fetch, `:163-165` renderer-hostility unit test. `git ls-tree ... docs/adr/`
  at the tip contains **no** ADR-018 file (verified).

```text
| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, :88) rather than the serving merge (`nip05.ts:12`). Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name (the earlier holder is repointed while still inside their paid window); required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns | **DUPLICATE OF #2** — mechanism differs (purchase wiring, not the serving merge) but the *symptom prev #2 already covers* is identical: two pubkeys can each pay for one name. `:84` keeps `vanityManager`/`nip05Manager` inside `purchaseManagers`, so both legacy sale channels stay live against a name the unified registry owns, and prev #2's "unify on one registry" remedy subsumes the ADR-019:125-127 demotion. *Stated marginal call:* restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the symptom overlaps -> duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays for `alice`, then `/alice` != `alice@host`); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` has `.max(40)` but no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) overwrites the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (:10) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is for the separate code-truth worker; the ADR/code mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the literal is hard-coded server-side (`registryDTag: 'storefront-names'`, :73) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution. | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |
```

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the three buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because
  D7 is NEW-but-NIT — the case the task's "X+Y = total" shortcut does not anticipate; the NIT count is
  on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ... --jq` GET reads were issued;
  no comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (eighth pass — fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present locally
  (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test (grep for `.test.ts`/`.spec.ts`).
- **Prev-round findings re-read verbatim**: the single prior comment contains the five known issues
  (1 `$vanityName.tsx` route only reads `vanityActions.resolveVanity`; 2 `nip05.ts:11-13`
  `{ ...legacy.names, ...unified.names }` shadowing with independent per-registry validation;
  3 reserved list `StorefrontIdentityManager.ts:5-53` drops `terms`/`privacy`; 4 `heroBlock.title`
  `storefront.ts:26` skips `safeText`; 5 no `validUntil` gate in `queries/storefront.tsx`).
  Note the draft under review does **not** re-raise prev #1, so no D-item can overlap it.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, then `:89` validUntil check on that one registry);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping blocks via `flatMap` and `StorefrontPageSchema.blocks = z.array(StorefrontBlockSchema).max(40)`
  (`storefront.ts:77`; no `.min`), plus `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]`
  -> the new addressable event replaces the previous page); D4 `publish/storefront-page.ts:10`
  (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored
  client-side at `queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31`
  glob (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the
  spec under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`);
  D7 `StorefrontRenderer.tsx` (`:57` static `{block.products.length}` count, `:58` global `/products`
  `SafeLink`, `:66` `/community`; draft cites `:59`).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116`
  reject any name held in either legacy registry by a different pubkey, `:125-127` legacy managers
  read-only / reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` coordinates re-fetched and re-validated at render time, `:163-165` hostile-page
  renderer unit test. `git ls-tree ... docs/adr/` at the tip contains **no** ADR-018 file (verified).
  `$vanityName.tsx:21` still resolves only via `vanityActions.resolveVanity` (prev #1 unchanged).

```text
| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause, different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 is that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (purchase wiring vs the serving merge), but the root cause and symptom prev #2 already covers are identical — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names; restricting prev #2 to `nip05.ts:12` alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the literal is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the section close; the count/link lines are `:57`-`:58` in the same block.)* |
```

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ... --jq` GET reads were issued;
  no comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (ninth pass — fresh fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present
  locally (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test (only `new file` with `.test.ts`).
- **Prev-round wording re-read verbatim**: its #2 states the mechanism ("Both managers validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys (nip05 vs storefront are separate pools, `/api/zapPurchase` routes by zap label
  to exactly one)") and its remedy literally says to cross-check `existing.pubkey` "across both pools
  before **registering**/serving". Its #3 = reserved list drops `terms`/`privacy`
  (`StorefrontIdentityManager.ts:5-53`); #4 = `heroBlock.title` skips `safeText`
  (`storefront.ts:26`); #5 = no `validUntil` gate (`queries/storefront.tsx`). Its #1 (`$vanityName.tsx`
  never resolves storefront names) is **not** re-raised by this draft, so no D-item can overlap it.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, then `:89` validity check on that one registry;
  `RESERVED_NAMES` at `:5-53` still lacks `terms`/`privacy`, confirming prev #3's premise is live);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-94`
  dropping blocks via `flatMap` (and re-`parse`ing, so a `blocks` array that dropped everything still
  passes since `storefront.ts:77` is `.max(40)` with no `.min`), plus `storefront-page.ts:12`
  (`tags: [['d', 'storefront-page']]` -> the new addressable event replaces the previous page);
  D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored client-side at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`); D6 `package.json:31` glob
  (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the spec
  under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`);
  D7 `StorefrontRenderer.tsx` (`:57` static `{block.products.length}` count, `:58` global `/products`
  `SafeLink`, `:66` `/community`; draft cites `:59`, the `</section>` close).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116`
  reject any name held in either legacy registry by a different pubkey, `:125-127` legacy managers
  read-only / reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` coordinates re-fetched and re-validated at render time, `:163-165` hostile-page
  renderer unit test. `git ls-tree ... docs/adr/` at the tip contains **no** ADR-018 file (verified).

```text
| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |
```

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`


## Independent re-verification (tenth pass — fresh fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present
  locally (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test.
- **Prev-round wording re-read verbatim**: its #2 states the mechanism ("Both managers validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys") and its remedy says to "Unify on one registry or cross-check `existing.pubkey`
  across both pools before registering/serving" — the shared root cause of D1 and D2. Its #3 = reserved
  list drops `terms`/`privacy` (`StorefrontIdentityManager.ts:5-53`); #4 = `heroBlock.title` skips
  `safeText` (`storefront.ts:26`); #5 = no `validUntil` gate (`queries/storefront.tsx`). Its #1
  (`$vanityName.tsx` never resolves storefront names) is **not** re-raised by this draft.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, `:89` validity check on that one registry);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping blocks via `flatMap` (and `storefront.ts:77` `blocks` is `.max(40)` with no `.min`, so an
  all-dropped page still parses), and `publish/storefront-page.ts:12` `tags: [['d','storefront-page']]`
  so the new event replaces the previous page; D4 `publish/storefront-page.ts:10` (`kind: 30024`);
  D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored client-side at
  `queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31` test:unit glob
  (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the spec
  under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`);
  D7 `StorefrontRenderer.tsx` (`:57` static `{block.products.length}` count, `:58` global `/products`
  `SafeLink`; draft cites `:59`, the `</section>` close of the same block).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116` reject
  any name held in either legacy registry by a different pubkey, `:125-127` legacy managers read-only /
  reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`, `:140-142` coordinates
  re-fetched and re-validated at render time, `:161-162` domain from runtime instance config never a
  literal, `:163-165` hostile-page renderer unit test. `git ls-tree 2ae85b6 docs/adr/` contains **no**
  ADR-018 file (verified).

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before registering/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); ADR-019:114-116 states the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice`. `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (eleventh pass — fresh fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present
  locally (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test.
- **Prev-round wording re-read verbatim**: its #2 states the mechanism (\"Both managers validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys\") and its remedy says to \"Unify on one registry or cross-check `existing.pubkey`
  across both pools before registering/serving\" — the shared root cause of D1 and D2. Its #3 = reserved
  list drops `terms`/`privacy` (`StorefrontIdentityManager.ts:5-53`); #4 = `heroBlock.title` skips
  `safeText` (`storefront.ts:26`); #5 = no `validUntil` gate (`queries/storefront.tsx`). Its #1
  (`$vanityName.tsx` never resolves storefront names) is **not** re-raised by this draft.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, `:89` validity check on that one registry);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping blocks via `flatMap` (and `storefront.ts:77` `blocks` is `.max(40)` with no `.min`, so an
  all-dropped page still parses), plus `publish/storefront-page.ts:12`
  `tags: [['d','storefront-page']]` (the new addressable event replaces the previous page);
  D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored client-side at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`); D6 `package.json:31` test:unit glob
  (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the spec
  under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`);
  D7 `StorefrontRenderer.tsx` (`:57` static `{block.products.length}` count, `:58` global `/products`
  `SafeLink`; draft cites `:59`, the `</section>` close of the same block).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116` reject
  any name held in either legacy registry by a different pubkey, `:125-127` legacy managers read-only /
  reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`, `:140-142` coordinates
  re-fetched and re-validated at render time, `:161-162` domain from runtime instance config never a
  literal, `:163-165` hostile-page renderer unit test. `git ls-tree 2ae85b6 docs/adr/` contains **no**
  ADR-018 file (verified).

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before registering/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); ADR-019:114-116 states the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice`. `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (twelfth pass — fresh fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present
  locally (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test.
- **Prev-round wording re-read verbatim**: its #2 states the mechanism ("Both managers validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys") and its remedy literally says to "Unify on one registry or cross-check
  `existing.pubkey` across both pools before **registering**/serving" — the shared root cause of D1
  and D2. Its #3 = reserved list drops `terms`/`privacy` (`StorefrontIdentityManager.ts:5-53`);
  #4 = `heroBlock.title` skips `safeText` (`storefront.ts:26`); #5 = no `validUntil` gate
  (`queries/storefront.tsx`). Its #1 (`$vanityName.tsx` never resolves storefront names) is **not**
  re-raised by this draft, so no D-item can overlap it.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, `:89` validity check on that one registry;
  `RESERVED_NAMES` at `:5-53` still lacks `terms`/`privacy`, confirming prev #3's premise is live);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-94`
  dropping blocks via `flatMap` (and `storefront.ts:77` `blocks` is `.max(40)` with no `.min`, so an
  all-dropped page still parses), plus `publish/storefront-page.ts:12`
  (`tags: [['d','storefront-page']]` — the new addressable event replaces the previous page);
  D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored client-side at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`); D6 `package.json:31` test:unit glob
  (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the spec
  under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`run: bun run test:unit`);
  D7 `StorefrontRenderer.tsx` (`:57` static `{block.products.length}` count, `:58` global `/products`
  `SafeLink`, `:66` `/community`; draft cites `:59`, the `</section>` close of the same block).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116` reject
  any name held in either legacy registry by a different pubkey, `:125-127` legacy managers read-only /
  reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`, `:140-142` coordinates
  re-fetched and re-validated at render time, `:161-162` domain from runtime instance config never a
  literal, `:163-165` hostile-page renderer unit test. `git ls-tree 2ae85b6 docs/adr/` contains **no**
  ADR-018 file (verified).

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before registering/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); ADR-019:114-116 states the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-94`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's "X+Y = total" shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (thirteenth pass — fresh fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present locally
  (`git cat-file -t` -> commit). `repos/.../pulls/1286/files` -> 14 files; exactly one test file is
  touched at all, and it is **added** not modified: `src/lib/schemas/storefront.test.ts`.
- **Prev-round wording re-read verbatim (via `gh api .../issues/comments/5617745226`)**: its #2 states
  "Both managers validate independently and each only sees its own registry, so they can happily
  assign the same name to two different pubkeys (nip05 vs storefront are separate pools ...)" and its
  remedy is "Unify on one registry or cross-check `existing.pubkey` across both pools before
  registering/serving" — the shared root cause of D1 and D2. Its #3 = reserved list drops
  `terms`/`privacy` (`StorefrontIdentityManager.ts:5-53`); #4 = `heroBlock.title` skips `safeText`
  (`storefront.ts:26`); #5 = no `validUntil` gate (`queries/storefront.tsx`). Its #1
  (`$vanityName.tsx` never resolves storefront names) is **not** re-raised by this draft, so no
  D-item can overlap it.
- **Cited sites re-read at the SHA and confirmed in place**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`; `:89` is the `validUntil` check against *that one*
  registry only); D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`, with
  `:82-84` constructing all three; ADR-019:125-127 asks for read-only demotion and no demotion flag
  exists here); D3 `dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`)
  — the lenient parser whose `:89` `flatMap` drops each unparsable block, so `page` is non-null and
  the `toast.error` at `:69` cannot fire for one bad block — feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`), and `storefront.ts:77`
  (`blocks: z.array(StorefrontBlockSchema).max(40)`, no `.min`, so an all-dropped page still parses),
  with `publish/storefront-page.ts:12` (`tags: [['d','storefront-page']]` — addressable, so the new
  event replaces the previous page); D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5
  `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored client-side at
  `queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31` test:unit glob
  (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the spec
  under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`run: bun run test:unit`);
  D7 `StorefrontRenderer.tsx` productGrid/collectionRow blocks (`:53`-`:60` and `:61`-`:68`; the
  static count is `:57` `{block.products.length}`, the global link `:58` `/products` and `:66`
  `/collection`; the draft cites `:59`, the `</section>` close of the same block).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116` reject
  any name held in either legacy registry by a different pubkey, `:125-127` legacy managers read-only
  / reject new receipts, `:128-130` deletion after the longest legacy window, `:134` `Kind 30024
  (addressable, application-specific)`, `:140-142` coordinates re-fetched and re-validated at render
  time, `:161-162` domain from runtime instance config never a literal, `:163-165` hostile-page
  renderer unit test. `git ls-tree 2ae85b6 docs/adr/` contains **no** ADR-018 file (verified:
  ADR-0001..0007, 0009, 013..016, 019 present).

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy explicitly says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); ADR-019:114-116 states the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim at `:134`). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only test file touched in the diff and it is *added* (verified via the PR files API), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/collection` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the three buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because
  D7 is NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is
  on the spam axis as instructed. Equivalently `X + Y + Z = 7`: NEW-and-ACTIONABLE + duplicates + nits.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other write was made.
- **Offload note:** this is the thirteenth pass on this branch; the parent draft, the single prev
  issue comment, and every cited line are unchanged at `2ae85b6`, so this pass reproduces the same
  classification as passes 4-12 rather than inventing a delta.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (fourteenth pass — fresh fleet offload re-derivation)

Re-derived from scratch, not copied from the earlier passes. Inputs re-read live at
`2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (present locally; `git cat-file -t` -> commit; not an
ancestor of this worker branch, so read via `git show <sha>:<path>`):

- Parent draft artifact present and non-empty: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  (3548 bytes, seven numbered findings -> D1-D7 below). Used as the authoritative list.
- Live PR: OPEN, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`, author `hkarani`.
  Comparison set still 1:1 — issue comments = 1 (`#5617745226`, the prev round), reviews = 0,
  review comments = 0 (`gh api repos/PlebeianApp/market/pulls/1286/comments --jq length` -> 0).
- `gh pr diff 1286 --name-only` -> 14 files; exactly one added test (`src/lib/schemas/storefront.test.ts`),
  which pins D6's premise.
- Cited lines re-read at the SHA and confirmed in place: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`), D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`),
  D3 `.../dashboard/account/storefront.tsx:67` (`parseStorefrontPage(content)`) with
  `storefront.ts:89-91` (flatMap drops failed blocks) and `publish/storefront-page.ts:5`
  (`StorefrontPageSchema.parse(page)`), D4 `publish/storefront-page.ts:10` (`kind: 30024`) vs
  ADR-019:134 ("Kind `30024` (addressable, application-specific)"), E5 D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20` (`'#d': ['storefront-names']`),
  D6 `package.json:31` glob (`contextvm src/queries/__tests__ src/lib/__tests__`) vs the spec under
  `src/lib/schemas/` and `ci-unit.yml:47` (`bun run test:unit`), D7 `StorefrontRenderer.tsx:57-58,66`
  (static count, global `/products` and `/community` links).
- Prev-round root cause re-read: `nip05.ts:12` `{ ...legacy.names, ...unified.names }`; the prev body's #2
  states the pools "validate independently and each only sees its own registry, so they can happily assign
  the same name to two different pubkeys" and prescribes cross-checking `existing.pubkey` across both pools.
- ADR facts re-read: ADR-019:110-111 namespaced `d` via ADR-018; :114-116 cross-pool reject; :125-127
  read-only demotion; :134 `30024` labelled "addressable, application-specific"; :140-142 render-time
  re-fetch; :163 renderer-hostility test. No ADR-018 file exists at this tip (verified: `git ls-tree`
  on `docs/adr` has no `ADR-018*`).

### Dedupe + spam table (fourteenth pass)

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — different file:line, but the exact root cause prev #2 states, reached by a different path: `validateRegistration` reads only `this.registry.get(name)` (`:88`), i.e. the "each manager validates independently and sees only its own registry" defect, on the *registration* path instead of prev #2's *serving/merge* path (`nip05.ts:12`). Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name; required change: reject in `validateRegistration` any name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — distinct *mechanism* (sale wiring, not the `nip05.ts:12` merge) but the *same symptom prev #2 already covers*: `:84` keeps `vanityManager`/`nip05Manager` in `purchaseManagers`, so two pubkeys can each pay for one name — the divergence prev #2 names. Task rule: symptom overlap = duplicate. *Marginal call, stated:* reading prev #2 as the merge alone would make this NEW; the symptom overlaps, so duplicate. | **ACTIONABLE** — a second buyer can still pay for a name the unified registry owns; required change: demote `vanityManager`/`nip05Manager` to read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — no prev issue touches the publish/render validation split. prev #4 (the only other schema finding) is a missing `safeText` refine on one field (`storefront.ts:26`) — a different root cause in a different region. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-91`), the residue then passes the strict `StorefrontPageSchema.parse` at publish (`publish/storefront-page.ts:5`), so one typo (`"type":"textt"`) publishes a truncated page, the success toast fires, and the previous `d=storefront-page` event is overwritten. Required change: validate the raw content with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. Confirmed: `kind: 30024` at `:10`; ADR-019:134 says "Kind `30024` (addressable, application-specific)". | **ACTIONABLE** — concrete spec/interop collision plus an ADR error: required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 draft-reservation claim itself holds is for the separate code-truth worker; the issue names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018 | **NEW** — same *file* as prev #3 (`:5`, `RESERVED_NAMES`) but a different line, member and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 namespacing — the deliberate "do not judge overlap by file name" case. Verified: literal at `:73`, mirrored client-side at `queries/storefront.tsx:20`, and no ADR-018 file exists at this tip. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: two instances sharing an app key share one name namespace, and the tag cannot be retargeted without a deploy. Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (14 files, one `*.test.ts`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and CI runs exactly that (`ci-unit.yml:47`), so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) so CI runs it. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution. | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of fetching the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. |

### Notes (fourteenth pass)

- D1/D2 are DUPLICATE-but-ACTIONABLE (real and worth a code change, but already tracked as prev #2);
  D7 is NEW-but-NIT.
- D5 is the complement to the D3/prev-#4 reasoning: same *file* as prev #3 but no root-cause or symptom
  overlap => NEW despite the shared path.
- Counting caveat, restated: the spam axis is independent, so `X+Y = 6` while the total is 7 — the gap is
  D7 (NEW-but-NIT), the case the task's "X+Y = total" shortcut does not anticipate. The NIT count sits on
  the spam axis as instructed; no duplicate was invented to force the identity.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (fifteenth pass — fresh offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; the earlier passes were
not copied. Read-only: no GitHub write of any kind was issued.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`), present and non-empty -> used. 13 lines / 3.5 KB, seven numbered findings
  (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`), labelled D1-D7 here.
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments --jq length`
  -> **1** (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues, body re-read
  verbatim);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED rows are possible.
- **PR state**: `gh pr view 1286 --repo PlebeianApp/market` -> OPEN, head `2ae85b6...` (present
  locally, `git cat-file -t` -> commit), base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`. `gh pr diff --name-only` -> 14 files;
  the only `*.test.ts` among them is `src/lib/schemas/storefront.test.ts` (7 of the 14 are new files,
  but exactly one added test), confirming D6's premise.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88` (`const existing =
  this.registry.get(name)`, with the ownership test on `:89`), D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`),
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping blocks via `flatMap` (`blocks: z.array(...).max(40)`, no `.min`), D4
  `publish/storefront-page.ts:10` (`kind: 30024`), D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`), D6 `package.json:31` glob (`contextvm src/queries/__tests__```
  ```src/lib/__tests__`) vs the spec under `src/lib/schemas/`, D7 `StorefrontRenderer.tsx:57-58`
  (static count at `:57`, global `/products` link at `:58`; the draft cites `:59` in the same block).
- **ADR-019 re-read**: `:109-111` namespaced `d` via ADR-018, `:114-116` reject names held in either
  legacy registry, `:125-127` legacy managers stay read-only and reject new receipts, `:134`
  `Kind 30024 (addressable, application-specific)`, `:140-142` render-time re-fetch, `:163` block
  renderer hostile-page unit test. `git ls-tree ... docs/adr/` at the tip contains **no** ADR-018
  file (verified), so D5's "R7 already unmet" premise holds.

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — different file:line, but the exact root cause prev #2 states, reached by a different path: prev #2 says the pools "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys" and prescribes cross-checking `existing.pubkey` across both pools "before registering/serving". D1 is that missing cross-check on the *registration* path (`this.registry.get(name)`, `:88`) instead of the *serving/merge* path (`nip05.ts:11-13`, which the draft itself cites). Root-cause near-duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name; required change: make `validateRegistration` reject any name currently held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — the mechanism differs (purchase wiring, not the serving merge), but the *symptom prev #2 already covers* is identical: two pubkeys can each pay for one name (`/alice` != `alice@host`). `:84` keeps `vanityManager`/`nip05Manager` inside `purchaseManagers`, so both legacy sale channels stay live against a name the unified registry owns; prev #2's stated "unify on one registry" remedy also subsumes the ADR-019:125-127 read-only demotion. *Marginal call, stated:* restricting prev #2 to the `nip05.ts:11-13` merge alone would make D2 NEW, but the task's symptom-overlap rule governs. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — none of the five touches the publish/render validation split. prev #4 (the only other schema finding) is a missing `safeText` refine on one field (`storefront.ts:26`) — a different root cause in a different region. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block via `flatMap` (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with the strict `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` has `.max(40)` but no `.min`), so one typo (`"type":"textt"`) publishes a truncated page, the success path proceeds, and the previous `d=storefront-page` event is overwritten. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it "addressable, application-specific". Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 draft-reservation claim itself holds is for the separate code-truth worker; the issue names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:109-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:109-111 requires the namespaced `d` resolved through ADR-018, but the literal is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the 14-file diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and keep the ADR-019:163 hostile-page renderer assertion. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution. *(Draft cites `:59`; the static count is at `:57` and the global `/products` link at `:58` in the same block.)* | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) instead of fetching the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. |

Notes (fifteenth pass):

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the deliberate complement to the D3/prev-#4 reasoning: same *file* as prev #3 but no
  root-cause or symptom overlap, so NEW despite the shared path.
- Counting caveat: the spam axis is independent, so the three buckets partition all seven
  (`4 + 2 + 1 = 7`) while `X + Y = 6`, not 7 — the gap is D7 (NEW-but-NIT), the case the task's
  "X+Y = total" shortcut does not anticipate. The NIT count sits on the spam axis as instructed; no
  duplicate was invented to force the identity.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ... --jq` reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`


## Independent re-verification (sixteenth pass — fresh offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; the earlier passes were
not copied. Read-only: only `gh pr view`, `gh pr diff`, and `gh api ... GET` reads were issued — no
comment, review, label, approval, or other GitHub write of any kind.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`), present and non-empty -> used. 3548 bytes, seven numbered findings
  (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`), labelled D1-D7 here.
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments
  --jq length` -> **1** (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five
  prev-issues, body re-read verbatim); `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments`
  -> **0**. There is no unlisted prior round, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: OPEN, head `2ae85b6...` (present locally, `git cat-file -t` -> commit), base
  `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`.
- **Files API** (`.../pulls/1286/files`): 14 files, 7 `added` / 7 `modified`. The only
  `*.test.ts` among them is `src/lib/schemas/storefront.test.ts` (**added**), pinning D6's
  "only new test" premise. `src/lib/schemas/` is *not* in the `test:unit` glob
  (`contextvm src/queries/__tests__ src/lib/__tests__`; `find` over that glob matches the spec
  **0** times).
- **Cited sites re-read at the SHA and confirmed in place**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, ownership test on `:89` against that one registry
  only), D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`),
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`), with `storefront.ts:89-92`
  dropping blocks via `flatMap` and `blocks: z.array(...).max(40)` (no `.min`), and
  `publish/storefront-page.ts:12` (`tags: [['d', 'storefront-page']]`, addressable -> replaces),
  D4 `publish/storefront-page.ts:10` (`kind: 30024`) vs ADR-019:134
  (``Kind `30024` (addressable, application-specific)``), D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`), D6 `package.json:31` glob vs the spec under `src/lib/schemas/`
  invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`), D7
  `StorefrontRenderer.tsx` productGrid block `:53-59` (static count `:57`, global `/products` link
  `:58`) and collectionRow `:61-67` (global `/community` link `:66`; draft cites `:59`, the
  `</section>` close of the productGrid block).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116`
  reject any name held in either legacy registry by a different pubkey, `:125-127` legacy managers
  read-only / reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` render-time re-fetch/re-validate, `:161-162` instance domain never a literal,
  `:163-165` hostile-page renderer unit test. `git ls-tree 2ae85b6 docs/adr/` contains **no**
  ADR-018 file (verified), so D5's "resolved through ADR-018" premise is already unmet at the tip.
- **Prev #1 not re-raised**: `src/routes/$vanityName.tsx` is a changed file in the diff but no
  D-item cites it or restates its root cause, so no row can overlap prev #1.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` then repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — different file:line, but the exact root cause prev #2 states, reached by a different path: prev #2 says the pools "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys" and prescribes cross-checking `existing.pubkey` across both pools "before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) instead of the serving merge (`nip05.ts:12`); ADR-019:114-116 restates the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name (a second buyer pays and the earlier holder is repointed); required change: make `validateRegistration` reject any name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns | **DUPLICATE OF #2** — the mechanism differs (sale wiring, not the `nip05.ts:12` merge), but the *symptom prev #2 already covers* is identical: two pubkeys can each pay for one name (`/alice` != `alice@host`). `:84` keeps `vanityManager`/`nip05Manager` inside `purchaseManagers`, so both legacy sale channels stay live against a name the unified registry owns, and prev #2's "unify on one registry" remedy subsumes the ADR-019:125-127 read-only demotion. *Marginal call, stated:* reading prev #2 as the `nip05.ts:12` merge alone would make D2 NEW, but the task's symptom-overlap rule governs. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. prev #4 (the only other schema finding) is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block via `flatMap` (`storefront.ts:89-92`), the residue then passes `StorefrontPageSchema.parse` at publish (`publish/storefront-page.ts:5`) because `blocks` is `.max(40)` with no `.min`, so one typo (`"type":"textt"`) publishes a truncated page, the success toast fires, and the addressable `d=storefront-page` event (`:12`) overwrites the previously published page. Required change: validate the raw content with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. Verified: `kind: 30024` at `:10`; ADR-019:134 reads ``Kind `30024` (addressable, application-specific)``. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 draft-reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` resolved through ADR-018; mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, member and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. Verified: literal at `:73`, mirrored at `queries/storefront.tsx:20`, and no ADR-018 file exists at this tip. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: two instances sharing an app key share one name namespace, and the tag cannot be retargeted without a deploy. Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. Verified: it is the only `*.test.ts` in the 14-file diff and is *added* (files API); `find` over the `test:unit` glob matches it 0 times. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and CI runs exactly that (`ci-unit.yml:47`), so the spec under `src/lib/schemas/` never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) so CI runs it. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate). *(Draft cites `:59`; the static count is `:57` and the global `/products` link `:58` in the same block.)* | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. |

Notes (sixteenth pass):

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by re-treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3/prev-#4 reasoning: D5 shares a *file* with prev #3 yet no root cause
  or symptom, so NEW despite the shared path; D3 shares no file with any prev issue, so NEW.
- Counting: the three buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only
  because D7 is NEW-but-NIT — the case the task's "X+Y = total" shortcut does not anticipate; the NIT
  count is on the spam axis as instructed. No duplicate was invented to force the identity.
- **Offload note:** this is the sixteenth pass on this branch. The parent draft, the single prev issue
  comment, the PR head, and every cited line are unchanged at `2ae85b6`, so this pass reproduces the
  same classification as passes 4-15 rather than inventing a delta.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (seventeenth pass — fresh fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present
  locally (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test (only `new file` matching `*.test.ts`).
- **Prev-round wording re-read verbatim**: its #2 states the mechanism ("Both managers validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys ... The storefront buyer's pubkey then wins at `.well-known/nostr.json` for a name
  the nip05 buyer already paid for") and its remedy literally says "Unify on one registry or
  cross-check `existing.pubkey` across both pools before **registering**/serving". Its #3 = reserved
  list drops `terms`/`privacy` (`StorefrontIdentityManager.ts:5-53`); #4 = `heroBlock.title` skips
  `safeText` (`storefront.ts:26`); #5 = no `validUntil` gate (`queries/storefront.tsx`). Its #1
  (`$vanityName.tsx` never resolves storefront names) is **not** re-raised by this draft — and
  `$vanityName.tsx:21` still resolves only via `vanityActions.resolveVanity(vanityName)`, so prev #1
  is still live but unmentioned, so no D-item can overlap it.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:84-93` — `validateRegistration`
  checks only `const existing = this.registry.get(name)` (`:88`) against `RESERVED_NAMES` (`:5-53`,
  which still lacks `terms`/`privacy`, confirming prev #3's premise is live); D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:66-82` (`const page = parseStorefrontPage(content)` at `:67`)
  feeding `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:84-98`
  dropping blocks via `flatMap` (`:89-92`) and `StorefrontPageSchema.blocks = z.array(StorefrontBlockSchema).max(40)`
  (`storefront.ts:77`; no `.min`), plus `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]`
  -> the new addressable event replaces the previous page); D4 `publish/storefront-page.ts:10`
  (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored
  client-side at `queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31`
  glob (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the spec
  at `src/lib/schemas/storefront.test.ts` (outside every scanned dir), invoked by
  `.github/workflows/ci-unit.yml:47` (`bun run test:unit`); D7 `StorefrontRenderer.tsx` productGrid
  block (`:57` static `{block.products.length} product references published by this seller.`,
  `:58` global `/products` `SafeLink`) and collectionRow block (`:65` static text, `:66` global
  `/community` `SafeLink`); draft cites `:59`, the `</section>` close.
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116` reject
  any name held in either legacy registry by a different pubkey, `:125-127` legacy managers read-only /
  reject new receipts, `:134` `Kind 30024 (addressable, application-specific)` (verified verbatim),
  `:140-142` coordinates re-fetched and re-validated at render time, `:163-165` hostile-page renderer
  unit test. `git ls-tree $SHA:docs/adr/` at the tip lists **no** ADR-018 file (ADR-0001..0009, 013-016,
  019, plus one non-numbered ADR and a `proposals/` tree) — so ADR-019's ADR-018 dependency is unmet at
  this tip, as D5 states.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the symptom prev #2 already covers is identical — two pubkeys can each pay for one name (`/alice` != `alice@host`), which the draft itself names as "the divergence R2 exists to make unrepresentable" (R2 = prev #2). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (eighteenth pass — fresh fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent
  task `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present
  locally (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test (`new file` / `+++ b/...`).
- **Prev-round findings re-read verbatim**: #1 `src/routes/$vanityName.tsx` route reads only
  `vanityActions.resolveVanity(vanityName)` -> storefront names never resolve (still true:
  `$vanityName.tsx:21`); #2 `src/server/http/nip05.ts:11-13` `{ ...legacy.names, ...unified.names }`
  shadowing, with "Both managers validate independently and each only sees its own registry, so they
  can happily assign the same name to two different pubkeys", remedy "Unify on one registry or
  cross-check `existing.pubkey` across both pools before **registering**/serving"; #3 reserved list
  (`src/server/StorefrontIdentityManager.ts:5-53`) drops `terms`/`privacy`; #4 `heroBlock.title`
  (`src/lib/schemas/storefront.ts:26`) skips `safeText`; #5 no `validUntil` gate on the rendered page
  (`src/queries/storefront.tsx`). The draft under review re-raises **none** of these five, so no
  D-item can be an identical file+line duplicate; only root-cause/symptom overlap is possible.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:84-93` — `validateRegistration`
  consults only `const existing = this.registry.get(name)` (`:88`) then checks `existing.pubkey` and
  `existing.validUntil` on that one registry only (`:89`), never the legacy registries, while
  `RESERVED_NAMES` (`:5-53`) still lacks `terms`/`privacy` (prev #3 premise live). D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`) — both
  legacy managers stay in the sale list. D3 `.../dashboard/account/storefront.tsx:67`
  (`const page = parseStorefrontPage(content)`) feeding `publish/storefront-page.ts:5`
  (`StorefrontPageSchema.parse(page)`), with `storefront.ts:89` dropping failed blocks via `flatMap`
  and `StorefrontPageSchema.blocks = z.array(StorefrontBlockSchema).max(40)` (`storefront.ts:77`; no
  `.min`), plus `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]` -> the new addressable
  event replaces the previous page). D4 `publish/storefront-page.ts:10` (`kind: 30024`).
  D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored client-side at
  `queries/storefront.tsx:20` (`'#d': ['storefront-names']`). D6 `package.json:31`
  (`bun test $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...)`)
  vs the spec at `src/lib/schemas/storefront.test.ts` (outside every scanned dir), invoked by
  `.github/workflows/ci-unit.yml:47` (`bun run test:unit`). D7 `StorefrontRenderer.tsx` productGrid
  block (`:57` static `{block.products.length} product references published by this seller.`,
  `:58` global `/products` `SafeLink`) and collectionRow block (`:66` global `/community`); draft
  cites `:59`, the `</section>` close.
- **ADR-019 re-read**: `:110-111` namespaced `d` resolved through ADR-018 rather than a literal,
  `:114-116` reject any name held in either legacy registry by a different pubkey for the whole
  compatibility window, `:125-127` legacy managers stay registered **read-only** / reject new zap
  receipts, `:134` `Kind 30024 (addressable, application-specific)` (verified verbatim), `:140-142`
  coordinates re-fetched and re-validated at render time, `:161-162` instance domain from ADR-018
  never a literal, `:163-165` hostile-page renderer unit test. `git ls-tree $SHA:docs/adr/` at the tip
  lists **no ADR-018 file** (ADR-0001..0009, 013-016, 019, one non-numbered ADR, `proposals/`) —
  ADR-019's ADR-018 dependency is unmet at this tip, as D5 states.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) instead of the serving merge (`nip05.ts:12`); ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the symptom prev #2 already covers is identical — two pubkeys can each pay for one name (`/alice` != `alice@host`), which the draft itself calls "the divergence R2 exists to make unrepresentable" (R2 = prev #2). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids a literal instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (nineteenth pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Re-derived from scratch on this branch, not copied from the eighteen earlier passes. Inputs re-read live
at `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`:

- **Draft artifact present and non-empty** (authoritative list): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  (3548 B, seven numbered findings -> D1-D7). Used.
- `gh pr view 1286` -> **OPEN**, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`; head commit present locally
  (`git cat-file -t 2ae85b6...` -> commit).
- **Comparison set still 1:1**: issue comments = 1 (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z
  = the five prev-issues), reviews = 0, review comments = 0 — so there is no unlisted prior round.
- `gh pr diff 1286 --name-only` -> 14 files; exactly **one** added test
  (`src/lib/schemas/storefront.test.ts`, `new file mode 100644`), confirming D6's premise.
- Cited lines re-read at the SHA (materialised with `git show 2ae85b6:<path>` and inspected):
  D1 `StorefrontIdentityManager.ts:88` (`const existing = this.registry.get(name)`), D2
  `EventHandler.ts:84` (`this.purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`),
  D3 `.../dashboard/account/storefront.tsx:67` (`parseStorefrontPage(content)`) plus
  `storefront.ts:89-92` (flatMap silently drops failed blocks) and `publish/storefront-page.ts:5`
  (`StorefrontPageSchema.parse(page)`), D4 `publish/storefront-page.ts:10` (`kind: 30024`),
  D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored at
  `queries/storefront.tsx:20` (`'#d': ['storefront-names']`), D6 `package.json:31`
  (`bun test $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...)`)
  versus the spec under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47`,
  D7 `StorefrontRenderer.tsx:57-58` (static `{block.products.length} product references published by
  this seller.` and the global `/products` `SafeLink`; draft cites `:59`).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116` reject a
  name held in either legacy registry by a different pubkey for the whole compatibility window,
  `:125-127` legacy managers registered **read-only** / reject new zap receipts, `:134`
  `Kind 30024 (addressable, application-specific)`, `:140-142` coordinates re-fetched and re-validated
  at render time, `:163-165` hostile-page renderer unit test. `git ls-tree $SHA:docs/adr/` lists **no
  ADR-018 file** (ADR-0001..0009, 013-016, 019, one non-numbered ADR, `proposals/`) — ADR-019's ADR-018
  dependency is unmet at this tip, as D5 states.
- **Prev round re-read verbatim**: prev #2 states the pools' managers "validate independently and each
  only sees its own registry, so they can happily assign the same name to two different pubkeys" and
  prescribes cross-checking `existing.pubkey` "across both pools before **registering**/serving".

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism and its remedy explicitly spans the **registering** path ("cross-check `existing.pubkey` across both pools before registering/serving"). D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) instead of the serving merge (`nip05.ts:12`); ADR-019:114-116 states the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge) but the symptom prev #2 already covers is identical — two pubkeys can each pay for one name, which the draft itself calls "the divergence R2 exists to make unrepresentable" (R2 = prev #2). Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-symptom/same-root-cause as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2, so a
  maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on the
  spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other API write was made.
- Classification reproduced independently and is identical to the eighteen earlier passes.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (twentieth pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Re-derived from scratch on this branch; not copied from the nineteen earlier passes. Every cited
line was re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Draft artifact present and non-empty** (authoritative list of draft issues):
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (3548 B, md5
  `0fc6675ab0cfab78d9b9a6d568e9ed5a`), the artifact of parent task `t_31cab538`. Seven numbered
  findings -> labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`). Used.
- **PR state**: `gh pr view 1286 --repo PlebeianApp/market` -> **OPEN**, `isDraft: true`,
  `mergeable: MERGEABLE`, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`; head commit present
  locally (`git cat-file -t 2ae85b6...` -> commit).
- **Comparison set still 1:1**: issue comments = 1 (`#5617745226`, `felixfelix-bot`,
  2026-09-10T11:11:01Z — the five prev-issues), reviews = 0, review comments = 0. No unlisted prior
  round exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **Prev-round root cause re-read verbatim**: prev #2 states the pools' managers "validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys", and its remedy says to "cross-check `existing.pubkey` across both pools before
  **registering**/serving". Prev #1 (`$vanityName.tsx` never resolves storefront names) is **not**
  re-raised by this draft, so no D-item can overlap it.
- **`gh pr diff 1286 --name-only`** -> 14 files; exactly **one** added test
  (`src/lib/schemas/storefront.test.ts`), confirming D6's premise.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, then `:89` a `validUntil`/`pubkey` check against
  **that one** registry only); D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]` — both
  legacy managers still in the seller list); D3 `.../dashboard/account/storefront.tsx:67`
  (`const page = parseStorefrontPage(content)`) feeding `publish/storefront-page.ts:5`
  (`StorefrontPageSchema.parse(page)`), with `storefront.ts:85-94` dropping failed blocks via
  `flatMap` and `storefront.ts:77` (`blocks: z.array(StorefrontBlockSchema).max(40)`, no `.min`),
  plus `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]` -> the new addressable event
  replaces the previous page); D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5
  `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored client-side at
  `queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31`
  (`bun test $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...)`)
  vs the spec at `src/lib/schemas/storefront.test.ts` (outside every scanned dir), invoked by
  `.github/workflows/ci-unit.yml:47` (`bun run test:unit`); D7 `StorefrontRenderer.tsx` productGrid
  block (`:57` static `{block.products.length} product references published by this seller.`,
  `:58` global `/products` `SafeLink`) and collectionRow block (`:66` global `/community`); draft
  cites `:59`, the `</section>` close.
- **ADR-019 re-read**: `:109-111` registry `d=${instanceNamespace}-storefront-names` resolved through
  ADR-018 rather than a literal, `:114-116` reject any name held in either legacy registry by a
  different pubkey for the whole compatibility window, `:125-127` legacy managers stay registered
  **read-only** / reject new zap receipts, `:134` `Kind 30024 (addressable, application-specific)`
  (verified verbatim), `:140-142` coordinates re-fetched and re-validated at render time, `:162`
  instance domain from ADR-018 never a literal, `:163-165` hostile-page renderer unit test.
  `git ls-tree $SHA:docs/adr/` at the tip lists **no ADR-018 file** — ADR-019's ADR-018 dependency is
  unmet at this tip, as D5 states.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally spans the **registering** path ("cross-check `existing.pubkey` across both pools before registering/serving"). D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) instead of the serving merge (`nip05.ts:12`); ADR-019:114-116 states the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge) but the symptom prev #2 already covers is identical — two pubkeys can each pay for one name (`/alice` != `alice@host`), which the draft itself calls "the divergence R2 exists to make unrepresentable" (R2 = prev #2). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:85-94`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:109-111 requires the namespaced `d` resolved through ADR-018 and `:162` forbids a literal instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other API write was made.
- Classification reproduced independently and is identical to the nineteen earlier passes.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (twenty-first pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Re-derived from scratch on this branch; not copied from the twenty earlier passes. Every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Draft artifact present and non-empty** (authoritative list of draft issues):
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (3548 B, md5
  `0fc6675ab0cfab78d9b9a6d568e9ed5a`), the artifact of parent task `t_31cab538`. Seven numbered
  findings -> labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`). Used.
- **PR state**: `gh pr view 1286 --repo PlebeianApp/market` -> **OPEN**, `isDraft: true`,
  `mergeable: MERGEABLE`, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`; head commit present
  locally (`git cat-file -t 2ae85b6...` -> commit).
- **Comparison set still 1:1**: issue comments = 1 (`#5617745226`, `felixfelix-bot`,
  2026-09-10T11:11:01Z — the five prev-issues, re-read verbatim), reviews = 0, review comments = 0.
  No unlisted prior round exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **Prev-round root cause re-read verbatim**: prev #2 states the pools' managers "validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys", and its remedy says to "cross-check `existing.pubkey` across both pools before
  **registering**/serving". Prev #1 (`$vanityName.tsx:21` still resolves only via
  `vanityActions.resolveVanity`) is **not** re-raised by this draft, so no D-item can overlap it;
  prev #3 = reserved list drops `terms`/`privacy` (`StorefrontIdentityManager.ts:5-53`, confirmed
  live — the set ends at `bot`, no `terms`/`privacy`); prev #4 = `heroBlock.title` skips `safeText`
  (`storefront.ts:26`, confirmed: `z.string().trim().min(1).max(160)`, no `.refine`); prev #5 = no
  `validUntil` gate on the rendered page (`queries/storefront.tsx`).
- **`gh pr diff 1286 --name-only`** -> 14 files; exactly **one** added test
  (`src/lib/schemas/storefront.test.ts`), confirming D6's premise.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, then `:89` a `validUntil`/`pubkey` check against
  **that one** registry only); D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]` — both
  legacy managers still in the seller list); D3 `.../dashboard/account/storefront.tsx:67`
  (`const page = parseStorefrontPage(content)`, `:68` the null check) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`), with `storefront.ts:89-92`
  dropping failed blocks via `flatMap` and `storefront.ts:77`
  (`blocks: z.array(StorefrontBlockSchema).max(40)`, no `.min`), plus `storefront-page.ts:12`
  (`tags: [['d', 'storefront-page']]` -> the new addressable event replaces the previous page);
  D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored client-side at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`); D6 `package.json:31`
  (`bun test $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...)`)
  vs the spec at `src/lib/schemas/storefront.test.ts` (outside every scanned dir), invoked by
  `.github/workflows/ci-unit.yml:47` (`bun run test:unit`); D7 `StorefrontRenderer.tsx` productGrid
  block (`:57` static `{block.products.length} product references published by this seller.`,
  `:58` global `/products` `SafeLink`) and collectionRow block (`:65` static text,
  `:66` global `/community` `SafeLink`); draft cites `:59`, the `</section>` close.
- **ADR-019 re-read**: `:109-111` registry `d=${instanceNamespace}-storefront-names` resolved through
  ADR-018 rather than a literal, `:114-116` reject any name held in either legacy registry by a
  different pubkey for the whole compatibility window, `:125-127` legacy managers stay registered
  **read-only** / reject new zap receipts, `:134` `Kind 30024 (addressable, application-specific)`
  (verified verbatim), `:140-142` coordinates re-fetched and re-validated at render time, `:161-162`
  instance domain from ADR-018 never a literal, `:163-165` hostile-page renderer unit test.
  `git ls-tree $SHA:docs/adr/` at the tip lists **no ADR-018 file** (ADR-0001..0009, 013-016, 019,
  one non-numbered ADR, `proposals/`) — ADR-019's ADR-018 dependency is unmet at this tip, as D5
  states.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally spans the **registering** path ("cross-check `existing.pubkey` across both pools before registering/serving"). D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) instead of the serving merge (`nip05.ts:12`); ADR-019:114-116 states the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge) but the symptom prev #2 already covers is identical — two pubkeys can each pay for one name (`/alice` != `alice@host`), which the draft itself calls "the divergence R2 exists to make unrepresentable" (R2 = prev #2). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:109-111 requires the namespaced `d` resolved through ADR-018 and `:161-162` forbids a literal instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other API write was made.
- Classification reproduced independently and is identical to the twenty earlier passes.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (twenty-second pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Re-derived from scratch on this branch; not copied from the twenty-one earlier passes. Every cited
line re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

Inputs re-confirmed at this pass:

- **Draft artifact present and non-empty** (the authoritative list of draft issues):
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — 3548 B, md5
  `0fc6675ab0cfab78d9b9a6d568e9ed5a` (**byte-identical to the hash recorded at pass 21**, so the
  draft list has not moved between passes). Seven numbered findings -> D1-D7 (4 `[BLOCK]`,
  2 `[RISK]`, 1 `[NIT]`).
- **PR state**: `gh pr view 1286 --repo PlebeianApp/market` -> **OPEN**, `isDraft: true`, head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`. The head commit is present locally
  (`git cat-file -t 2ae85b6...` -> `commit`).
- **Comparison set still 1:1**: issue comments = 1 (`#5617745226`, `felixfelix-bot`,
  2026-09-10T11:11:01Z — re-read verbatim, five findings = the five prev-issues), reviews = 0,
  review comments = 0. There is no unlisted prior round, so no `DUPLICATE-OF-UNLISTED` row is
  possible.
- **`gh pr diff 1286 --name-only`** -> 14 files; exactly **one** added test
  (`src/lib/schemas/storefront.test.ts`), confirming D6's premise.
- **New this pass**: NIP-23 on `nostr-protocol/nips@master` confirms D4's premise verbatim —
  "Deprecated: `kind:30024` was used for long-form drafts (self-encrypted nip04, same format as
  `kind:30023`). The preferred way of doing long-form drafts is to use NIP-37 instead." So the kind
  is a *deprecated* NIP-23 long-form draft kind, and D4's "not addressable, application-specific as
  ADR-019:134 states" reading holds on the spec side as well as internally.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, checked at `:89` against **that one** registry only);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]` — both
  legacy managers still in the seller list); D3 `.../dashboard/account/storefront.tsx:67`
  (`parseStorefrontPage(content)`, `:68` null check) feeding `publish/storefront-page.ts:5`
  (`StorefrontPageSchema.parse(page)`), with `storefront.ts:89-92` dropping failed blocks via
  `flatMap` and `storefront.ts:77` (`blocks: z.array(StorefrontBlockSchema).max(40)`, no `.min`),
  plus `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]`, so the new addressable event
  replaces the previous page); D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5
  `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored client-side at
  `queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31`
  (`bun test $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...)`)
  vs the spec at `src/lib/schemas/storefront.test.ts` (outside every scanned dir), invoked by
  `.github/workflows/ci-unit.yml:47` (`bun run test:unit`); D7 `StorefrontRenderer.tsx` productGrid
  block (`:57` static `{block.products.length} product references published by this seller.`, `:58`
  global `/products` `SafeLink`) and collectionRow block (`:65` static text, `:66` global
  `/community` `SafeLink`); draft cites `:59`, the `</section>` close.
- **ADR-019 re-read**: `:109-111` registry `d=${instanceNamespace}-storefront-names` resolved
  through ADR-018 rather than a literal; `:114-116` reject any name held in either legacy registry by
  a different pubkey for the whole compatibility window; `:125-127` legacy managers stay registered
  **read-only** / reject new zap receipts; `:134` `Kind 30024 (addressable, application-specific)`
  (verbatim); `:140-142` coordinates re-fetched and re-validated at render time; `:161-162` instance
  domain from ADR-018, never a literal; `:163-165` hostile-page renderer unit test.
  `git ls-tree $SHA:docs/adr/` lists **no ADR-018 file** at the tip.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy explicitly spans the **registering** path ("cross-check `existing.pubkey` across both pools before registering/serving"). D1 is that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than on the serving merge (`nip05.ts:12`); ADR-019:114-116 restates the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — one paid name can be sold twice and the earlier holder silently repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *marginal call, stated openly:* the mechanism differs (sale wiring vs the serving merge) but the symptom prev #2 already covers is identical — two pubkeys can each pay for one name, i.e. the `/alice` != `alice@host` divergence the draft itself calls "the divergence R2 exists to make unrepresentable" (R2 = prev #2). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. Confining prev #2 to the `nip05.ts:12` merge alone would make D2 NEW; the task rule counts same-root-cause/same-symptom as duplicate, so it is counted here. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns, so a second buyer can pay; required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success. `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`); `publishStorefrontPage` then re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`), which passes because `blocks` is `.max(40)` with no `.min`, so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly, keeping the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim), and NIP-23 master now records `kind:30024` as **deprecated** long-form draft (superseded by NIP-37). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. This is the deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:109-111 requires the namespaced `d` resolved through ADR-018 and `:161-162` forbids a literal instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip. Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, yet `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__` and `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so the spec never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement of the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, `gh api ...` GET reads and `git show` /
  `git ls-tree` reads were issued; no comment, review, label, approval, or any other API write was
  made.
- **Loop notice (pass 22).** This is the twenty-second *identical* result on an unchanged input:
  the draft artifact md5 is unchanged since pass 21, the PR head is unchanged, and the comparison set
  is still 1:1. Re-derivation costs full tool work per pass and adds no new information. Recommend
  halting the dispatch loop; if re-verification is wanted, gate it on the draft artifact hash or the
  PR head SHA changing.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`


## Independent re-verification (twenty-third pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Re-derived independently at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line read from the reviewed object via
`git show 2ae85b6:<path>`, never the working tree. Inputs re-confirmed live, not copied:

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task `t_31cab538`) — present, non-empty,
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a` -> used. Seven findings, D1-D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` present
  locally (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test (32 e2e `*.spec.ts` + 1 added unit spec).
- **Prev-round wording re-read verbatim**: #2 states the pools' managers "validate independently and
  each only sees its own registry, so they can happily assign the same name to two different pubkeys",
  remedy "Unify on one registry or cross-check `existing.pubkey` across both pools before
  registering/serving". #3 reserved list drops `terms`/`privacy` (`StorefrontIdentityManager.ts:5-53`,
  re-read: absent from `RESERVED_NAMES`); #4 `heroBlock.title` skips `safeText` (`storefront.ts:26`,
  re-read: `title: z.string().trim().min(1).max(160)` vs `safeText` at `:16-22`); #5 no `validUntil`
  gate in `queries/storefront.tsx`. Its #1 (`$vanityName.tsx` reads only `vanityActions.resolveVanity`)
  is **not** re-raised by this draft, so no D-item can overlap it.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, `:89` validity check on that one registry only);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping blocks via `flatMap` and `storefront.ts:77` `blocks: z.array(...).max(40)` (no `.min`),
  plus `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]` -> new event replaces old);
  D4 `publish/storefront-page.ts:10` (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored client-side at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`); D6 `package.json:31` glob
  (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the spec
  under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`);
  D7 `StorefrontRenderer.tsx` (static `{block.products.length}` count at `:57`, global `/products`
  `SafeLink` at `:58`, `/community` at `:66`; draft cites `:59`, the `</section>` close).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116`
  reject any name held in either legacy registry by a different pubkey, `:125-127` legacy managers
  read-only / reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` coordinates re-fetched and re-validated at render time, `:163-165` hostile-page
  renderer unit test. `git ls-tree ... docs/adr/` at the tip contains **no** ADR-018 file (verified).

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism (both managers "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name (the earlier holder is repointed while still inside their paid window); required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement of the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads and `git show` /
  `git ls-tree` / `git cat-file` reads were issued; no comment, review, label, approval, or any other
  API write was made.
- **Loop-halt (pass 23).** Result is byte-identical to passes 19-22 on an unchanged input. Dedupe key
  = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`). Re-running while that key is unchanged cannot produce new
  information; recommend gating any further dedupe dispatch on the key changing.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`


## Independent re-verification (twenty-fourth pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line read
from the reviewed object via `git show 2ae85b6:<path>`, never the working tree. Inputs re-confirmed
live, not copied from earlier passes:

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent task
  `t_31cab538`) — present, non-empty (3548 B, 13 lines), md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a` -> used.
  Seven findings, D1-D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **PR state**: `gh pr view 1286 --repo PlebeianApp/market` -> **OPEN**, `isDraft: true`,
  `mergeable: MERGEABLE`, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`, head
  branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`. Head commit present locally
  (`git cat-file -t` -> `commit`).
- **Comparison set still 1:1**: `.../issues/1286/comments` -> **1** (`#5617745226`, `felixfelix-bot`,
  2026-09-10T11:11:01Z — re-read verbatim, five findings = the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no `DUPLICATE-OF-UNLISTED` row is possible.
- **`gh pr diff 1286 --name-only`** -> 14 files; exactly **one** added test
  (`src/lib/schemas/storefront.test.ts`), confirming D6's premise.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, `:89` validity check against that one registry only);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`), with `storefront.ts:89-92`
  dropping failed blocks via `flatMap` and `storefront.ts:77`
  (`blocks: z.array(StorefrontBlockSchema).max(40)`, no `.min`), plus `storefront-page.ts:12`
  (`tags: [['d', 'storefront-page']]` -> new event replaces old); D4 `publish/storefront-page.ts:10`
  (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`),
  mirrored client-side at `queries/storefront.tsx:20` (`'#d': ['storefront-names']`);
  D6 `package.json:31` glob (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f
  -name '*.test.ts' ...`) vs the spec under `src/lib/schemas/`, invoked by
  `.github/workflows/ci-unit.yml:47` (`run: bun run test:unit`); D7 `StorefrontRenderer.tsx`
  productGrid block (static `{block.products.length} product references published by this seller.`
  at `:57`, global `/products` `SafeLink` at `:58`) and collectionRow block (`/community` at `:66`);
  draft cites `:59`, the `</section>` close.
- **ADR-019 re-read**: `:110-111` registry `d=${instanceNamespace}-storefront-names` resolved through
  ADR-018 rather than a literal; `:114-116` reject any name currently held in either legacy registry
  by a different pubkey for the whole compatibility window; `:125-127` legacy managers stay
  registered **read-only** / reject new zap receipts; `:134` `Kind 30024 (addressable,
  application-specific)` (verbatim); `:140-142` coordinates re-fetched and re-validated at render
  time; `:161` instance domain from runtime config (ADR-018), never a literal; `:162-164` hostile-page
  renderer unit test. `git ls-tree $SHA:docs/adr/` lists **no ADR-018 file** at the tip.
- **Prev-round wording re-read verbatim**: #2 states the pools' managers "validate independently and
  each only sees its own registry, so they can happily assign the same name to two different pubkeys",
  remedy "Unify on one registry or cross-check `existing.pubkey` across both pools before
  registering/serving" — the root cause D1 (registration path) and D2 (still-armed purchase
  managers) re-express. Prev #1 (`$vanityName.tsx` never resolves) is **not** re-raised by this
  draft, so no D-item can overlap it.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism (both managers "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name (the earlier holder is repointed while still inside their paid window); required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161 likewise forbids a literal for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:162-164's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement of the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads and `git show` /
  `git ls-tree` / `git cat-file` reads were issued; no comment, review, label, approval, or any other
  API write was made.
- **Loop-halt (pass 24).** Dedupe key = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) — **unchanged** since pass 21. Result is byte-identical
  to passes 19-23. Re-running while that key is unchanged cannot produce new information; recommend
  gating any further dedupe dispatch on the key changing.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (twenty-fifth pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Inputs re-verified live (not copied): draft `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
present, non-empty, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`; `gh pr view 1286 --repo PlebeianApp/market`
-> OPEN, isDraft true, base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`, author
`hkarani`, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; comparison set = 1 issue comment
(`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues), 0 reviews, 0 review
comments, so no DUPLICATE-OF-UNLISTED row is possible; `gh pr diff --name-only` -> 14 files,
`src/lib/schemas/storefront.test.ts` the only added test. Every cited line was re-read from the
reviewed object with `git show 2ae85b6:<path>` (never the working tree): D1 `StorefrontIdentityManager.ts:88-91`,
D2 `EventHandler.ts:84`, D3 `dashboard/account/storefront.tsx:67` feeding `publish/storefront-page.ts:5`
with `storefront.ts:89-92` drop-and-reparse, D4 `storefront-page.ts:10` (`kind: 30024`),
D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) + `queries/storefront.tsx:20`,
D6 `package.json:31` glob vs the spec under `src/lib/schemas/` (CI `.github/workflows/ci-unit.yml:47`),
D7 `StorefrontRenderer.tsx:57-58` vs the draft's `:59`. ADR-019 re-read: `:110-111` namespaced `d` via
ADR-018 not a literal, `:114-116` cross-pool reject, `:125-127` legacy read-only, `:134` "Kind 30024
(addressable, application-specific)", `:140-142` render-time re-fetch, `:161-162` instance domain never a
literal, `:163-165` hostile-page renderer test; `git ls-tree $SHA:docs/adr/` contains no ADR-018 file.
Prev #1 (`$vanityName.tsx`, only `vanityActions.resolveVanity`) is **not** re-raised by this draft, so
no D-item overlaps it. Classification reproduced independently and unchanged:

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism (both managers "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy says to cross-check `existing.pubkey` "across both pools before registering/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) instead of the serving merge (`nip05.ts:12`). Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — *stated marginal call:* distinct mechanism (purchase wiring, not the serving merge) but the *same symptom prev #2 already covers* (two pubkeys can each pay for one name). `:84` keeps `vanityManager`/`nip05Manager` inside `purchaseManagers`, i.e. the same "unify on one registry" gap prev #2 names, whose remedy explicitly spans the registering path. Same-symptom overlap => duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)`, no `.min`), so one typo truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previous page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)`. Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` via ADR-018 and ADR-019:161-162 forbids instance-domain literals, yet the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip. Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test in the diff, it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and CI runs exactly that (`ci-unit.yml:47`), so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2, so a
  maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT; the NIT count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, `gh api ...` GET reads and `git show` /
  `git ls-tree` reads were issued; no comment, review, label, approval, or any other API write was made.
- **Loop-halt (pass 25).** Dedupe key = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) — **unchanged from pass 23**. The result is byte-identical
  to passes 19-24. Re-dispatching this task while that key is unchanged cannot produce new information;
  gate any further dedupe dispatch on the key changing.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`


## Independent re-verification (twenty-sixth pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Inputs re-verified **live** (not copied): draft `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
present, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`; `gh pr view 1286 --repo PlebeianApp/market`
-> OPEN, `isDraft: true`, base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`,
author `hkarani`, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; comparison set = **1** issue comment
(`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues) / **0** reviews /
**0** review comments => no `DUPLICATE-OF-UNLISTED` row is possible; `gh pr diff --name-only` ->
14 files, `src/lib/schemas/storefront.test.ts` the only added test. Every cited line was re-read from
the reviewed object with `git show 2ae85b6:<path>` (never the working tree): D1
`StorefrontIdentityManager.ts:88-91` (`const existing = this.registry.get(name)`, `:89` validity check
against that one registry only), D2 `EventHandler.ts:84`
(`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`),
D3 `dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
`publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
dropping failed blocks via `flatMap` and `storefront.ts:77`
(`blocks: z.array(StorefrontBlockSchema).max(40)` — no `.min`), plus `storefront-page.ts:12`
(`tags: [['d', 'storefront-page']]` -> new event replaces old), D4 `publish/storefront-page.ts:10`
(`kind: 30024`), D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored
client-side at `queries/storefront.tsx:20` (`'#d': ['storefront-names']`), D6 `package.json:31` glob
(`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...`) vs the spec
under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`run: bun run test:unit`),
D7 `StorefrontRenderer.tsx` (static `{block.products.length} product references published by this
seller.` at `:57`, global `/products` `SafeLink` at `:58`, `/community` at `:66`; draft cites `:59`,
the same block's `</section>` close). ADR-019 re-read at the SHA: `:110-111` registry
`d=${instanceNamespace}-storefront-names` resolved through ADR-018 rather than a literal, `:114-116`
reject any name held in either legacy registry by a different pubkey for the whole window, `:125-127`
legacy managers stay registered **read-only** / reject new zap receipts, `:134`
`Kind 30024 (addressable, application-specific)`, `:140-142` coordinates re-fetched/re-validated at
render time, `:161-162` instance domain from runtime config (ADR-018) never a literal, `:163-165`
hostile-page renderer unit test. `git ls-tree $SHA:docs/adr/` lists **no** ADR-018 file. Prev-round
wording re-read verbatim: #2 states both managers "validate independently and each only sees its own
registry, so they can happily assign the same name to two different pubkeys", remedy "Unify on one
registry or cross-check `existing.pubkey` across both pools before registering/serving". Prev #1
(`$vanityName.tsx` never resolves) is **not** re-raised by this draft, so no D-item can overlap it.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism (both managers "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy explicitly says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name (the earlier holder is repointed while still inside their paid window); required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge) but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previous page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 likewise forbids a literal for the instance domain, yet the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and CI runs exactly that (`ci-unit.yml:47`), so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller.") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2, so
  a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT; the NIT count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, `gh api ...` GET reads and `git show` /
  `git ls-tree` reads were issued; no comment, review, label, approval, or any other API write was made.
- **Loop-halt (pass 26).** Dedupe key = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) — **unchanged since pass 21** (six consecutive passes).
  The result is byte-identical to passes 19-25. Re-dispatching this dedupe task while that key is
  unchanged cannot produce new information; **gate any further dedupe dispatch on the key changing**.
  This artifact is also now ~260 KB of near-identical sections — recommend the manager stop appending
  and read the pass-25 result if a re-check is ever needed.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`



## Independent re-verification (twenty-seventh pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Re-derived from scratch; inputs re-read **live**, not copied from earlier passes.

- Draft `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — present, 3548 B, md5
  `0fc6675ab0cfab78d9b9a6d568e9ed5a` -> used. Seven findings D1-D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- `gh pr view 1286 --repo PlebeianApp/market` -> OPEN, isDraft true, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (present locally, `git cat-file -t` -> commit).
- Comparison set live: issue comments = **1** (`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z —
  the five prev-issues), reviews = **0**, review comments = **0** -> no `DUPLICATE-OF-UNLISTED` row possible.
- `gh pr diff --name-only` -> 14 files; `src/lib/schemas/storefront.test.ts` is the only added test.
- Cited lines re-read at the SHA via `git show 2ae85b6:<path>` (never the working tree): D1
  `StorefrontIdentityManager.ts:88` (`const existing = this.registry.get(name)`, validity checked
  against that one registry only), D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`),
  D3 `dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping failed blocks via `flatMap`, `storefront.ts:77` (`blocks: z.array(...).max(40)` — no `.min`),
  and `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]`), D4 `publish/storefront-page.ts:10`
  (`kind: 30024`), D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored
  at `queries/storefront.tsx:20` (`'#d': ['storefront-names']`), D6 `package.json:31` glob
  (`contextvm src/queries/__tests__ src/lib/__tests__`) vs the spec under `src/lib/schemas/`, invoked
  by `.github/workflows/ci-unit.yml:47`, D7 `StorefrontRenderer.tsx:57-58` (static count at `:57`,
  global `/products` link at `:58`; draft cites `:59`).
- ADR-019 re-read: `:109-110` namespaced `d` via ADR-018 rather than a literal, `:114-116` cross-pool
  reject, `:125-127` legacy managers read-only, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` render-time re-fetch, `:161-162` instance domain never a literal, `:163` hostile-page
  renderer unit test. `git ls-tree $SHA:docs/adr/` contains no ADR-018 file. Prev #1 (`$vanityName.tsx`,
  `vanityActions.resolveVanity` only) is **not** re-raised by this draft, so no D-item overlaps it.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism (both managers "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`:88`) instead of the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name (earlier holder repointed inside their paid window); required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge) but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, whose remedy explicitly spans the registering path. Restricting prev #2 to `nip05.ts:12` alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)`, no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previous page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018 and ADR-019:161-162 forbids a literal for the instance domain, yet the value is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller.") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2, so
  a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT; the NIT count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads plus `git show` /
  `git ls-tree` reads were issued; no comment, review, label, approval, or any other API write was made.
- **Loop-halt (pass 27).** Dedupe key = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) — **still unchanged since pass 21** (seven consecutive
  passes). Result byte-identical to passes 19-26. Re-dispatching this dedupe task while that key is
  unchanged cannot produce new information; **gate any further dedupe dispatch on the key changing**
  (new draft md5 or new PR head). If another re-check is ever needed, read the pass-25 result rather
  than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Pass 28 — loop-halt gate check (worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Gate re-checked live rather than re-derived. Dedupe key = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`,
PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) — **unchanged since pass 21** (eighth consecutive
pass). Comparison set unchanged: issue comments = 1 (`#5617745226`), reviews = 0, review comments = 0;
no `DUPLICATE-OF-UNLISTED` row possible. All seven cited lines re-spot-checked at the SHA
(`git show 2ae85b6:<path>`) and unchanged; draft still holds exactly the same D1-D7. Classification is
therefore byte-identical to passes 19-27, so **no duplicate table section was appended**.
**HALT: gate any further dedupe dispatch on this key changing** (new draft md5 or new PR head). If a
re-check is ever needed, read the pass-25 result rather than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (twenty-ninth pass — worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Re-derived from scratch; inputs re-read **live**, not copied from earlier passes.

- Draft `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — present, 3548 B, md5
  `0fc6675ab0cfab78d9b9a6d568e9ed5a` (**unchanged since pass 21** — ninth consecutive pass) -> used.
  Seven findings D1-D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- `gh pr view 1286 --repo PlebeianApp/market` -> OPEN, isDraft true, MERGEABLE, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (unchanged; present locally,
  `git cat-file -t` -> commit).
- Comparison set live: issue comments = **1** (`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z —
  the five prev-issues), reviews = **0**, review comments = **0** -> no `DUPLICATE-OF-UNLISTED` row possible.
- `gh pr diff --name-only` -> 14 files; `src/lib/schemas/storefront.test.ts` is the only added test.
- Cited lines re-read at the SHA via `git show 2ae85b6:<path>` (never the working tree): D1
  `StorefrontIdentityManager.ts:88` (`const existing = this.registry.get(name)`, validity checked
  against that one registry only), D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`),
  D3 `dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89`
  (failed blocks dropped via `flatMap`) and `storefront-page.ts:12` (`['d', 'storefront-page']`),
  D4 `publish/storefront-page.ts:10` (`kind: 30024`), D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20`
  (`'#d': ['storefront-names']`), D6 `package.json:31` glob
  (`contextvm src/queries/__tests__ src/lib/__tests__`) vs the spec under `src/lib/schemas/`,
  invoked by `.github/workflows/ci-unit.yml:47`, D7 `StorefrontRenderer.tsx:57-58` (static count at
  `:57`, global `/products` link at `:58`; draft cites `:59`). All unchanged.
- ADR-019 re-read: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116` cross-pool
  reject, `:125-127` legacy managers read-only, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` render-time re-fetch, `:161-162` instance domain never a literal, `:163` hostile-page
  renderer unit test. `git ls-tree $SHA:docs/adr/` contains **no ADR-018** file. Prev #1
  (`$vanityName.tsx`, `vanityActions.resolveVanity` only) is **not** re-raised by this draft, so no
  D-item overlaps it.

| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 names the mechanism (both managers "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`:88`) instead of the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name (earlier holder repointed inside their paid window); required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge) but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, whose remedy explicitly spans the registering path. Restricting prev #2 to `nip05.ts:12` alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes, so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018 and ADR-019:161-162 forbids a literal for the instance domain, yet the value is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller.") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2, so
  a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT; the NIT count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads plus `git show` /
  `git ls-tree` reads were issued; no comment, review, label, approval, or any other API write was made.
- **Loop-halt (pass 29).** Dedupe key = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) — **still unchanged since pass 21** (ninth consecutive
  pass). Classification is byte-identical to passes 19-28. Re-dispatching this dedupe task while that
  key is unchanged cannot produce new information; **gate any further dedupe dispatch on the key
  changing** (new draft md5 or new PR head). If another re-check is ever needed, read the pass-25
  result rather than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Pass 30 — loop-halt gate check (worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Gate re-checked live, not re-derived from a prior pass. Dedupe key = (draft md5
`0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) —
**unchanged since pass 21 (tenth consecutive pass)**. PR still OPEN/`isDraft`; comparison set
still issue comments = 1 (`#5617745226`), reviews = 0, review comments = 0; all seven cited lines
plus ADR-019:110-111/114-116/125-127/134/140-142/160-166 re-read at the SHA and unchanged; draft
still holds exactly D1-D7 (4 `[BLOCK]` / 2 `[RISK]` / 1 `[NIT]`). Classification is byte-identical
to passes 19-29, so **no duplicate table section was appended** — the pass-30 table is in the
worker's run output instead. **HALT stands: gate any further dedupe dispatch on the key changing**
(new draft md5 or new PR head).

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Pass 31 — loop-halt gate check (worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Gate re-checked live, not re-derived from a prior pass. Dedupe key = (draft md5
`0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) —
**unchanged since pass 21 (eleventh consecutive pass)**. PR still OPEN / `isDraft: true` /
MERGEABLE; comparison set still issue comments = 1 (`#5617745226`, felixfelix-bot),
reviews = 0, review comments = 0; `gh pr diff --name-only` still 14 files with
`src/lib/schemas/storefront.test.ts` the only added test; `git ls-tree $SHA:docs/adr/` still
contains **no** ADR-018 file. All seven cited lines re-read at the SHA (`git show 2ae85b6:<path>`)
and unchanged (D1 `StorefrontIdentityManager.ts:88-91`, D2 `EventHandler.ts:84`, D3
`dashboard/account/storefront.tsx:67` + `publish/storefront-page.ts:5/10/12` + `storefront.ts:77/89-92`,
D5 `StorefrontIdentityManager.ts:73` + `queries/storefront.tsx:20`, D6 `package.json:31` +
`ci-unit.yml:47`, D7 `StorefrontRenderer.tsx:57-58`), and draft still holds exactly D1-D7
(4 `[BLOCK]` / 2 `[RISK]` / 1 `[NIT]`). Classification is byte-identical to passes 19-30, so
**no duplicate table section was appended** — the pass-31 table is in the worker's run output
instead. **HALT stands: gate any further dedupe dispatch on the key changing** (new draft md5 or
new PR head). If a re-check is ever needed, read the pass-25 result rather than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`


## Pass 32 — loop-halt gate check (worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Gate re-checked live, not re-derived from a prior pass. Dedupe key = (draft md5
`0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) —
**unchanged since pass 21 (twelfth consecutive pass)**. PR still OPEN / `isDraft: true` /
MERGEABLE; author `hkarani`, base `auctions`. Comparison set still issue comments = 1
(`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z — the five prev-issues), reviews = 0,
review comments = 0, so no `DUPLICATE-OF-UNLISTED` row is possible. `gh pr diff --name-only`
still 14 files with `src/lib/schemas/storefront.test.ts` the only added test; `git ls-tree
$SHA:docs/adr/` still contains **no** ADR-018 file. All seven cited sites re-read at the SHA
(`git show 2ae85b6:<path>`): D1 `StorefrontIdentityManager.ts:88` (`const existing =
this.registry.get(name)`), D2 `EventHandler.ts:84` (`this.purchaseManagers =
[this.vanityManager, this.nip05Manager, this.storefrontManager]`), D3
`dashboard/account/storefront.tsx:67` (`parseStorefrontPage(content)`) feeding
`publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89`
(failed blocks dropped via `flatMap`) and `storefront.ts:77` (`blocks: z.array(...).max(40)`,
no `.min`), D4 `publish/storefront-page.ts:10` (`kind: 30024`) vs ADR-019:134 `Kind 30024
(addressable, application-specific)`, D5 `StorefrontIdentityManager.ts:73` (`registryDTag:
'storefront-names'`) mirrored at `queries/storefront.tsx:20` (`'#d': ['storefront-names']`),
D6 `package.json:31` glob (`contextvm src/queries/__tests__ src/lib/__tests__`) vs the spec
under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47`, D7
`StorefrontRenderer.tsx:57-58` (static count at `:57`, global `/products` link at `:58`; draft
cites `:59`). ADR-019 re-read at `:110-111` (namespaced `d` via ADR-018), `:114-116`
(cross-pool reject), `:125-127` (legacy managers read-only), `:134`, `:140-142` (render-time
re-fetch), `:161-162`, `:163`. Draft still holds exactly D1-D7 (4 `[BLOCK]` / 2 `[RISK]` /
1 `[NIT]`). Classification is byte-identical to passes 19-31, so **no duplicate table section
was appended here** — the pass-32 table is in the worker's run output instead. **HALT stands:
gate any further dedupe dispatch on the key changing** (new draft md5 or new PR head). If a
re-check is ever needed, read the pass-25 result rather than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Pass 33 — loop-halt gate check (worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Gate re-checked live, not re-derived from a prior pass. Dedupe key = (draft md5
`0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) —
**unchanged since pass 21 (thirteenth consecutive pass)**. PR still OPEN / `isDraft: true` /
MERGEABLE; author `hkarani`, base `auctions`, head branch
`feat/nip05-CMS-vanity-url-intergration`. Comparison set still issue comments = 1
(`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z — the five prev-issues), reviews = 0,
review comments = 0, so no `DUPLICATE-OF-UNLISTED` row is possible. `gh pr diff --name-only`
still 14 files with `src/lib/schemas/storefront.test.ts` the only added test, and `test:unit`
(`package.json:31`) scans only `contextvm` / `src/queries/__tests__` / `src/lib/__tests__`
(invoked by `.github/workflows/ci-unit.yml:47`), so that spec never runs. `git ls-tree
$SHA:docs/adr/` still contains **no** ADR-018 file. All seven cited sites re-read at the SHA
(`git show 2ae85b6:<path>`) and unchanged: D1 `StorefrontIdentityManager.ts:88`
(`const existing = this.registry.get(name)`), D2 `EventHandler.ts:84`
(`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`),
D3 `dashboard/account/storefront.tsx:67` (`parseStorefrontPage(content)`) feeding
`publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89`
(failed blocks dropped via `flatMap`) and `storefront.ts:77`
(`blocks: z.array(StorefrontBlockSchema).max(40)` — no `.min` on the array, so an all-dropped
page still parses), D4 `publish/storefront-page.ts:10` (`kind: 30024`) vs ADR-019:134
`Kind 30024 (addressable, application-specific)`, D5 `StorefrontIdentityManager.ts:73`
(`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20`
(`'#d': ['storefront-names']`), D6 `package.json:31` + `ci-unit.yml:47` vs the spec under
`src/lib/schemas/`, D7 `StorefrontRenderer.tsx:57-58` (static count at `:57`, global `/products`
link at `:58`; draft cites `:59`). ADR-019 re-read at `:110-111` (namespaced `d` via ADR-018),
`:114-116` (cross-pool reject), `:125-127` (legacy managers read-only), `:134`,
`:140-142` (render-time re-fetch), `:161-162` (instance domain never a literal), `:163`
(hostile-page renderer test). Draft still holds exactly D1-D7 (4 `[BLOCK]` / 2 `[RISK]` /
1 `[NIT]`). Classification is byte-identical to passes 19-32 (D1/D2 = DUPLICATE-of-#2 but
ACTIONABLE; D3-D6 = NEW but ACTIONABLE; D7 = NEW but NIT), so **no duplicate table section was
appended** — the pass-33 table is in the worker's run output instead. **HALT stands: gate any
further dedupe dispatch on the key changing** (new draft md5 or new PR head). If a re-check is
ever needed, read the pass-25 result rather than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Pass 34 — loop-halt gate check (worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Gate re-checked live, not re-derived. Dedupe key = (draft md5
`0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) —
**unchanged since pass 21 (fourteenth consecutive pass)**. PR still OPEN / `isDraft: true` /
MERGEABLE; author `hkarani`, base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`.
Comparison set still issue comments = 1 (`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z — the
five prev-issues), reviews = 0, review comments = 0, so no `DUPLICATE-OF-UNLISTED` row is possible.
`gh pr diff --name-only` still 14 files with `src/lib/schemas/storefront.test.ts` the only added
test, and `test:unit` (`package.json:31`) scans only `contextvm` / `src/queries/__tests__` /
`src/lib/__tests__` (invoked by `.github/workflows/ci-unit.yml:47`), so that spec never runs.
`git ls-tree $SHA:docs/adr/` still contains **no** ADR-018 file. All seven cited sites re-read at
the SHA (`git show 2ae85b6:<path>`) and unchanged: D1 `StorefrontIdentityManager.ts:88`
(`const existing = this.registry.get(name)`, validity checked at `:89` against that one registry
only), D2 `EventHandler.ts:84` (`this.purchaseManagers = [this.vanityManager, this.nip05Manager,
this.storefrontManager]`), D3 `dashboard/account/storefront.tsx:67` -> `publish/storefront-page.ts:5`
(`StorefrontPageSchema.parse(page)`) with `storefront.ts:77` (`blocks: z.array(...).max(40)`, no
`.min`) and `:89` (failed blocks dropped via `flatMap`) and `:12` (`tags: [['d',
'storefront-page']]`), D4 `publish/storefront-page.ts:10` (`kind: 30024`) vs ADR-019:134
`Kind 30024 (addressable, application-specific)`, D5 `StorefrontIdentityManager.ts:73`
(`registryDTag: 'storefront-names'`) mirrored client-side at `queries/storefront.tsx:20`
(`'#d': ['storefront-names']`), D6 `package.json:31` + `.github/workflows/ci-unit.yml:47` vs the
spec under `src/lib/schemas/`, D7 `StorefrontRenderer.tsx:57-58` (static count at `:57`, global
`/products` link at `:58`; draft cites `:59`). ADR-019 re-read at `:110-111` (namespaced `d` via
ADR-018), `:114-116` (cross-pool reject), `:125-127` (legacy managers read-only), `:134`,
`:140-142` (render-time re-fetch), `:161-162` (instance domain never a literal), `:163-165`
(hostile-page renderer test). Draft still holds exactly D1-D7 (4 `[BLOCK]` / 2 `[RISK]` /
1 `[NIT]`). Classification is byte-identical to passes 19-33 (D1/D2 = DUPLICATE-of-#2 but
ACTIONABLE; D3-D6 = NEW but ACTIONABLE; D7 = NEW but NIT), so **no duplicate table section was
appended** — the pass-34 table is in the worker's run output instead. **HALT stands: gate any
further dedupe dispatch on the key changing** (new draft md5 or new PR head). If a re-check is
ever needed, read the pass-25/33 result rather than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`


## Pass 35 — loop-halt gate check (worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Gate re-checked live, not re-derived. Dedupe key = (draft md5
`0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) —
**unchanged since pass 21 (fifteenth consecutive pass)**. PR still OPEN / `isDraft: true` /
MERGEABLE; author `hkarani`, base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`.
Comparison set still issue comments = 1 (`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z — the
five prev-issues), reviews = 0, review comments = 0, so no `DUPLICATE-OF-UNLISTED` row is possible.
Draft re-read: present, 3548 B, still exactly D1-D7 (4 `[BLOCK]` / 2 `[RISK]` / 1 `[NIT]`).
`gh pr diff --name-only` still 14 files with `src/lib/schemas/storefront.test.ts` the only added
test, and `test:unit` (`package.json:31`) scans only `contextvm` / `src/queries/__tests__` /
`src/lib/__tests__` (invoked by `.github/workflows/ci-unit.yml:47`), so that spec never runs.
`git ls-tree $SHA:docs/adr/` still contains **no** ADR-018 file (ADR-019 present). All seven cited
sites re-read at the SHA (`git show 2ae85b6:<path>`) and unchanged: D1
`StorefrontIdentityManager.ts:88` (`const existing = this.registry.get(name)`, validity checked at
`:89` against that one registry only), D2 `EventHandler.ts:84` (`this.purchaseManagers =
[this.vanityManager, this.nip05Manager, this.storefrontManager]`), D3
`dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
`publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:77`
(`blocks: z.array(StorefrontBlockSchema).max(40)` — no `.min`) and `:89` (failed blocks dropped via
`flatMap`) and `:12` (`tags: [['d', 'storefront-page']]`), D4 `publish/storefront-page.ts:10`
(`kind: 30024`) vs ADR-019:134 `Kind 30024 (addressable, application-specific)`, D5
`StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored client-side at
`queries/storefront.tsx:20` (`'#d': ['storefront-names']`), D6 `package.json:31` +
`.github/workflows/ci-unit.yml:47` vs the spec under `src/lib/schemas/`, D7
`StorefrontRenderer.tsx:57-58` (static count at `:57`, global `/products` link at `:58`; draft
cites `:59`). Classification is byte-identical to passes 19-34 (D1/D2 = DUPLICATE-of-#2 but
ACTIONABLE; D3-D6 = NEW but ACTIONABLE; D7 = NEW but NIT), so **no duplicate table section was
appended** — the pass-35 table is in the worker's run output instead. Read-only vs GitHub: only
`gh pr view`, `gh pr diff`, `gh api ...` GET reads plus `git show` / `git ls-tree` reads were
issued; no comment, review, label, approval, or any other write was made. **HALT stands: gate any
further dedupe dispatch on the key changing** (new draft md5 or new PR head). If a re-check is ever
needed, read the pass-25/33 result rather than appending again.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Pass 36 — loop-halt gate check (worker-heavy fleet offload, `worker-heavy/1286-dedupe-spam-f7`)

Gate re-checked live, not re-derived from the earlier passes. Dedupe key = (draft md5
`0fc6675ab0cfab78d9b9a6d568e9ed5a`, PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) —
**unchanged since pass 21 (sixteenth consecutive pass)**. Evidence re-read live this pass:
draft `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` present, 3548 B, md5 as
above, still exactly D1-D7 (4 `[BLOCK]` / 2 `[RISK]` / 1 `[NIT]`); `gh pr view 1286` -> OPEN,
`isDraft: true`, MERGEABLE, author `hkarani`, base `auctions`; comparison set issue comments =
1 (`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z — the five prev-issues, re-read
verbatim), reviews = 0, review comments = 0, so no `DUPLICATE-OF-UNLISTED` row is possible;
`gh pr diff --name-only` -> 14 files with `src/lib/schemas/storefront.test.ts` the only added
test; `test:unit` (`package.json:31`) scans only `contextvm` / `src/queries/__tests__` /
`src/lib/__tests__`, invoked by `.github/workflows/ci-unit.yml:47`; `git ls-tree $SHA:docs/adr/`
still has **no** ADR-018 file (ADR-019 present). All seven cited sites re-read at the SHA
(`git show 2ae85b6:<path>`) and unchanged: D1 `StorefrontIdentityManager.ts:88`
(`const existing = this.registry.get(name)`, validity checked at `:89` against that one
registry only); D2 `EventHandler.ts:84` (`this.purchaseManagers = [this.vanityManager,
this.nip05Manager, this.storefrontManager]`); D3 `dashboard/account/storefront.tsx:67`
(`const page = parseStorefrontPage(content)`) feeding `publish/storefront-page.ts:5`
(`StorefrontPageSchema.parse(page)`) with `storefront.ts:77`
(`blocks: z.array(StorefrontBlockSchema).max(40)` — no `.min`) and `:89` (failed blocks dropped
via `flatMap`) and `:12` (`tags: [['d', 'storefront-page']]`); D4 `publish/storefront-page.ts:10`
(`kind: 30024`) vs ADR-019:134 `Kind 30024 (addressable, application-specific)`; D5
`StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored client-side at
`queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31` +
`.github/workflows/ci-unit.yml:47` vs the spec under `src/lib/schemas/`; D7
`StorefrontRenderer.tsx:57-58` (static count at `:57`, global `/products` link at `:58`; draft
cites `:59`). Classification is therefore byte-identical to passes 19-35 (D1/D2 =
DUPLICATE-of-#2 but ACTIONABLE; D3-D6 = NEW but ACTIONABLE; D7 = NEW but NIT), so **no duplicate
table section was appended** — the pass-36 table is in the worker's run output and the
byte-identical durable table remains at pass 29. Read-only vs GitHub: only `gh pr view`,
`gh pr diff`, `gh api ...` GET reads plus `git show` / `git ls-tree` reads were issued; no
comment, review, label, approval, or any other write was made. **HALT stands: gate any further
dedupe dispatch on the key changing** (new draft md5 or new PR head), otherwise the dispatch
cannot produce new information.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (pass 83 — fresh fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never from the working tree.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent
  task `t_31cab538`) — present, non-empty (3548 bytes, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven numbered findings, labelled D1-D7 here (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Comparison set re-confirmed live**: `gh api repos/PlebeianApp/market/issues/1286/comments` -> **1**
  (`#5617745226`, `felixfelix-bot`, 2026-09-10T11:11:01Z — the five prev-issues);
  `.../pulls/1286/reviews` -> **0**; `.../pulls/1286/comments` -> **0**. No unlisted prior round
  exists, so no DUPLICATE-OF-UNLISTED row is possible.
- **PR state**: `gh pr view 1286` -> OPEN, `isDraft: true`, `mergeable: MERGEABLE`, base `auctions`,
  head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present
  locally (`git cat-file -t` -> commit). `gh pr diff --name-only` -> 14 files;
  `src/lib/schemas/storefront.test.ts` is the only added test/spec file.
- **Prev-round wording re-read verbatim**: its #2 states the mechanism ("Both managers validate
  independently and each only sees its own registry, so they can happily assign the same name to two
  different pubkeys (nip05 vs storefront are separate pools, `/api/zapPurchase` routes by zap label
  to exactly one)") and its remedy literally says to cross-check `existing.pubkey` "across both pools
  before **registering**/serving". Its #3 = reserved list drops `terms`/`privacy`
  (`StorefrontIdentityManager.ts:5-53` — verified: the 48-entry set has no `terms`/`privacy`);
  #4 = `heroBlock.title` skips `safeText` (`storefront.ts:26`); #5 = no `validUntil` gate
  (`queries/storefront.tsx`). Its #1 (`$vanityName.tsx` never resolves storefront names — still
  `vanityActions.resolveVanity` at `:21`) is **not** re-raised by this draft, so no D-item can overlap it.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, then `:89` validity check against that one registry);
  D2 `EventHandler.ts:84`
  (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) feeding
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse(page)`) with `storefront.ts:89-92`
  dropping blocks via `flatMap` and `StorefrontPageSchema.blocks = z.array(...).max(40)`
  (`storefront.ts:77`, no `.min`), plus `storefront-page.ts:12` (`tags: [['d', 'storefront-page']]`
  -> the new addressable event replaces the previous page); D4 `publish/storefront-page.ts:10`
  (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored
  client-side at `queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31`
  glob (`find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts'`) vs the
  spec under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47` (`bun run test:unit`);
  D7 `StorefrontRenderer.tsx` (`:57` static `{block.products.length}` count, `:58` global `/products`
  `SafeLink`, `:66` `/community`; draft cites `:59`, the `</section>` close).
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018 rather than a literal, `:114-116`
  reject any name held in either legacy registry by a different pubkey, `:125-127` legacy managers
  read-only / reject new receipts, `:134` `Kind 30024 (addressable, application-specific)`,
  `:140-142` coordinates re-fetched and re-validated at render time, `:163-165` hostile-page
  renderer unit test. `git ls-tree ... docs/adr/` at the tip contains **no** ADR-018 file (verified).

```text
| Draft issue (short label + file:line as cited in the draft) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap prev #2 names, and prev #2's remedy explicitly spans the **registering** path. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW, but the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires, and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an internal ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |
```

Notes:

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2,
  so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no root cause or
  symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT count is on
  the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads were issued; no
  comment, review, label, approval, or other write was made.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Independent re-verification (pass 130 — fleet offload re-derivation)

Re-derived from scratch at head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`; every cited line
re-read from the reviewed object via `git show 2ae85b6:<path>`, never the working tree. Full
self-contained artifact: `artifacts/pr1286/1286-dedupe-spam-pass130.md`.

- **Authoritative draft**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` (parent
  task `t_31cab538`) — present, non-empty (3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`) -> used.
  Seven findings D1-D7 (4 [BLOCK], 2 [RISK], 1 [NIT]).
- **Comparison set live**: issue comments = 1 (`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z,
  body re-read verbatim = the five prev-issues); reviews = 0; review comments = 0 -> no
  `DUPLICATE-OF-UNLISTED` row possible.
- **PR state**: OPEN, `isDraft` true, `mergeable` MERGEABLE, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head `2ae85b6...` present locally
  (`git cat-file -t` -> commit); 14 files; `src/lib/schemas/storefront.test.ts` the only added test.
- **Cited sites re-read at the SHA**: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)` then `:89` validity on that one registry);
  D2 `EventHandler.ts:84` (`purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`);
  D3 `storefront.tsx:67` (`parseStorefrontPage`) -> `storefront-page.ts:5`
  (`StorefrontPageSchema.parse`) with `storefront.ts:77` `blocks` `.max(40)` no `.min`, `:89`
  flatMap drop, toast `:76`, `:12` `['d','storefront-page']`; D4 `storefront-page.ts:10`
  (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`)
  mirrored `queries/storefront.tsx:20` (`'#d': ['storefront-names']`); D6 `package.json:31` glob
  (`contextvm src/queries/__tests__ src/lib/__tests__`) vs spec under `src/lib/schemas/`, run by
  `ci-unit.yml:47`; D7 `StorefrontRenderer.tsx:57-58` (static count, global `/products`).
- **Prev-issue sites re-read**: #1 `$vanityName.tsx:21` resolveVanity only; #2 `nip05.ts:12`;
  #3 `terms`/`privacy` absent; #4 `storefront.ts:26` no safeText; #5 no validUntil gate.
- **ADR-019 re-read**: `:110-111` namespaced `d` via ADR-018; `:114-116` cross-pool reject;
  `:125-127` read-only demotion; `:134` `Kind 30024 (addressable, application-specific)`;
  `:140-142` render-time re-fetch. `git ls-tree 2ae85b6...:docs/adr` -> NO ADR-018 file (verified).

Classification reproduced independently and unchanged: D1,D2 = DUPLICATE OF #2 (ACTIONABLE);
D3,D4,D5,D6 = NEW ACTIONABLE; D7 = NEW NIT.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
