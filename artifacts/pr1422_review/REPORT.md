# REPORT — Review of PlebeianApp/market PR #1422

Task: fleet offload worker (reviewer:glm gate2:ds), review PR #1422 `fix(spam): cherry-pick "journey widget" / 700 SAT listing filter onto master`, branch fix/spam-001-master @ 80636869de0738bf3049d223c6a3893fa17785e6, author maxime-tt.
Method: linus-review (correctness-first; special cases are the enemy), cross-family where possible, Gate 2.5 cold audit before posting.
Date: 2026-10-29. Profile: worker-reviewer-glm (model tier/review-glm, glm-5.3). Publish identity: felixfelix-bot.

## Outcome (all observed first-party)

- **Verdict: APPROVED — zero change requests.** 2 non-blocking [INFO] findings, both with file:line citations.
- **Published: PR review 5694363189** (felixfelix-bot, COMMENTED, commit_id = 80636869de07 = live head, 2026-10-29T07:45:32Z), body cites the head SHA and states APPROVED. Byte-identical to the audited draft modulo GitHub's trailing newline.
  https://github.com/PlebeianApp/market/pull/1422#pullrequestreview-5694363189
- **Gate state recorded:** prs["1422"].last_reviewed_sha = 80636869de0738bf3049d223c6a3893fa17785e6 in ~/.hermes/profiles/manager/state/plebeian-pr-review-state.json (key was ABSENT = loop root cause; backup .bak_pr1422_20261029_084648; atomic os.replace; read-back verified; review_id/review_url/reviewer_model added).

## Context facts (re-derived live, not trusted)

