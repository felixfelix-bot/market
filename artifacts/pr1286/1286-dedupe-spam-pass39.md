# PR #1286 dedupe + spam-check — pass 39 (loop-halt gate + independent re-verification)

Dispatch: worker-heavy/1286-dedupe-spam-f7 ("Dedupe draft PR #1286 review issues vs 5
known prev-issues and spam-check each"). Read-only vs GitHub. No push.

## Halt gate: key UNCHANGED since pass 21 (this is pass 39, 19th consecutive)

- Dedupe key = (draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`,
  PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`) — all three re-hashed live this
  pass and **unchanged**.
- Therefore this pass carries no new information by construction. The classification is
  already durably recorded; the canonical answer is
  `artifacts/pr1286/1286-dedupe-spam-RESULT.md` (table) and
  `artifacts/pr1286/1286-dedupe-spam-pass38.md` (pass-38 echo).
- This file deliberately does **NOT** append to `1286-dedupe-spam-report.md` (the
  2041-line append-chain), per that chain's own passages 25/29/33/37/38.
- **Recommendation: stop dispatching this dedupe task until the key changes** (a new draft
  md5/sha256 or a new PR head OID). Any further dispatch reproduces the same 7 rows.

## Independent verification performed this pass (not relayed — re-read at the SHA)

Inputs re-read, not trusted from the chain:

- Authoritative draft: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  — PRESENT, 3548 B, 7 numbered findings (D1-D7): 4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`.
- Comparison set = the *only* issue comment on the PR, `#5617745226` by `felixfelix-bot`
  (2026-09-10T11:11:01Z). `reviews` = 0, `pulls/1286/comments` = 0
  => no `DUPLICATE-OF-UNLISTED` row is possible.
- PR #1286: OPEN, `isDraft` true, MERGEABLE, base `auctions`, head branch
  `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`, head OID `2ae85b6`.

Every cited site re-checked with `git show` at `2ae85b6` (line-exact):

- D1 `src/server/StorefrontIdentityManager.ts:88` =
  `const existing = this.registry.get(name)` — the sole ownership lookup; `:89` compares
  only that one registry. Confirms the missing cross-pool check.
- D2 `src/server/EventHandler.ts:84` =
  `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`
  — legacy managers still armed as sellers.
- D3 `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` =
  `const page = parseStorefrontPage(content)` (the lenient *render* parser used as the
  publish gate); `src/lib/schemas/storefront.ts:89-92` = the `flatMap` block drop;
  `storefront.ts:77` = `blocks: z.array(...).max(40)` (no `.min`);
  `src/publish/storefront-page.ts:5` = `StorefrontPageSchema.parse(page)`;
  `:10` = `kind: 30024`; `:12` = `tags: [['d', 'storefront-page']]` (new event replaces
  the old page). Silent truncation behind a success toast confirmed.
- D4 `src/publish/storefront-page.ts:10` = `kind: 30024`; ADR-019 line 134 verbatim =
  `- Kind 30024 (addressable, application-specific), d=storefront-page,`.
- D5 `src/server/StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names',`;
  mirrored client-side at `src/queries/storefront.tsx:20` = `'#d': ['storefront-names']`;
  ADR-019:110-111 requires `d=${instanceNamespace}-storefront-names` resolved through
  ADR-018, and ADR-019:161-162 requires the domain come from instance config, "never a
  literal". `git ls-tree 2ae85b6:docs/adr/` contains **no** ADR-018 file (verified).
- D6 `package.json:31` = `bun test $(find contextvm src/queries/__tests__ src/lib/__tests__
  ... '*.test.ts' ...)` — excludes `src/lib/schemas/`;
  `.github/workflows/ci-unit.yml:47` = `run: bun run test:unit`;
  `gh pr diff 1286 --name-only` = 14 files, and
  `src/lib/schemas/storefront.test.ts` is the only added test — so it never executes.
  ADR-019:163-165 (hostile-page renderer unit test) therefore unenforced.
- D7 `src/components/storefront/StorefrontRenderer.tsx`: `:57` static
  `{block.products.length}` count, `:58` global `/products` link, `:66` global
  `/community` link (draft cites `:59`, the `</section>` close). ADR-019:140-142 states
  render-time re-fetch as intent.
- Prev-issue premises live at the SHA: `src/server/http/nip05.ts:12` =
  `const result = { names: { ...legacy.names, ...unified.names } }`;
  `RESERVED_NAMES` (`StorefrontIdentityManager.ts:5-53`) still lacks `terms`/`privacy`.

## Classification (reproduced, not re-derived from relay)

| # | Draft issue (file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|---|
| D1 | `[BLOCK]` `StorefrontIdentityManager.ts:88` — registration validates against the storefront registry only, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — same root cause via a different path: prev #2 names the missing cross-pool check ("each only sees its own registry ... assign the same name to two different pubkeys") and its remedy spans the **registering** path. | **ACTIONABLE** — a paid name can be sold twice; required change: reject a name held by a different pubkey in *either* legacy registry at `validateRegistration`. *Already tracked as prev #2.* |
| D2 | `[BLOCK]` `EventHandler.ts:84` — legacy managers stay sellers (no read-only demotion) | **DUPLICATE OF #2** — same root cause/symptom (pools ununified => one name representable to two buyers); prev #2's remedy is "unify on one registry". Mechanism differs (sale wiring vs serving merge) — stated marginal call. | **ACTIONABLE** — legacy purchase paths still mint entries for a name the unified registry owns; required change: make `vanityManager`/`nip05Manager` read-only resolvers rejecting new receipts. *Already tracked as prev #2.* |
| D3 | `[BLOCK]` `dashboard/account/storefront.tsx:67` — publish gate reuses the lenient render parser | **NEW** — no prev issue covers the publish/render validation split (prev #4 is a `safeText` refine at `storefront.ts:26`; prev #5 is the expiry gate). | **ACTIONABLE** — silent data loss + overwrite behind a false success; required change: validate with `StorefrontPageSchema` at publish and fail loudly. |
| D4 | `[BLOCK]` `publish/storefront-page.ts:10` — kind `30024` collides with NIP-23 drafts while ADR-019:134 labels it "application-specific" | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — spec/ADR mismatch names an exact change: use a free `3xxxx` kind and correct ADR-019:134. *(Code-truth of the NIP-23 collision is the separate worker's call.)* |
| D5 | `[RISK]` `StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names` vs ADR-019:110-111 namespacing | **NEW** — shares a *file* with prev #3 (`:5-53`, reserved list) but a different line, function and root cause; nothing in the five concerns the `d` tag/ADR-018. | **ACTIONABLE** — accepted-ADR violation with multi-instance namespace collision; required change: resolve `d` from instance config server+client. |
| D6 | `[RISK]` `storefront.test.ts:1` — only new test sits outside the `test:unit` glob | **NEW** — no prev issue concerns test placement/coverage. | **ACTIONABLE** — ADR-019:163-165 guardrail unenforced; required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the hostile-page test. |
| D7 | `[NIT]` `StorefrontRenderer.tsx:59` — coordinates validated but never resolved | **NEW** — no prev issue concerns renderer coordinate resolution (prev #5 is the expiry gate). | **NIT** — display fidelity only (static count + global links); ADR-019:140-142 is intent, not a testable invariant, and the draft self-tags `[NIT]`. |

## Notes

- Both axes independent: D1/D2 are DUPLICATE-but-ACTIONABLE (real, already tracked);
  D7 is NEW-but-NIT; D5 shares a file with prev #3 yet is NEW on root cause.
- Counting: buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6` not 7 only
  because D7 is NEW-but-NIT; the NIT count sits on the spam axis, as instructed.
- Read-only vs GitHub: `gh pr view`, `gh pr diff`, `gh api ...` GETs plus `git show` /
  `git ls-tree` / `md5sum` reads only. No comment, review, label, approval or other
  write. Nothing pushed.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
