# PR #1286 dedupe + spam-check — pass 55 (35th consecutive on an UNCHANGED key)

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues vs 5
known prev-issues and spam-check each." Read-only vs GitHub: only `gh pr view`,
`gh pr diff`, `gh api ...` GET reads plus `git show` / `git ls-tree` / `git cat-file`
reads. No comment, review, label, approval or other write. Committed locally only, no push.

Per the pass-25/29/33/53/54 notes this pass does **not** re-paste the full per-row reasoning.
Authoritative bounded answer: `artifacts/pr1286/1286-dedupe-spam-RESULT.md`. Last full table:
`artifacts/pr1286/1286-dedupe-spam-pass52.md`. Fresh live evidence + digest below only.

## Key re-verified LIVE this pass

- Draft (parent task `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  present, non-empty, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba` — seven findings D1-D7
  (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- PR: head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (OPEN, `isDraft: true`, MERGEABLE,
  base `auctions`, head `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`), present
  locally (`git cat-file -t` -> commit).
- Comparison set = the *only* issue comment, `#5617745226` by `felixfelix-bot`
  (2026-09-10T11:11:01Z — the five prev-issues, matched one-by-one this pass);
  `issues/1286/comments` = 1, `pulls/1286/reviews` = 0, `pulls/1286/comments` = 0
  -> no `DUPLICATE-OF-UNLISTED` row is possible.
- **Dedupe key UNCHANGED** — byte-identical to the pass-21..54 key. This is the 35th
  consecutive pass on the same key (56th commit).

Cited sites re-read this pass at the SHA (`git show`, never the working tree): D1
`StorefrontIdentityManager.ts:88` `const existing = this.registry.get(name)` (`:89` tests one
registry only); D2 `EventHandler.ts:84` `this.purchaseManagers = [this.vanityManager,
this.nip05Manager, this.storefrontManager]`; D3 `dashboard/account/storefront.tsx:67`
`const page = parseStorefrontPage(content)` feeding `publish/storefront-page.ts:5`
`StorefrontPageSchema.parse(page)`, with `storefront.ts:77` `blocks: z.array(...).max(40)`
(no `.min`) and `:89-92` dropping invalid blocks via `flatMap`, plus `storefront-page.ts:12`
`tags: [['d', 'storefront-page']]`; D4 `publish/storefront-page.ts:10` `kind: 30024`;
D5 `StorefrontIdentityManager.ts:73` `registryDTag: 'storefront-names'` mirrored at
`queries/storefront.tsx:20` `'#d': ['storefront-names']`; D6 `package.json:31` glob
`find contextvm src/queries/__tests__ src/lib/__tests__` (excludes `src/lib/schemas/`) run by
`.github/workflows/ci-unit.yml:47`; D7 `StorefrontRenderer.tsx:57` static
`{block.products.length}` count, `:58` global `/products` `SafeLink` (draft cites `:59`, the
`</section>` close). `gh pr diff --name-only` = the 14-file diff with
`src/lib/schemas/storefront.test.ts` the only added test. ADR-019:110-111 (namespaced `d` via
ADR-018), :114-116 (reject names held in either legacy registry), :125-127 (legacy managers
read-only), :134 (`Kind 30024 (addressable, application-specific)`), :140-142 (render-time
re-fetch), :163 (renderer-hostility test) all read verbatim; `git ls-tree $SHA:docs/adr/`
contains **no** ADR-018 file.

## Classification digest (unchanged)

| Draft issue (label + file:line) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` | **DUPLICATE OF #2** — same root cause (independent per-registry validation) by a different path; prev #2's remedy spans "cross-check `existing.pubkey` across both pools before registering/serving" | **ACTIONABLE** — paid name can be sold twice / earlier holder repointed; reject a name held by a different pubkey in *either* legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` | **DUPLICATE OF #2** — *marginal call, stated:* mechanism differs (sale wiring vs serving merge) but root cause and symptom (pools not unified -> one name payable by two pubkeys) are the same; prev #2's remedy spans the registering path | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns; make `vanityManager`/`nip05Manager` read-only resolvers (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `.../dashboard/account/storefront.tsx:67` | **NEW** — none of the five touches the publish/render validation split (prev #4 `storefront.ts:26` safeText; prev #5 expiry gate) | **ACTIONABLE** — silent data loss behind a false success: invalid blocks dropped, residue re-parses OK (`.max(40)`, no `.min`), success toast fires and the `d=storefront-page` event overwrites the live page; validate with `StorefrontPageSchema` at publish and fail loudly |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` | **NEW** — no prev issue mentions the page event kind | **ACTIONABLE** — internal code/ADR mismatch (`30024` hard-coded vs ADR-019:134, verified verbatim); use a free `3xxxx` kind and correct the ADR |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` | **NEW** — same *file* as prev #3 but a different line/function/root cause; nothing in the five concerns the registry `d` tag or ADR-018 namespacing (the deliberate "do not judge by file name" case) | **ACTIONABLE** — ADR-019:110-111 / :161-162 violation with multi-instance namespace-collision risk; resolve the `d` from instance config on both server and client |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` | **NEW** — no prev issue concerns test placement or CI coverage | **ACTIONABLE** — ADR-019:163 guardrail unenforced: the sole added spec sits outside the `test:unit` glob so CI never runs it; relocate under `src/lib/__tests__/` (or widen the glob) |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` | **NEW** — no prev issue concerns renderer coordinate resolution (prev #5 is the page-expiry gate) | **NIT** — display fidelity only: static count (`:57`) + global `/products` link (`:58`); no correctness/security/data-loss defect, and the draft's own tag is `[NIT]` |

Notes: D1/D2 are DUPLICATE-but-ACTIONABLE (already tracked as prev #2); D7 is NEW-but-NIT.
Buckets partition all seven (`4 + 2 + 1 = 7`); `X + Y = 6` only because D7 is NEW-but-NIT —
the NIT count is on the spam axis as instructed.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Verdict / halt gate (UNCHANGED — do not re-dispatch)

- **Dedupe key UNCHANGED since pass 21 — 35th consecutive pass (56th commit) on an identical
  key.** Classification reproduces byte-identically to pass-54: D1/D2 DUPLICATE-of-#2 but
  ACTIONABLE; D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW but NIT.
- **STOP dispatching this dedupe task until the key changes** (new draft md5/sha256 or a new
  PR head OID). Every further dispatch reproduces the same 7 rows with zero new information
  and only grows the chain. Read `artifacts/pr1286/1286-dedupe-spam-RESULT.md`.
