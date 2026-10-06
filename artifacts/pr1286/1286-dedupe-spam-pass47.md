# PR #1286 dedupe + spam-check — pass 47 (key-unchanged receipt)

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues vs 5
known prev-issues and spam-check each." Read-only vs GitHub. No push, no GitHub write.

## Key re-hashed live this pass

- Draft (parent task `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  present, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`. Seven findings D1-D7
  (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (OPEN, `isDraft: true`, MERGEABLE, base
  `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`).
- Comparison set = the *only* issue comment, `#5617745226` by `felixfelix-bot`
  (2026-09-10T11:11:01Z, the five prev-issues); `reviews` = 0; `pulls/1286/comments` = 0 ->
  no `DUPLICATE-OF-UNLISTED` row possible.
- `gh pr diff --name-only` = 14 files; `src/lib/schemas/storefront.test.ts` is the only added test.

## Verdict

- **Dedupe key UNCHANGED since pass 21 — this is the 27th consecutive pass on an identical key.**
- All seven cited sites re-read line-exact at the SHA (`git show 2ae85b6:<path>`): D1
  `StorefrontIdentityManager.ts:88` (`const existing = this.registry.get(name)`); D2
  `EventHandler.ts:84` (`this.purchaseManagers = [this.vanityManager, this.nip05Manager,
  this.storefrontManager]`); D3 `dashboard/account/storefront.tsx:67`
  (`const page = parseStorefrontPage(content)`) feeding `publish/storefront-page.ts:5` with
  `storefront.ts:77` (`blocks: z.array(...).max(40)`, no `.min`) and `:89` (flatMap drop); D4
  `publish/storefront-page.ts:10` (`kind: 30024`); D5 `StorefrontIdentityManager.ts:73`
  (`registryDTag: 'storefront-names'`) mirrored at `queries/storefront.tsx:20`; D6
  `package.json:31` glob (`find contextvm src/queries/__tests__ src/lib/__tests__ ...`) vs the
  spec under `src/lib/schemas/`, invoked by `.github/workflows/ci-unit.yml:47`; D7
  `StorefrontRenderer.tsx:57` (static count) / `:58` (global `/products`) / `:66` (`/community`).
  ADR-019 lines 110-111 / 114-116 / 125-127 / 134 / 140-142 / 163-165 re-read; still **no**
  ADR-018 file at the tip. Classification reproduced independently and is byte-identical to
  passes 19-46: D1/D2 DUPLICATE-of-#2 but ACTIONABLE; D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW
  but NIT.
- Deliberately **no table duplicated here** and **no append to the 2041-line report chain** —
  the canonical table + count live in `1286-dedupe-spam-RESULT.md`. The required table for this
  run is emitted in the worker's run output (not posted to GitHub).

Read-only vs GitHub: `gh pr view` / `gh pr diff` / `gh api` GETs plus `git show`, `git ls-tree`,
`md5sum`, `sha256sum` reads only. No comment, review, label, approval or other write. Nothing pushed.

## HALT (unchanged, escalate)

Do not dispatch this dedupe task again until the key changes (new draft md5/sha256 or new PR
head OID). A further identical-key dispatch cannot produce new information. This is the 27th
consecutive identical-key pass; the halt gate has now been ignored 26 times.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
