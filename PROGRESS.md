# PROGRESS — PR #1332 review (ADR-0002 Wave 1 addendum, descriptive half)

Worker: worker-reviewer-kimi (offload) · Workspace: /home/c03rad0r/repos/market
Offload branch: `worker-heavy/1286-dedupe-spam-f7`
Target: PlebeianApp/market PR #1332, branch `pr/adr-0002-wave1-clarifications`, author felixfelix-bot.
Card-cited SHA: `d626dd8c` (stale). Actual head verified: `ed2fc50d457494eebb5adfc2659451ea403c7a5a`.

## Findings -> status -> files touched

| # | Finding | Status | Files / evidence |
|---|---|---|---|
| F1 | Card SHA `d626dd8c` is stale; live head is `ed2fc50d`. Review must cite the live head. | RESOLVED — reviewed at `ed2fc50d` | `gh pr view 1332 --json headRefOid`; `refs/remotes/fork/...` = ed2fc50d |
| F2 | All 17 addendum `path:line` citations resolve at head. | VERIFIED | `git show ed2fc50d:<path>`; see `artifacts/pr1332/bundle.md` |
| F3 | F4 correction (commit `ed2fc50d`) is factually accurate against pinned libs. | VERIFIED | ndk@3.0.3 dist :2457/:9510/:9874-9882/:12428/:12542; applesauce-relay@6.2.1 dist 0 `verif` hits |
| F4 | **F3 paragraph ADR :319-325 conflates 5 `#p`-only reads with author-scoped reads and asserts they are "outbox-routed today".** | **BLOCK — change required** | `useNotificationMonitor.ts:59/74/135/161/185` are `#p`-only; `git grep authors` = only `:91`. NDK `calculateRelaySetsFromFilter` dist:2860-2908 routes by `filter.authors` only. |
| F5 | Head checks ran green against old base `4bc7f8c0`; master now `68b1b7b9`, branch 17 behind, new synthetic merge unchecked. | RISK | `gh api .../commits/ed2fc50d/check-runs`; `gh api .../git/ref/heads/master` |
| F6 | PR body table cites master `48714138` line numbers, stale vs head. | NIT | PR body vs `git show ed2fc50d:src/lib/nostr/ndk-events.ts` |

## Files touched (offload tree only — no writes to PlebeianApp/market)
- `artifacts/pr1332/review-1332.md` — draft/published review body
- `artifacts/pr1332/consultant-brief.md`, `artifacts/pr1332/bundle.md` — Gate 2.5 material
- `artifacts/pr1332/gate25-glm.md` — Gate 2.5 cold-audit output (glm-5.3)
- `PROGRESS.md`, `REPORT.md`

## Steps
1. [done] Recon: PR facts, head SHA, branch state.
2. [done] Verify every addendum citation + the two library claims at head.
3. [done] Independent verification of @maximotodev's F3 routing objection (confirmed).
4. [done] Write draft review + Gate 2.5 material.
5. [done] Gate 2.5 cold audit run — glm-5.3 lane DOWN (503); router served deepseek-flash (recorded).
6. [done] Published `gh pr review 1332 --comment --body-file` citing `ed2fc50d` → review id 5474897927.
7. [done] Recorded `last_reviewed_sha=ed2fc50d` (+review_id) in gate state.
8. [done] Commit + push offload record.
