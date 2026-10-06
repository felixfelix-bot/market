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
