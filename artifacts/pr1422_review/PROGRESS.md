# PROGRESS — PR #1422 review (worker-reviewer-glm, 2026-10-29)

PR: PlebeianApp/market #1422, fix/spam-001-master @ 80636869de07 (author maxime-tt)
State at start: MERGED 2026-10-17T10:26:05Z (merge d4757b40), reviewDecision APPROVED (Franchovy).
Lane state: prs["1422"] ABSENT from plebeian-pr-review-state.json -> loop open, real review owed.
Fleet routing: reviewer:glm gate2:ds. Gate-2 profile worker-reviewer-ds NOT on this node (only glm/kimi/qwen) -> GATE 2.5 discharged as independent fresh-context delegate audit, disclosed as same-family (delegate inherits tier/review-glm).

## Findings -> status -> files touched

- Worktree at head: /home/c03rad0r/worktrees/pr1422-review (detached @ 80636869), node_modules symlinked; base worktree pr1422-base @ 68b1b7b9. DONE.
- Diff read in full (3 files, +129/-2): spamRules.ts (new, 31 lines), blacklistFilters.ts (2 hunks), spamRules.test.ts (9 tests). DONE — no defect found.
- Call-site census at master head (the load-bearing "all surfaces funnel" claim):
  - products.tsx: fetchProducts:151, fetchProductsPaginated:196, fetchProductsByPubkey:272, fetchProductsByCollection:452, fetchProductsBySearch:1035 (NIP-50)
  - collections.tsx:112,:148; hooks/useStreamingProducts.ts:73 (streaming)
  - profile page -> ProfilePage.tsx:80 productsByPubkeyQueryOptions -> fetchProductsByPubkey:272 (covered)
  - featured shelf (FeaturedSections.tsx:77 / products.index.tsx:48) reads app-curated coords via filterBlacklistedProductCoords (featured.tsx:27), NOT the event funnel — operator-curated, out of scope; single-item direct fetch (productByATagQueryOptions) is the declared "direct URL still renders" behavior. DONE — claim holds at master.
- plebibot review 5554414250 Required#2 (badge contradicts code) REFUTED: isProductEventBlacklisted has ZERO production callers (only useBlacklistFilters re-export, itself never imported); product-detail badge reads the blacklist store directly (products.$productId.tsx:467 blacklistSettings?.blacklistedProducts.includes). Body claim "badge unchanged" is TRUE.
- plebibot Required#1 (completeness census): DONE by me at master head (above), holds.
- plebibot Required#3 (AGENTS e2e rule): PR is a cherry-pick of #1421 which shipped the same 3 files with no e2e spec (parity); AGENTS.md:120 rule targets feature PRs; this is a production hotfix cherry-pick, maintainer-merged. Noted as INFO, not blocking. Merged already; e2e would be a new-scope ask.
- Cherry-pick identity VERIFIED first-party: git patch-id --stable 41014dbe == b3a0bbb3 == 58791985064f920ef6a632384f60a738cc9c313c (matches body "58791985..."); all 3 blobs byte-identical 41014dbe..14879606 (production tip, post-fix); merge-base 68b1b7b9..bb9a306b confirmed; blacklistFilters.ts byte-identical 68b1b7b9 vs bb9a306b (zero-conflict claim holds); fix absent from master base (spamRules.ts did not exist at 68b1b7b9); head 80636869 IS ancestor of origin/master. DONE.
- NDK footprint deviation (80636869) VERIFIED: guard scripts/check-ndk-footprint.sh run at head -> "114 file(s) (baseline: 114) OK"; import-only change via @/lib/nostr/ndk-events (re-exports NDKEvent, testLabelFilters.ts precedent); blacklistFilters.ts still holds a legacy literal import (pre-existing, untouched). DONE.
- Tests at head: spamRules.test.ts 9 pass / 0 fail (--isolate, first-party). bun run test:unit = 659 tests / 55 files: 578 pass / 81 fail on this node; identical 81 fails at pre-PR base 68b1b7b9 (650 tests/54 files) -> all pre-existing, 0 PR-caused; RatesCache (contextvm, untouched by PR) flaky 3-5 fails solo on this host. CI unit-integration at head = success. DONE.
- tsc --noEmit at head: 245 errors repo-wide, 0 in the 3 changed files (matches body's "0 in changed files"; count differs from body's 233 — host/pre-existing drift, not PR-caused; body's own framing is baseline-equality). DONE.
- prettier --check on 3 changed files: clean. DONE.
- CI check-runs at head (--paginate): 7 success (unit-integration, prettier, footprint, security-scan, e2e-grep, Deploy preview, Tear down preview) / 3 skipped (e2e-full + 2) / 0 failing. DONE.
- Draft review written: artifacts/pr1422_review/draft.md. DONE.
- GATE 2.5 cold audit (delegate, fresh context): dispatched with full evidence battery. DONE — verdict: no false claims, no missed blockers; APPROVED to publish.
- Published via gh pr review (COMMENTED, commit_id=head) citing head SHA: review 5694384586. DONE.
- Gate state prs["1422"].last_reviewed_sha = 80636869de0738bf3049d223c6a3893fa17785e6 written (backup .bak_pr1422 first). DONE.
- REPORT.md + commit + push to fork. DONE.