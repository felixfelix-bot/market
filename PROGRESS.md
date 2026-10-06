# PROGRESS — pass 135 (worker-heavy/1286-dedupe-spam-f7)

Crash-recovery map. One line per cluster: finding -> status -> files touched.

- Inputs re-verified under my own commands -> DONE: draft artifact
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` present (3548 B, md5
  `0fc6675ab0cfab78d9b9a6d568e9ed5a`, 7 findings D1-D7); PR head UNCHANGED
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, OPEN/draft/MERGEABLE/base `auctions`, 14 files;
  comparison set = 1 issue comment (#5617745226 = the five prev-issues), 0 reviews, 0 review
  comments -> no files touched (read-only gh).
- Cited lines re-read at the SHA -> DONE: D1 `StorefrontIdentityManager.ts:84-93` (registry-only);
  D2 `EventHandler.ts:84` (`purchaseManagers` includes both legacy managers); D3
  `account/storefront.tsx:66-76` -> `schemas/storefront.ts:84-98` flatMap drop + `publish/storefront-page.ts:5,10,12`;
  D4 `publish/storefront-page.ts:10 kind:30024`; D5 `:73 registryDTag:'storefront-names'` + `queries/storefront.tsx:20`;
  D6 `schemas/storefront.test.ts:1` vs `package.json` `test:unit` glob; D7 `StorefrontRenderer.tsx:52-68`
  -> no files touched (read-only git).
- Prev-issue sites re-read -> DONE: prev#1 `$vanityName.tsx:21`; prev#2 `nip05.ts:10-12` merge;
  prev#3 `StorefrontIdentityManager.ts:5-53` (no `terms`/`privacy`); prev#4 `storefront.ts:26`
  (`title` no `safeText`); prev#5 `queries/storefront.tsx:39-54` (no `validUntil` filter).
- ADR-019 read at the SHA (333 lines) -> DONE: :110-111, :114-116, :125-127, :134, :140-142, :161-163
  verified verbatim. `docs/adr/` has NO ADR-018.
- Classification independently re-derived -> DONE, identical to prior passes: D1,D2 = DUPLICATE
  OF #2 (ACTIONABLE); D3,D4,D5,D6 = NEW ACTIONABLE; D7 = NEW NIT.
  Count: `4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`.
- Deliverable written -> DONE: `artifacts/pr1286/1286-dedupe-spam-pass135.md`, `REPORT.md`,
  this `PROGRESS.md`.
- Commit + push -> PENDING (recorded here after observed).
- LOOP NOTE: pass 135 of an identical re-dispatch loop; deliverable stable since pass 21.
