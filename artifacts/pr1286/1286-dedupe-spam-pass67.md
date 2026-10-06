# Dedupe + spam-check — draft review of PlebeianApp/market PR #1286 — pass 67

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
PR: PlebeianApp/market #1286, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`.
Read-only: `gh pr view` / `gh pr diff` / `gh api ...` GET plus `git show` / `git ls-tree` only.
No comment, review, label, approval or other GitHub write was made. Nothing was pushed.

## STATUS — this pass adds no new information (HALT)

The dedupe key is **byte-identical to passes 21-66** (47th consecutive unchanged pass):

- draft md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256 `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`
  (`/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`, 3548 B, seven findings);
- PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (live `gh pr view`: OPEN, isDraft true, MERGEABLE,
  base `auctions`, updatedAt 2026-09-10T11:11:01Z).

**ESCALATION TO MANAGER: stop re-dispatching this task.** The classification below is unchanged from
`artifacts/pr1286/1286-dedupe-spam-RESULT.md` and cannot change until the key changes. Gate dispatch
mechanically before spawning another worker:

    md5sum /home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md | grep -q 0fc6675ab0cfab78d9b9a6d568e9ed5a \
      && gh pr view 1286 --repo PlebeianApp/market --json headRefOid -q .headRefOid | grep -q 2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a \
      && echo "SKIP: key unchanged — read RESULT.md"

## Comparison set (the five prev-issues) — re-read live this pass

The only issue comment on the PR is `#5617745226` by `felixfelix-bot` (2026-09-10T11:11:01Z);
`reviews` = 0 and review comments = 0 (verified live), so no `DUPLICATE-OF-UNLISTED` row is possible.
Its five findings, verbatim in substance: (1) `$vanityName.tsx` storefront names never resolve;
(2) `nip05.ts:11-13` merge shadowing + "Both managers validate independently ... cross-check
`existing.pubkey` across both pools before **registering**/serving"; (3) reserved list
`StorefrontIdentityManager.ts:5-53` drops `terms`/`privacy`; (4) `storefront.ts:26` `heroBlock.title`
skips `safeText`; (5) `useStorefrontPage`/`fetchStorefrontPage` no `validUntil` expiry gate.

## Independent re-verification at the SHA (this pass; `git show`, not the working tree)

- D1 `src/server/StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`;
  `:89` validates against that one registry only. ADR-019:114-116 verbatim: "Validation additionally
  rejects any name currently held in either legacy registry by a different pubkey". `RESERVED_NAMES`
  at `:5` still lacks `terms`/`privacy` (prev #3 premise live).
- D2 `src/server/EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
  ADR-019:125-127 verbatim: legacy managers "stay registered as **read-only** resolvers ... reject new zap receipts".
- D3 `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` = `const page = parseStorefrontPage(content)`,
  success toast at `:76`; `src/lib/schemas/storefront.ts:89-91` drops failed blocks
  (`return parsed.success ? [parsed.data] : []`), `:77` = `blocks: z.array(...).max(40)` (no `.min`);
  `src/publish/storefront-page.ts:5` = `StorefrontPageSchema.parse(page)`, `:12` = `tags: [['d', 'storefront-page']]`.
- D4 `src/publish/storefront-page.ts:10` = `kind: 30024`; ADR-019:134 verbatim =
  "- Kind `30024` (addressable, application-specific), `d=storefront-page`,".
- D5 `src/server/StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`, mirrored
  client-side at `src/queries/storefront.tsx:20` = `'#d': ['storefront-names']`. ADR-019:110-111 requires
  `d=${instanceNamespace}-storefront-names` "resolved through ADR-018's instance config rather than a
  literal"; `git ls-tree $SHA:docs/adr/` contains **no** ADR-018 file (verified).
- D6 `package.json:31` glob = `find contextvm src/queries/__tests__ src/lib/__tests__ ...`;
  `gh pr diff --name-only` shows `src/lib/schemas/storefront.test.ts` is the **only** test/spec among the
  14 changed files, so it never executes; ADR-019:163 is the hostile-page renderer unit test.
- D7 `src/components/storefront/StorefrontRenderer.tsx`: static count at `:57`, global `/products`
  `SafeLink` at `:58`, `/community` at `:66`; the draft cites `:59`, the same block's `</section>` close.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 states the mechanism (both managers "validate independently and each only sees its own registry") and its remedy says to cross-check `existing.pubkey` "across both pools before **registering**/serving". D1 *is* that missing cross-check on the registration path (`this.registry.get(name)`, `:88`), not the serving merge; ADR-019:114-116 is the same requirement. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns | **DUPLICATE OF #2** — stated marginal call: the mechanism differs (sale wiring vs the serving merge), but the root cause and the symptom prev #2 already covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping both legacy managers in `purchaseManagers` is the same "unify on one registry" gap, and prev #2's remedy explicitly spans the **registering** path. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts (ADR-019:127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`), a different root cause in a different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block (`storefront.ts:89-91`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)`, no `.min`), so one typo (`"type":"textt"`) truncates the page, the toast fires (`storefront.tsx:76`), and the `d=storefront-page` event (`:12`) replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch plus a claimed interop collision: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it `Kind 30024 (addressable, application-specific)` (verified verbatim). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim holds is the separate code-truth worker's call; the code/ADR mismatch names an exact change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing (the deliberate "do not judge overlap by file name" case). | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, and ADR-019:161-162 forbids literals, but the value is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. *(Draft cites `:59`, the `</section>` close; count/link lines are `:57`-`:58` in the same block.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE (real and worth a code change, but already tracked as prev #2).
  D7 is NEW-but-NIT.
- D5 shares a *file* with prev #3 yet no root cause or symptom, so NEW; D3 shares no file with any prev
  issue, so NEW.
- Counting: the buckets partition all seven (`4 + 2 + 1 = 7`). NITs are counted on the spam axis as
  instructed, so `X + Y` = 6 (D7 is NEW-but-NIT, a case the task's `X+Y = total` shortcut does not
  anticipate).
- Read-only vs GitHub: only `gh pr view`, `gh pr diff`, `gh api ...` GET and `git show` / `git ls-tree`
  reads were issued; nothing was written to GitHub and nothing was pushed.
- **HALT stands (47th consecutive no-op).** Read `1286-dedupe-spam-RESULT.md`; gate any further dispatch
  on the key changing (new draft md5 or new PR head).

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
