# REPORT — PR #1286 dedupe vs 5 prev-issues + spam check (pass 134)

**Task:** Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each.
**Repo:** PlebeianApp/market · **PR:** #1286 "feat: nip05 cms vanity url intergration"
**Head:** `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (verified UNCHANGED vs task spec)
**Base:** `auctions` · OPEN · draft · MERGEABLE · 14 files (+680/−9)
**Workspace:** `/home/c03rad0r/repos/market` · branch `worker-heavy/1286-dedupe-spam-f7`
**Kanban card:** `plebeian-pr-reviews:t_be177680`

## Status: COMPLETE

Deliverable: `artifacts/pr1286/1286-dedupe-spam-pass134.md`

## Answer

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

| # | Draft issue (cited) | NOVELTY | SPAM CHECK |
|---|---|---|---|
| D1 | `StorefrontIdentityManager.ts:88` registry-only validateRegistration | DUPLICATE OF #2 | ACTIONABLE |
| D2 | `EventHandler.ts:84` legacy managers still armed as sellers | DUPLICATE OF #2 | ACTIONABLE |
| D3 | `account/storefront.tsx:67` publish gate uses lenient render parser | NEW | ACTIONABLE |
| D4 | `publish/storefront-page.ts:10` kind 30024 vs ADR-019:134 | NEW | ACTIONABLE |
| D5 | `StorefrontIdentityManager.ts:73` literal `d` vs ADR-019:110-111 | NEW | ACTIONABLE |
| D6 | `schemas/storefront.test.ts:1` outside test:unit glob | NEW | ACTIONABLE |
| D7 | `StorefrontRenderer.tsx:59` coordinates never resolved | NEW | NIT |

Axes kept independent: D1/D2 are DUPLICATE-but-ACTIONABLE (already tracked as prev#2);
D7 is NEW-but-NIT. No DUPLICATE-but-NIT exists, so the three labels partition all 7 issues.

## Inputs verified live this pass (read-only)

- Draft artifact PRESENT at `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  (3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, 7 findings D1–D7).
- PR head SHA matches the task spec exactly; 14 changed files.
- Comparison set: 1 issue comment (`#5617745226` = the five prev-issues), 0 reviews, 0 review
  comments ⇒ no `DUPLICATE-OF-UNLISTED` row is possible.
- ADR-019 read in full (332 lines); cited anchors :110-111, :114-116, :125-127, :134, :140-144,
  :161-163 verified verbatim. `docs/adr/` at tip has NO `ADR-018`; `git grep` finds no
  `instanceNamespace` helper in `src`/`contextvm`.

## Key judgments

- **D1 / D2 = DUPLICATE OF #2** (near-duplicate by root cause, stated explicitly in the artifact):
  prev#2's root cause is the un-unified name pools, and its remedy already spans
  "before **registering**/serving". D1 is the registration path, D2 the sale/write path; the
  symptom ("two pubkeys can each pay for `alice`") is prev#2's.
- **D3 = NEW, not a dup of prev#4.** Both touch `src/lib/schemas/storefront.ts`, but prev#4 is a
  field-level missing `safeText`; D3 is the lenient drop-and-continue parser used as a write gate.
  Different root cause — classified by root cause, not by file name.
- **D5 = NEW, not a dup of prev#3.** Same file as prev#3, different line/function/root cause.
- **D7 = NEW but NIT** — display fidelity only; the count equals the number of schema-valid
  coordinates (no fabricated product data), and resolving coordinates into cards is new feature
  scope. Latent ADR-019:140-142 tension recorded in the artifact for the reviewer.

## Constraint compliance

Read-only. Only `gh pr view`, `gh api …(GET)`, `gh pr diff`, `git show` / `git ls-tree` /
`git grep` reads. No GitHub comment, review, label, approval, or any other API write.

## Honest caveat on the loop

This is pass 134 of a re-dispatch loop on an unchanged PR and an unchanged draft artifact; the
classification has been stable since pass 21. The card cannot be closed by the worker: the env
task id is board-qualified (`plebeian-pr-reviews:t_be177680`) while the board DB stores the bare
id, so `kanban_show` / `kanban_complete` both fail with "not found". Manager must close the card.
