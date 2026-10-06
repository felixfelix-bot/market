# PROGRESS — pass 137 (worker-heavy/1286-dedupe-spam-f7)

Crash-recovery map. One line per cluster: finding -> status -> files touched.

- Inputs re-verified under my own commands -> DONE: draft artifact
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` PRESENT (3548 B, md5
  `0fc6675ab0cfab78d9b9a6d568e9ed5a`, findings D1-D7); PR head UNCHANGED
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, OPEN/draft/MERGEABLE/base `auctions`, 14 files;
  comparison set = 1 issue comment (`5617745226`), 0 reviews, 0 review comments; PR body empty.
  No files touched (read-only gh GET).
- Cited lines re-read at the SHA -> DONE: D1 `StorefrontIdentityManager.ts:84-93` registry-only
  (`:88`); D2 `EventHandler.ts:84` all three managers armed; D3 `account/storefront.tsx:67` lenient
  parse -> `schemas/storefront.ts:89/94` -> `publish/storefront-page.ts:5/15`; D4
  `publish/storefront-page.ts:10 kind:30024`; D5 `:73 registryDTag:'storefront-names'` +
  `queries/storefront.tsx:20`; D6 `schemas/storefront.test.ts:1` vs `package.json:31` glob,
  `bunfig.toml` no test root, `ci-unit.yml:47`; D7 `StorefrontRenderer.tsx:53-68` no coordinate fetch.
  No files touched (read-only git).
- Prev-issue sites re-read -> DONE: prev#1 `$vanityName.tsx:21`; prev#2 `nip05.ts:12` merge
  (verbatim body already names the two-pool defect + the cross-pool fix); prev#3
  `StorefrontIdentityManager.ts:5-53`; prev#4 `storefront.ts:26`; prev#5 `queries/storefront.tsx:56`.
- ADR-019 read at the SHA -> DONE verbatim `:110-111, :114-116, :125-127, :134, :140-142, :163`;
  no ADR-018 file at this tip (head adr tree = ADR-0001..016,019 + 2 proposals).
- NIP-23 checked (curl raw.githubusercontent) -> DONE: line 11 defines 30024 as the deprecated
  long-form-draft kind, superseded by NIP-37.
- Classification independently re-derived -> DONE, identical to prior passes: D1,D2 = DUPLICATE OF #2
  (ACTIONABLE/tracked); D3,D4,D5,D6 = NEW ACTIONABLE; D7 = NEW NIT.
  Count: `4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`.
- Deliverable written -> DONE: `artifacts/pr1286/1286-dedupe-spam-pass137.md`, `REPORT.md`, this
  `PROGRESS.md` (files touched: those three).
- Commit + push -> DONE (observed): commit `1aa62335`; pushed `e23cbee6..1aa62335` to `dr`
  (felixfelix-bot/market) and to `fork`; remote sha `1aa62335e9da1ded41d9cc1472c6de89047509bc`
  verified on BOTH via `git ls-remote`.
- Terminal action (kanban) -> BLOCKED (external; reproduced pass 137). `HERMES_KANBAN_TASK` is
  board-qualified (`plebeian-pr-reviews:t_be177680`) while the board DB stores the bare id, and the
  tools resolve the board from `HERMES_KANBAN_BOARD=fork-pr-steward`; no id/board form satisfies both
  the scope guard and the DB. Mutating tools refuse ("scoped to task ... refusing to mutate
  t_be177680"); non-mutating handoff WORKED: `kanban_comment(task_id=t_be177680,
  board=plebeian-pr-reviews)` -> comment_id `9070`. Manager must close the card (fix: spawn with a
  matching `HERMES_KANBAN_BOARD`/`HERMES_KANBAN_DB`, or normalize the scope guard to the bare suffix).
  No retry loop.
- LOOP NOTE: pass 137 of an identical re-dispatch loop; deliverable stable since pass 21.
