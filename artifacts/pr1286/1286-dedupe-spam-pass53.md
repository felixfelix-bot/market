# PR #1286 dedupe + spam-check — pass 53 (33rd consecutive on an UNCHANGED key)

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues
vs 5 known prev-issues and spam-check each." Read-only vs GitHub/PR. No push, no
GitHub write, no comment/review/label. Committed locally only.

This pass deliberately does **not** re-paste the full 12 KB per-row reasoning; the
bounded consolidated answer is `artifacts/pr1286/1286-dedupe-spam-RESULT.md` and the
last full table is `artifacts/pr1286/1286-dedupe-spam-pass52.md`. Appending another
identical copy is the exact waste the pass-25/29/33 notes and every pass since have
warned against. Only the fresh live evidence and the classification digest are below.

## Key re-verified LIVE this pass (not taken on trust from the receipts)

- Draft (parent task `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  present, non-empty, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`.
  Seven findings D1-D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- PR: `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (OPEN, `isDraft: true`, MERGEABLE,
  base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`, author
  `hkarani`), present locally (`git cat-file -t` -> commit).
- Comparison set = the *only* issue comment, `#5617745226` by `felixfelix-bot`
  (2026-09-10T11:11:01Z, the five prev-issues); `issues/1286/comments` = 1,
  `pulls/1286/reviews` = 0, `pulls/1286/comments` = 0 -> no `DUPLICATE-OF-UNLISTED`
  row is possible.
- **Dedupe key UNCHANGED**: byte-identical to the pass-21..52 key (draft md5/sha256 +
  head OID). This is the 33rd consecutive pass on the same key.
- Loop cost observed at dispatch time: 53 prior commits touched `artifacts/pr1286/`,
  17 pass files on disk, **39** sibling worktrees named `worker-heavy-1286-dedupe-*`.

Cited lines re-read this pass at the SHA (`git show`, never the working tree):

| Site | Re-read value |
|---|---|
| `StorefrontIdentityManager.ts:88` (D1) | `const existing = this.registry.get(name)`; `:89` validity tested against **one** registry only |
| `EventHandler.ts:84` (D2) | `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]` |
| `dashboard/account/storefront.tsx:67` (D3) | `const page = parseStorefrontPage(content)` (lenient gate) feeding `publish/storefront-page.ts:5` `StorefrontPageSchema.parse(page)` |
| `publish/storefront-page.ts:10` (D4) | `kind: 30024`; `:12` `tags: [['d', 'storefront-page']]` |
| `StorefrontIdentityManager.ts:73` (D5) | `registryDTag: 'storefront-names'`; mirrored `queries/storefront.tsx:20` `'#d': ['storefront-names']` |
| `package.json:31` (D6) | `test:unit` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ ...` (excludes `src/lib/schemas/`) |
| `StorefrontRenderer.tsx:57-58` (D7) | `:57` static `{block.products.length}` count; `:58` global `/products` `SafeLink` (draft cites `:59`, the `</section>` close) |

`StorefrontPageSchema.blocks = z.array(...).max(40)` (no `.min`) and
`storefront.ts:89` drops invalid blocks via `flatMap` — D3's premise holds.
`git ls-tree -r --name-only $SHA docs/adr/` contains **no** ADR-018 file — D5's premise holds.

## Classification digest (unchanged; full reasoning in pass52 / RESULT.md)

| Draft issue (label + file:line) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — registration path validates against the storefront registry only | **DUPLICATE OF #2** — same root cause (independent per-registry validation) on the registration path; prev #2's remedy literally spans "registering/serving" | **ACTIONABLE** — cross-pool double-sale of one paid name; reject any name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers | **DUPLICATE OF #2** — *marginal, stated:* mechanism differs (sale wiring vs serving merge) but root cause and symptom (one name payable by two pubkeys) are those prev #2 covers | **ACTIONABLE** — make `vanityManager`/`nip05Manager` read-only resolvers that reject new receipts (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `.../dashboard/account/storefront.tsx:67` — publish gate reuses the lenient render parser | **NEW** — none of the five touches the publish/render split (prev #4 is `storefront.ts:26` `safeText`; prev #5 is expiry) | **ACTIONABLE** — silent data loss behind a false success: validate raw content with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — `kind: 30024` | **NEW** — no prev issue mentions the page event kind | **ACTIONABLE** — internal code/ADR mismatch (`30024` hard-coded vs ADR-019:134 "addressable, application-specific"); move to a free `3xxxx` kind and correct the ADR. *(NIP-23 reservation truth is the separate code-truth worker's call.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — literal `d=storefront-names` | **NEW** — same *file* as prev #3 but different line/function/root cause; nothing in the five concerns the `d` tag or ADR-018 namespacing | **ACTIONABLE** — multi-instance namespace collision / ADR-019:110-111 non-conformance; resolve the `d` from instance config on both server and client |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — only new test is outside the `test:unit` glob | **NEW** — no prev issue concerns test placement or CI coverage | **ACTIONABLE** — ADR-019:163-165 guardrail unenforced; widen the glob (or relocate the spec) so the new suite runs |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — coordinates validated but never resolved | **NEW** — no prev issue concerns renderer coordinate resolution | **NIT** — display fidelity only; static count/link, no correctness/security/data-loss defect, ADR-019:140-142 states intent not a testable invariant, and the draft's own tag is `[NIT]` |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE (already tracked as prev #2). D7 is NEW-but-NIT.
- Counting: `4 + 2 + 1 = 7` covers all findings. `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the NIT
  count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view` / `gh pr diff` / `gh api ...` GET reads plus
  `git show` / `git ls-tree` / `git cat-file` reads were issued; no comment, review,
  label, approval or other write was made. Nothing was pushed (commit-local only, per
  the task's explicit "do not push unless instructed").

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Verdict / halt gate (unchanged, do not re-dispatch)

- **Dedupe key UNCHANGED since pass 21 — this is the 33rd consecutive pass (54th
  commit) on an identical key.** Classification reproduces byte-identically:
  D1/D2 DUPLICATE-of-#2 but ACTIONABLE; D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW but NIT.
- **STOP dispatching this dedupe task until the key changes** (new draft md5/sha256 or a
  new PR head OID). Every further dispatch reproduces the same 7 rows with zero new
  information. Read `artifacts/pr1286/1286-dedupe-spam-RESULT.md` (pass-37 consolidated
  answer) instead of appending again.
