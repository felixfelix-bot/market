# REPORT — PR #1286 dedupe + spam-check, pass 123 (fleet offload)

**Result: `4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`** (7 draft issues D1-D7).

Status: COMPLETE. Read-only on GitHub (no comment/review/label/push). Deliverable
re-derived independently from the tree at the SHA; dedupe key unchanged since
pass 21, so the verdict is unchanged.

## Inputs verified live this pass

| Input | Value | Check |
|---|---|---|
| Parent draft artifact | `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md` | present, 3548 B |
| Draft md5 / sha256 | `0fc6675ab0cfab78d9b9a6d568e9ed5a` / `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba` | byte-identical to pass-21 baseline |
| Draft findings | 7 numbered (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`) | matches |
| PR head | `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` | == briefed SHA |
| PR state | OPEN, `isDraft: true`, MERGEABLE, `updatedAt 2026-09-10T11:11:01Z`, base `auctions`, author `hkarani` | matches |
| Comparison set | 1 issue comment `#5617745226` (felixfelix-bot) / 0 reviews / 0 review comments | no DUPLICATE-OF-UNLISTED possible |
| Diff | `gh pr diff --name-only` = 14 files, exactly one test/spec (`src/lib/schemas/storefront.test.ts`) | matches |
| ADR set at tip | `git ls-tree docs/adr/` = 13 ADRs + `proposals/`; `grep -c 018` = 0 | no ADR-018 |

## Sites re-read at the SHA (`git show`)

StorefrontIdentityManager.ts `:5-53` (RESERVED_NAMES, no terms/privacy), `:73`
(`registryDTag: 'storefront-names'`), `:84` (`validateRegistration`), `:88`
(`this.registry.get(name)`, unified only), `:89` (validUntil/pubkey guard);
EventHandler.ts `:84` (`purchaseManagers = [vanityManager, nip05Manager,
storefrontManager]`); http/nip05.ts `:12` (`{ ...legacy.names, ...unified.names }`);
dashboard/account/storefront.tsx `:67` (`parseStorefrontPage(content)`), `:76`
(`toast.success`); publish/storefront-page.ts `:5` (`StorefrontPageSchema.parse`),
`:10` (`kind: 30024`), `:12` (`['d','storefront-page']`); lib/schemas/storefront.ts
`:26` (`title: z.string().trim().min(1).max(160)`), `:77` (`blocks ... .max(40)`),
`:89-92` (flatMap drop), `:93` (parse); queries/storefront.tsx `:20`
(`'#d': ['storefront-names']`); StorefrontRenderer.tsx `:57` (static count), `:58`
(`/products`), `:59` (`</section>`, the draft's citation), `:66` (`/community`);
package.json `:31` (test:unit glob); ci-unit.yml `:47` (`bun run test:unit`);
ADR-019 `:110-111`, `:114-116`, `:125-127`, `:134`, `:140-142`, `:161-165`.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause by a different path. Prev #2 verbatim: "Both managers validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", remedy "Unify on one registry or cross-check `existing.pubkey` across both pools before registering/serving". D1 *is* that missing cross-check on the registration path — `:88` `this.registry.get(name)` is scoped to the unified registry only, and ADR-019:114-116 is the same requirement. Near-duplicate by root cause => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns (ADR-019:125-127); two pubkeys can each pay for `alice` | **DUPLICATE OF #2** — *marginal call, stated:* the mechanism differs (purchase wiring at `:84` vs the serving merge at `nip05.ts:12`), but the root cause and symptom prev #2 already covers are identical — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). Prev #2's remedy explicitly spans the registering path ("before registering/serving"). Same-root-cause => duplicate. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so a typo silently drops blocks and a truncated page publishes behind a success toast, overwriting the previous page | **NEW** — none of the five concerns the publish-vs-render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`) — different root cause, different region; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops failed blocks (`storefront.ts:89-92` `flatMap`), then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`) which passes (`blocks` is `.max(40)`, no `.min`), so `"type":"textt"` truncates the page, `toast.success` fires (`:76`), and the `d=storefront-page` event (`storefront-page.ts:12`) replaces the prior page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 states | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch naming an exact change: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 says `Kind 30024 (addressable, application-specific)` (verified verbatim at the SHA). Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim holds is the separate code-truth worker's call; the ADR/code mismatch is actionable either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — the registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; the same literal is mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) and same *file* as prev #5 (`queries/storefront.tsx`), but a different line, function and root cause: nothing in the five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: `registryDTag: 'storefront-names'` (`:73`) and `'#d': ['storefront-names']` (`queries/storefront.tsx:20`) are hard-coded, ADR-019:110-111/161-162 forbid the literal, and no ADR-018 file exists at this tip (`git ls-tree` = 13 ADRs + proposals). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob (`package.json:31`), so CI never runs it; `StorefrontIdentityManager`, `StorefrontRenderer` and `publishStorefrontPage` have no coverage | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — the ADR-019:163-165 renderer-hostility guardrail is unenforced: this is the only test/spec in the 14-file diff (verified via `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) globs only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `.github/workflows/ci-unit.yml:47` runs exactly that — so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated; a page whose coordinates are all dead still asserts "N product references published by this seller" and links to global `/products` | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (`:57`, `{block.products.length} product references...`) and link to the global `/products` / `/community` instead of resolving coordinates, so the harm is a misleading count/link — no correctness, security or data-loss defect. ADR-019:140-142 states render-time re-fetch as architectural intent, and the draft's own tag is `[NIT]`. Required change (non-blocking): resolve the coordinates at render, or drop the count/link claim. *(Draft cites `:59`, the `</section>` close; count/link are `:57`-`:58` — a citation imprecision that further supports NIT.)* |

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Acceptance criteria

- [x] Every draft issue appears exactly once, classified on BOTH axes with a stated reason (D1-D7).
- [x] Every duplicate call names the specific prev-issue number (#2, both times).
- [x] No GitHub comment, review, label, or other API write — read-only `gh pr view` / `gh pr diff` / `gh api ... GET` reads plus `git show` / `git ls-tree` only.
- [x] Output ends with the required one-line count.

## Git / push disclosure

Committed locally on `worker-heavy/1286-dedupe-spam-f7`. **No push was performed**
and none should be: the task body is explicit — "Read-only. Do not post, comment,
review, approve, or push anything." This overrides the generic incremental-push
protocol for this card. Crash-recovery anchor is therefore the local commit plus
the on-disk artifacts listed below, not a remote ref.

Artifacts:
- `artifacts/pr1286/1286-dedupe-spam-pass123.md` (this pass's pass file, 12104 B)
- `PROGRESS.md`, `REPORT.md` (worktree root)

Canonical deliverable remains `artifacts/pr1286/1286-dedupe-spam-RESULT.md`.

## Terminal action

`t_be177680` (board `plebeian-pr-reviews`) — revisit: pass-122 unblocked it to
`status=todo`, but `complete_task` is refused by the `_parents_satisfied` gate
(`kanban_db.py:5158`; rule at `:4385` requires every parent in done/archived).
Parents: `t_4879f111` blocked, `t_ac5da07e` triage, `t_fd16609f` blocked; only
`t_ca153718` archived satisfies. The graph is inverted — this child's deliverable
is what those parents were to produce — so it can never auto-satisfy. Also
`HERMES_KANBAN_BOARD=fork-pr-steward` does not hold the card, so the `kanban_*`
tools cannot see it (a `--board plebeian-pr-reviews` CLI read can), and board
`plebeian-pr-reviews` has `no_llm_dispatch=true`.

Manager action required: re-parent or archive `t_be177680` and close it against
`artifacts/pr1286/1286-dedupe-spam-RESULT.md` (acceptance criteria met), and gate
any further dedupe dispatch on the dedupe key changing (new draft md5 or new PR
head). While the key is constant, dispatch cannot yield new information.
