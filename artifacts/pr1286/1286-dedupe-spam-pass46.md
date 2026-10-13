# PR #1286 dedupe + spam-check — pass 46 (key-unchanged receipt)

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

- **Dedupe key UNCHANGED since pass 21 — this is the 26th consecutive pass on an identical key.**
- All seven cited sites re-read line-exact at the SHA (`git show 2ae85b6:<path>`); ADR-019
  lines 110-111 / 114-116 / 125-127 / 134 / 140-142 / 161-165 re-read; still **no** ADR-018
  file at the tip. Classification reproduced independently and is byte-identical to passes 19-45:
  D1/D2 DUPLICATE-of-#2 but ACTIONABLE; D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW but NIT.
- Deliberately **no table duplicated here** and **no append to the 2041-line report chain** —
  the canonical table + count live in `1286-dedupe-spam-RESULT.md`.

Read-only vs GitHub: `gh pr view` / `gh pr diff` / `gh api` GETs plus `git show`, `git ls-tree`,
`md5sum`, `sha256sum` reads only. No comment, review, label, approval or other write. Nothing pushed.

## HALT (unchanged, escalate)

Do not dispatch this dedupe task again until the key changes (new draft md5/sha256 or new PR
head OID). A further identical-key dispatch cannot produce new information.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
