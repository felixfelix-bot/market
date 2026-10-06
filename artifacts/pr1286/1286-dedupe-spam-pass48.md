# PR #1286 dedupe + spam-check — pass 48 (key-unchanged receipt + table)

Dispatch: `worker-heavy/1286-dedupe-spam-f7` — "Dedupe draft PR #1286 review issues vs 5
known prev-issues and spam-check each." Read-only vs GitHub. No push, no GitHub write,
no comment/review/label. Committed locally only.

## Key re-hashed live this pass

- Draft (parent task `t_31cab538`): `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`
  present, 3548 B, md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`, sha256
  `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`. Seven findings D1-D7
  (4 `[BLOCK]`, 2 `[RISK]`, 1 `[NIT]`).
- PR head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a` (OPEN, `isDraft: true`, MERGEABLE, base
  `auctions`, head branch `feat/nip05-CMS-vanity-url-intergration`, author `hkarani`).
- Comparison set = the *only* issue comment, `#5617745226` by `felixfelix-bot`
  (2026-09-10T11:11:01Z, 2668 B, the five prev-issues); `reviews` = 0; `pulls/1286/comments` = 0
  -> no `DUPLICATE-OF-UNLISTED` row possible.
- `gh pr diff --name-only` = 14 files; `src/lib/schemas/storefront.test.ts` is the only added test.

## Deliverable — dedupe + spam table (all seven draft findings)

| Draft issue (file:line as cited) | NOVELTY (reason) | SPAM CHECK (required change / why not actionable) |
|---|---|---|
| D1 [BLOCK] `StorefrontIdentityManager.ts:88` — `validateRegistration` consults only the storefront registry | DUPLICATE OF #2 — same root cause (independent per-registry validation lets one name be sold twice), reached via the validator site instead of the merge site; ADR-019:114-116 makes the cross-registry check explicit | ACTIONABLE — cross-check `nip05-names`/`vanity-urls` for a differently-owned live entry inside `validateRegistration` before allowing a storefront sale |
| D2 [BLOCK] `EventHandler.ts:84` — legacy managers stay armed as sellers (`purchaseManagers = [vanity, nip05, storefront]`) | DUPLICATE OF #2 — same root cause (two live registration pools for one name; the two-pubkeys-pay-for-`alice` divergence prev-#2 names), reached via manager wiring rather than the merge | ACTIONABLE — keep the legacy managers registered read-only (lookups only, reject new zap receipts) per ADR-019:125-127 |
| D3 [BLOCK] `dashboard/account/storefront.tsx:67` — publish gate reuses the lenient render parser | NEW — publish-path validation is not covered by any prev-issue | ACTIONABLE — parse with `StorefrontPageSchema` at publish (keep the lenient parse at render only) so a typo cannot publish a truncated page that overwrites `d=storefront-page` |
| D4 [BLOCK] `publish/storefront-page.ts:10` — `kind: 30024` | NEW — event-kind choice is not covered by any prev-issue | ACTIONABLE — move the storefront page to a free non-deprecated 3xxxx kind and correct ADR-019:134 (30024 is NIP-23's deprecated long-form draft kind) |
| D5 [RISK] `StorefrontIdentityManager.ts:73` — literal `d='storefront-names'` | NEW — the registry `d` tag / namespace is not covered by any prev-issue | ACTIONABLE — resolve `d=${instanceNamespace}-storefront-names` via ADR-018 config instead of the client-mirrored literal (`queries/storefront.tsx:20`) |
| D6 [RISK] `storefront.test.ts:1` — only new test sits outside the `test:unit` glob (`package.json:31`) | NEW — CI coverage gap is not covered by any prev-issue | ACTIONABLE — extend the `test:unit` glob (or relocate the test) so the only new suite runs; the ADR-019:163 renderer guardrail is currently unmet |
| D7 [NIT] `StorefrontRenderer.tsx:59` — `productGrid`/`collectionRow` never resolve coordinates | NEW — renderer coordinate display is not covered by any prev-issue | NIT — effect is a cosmetic/misleading count label plus a by-design global `/products` link; no correctness, security, or data-loss consequence |

`4 NEW-and-ACTIONABLE, 2 duplicates, 1 nits`

## Verdict / halt gate

- **Dedupe key UNCHANGED since pass 21 — this is the 28th consecutive pass on an identical key.**
- All seven cited sites re-read line-exact at the SHA (`git show 2ae85b6:<path>`); ADR-019 lines
  110-111 / 114-116 / 125-127 / 134 / 140-142 / 163 re-read; still **no** ADR-018 file at the tip.
  Classification reproduced independently and is byte-identical to passes 19-47:
  D1/D2 DUPLICATE-of-#2 but ACTIONABLE; D3/D4/D5/D6 NEW but ACTIONABLE; D7 NEW but NIT.
- **Recommendation: stop dispatching this dedupe task until the key changes** (new draft md5/sha256
  or a new PR head OID). Any further dispatch reproduces the same 7 rows with no new information.
