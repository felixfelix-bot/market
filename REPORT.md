# REPORT — PR #1286 dedupe + spam-check, pass 124 (fleet offload)

**Result: `4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`** (7 draft issues D1-D7).

Status: COMPLETE. Read-only on GitHub (no comment/review/label/push against
PlebeianApp/market or PR #1286). Deliverable re-derived independently from the
tree at the SHA; dedupe key unchanged since pass 21, so the verdict is unchanged.

## Inputs verified live (all reads)

- Draft artifact (parent task `t_31cab538`):
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — PRESENT, 3548 B,
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`.
  7 findings: 4 `[BLOCK]` (D1-D4), 2 `[RISK]` (D5-D6), 1 `[NIT]` (D7).
- `gh pr view 1286 --json headRefOid` == `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
  (== briefed SHA); OPEN, `isDraft: true`, `MERGEABLE`, `updatedAt 2026-09-10T11:11:01Z`,
  base `auctions`, head `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`.
- `pulls/1286/reviews` = 0, `pulls/1286/comments` = 0 → no DUPLICATE-OF-UNLISTED possible.
- Five prev-issues read verbatim from issue comment `#5617745226` (felixfelix-bot).
- `gh pr diff 1286 --name-only` = 14 files; the only test/spec is
  `src/lib/schemas/storefront.test.ts`.
- Cited code re-read at the SHA via `git show` (not by title/file name).

## Deliverable — dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause by a different path. Prev #2: "Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", remedy "Unify on one registry or cross-check `existing.pubkey` across both pools before registering/serving". D1 *is* that missing cross-check on the registration path (`:88` `this.registry.get(name)` is unified-registry-only); ADR-019:114-116 is the same requirement. Near-duplicate by root cause => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127); two pubkeys can each pay for `alice` | **DUPLICATE OF #2** — *marginal, stated:* mechanism differs (purchase wiring `:84` vs serving merge `nip05.ts:12`), but root cause + symptom are identical to #2 — pools not unified, one name representable to two pubkeys, two buyers can each pay for `alice` (`/alice` != `alice@host`); #2's remedy explicitly spans "before registering/serving". Same-root-cause => duplicate. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — publish gate reuses the lenient *render* parser, so a typo silently drops blocks and a truncated page publishes behind a success toast, overwriting the previous page | **NEW** — none of the five concerns the publish-vs-render validation split. #4 = missing `safeText` on `heroBlock.title` (`storefront.ts:26`), a different root cause/region; #5 = page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops failed blocks (`storefront.ts:89-92` flatMap), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` `.max(40)`, no `.min`), so `"type":"textt"` truncates the page, `toast.success` fires (`:76`), and the `d=storefront-page` event (`storefront-page.ts:12`) replaces the prior page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 states | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — ADR/code mismatch naming an exact change: kind hard-coded `30024` (`:10`) vs ADR-019:134 `Kind 30024 (addressable, application-specific)` (verified verbatim at the SHA). Required change: use a free addressable `3xxxx` kind and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim holds is the code-truth worker's call; the mismatch is actionable either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; same literal mirrored at `src/queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (RESERVED_NAMES) and same *file* as prev #5 (`queries/storefront.tsx`), but a different line/function/root cause; nothing in the five concerns the registry `d` tag or ADR-018 namespacing. The "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation + multi-instance namespace collision: `registryDTag: 'storefront-names'` (`:73`) and `'#d': ['storefront-names']` (`queries/storefront.tsx:20`) hard-coded; ADR-019:110-111/161-162 forbid the literal; no ADR-018 file at this tip (`git ls-tree` = 13 ADRs + proposals). Required change: resolve the `d` from instance config on both server and client. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob (`package.json:31`), so CI never runs it; `StorefrontIdentityManager`, `StorefrontRenderer` and `publishStorefrontPage` have no coverage | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165 renderer-hostility guardrail unenforced: the only test in the 14-file diff sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) globs only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that — so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated; a page whose coordinates are all dead still asserts "N product references published by this seller" and links to global `/products` | **NEW** — no prev issue concerns the renderer's coordinate resolution (#5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: static count (`:57`) and global `/products`/`/community` links (`:58`, `:66`) instead of resolving coordinates; no correctness/security/data-loss defect. ADR-019:140-142 states re-fetch as intent, and the draft's own tag is `[NIT]`. Required change (non-blocking): resolve coordinates at render, or drop the count/link claim. *(Draft cites `:59`, the `</section>` close; count/link are `:57`-`:58` — citation imprecision further supporting NIT.)* |

## Count

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

(D3, D4, D5, D6 NEW-and-ACTIONABLE; D1, D2 duplicate of #2; D7 nit. D1/D2 are
duplicate-but-actionable; D7 is new-but-nit, so X+Y=2 of 7 and the NIT count is
on the spam axis as instructed.)

## Constraint compliance

- Read-only: only `gh pr view`, `gh pr diff`, `gh api ... GET` reads plus
  `git show` / `git ls-tree` / `git cat-file` reads. No comment, review, label,
  approval, or other API write against PlebeianApp/market or PR #1286.
- Dedupe key (draft md5 `0fc6675a…`, head `2ae85b6f…`) unchanged since pass 21.
  See `artifacts/pr1286/1286-dedupe-spam-HALT-ESCALATION.md`: further dispatch on
  an unchanged key cannot produce new information; the stuck card loop, not the
  content, is why this task keeps being re-dispatched.
