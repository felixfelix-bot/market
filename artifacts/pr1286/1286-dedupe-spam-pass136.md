# PR #1286 — dedupe + spam classification, pass 136 (independent re-derivation)

Task: classify every issue in the parent task's draft review of PlebeianApp/market PR #1286
(head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) on two independent axes:
(a) NEW vs the five previously-raised issues, (b) ACTIONABLE vs NIT.
Read-only. No GitHub write of any kind was made.

## Inputs verified under my own commands (pass 136)

- Draft artifact (authoritative issue list): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  — present, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, 7 findings D1–D7.
- PR: `gh pr view 1286` → OPEN, **draft**, MERGEABLE, base `auctions`, head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (UNCHANGED), 14 changed files.
- Comparison set: `pulls/1286/comments` = 0, `pulls/1286/reviews` = 0,
  `issues/1286/comments` = 1 → comment id `5617745226` (body read verbatim; it contains exactly
  the five prev-issues). No other previously-raised review surface exists.

## Code re-read at the head SHA (not by title or filename)

- `src/server/StorefrontIdentityManager.ts` — `validateRegistration` :84–93 consults only
  `this.registry.get(name)`; `registryDTag: 'storefront-names'` literal at :73; `RESERVED_NAMES`
  :5–53 has no `terms`/`privacy`.
- `src/server/http/nip05.ts` :10–12 — `{ ...legacy.names, ...unified.names }`.
- `src/server/EventHandler.ts` :84 — `purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`.
- `src/routes/_dashboard-layout/dashboard/account/storefront.tsx` :66–71 — publish calls the
  **lenient** `parseStorefrontPage(content)` (:67) and proceeds when it returns non-null.
- `src/lib/schemas/storefront.ts` :89 — `flatMap` silently drops invalid blocks; :94 then
  `StorefrontPageSchema.parse` succeeds on the reduced array (no `min` on `blocks`).
  `src/publish/storefront-page.ts` :5 re-parses strictly — but only on the already-dropped page;
  :10 `kind: 30024`.
- `src/components/storefront/StorefrontRenderer.tsx` :53–68 — `productGrid` prints
  `block.products.length` + link `/products`; `collectionRow` prints a static sentence + link
  `/community`; no coordinate fetch/resolve.
- `src/queries/storefront.tsx` :20 `'#d': ['storefront-names']`.
- `package.json` :31 `test:unit` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ …`;
  the new test is `src/lib/schemas/storefront.test.ts` → outside every glob root.
- `docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md` (332 lines, present at the SHA):
  :110–111 namespaced `d`; :114–116 reject names held in either legacy registry; :125–127 legacy
  managers read-only; :134 `kind 30024 … addressable, application-specific`; :140–142 re-fetch/
  re-validate at render; :163 renderer unit test. **No ADR-018 file exists at this tip** (the head
  ADR list has ADR-001..016/019 but no ADR-018).
- External spec check: NIP-23 §Description — “Deprecated: `kind:30024` was used for long-form
  drafts (self-encrypted nip04, same format as `kind:30023`)… use NIP-37 instead.”

## Classification

| Draft issue (as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| D1 `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be sold again | **DUPLICATE OF #2** — same root cause reached by a different path: two name registries that validate independently and each see only their own pool. prev#2 states this defect verbatim (“both managers validate independently and each only sees its own registry … they can happily assign the same name to two different pubkeys”) and already names the fix (“cross-check `existing.pubkey` across both pools before registering/serving”); D1 is that same defect on the claim/validation path rather than the resolution-merge path | **ACTIONABLE (already tracked by #2)** — required change: cross-check the legacy `nip05-names`/`vanity-urls` pools in `validateRegistration` before granting the name |
| D2 `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so legacy receipts still mint entries for a name the unified registry owns | **DUPLICATE OF #2** — same root cause: the unified registry was added while both legacy registries remain live and mutually unaware, so one name can be minted into two pools; reached via the write/arming path instead of the merge path (near-duplicate by root cause) | **ACTIONABLE (already tracked by #2)** — required change: demote `vanityManager`/`nip05Manager` to read-only resolvers per ADR-019:125–127 and reject new zap receipts |
| D3 `…/dashboard/account/storefront.tsx:67` — publish gate reuses the lenient *render* parser (drops invalid blocks at `schemas/storefront.ts:89`), so one typo publishes a truncated page behind a success toast and overwrites `d=storefront-page` | **NEW** — no prev issue touches the publish path; prev#4 (`schemas/storefront.ts:26` `heroBlock.title` skips `safeText`) is a different root cause (a missing sanitiser on one field, not lenient-parse reuse). Verified in code: `parseStorefrontPage` at :67 returns a non-null page with the bad block dropped, and the strict re-parse at `publish/storefront-page.ts:5` never sees it | **ACTIONABLE** — required change: validate with the strict `StorefrontPageSchema` at the publish call site (or make the lenient parser report drops) so an invalid block errors out instead of silently truncating/overwriting the live page |
| D4 `src/publish/storefront-page.ts:10` — `kind: 30024` is NIP-23's long-form *draft* kind, not “addressable, application-specific” as ADR-019:134 claims | **NEW** — no prev issue concerns the event kind | **ACTIONABLE** — required change: use a free 3xxxx kind for `d=storefront-page` and correct ADR-019:134 (NIP-23 deprecation of 30024 verified against the spec) |
| D5 `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names` while ADR-019:110–111 mandates `d=${instanceNamespace}-storefront-names`; same literal mirrored at `queries/storefront.tsx:20` | **NEW** — different file:line and concern from prev#3 (`:5` reserved list) and prev#5 (`queries/storefront.tsx:56` expiry); no prev issue mentions instance namespacing | **ACTIONABLE** — required change: derive the `d` tag as `${instanceNamespace}-storefront-names` from instance config per ADR-019:110–111 (and mirror it in `queries/storefront.tsx:20`) instead of the shared literal |
| D6 `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob (`package.json:31`), so CI never runs it | **NEW** — no prev issue concerns test wiring; all five prev-issues are source-behaviour | **ACTIONABLE** — required change: move the test under `src/lib/__tests__` (or add `src/lib/schemas` to the `test:unit` glob), since the vendored path is matched by no glob root and the new manager/renderer/publish code has no coverage |
| D7 `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue covers the renderer's coordinate handling | **NIT** — the draft itself labels it `[NIT]`; the render path is a count-and-link placeholder that renders no denormalised data, so the residual effect is presentational/UX completeness rather than a correctness or data-loss defect, and on its own it does not compel a code change |

## Count arithmetic note (honesty)

Total issues = 7. Split: `NEW-and-ACTIONABLE` = D3, D4, D5, D6 (4); `DUPLICATE` (novelty axis) = D1, D2 (2);
`NIT` (spam axis) = D7 (1). D7 is NEW-but-NIT, which the task explicitly allows, so
`X + Y (= 6) != total (7)`; the required one-line form counts novelty-X and spam-Z separately.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