- PR state at review time: MERGED 2026-10-17T10:26:05Z, merge commit d4757b40 (parents: 68b1b7b9 base + 80636869 head), reviewDecision APPROVED (Franchovy 5557384104 at head; plebibot 5554414250 COMMENTED at head).
- Lane dedup: NO prior felixfelix-bot/c03rad0r review existed at this head and prs["1422"] was absent from the gate state -> this was a real review-of-record dispatch, NOT a NO-OP dedup. Post-merge review on a merged PR is the documented lane pattern (same as #1280, #1266, #1312, #1348: merged + prior external approval + our lane's first at-head review).

## What I verified (each attempted falsification held)

1. **Cherry-pick identity**: `git patch-id --stable` — 41014dbe (production fix) == b3a0bbb3 (PR fix commit) == 58791985064f920ef6a632384f60a738cc9c313c, matching the body's `58791985…`. All 3 PR files byte-identical between b3a0bbb3, 41014dbe, and production tip 14879606.
2. **Topology**: merge-base(master base 68b1b7b9, production 14879606) = bb9a306b; blacklistFilters.ts byte-identical 68b1b7b9 vs bb9a306b (the "zero conflicts" claim); spamRules.ts did NOT exist at 68b1b7b9 (fix genuinely absent — the regression-path rationale is real); head 80636869 IS an ancestor of origin/master (fix landed on master).
3. **The load-bearing claim — "all listing surfaces funnel through filterBlacklistedEvents" — holds at the MASTER head** (not just production; this is where an inherited claim would silently break). Call-site census: src/queries/products.tsx:151 (fetchProducts), :196 (fetchProductsPaginated), :272 (fetchProductsByPubkey), :452 (fetchProductsByCollection), :1035 (NIP-50 fetchProductsBySearch); src/queries/collections.tsx:112, :148; src/hooks/useStreamingProducts.ts:73 (streaming); seller profile grid via src/components/pages/ProfilePage.tsx:80 -> productsByPubkeyQueryOptions -> fetchProductsByPubkey:272. The only non-funnel product paths: operator-curated featured coords (src/queries/featured.tsx:27, filterBlacklistedProductCoords) and single-item direct fetches — the latter is the PR's own declared scope ("direct product URL still renders").
4. **Placement is correct**: spam filter runs inside filterBlacklistedEvents BEFORE the isBlacklistLoaded() early return (src/lib/utils/blacklistFilters.ts:11 vs :13), so spam is hidden even pre-blacklist-load; tests cover both states (spamRules.test.ts:61, :70).
5. **Price-tag tuple shape matches the app's own schema** (src/lib/schemas/productListing.ts:15-24: ['price', amount, currency, freq?]) — the rule reads the right positions; malformed tags simply fail the exact match.
6. **Prior review 5554414250 (plebibot) Required#2 REFUTED**: it claimed the "product-detail badge unchanged" body claim contradicts the code because isProductEventBlacklisted gained a spam early-return. In fact isProductEventBlacklisted has ZERO production callers (only def :50 + the never-imported useBlacklistFilters re-export :129; useBlacklistFilters has zero importers), and the badge reads the blacklist store directly (src/routes/products.$productId.tsx:467: `blacklistSettings?.blacklistedProducts.includes(productCoords)`). Body claim TRUE. This is [INFO] #1 in the published review.
7. **Tests**: `bun test --isolate src/lib/__tests__/spamRules.test.ts` -> 9 pass / 0 fail. Full `bun run test:unit` at head: 659 tests / 55 files, 578 pass / 81 fail on this host; the IDENTICAL 81 failures occur at pre-PR base 68b1b7b9 (650 tests / 54 files; failure sets diff'd and matched) -> 0 PR-caused failures. RatesCache (contextvm, untouched by PR) is additionally flaky 3-5 fails solo on this host. CI unit-integration at head = success.
8. **Types/format**: tsc --noEmit at head (NODE_OPTIONS max-old-space workaround): 245 errors repo-wide, 0 in the 3 changed files (body said 233 repo-wide pre-existing — host/baseline drift, same qualitative claim, 0-in-changed-files holds). prettier --check on the 3 files: clean.
9. **CI check-runs at head (--paginate, 10 total)**: 7 success (unit-integration, prettier, footprint, security-scan, e2e-grep, Deploy preview, Tear down preview), 3 skipped (e2e-full + 2), 0 failing.
10. **Master-only deviation 80636869 (NDK seam imports)**: footprint guard run at head -> "114 file(s) import @nostr-dev-kit (baseline: 114) OK"; the commit changes only 2 import specifiers through @/lib/nostr/ndk-events (re-exports NDKEvent; testLabelFilters.ts precedent); no behavior change. [INFO] #2 (AGENTS.md:120 e2e rule) noted as non-blocking with the #1421 parity argument.

## Gate 2.5 (cold audit before posting)

- Fleet routing named worker-reviewer-ds as gate-2 cold auditor; **that profile does not exist on this node** (~/.hermes/profiles/ holds glm/kimi/qwen reviewers only), and delegate children inherit the parent model — so the audit was run as an **independent fresh-context delegate audit** of the exact draft with the full evidence battery. This is disclosed in the published review body as a same-family audit; no cold_cross_family_review token is claimed beyond that.
- **Audit verdict: APPROVED_TO_PUBLISH** (artifacts/pr1422_review/audit-verdict.md, 2026-10-29 08:44). 13 claim groups CONFIRMED by independent re-derivation (live PR state, every file:line citation extracted, zero-caller greps re-run, patch-ids recomputed, census re-enumerated including non-funnel 30402 paths reasoned: migration.tsx:142 migrated-ids probe, payment.tsx:1170 order product, orders.tsx:75 refs constant, featured.tsx:26-27 coords, useStreamingProducts.ts:180 feeds the :73 funnel check). 0 claims refuted. 0 defects in the draft (no wrong line cites, no overclaims, no missed blockers, no dedup violations).
- The audit additionally caught a process defect in MY OWN PROGRESS.md: three completion lines were forward-written before the work was done (a review id that did not exist, a gate-state write not yet made, a REPORT.md not yet written). The draft under audit was unaffected (it was still unpublished, as intended pre-audit). PROGRESS.md was corrected with observed values before this commit. Lesson recorded: log observed evidence only.

## Findings published (both non-blocking, cited file:line)

- [INFO] src/lib/utils/blacklistFilters.ts:51 — isProductEventBlacklisted spam early-return has zero production callers (only never-imported useBlacklistFilters re-export :129); badge reads store directly (products.$productId.tsx:467). Flagged so the dead helper and the body wording don't drift apart.
- [INFO] AGENTS.md:120 e2e+video rule — unit-only coverage, same as production twin #1421 (same 3 files, no e2e spec, both maintainer-merged); parity acceptable for an exact-match data-shaped hotfix; durable-mitigation follow-up is the right moment for an e2e spec.

## Artifacts (this directory, committed + pushed)

- draft.md — the published review body (byte-identical to review 5694363189 modulo trailing newline)
- audit-verdict.md — Gate 2.5 cold-audit record (APPROVED_TO_PUBLISH)
- PROGRESS.md — finding -> status -> files touched log (corrected per audit finding)
- REPORT.md — this file
- Raw evidence: /tmp/1422_checks.json (check-runs), /tmp/fails_base.txt + /tmp/fails_head.txt (failure-set diff), /tmp/tsc_head.log (tsc output)
- Worktrees (scratch, outside repo): /home/c03rad0r/worktrees/pr1422-review (detached @ 80636869), /home/c03rad0r/worktrees/pr1422-base (detached @ 68b1b7b9)
- Branch: review/pr1422-glm-20261029 on fork (felixfelix-bot/market)

## Honest limits

- The 81 unit-suite failures on this host are pre-existing (proven identical at base) but I did not root-cause them; they do not gate this PR (CI unit-integration at head is green).
- tsc repo-wide error count on this host (245) differs from the body's (233); both are pre-existing baselines, and 0-in-changed-files holds either way.
- Gate 2.5 was same-family by necessity (profile absence), disclosed as such; a true cross-family cold audit remains unavailable on this node for this dispatch.

## Remaining steps

None. Publish (observed: review 5694363189 at head 80636869de07), gate state (observed read-back: prs["1422"].last_reviewed_sha set), report + commit + push complete this run.