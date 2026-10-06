# REPORT — PR #1286 dedupe vs 5 prev-issues + spam check (pass 135)

**Task:** Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each.
**Repo:** PlebeianApp/market · **PR:** #1286 "feat: nip05 cms vanity url intergration"
**Head:** `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (verified UNCHANGED vs task spec)
**Base:** `auctions` · OPEN · draft · MERGEABLE · 14 files (+680/-9)
**Workspace:** `/home/c03rad0r/repos/market` · branch `worker-heavy/1286-dedupe-spam-f7`
**Kanban card:** `plebeian-pr-reviews:t_be177680`

## Status: COMPLETE (deliverable written + committed + pushed)

Deliverable: `artifacts/pr1286/1286-dedupe-spam-pass135.md`

## Answer

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

| # | Draft issue (cited) | NOVELTY | SPAM CHECK |
|---|---|---|---|
| D1 | `src/server/StorefrontIdentityManager.ts:88` registry-only `validateRegistration` | DUPLICATE OF #2 | ACTIONABLE (already tracked) |
| D2 | `src/server/EventHandler.ts:84` legacy managers still armed as sellers | DUPLICATE OF #2 | ACTIONABLE (already tracked) |
| D3 | `.../account/storefront.tsx:67` publish gate uses lenient render parser | NEW | ACTIONABLE |
| D4 | `src/publish/storefront-page.ts:10` kind 30024 vs ADR-019:134 | NEW | ACTIONABLE |
| D5 | `src/server/StorefrontIdentityManager.ts:73` literal `d` vs ADR-019:110-111 | NEW | ACTIONABLE |
| D6 | `src/lib/schemas/storefront.test.ts:1` outside `test:unit` glob | NEW | ACTIONABLE |
| D7 | `src/components/storefront/StorefrontRenderer.tsx:59` coordinates never resolved | NEW | NIT |

Axes kept independent: D1/D2 are DUPLICATE-but-ACTIONABLE (already tracked as prev#2);
D7 is NEW-but-NIT. No DUPLICATE-but-NIT exists, so the three labels partition all 7 issues
(X+Y+Z = 7). Strict two-axis reading: NEW = 5, NIT = 1, with 4 of the 5 NEW being ACTIONABLE.

## Inputs verified live this pass (read-only)

- Parent draft artifact PRESENT at `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  (3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, 7 findings D1-D7: 4 BLOCK / 2 RISK / 1 NIT).
- `gh pr view 1286` -> head SHA matches the task spec exactly; OPEN/draft/MERGEABLE/base `auctions`;
  14 changed files (+680/-9).
- Comparison set live: reviews = 0, review comments = 0, issue comments = 1 (`#5617745226`,
  felixfelix-bot = the five prev-issues) => no `DUPLICATE-OF-UNLISTED` row is possible.
- Cited lines re-read at the SHA (`git show 2ae85b6...:<path>`): D1 `:84-93`, D2 `:84`,
  D3 `account/storefront.tsx:66-76` + `schemas/storefront.ts:84-98` + `publish/storefront-page.ts:5,10,12`,
  D4 `:10`, D5 `:73` + `queries/storefront.tsx:20`, D6 `storefront.test.ts:1` vs `package.json` `test:unit`,
  D7 `StorefrontRenderer.tsx:52-68`; prev sites prev#1 `$vanityName.tsx:21`, prev#2 `nip05.ts:10-12`,
  prev#3 `StorefrontIdentityManager.ts:5-53`, prev#4 `schemas/storefront.ts:26`, prev#5 `queries/storefront.tsx:39-54`.
- ADR-019 read at the SHA (333 lines): :110-111, :114-116, :125-127, :134, :140-142, :161-163 verbatim.
  `docs/adr/` contains NO `ADR-018` at the tip.

## Key judgments (root cause, not title/file name)

- **D1 / D2 = DUPLICATE OF #2** (near-duplicate by root cause, stated explicitly): prev#2's root
  cause is the un-unified name pools, and its remedy already spans "cross-check existing.pubkey
  across both pools before **registering**/serving". D1 is the registration path
  (`:88 this.registry.get(name)`); D2 is the sale/write wiring (`:84` both legacy managers armed);
  the symptom ("two pubkeys can each pay for `alice`") is prev#2's. ADR-019:114-116/:125-127 restate it.
- **D3 = NEW, not a dup of prev#4.** Both touch `src/lib/schemas/storefront.ts`, but prev#4 is a
  field-level missing `safeText` on `heroBlock.title`; D3 is the lenient drop-and-continue parser
  used as a publish gate. Different root cause (classified by root cause, not by file name).
- **D5 = NEW, not a dup of prev#3 or prev#5.** Same file as prev#3 (reserved list) but different
  line/function/root cause (registry `d` tag); prev#5's file (`queries/storefront.tsx`) is cited by
  D5 only for the mirrored literal at `:20`, not the missing expiry filter at `:39-54`.
- **D7 = NEW but NIT** — display fidelity only; the count equals the number of schema-valid
  coordinates (no fabricated product data), and resolving coordinates into cards is new feature
  scope. Latent ADR-019:140-142 tension recorded in the artifact for the reviewer.

## Constraint compliance

Read-only re GitHub. Only `gh pr view`, `gh api ...(GET)` and `git show` / `git ls-tree` reads were
issued. No GitHub comment, review, label, approval or any other API write was made. The only writes
are to the local worktree (`artifacts/pr1286/1286-dedupe-spam-pass135.md`, this `REPORT.md`,
`PROGRESS.md`) plus the task-mandated `git commit` + `git push` of that deliverable.

## Honest caveat on the re-dispatch loop

This is pass 135 of a re-dispatch loop on an unchanged PR and an unchanged draft artifact; the
classification has been stable since pass 21. The board card CANNOT be closed or commented on by
the worker (`HERMES_KANBAN_TASK` is board-qualified `plebeian-pr-reviews:t_be177680` while the board
DB stores the bare id `t_be177680`, so no id form satisfies both the scope guard and the DB). The
manager must close the card manually; the worker deliverable is complete and pushed regardless.
