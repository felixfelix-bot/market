# PR #1286 dedupe + spam-check — pass 51

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues
vs 5 known prev-issues and spam-check each." Read-only vs GitHub/PR. No push, no
GitHub write, no comment/review/label. Committed locally only.

## Key re-verified live this pass (NOT taken on trust from the receipts)

- Draft (parent task `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  present, non-empty, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`. Seven findings
  D1-D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`). No other draft artifact for #1286 exists
  (`find /home/c03rad0r/worktrees -iname '*1286*DRAFT*'` = 1 hit).
- PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (OPEN, `isDraft: true`, MERGEABLE,
  base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`).
- Comparison set = the *only* issue comment, `#5617745226` by `felixfelix-bot`
  (2026-09-10T11:11:01Z, the five prev-issues); `pulls/1286/reviews` length = 0;
  `pulls/1286/comments` length = 0 -> no `DUPLICATE-OF-UNLISTED` row is possible.
- **Dedupe key UNCHANGED**: identical to the pass-21..50 key (draft md5/sha256 + head OID).

Independent re-read this pass at the SHA (`git show`, not the working tree):
`StorefrontIdentityManager.ts` `:5-53` (RESERVED_NAMES — no `terms`/`privacy`), `:73`
(`registryDTag: 'storefront-names'`), `:84-93` (validator regex + reserved + `this.registry.get(name)`
only, validity checked against that one registry); `EventHandler.ts:84`
(`purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`); `nip05.ts:10-12`
(two `buildNostrJson` builds, `{ ...legacy.names, ...unified.names }`); `queries/storefront.tsx:20`
(`'#d': ['storefront-names']`), `:56` (`useStorefrontPage`); `lib/schemas/storefront.ts:26`
(`heroBlock.title` = `z.string().trim().min(1).max(160)`, no safeText), `:77` (`blocks`
`.max(40)`, no `.min`), `:89-94` (`flatMap` drops failed blocks, then `StorefrontPageSchema.parse`);
`publish/storefront-page.ts:5,10,12` (`StorefrontPageSchema.parse` of the residue, `kind: 30024`,
`d=storefront-page`); `dashboard/account/storefront.tsx:67,76` (`parseStorefrontPage` gate, success toast);
`components/storefront/StorefrontRenderer.tsx:57,58,59,66` (static count, `/products`,
`</section>` close, `/community`); `package.json:31` (`test:unit` glob = `find contextvm
src/queries/__tests__ src/lib/__tests__ ...`, excludes `src/lib/schemas/`).
`gh pr diff --name-only` = 14 files; `src/lib/schemas/storefront.test.ts` the only test.
ADR-019 at the tip = `docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md`;
`:110-111` (`d=${instanceNamespace}-storefront-names` resolved through ADR-018), `:114-116`
(reject any name held in either legacy registry), `:125-127` (legacy managers read-only,
reject new receipts), `:134` verbatim `Kind 30024 (addressable, application-specific)`,
`:140-142` (display data re-fetched/re-validated at render time), `:163-165` (hostile-page
renderer unit test). `git ls-tree -r --name-only $SHA docs/adr/` contains **no** ADR-018
file (grep -c '018' = 0).

## Deliverable — dedupe + spam table (all seven draft findings)

| Draft issue (short label + file:line as cited) | NOVELTY (reason) | SPAM CHECK (required change / why not actionable) |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registering path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); the cited ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed inside their paid window; required change: make `validateRegistration` reject any name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers (`purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns; ADR-019:125-127 requires read-only demotion | **DUPLICATE OF #2** — *marginal call, stated as such:* the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. The task rule counts same-root-cause / same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window. *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different schema region and root cause; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` (`:67`) drops each invalid block (`storefront.ts:89-94`) and returns a page holding only the survivors, so one typo (`"type":"textt"`) still yields a non-null page; `publishStorefrontPage`'s `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) passes because it sees the already-filtered residue (`blocks` is `.max(40)` with no `.min`), the success toast fires (`:76`), and the new event replaces the old at `d=storefront-page` (`:12`). Required change: validate the raw content with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — `kind: 30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — code/ADR mismatch naming an exact change: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim); `30024` is NIP-23's long-form *draft* kind, so NIP-23 clients surface a seller's storefront JSON as a draft article. Required change: move the storefront page to a free non-deprecated `3xxxx` kind and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation survives code-truth review is the separate verifier's call; the code<->ADR mismatch alone names a concrete change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — the registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, RESERVED_NAMES) but a different line, function and root cause; nothing in the five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate do-not-judge-overlap-by-file-name case. | **ACTIONABLE** — accepted-ADR / R7 non-conformance with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the value is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified absent). Required change: resolve the `d` from instance config on both server and client instead of the literal. *Caveat: ADR-019 is itself `Proposed` and the literal is partly a consequence of ADR-018 not existing yet — still a concrete, actionable change.* |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or CI coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: the only added test file in the 14-file diff sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, so it never executes. Required change: widen the `test:unit` glob (or relocate the spec) so the new suite runs, and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns renderer coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already
  tracked as prev #2, so a maintainer gains nothing by treating them as new.
  D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no
  root cause or symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: `4 + 2 + 1 = 7` covers all findings. `X + Y = 6`, not 7, only because D7
  is NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the
  NIT count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view` / `gh pr diff` / `gh api ...` GET reads plus
  `git show` / `git ls-tree` reads were issued; no comment, review, label, approval or
  other write was made. Nothing was pushed.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Verdict / halt gate (unchanged)

- **Dedupe key UNCHANGED since pass 21 — this is the 31st consecutive pass on an identical
  key.** The classification reproduces byte-identically to passes 19-50:
  D1/D2 DUPLICATE-of-#2 but ACTIONABLE; D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW but NIT.
- 40+ sibling worktrees named `worker-heavy-1286-dedupe-*` exist and this branch already
  carries 50 receipt commits — the loop is burning inference on a frozen input.
- **Recommendation: STOP dispatching this dedupe task until the key changes** (new draft
  md5/sha256 or a new PR head OID). Any further dispatch reproduces the same 7 rows with
  zero new information. Consult `artifacts/pr1286/1286-dedupe-spam-RESULT.md` (pass-37
  consolidated answer) instead of appending again.
