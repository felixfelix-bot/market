# REPORT — PR #1286 dedupe + spam classification (pass 137)

Worker: worker-heavy/1286-dedupe-spam-f7 · Workspace: /home/c03rad0r/repos/market
Task: classify every issue of the parent task's draft review of PlebeianApp/market PR #1286 on two
independent axes (NEW vs the five prev-issues; ACTIONABLE vs NIT). Read-only on GitHub.

## Status: COMPLETE (deliverable written, committed, pushed). Only the manager-side kanban card close is outstanding.

## 1. Inputs verified under my own commands
- Draft artifact `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — PRESENT, 3548 B,
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, 7 findings D1–D7 (lines 3–9).
- `gh pr view 1286 --repo PlebeianApp/market --json …` → OPEN, isDraft=true, MERGEABLE, base `auctions`,
  head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (UNCHANGED), changedFiles 14. `gh pr diff --name-only`
  lists 14 files matching the draft's scope.
- Comparison set: 0 review comments, 0 reviews, exactly 1 issue comment `5617745226` = the five
  prev-issues (read verbatim, 2668 chars). PR body is empty (and holds no do-not-merge hold phrase).

## 2. Deliverable
Full table: `artifacts/pr1286/1286-dedupe-spam-pass137.md`

| # | Draft issue | Novelty | Spam |
|---|---|---|---|
| D1 | StorefrontIdentityManager.ts:88 registry-only ownership check | DUPLICATE OF #2 (claim path) | ACTIONABLE (tracked) |
| D2 | EventHandler.ts:84 legacy managers stay armed as sellers | DUPLICATE OF #2 (write path) | ACTIONABLE (tracked) |
| D3 | dashboard/account/storefront.tsx:67 publish reuses lenient parser | NEW | ACTIONABLE |
| D4 | publish/storefront-page.ts:10 kind 30024 = NIP-23 draft kind | NEW | ACTIONABLE |
| D5 | StorefrontIdentityManager.ts:73 literal `d` vs ADR-019:110-111 | NEW | ACTIONABLE |
| D6 | lib/schemas/storefront.test.ts:1 outside `test:unit` glob | NEW | ACTIONABLE |
| D7 | StorefrontRenderer.tsx:59 coordinates never resolved | NEW | NIT |

Required final line:
`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## 3. Each cited site re-read at the head SHA (`git show <sha>:<path>`, no checkout)
- D1: `StorefrontIdentityManager.ts:84-93` — `:88 this.registry.get(name)`; only the storefront pool.
- D2: `EventHandler.ts:84` — `purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`.
- D3: `account/storefront.tsx:67` `parseStorefrontPage(content)` → `schemas/storefront.ts:89` flatMap
  drop → `:94` re-parse of the reduced array (`blocks` = `z.array(...).max(40)`, no min) →
  `publish/storefront-page.ts:5` strict re-parse of survivors → `:15` publish over `d=storefront-page`.
- D4: `publish/storefront-page.ts:10 kind: 30024`, `:12 tags: [['d','storefront-page']]`.
- D5: `StorefrontIdentityManager.ts:73 registryDTag:'storefront-names'` + `queries/storefront.tsx:20`
  `'#d': ['storefront-names']`; `git ls-tree docs/adr` → no ADR-018 file at this tip.
- D6: `storefront.test.ts:1` in `src/lib/schemas/`; `package.json:31` glob roots
  `contextvm src/queries/__tests__ src/lib/__tests__`; `bunfig.toml` has no test root;
  `.github/workflows/ci-unit.yml:47` runs `bun run test:unit`.
- D7: `StorefrontRenderer.tsx:53-68` — productGrid/collectionRow print a count + link, never fetch the
  coordinate.

## 4. Prev-issue sites re-read / ADR + spec evidence
- prev#1 `$vanityName.tsx:21` (`vanityActions.resolveVanity`, fed by `d=vanity-urls` only).
- prev#2 `nip05.ts:12` `{ ...legacy.names, ...unified.names }`; body verbatim already names the
  "each only sees its own registry … assign the same name to two different pubkeys" defect and the
  "cross-check `existing.pubkey` across both pools" fix → D1/D2 are near-duplicates by root cause.
- prev#3 `StorefrontIdentityManager.ts:5-53` (reserved list, no `terms`/`privacy`).
- prev#4 `schemas/storefront.ts:26` `title: z.string().trim().min(1).max(160)` (no safeText).
- prev#5 `queries/storefront.tsx:56` (`useStorefrontPage` subscribe + `fetchStorefrontPage` no
  `validUntil` filter).
- ADR-019 verbatim: `:110-111`, `:114-116`, `:125-127`, `:134`, `:140-142`, `:163`.
- NIP-23 (raw.githubusercontent, read-only curl) §Description line 11: "Deprecated: `kind:30024` was
  used for long-form drafts … preferred way … is to use NIP-37".
- No NIP-23 hold phrase / no do-not-merge in the PR body.

## 5. Classification reasoning (both axes, independent)
- D1 & D2 are DUPLICATE OF #2 and ACTIONABLE-but-already-tracked: prev#2 states the two-pool defect and
  its fix; D1 is the claim/validation path, D2 the seller-arming/write path — same root cause, not a
  new issue. (An issue can be duplicate on novelty and actionable on spam; both hold here.)
- D3–D6 are NEW and ACTIONABLE (data-loss/correctness, spec violation vs NIP-23, spec violation vs
  ADR-019:110-111, CI-config gap — each has a one-sentence required change).
- D7 is NEW but NIT: display-only, no data-loss/security/spec violation, and the draft itself labels it
  `[NIT]`.
- No issue is DUPLICATE-OF-UNLISTED: the only comparison set is the single issue comment, and every
  draft issue was checked against all five of its items.

## 6. Constraints honoured
- Read-only: `gh pr view`, `gh pr diff`, `gh api …/comments`, `gh api …/reviews`, `gh api …/pulls/1286`
  (all GET), `git show`/`git ls-tree`, `curl` to the public NIPs repo. **No** comment, review, approve,
  label, or push to GitHub.
- No code-truth verdict on the underlying bugs (separate worker owns that); novelty + actionability only.
- Local commits only affect our own offload branch `worker-heavy/1286-dedupe-spam-f7` on the `dr`/`fork`
  remotes; nothing written to PlebeianApp/market.

## 7. Kanban terminal action — externally blocked (unchanged from passes ~130–136)
- `HERMES_KANBAN_TASK=plebeian-pr-reviews:t_be177680` (board-qualified).
- no-arg `kanban_complete` → "could not complete plebeian-pr-reviews:t_be177680 (unknown id or already
  terminal)"; `kanban_complete(task_id=t_be177680, board=plebeian-pr-reviews)` → "worker is scoped to
  task plebeian-pr-reviews:t_be177680; refusing to mutate t_be177680".
- Root cause: the guard compares the board-qualified env id while the board DB stores the bare id, and
  the tools resolve the board from `HERMES_KANBAN_BOARD=fork-pr-steward` (not `plebeian-pr-reviews`), so
  no id/board form satisfies both. Manager must close the card (fix: spawn with a matching
  `HERMES_KANBAN_BOARD`/`HERMES_KANBAN_DB`, or normalize the guard to the bare suffix + route the board
  explicitly).

## 8. Loop note
Pass 137 of an identical re-dispatch loop. The deliverable has been stable since pass 21
(4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits). Only the manager-side card close is outstanding.
