# Dedupe + spam-check — draft review of PlebeianApp/market PR #1286

Task: "Dedupe draft PR #1286 review issues vs 5 known prev-issues and spam-check each."
PR: PlebeianApp/market #1286, head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`
(confirmed live via `gh pr view 1286` JSON: OPEN, base `auctions`, head branch
`feat/nip05-CMS-vanity-url-intergration`, author `hkarani`; the tree is present locally at that SHA).
Read-only: no comment, review, label, or any other GitHub write was made.

## Artifact provenance

- **Authoritative draft (used below)**: `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`,
  the artifact of the parent task `t_31cab538`. It contains seven numbered findings
  (`[BLOCK]` x4 / `[RISK]` x2 / `[NIT]` x1), labelled D1-D7 here. Present and non-empty -> used.
- **The task's "5 known prev-issues" = the previously published review round** for this PR:
  issue comment `#5617745226` by `felixfelix-bot` (2026-09-10T11:11:01Z, never edited), re-read live
  this run. Its five findings are exactly prev #1-#5 as listed in the task:
  1. `src/routes/$vanityName.tsx` — storefront names never resolve (route reads only `d=vanity-urls`);
  2. `src/server/http/nip05.ts:11-13` — `{ ...legacy.names, ...unified.names }` shadowing / two pools
     validate independently and each sees only its own registry -> one name assignable to two pubkeys;
  3. `src/server/StorefrontIdentityManager.ts:5-53` — reserved list drops `terms`/`privacy`;
  4. `src/lib/schemas/storefront.ts:26` — `heroBlock.title` skips `safeText`;
  5. `src/queries/storefront.tsx:56` — no `validUntil` expiry gate on the rendered page.

## Method

- **Novelty** judged by *root cause*, not title or file name: identical file+line, same root cause via a
  different path, or the same symptom already covered => DUPLICATE. Every duplicate call names the
  prev-issue number.
- **Spam check** judged independently of the draft's own `[SEVERITY]` tags: ACTIONABLE only if concrete
  and accurate enough to drive a code change (real bug / security hole / data-loss-correctness risk /
  spec violation), else NIT. The two axes are independent, so an issue can be NEW-but-NIT or
  DUPLICATE-but-ACTIONABLE.
- Code facts below were read at the reviewed SHA via `git show 2ae85b6:<path>`.

## Dedupe + spam table

