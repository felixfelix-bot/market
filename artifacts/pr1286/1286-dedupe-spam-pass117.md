# PR #1286 dedupe + spam-check — pass 117 (fleet offload, read-only)

Verification-only pass. Canonical answer stays
`artifacts/pr1286/1286-dedupe-spam-RESULT.md`. The dedupe key was re-verified
live from source and is byte-identical to the pass-21 baseline, so the
classification is unchanged and this pass adds no new finding.

## Dedupe key (re-verified live this pass, read-only)

- Draft artifact (parent task `t_31cab538`):
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` — present,
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`,
  sha256 `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`,
  3548 B, mtime 2026-10-02 11:47. Seven findings: 4 `[BLOCK]` / 2 `[RISK]` /
  1 `[NIT]`. **Unchanged since pass 21.**
- `gh pr view 1286 --repo PlebeianApp/market` -> head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, `OPEN`, `isDraft: true`,
  `MERGEABLE`, base `auctions`, author `hkarani`, title
  `feat: nip05 cms vanity url intergration`, `updatedAt 2026-09-10T11:11:01Z`.
- Comparison set = 1 issue comment `#5617745226` (felixfelix-bot, body md5
  `ef17b0b905086ab43c4f2fa733e6c98e`) / 0 reviews / 0 review comments ->
  no `DUPLICATE-OF-UNLISTED` row possible.
- `gh api repos/.../pulls/1286/files` -> 14 files, exactly one `added` test
  (`src/lib/schemas/storefront.test.ts`).

## Cited sites re-read at the SHA this pass (`git show <SHA>:<path>`)

- `StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`
  (single-registry check; validity gate at `:89`); `RESERVED_NAMES:1-56` still
  has no `terms`/`privacy` (grep exit 1).
- `StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`
  (literal).
