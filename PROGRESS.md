# PROGRESS — AV-1138-DRAFT-SALVAGE (t_5f86aa70)

Task: Is the never-posted draft review (4828c54..50199dc, 4 files, +204/-11) still valid
against the CURRENT head of PlebeianApp/market PR #1138? Which parts are salvageable?
READ-ONLY. Dispatch frozen. Post nothing.

## Milestones

- [M1] Worktree up: ~/worktrees/AV-1138-DRAFT-SALVAGE (full clone; --reference refused
  because ~/repos/market is a linked worktree). PR head fetched as `pr1138-head`.
  Finding: live PR #1138 head = 6be7496cc2089db2e2da04bb083312ae6d43a79d (gh pr view,
  updatedAt 2026-10-06T18:26:49Z). NOT 50199dc. Status: DONE.

- [M2] Draft range identity CONFIRMED. `git diff --stat 4828c54..50199dc` = exactly the
  announced 4 files, +204/-11:
    src/lib/__tests__/fetchMintKeysets.test.ts      | 106 +  (NEW file, A)
    src/lib/__tests__/settlementDescriptor.test.ts  |  17 +-
    src/lib/auction/settlementDescriptor.ts         |  13 +-
    src/lib/auction/validation.ts                   |  79 +-
  4 commits (b3f332f9, 5298dd71, d66298d5, 50199dce) = PR #1289 "fix(settlement): make
  mint-keyset resolution deterministic and network-free in unit tests".
  Author of the range = our own accounts (felixfelix-bot + c03rad0r). NOT Franchovy code.
  4828c54 is ancestor of 50199dc; 50199dc IS ancestor of head 6be7496c.
  Status: DONE.

- [M3] Drift measured: `git rev-list --count 50199dc..6be7496c` = 312 commits;
  `git diff --stat 50199dc..6be7496c` = 264 files, +31835/-3239.
  Per-file post-draft history (git log 50199dc..6be7496c -- <path>):
    fetchMintKeysets.test.ts      -> NO commits since draft (unchanged; content identical)
    settlementDescriptor.test.ts  -> 6 commits (dfb053c0, 2382af2b, 999408c9, a6ce5498,
                                     2386924d, 2386aed3)
    settlementDescriptor.ts       -> 4 commits (d633ba64, a4962850, dfb053c0, 2386aed3)
    validation.ts                 -> 9 commits (largest: 9867df25 "retire dleq_required",
                                     1644fb9a single canonical mintSupportsDleq, 2386924d,
                                     80934610, 489cf466, 31d11ef8, f8f24e06, 25167a60, 66848aa0)
  `git diff --stat 50199dc..6be7496c -- <4 files>` = 3 files, +574/-201 (only the new test
  file untouched). Status: DONE.

- [M4] Every draft ADDED symbol still present VERBATIM at head (the semantics survived the
  rewrites even though line numbers moved):
    validation.ts @head: KEYSET_CACHE_FAILURE_TTL_MS:66, KEYSET_FETCH_TIMEOUT_MS:67,
      isFailure flag on the cache entry:68-72, clearKeysetCache:78, requestWithTimeout:97,
      AbortSignal.timeout(...):104, ttl= isFailure?short:long:118,
      CashuMint.getKeySets(mintUrl, requestWithTimeout):125, negative-cache set:134,
      success-cache set:137
    settlementDescriptor.ts @head: `mintKeysets?: MintKeyset[]` at :86 (draft put it at :80),
      `mintKeysets?: MintKeyset[]` param threading at :135/:155/:307, and the injection
      short-circuit `input.mintKeysets ?? (await fetchMintKeysets(...))` now at :587 (draft: :558)
    settlementDescriptor.test.ts @head: `mintKeysets: mockMintKeysets()` in makeInput,
      `mockMintKeysets()` helper, the ADR-0005 comment
  Status: DONE.

- [M5] Draft ARTIFACT hunt: NOT found for this range.
  - /home/c03rad0r/hermes-orchestration/state/reports/review-1138-delta-POST.md (+TRIMMED.md;
    identical copies under cw-untracked-backup-1789205713) is a DIFFERENT review: range
    0329899..8bf1a35 (ADR-0009 docs), dated Sep 13, docs-only. NOT the target draft.
  - /home/c03rad0r/reports/reviews/plebeian-pr-reviews-t_4d6cdb2d-pr1138-own-delta-manifest.md
    is a read-only delta MANIFEST (dependency input), not a findings draft.
  - No file anywhere contains BOTH 4828c54 and 50199dc as a review range.
  => Only the range + 4-file list recoverable. Status: DONE.

- [M6] STRUCTURAL finding from the Gate-2.5 audit record (kanban t_df271b10/t_0156cc5f
  sibling; verdict recorded in session 20261002_144847_a6ced3 / 20261002_150449_b7cdb0):
  at review time the head was eacc4256 (not 50199dc); the merge-base master..head was
  c8c06fd7; and the audit recorded that the draft range 4828c54..50199dc is NOT inside PR
  #1138's diff range (verified here too: `git merge-base --is-ancestor c8c06fd7 50199dc`
  = FALSE, i.e. 50199dc is an ancestor of the PR base, pulled in by master, not by #1138).
  Status: DONE.

## Pending
- [M7] Write REPORT.md (a)**(b)(c)(d); commit + push.
