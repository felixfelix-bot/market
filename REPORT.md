# REPORT — PR #1347 review (ci/e2e: gate the Collection Management family)

Worker: worker-reviewer-kimi (offload) · Workspace: `/home/c03rad0r/repos/market`
Offload branch: `worker-heavy/1286-dedupe-spam-f7`
Target: PlebeianApp/market PR #1347, branch `ci/e2e-gate-coverage`, author maxime-tt
Card-cited SHA: `94129b495c9f` · **live head verified: `94129b495c9f738c13f79326bfdd2d0f97268306`**

## Status

COMPLETE. **Verdict on the PR: APPROVED** (no BLOCK/RISK). The review this card asks for **already
exists at the exact head**, so no duplicate was posted; the one genuinely missing publish step
(`last_reviewed_sha` in the gate state) has been recorded. Nothing was written to PlebeianApp/market.

This is the same shape as the sibling card already handled in this tree
(`artifacts/pr1348/1348-review-verification.md`), and mirrors how the fleet handled the first run of
this card lineage (t_6ab2a344).

## 1. What was asked vs. what was done

| Card requirement | State | Evidence |
|---|---|---|
| Post the review as `gh pr review <n>` citing the head SHA | **ALREADY DONE** (no duplicate posted) | review id `5258605183`, `felixfelix-bot`, `state=COMMENTED`, `commit_id = 94129b495c9f738c13f79326bfdd2d0f97268306`, submitted 2026-09-20T00:43:18Z; first line of body cites the full SHA |
| State **APPROVED** in the review body if no change requests | **ALREADY DONE** | same review body closes `**APPROVED**`; no `[BLOCK]`/`[RISK]` items |
| Cross-family review | DONE (prior round) + re-derived this run | §3 |
| Gate 2.5 cold audit before posting | RUN THIS RUN — lane substituted (§4) | `artifacts/pr1347/gate25-glm.md` |
| Record `last_reviewed_sha` in gate state | **DONE THIS RUN** | `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` → `prs["1347"]` (§5) |

## 2. PR facts (verified this run)

```
number        1347
title         ci(e2e): gate the Collection Management family so it runs in a workflow again
author        maxime-tt          base  auctions (diff base c9ec53b1)
headRefOid    94129b495c9f738c13f79326bfdd2d0f97268306   (== card-cited SHA)
state         MERGED              mergedAt 2026-09-21T13:32:53Z
mergeCommit   e1fb151453eec1bfc5e301ac7619c2c98015dc74   reviewDecision APPROVED
diff          2 files, +33/-1
reviews       id 5258605183 felixfelix-bot COMMENTED commit=94129b49…  (our lane)
              id 5267219699 Franchovy     APPROVED  commit=94129b49…  (maintainer, 22h later)
head checks   unit-integration ✓  e2e-grep ✓ (17m58s)  prettier ✓  security-scan ✓  footprint ✓
              e2e-full skipped (expected on PR events)
```

## 3. Independent re-derivation at head (read-only)

Detached worktree `/home/c03rad0r/worktrees/pr1347-verify` at `94129b49`, `node_modules` symlinked
from the main checkout. The offload branch sits on a different base, so all source reads were taken
at `94129b49` (`git show` / `gh api contents?ref=`), never from the offload tree.

1. **Coverage-gap premise CONFIRMED.** `git show c9ec53b1:.github/workflows/e2e.yml`: gate = **17**
   terms, `Collection Management` ABSENT; `--grep-invert` = **15** terms, `Collection Management`
   PRESENT. Since `e2e-full` runs everything the gate does *not* match, the family matched no job.
2. **Fix CONFIRMED.** Head `e2e.yml:178` gate = **18** terms incl. `|Collection Management|`;
   the invert list at `:326` is untouched and still names it → the per-PR job now runs it.