| Draft issue (short label + file:line as cited) | NOVELTY | SPAM CHECK |
|---|---|---|
| **D1** `[BLOCK]` `src/server/StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry, so a name held in `nip05-names`/`vanity-urls` by another pubkey can be bought again | **DUPLICATE OF #2** — different file/line than prev #2, but the *same root cause prev #2 states* and the same remedy: prev #2 says the pools' managers "validate independently and each only sees its own registry, so they can happily assign the same name to two different pubkeys", and prescribes cross-checking `existing.pubkey` across both pools before registering/serving. D1 is that root cause reached through the *registration* path (`this.registry.get(name)`, `:88`) instead of the *serving/merge* path (`nip05.ts:11`). Near-duplicate by root cause = duplicate. (Echoes prev #1's single-registry-lookup theme, but the harm — a second pubkey paying for a held name — is prev #2's symptom, so #2 is the named source.) | **ACTIONABLE** — cross-pool double-sale of one paid name; required change: make `validateRegistration` reject any name held by a different pubkey in either legacy registry (ADR-019:114-116). *Already tracked as prev #2.* |
| **D2** `[BLOCK]` `src/server/EventHandler.ts:84` — both legacy managers stay armed as sellers (no read-only demotion), so `vanity-register`/`nip05-register` receipts still mint legacy entries | **DUPLICATE OF #2** — different mechanism (purchase wiring, not the merge) but the *same symptom prev #2 already covers* ("they can happily assign the same name to two different pubkeys"): `:84` keeps `vanityManager`/`nip05Manager` inside `purchaseManagers`, so both legacy sale channels stay live and can each mint a name the unified registry owns. Same symptom already covered = duplicate; prev #2's "unify on one registry" remedy also subsumes the read-only demotion. *Marginal call:* a reader who takes prev #2 as **only** the `nip05.ts:11` merge would call D2 NEW, since the ADR-019:125-127 demotion is a distinct obligation — but the task's rule is that **any** overlap with a prev-issue is a duplicate, and the symptom overlaps. | **ACTIONABLE** — the legacy purchase paths still mint entries for a name the unified registry owns (a second buyer pays); required change: register `vanityManager`/`nip05Manager` as read-only resolvers that reject new zap receipts for the compatibility window (ADR-019:125-127). *Already tracked as prev #2.* |
| **D3** `[BLOCK]` `src/routes/_dashboard-layout/dashboard/account/storefront.tsx:67` — the publish gate reuses the lenient *render* parser, so invalid blocks are silently dropped | **NEW** — no prev-issue touches the publish/validation split. prev #4 (the only other schema finding) is a missing `safeText` refine on one field (`storefront.ts:26`) — a different root cause in a different region. | **ACTIONABLE** — silent data loss with a false success: `parseStorefrontPage` at `:67` drops any invalid block (`:89-92`), then `publishStorefrontPage` re-parses the residue with the strict `StorefrontPageSchema.parse` (`publish/storefront-page.ts:5`), which passes; one mistyped block (`"type":"textt"`) truncates the page, the success toast fires, and the old `d=storefront-page` event is overwritten. Required change: validate with `StorefrontPageSchema` at publish and fail loudly; keep the lenient parse at render only. |
| **D4** `[BLOCK]` `src/publish/storefront-page.ts:10` — kind `30024` is NIP-23's long-form *draft* kind, not "addressable, application-specific" as ADR-019:134 claims | **NEW** — no prev-issue mentions the page event kind. | **ACTIONABLE** — concrete spec/interop collision plus an ADR error: the published kind is hard-coded `30024` (`:10`) while ADR-019:134 labels it "addressable, application-specific". Required change: use a free addressable `3xxxx` kind for the storefront page and correct ADR-019:134. (Whether the NIP-23 reservation claim itself holds is for the separate code-truth worker; the issue names an exact, actionable change either way.) |
| **D5** `[RISK]` `src/server/StorefrontIdentityManager.ts:73` — registry `d` is the literal `storefront-names`, while ADR-019:110-111 mandates `d=${instanceNamespace}-storefront-names` via ADR-018; mirrored client-side at `queries/storefront.tsx:20` | **NEW** — same *file* as prev #3 (`:5`, `RESERVED_NAMES`) but a different line, function and root cause; nothing in the prev five concerns the registry `d` tag or ADR-018 instance namespacing. This is precisely the "do not judge overlap by file name" case. | **ACTIONABLE** — accepted-ADR violation with a multi-instance namespace collision risk: ADR-019:110-111 requires the namespaced `d` resolved through ADR-018, but the literal is hard-coded server-side (`:73`) and mirrored client-side (`queries/storefront.tsx:20`), and no ADR-018 file exists at this tip (verified: none under `docs/adr/`). Required change: resolve the `d` from instance config on both server and client instead of the literal. |
| **D6** `[RISK]` `src/lib/schemas/storefront.test.ts:1` — the only new test sits outside the `test:unit` glob, so CI never runs it | **NEW** — no prev-issue concerns test placement or coverage. | **ACTIONABLE** — the ADR-019:163 hostile-page renderer guardrail is unenforced: the spec is the only added test file in the diff and sits under `src/lib/schemas/`, but `test:unit` (`package.json:31`) scans only `contextvm`, `src/queries/__tests__`, `src/lib/__tests__`, and CI runs exactly that (`ci-unit.yml:47`), so it never executes and the `validateRegistration` ownership check (`:88`) can be deleted with the gate still green. Required change: move the spec under `src/lib/__tests__/` (or widen the glob) and add the ADR-019:163 hostile-page renderer test plus coverage for `validateRegistration`/`publishStorefrontPage`. |
| **D7** `[NIT]` `src/components/storefront/StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve the coordinates they validated | **NEW** — no prev-issue concerns the renderer's coordinate resolution. | **NIT** — display fidelity only: the blocks print a static count (`:57`) and link to the global `/community`/`/products` instead of fetching the coordinates, so the harm is a misleading count/link, not a correctness, security or data-loss defect, and ADR-019:140-142 states render-time re-fetch as architectural intent rather than a testable invariant. The draft's own tag is `[NIT]`. Not actionable as a blocking change. |

## Notes

- D1/D2 are DUPLICATE-but-ACTIONABLE: real and worth a code change, but already tracked as prev #2, so the
  maintainer gains nothing by treating them as new. D7 is NEW-but-NIT.
- D5 is the deliberate opposite of D3-style: same *file* as prev #3 but no root-cause or symptom overlap,
  so NEW despite the shared path.
- Headline-count convention note: the required one-liner reports the NEW-and-ACTIONABLE cell plus the two
  per-axis totals, so `X + Y` (4 + 2 = 6) is smaller than the 7 draft issues — the two off-diagonal issues
  (D1/D2 duplicate-but-actionable; D7 new-but-nit) are counted on one named axis each rather than the
  intersection.

## Result

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`
