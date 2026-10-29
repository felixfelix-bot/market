# Gate 2.5 cold audit — PR #1331 draft review (kimi lane)
Auditor: glm-5.3 (worker-reviewer-glm, opposite family). Read-only: one harness re-run (verify.mjs + check-format.mjs in the review worktree), no GitHub writes, no primary-worktree touches.

## (a) REAL — PASS
Every load-bearing claim reproduced first-hand at live head 5dfe8215940af671da280924b166205662562c4f (base d4757b40…, PR OPEN; `gh pr view` matches):
- Delta scope: 3-dot diff = 5 files, +227/−4 (4 workflows 3/1 each + guard +215/−0), identical to the API file list. Base IS ancestor of head, so 2-dot = 3-dot.
- Blob identity ec9f3e32→5dfe8215: `git ls-tree` at both heads gives the exact five blobs the draft names (ed29a709 / 0ff72aae / fcaf5d66 / 0f151958 / 4655e14f) byte-identical. Draft's "5 files unchanged since our prior review" is exact.
- "19-file head-to-head is inherited master work": `git diff --name-only ec9f3e32 5dfe8215 | wc -l` = 19, and none of the 19 are PR-owned paths — payload-unchanged claim holds.
- Workflow file:line anchors exact: `pull_request:` at ci-ndk-guard.yml:18, ci-unit.yml:12, e2e.yml:9, prettier.yml:9; the only `pull_request_target` hits at head are comment text in preview-deploy.yml (fifth workflow, untouched by this PR); push filters, workflow_dispatch, e2e schedule+inputs, and jobs compare equal to base (read the full 4-workflow patch).
- Harness: scripts read line-by-line — faithful (git archive of the exact head; RED injection restores the verbatim removed line `branches: [main, master, 'auctions/**']` matching the base diff). I re-ran it: exit 0, GREEN 50 pass / 0 fail / 131 expect across the guard + 3 siblings; RED 11 pass / 2 fail, both failures naming e2e.yml — in the per-workflow test and the sweep test, exactly as the draft states.
- YAML: all 4 workflows parse (strict Python yaml). `git diff --check` clean. Prettier 3.8.3 (verified `--version`) checks the 5 PR files clean (check-format.mjs exit 0).
- Live CI at head: 8 paginated check-runs — unit-integration, e2e-grep, prettier, security-scan, footprint, Deploy preview success; e2e-full (if: dispatch/schedule) and Tear down preview (if: closed) skipped by their own job conditions — "configuration-skipped" is accurate.
- Guard behavior claim matches the full test source: block + branches-ignore + inline flow-mapping forms, per-workflow + directory sweep of all *.yml/*.yaml.
- Provenance lines accurate: review 5374232612 (felixfelix-bot, kimi lane) at ec9f3e32 exists; 5646697681 opens "Worker verification — not a review verdict" and ends "Merge-readiness verdict: none offered."

## (b) DEDUP — PASS
Concise (17-line) live-head delta review. It does NOT re-file the previously filed parser limitations (quoted block keys, inline trailing comments, onBlock throw, indentation sensitivity, no-exemption policy) — it references them as previously filed, which I verified are live in plebibot review 5562785745 at the current head. It correctly characterizes 5646697681 as worker verification, not a verdict. It extends 5374232612 rather than repeating it (payload blobs byte-identical → the delta statement is the new content, plus head re-verification numbers). No text duplicates any existing review/comment body.

## (c) SPAM/AACR — PASS
Proportionate to the open gap: the kimi lane's last verdict sits at ec9f3e32; the only live-head felixfelix-bot item is the worker's non-verdict, so a lane verdict at the current head adds coverage without duplicating it. ~2.1 KB, comment-only, no labels/edits. It explicitly disclaims maintainer approval and merge-readiness ("APPROVED — no change requests. Comment-only from the author's own account, not maintainer approval and no merge-readiness claim") and deliberately leaves the human CI-cost/policy sign-off unanswered — consistent with the observed open policy thread.

## (d) MISSED — PASS (no new blockers)
Swept the added lines and the guard myself: no quoted trigger keys, no trailing comments on trigger keys, no anchors/indirection in current workflows, all sweep targets have top-level `on:` (proven by the GREEN sweep passing). One non-exercised scope edge, not previously filed and not a blocker: the sweep reads only `pull_request:` children, so a hypothetical future `pull_request_target: { branches: … }` trigger would evade it — but no pull_request_target trigger exists at head (grep shows comment text only), the guard's docstring already discloses the "key other than branches/branches-ignore / indirection" limitation class, and AGENTS.md requires maintainer approval for any new event kind anyway. Already-filed nonblocking limitations remain nonblocking; nothing new changes the verdict.

## (e) PUBLISHABILITY — PASS (apart from the "(pending)" marker)
Fit as `gh pr review --comment`: self-contained, anchored at the exact head, honest authority framing, no broken markdown, all numbers in it reproduced. Nonblocking calibrations (optional, not required):
1. Line 13 could attribute the "previously filed" limitations to plebibot's live-head review 5562785745 for thread legibility.
2. Line 3 names review 5646697681 as "the live-head review"; a reader may briefly conflate it with plebibot's 5562785745 also at this head — the "worker verification" gloss already disambiguates.
3. The pull_request_target sweep edge (item d) could be folded into the "does not catch" disclosure in a follow-up, not this comment.

Final line's "APPROVED (pending)" gate25 marker is the audit being performed here; assessed apart from it, the draft text itself is accurate and publishable.

## Summary
REAL PASS · DEDUP PASS · SPAM/AACR PASS · MISSED PASS (one nonblocking note) · PUBLISHABILITY PASS. No substantive correction required before posting.

AUDIT: APPROVED