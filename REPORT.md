# REPORT — PR #1286 dedupe + spam classification (pass 136)

Worker: worker-heavy/1286-dedupe-spam-f7 · Workspace: /home/c03rad0r/repos/market
Task: classify every issue of the parent task's draft review of PlebeianApp/market PR #1286 on two
independent axes (NEW vs the five prev-issues; ACTIONABLE vs NIT). Read-only on GitHub.

## Status: COMPLETE (deliverable written; kanban card close externally blocked — see below)

## 1. Inputs verified under my own commands
- Draft artifact `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — present, 3548 B,
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, 7 findings D1–D7.
- `gh pr view 1286 --repo PlebeianApp/market` → OPEN, draft, MERGEABLE, base `auctions`,
  head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (UNCHANGED), 14 files.
- Comparison set: 0 review comments, 0 reviews, 1 issue comment (`5617745226`) = the five prev-issues.
- Cited lines re-read with `git show <sha>:<path>` at the head SHA; ADR-019 (332 lines) read at the
  SHA; NIP-23 spec checked for the kind-30024 claim.

## 2. Deliverable
Full table: `artifacts/pr1286/1286-dedupe-spam-pass136.md`

| # | Draft issue | Novelty | Spam |
|---|---|---|---|
| D1 | StorefrontIdentityManager.ts:88 registry-only ownership check | DUPLICATE OF #2 (same root cause, claim path) | ACTIONABLE (tracked) |
| D2 | EventHandler.ts:84 both legacy managers still armed | DUPLICATE OF #2 (same root cause, write path) | ACTIONABLE (tracked) |
| D3 | account/storefront.tsx:67 publish reuses lenient parser | NEW | ACTIONABLE |
| D4 | publish/storefront-page.ts:10 kind 30024 = NIP-23 draft kind | NEW | ACTIONABLE |
| D5 | StorefrontIdentityManager.ts:73 literal `d` vs ADR-019:110-111 | NEW | ACTIONABLE |
| D6 | schemas/storefront.test.ts outside `test:unit` glob | NEW | ACTIONABLE |
| D7 | StorefrontRenderer.tsx:59 coordinates never resolved | NEW | NIT |

Required final line:
`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## 3. Key evidence per NEW-and-ACTIONABLE
- D3: `account/storefront.tsx:67` calls lenient `parseStorefrontPage(content)`; `schemas/storefront.ts:89`
  flatMap-drops invalid blocks and `:94` parses the reduced array successfully (no `blocks` min), so the
  non-null page is published via `publishStorefrontPage` after its strict re-parse at `:5` sees only the
  survivors → truncated page overwrites `d=storefront-page` behind a success toast. Data-loss/correctness.
- D4: ADR-019:134 calls 30024 "addressable, application-specific"; NIP-23 §Description says 30024 was the
  long-form-draft kind (deprecated, superseded by NIP-37). Spec violation → free 3xxxx kind + ADR fix.
- D5: `StorefrontIdentityManager.ts:73` literal `'storefront-names'` and `queries/storefront.tsx:20` mirror
  it, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018 (no ADR-018 file
  exists at this tip). Concrete spec violation with a stated fix.
- D6: `package.json:31` glob roots are `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`; the new
  test lives in `src/lib/schemas/` → matched by none, so CI never runs it.

## 4. Why D1/D2 are duplicates (not merely same-file)
prev#2 (the only previously-raised risk on this topic) states the defect itself: "both managers validate
independently and each only sees its own registry … they can happily assign the same name to two different
pubkeys" and prescribes "cross-check existing.pubkey across both pools before registering/serving". D1 is
exactly that defect on the claim/validation path; D2 is the same two-pool defect on the seller-arming
(write) path. Both are near-duplicates by root cause and already tracked.

## 5. Constraints honoured
- Read-only: `gh pr view`, `gh pr diff`, `gh api …/comments`, `gh api …/reviews` (GET only), `git show`,
  `curl` to the public NIPs repo. No comment, review, label, approve, or push to GitHub.
- No code-truth judgement of the underlying bugs (a separate worker owns that); only novelty + actionability.

## 6. Kanban terminal action — externally blocked (unchanged from passes 130–135)
- no-arg `kanban_complete` → "could not complete plebeian-pr-reviews:t_be177680 (unknown id or already terminal)".
- `kanban_complete(task_id=t_be177680, board=plebeian-pr-reviews)` → "worker is scoped to task
  plebeian-pr-reviews:t_be177680; refusing to mutate t_be177680".
- `kanban_comment(task_id=…)` → "unknown task".
- ROOT CAUSE: `HERMES_KANBAN_TASK=plebeian-pr-reviews:t_be177680` is board-qualified while the board DB
  stores the bare id, so no id form satisfies both the scope guard and the DB. Manager must close the card
  (fix: store/accept the qualified id, or normalize the guard to the bare suffix).

## 7. Loop note
Pass 136 of an identical re-dispatch loop; the deliverable has been stable since pass 21
(4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits). Only the manager-side card close is outstanding.
