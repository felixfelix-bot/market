# PR #1286 — authoritative metadata + diff re-fetch

Worker: fleet offload (worker-heavy) · Date: 2026-10-29 · Repo: PlebeianApp/market
Mode: READ-ONLY data gathering. No review, no verdict, no GitHub write of any kind.

## 1. Commands run (exact)

```
gh pr view 1286 --repo PlebeianApp/market --json title,body,headRefOid,state,files,baseRefName,mergedAt,url,author
gh pr diff 1286 --repo PlebeianApp/market > /tmp/pr1286.diff
```

Raw captures (verbatim tool output, not re-typed):

- `artifacts/pr1286_refetch/raw/pr1286_meta.json` — first `gh pr view` output (1670 bytes)
- `artifacts/pr1286_refetch/raw/pr1286.diff` — byte-identical copy of `/tmp/pr1286.diff`
  (925 lines, 36438 bytes, sha256 `60c39bd52918f4b612df555108ae61af6d3f810418d3b95a38e5648a7ca51cdb`)

Supporting reads (read-only `gh api` GET / `gh pr view --json`, no writes):

- `artifacts/pr1286_refetch/raw/head_commit.json` — commit object for the head SHA
- `artifacts/pr1286_refetch/raw/pr1286_head_ref.json` — headRefName, isDraft, mergeable, 4 commit OIDs

`gh pr diff` exit code: 0.

## 2. Head SHA verification — VERIFIED, NO DRIFT

| Field | Value |
|-------|-------|
| expected_sha | `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` |
| observed_sha (headRefOid) | `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` |
| head_oid_verified | **true** |
| drift | **false** |

Equal by exact 40-char string comparison. No drift record required.

Head commit object (independently fetched via `gh api`):

- message: `feat: add storefront CMS routes`
- committer date: `2026-09-09T14:59:47Z`
- parent: `6bbed69acbe4536b05ba3a2c250ec95185786fb0`
- `git cat-file -e` → object present locally in this clone
- `git merge-base --is-ancestor 2ae85b6f origin/auctions` → **NOT** an ancestor
  (i.e. the PR head is unmerged work on `feat/nip05-CMS-vanity-url-intergration`,
  consistent with `state=OPEN`, `mergedAt=null`). `origin/auctions` tip is
  `6be7496c` (`fix(auctions): land the production-relevant hardening from the
  Coco branch, independent of Coco (#1402)`).

## 3. PR metadata (observed)

