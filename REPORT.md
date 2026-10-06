# REPORT — PR #1286 dedupe vs 5 prev-issues + spam check (pass 132, fleet offload, READ-ONLY)

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
Repo: PlebeianApp/market · PR #1286 · head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
Workspace: /home/c03rad0r/repos/market · branch `worker-heavy/1286-dedupe-spam-f7`
Card: `plebeian-pr-reviews:t_be177680`

Full self-contained pass artifact: `artifacts/pr1286/1286-dedupe-spam-pass132.md`

## Status: COMPLETE — deliverable produced, read-only, no GitHub write

## 1. Inputs verified (live, read-only, re-derived independently this pass)

- **Authoritative draft artifact PRESENT**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  (parent task `t_31cab538`), 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a` — byte-identical to the
  pass-21 baseline. Seven numbered findings D1–D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- **Live PR** (`gh pr view 1286 --repo PlebeianApp/market --json`): OPEN, `isDraft: true`,
  `mergeable: MERGEABLE`, base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`,
  author `hkarani`, updatedAt 2026-09-10T11:11:01Z, head `2ae85b6…` UNCHANGED, 14 files.
- **Comparison set**: issue comments = **1** (`#5617745226`, felixfelix-bot) — that single comment IS
  the five prev-issues; reviews = **0**; review comments = **0**. No unlisted prior round exists ⇒
  no `DUPLICATE-OF-UNLISTED` row is possible.
- **No ADR-018 file at the tip** (`git ls-tree 2ae85b6…:docs/adr`); ADR-019 filename is
  `ADR-019-unified-storefront-identity-and-page-builder.md`. All cited lines re-read at the SHA.

## 2. Deliverable — dedupe + spam table

| Draft issue | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** [BLOCK] `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry (name still buyable while held elsewhere; unified-wins at `nip05.ts:12` repoints it) | **DUPLICATE OF #2** — same root cause, different path. Prev#2: "Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", prescribing a cross-check of `existing.pubkey` "across both pools before **registering**/serving". D1 = that cross-check missing on the registration path (`:88`) vs prev#2's serving merge (`nip05.ts:12`). ADR-019:114-116 states the same requirement. | **ACTIONABLE** — a paid name sold twice (earlier holder repointed). Change: reject a name held by a different pubkey in EITHER legacy registry. *Already tracked as prev#2.* |
| **D2** [BLOCK] `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers, so legacy register receipts still mint entries for a unified-owned name | **DUPLICATE OF #2** — *marginal call stated:* mechanism differs (sale wiring vs serving merge) but root cause AND symptom are prev#2's (pools not unified ⇒ one name representable to two pubkeys ⇒ two buyers each pay for `alice`). `:84 purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`; prev#2's remedy spans "registering/serving"; ADR-019:125-127 mandates read-only demotion. | **ACTIONABLE** — a second buyer can pay for a name the unified registry owns. Change: register legacy managers as read-only resolvers that reject new zap receipts (ADR-019:125-127). *Already tracked as prev#2.* |
| **D3** [BLOCK] `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — publish gate reuses the lenient RENDER parser; invalid blocks silently dropped | **NEW** — none of the five touches the publish-vs-render validation split (prev#4 = missing `safeText` on `heroBlock.title`, different field/root cause; prev#5 = page-expiry gate). | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops invalid blocks (`storefront.ts:89` flatMap), `publishStorefrontPage` re-parses residue with `StorefrontPageSchema.parse` (`storefront-page.ts:5`) which passes (`.max(40)`, no `.min`), so one typo truncates the page, the success toast fires (`:76`), and the `d=storefront-page` event (`:12`) overwrites the prior page. Change: validate with `StorefrontPageSchema` at publish and fail loudly. |
| **D4** [BLOCK] `src/publish/storefront-page.ts:10` — kind `30024` claimed NIP-23 long-form draft, not "addressable, application-specific" per ADR-019:134 | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — spec-conformance claim with named edits: kind hard-coded `30024` (`:10`) vs ADR-019:134 verbatim "Kind `30024` (addressable, application-specific)". Change: free addressable 3xxxx kind + correct ADR-019:134. *(NIP-23 collision itself is the code-truth worker's call; the code/ADR mismatch names an exact change either way.)* |
| **D5** [RISK] `src/server/StorefrontIdentityManager.ts:73` — registry `d` literal `storefront-names` vs ADR-019:110-111 `d=${instanceNamespace}-storefront-names`; mirrored `queries/storefront.tsx:20` | **NEW** — same FILE as prev#3 (`:5-53 RESERVED_NAMES`) but different line/function/root cause; nothing in the five concerns the registry `d` tag or instance namespacing. Deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation + multi-instance namespace collision: literal hard-coded server-side (`:73`) and client-side (`queries/storefront.tsx:20`), ADR-019:161-162 forbids literals, no ADR-018 file at tip. Change: resolve `d` from instance config on both sides. |
| **D6** [RISK] `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — asserted guardrail unenforced: the only added test in the 14-file diff sits under `src/lib/schemas/`, but `test:unit` (`package.json:31` = `find contextvm src/queries/__tests__ src/lib/__tests__ …`) excludes it. Change: move the spec under `src/lib/__tests__/` (or widen the glob). |
| **D7** [NIT] `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns renderer coordinate resolution (prev#5 = page-expiry gate). | **NIT** — display fidelity only: static count (`:57`) + global `/products` (`:58`) / `/community` (`:66`) link instead of resolving coordinates; the harm is a misleading count/link, not correctness/security/data-loss; ADR-019:140-142 = architectural intent, not a testable invariant; the draft's own tag is [NIT], and it cites `:59` (the `</section>` close) — citation imprecision further supports NIT. |

## 3. Required closing line

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

Buckets partition all seven. D1/D2 are DUPLICATE-but-ACTIONABLE; D7 is NEW-but-NIT — the axes were
kept independent. X+Y = 6 not 7 only because D7 is NEW-but-NIT (the task explicitly allows "an issue
can be NEW-but-NIT"; the NIT count is on the spam axis as instructed).

## 4. Read-only confirmation

Only `gh pr view`, `gh pr diff`, `gh api … (GET)` and `git show` / `git ls-tree` reads were issued.
**No GitHub comment, review, label, approval, or any other API write was made.**

## 5. Terminal action (kanban)

See PROGRESS.md for this pass's outcome. Known fleet defect: the worker's `kanban_complete` /
`kanban_block` are refused by the scope guard because the env task id is board-qualified
(`plebeian-pr-reviews:t_be177680`) while the board DB stores the bare id (`t_be177680`). Manager
action required to close the card. This is pass 132 of an identical re-dispatch loop — the deliverable
has been stable since pass 21; the card should be closed, not re-dispatched.

## 6. Remaining steps (if any)

None for this pass. The deliverable (table + count line) is complete. The only outstanding item is the
manager-side card close, which is outside worker scope.
