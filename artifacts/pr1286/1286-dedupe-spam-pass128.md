# PR #1286 — dedupe vs 5 prev-issues + spam check, pass 128 (fleet offload, read-only)

Repo PlebeianApp/market · workspace /home/c03rad0r/repos/market · branch
worker-heavy/1286-dedupe-spam-f7 · card plebeian-pr-reviews:t_be177680.

Key UNCHANGED vs pass 21..127 (re-verified live this pass, read-only):

- head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, OPEN, isDraft true, MERGEABLE,
  base `auctions`, author hkarani, updatedAt 2026-09-10T11:11:01Z, 14 files
  +680/-9 (`gh pr view --json`).
- reviews 0, review comments 0, issue comments 1 (#5617745226) ⇒ the five
  prev-issues have no unlisted companion ⇒ no `DUPLICATE-OF-UNLISTED` row is possible.
- Draft artifact: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`,
  3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a` (byte-identical to the pass-21
  baseline). 7 findings D1–D7.

Every cited line was re-read at the SHA (`git show $SHA:<path>`, dumped to
`/tmp/pr1286-v/`), not from the working tree. ADR-019 lines were read verbatim;
`git ls-tree $SHA:docs/adr` confirms **no ADR-018 file exists at this tip**.

## TABLE

| Draft issue (label + file:line) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** [BLOCK] `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `src/server/http/nip05.ts:12` repoints it inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev#2 (`nip05.ts:11` legacy/unified merge shadowing) states each registry "only sees its own registry, so they can happily assign the same name to two different pubkeys", and its remedy spans "before registering/serving". D1 is that same cross-check on the **registration** path (:88 `const existing = this.registry.get(name)`) vs the **serving** merge (nip05.ts:12 `{ ...legacy.names, ...unified.names }`); ADR-019:114-116 states the identical requirement. Root-level near-duplicate ⇒ duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in EITHER legacy registry. *Already tracked as prev#2.* |
| **D2** [BLOCK] `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers (no read-only demotion), so `vanity-register` / `nip05-register` receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — marginal call stated explicitly: the mechanism differs (sale wiring vs serving merge) but root cause + symptom are prev#2's — pools not unified, one name representable to two pubkeys, two buyers can each pay for `alice`. :84 `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]` is the same "unify on one registry" gap; prev#2's remedy spans "registering". Same-root-cause **and** same-symptom ⇒ duplicate. | **ACTIONABLE** — legacy purchase paths still mint entries for a unified-owned name (second buyer pays); required change: register the legacy managers as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev#2.* |
| **D3** [BLOCK] `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient RENDER parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev#4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — different root cause, different function; prev#5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops invalid blocks (`storefront.ts:89` flatMap), `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` which passes (`blocks` `.max(40)`, no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (:76), and the `d=storefront-page` event (`:12`) overwrites the published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** [BLOCK] `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form DRAFT kind, not "addressable, application-specific" as `ADR-019:134` claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch: kind is hard-coded `30024` (:10) while ADR-019:134 reads verbatim "Kind `30024` (addressable, application-specific)" (verified). Required change: use a free addressable 3xxxx kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact change either way.)* |
| **D5** [RISK] `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while `ADR-019:110-111` mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same FILE as prev#3 (:5-53 `RESERVED_NAMES`) but a different line, function and root cause; nothing in the five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018 and :161-162 forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, :73) and mirrored client-side (`queries/storefront.tsx:20`); no ADR-018 file exists at this tip (verified via `git ls-tree $SHA:docs/adr`). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** [RISK] `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — an asserted guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** [NIT] `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns renderer coordinate resolution (prev#5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (:57) and link to the global `/products` (:58) / `/community` (:66) instead of resolving coordinates, so the harm is a misleading count/link, not a correctness/security/data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent, not a testable invariant; the draft's own tag is [NIT]. *(Draft cites :59, the `</section>` close; the count/link lines are :57-:58 in the same block — a citation imprecision that further supports NIT.)* |

## EVIDENCE RE-READ AT THE SHA (verification, not inference)

- Prev#1: `$vanityName.tsx:44` `if (resolvedPubkey) {`, resolution via
  `vanityActions.resolveVanity` (:21, legacy vanity store) — unified storefront
  names never consulted.
- Prev#2: `nip05.ts:12` `const result = { names: { ...legacy.names, ...unified.names } }`.
- Prev#3: `RESERVED_NAMES` (:5-53, 47 entries) — `terms` and `privacy` ABSENT.
- Prev#4: `storefront.ts:26` `title: z.string().trim().min(1).max(160)` (no
  `safeText`; contrast :27 `text: safeText(500)`).
- Prev#5: `queries/storefront.tsx:56` `useStorefrontPage` with no expiry gate
  (identities fetched at :19-28 never filter by `validUntil`).
- D1: `:88 const existing = this.registry.get(name)`, :89 validity compared
  against that registry only.
- D2: `EventHandler.ts:84 this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- D3: `storefront.tsx:67` lenient parse → `:76` success toast;
  `schemas/storefront.ts:77 .max(40)` no `.min`; `:89` flatMap drop;
  `publish/storefront-page.ts:5` (`StorefrontPageSchema.parse`) and `:12`
  (`['d','storefront-page']`).
- D4: `publish/storefront-page.ts:10 kind: 30024`; ADR-019:134 verbatim
  "(addressable, application-specific)".
- D5: `:73 registryDTag: 'storefront-names'`; `queries/storefront.tsx:20` client
  mirror `'#d': ['storefront-names']`; ADR-019:110-111, :161-162;
  `git ls-tree` → NO ADR-018 file.
- D6: `test:unit` glob = `contextvm src/queries/__tests__ src/lib/__tests__`;
  `ci-unit.yml:47` runs it; new spec lives in `src/lib/schemas/`.
- D7: `StorefrontRenderer.tsx:57` static count, `:58` `/products`, `:66` `/community`.

## FINAL COUNT

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

Buckets partition all seven (4 + 2 + 1 = 7). D1/D2 are DUPLICATE-but-ACTIONABLE;
D7 is NEW-but-NIT — the two axes were kept independent. Read as
NEW-and-ACTIONABLE / duplicates / nits the three buckets sum to the total; the
NIT count is on the spam axis as instructed. `X+Y = 6`, not 7, only because D7
is NEW-but-NIT (the case the task's `X+Y = total` shortcut does not anticipate).

## READ-ONLY

Only `gh pr view` / `gh pr diff` / `gh api ... GET` reads plus `git show` /
`git ls-tree` reads. **No GitHub comment, review, label, approval or any other
API write was made.**

## HALT

Key constant since pass 21 (this is pass 128); a further dispatch cannot produce
new information. Card keeps being re-dispatched as a stuck blocked card
(`fleet-offload:dq05`, `block_loop_detected`), not a content failure — see
`1286-dedupe-spam-HALT-ESCALATION.md`.
