# PR #1286 dedupe + spam-check — pass 49 (key-unchanged receipt + table)

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues
vs 5 known prev-issues and spam-check each." Read-only vs GitHub/PR. No push, no
GitHub write, no comment/review/label. Committed locally only.

## Key re-hashed live this pass

- Draft (parent task `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  present, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`. Seven findings
  D1-D7 (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`). No other draft artifact for #1286 exists.
- PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (OPEN, `isDraft: true`, MERGEABLE,
  base `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`).
  `gh pr diff --name-only` = 14 files; `src/lib/schemas/storefront.test.ts` is the only
  added test.
- Comparison set = the *only* issue comment, `#5617745226` by `felixfelix-bot`
  (2026-09-10T11:11:01Z, the five prev-issues); `reviews` = 0; `pulls/1286/comments` = 0
  -> no `DUPLICATE-OF-UNLISTED` row is possible.
- Independent re-read this pass at the SHA (`git show`, not the working tree):
  `StorefrontIdentityManager.ts` `:5-53` (no `terms`/`privacy`), `:73`
  (`registryDTag: 'storefront-names'`), `:88-91` (validator checks `this.registry` only);
  `EventHandler.ts:84` (`purchaseManagers = [vanity, nip05, storefront]`);
  `nip05.ts:12` (`{ ...legacy.names, ...unified.names }`);
  `queries/storefront.tsx:20` (`'#d': ['storefront-names']`);
  `lib/schemas/storefront.ts:26,75-77,89-92`; `publish/storefront-page.ts:5,10,12`;
  `dashboard/account/storefront.tsx:67,76`; `components/storefront/StorefrontRenderer.tsx:57,58,66`;
  `package.json:31`. ADR-019 lines 110-111 / 114-116 / 125-127 / 134 / 140-142 / 163
  re-read; still **no** ADR-018 file at the tip (`git ls-tree` verified).

## Deliverable — dedupe + spam table (all seven draft findings)

| Draft issue (short label + file:line as cited) | NOVELTY (reason) | SPAM CHECK (required change / why not actionable) |
|---|---|---|
| **D1** `[BLOCK]` `StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry; a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again, and unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause (both registries validate independently, each seeing only its own pool, so one name is representable by two pubkeys), reached via the registration *validator* instead of the `nip05.ts:12` serving *merge*. Prev #2's remedy literally says to cross-check `existing.pubkey` "across both pools before **registering**/serving", i.e. it already names this site. Root-cause near-duplicate => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed inside their paid window; required change: reject in `validateRegistration` any name held by a different pubkey in `nip05-names` or `vanity-urls`. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `EventHandler.ts:84` — legacy managers stay armed as sellers (`purchaseManagers = [vanityManager, nip05Manager, storefrontManager]`), so `vanity-register`/`nip05-register` receipts still mint legacy entries; ADR-019:125-127 requires read-only demotion | **DUPLICATE OF #2** — *marginal call, but duplicate by root cause:* the mechanism (sale wiring vs the serving merge) differs, yet the root cause is identical — two live registration pools for one name, so two buyers can each pay for `alice` (`/alice` != `alice@host`), which is exactly the divergence prev #2 exists to make unrepresentable. Prev #2's remedy spans the **registering** path ("before registering/serving"), and the task rule counts same-root-cause / same-symptom as duplicate. | **ACTIONABLE** — a second buyer pays for a name the unified registry already owns; required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window. *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — a different schema region and root cause; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` (`:67`) drops each invalid block (`storefront.ts:89-92`) and returns a page holding only the survivors, so one typo (`"type":"textt"`) still yields a non-null page; `publishStorefrontPage`'s `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) passes because it sees the already-filtered residue (`blocks` is `.max(40)` with no `.min`), the success toast fires (`:76`), and the new event replaces the old at `d=storefront-page` (`:12`). Required change: validate the raw content with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `publish/storefront-page.ts:10` — `kind: 30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — code/ADR mismatch: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it "Kind `30024` (addressable, application-specific)" (verified verbatim), and `30024` is NIP-23's long-form *draft* kind. Required change: move the storefront page to a free non-deprecated `3xxxx` kind and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code<->ADR mismatch alone names an exact change.)* |
| **D5** `[RISK]` `StorefrontIdentityManager.ts:73` — the registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate do-not-judge-overlap-by-file-name case. | **ACTIONABLE** — accepted-ADR / R7 non-conformance with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the value is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified absent). Required change: resolve the `d` from instance config on both server and client instead of the literal. *Caveat: ADR-019 is itself `Proposed` and the literal is partly a consequence of ADR-018 not existing yet — still a concrete, actionable change.* |
| **D6** `[RISK]` `storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or CI coverage. | **ACTIONABLE** — ADR-019:163's hostile-page renderer guardrail is unenforced: the only added test file in the 14-file diff sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, so it never executes. Required change: widen the `test:unit` glob (or relocate the spec) so the new suite runs, and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns renderer coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, "N product references published by this seller") and link to the global `/products` (`:58`) / `/community` (`:66`) instead of resolving the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already
  tracked as prev #2, so a maintainer gains nothing by treating them as new.
  D7 is NEW-but-NIT.
- D5 is the complement to the D3 reasoning: D5 shares a *file* with prev #3 yet no
  root cause or symptom, so NEW; D3 shares no file with any prev issue, so NEW.
- Counting: `4 + 2 + 1 = 7` covers all findings. `X + Y = 6`, not 7, only because D7
  is NEW-but-NIT — the case the task's `X+Y = total` shortcut does not anticipate; the
  NIT count is on the spam axis as instructed.
- Read-only vs GitHub: only `gh pr view` / `gh pr diff` / `gh api ...` GET reads plus
  `git show` / `git ls-tree` reads were issued; no comment, review, label, approval or
  other write was made. Nothing was pushed.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Verdict / halt gate (unchanged)

- **Dedupe key UNCHANGED since pass 21 — this is the 29th consecutive pass on an identical
  key.** The classification reproduces byte-identically to passes 19-48:
  D1/D2 DUPLICATE-of-#2 but ACTIONABLE; D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW but NIT.
- 40+ sibling worktrees named `worker-heavy-1286-dedupe-*` exist and this branch already
  carries 48 receipt commits — the loop is burning inference on a frozen input.
- **Recommendation: STOP dispatching this dedupe task until the key changes** (new draft
  md5/sha256 or a new PR head OID). Any further dispatch reproduces the same 7 rows with
  zero new information. Consult `artifacts/pr1286/1286-dedupe-spam-RESULT.md` (pass-37
  consolidated answer) instead of appending again.
