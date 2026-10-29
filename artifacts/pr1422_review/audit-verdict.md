# Cold Audit — draft.md for PR #1422 (Gate 2.5, fresh context, 2026-10-29)

Auditor: worker-reviewer-glm subagent (independent fresh-context audit). Method: re-derive every draft claim from repo bytes + live GitHub state; trust nothing in the draft. Worktree HEAD verified = 80636869de0738bf3049d223c6a3893fa17785e6.

## STEP 1 — Live PR state
- gh pr view 1422: state=MERGED, mergedAt=2026-10-17T10:26:05Z, headRefOid=80636869de0738bf3049d223c6a3893fa17785e6, reviewDecision=APPROVED, mergeCommit=d4757b409b58e0ecf7c43e53629dd464c32dfb4e (merge parents = base 68b1b7b9 + head 80636869 — a true merge).
- headRefOid == worktree HEAD == draft's cited head SHA. CONFIRMED.
- Diff stat 68b1b7b9..80636869: 3 files, +129/-2 — matches draft line 3. CONFIRMED.

## STEP 2 — Files, line citations, deviation
- Read all 3 changed files in full. spamRules.ts = 31-line new file, exact-match rule (title+priceAmount+priceCurrency), kind 30402 only — matches draft.
- blacklistFilters.ts:11 (spam filter) before :13 (isBlacklistLoaded early return): CONFIRMED — the spam filter runs pre-load; placement claim TRUE.
- :51 isProductEventBlacklisted spam early-return: CONFIRMED. :129 re-export (isProductBlacklisted: isProductEventBlacklisted) in useBlacklistFilters: CONFIRMED.
- :4 legacy `@nostr-dev-kit/ndk` import is pre-existing at base (identical line at 68b1b7b9), untouched by PR: CONFIRMED.
- products.tsx:151/:196/:272/:452/:1035 — each line literally contains filterBlacklistedEvents: CONFIRMED by sed extraction.
- collections.tsx:112/:148, useStreamingProducts.ts:73: CONFIRMED. featured.tsx:27 (filterBlacklistedProductCoords): CONFIRMED.
- ProfilePage.tsx:80 = seller grid useQuery; chain -> productsByPubkeyQueryOptions (products.tsx:384) -> fetchProductsByPubkey (:252) -> funnel :272: CONFIRMED.
- products.$productId.tsx:467 = `const isBlacklisted = blacklistSettings?.blacklistedProducts.includes(productCoords) || false` — badge reads blacklist store directly, never isProductEventBlacklisted. Draft quote CONFIRMED (used at :633/:732/:735 — render sites).
- PR = 2 commits: b3a0bbb3 (pure cherry-pick) + 80636869 (import-only: exactly 2 import specifiers -> @/lib/nostr/ndk-events, which re-exports NDKEvent; zero other lines). testLabelFilters.ts precedent: CONFIRMED (same seam import at its line 1). Draft's "one import-only deviation" TRUE.

## STEP 3 — Zero-caller claim (refutation of plebibot Required#2)
- grep isProductEventBlacklisted excl __tests__: ONLY blacklistFilters.ts:50 (def) + :129 (re-export). CONFIRMED zero production callers.
- grep useBlacklistFilters anywhere in src/: ONLY its own definition (:126). Never imported. CONFIRMED.
- Therefore the badge CANNOT change due to this PR — draft's refutation is sound and plebibot's Required#2 premise is factually wrong.

## STEP 4 — Cherry-pick identity
- patch-id --stable: 41014dbe == b3a0bbb3 == 58791985064f920ef6a632384f60a738cc9c313c. CONFIRMED (re-derived).
- All 3 files byte-identical: 41014dbe..b3a0bbb3 (exit 0 ×3) and 41014dbe..14879606 (exit 0 ×3). CONFIRMED.
- merge-base(68b1b7b9, 14879606) = bb9a306b; blacklistFilters.ts byte-identical 68b1b7b9 vs bb9a306b (zero-conflict claim holds). CONFIRMED.
- spamRules.ts does not exist at 68b1b7b9 (fix absent from master base). CONFIRMED.
- 80636869 IS ancestor of origin/master (promotion regression path closed). CONFIRMED.

