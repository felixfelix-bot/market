# PR #1286 dedupe + spam check — pass 131 (fleet offload, READ-ONLY)

Repo: PlebeianApp/market · PR #1286 · head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
Authoritative draft: /home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md (3548 B, md5 0fc6675ab0cfab78d9b9a6d568e9ed5a, 7 findings D1-D7)
Comparison set: 1 issue comment (#5617745226) = the five prev-issues; 0 reviews; 0 review comments.

## Inputs re-verified live this pass
- Draft artifact PRESENT, md5 matches baseline. 7 numbered findings (4 [BLOCK], 2 [RISK], 1 [NIT]).
- PR OPEN, isDraft true, MERGEABLE, base `auctions`, head UNCHANGED `2ae85b6…`, 14 files.
- Cited lines re-read at the SHA (not the working tree). ADR-018 absent at tip (0001,0002,0003,0004,0005,0006,0007,0009,013,014,015,016,019).
- ADR-019 lines confirmed verbatim: :110-111 (d=${instanceNamespace}-storefront-names via ADR-018, not a literal), :114-116 (reject name held in either legacy registry by a different pubkey), :125-127 (legacy managers read-only, reject new receipts), :134 (kind 30024 addressable/application-specific), :140-142 (display data re-fetched/re-validated at render), :163 (hostile-page renderer unit test).

## Deliverable

| Draft issue | NOVELTY | SPAM CHECK |
|---|---|---|
| D1 [BLOCK] `StorefrontIdentityManager.ts:88` registry-only validateRegistration | DUPLICATE OF #2 — same root cause, different path: prev#2 "each only sees its own registry ... before registering/serving"; D1 = the missing cross-pool check on the registration path (ADR-019:114-116). | ACTIONABLE (already tracked) — reject a name held by a different pubkey in EITHER legacy registry. |
| D2 [BLOCK] `EventHandler.ts:84` legacy managers still armed as sellers | DUPLICATE OF #2 — marginal, stated: mechanism (sale wiring) differs but root cause (pools not unified) and symptom (two buyers each pay for `alice`) are prev#2's; prev#2's remedy explicitly spans "before registering". ADR-019:125-127. | ACTIONABLE (already tracked) — demote legacy managers to read-only resolvers rejecting new zap receipts. |
| D3 [BLOCK] `.../account/storefront.tsx:67` publish gate reuses lenient render parser | NEW — no prev issue touches the publish-vs-render validation split (prev#4 = schema field `safeText`; prev#5 = page-expiry gate). | ACTIONABLE — silent data loss behind false success: `parseStorefrontPage` drops invalid blocks (`storefront.ts:89` flatMap) then `publishStorefrontPage` re-parses residue (`storefront-page.ts:5`) which passes, so one typo truncates the page, toast.success fires, and the `d=storefront-page` event overwrites the prior page. Fix: validate with `StorefrontPageSchema` at publish, lenient parse at render only. |
| D4 [BLOCK] `publish/storefront-page.ts:10` kind 30024 vs ADR-019:134 | NEW — no prev issue mentions the page event kind. | ACTIONABLE — spec-conformance with a named fix: kind hard-coded `30024` (:10) while NIP-23 deprecated 30024 as the long-form draft kind, contradicting ADR-019:134 "addressable, application-specific". Free 3xxxx kind + correct ADR-019:134. |
| D5 [RISK] `StorefrontIdentityManager.ts:73` literal `d=storefront-names` (mirrored `queries/storefront.tsx:20`) | NEW — same FILE as prev#3 (`:5-53 RESERVED_NAMES`) but different line/function/root cause; nothing in the five concerns the registry `d` tag or instance namespacing. | ACTIONABLE — accepted-ADR violation + multi-instance namespace collision: literal hard-coded both sides, ADR-019:110-111 + :161-162 require resolving `d` from instance config (ADR-018 absent). Fix: resolve `d` from instance config on both sides. |
| D6 [RISK] `lib/schemas/storefront.test.ts:1` outside `test:unit` glob | NEW — no prev issue concerns test placement or coverage. | ACTIONABLE — asserted guardrail unenforced: only added test sits under `src/lib/schemas/`, but `test:unit` (`package.json:31` = contextvm + src/queries/__tests__ + src/lib/__tests__) excludes it and CI runs exactly that; ADR-019:163 guardrail unmet. Fix: move spec under `src/lib/__tests__/` (or widen the glob). |
| D7 [NIT] `components/storefront/StorefrontRenderer.tsx:59` coordinates never resolved | NEW — no prev issue concerns renderer coordinate resolution (prev#5 = page-expiry gate). | NIT — display fidelity only: static count (`:57`) + global `/products` (`:58`) / `/community` (`:66`) link instead of resolving coordinates; harm is a misleading count/link, not correctness/security/data-loss; ADR-019:140-142 is architectural intent, not a testable invariant. Draft's own tag is [NIT]; cited `:59` is the `</section>` close. |

## Required closing line

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

Buckets partition all seven. D1/D2 = DUPLICATE-but-ACTIONABLE; D7 = NEW-but-NIT (the task allows "an issue can be NEW-but-NIT"); X+Y=6 because D7 is the NEW-but-NIT excluded from both X and Y counts as instructed by the spam axis.

## Read-only confirmation
Only `gh pr view`, `gh api ... (GET)`, `git show`/`git ls-tree` reads issued. NO GitHub comment, review, label, or other write.
