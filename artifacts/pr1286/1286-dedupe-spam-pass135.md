# PR #1286 — dedupe vs 5 prev-issues + spam check (pass 135, READ-ONLY)

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
Repo: PlebeianApp/market · PR #1286 "feat: nip05 cms vanity url intergration" ·
head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
Workspace: /home/c03rad0r/repos/market · branch `worker-heavy/1286-dedupe-spam-f7`
Card: `plebeian-pr-reviews:t_be177680`

## Inputs verified live this pass (read-only, independent of prior passes)

- Authoritative parent draft artifact PRESENT:
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — 3548 B,
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, 7 findings D1-D7 (4 BLOCK, 2 RISK, 1 NIT).
- PR live state: `state=OPEN`, `isDraft=true`, `mergeable=MERGEABLE`, base `auctions`,
  head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` UNCHANGED vs the task spec,
  14 changed files (+680/-9).
- Comparison set: issue comments = 1 (`#5617745226`, felixfelix-bot) = the five
  prev-issues verbatim; reviews = 0; review comments = 0. No unlisted prior review round
  => no `DUPLICATE-OF-UNLISTED` row is possible.
- Every cited line re-read at the SHA via `git show 2ae85b6...:<path>` (evidence section).
- `docs/adr/` at the tip contains NO `ADR-018`; ADR-019:110-111/:161-162 prerequisites
  (instance-namespace config) are therefore unmet at this tip.

## Deliverable — dedupe + spam table