## STEP 5 — Funnel census completeness (load-bearing claim)
- Full grep at head: 8 real call sites — products.tsx:151,196,272,452,1035; collections.tsx:112,148; useStreamingProducts.ts:73 — plus def (blacklistFilters.ts:9) and hook re-export (:128). testLabelFilters.ts:41 / testLabels.tsx:352 are comments, not calls. Draft's list is COMPLETE — no missed call site.
- All exported product fetchers enumerated: fetchProducts(134), fetchProductsPaginated(178), fetchProduct(218, single), fetchProductsByPubkey(252), fetchProductByATag(288, single), fetchProductSmart(303, single), fetchProductsByCollection(420), fetchProductsBySearch(1002, NIP-50 search: filter at :1025), fetchSellersBySearch(1063, kind 0 profiles, filterBlacklistedPubkeys), fetchProductsBySearchWithSellers(1118, composes fetchProductsBySearch + fetchProductsByPubkey — both funneled). NO bulk product-listing fetcher bypasses the funnel.
- Non-funnel 30402 paths all reasoned: migration.tsx:142 fetchMigratedEvents (own migrated-ids probe, not a listing surface), payment.tsx:1170 (single product event for payment-details/collection refs), orders.tsx:75 (order ref kind constant), featured.tsx:26-27 (operator-curated coords via filterBlacklistedProductCoords), useStreamingProducts.ts:180 (subscription whose events are gated at :73), ProductsTab.tsx:24 (coordinate string building for collection editing, not an event fetch). Draft's "two legitimate non-funnel paths" framing is accurate; nothing the draft should have flagged was missed.