3. **Guard CONFIRMED and non-tautological.** `bun test src/lib/__tests__/e2e-workflow-gate-membership.test.ts`
   → `4 pass / 0 fail / 13 expect() calls`. Sensitivity probe: deleting `|Collection Management|`
   from the gate makes the new test FAIL with
   `expect(received).toEqual(expected)  - []  + ["Collection Management"]` (3 pass / 1 fail); file
   restored clean (`git diff --stat` empty after restore).
4. **Set deltas (mechanical).** gate = 18 terms, invert = 15 terms; `invert − gate = []`;
   `gate − invert = ['Lightning Mock', 'OG Meta Tags', 'Test listing labels — auctions']` — exactly
   the three families the published review's INFO #2 named.
5. **Describe title CONFIRMED** `e2e/tests/collections.spec.ts:116` =
   `test.describe('Collection Management', () => {`.

## 4. Gate 2.5 cold audit — requested lane DOWN, router substituted

Brief: dispatch the draft to `worker-reviewer-glm` (glm-5.3). Probed the local flat router
(127.0.0.1:9099): every glm/kimi/minimax lane returned **HTTP 503**; `glm-5.3` (and `tier/review-glm`,
`kimi-k3`, `deepseek-v4-flash`) all **failed over to `deepseek-flash`**
(`X-Failover-Provider: deepseek`). Exactly one live lane.

- On the full brief the substituted lane emitted **reasoning only** and never terminated
  (`finish_reason: length`, 14 000 reasoning tokens, empty `content`). A compact 12-line brief with
  `reasoning_effort: low` terminated (`stop`, 4 058 tokens).
- **Verdict: `AUDIT-PASS-WITH-NITS`** — "No published claim is false. No BLOCK for the specific
  invert⊆gate gap." Its one residual NIT: exact trimmed string-subset proves *membership*, not
  *execution* (another filter/skip/conditional job or a regex-vs-term mismatch could still leave a
  family uncovered) — the same class as the published review's own INFO #1, not a blocker.
- **Honest caveat, recorded not hidden:** this was a **deepseek-family** audit, **not** the requested
  glm-5.3 audit. Raw probe table + verbatim verdict in `artifacts/pr1347/gate25-glm.md`.

## 5. Gate state update (publish step 3)

File: `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` (the file the detector and gate
load/save; `save_state` uses `indent=2`). Backup kept as `…-state.json.bak-pr1347-last-reviewed-sha`.

```json
"1347": {
  "last_reviewed_sha": "94129b495c9f738c13f79326bfdd2d0f97268306",
  "last_reviewed_at": "2026-10-09T23:30:00+00:00",
  "last_checked": "2026-10-09T23:30:00+00:00",
  "review_id": 5258605183,
  "review_state": "COMMENTED",
  "review_body_says": "APPROVED",
  "reviewer": "felixfelix-bot"
}
```

`prs` went 43 → 44 entries; `prs["1347"]` was **null** before this run; JSON re-parsed valid.

## 6. Why no second review was posted (mechanism, not preference)

- `plebeian-pr-review-gate.py:143-174` `reviews_by_us_at(pr, head)` returns **True** for
  `(1347, 94129b49…)` — review `5258605183` is ours, at the head.
- `plebeian-pr-review-gate.py:88-90` `get_open_prs()` queries `pulls?state=open` — a MERGED PR is
  never returned, so #1347 can never be selected for dispatch again.
- Re-posting would add a second APPROVED comment to a merged, already-APPROVED PR with zero
  information gain — the exact duplicate-card failure the detector's own docstring warns about.

## 7. Not done / for the manager

1. **Card lifecycle**: this session has no kanban tools, so the card was not marked terminal. The
   detector must stop re-creating it — it cannot dispatch #1347 (merged/closed) and the gate state
   now keys the live head, so `needs_review()` is False on both paths.
2. **Genuine glm Gate 2.5**: the glm lane is down (all `glm-*` → 503). If a glm-family audit stamp is
   required, re-run `model=glm-5.3` once the lane is back; the deepseek-flash audit this run is the
   best available and is disclosed as a substitution.
3. No actionable change requests for the author: APPROVED, merged, no follow-up required beyond the
   two INFO notes already on the thread.
