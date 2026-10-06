# REPORT — PR #1286 dedupe + spam-check, pass 128 (fleet offload, read-only)

Task: Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each.
Repo: PlebeianApp/market · Workspace: /home/c03rad0r/repos/market (linked worktree)
Branch: `worker-heavy/1286-dedupe-spam-f7` · Card: `plebeian-pr-reviews:t_be177680`
Status: COMPLETE — result re-derived from the tree at the SHA; unchanged since pass 21.
Pass artifact: `artifacts/pr1286/1286-dedupe-spam-pass128.md` (commit `43dcc347`).

## INPUTS

- **Parent draft artifact — FOUND, non-empty, authoritative:**
  `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a` — byte-identical to the pass-21
  baseline. Seven numbered findings (D1–D7): 4 [BLOCK], 2 [RISK], 1 [NIT].
- **PR:** #1286, OPEN, `isDraft: true`, MERGEABLE, head
  `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, base `auctions`, author `hkarani`,
  `updatedAt 2026-09-10T11:11:01Z`, 14 files, +680/−9.
- **Comparison set (the five prev-issues) =** the only issue comment,
  `#5617745226` by `felixfelix-bot`. `reviews = 0`, review comments `= 0` ⇒ no
  `DUPLICATE-OF-UNLISTED` row is possible.
- Cited code re-read at the SHA via `git show` (dumped to `/tmp/pr1286-v/`), not
  from the working tree. `git ls-tree $SHA:docs/adr` ⇒ **no ADR-018 file**.

## METHOD

Two independent axes per draft issue: NOVELTY (NEW vs DUPLICATE OF #n, judged by
**root cause**, not title or filename) and SPAM CHECK (ACTIONABLE vs NIT, judged
by whether a concrete, accurate change to code/spec follows). The underlying
bug's truth is the separate code-truth worker's call and was not adjudicated here.

## TABLE