| Draft issue | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** [BLOCK] `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name still held in a legacy pool can be bought again | **DUPLICATE OF #2** — same root cause, different path. Prev#2: "Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", prescribing a cross-check of `existing.pubkey` "across both pools before **registering**/serving". D1 is that cross-check missing on the registration path (`:88 this.registry.get(name)`); prev#2 named the serving merge (`nip05.ts:12`). ADR-019:114-116 states the identical requirement. | **ACTIONABLE** — a paid name sold twice (earlier holder silently repointed). Required change: reject a name held by a different pubkey in EITHER legacy registry. *Already tracked as prev#2.* |
| **D2** [BLOCK] `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so legacy receipts still mint entries for a name the unified registry already owns | **DUPLICATE OF #2** — *near-duplicate by root cause, stated explicitly:* mechanism differs (sale wiring vs serving merge) but the root cause (pools not unified => one name representable to two pubkeys) and the symptom ("two pubkeys can each pay for `alice`") are prev#2's. `:84 purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`; prev#2's remedy already spans "registering/serving". | **ACTIONABLE** — a second buyer can pay for a name the unified registry already owns. Required change: register the legacy managers as read-only resolvers that reject new zap receipts (ADR-019:125-127). *Already tracked as prev#2.* |
| **D3** [BLOCK] `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient RENDER parser, so invalid blocks are silently dropped | **NEW** — no prev issue touches the publish-vs-render validation split. Prev#4 = missing `safeText` on one field (`heroBlock.title`, different root cause in the same file); prev#5 = page-expiry gate; prev#1 = route name resolution. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops invalid blocks (`schemas/storefront.ts:89-91` flatMap), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`), which passes, so one typo publishes a truncated page, the success toast fires, and the `d=storefront-page` event (`:12`) overwrites the prior page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** [BLOCK] `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's deprecated long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 states | **NEW** — no prev issue mentions the page event kind. (ADR-019 itself considers/rejects kind `30023`, but that is not one of the five prev-issues and is a different kind.) | **ACTIONABLE** — spec-conformance mismatch with a named edit either way: `kind: 30024` hard-coded (`:10`) vs ADR-019:134 verbatim "Kind `30024` (addressable, application-specific)". Required change: use a free addressable 3xxxx kind and correct ADR-019:134. *(Whether NIP-23 collides in practice is the code-truth worker's call; the code/ADR discrepancy names an exact edit regardless.)* |
| **D5** [RISK] `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names` vs ADR-019:110-111 `d=${instanceNamespace}-storefront-names`; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same FILE as prev#3 (`:5-53 RESERVED_NAMES`) but different line, function and root cause; nothing in the five concerns the registry `d` tag or instance namespacing. Deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation + multi-instance namespace collision: literal hard-coded server-side (`:73 registryDTag: 'storefront-names'`) and client-side (`queries/storefront.tsx:20 '#d': ['storefront-names']`); ADR-019:161-162 forbids literals and no ADR-018 file / namespace helper exists at tip. Required change: resolve `d` from instance config on both sides. |
| **D6** [RISK] `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — asserted guardrail unenforced: the only added test in the 14-file diff sits under `src/lib/schemas/`, but `test:unit` (`package.json` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...`) excludes it, so CI stays green regardless (ADR-019:163 renderer-hostility guardrail unmet). Required change: move the spec under `src/lib/__tests__/` (or widen the glob). |
| **D7** [NIT] `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns renderer coordinate resolution (prev#5 = page-expiry gate; prev#1 = name->pubkey route resolution). | **NIT** — display fidelity only: a static count plus a global `/products` / `/community` link replace coordinate resolution. The count equals the number of schema-valid coordinates (no fabricated product data) and no data/security/correctness invariant breaks; ADR-019:140-142 is architectural intent for step 3, and turning the summary line into resolved product cards is new feature scope, not a fix. The draft's own tag is [NIT]. *Latent tension noted for the reviewer: if ADR-019:140-142 is read as binding, this flips to ACTIONABLE.* |

## REQUIRED CLOSING LINE

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

Axes kept independent: D1/D2 are DUPLICATE-but-ACTIONABLE (already tracked as prev#2);
D7 is NEW-but-NIT (the task explicitly allows "an issue can be NEW-but-NIT"). Under this data set
no DUPLICATE-but-NIT exists, so the three labels partition all seven and X+Y+Z = 7 = total issues.
(The task's shorthand "X+Y = total" holds only when no NEW-but-NIT exists; D7 is exactly that
anticipated case. Reading the axes strictly: NEW = 5 and NIT = 1, of which 4 of the 5 NEW are
ACTIONABLE.)

## Evidence re-read at `2ae85b6` this pass

- D1 `StorefrontIdentityManager.ts:84-93` — `validateRegistration` reads `this.registry.get(name)` only; ADR-019:114-116 requires rejecting names held in either legacy registry.
- D2 `EventHandler.ts:84` — `purchaseManagers = [vanityManager, nip05Manager, storefrontManager]` (both legacy managers still constructed and armed as sellers); ADR-019:125-127 requires read-only demotion.
- D3 `account/storefront.tsx:66-76` (`parseStorefrontPage` -> success toast) - `schemas/storefront.ts:84-98` (flatMap drop at :89-91, then `StorefrontPageSchema.parse` on the residue at :94) - `publish/storefront-page.ts:5,10,12`.
- D4 `publish/storefront-page.ts:10 kind: 30024` vs ADR-019:134.
- D5 `StorefrontIdentityManager.ts:73 registryDTag: 'storefront-names'` + `queries/storefront.tsx:20 '#d': ['storefront-names']` vs ADR-019:110-111; ADR-018 absent; no namespace helper in tree.
- D6 `src/lib/schemas/storefront.test.ts:1` (sibling of `storefront.ts`, NOT under `__tests__/`) vs `package.json` `test:unit` glob; file confirmed present in the PR's 14-file diff.
- D7 `StorefrontRenderer.tsx:52-68` (productGrid/collectionRow bodies: static count + global browse links).
- Prev sites: prev#1 `$vanityName.tsx:21` (`vanityActions.resolveVanity`) - prev#2 `nip05.ts:10-12` (merge) - prev#3 `StorefrontIdentityManager.ts:5-53` (no `terms`/`privacy`) - prev#4 `schemas/storefront.ts:26` (`title: z.string().trim().min(1).max(160)`, no `safeText`) - prev#5 `queries/storefront.tsx:39-54` (no `validUntil` filter).
- ADR-019 read at the SHA (333 lines incl. trailing blank): :110-111, :114-116, :125-127, :134, :140-142, :161-163 verified verbatim.

## READ-ONLY CONFIRMATION

Only `gh pr view`, `gh api ...(GET)`, and `git show` / `git ls-tree` reads were issued.
No GitHub comment, review, label, approval or any other API write was made.
