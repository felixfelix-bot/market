# Dedupe + spam-check — draft review of PlebeianApp/market PR #1286 — pass 68

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
PR: PlebeianApp/market #1286, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`.
Read-only: `gh pr view` / `gh pr diff` / `gh api ...` GET plus `git show` only.
No comment, review, label, approval or other GitHub write was made. Nothing was pushed.

## STATUS — no new information; HALT re-asserted

Dedupe key byte-identical to passes 21-67 (48th consecutive unchanged pass):

- draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256 `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`
  (`/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`, 3548 B, seven findings);
- PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (live `gh pr view`: OPEN, isDraft true,
  MERGEABLE, base `auctions`, head `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`).

Authoritative answer: `artifacts/pr1286/1286-dedupe-spam-RESULT.md` (unchanged). Gate dispatch
mechanically on the key before spawning another worker; the classification cannot change until
the draft or the PR head changes.

## Independent re-verification this pass (live)

- Comparison set 1:1: issue comments = 1 (`#5617745226`, felixfelix-bot, 2026-09-10T11:11:01Z),
  reviews = 0, review comments = 0 -> no `DUPLICATE-OF-UNLISTED` row possible.
- `gh pr diff 1286 --name-only` -> 14 files; exactly one added test
  (`src/lib/schemas/storefront.test.ts`), confirming D6's premise.
- Cited lines re-read at the SHA: D1 `StorefrontIdentityManager.ts:88`
  (`const existing = this.registry.get(name)`, validity vs that registry only);
  D2 `EventHandler.ts:84` (`this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`);
  D3 `.../dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`) with
  `storefront.ts:89` dropping invalid blocks via `flatMap`;
  D4 `publish/storefront-page.ts:10` (`kind: 30024`);
  D5 `StorefrontIdentityManager.ts:73` (`registryDTag: 'storefront-names'`) mirrored at
  `queries/storefront.tsx:20` (`'#d': ['storefront-names']`);
  D6 `package.json:31` glob (`contextvm src/queries/__tests__ src/lib/__tests__`) excludes
  `src/lib/schemas/`; D7 `StorefrontRenderer.tsx` (count `:57`, `/products` `:58`, `/community` `:66`;
  draft cites `:59`).

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — same root cause reached by a different path (registration path vs the serving/merge path `nip05.ts:12`); prev #2 names the mechanism and prescribes cross-checking `existing.pubkey` across both pools. Root-cause near-duplicate. | **ACTIONABLE** — cross-pool double-sale of one paid name; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers, so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — distinct mechanism (purchase wiring, not the serving merge) but the same symptom prev #2 already covers (two pubkeys can each pay for one name). *Marginal call, stated:* restricting prev #2 to `nip05.ts:12` alone would make this NEW, but the symptom overlaps. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers rejecting new receipts (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — no prev issue touches the publish/render validation split; prev #4 is a different root cause in a different region. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops invalid blocks (`storefront.ts:89`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes; one typo truncates the page and the previous `d=storefront-page` event is overwritten. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an ADR error: kind hard-coded `30024` (`:10`) while ADR-019:134 labels it "addressable, application-specific". Required change: use a free addressable `3xxxx` kind and correct ADR-019:134. *(Whether the NIP-23 reservation claim holds is the code-truth worker's call; the code/ADR mismatch is actionable either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 namespacing. Deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: the literal is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`). Required change: resolve the `d` from instance config on both sides. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: the only added test file sits under `src/lib/schemas/` while `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate). | **NIT** — display fidelity only: static count (`:57`) and global `/products` (`:58`) / `/community` (`:66`) links instead of resolving coordinates; harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE (already tracked as prev #2); D7 is NEW-but-NIT.
- Buckets partition all seven (`4 + 2 + 1 = 7`); `X + Y = 6` only because D7 is NEW-but-NIT.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
