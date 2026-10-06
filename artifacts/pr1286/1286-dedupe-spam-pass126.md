# PR #1286 dedupe + spam-check — pass 126 (fleet offload, read-only)

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
Card: `plebeian-pr-reviews:t_be177680` (board `fork-pr-steward` in this session's env).
Canonical deliverable remains `artifacts/pr1286/1286-dedupe-spam-RESULT.md`.

## Dedupe key re-verified live this pass (read-only)

| Key component | Value | Verdict |
|---|---|---|
| parent draft `PR1286-REVIEW-DRAFT.md` md5 | `0fc6675ab0cfab78d9b9a6d568e9ed5a` | unchanged (== pass-21 baseline) |
| draft sha256 | `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba` (3548 B) | unchanged |
| PR #1286 head | `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` | unchanged |
| PR state | OPEN, `isDraft: true`, MERGEABLE, `updatedAt 2026-09-10T11:11:01Z` | unchanged |
| reviews / review comments | 0 / 0 | unchanged |
| issue comments | exactly 1 — `#5617745226` by `felixfelix-bot` | the comparison set (5 prev-issues) |
| diff | 14 files, +680 / -9 | unchanged |

Because only one issue comment exists and there are no reviews/review comments,
no `DUPLICATE-OF-UNLISTED` row is possible: the five prev-issues are the whole
published comparison set.

## Prev-issue premises re-read at the SHA (all still live)

1. `src/routes/$vanityName.tsx:44` — storefront names never resolve.
2. `src/server/http/nip05.ts:11-13` — `const result = { names: { ...legacy.names, ...unified.names } }` (unified-wins merge; pools validated independently).
3. `src/server/StorefrontIdentityManager.ts:5-53` — `RESERVED_NAMES` has 47 entries; **`terms` and `privacy` are absent** (checked programmatically).
4. `src/lib/schemas/storefront.ts:26` — `title: z.string().trim().min(1).max(160)` — no `safeText` refine (contrast `:27` `text: safeText(500)`).
5. `src/queries/storefront.tsx:56` — `useStorefrontPage` has no `validUntil` expiry gate.

## Draft-issue premises re-read at the SHA

- D1 `StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`; `:89` checks `validUntil` against **that one registry only**.
- D2 `EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- D3 `dashboard/account/storefront.tsx:67` = `const page = parseStorefrontPage(content)`; `:76` success toast; `publish/storefront-page.ts:5` = `StorefrontPageSchema.parse(page)`; `schemas/storefront.ts:77` = `blocks: z.array(...).max(40)` (no `.min`); `:89-92` = `flatMap` silently drops failed blocks; `publish/storefront-page.ts:12` = `tags: [['d', 'storefront-page']]`.
- D4 `publish/storefront-page.ts:10` = `kind: 30024`; ADR-019:134 verbatim = `Kind 30024 (addressable, application-specific)`.
- D5 `StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`; mirrored at `queries/storefront.tsx:20` = `'#d': ['storefront-names']`; ADR-019:110-111 requires `d=${instanceNamespace}-storefront-names` via ADR-018, ADR-019:161-162 forbids literals; `git ls-tree $SHA:docs/adr` contains **no ADR-018 file**.
- D6 `package.json` `test:unit` = `bun test $(find contextvm src/queries/__tests__ src/lib/__tests__ -type f -name '*.test.ts' ...)`; `.github/workflows/ci-unit.yml:47` = `run: bun run test:unit`; `src/lib/schemas/storefront.test.ts` is the only test file in the 14-file diff (verified `gh pr diff --name-only`).
- D7 `StorefrontRenderer.tsx:57` = static `{block.products.length}` count, `:58` `SafeLink href="/products"`, `:66` `/community`; draft cites `:59`, the `</section>` close.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 ("each only sees its own registry, so they can happily assign the same name to two different pubkeys") names the missing cross-check; its remedy spans "before **registering**/serving". D1 is that same missing cross-check on the registration path (`this.registry.get(name)`, `:88`) rather than the serving merge (`nip05.ts:12`); ADR-019:114-116 is the same requirement. Root-cause near-duplicate ⇒ duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127) | **DUPLICATE OF #2** — *stated marginal call (unchanged):* the mechanism differs (sale wiring vs the serving merge) but the root cause and symptom prev #2 covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` ≠ `alice@host`). `:84` keeping `vanityManager`/`nip05Manager` in `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans **registering**. Restricting prev #2 to the `nip05.ts:12` merge alone would make D2 NEW; the task rule counts same-root-cause/same-symptom as duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — different root cause, different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-92`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)` with no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (`storefront.tsx:76`), and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch plus a claimed specs/interop collision: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact, actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, `:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already
  tracked as prev #2, so a maintainer gains nothing by treating them as new.
  D7 is NEW-but-NIT. Both axes were classified independently.
- D5 is the complement of the D3 reasoning: D5 shares a *file* with prev #3 yet no
  root cause or symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). `X + Y = 6`, not 7,
  only because D7 is NEW-but-NIT — the case the task's `X + Y = total` shortcut does
  not anticipate; the NIT count is on the spam axis as instructed. Read as
  "NEW-and-ACTIONABLE / duplicates / nits" the three buckets sum to the total.
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, and `gh api ...` GET reads
  plus `git show` / `git ls-tree` reads were issued; no comment, review, label,
  approval or other write was made. Nothing in this pass was posted to GitHub.
- **HALT stands: gate any further dedupe dispatch on the key changing** (new draft
  md5 or new PR head). The key has been constant since pass 21 (this is pass 126),
  so a further dispatch cannot produce new information. Read
  `1286-dedupe-spam-RESULT.md` rather than appending to the chain.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
