# REPORT — PR #459 review (fleet offload, gate 1: worker-reviewer-glm, linus-review method)

## Task

Review PlebeianApp/market PR #459 "feat: add Open Graph meta tags for product social previews" (author BenGWeeks, branch feat/product-social-preview) at head `db60d4d7ec896944e79ed2734f42b7ec670a156e`. Cross-family review, then Gate 2.5 cold audit of the draft, then publish via `gh pr review` citing the head SHA, then record `last_reviewed_sha` in gate state.

## Outcome

**CHANGES REQUESTED** — published as review `5695870945` (felixfelix-bot) at the head SHA:
https://github.com/PlebeianApp/market/pull/459#pullrequestreview-5695870945

Gate state: `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` now has `prs["459"].last_reviewed_sha = db60d4d7ec896944e79ed2734f42b7ec670a156e` (backup `.bak_pr459_20261029_095808` taken; verified by re-read).

## Review findings (all verified first-hand at the head bytes)

- **[BLOCK] products.$productId.tsx:390** — `useDocumentMeta` called after three conditional early returns (:258 loading, :267 error, :289 not-found). 18 hooks run on render 1; the product's arrival makes `useDocumentMeta` the 19th → React "Rendered more hooks than during the previous render" crash on direct-link, the exact path this feature targets. Master's merged #1232 hoists the same hook above the gates with an explicit hook-order-stability comment (:504-521).
- **[BLOCK] products.$productId.tsx:231,396 vs :107-:117** — head commit `db60d4d7` ("fix: handle undefined price/currency in Twitter description") is dead code: `price` is coerced to `0` and currency falls back to `'SATS'`, so the `price !== undefined` guard is never false. Unpriced products still advertise "0 SATS".
- **[RISK] products.$productId.tsx:393** — og:image/twitter:image take untrusted relay `image[1]` unvalidated; superseder added `absolutizeImageUrl()` (ogTags.ts:241-246 on master).
- **[RISK]** — client-side injection is invisible to the JS-less crawlers the PR title targets (Twitter/Facebook/Slack/Discord/Telegram/iMessage); only Googlebot benefits. Author's PR note acknowledges SSR is required.
- **[INFO]** — superseded by MERGED #1232 (same feature title; maintainer maxime-tt: "Closing this in favor of #1232"); branch is 826 commits behind master with 1 conflict in the same file. Recommended close-as-superseded, not rebase.
- **[INFO]** — corrected prior review 4745940450's "duplicate meta description" claim: no description meta exists in src/index.html at head and no other injector.
- **[NIT] :99,108-109** — `og:type "product"` isn't a valid OG type; product:price:* is a defunct FB commerce namespace.
- **[NIT] :387** — `description.substring(0,157)` truncates UTF-16 code units; emoji-bearing relay content can be split into a lone surrogate half. Superseder's `truncateForMeta` is code-point-safe for this reason.

## Dedup duty (performed before posting)

Live PR had: 1 copilot COMMENTED review (old head 6d500c018f), 5 BenGWeeks self-COMMENTED reviews (old head 949aa9c058), and 4 felixfelix-bot COMMENTED reviews at the current head (4745911927, 4745913371 — byte-identical dup pair from a past duplicate-post incident, 4745927618, 4745940450). None was a formal APPROVED/CHANGES_REQUESTED verdict, and none cited the two blockers. A fresh formal review was warranted; it was posted once, with no duplicate.

## Gate 2.5 (cold audit before posting)

- Named gate-2 profile `worker-reviewer-ds` is ABSENT on this node (~/.hermes/profiles holds only reviewer-glm/kimi/qwen + manager/worker-*). The audit was discharged as a fresh-context independent subagent (delegate_task) — same-family; NOT cited as cross-family.
- The subagent ran ~18 verification commands over ~9 minutes, confirming: hook-order defect (:390 after :258/:267/:289), dead price guard (:231/:396 vs :117), og:image claim, #1232 MERGED, 826-behind count, master's absolutizeImageUrl. Its final LLM message died on HTTP 503 (glm-5.3 capacity exhausted, exit_reason=max_iterations), so the verdict was reconstructed from its verified transcript + dispatcher-completed steps 7-10 (index.html check, missed-defect sweep, tone check, citation re-verification).
- Audit verdict: **CONFIRMED_W_AMENDMENTS**. Amendments applied before publishing: (1) hook count corrected 14/15 → 18/19 with per-hook line cites; (2) stale "590 commits behind" removed (826 is current); (3) [NIT] surrogate-pair truncation added (:387); (4) hook-body line citations corrected (:117, :108-109, :99); (5) "PR text says" → the untrusted-relay-data constraint is from repo AGENTS.md, not the PR. The audit caught my hook-count error and citation drift — the two things it existed to catch.
- Audit artifact: artifacts/pr459_review/audit/audit-verdict.md (also BRIEF.md with the full method).

## Verification commands (evidence)

- `gh pr view 459 --repo PlebeianApp/market --json headRefOid,state,reviewDecision` → head matches pin, OPEN, REVIEW_REQUIRED
- `git show db60d4d7...:src/routes/products.$productId.tsx` → all line citations verified via `awk 'NR==<n>'`
- `git rev-list --count db60d4d7..origin/master` → 826; `git merge-tree` → 1 conflict in products.$productId.tsx
- `gh pr view 1232 --json state,mergedAt` → MERGED 2026-09-14T06:19:46Z
- `gh api repos/PlebeianApp/market/issues/459/comments` → maxime-tt comment 5310184633 verbatim
- `gh pr review 459 --request-changes --body-file ...` → review 5695870945 confirmed via `gh api .../pulls/459/reviews`

## Commits (this lane)

All on branch `review/pr459-20261029` pushed to `fork` (felixfelix-bot/market):
- `0a360d00` verification + draft review at head db60d4d7
- `936bee88` line-citation corrections in draft
- `b02a495f` gate 2.5 cold audit CONFIRMED_W_AMENDMENTS + audit artifacts + gate-state updater
- (final) published-review snapshot + REPORT.md + PROGRESS.md close-out

## Caveats / honesty notes

- The review was posted with `--request-changes` (not APPROVED) because it raises changes; the body does not state "APPROVED" (brief only requires that string when there are no change requests).
- The cold audit was same-family (glm) because the named ds profile doesn't exist on this node — stated in the audit artifact and here, not cited as `cold_cross_family_review`.
- CI at the head: 1 check-run visible (success), combined status pending/0 total — no CI evidence claimed.
- PR was created 2025-12-21 and has sat; the branch predates 826 commits of master drift, including the merged superseding implementation.

## Remaining steps

None — task complete. Review published at head SHA; gate state recorded; artifacts committed and pushed.