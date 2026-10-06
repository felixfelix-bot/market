# PR #1286 dedupe + spam-check — pass 118 (fleet offload, read-only)

Independent re-derivation. Canonical answer remains
`artifacts/pr1286/1286-dedupe-spam-RESULT.md`; the HALT-ESCALATION still stands.

## Dedupe key (re-verified live this pass, unchanged since pass 21)

- Draft (parent `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`, 3548 B,
  7 findings (4 BLOCK / 2 RISK / 1 NIT).
- PR #1286: head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, OPEN, `isDraft: true`,
  MERGEABLE, base `auctions`, `updatedAt 2026-09-10T11:11:01Z`, body empty.
- Comparison set = the only issue comment `#5617745226` (by `felixfelix-bot`) / 0 reviews
  / 0 review comments -> that comment IS the five prev-issues, so no
  `DUPLICATE-OF-UNLISTED` row is possible.
- `gh api pulls/1286/files` = 14 files, exactly one test/spec
  (`src/lib/schemas/storefront.test.ts`, status `added`).

Every cited site re-read at the SHA via `git show`: `StorefrontIdentityManager.ts` `:73`
(`registryDTag: 'storefront-names'`), `:88` (`const existing = this.registry.get(name)`),
`RESERVED_NAMES` `:5-53` (no `terms`/`privacy`, grep exit 1); `EventHandler.ts:84`
(`purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`);
`http/nip05.ts:12` (`{ ...legacy.names, ...unified.names }`);
`dashboard/account/storefront.tsx:67` (`const page = parseStorefrontPage(content)`);
`schemas/storefront.ts:89-92` (flatMap drops failed blocks) and `:77` (`blocks` `.max(40)`,
no `.min`); `publish/storefront-page.ts:10` (`kind: 30024`) and `:12`
(`tags: [['d','storefront-page']]`); `queries/storefront.tsx:20` (`'#d': ['storefront-names']`);
`package.json:31` (`test:unit` glob = `contextvm src/queries/__tests__ src/lib/__tests__`);
`StorefrontRenderer.tsx:57-58/:66`.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` - `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again (unified-wins at `nip05.ts:12` repoints it inside the first holder's paid window) | **DUPLICATE OF #2** - same root cause reached by a different path. Prev #2 already names the mechanism ("Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys") and its remedy literally says to cross-check `existing.pubkey` across both pools "before **registering**/serving". D1 is that missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); same requirement, same ADR-019:114-116 citation. Root-cause near-duplicate => duplicate. | **ACTIONABLE** - a paid name can be sold twice and the earlier holder silently repointed. Required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` - both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns | **DUPLICATE OF #2** - same root cause and same symptom prev #2 covers: the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` inside `purchaseManagers` is the same "unify on one registry" gap; the mechanism differs (sale wiring vs serving merge) but the root cause does not. Same-root-cause near-duplicate => duplicate. | **ACTIONABLE** - legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays). Required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` - the publish gate reuses the lenient *render* parser, which silently drops invalid blocks, so a truncated page publishes behind a success toast | **NEW** - none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) - a different root cause in a different region; prev #5 is the page-expiry gate. Shares no file with any prev issue. | **ACTIONABLE** - silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the `d=storefront-page` event overwrites the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` - kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 states | **NEW** - no prev issue mentions the page event kind. | **ACTIONABLE** - internal ADR/code mismatch (plus a claimed specs/interop collision): the kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` - the registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** - same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** - accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and :161-162 likewise forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` - the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** - no prev issue concerns test placement or coverage. | **ACTIONABLE** - ADR-019:163's hostile-page renderer guardrail is unenforced: this is the only added test file in the 14-file diff, it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `ci-unit.yml:47` runs exactly that, so it never executes (the manager's ownership check at `:88` can be deleted and the gate stays green). Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` - `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** - no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** - display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real, worth a code change, but already tracked as
  prev #2, so a maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- Buckets partition all seven: `4 + 2 + 1 = 7`. `X + Y = 6`, not 7, only because D7 is
  NEW-but-NIT - the case the task's `X+Y = total` shortcut does not anticipate; the NIT
  count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view` / `gh api ...` GET reads plus `git show` /
  `git ls-tree` reads; no comment, review, label, approval, or push.
- **HALT stands: gate any further dedupe dispatch on the key changing** (new draft md5 or
  new PR head). The key has been constant since pass 21; a further dispatch cannot produce
  new information. Read `1286-dedupe-spam-RESULT.md` rather than appending to the chain.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
