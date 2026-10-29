# PROGRESS — PR #459 review (gate 1: worker-reviewer-glm, linus-review)

Repo: PlebeianApp/market — PR #459 "feat: add Open Graph meta tags for product social previews"
Author: BenGWeeks — Head SHA under review: db60d4d7ec896944e79ed2734f42b7ec670a156e (matches pinned head, live OPEN, reviewDecision REVIEW_REQUIRED)

## Findings -> status -> files touched

- F1 [BLOCK] Rules-of-hooks violation: `useDocumentMeta` called at head-file :390 AFTER conditional early returns :258 (loading), :267 (error), :289 (not found). Cold load consumes 14 hooks, product arrival adds a 15th -> React "Rendered more hooks than during the previous render" crash on the direct-link path the PR targets. VERIFIED (grep'd hook list at head; superseding merged #1232 hoists same hook above gates with explicit "React hook-order stability" comment, master products.$productId.tsx:504-521). -> REVIEW.md
- F2 [BLOCK] Head commit db60d4d7 "handle undefined price/currency in Twitter description" is defeated by its own call site: `price = priceTag ? parseFloat(priceTag[1]) : 0` (:231) + `currency: priceTag?.[2] || 'SATS'` (:396) mean `price !== undefined` is always true; unpriced products still emit product:price:amount "0" / currency "SATS" and twitter:description "... - 0 SATS". VERIFIED (:79-:104 hook guard, :231, :390-:397). -> REVIEW.md
- F3 [RISK] og:image passes untrusted relay `image[1]` verbatim (:393); relative/non-HTTP URLs yield broken og:image (crawlers need absolute). Merged superseder added absolutizeImageUrl() for this (master src/lib/ogTags.ts:239-246). VERIFIED. -> REVIEW.md
- F4 [RISK] Architectural: client-side injection invisible to the crawlers the PR title targets (Twitter/FB/Slack/Discord/Telegram/iMessage don't run JS; only Googlebot). Author acknowledges SSR required. VERIFIED (PR body note). -> REVIEW.md
- F5 [INFO] Superseded by MERGED #1232 (same feature title; gate state note "community/459-og-meta-tags"); maintainer maxime-tt comment 5310184633 "Closing this in favor of #1232". Branch 590 commits behind master, 1 conflict. Recommend close, not rebase. VERIFIED via gh api. -> REVIEW.md
- F6 [INFO] Correction to prior review 4745940450: "duplicate meta description" risk is NOT real at this head — src/index.html:4-10 has no description meta and no other src/ code injects one (git grep at head). VERIFIED. -> REVIEW.md
- F7 [NIT] og:type "product" is not a valid OG type; product:price:\* is a defunct FB commerce namespace (harmless, ignored). VERIFIED. -> REVIEW.md

Dedup duty: 4 felixfelix-bot COMMENTED reviews already existed at this head (4745911927, 4745913371 byte-identical dup, 4745927618, 4745940450) — NONE was a formal APPROVED/CHANGES_REQUESTED verdict and NONE cited F1/F2. A fresh formal REQUEST_CHANGES review was warranted, not a duplicate. POSTED ONCE: review 5695870945 (CHANGES_REQUESTED, felixfelix-bot) at https://github.com/PlebeianApp/market/pull/459#pullrequestreview-5695870945

Gate 2.5: named profile `worker-reviewer-ds` is ABSENT on this node (~/.hermes/profiles holds only reviewer-glm/kimi/qwen + manager/worker-\*). Cold audit discharged as independent fresh-context subagent (same-family limitation stated honestly in REPORT.md and audit/audit-verdict.md). Verdict: CONFIRMED_W_AMENDMENTS — hook count corrected 18/19, stale 590→826, surrogate-pair NIT added, citations fixed.

## Status log

- [x] Live PR state verified: head db60d4d7ec == pinned; OPEN; 1 file +83/-0
- [x] Existing reviews/comments read; dedup analysis done
- [x] Code facts verified first-hand at head via `git show db60d4d7:...`
- [x] Superseder #1232 verified MERGED 2026-09-14T06:19:46Z; master carries ogTags SSR implementation
- [x] REVIEW.md draft written (cites head SHA)
- [x] Cold audit (gate 2.5) — CONFIRMED_W_AMENDMENTS (subagent verified 6 claims before 503 death; steps 7-10 completed first-hand; amendments applied)
- [x] Publish review via `gh pr review --request-changes` — review 5695870945 confirmed via API
- [x] Record prs["459"].last_reviewed_sha in manager gate state — written + verified (backup .bak_pr459_20261029_095808)
- [x] REPORT.md final

## Files touched

- artifacts/pr459_review/PROGRESS.md (this file)
- artifacts/pr459_review/REVIEW.md (review body, published verbatim via gh pr review)
- artifacts/pr459_review/REPORT.md (full report)
- artifacts/pr459_review/audit/ (cold-audit workspace)
