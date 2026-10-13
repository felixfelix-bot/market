# PROGRESS — PR #1347 review (ci/e2e gate the Collection Management family)

Worker: worker-reviewer-kimi (offload) · Workspace: /home/c03rad0r/repos/market
Offload branch: `worker-heavy/1286-dedupe-spam-f7`
Target: PlebeianApp/market PR #1347, branch `ci/e2e-gate-coverage`, author maxime-tt.
Card-cited SHA: `94129b495c9f` — verified live head = `94129b495c9f738c13f79326bfdd2d0f97268306` (matches).
PR state at check time: **MERGED** (2026-09-21T13:32:53Z, merge commit `e1fb1514`, `reviewDecision: APPROVED`).

## Findings -> status -> files touched

| # | Finding | Status | Files / evidence |
|---|---|---|---|
| F1 | Card asks for a review that **already exists at the exact head**: review id `5258605183`, `felixfelix-bot`, `commit_id == 94129b49…`, body cites the head SHA and closes `**APPROVED**`. | ALREADY DONE — no duplicate posted | `gh api …/pulls/1347/reviews` |
| F2 | `last_reviewed_sha` for #1347 was **absent** from the gate state (`prs["1347"] == null`). | **RESOLVED this run** | `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` |
| F3 | The PR premise is true: at base `c9ec53b1` the gate had 17 terms (no `Collection Management`) while `--grep-invert` had it → family ran in NO workflow. Head restores it (gate 18 terms). | VERIFIED | `git show c9ec53b1:.github/workflows/e2e.yml`; head `e2e.yml:178` |
| F4 | The new `invert ⊆ gate` guard is a **real** regression detector, not a tautology. | VERIFIED — sensitivity probe | delete `\|Collection Management\|` → test fails naming it (3 pass/1 fail); head run = 4 pass/0 fail/13 expect |
| F5 | Gate 2.5 lane: glm-5.3 requested; router **failed over to `deepseek-flash`** (all glm/kimi/minimax lanes 503). | DONE — substituted lane recorded, `AUDIT-PASS-WITH-NITS` | `artifacts/pr1347/gate25-glm.md` |
| F6 | Detector/gate cannot re-create this card: `get_open_prs()` is `?state=open` only, and `reviews_by_us_at(1347, head)` is already True. | VERIFIED | `plebeian-pr-review-gate.py:88-90,143-174` |

No `[BLOCK]` / `[RISK]` findings. Verdict on the PR: **APPROVED** (consistent with the published review and the maintainer's APPROVED).

## Files touched (offload tree only — no writes to PlebeianApp/market)
- `artifacts/pr1347/review-1347.md` — the published review body (verbatim artifact of record)
- `artifacts/pr1347/consultant-brief.md` — Gate 2.5 brief
- `artifacts/pr1347/gate25-glm.md` — Gate 2.5 cold-audit output + lane-substitution record
- `artifacts/pr1347/1347-review-verification.md` — this run's independent re-derivation
- `PROGRESS.md`, `REPORT.md`
- gate state (manager profile, not this repo): `…/state/plebeian-pr-review-state.json`

## Steps
1. [done] Recon: PR facts, live head SHA, merged state, existing reviews.
2. [done] Confirm the required review already exists at the exact head (review 5258605183) + maintainer APPROVED.
3. [done] Independent re-derivation at `94129b49` in a detached worktree: guard test 4/0, base-vs-head term counts, set deltas, sensitivity probe.
4. [done] Gate 2.5 cold audit dispatched (glm-5.3 → deepseek-flash failover) → AUDIT-PASS-WITH-NITS; lane substitution recorded.
5. [done] Wrote artifacts + PROGRESS.md + REPORT.md.
6. [done] Recorded `last_reviewed_sha=94129b49…` (+review_id) in gate state (backup kept).
7. [done] Commit + push offload record.