| Draft issue (label + file:line) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** [BLOCK] `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again; unified-wins at `src/server/http/nip05.ts:12` repoints it inside the first holder's paid window | **DUPLICATE OF #2** — same root cause reached by a different path. Prev#2 states "each only sees its own registry, so they can happily assign the same name to two different pubkeys" and its remedy spans "before registering/serving". D1 is that cross-check on the registration path (:88 `this.registry.get(name)`) vs the serving merge (nip05.ts:12); ADR-019:114-116 is verbatim the same requirement. Root-level near-duplicate ⇒ duplicate. | **ACTIONABLE** — a paid name can be sold twice and the earlier holder repointed; required change: make `validateRegistration` reject a name held by a different pubkey in EITHER legacy registry. *Already tracked as prev#2.* |
| **D2** [BLOCK] `src/server/EventHandler.ts:84` — legacy managers stay armed as sellers (no read-only demotion), so vanity-register / nip05-register receipts still mint legacy entries for a name the unified registry owns | **DUPLICATE OF #2** — marginal call stated: mechanism differs (sale wiring vs serving merge) but root cause + symptom are prev#2's — pools not unified, one name representable to two pubkeys, two buyers can each pay for `alice`. :84 keeping `vanityManager`+`nip05Manager` in `purchaseManagers` is the same "unify on one registry" gap; prev#2's remedy explicitly spans "registering". Same-root-cause **and** same-symptom ⇒ duplicate. | **ACTIONABLE** — legacy purchase paths still mint entries for a unified-owned name (second buyer pays); required change: register the legacy managers as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev#2.* |
| **D3** [BLOCK] `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient RENDER parser, so invalid blocks are silently dropped and a truncated page publishes behind a success toast | **NEW** — none of the five touches the publish/render validation split. Prev#4 is a missing `safeText` refine on `heroBlock.title` (storefront.ts:26) — different root cause, different function; prev#5 is the page-expiry gate. | **ACTIONABLE** — silent data loss behind a false success: `parseStorefrontPage` drops invalid blocks (storefront.ts:89 flatMap), `publishStorefrontPage` re-parses the residue with `StorefrontPageSchema.parse` which passes (`blocks` `.max(40)`, no `.min`), so one typo (`"type":"textt"`) truncates the page, the success toast fires (:76), and the `d=storefront-page` event (:12) overwrites the published page. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** [BLOCK] `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev issue mentions the page event kind. | **ACTIONABLE** — internal ADR/code mismatch: kind is hard-coded `30024` (:10) while ADR-019:134 reads verbatim "Kind `30024` (addressable, application-specific)". Required change: use a free addressable 3xxxx kind for the storefront page and correct ADR-019:134. *(Whether the NIP-23/NIP-37 reservation claim itself holds is the code-truth worker's call; the code/ADR mismatch names an exact change either way.)* |
| **D5** [RISK] `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `src/queries/storefront.tsx:20` | **NEW** — same FILE as prev#3 (:5-53 `RESERVED_NAMES`) but a different line, function and root cause; nothing in the five concerns the registry `d` tag or ADR-018 instance namespacing. The deliberate "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with multi-instance namespace-collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018 and :161-162 forbids literals for the instance domain, but the value is hard-coded server-side (`registryDTag: 'storefront-names'`, :73) and mirrored client-side (queries/storefront.tsx:20); no ADR-018 file exists at this tip (verified via `git ls-tree $SHA:docs/adr`). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** [RISK] `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev issue concerns test placement or coverage. | **ACTIONABLE** — an asserted guardrail is unenforced: this is the only added test file in the diff (verified against `gh pr diff --name-only`), it sits under `src/lib/schemas/`, but `test:unit` (package.json:31) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and `ci-unit.yml:47` runs exactly that, so it never executes. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test. |
| **D7** [NIT] `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev issue concerns renderer coordinate resolution (prev#5 is the page-expiry gate, not render-time re-fetch). | **NIT** — display fidelity only: the blocks print a static count (:57) and link to the global `/products` (:58) / `/community` (:66) instead of resolving coordinates, so the harm is a misleading count/link, not a correctness/security/data-loss defect; ADR-019:140-142 states render-time re-fetch as architectural intent, not a testable invariant; the draft's own tag is [NIT]. *(Draft cites :59, the `</section>` close; count/link lines are :57-:58 in the same block — a citation imprecision that further supports NIT.)* |

## FINAL COUNT

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## NOTES / HONESTY

- D1/D2 are DUPLICATE-but-ACTIONABLE; D7 is NEW-but-NIT. Axes kept independent.
- Counting: buckets partition all seven (4 + 2 + 1 = 7). `X + Y = 6`, not 7, only
  because D7 is NEW-but-NIT — the case the task's `X + Y = total` shortcut does
  not anticipate. Read as NEW-and-ACTIONABLE / duplicates / nits the three
  buckets sum to the total; the NIT count is on the spam axis as instructed.
- Read-only re GitHub: only `gh pr view`, `gh pr diff`, `gh api ... GET` reads
  plus `git show` / `git ls-tree` reads. **No GitHub comment, review, label,
  approval or any other API write was made.**
- Git: commit `43dcc347` pushed to remote `dr` (felixfelix-bot/market);
  read-back `git ls-remote dr` = `43dcc3479c45bbfcb706afe5d2f5cfa397dff137`.
- **HALT stands — gate further dedupe dispatch on the key changing.** Key constant
  since pass 21 (this is pass 128); a further dispatch cannot produce new
  information. This card keeps being re-dispatched as a stuck blocked card
  (`fleet-offload:dq05`, `block_loop_detected`), not because of a content
  failure — see `artifacts/pr1286/1286-dedupe-spam-HALT-ESCALATION.md`.

## BOARD TERMINAL ACTION — BLOCKED (environmental defect, observed)

The deliverable above is complete; the board transition is not reachable from
this worker session. Root cause (from the installed tool source,
`tools/kanban_tools.py`): `_enforce_worker_task_ownership()` rejects any
`tid != os.environ["HERMES_KANBAN_TASK"]`, and the env var here is the
**board-qualified** string `plebeian-pr-reviews:t_be177680`. `kb.get_task()` does
an exact `WHERE id = ?` match and the row's id is plain `t_be177680`. The two
constraints are mutually unsatisfiable: the only tid the guard accepts does not
exist in the DB, and the tid that exists is refused by the guard.

**Remaining step for a human/manager (cannot be done by this worker):**
1. Close `t_be177680` against the existing deliverable
   (`1286-dedupe-spam-RESULT.md` / this pass file / `REPORT.md`).
2. Fix the dispatch env: `HERMES_KANBAN_TASK` must carry the bare task id
   (`t_be177680`) with the board conveyed by `HERMES_KANBAN_BOARD`/`HERMES_KANBAN_DB`.
3. Gate further dedupe dispatch on the dedupe key changing (new draft md5 or new
   PR head) — constant since pass 21, so further passes cannot yield new information.