- `EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- `http/nip05.ts:12` = `const result = { names: { ...legacy.names, ...unified.names } }`.
- `_dashboard-layout/dashboard/account/storefront.tsx:67` =
  `const page = parseStorefrontPage(content)`; success toast at `:76`.
- `publish/storefront-page.ts:5` = `StorefrontPageSchema.parse(page)`, `:10` =
  `kind: 30024`, `:12` = `tags: [['d', 'storefront-page']]`.
- `lib/schemas/storefront.ts:26` untagged `heroBlock.title`
  (`z.string().trim().min(1).max(160)`); `:77` `blocks: z.array(...).max(40)`
  (no `.min`); `:89` `return parsed.success ? [parsed.data] : []` (silent drop).
- `queries/storefront.tsx:20` = `'#d': ['storefront-names']`.
- `StorefrontRenderer.tsx`: static count at `:57`, `/products` at `:58`,
  `/community` at `:66` (draft cites `:59` = the `</section>` close of the
  productGrid block).
- `package.json:31` unit glob = `contextvm src/queries/__tests__ src/lib/__tests__`
  (does not cover `src/lib/schemas/`).
- `docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md` read
  verbatim: `:110-111` namespaced `d=${instanceNamespace}-storefront-names`
  resolved via ADR-018 "rather than a literal"; `:114-116` reject a name held in
  either legacy registry by a different pubkey; `:125-127` legacy managers
  "read-only ... reject new zap receipts"; `:134` `Kind 30024 (addressable,
  application-specific)`; `:140-142` re-fetch/re-validate at render time;
  `:163` block-renderer hostile-page unit test required. No `ADR-018` file at
  this tip (`git ls-tree -r docs/adr | grep -c ADR-018` = 0).

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry | **DUPLICATE OF #2** — same root cause reached by a different path: prev #2 already says both managers "each only sees its own registry" and its remedy names cross-checking `existing.pubkey` across both pools "before **registering**/serving"; `:88` is that missing cross-check on the registering path. Not #3 (same file, but #3 is the reserved-name list at `:5-53`, a different root cause). | **ACTIONABLE** — a name still held by another pubkey in `nip05-names`/`vanity-urls` can be sold again; required change: make `validateRegistration` reject a name held by a different pubkey in either legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers | **DUPLICATE OF #2** — same root cause and same symptom prev #2 covers (pools not unified -> one name representable to two pubkeys, `/alice` != `alice@host`); `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is prev #2's "unify on one registry" gap on the sale path. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register the legacy managers as read-only resolvers that reject new zap receipts (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `.../dashboard/account/storefront.tsx:67` — publish gate reuses the lenient render parser | **NEW** — no prev issue touches the publish/render validation split (prev #4 is a missing `safeText` refine at `storefront.ts:26`; prev #5 is the expiry gate; prev #1-3 are resolution/shadowing/reserved-list). | **ACTIONABLE** — silent data loss behind a false success: invalid blocks are dropped (`storefront.ts:89`), the residue passes `.max(40)` with no `.min`, a typo publishes a truncated page, the success toast fires (`:76`) and `d=storefront-page` overwrites the previous page; required change: validate with `StorefrontPageSchema` at publish and fail loudly, keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` vs ADR-019:134 "addressable, application-specific" | **NEW** — none of the five prev issues mentions the page event kind. | **ACTIONABLE** — code/ADR mismatch: hard-coded `30024` (`:10`) against ADR-019:134, verified verbatim (earlier passes mis-stated `:133`; the draft's `:134` is exact); required change: use a free `3xxxx` addressable kind and correct ADR-019:134 (whether `30024` is genuinely NIP-23-reserved is the code-truth worker's call). |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` literal vs ADR-019:110-111 namespacing | **NEW** — same *file* as prev #3 (`:5-53`) but a different line, function and root cause; no prev issue concerns the `d` tag or ADR-018 instance namespacing. | **ACTIONABLE** — accepted-ADR violation with multi-instance namespace collision; required change: resolve the `d` from instance config on both server (`:73`) and client (`queries/storefront.tsx:20`) instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — only new test sits outside the `test:unit` glob | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163 guardrail unenforced: the diff's only `added` test sits in `src/lib/schemas/` but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`; required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — coordinates validated but never resolved | **NEW** — no prev issue concerns renderer coordinate resolution (prev #5 is the expiry gate). | **NIT** — display fidelity only: a static count at `:57` and global `/products` (`:58`) / `/community` (`:66`) links; ADR-019:140-142 is architectural intent, not a testable invariant, and the draft's own tag is `[NIT]`. |

## Card forensics (why this pass keeps being dispatched) — read-only

Board `plebeian-pr-reviews`, card `t_be177680` (this dispatch): `status =
blocked`, `assignee = manager`, `block_kind = completion`,
`block_recurrences = 3`, `consecutive_failures = 0`, `started_at`/`current_run_id`
NULL, `created_by = auto-decomposer`. Three run records, all `blocked` with
`summary = fleet-offload:dq05`. The comment thread holds ~130 identical manager
`BLOCKED: fleet-offload:dq05` comments plus five worker pass reports (112-116).
The last `gate-tick` lists nine missing completion gates
(`tests_green, pushed_or_consolidated, ci_evidence, cold_cross_family_review,
review_artifact, consolidated, review_benchmark_floor, secrets_clean,
no_live_drift`) — none of which a read-only classification task can satisfy.
The block reason is infrastructure + evidence-gate, not content. Dispatch keeps
spawning workers that re-derive an already-complete answer; this is pass 117.

Required manager action: close/unblock `t_be177680` against
`artifacts/pr1286/1286-dedupe-spam-RESULT.md` (+ `1286-dedupe-spam-HALT-ESCALATION.md`),
fix the `fleet-offload:dq05` route, and gate further dedupe dispatch on the
dedupe key changing (new draft md5 or new PR head). While the key is constant,
dispatch cannot yield new information.

Read-only throughout: `gh pr view` / `gh api ... GET` + `git show` / `git
ls-tree` / `md5sum` / `sha256sum` + read-only sqlite/board reads. No GitHub
write, no push.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