| Field | Value |
|-------|-------|
| url | https://github.com/PlebeianApp/market/pull/1286 |
| title | feat: nip05 cms vanity url intergration |
| state | OPEN |
| mergedAt | null (not merged) |
| isDraft | **true** |
| baseRefName | `auctions` |
| headRefName | `feat/nip05-CMS-vanity-url-intergration` |
| mergeable | MERGEABLE (GitHub's mergeability probe only — not a review judgment) |
| commits | 4 — first `6c8bb6ad894a93f64f00a24c747a1fa809383017`, last `2ae85b6f…` |
| author | hkarani (Hezron Karani, id MDQ6VXNlcjU4NjY4MTA5, is_bot false) |
| body | empty string |

Note for downstream tasks: `isDraft=true` and `body=""` are metadata facts, not
review findings.

## 4. File list — 14 files, +680 / -9

Counts below are from the `files` array of step 1 and were cross-checked against
`git apply --numstat /tmp/pr1286.diff`; **all 14 rows match exactly** (no
discrepancy between API line counts and raw diff hunk arithmetic).

| # | path | status | + | - |
|---|------|--------|---|---|
| 1 | `src/components/storefront/StorefrontRenderer.tsx` | added | 80 | 0 |
| 2 | `src/config/dashboardNavigation.ts` | modified | 2 | 6 |
| 3 | `src/lib/schemas/storefront.test.ts` | added | 28 | 0 |
| 4 | `src/lib/schemas/storefront.ts` | added | 98 | 0 |
| 5 | `src/lib/zapPurchase.ts` | modified | 13 | 0 |
| 6 | `src/publish/storefront-page.ts` | added | 17 | 0 |
| 7 | `src/queries/queryKeyFactory.ts` | modified | 5 | 0 |
| 8 | `src/queries/storefront.tsx` | added | 74 | 0 |
| 9 | `src/routeTree.gen.ts` | modified | 21 | 0 |
| 10 | `src/routes/$vanityName.tsx` | modified | 4 | 0 |
| 11 | `src/routes/_dashboard-layout/dashboard/account/storefront.tsx` | added | 170 | 0 |
| 12 | `src/server/EventHandler.ts` | modified | 11 | 1 |
| 13 | `src/server/StorefrontIdentityManager.ts` | added | 153 | 0 |
| 14 | `src/server/http/nip05.ts` | modified | 4 | 2 |

Totals: 7 added, 7 modified, 0 removed, 0 renamed. +680 / -9.
Diff structure check: `grep -c '^diff --git'` = 14; `^new file mode` = 7;
`^deleted file mode` = 0. Consistent with the `files` array.

## 5. Path overlap with later evidence tasks

The task asked to note explicitly whether the diff touches paths referenced by
later evidence tasks. No later-task file list was supplied to this worker, so
the check was done against the in-repo reference material that names these
symbols — `docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md`
(commit `2874195f`, status Proposed, date 2026-09-07).

Literal path mentions of PR files inside ADR-019 (occurrence counts):

| path | ADR-019 mentions |
|------|------------------|
| `src/lib/zapPurchase.ts` | 2 |
| `src/lib/schemas/storefront.ts` | 2 |
| `src/routes/$vanityName.tsx` | 3 |
| `src/config/dashboardNavigation.ts` | 1 |
| `src/publish/storefront-page.ts` | 1 |
| `src/queries/queryKeyFactory.ts` | 1 |
| `src/queries/storefront.tsx` | 1 |
| `src/routes/_dashboard-layout/dashboard/account/storefront.tsx` | 1 |
| `src/server/EventHandler.ts` | 1 |
| `src/server/StorefrontIdentityManager.ts` | 1 |
| `src/server/http/nip05.ts` | 1 |
| `src/components/storefront/StorefrontRenderer.tsx` | 0 |
| `src/routeTree.gen.ts` | 0 |
| `src/lib/schemas/storefront.test.ts` | 0 |

**Answer: yes — 11 of the 14 PR paths are named by ADR-019**, so this PR is the
implementation surface of an in-repo proposed ADR. The three paths ADR-019 does
not name are the renderer component, the generated route tree, and the new
schema test. No other in-repo doc/artifact file references PR #1286 or these
storefront modules as of this refetch (a repo-wide scan for `1286` / `storefront`
under `docs/` and `artifacts/` returned only ADR-019 plus this artifact dir).

Caveat, stated as fact not judgment: ADR-019 status is **Proposed**, not
Accepted. Downstream evidence work should cite it as a proposal, not as
maintainer-approved architecture.

## 6. Local-tree observations relevant to downstream work

- `git apply --check --3way /tmp/pr1286.diff` reports **`src/routeTree.gen.ts:
  does not match index`**; the other 13 files apply cleanly. The local worktree
  already has an uncommitted modification to `src/routeTree.gen.ts`
  (`git status --porcelain` → ` M src/routeTree.gen.ts`) from unrelated prior
  work. A downstream task that wants to check the diff out must do it from
  `2ae85b6f` or a clean worktree, not on top of this dirty tree. This is a
  worktree-state fact, not a PR finding.
- `src/lib/schemas/storefront.ts`, `src/components/storefront/StorefrontRenderer.tsx`,
  `src/queries/storefront.tsx`, `src/server/StorefrontIdentityManager.ts`,
  `src/publish/storefront-page.ts` are **absent on `origin/auctions`**, i.e. the
  added-file status is accurate against the base branch. `src/lib/zapPurchase.ts`
  and `src/server/http/nip05.ts` exist on `origin/auctions` (modified, as stated).

## 7. Write-audit (negative evidence)

- No `gh pr comment`, `gh pr review`, `gh pr edit`, `gh pr merge`,
  `gh api --method POST/PATCH/PUT/DELETE`, `gh label`, `gh issue` invocation was
  made. Every `gh` call in this run was `gh pr view --json`, `gh pr diff`, or
  `gh api repos/.../commits/<sha>` (GET).
- No file was modified under `src/`, `docs/`, or `e2e/`. Files touched by this
  worker: `artifacts/pr1286_refetch/**`, `/tmp/pr1286.diff`, `PROGRESS.md`,
  `REPORT.md`.

## 8. Machine-readable block

```PR1286_METADATA
url=https://github.com/PlebeianApp/market/pull/1286
title=feat: nip05 cms vanity url intergration
state=OPEN
mergedAt=null
isDraft=true
baseRefName=auctions
headRefName=feat/nip05-CMS-vanity-url-intergration
headRefOid=2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a
expected_sha=2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a
observed_sha=2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a
head_oid_verified=true
drift=false
author=hkarani
commit_count=4
diff_file=/tmp/pr1286.diff
diff_sha256=60c39bd52918f4b612df555108ae61af6d3f810418d3b95a38e5648a7ca51cdb
diff_lines=925
totals=+680/-9 across 14 files (7 added, 7 modified, 0 removed)
files:
  added    +80/-0   src/components/storefront/StorefrontRenderer.tsx
  modified +2/-6    src/config/dashboardNavigation.ts
  added    +28/-0   src/lib/schemas/storefront.test.ts
  added    +98/-0   src/lib/schemas/storefront.ts
  modified +13/-0   src/lib/zapPurchase.ts
  added    +17/-0   src/publish/storefront-page.ts
  modified +5/-0    src/queries/queryKeyFactory.ts
  added    +74/-0   src/queries/storefront.tsx
  modified +21/-0   src/routeTree.gen.ts
  modified +4/-0    src/routes/$vanityName.tsx
  added    +170/-0  src/routes/_dashboard-layout/dashboard/account/storefront.tsx
  modified +11/-1   src/server/EventHandler.ts
  added    +153/-0  src/server/StorefrontIdentityManager.ts
  modified +4/-2    src/server/http/nip05.ts
```
