# PR #1132 review — PROGRESS (crash-recovery map)

Task: review PlebeianApp/market PR #1132 @ b492322c (dispatch pin).
Lane: worker-heavy (zai tier/worker-heavy). Date: 2026-10-29.

- Step 1 fetch: dispatch pin b492322c exists locally as a commit; LIVE head is 5382a05b; PR state is **CLOSED** (closedAt 2026-10-05T07:40:50Z, mergedAt null) — dispatch state is stale. → done
- Step 2 dedup: prev_issues 3 items matched against diff; getPublishCurrency dead code still present at b492322c:143 (same root cause → duplicate, not re-raised); BTC double-convert and Subtotal/Total both fixed at b492322c → done
- Step 3 new-issue scan at b492322c and at tip 5382a05b (27-file diff + post-pin delta abfa7bfa/5382a05b): zero qualifying NEW [BLOCK]/[RISK]/[NIT] → done
  - candidates considered and rejected: unused `cartStore` import left in CartItem.tsx after the cart-preview removal (no noUnusedLocals, no runtime trigger); ShippingTab `combinedDisplay` NaN path (renders '—', graceful); parseShippingReference → ParsedShippingReference shape change (all 6 call sites migrated, verified by grep); communityPercentage new required field (single producer + two defaults, verified); per-item shipping cost rows removed from CartItem (intent of the PR title, replaced by OrderFinalizeComponent breakdown).
- Step 4 draft: written to REPORT.md §Draft, labelled DO-NOT-POST → done
- Step 5 Gate 2.5: **not dispatched** — nothing to publish, so the publish gate it guards cannot fire. A glm cold audit of an earlier draft for this same PR already exists at ~/reports/reviews/plebeian-pr-reviews-t_d61300b4-glm-1132-cold-audit.md (REJECTED: duplicate + spam findings). → n/a
- Step 6 publish: **NOT PUBLISHED** — PR is CLOSED (author closed, unmerged) and both SHAs already carry our reviews (5258123343 @ b492322c 2026-09-19; 5378649017 @ 5382a05b 2026-10-01). A further comment is duplicate/AACR noise. → intentionally skipped
- Step 7 contribution PR: **skipped** — requires a published review containing >=1 real BLOCK/RISK; zero published, zero new BLOCK/RISK. Dedup also matches: turizspace/market#1 contribution PR already OPEN (2026-09-09) covering the same review items. → skipped
- Gate 6 status: left as NO-OP; detector state for prs.1132 already has last_reviewed_sha=5382a05b. → done

Files touched: artifacts/pr1132_review/{pr1132.diff,felix_reviews.txt,PROGRESS.md,REPORT.md}