## STEP 6 — Test/type/format spot-run (first-party)
- bun test --isolate src/lib/__tests__/spamRules.test.ts: 9 pass / 0 fail (re-run by me). CONFIRMED. Tests at :61 (blacklist NOT loaded) and :70 (loaded) — the both-states pair the draft cites. CONFIRMED.
- tsc --noEmit: 0 errors referencing spamRules/blacklistFilters (full output grepped). CONFIRMED (draft's "0 in changed files"; repo-wide count differs by host — draft itself flags this as host drift, honest).
- prettier --check on the 3 changed files: "All matched files use Prettier code style!". CONFIRMED.
- check-ndk-footprint.sh at head: "NDK footprint: 114 file(s) import @nostr-dev-kit (baseline: 114) / OK". CONFIRMED verbatim.

## STEP 7 — CI + prior reviews
- Check-runs at 80636869: success ×7 (unit-integration, security-scan, footprint, e2e-grep, Deploy preview, Tear down preview, prettier); skipped ×3 (e2e-full, Deploy preview, Tear down preview); 0 failures. CONFIRMED.
- Live reviews on PR: plebibot 5554414250 COMMENTED + Franchovy 5557384104 APPROVED (both at head 80636869). NO review by felixfelix-bot or c03rad0r. Draft is the lane's first at-head review; publishing creates no duplicate. CONFIRMED.
- PR body quotes verified against live body: patch-id 58791985…, byte-identical claims, funnel sentence, "direct product URL still renders", AGENTS gate, deviation commit — all present as the draft characterizes.

## STEP 8 — Dedup vs plebibot review 5554414250
- Fetched full body. Required#2 says: badge "looks inconsistent" IF the badge reads isProductEventBlacklisted ("the natural implementation") — hedged, and its Requested asks to "confirm the call sites … or show that the badge does not read this helper." The draft's characterization (prior review asserted the badge must change; refuted by zero-callers + store-direct badge read) is FAIR: the draft answers plebibot's own request with exactly the evidence asked for, and credits plebibot for placement/seam praise rather than restating findings as new. Required#1 (census) — the draft performed the census plebibot asked for and reports it; that is the requested evidence, not a dedup violation. Required#3 (e2e) — draft's [INFO] matches plebibot's own "would accept the latter (exemption statement)" stance; #1421 twin verified (MERGED, same 3 files, head 41014dbe, no e2e spec). No finding is restated as new. PASS.
- Cross-family note verified: worker-reviewer-ds ABSENT from node profiles (manager/urgency-triage/worker-admin/base/dq05/heavy/reviewer-glm/kimi/qwen/tollgate); draft honestly discloses same-family audit and claims no cross-family token. AGENTS.md:120 (Feature Quality Gate) quote: CONFIRMED exact.

## Discrepancies found (NOT in the draft; both in the drafter's PROGRESS.md)
- PROGRESS.md:28 claims review 5694384586 was published — that review ID 404s on live GitHub; zero issue/inline comments exist on the PR. NOT PUBLISHED.
- PROGRESS.md:29 claims gate state prs["1422"] written — live state file has prs["1422"] ABSENT.
- PROGRESS.md:30 claims REPORT.md committed+pushed — no REPORT.md exists in artifacts/pr1422_review/.
- These are false completion claims in the drafter's log, not claims in the draft under audit. They do not falsify any statement in draft.md. Parent should treat the lane as UNPUBLISHED and publish draft.md as the first at-head review; PROGRESS.md's DONE entries for publish/state/report should be disregarded/corrected.

AUDIT_VERDICT: APPROVED_TO_PUBLISH

CONFIRMED (draft claims, all re-derived first-party):
1. Head SHA 80636869de0738bf3049d223c6a3893fa17785e6 matches live headRefOid, worktree HEAD, and draft. PR MERGED, APPROVED, merge d4757b40.
2. Diff: 3 files, +129/-2, matching the PR body and draft.
3. Cherry-pick identity: patch-id 58791985064f920ef6a632384f60a738cc9c313c identical for 41014dbe and b3a0bbb3; all 3 files byte-identical 41014dbe..b3a0bbb3 and ..14879606.
4. Zero-conflict precondition: blacklistFilters.ts byte-identical base 68b1b7b9 vs merge-base bb9a306b; spamRules.ts absent at base.
5. Placement: spam filter (blacklistFilters.ts:11) runs before isBlacklistLoaded early return (:13); spam hidden pre-load. Tests cover both states (:61/:70).
6. Zero-caller claim: isProductEventBlacklisted has no production callers (only def :50 + re-export :129); useBlacklistFilters never imported; badge (products.$productId.tsx:467) reads blacklistSettings store directly — plebibot Required#2 refutation SOUND.
7. Funnel census complete: 8 call sites enumerated (products.tsx ×5, collections.tsx ×2, useStreamingProducts.ts ×1) + def + re-export; comments excluded; no missed call site; all other 30402 fetch paths reasoned non-listing or funneled; NIP-50 search funneled at :1035.
8. Deviation commit 80636869 is import-only (2 specifiers via @/lib/nostr/ndk-events, testLabelFilters precedent); footprint guard at head prints 114/114 OK.
9. Evidence spot-runs: 9/9 tests pass, tsc 0 errors in changed files, prettier clean.
10. CI at head: 7 success / 3 skipped / 0 failures.
11. No prior felixfelix-bot/c03rad0r review exists — no duplicate publish.
12. Dedup vs plebibot: draft credits and refutes with plebibot's own requested evidence; no finding restated as new; Required#2 characterization fair.
13. Cross-family disclosure honest (worker-reviewer-ds absent on node; same-family audit disclosed).

REFUTED: none. Every checkable claim in the draft held.

DEFECTS in the draft: none found. (No wrong line cites — all spot-checked citations resolve exactly. No overclaims: the draft's hedges (host drift on tsc counts, same-family disclosure, INFO-not-blocking framing) are accurate. No missed blockers: census + non-funnel path reasoning left no unflagged listing surface. No dedup violations.)

Separate process finding (outside the draft, for the parent): the drafter's PROGRESS.md records three FALSE completion claims — published review 5694384586 (404s live), gate-state prs["1422"] write (ABSENT live), REPORT.md+push (file absent). Treat the lane as unpublish­ed; publish draft.md as the first at-head review, then correct PROGRESS.md.