# PR #1286 dedupe + spam-check — pass 115 (fleet offload, read-only)

Canonical answer: `artifacts/pr1286/1286-dedupe-spam-RESULT.md`. This pass
re-derives it independently; the classification is unchanged, so read RESULT.md
rather than appending to the chain.

## Dedupe key (re-verified live, unchanged since pass 21)

- Draft `PR1286-REVIEW-DRAFT.md` md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`
  (3548 B, `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`).
- PR #1286 head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, OPEN, `isDraft`,
  MERGEABLE, `updatedAt 2026-09-10T11:11:01Z`, base `auctions`, author `hkarani`.
- Comparison set = 1 issue comment `#5617745226` (felixfelix-bot) / 0 reviews /
  0 review comments — no `DUPLICATE-OF-UNLISTED` row possible.
- Every cited site re-read at the SHA via `git show`: `StorefrontIdentityManager.ts`
  `:73` `registryDTag: 'storefront-names'` and `:88` `const existing =
  this.registry.get(name)`; RESERVED_NAMES has no `terms`/`privacy`;
  `EventHandler.ts:84` `purchaseManagers = [vanity, nip05, storefront]`;
  `nip05.ts:12` `{ ...legacy.names, ...unified.names }` (unified wins);
  `storefront.tsx:67` `parseStorefrontPage(content)`;
  `schemas/storefront.ts:26` untagged `heroBlock.title`, `:89` flatMap drop,
  `:77` `blocks: z.array(...).max(40)` (no `.min`); `publish/storefront-page.ts`
  `:5` `StorefrontPageSchema.parse`, `:10` `kind: 30024`, `:12` `d=storefront-page`;
  `queries/storefront.tsx:20` `'#d': ['storefront-names']`;
  `package.json:31` unit glob = `contextvm src/queries/__tests__ src/lib/__tests__`;
  `StorefrontRenderer.tsx:57`/`:58`/`:66`. ADR-019:110-111, :114-116, :125-127,
  :134, :140-142, :161-165 read verbatim; no ADR-018 at tip (13 ADRs + proposals).

## Table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry | **DUPLICATE OF #2** — same root cause reached by a different path: prev #2 already states each manager "only sees its own registry", so one name can be assigned to two pubkeys, and its remedy names the **registering** path this line is. | **ACTIONABLE** — required change: make `validateRegistration` reject a name held by a different pubkey in either legacy registry (already tracked as prev #2). |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers | **DUPLICATE OF #2** — same root cause and symptom as prev #2 (pools not unified, one name representable to two buyers); `:84` keeping `vanityManager`/`nip05Manager` in `purchaseManagers` is prev #2's "unify on one registry" gap on the sale path. | **ACTIONABLE** — required change: register the legacy managers as read-only resolvers that reject new zap receipts (ADR-019:125-127); already tracked as prev #2. |
| **D3** `[BLOCK]` `dashboard/account/storefront.tsx:67` — publish gate reuses the lenient render parser | **NEW** — no prev issue touches the publish/render validation split (prev #4 is a different `safeText` region; prev #5 is the expiry gate). | **ACTIONABLE** — required change: validate with `StorefrontPageSchema` at publish and fail loudly, keeping the lenient parse at render only (silent truncation + success toast + `d=storefront-page` overwrite). |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` vs ADR-019:134 "addressable, application-specific" | **NEW** — none of the five mentions the page event kind. | **ACTIONABLE** — required change: use a free addressable `3xxxx` kind and correct ADR-019:134 (code/ADR mismatch; the NIP-23 reservation claim itself is the code-truth worker's call). |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` literal vs ADR-019:110-111 namespacing | **NEW** — same *file* as prev #3 but a different line/function/root cause; no prev issue concerns the `d` tag or ADR-018 instance namespacing. | **ACTIONABLE** — required change: resolve the `d` from instance config on both server (`:73`) and client (`queries/storefront.tsx:20`) instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — only new test sits outside the `test:unit` glob | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — required change: move the spec under `src/lib/__tests__/` (or widen the glob) so CI runs it and add the ADR-019:163 hostile-page renderer test. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — coordinates validated but never resolved | **NEW** — no prev issue concerns renderer coordinate resolution (prev #5 is the expiry gate). | **NIT** — display fidelity only (static count at `:57`, global `/products` at `:58` / `/community` at `:66`); ADR-019:140-142 is architectural intent, not a testable invariant, and the draft's own tag is `[NIT]`; the cited `:59` is the `</section>` close. |

## Card forensics (why this card keeps dispatching) — read-only

Board `plebeian-pr-reviews`, card `t_be177680`: `status = blocked`,
`assignee = manager`, `worker_pid` NULL, `current_run_id` NULL,
`consecutive_failures = 0`, `created_by = auto-decomposer`,
`block_kind = completion`, `block_recurrences = 3`. The `blocked` reason is
infrastructure + evidence-gate, not content: last gate-tick comment (8987)
lists missing gates `tests_green, pushed_or_consolidated, ci_evidence,
cold_cross_family_review, review_artifact, consolidated, review_benchmark_floor,
secrets_clean, no_live_drift` (`tier=code author_family=deepseek`), and 7793
reads `BLOCKED: fleet-offload:dq05`. Dispatch keeps spawning workers that
re-derive an already-complete answer (comments 9043/9044/9045 = passes 112-114).

Required manager action: close/unblock `t_be177680` against
`artifacts/pr1286/1286-dedupe-spam-RESULT.md`; gate further dedupe dispatch on the
dedupe key changing (new draft md5 or new PR head). While the key is constant,
dispatch cannot yield new information.

Read-only throughout: `gh pr view` / `gh pr diff` / `gh api ... GET` +
`git show` / `git ls-tree` + read-only sqlite reads. No GitHub write, no push,
no kanban mutation.

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
