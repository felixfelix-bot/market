# PR #1286 dedupe + spam classification — dispatch verification (read-only)

This is a verification record for one dispatch of the card
`t_be177680` ("Dedupe draft PR #1286 review issues vs 5 known prev-issues and
spam-check each"). It re-derives the classification independently from the tree
at the PR head; it is **not** a new numbered pass and it does **not** replace the
canonical answer, which remains
`artifacts/pr1286/1286-dedupe-spam-RESULT.md`.

## Dedupe key re-verified live this dispatch (unchanged since pass 21)

| Input | Value | Matches pass-21 baseline |
|---|---|---|
| Draft `PR1286-REVIEW-DRAFT.md` md5 | `0fc6675ab0cfab78d9b9a6d568e9ed5a` | yes |
| Draft sha256 | `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba` | yes |
| Draft size | 3548 B (`/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`) | yes |
| PR #1286 head | `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` | yes |
| PR state | OPEN, `isDraft: true`, MERGEABLE, base `auctions`, `updatedAt 2026-09-10T11:11:01Z` | yes |

Input is byte-identical to pass 21, so the classification cannot legitimately
differ. It was nevertheless re-derived from scratch (below), not copied.

## Cited lines re-verified at the head SHA

All 14 cited lines were read with `git show 2ae85b6:<path>` (the object is present
in this clone), not from the working tree:

- D1 `StorefrontIdentityManager.ts:88` = `const existing = this.registry.get(name)`
  (validity at `:89` checked against that one registry only). `RESERVED_NAMES`
  at `:5-53` still lacks `terms`/`privacy` (prev #3 premise live).
- D2 `EventHandler.ts:84` = `this.purchaseManagers = [this.vanityManager, this.nip05Manager, this.storefrontManager]`.
- D3 `dashboard/account/storefront.tsx:67` = `const page = parseStorefrontPage(content)`;
  `storefront.ts:89-92` drops failed blocks via `flatMap`;
  `publish/storefront-page.ts:5` = `StorefrontPageSchema.parse(page)`;
  `:12` = `tags: [['d', 'storefront-page']]`.
- D4 `publish/storefront-page.ts:10` = `kind: 30024`.
- D5 `StorefrontIdentityManager.ts:73` = `registryDTag: 'storefront-names'`;
  mirrored at `queries/storefront.tsx:20` = `'#d': ['storefront-names']`.
- D6 `package.json:31` test:unit glob covers only `contextvm`,
  `src/queries/__tests__`, `src/lib/__tests__` (excludes `src/lib/schemas/`).
- D7 `StorefrontRenderer.tsx` — static count at `:57`, global `/products` link at
  `:58`, `/community` at `:66`; draft cites `:59` (the `</section>` close).

## Deliverable table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `nip05.ts:12` repoints the address inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev #2 is the legacy/unified merge + independent per-registry validation at `nip05.ts:11`; D1 is that same missing cross-registry check on the *registration* path (`this.registry.get(name)`). Same root cause => duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in *either* legacy registry. *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries for a name the unified registry already owns | **DUPLICATE OF #2** — stated marginal call: the mechanism differs (sale wiring vs serving merge), but the root cause and symptom prev #2 covers are the same — the pools are not unified, so one name is representable to two pubkeys and two buyers can each pay for `alice` (`/alice` != `alice@host`). `:84` keeping the legacy managers inside `purchaseManagers` is the same "unify on one registry" gap. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window. *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev #4 is a missing `safeText` refine on `heroBlock.title` (`storefront.ts:26`), a different root cause; prev #5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops every invalid block, then `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` which passes (`blocks` is `.max(40)` with no `.min`), so one typo truncates the page, the success toast fires, and the `d=storefront-page` event replaces the previously published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch plus a claimed specs/interop collision: the published kind is hard-coded `30024` while ADR-019:134 labels it application-specific. Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the separate code-truth worker's call; the code/ADR mismatch names an exact actionable change either way.)* |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5-53`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the value is hard-coded server-side and mirrored client-side, and no ADR-018 file exists at this tip. Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — ADR-019:163-165's hostile-page renderer guardrail is unenforced: this is the only added test file in the diff, it sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns the renderer's coordinate resolution (prev #5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count that is literally true ("N product references published by this seller") and link to the global `/products` / `/community` instead of resolving the coordinates, so the harm is a misleading impression, not a correctness, security or data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant, and the draft's own tag is `[NIT]`. Not actionable as a blocking change. *(Draft cites `:59`, the `</section>` close; the count/link lines are `:57`-`:58` in the same block — a citation imprecision that further supports NIT.)* |

## Count

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

(X = D3, D4, D5, D6; Y = D1, D2; Z = D7. The buckets partition all seven. Note
`X + Y = 6`, not 7, only because D7 is NEW-but-NIT — the one case the task's
`X + Y = total` shorthand does not anticipate. The NIT count is on the spam axis,
as instructed.)

## Corrected board forensics — NEW vs the pass-72 escalation

The `1286-dedupe-spam-HALT-ESCALATION.md` artifact (pass 72) states the card's
block reason is infrastructure, `fleet-offload:dq05`. The live board
(`/home/c03rad0r/.hermes/kanban/boards/plebeian-pr-reviews/kanban.db`,
read-only) now shows a different, later state:

- Card `t_be177680`: `status=blocked`, `assignee=manager`, `started_at` NULL,
  `worker_pid` NULL, `current_run_id` NULL, `consecutive_failures=0`, `result` NULL.
- `fleet-writeback` logged **`fleet-done rc=0 verified=True (offloaded); status -> done`**
  twice (epoch `1789374699`, `1789520597`) — i.e. the offload route **succeeded**;
  the card reached `done` and was re-blocked afterwards.
- Two `gate-tick` blocks follow: `1789374711` (6 gates) and `1790931725`
  (9 gates) — the latest reads
  `BLOCKED (completion-pending) — missing gate(s): tests_green, pushed_or_consolidated, ci_evidence, cold_cross_family_review, review_artifact, consolidated, review_benchmark_floor, secrets_clean, no_live_drift. tier=code`.
- The manager's `BLOCKED: fleet-offload:dq05` comments stop at epoch `1789561699`;
  the newest comment on the card is the `1790931725` gate-tick.
- `auto-decomposer` split the root into children `t_ac5da07e` (triage),
  `t_fd16609f` (blocked), `t_4879f111` (blocked), `t_ca153718` (archived); the root
  wakes only when all children complete.

**Implication (inference, for the manager; no action taken here):** the card is now
completion-pending on the generic code-tier gate set, not on the offload route.
Several demanded gates (`tests_green`, `ci_evidence`, `cold_cross_family_review`,
`review_benchmark_floor`, `no_live_drift`) do not fit a read-only classification
card, and two of the four children are themselves blocked. The pass-72 advice
"fix the offload route" is superseded; the live need is to re-scope or waive the
tier gates, or move this card to the review lane, and to unblock the two children.

## Read-only attestation

Only `gh pr view`, `gh pr diff`, `git show`, `git cat-file`, `git log/status`, and
`sqlite3 -readonly` reads were issued. No GitHub comment/review/label/approval or
any other API write was made; no `git push`; no kanban mutation.
