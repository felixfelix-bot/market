# PROGRESS — PR #1138 never-posted draft salvage assessment (fleet offload worker)

Task: Determine whether the drafted-but-never-posted delta review (range
`4828c54..50199dc`, 4 files, +204/−11) is still valid against the CURRENT head
of PlebeianApp/market PR #1138, and which parts are salvageable. READ-ONLY; nothing posted.

Prior PROGRESS content (PR #1226 leg) is preserved in git history at `0a4289a6`.

## Findings

- [verified] Live PR #1138 head = `6be7496cc2089db2e2da04bb083312ae6d43a79d`
  (gh api pulls/1138: head_ref `auctions`, base `master` @ `c8c06fd7`, 784 commits,
  state open, mergeStateStatus `dirty`, updated 2026-10-28T23:03:36Z).
  The draft's `50199dc` is NOT the head — it is 312 commits behind.
  -> status: head MOVED
  -> files: none (gh api + git reads)

- [verified] `4828c54` is still the fork point / merge-base of `50199dc` and of the head:
  `git merge-base 4828c54 6be7496cc` = `4828c54`; `git rev-list --count 50199dc...6be7496cc` = `0 312`.
  Draft range `4828c54..50199dc` = 4 commits = the whole of merged PR #1289.
  -> status: anchor VALID, scope superseded

- [verified] Draft ARTIFACT: no draft body file ever existed on disk. Recovered surrogate =
  `reviews/1138-gate-verdict.md` in /home/c03rad0r/repos/plebeian-pr-reviews (commit `697e1c4`,
  + second cold pass `08e2312`), plus kanban card `gate-pr1138-keyset-delta`
  (~/.hermes/kanban.db, title states "VERDICT APPROVED; draft accurate... nothing posted").
  Draft shape: thanks-line + 1 [INFO] cashu-ts drift finding + "no new issues in this delta"
  + "16 findings from prior reviews stand" + close.
  -> status: body UNRECOVERABLE, shape+content reconstructable
  -> files: reviews/1138-gate-verdict.md, reviews/1138-draft-salvage-assessment.md (banner-corrected STALE)

- [verified] Per-file staleness at 6be7496cc (blob compare + `rev-list --count 50199dc..6be7496cc -- <f>`):
  `fetchMintKeysets.test.ts` f6a20243 == f6a20243, 0 commits -> UNCHANGED.
  `settlementDescriptor.ts` 34d2761b -> 6bff19fe, 4 commits -> MODIFIED.
  `settlementDescriptor.test.ts` 0f57e31e -> 0bfa7af5, 6 commits -> MODIFIED.
  `validation.ts` 62520152 -> a429fac2, 9 commits -> MODIFIED.
  Diff after draft restricted to the 4 files: 3 files, +574/−201.
  -> status: 1 of 4 files byte-identical

- [verified] The draft's own subject matter SURVIVES at head, line-shifted:
  `requestWithTimeout` now validation.ts:97-106 (was 85-97), `fetchMintKeysets` :111,
  `KEYSET_FETCH_TIMEOUT_MS` :67, seam `settlementDescriptor.ts:587`. package.json still
  floats `^2.1` (line 39) while bun.lock resolves 2.9.0. Prod caller
  `src/components/AuctionSettlement.tsx:213-235` still passes no `mintKeysets`.
  -> status: [INFO] finding STILL VALID, NEEDS REWORD (line refs + dedup)

- [verified] The [INFO] was ALREADY POSTED in softer form by maxime-tt on merged PR #1289
  (issue comment 5618306565, 2026-09-10, suggestion #4 "prefer a library signal option").
  -> status: cross-thread dedup applies; do not present as new

- [verified] The already-posted at-head review 5690837398 (COMMENTED, commit_id 6be7496cc,
  2026-10-28T23:03:36Z) contains NO keyset/timeout/cashu-ts/requestWithTimeout content.
  -> status: no overlap with the draft's [INFO]; gap still open (dedup-safe)

- [verified] "16 findings from prior reviews stand" is OVERSTATED: the bfd66fc7-era assessment
  found only ~11 stand + 1 half (R2-1/R2-2/R2-5/R2-10 and R2-8's dead-code half were fixed
  pre-draft). Spot-checked 3/11 at 6be7496cc and all 3 still stand: R2-3 `void onBidEvent`
  (subscriber.ts:208), R2-4 no `.max()` on parallel arrays (schemas/auction/bidEvent.ts:80),
  R2-9 `String(n) !== raw...` (p2pkSecret.ts:122). Remaining 8 NOT re-verified this task.
  -> status: STALE as written (count), salvageable as corrected table

- [info] `~/.hermes/bot/.dispatch_frozen` does NOT exist on this host (ls ENOENT). Freeze not
  lifted, not needed: every step was read-only. Zero GitHub writes (gh api GET only).
  -> status: constraint honored

- NEXT: write REPORT.md, commit. No push attempted yet.
