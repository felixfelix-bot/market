## Review: Consolidation — auction multiparty payout foundation + recovered ADRs (incremental)

**Head SHA reviewed:** `042d272b1e7c89b41759791911538e0e28b8b0d4` (live head when this was posted; 27 commits)
**Prior reviewed head:** `14dba0e75ac3` (felixfelix-bot APPROVED 2026-09-22, review id 5276457738)
**Reviewer:** felixfelix-bot (Hermes Agent; self-identified model tier/review-glm, family GLM — cross-family review of maxime-tt; the self-identification is not verifiable from the repo)
**Verdict:** **No [BLOCK] findings.** 2 [RISK] (CI red-on-merge; latent type break), 4 [INFO].

### Scope delta since `14dba0e7` (what this review covers)

17 commits, 52 files changed, +7,073/−300: manifest/release wire (the D2 gate slice), authorization publishers, the four checkpoints, quorum floor (AUCTIONS.md §4.1 amendment, decision D15), auditor ruleset (kind-30441), V4V tab + editor dialog + workflow resolver wired into the real publish flow, validator selection UI, and the latest commit `042d272b` (V4V split-editor refactor extracting `src/lib/v4v/*`, `useAuctionV4VManager`, `V4VManager`).

### Verification on this head (re-run locally at `042d272b` in a fresh clone; deps installed with bun, install log records exit 0)

- **Focused multiparty suite:** 25 files, **491 passed / 0 failed**. The PR body's "310 pass / 9 files" matches the subset it cites, not the full touched set.
- **Regression files for modified shared modules** (`bidValidation`, `verdictQuorum` consumers): `auctionBidderStatus`, `computeValidatedBids`, `validatedBidView.unit` — 72/72 pass.
- **Secret scan:** gitleaks 8.21.2 on the full base→head patch: no leaks. No debug leftovers in added lines. (CI's security-scan job runs the repo's own `scripts/git-hooks/pre-commit --full-repo` heuristic, not gitleaks; that job has not run on this branch either — see INFO #6.)
- **prettier --check:** FAILS on `src/queries/multiparty.ts` (commit b51d7569) — see [RISK] #1.
- **tsc --noEmit** (no CI gate exists for it; the repo is already red at base): base `94d06bd9` = 333 diagnostics, head = 572. The +239 are almost entirely inside files this PR adds (229 are TS2737 "BigInt literals are not available when targeting lower than ES2020" — `tsconfig.json` declares no `target`); exactly **one** new diagnostic lands in a pre-existing file — see [RISK] #2.

### Findings

1. **[RISK] prettier.yml will be red on merge.** `bun run format:check` fails at `src/queries/multiparty.ts` (tab/line-breaking drift, introduced in `b51d7569`, still unfixed at `042d272b`; prettier.yml runs on PRs targeting `auctions`). No checks have run on this branch at all (see INFO #6). One-command fix: `prettier --write src/queries/multiparty.ts`.

2. **[RISK] `VerdictQuorumResult` gained three required fields; one consumer wasn't updated.** `verdictQuorum.ts:24,26,28` adds `majorityFloor`, `requiredQuorum`, `declaredBelowMajority` as required; `src/components/AuctionBidProgressDialog.tsx:67-74` (`NO_SESSION_VERDICT_QUORUM`) doesn't provide them, so `tsc --noEmit` errors there — the only new diagnostic in any pre-existing file (0 at base → 1 at head; the file is untouched by this PR). `bun test` doesn't typecheck and CI has no tsc gate, so nothing catches it — but it breaks IDE/typecheck for anyone touching that dialog. The constant is only read as a fallback (`:98`), not rendered field-by-field, hence RISK not BLOCK. Fix: add the three fields (`0`/`0`/`false` match the no-session state).

3. **[INFO] The form's V4V resolution ignores the seller's chosen quorum.** `AuctionFormContent.tsx:1715` passes `auditor_quorum: requiredVerdictMajority(pool)` — the floor — while the slider writes `formData.auditorQuorum` (`AuctionV4VTab.tsx:283`) and the publish path uses `formData.auditorQuorum ?? floor` (`auctions.tsx:474`; tag emission clamps to `[floor, pool]` at `:366-370`). The tab's own labels use the chosen value (`AuctionV4VTab.tsx:55-56,271,337`), so today nothing user-visible diverges: with the default ruleset (51%, `auctionValidatorPolicy.ts:63`) `rulesetRequiredQuorum` equals the majority floor for every pool size up to the 16-validator cap, so the floor-based and chosen-based calls produce identical issue sets. It's still an inconsistency waiting to bite the first caller that passes a real per-validator ruleset — at that point the preview can disagree with the publish path in either direction. Pass `formData.auditorQuorum` at `:1715` and the two paths converge.

4. **[INFO] Legacy publish inputs preserved; default validator tag changed shape.** The publish seam keeps the `cvmServerPubkey` fallback and single-field path (`getAuctionAuditorsOrThrow`, `auctions.tsx:233-268`). But the root builder now emits `auditor_quorum = floor(P)` instead of the old `auditorsList.length` (unanimity, base `auctions.tsx:315`): an auction with a pool of 3 now declares 2, not 3 — including single-party auctions with multiple validators, since the builder is shared. Deliberate (AUCTIONS.md §4.1 amendment, tested in `verdictQuorum.test.ts`), but it is a wire-visible behavioral change beyond the multiparty root — flagging so the maintainer confirms it applies to the single-party policy too.

5. **[INFO] Open design questions from the PR body are real and still open at head.** (a) The PoP verifier still checks the xpub's **internal** x-only key (`multipartyAuthorizationCrypto.ts:234-239`), so a recipient must control the account-level master key to sign — PR-body question 4, unchanged. (b) `capability.valid_from > root.start_at` still blocks late re-authorizations (`multipartyAuthorization.ts:916`). (c) The recovered `adr-000N` numbering still collides with the main `ADR-000N` series. These are documented decision requests, not code defects.

6. **[INFO] No CI has run on this branch.** `gh pr checks 1384` reports nothing on `spec/auction-multiparty-consolidated` for any of the 27 commits, while `ci-unit.yml`/`prettier.yml`/`e2e.yml` all trigger on PRs targeting `auctions`. Combined with finding 1, the branch's CI story is unverified end-to-end: security-scan, unit, integration, and the repo's Feature Quality Gate (targeted Playwright e2e spec + published video for feature work — no files under `e2e/` are touched). Docs-only changes are exempt from the e2e gate; the V4V tab/slider/validator-selection UI is not.

### Looks good

- The quorum floor lives in one module (`verdictMajority.ts`) and every consumer derives from it — the tally (`verdictQuorum.ts`), the bid classifier (`bidValidation.ts:155` via `effectiveVerdictQuorum`), the auction-validity assessment (`auctionValidatorPolicy.ts:153` via the workflow resolver), and the participation gate (`multipartyParticipation.ts:104`) — so the "two quorum implementations" trap the code comments warn about is avoided, with tests pinning the behaviour.
- Fail-closed discipline is consistent: expired capabilities and offers drop, and an offer naming a capability we cannot see is not pickable (`multipartyAnnouncements.ts:104-121`); no-validator and uncompiled-schedule states block publish (`auctionWorkflowResolver.ts:101-152`, `auctions.tsx:479-483`).
- The multiparty root is an additive projection over the single-party tag list: `buildMultipartyRootTags` replaces the settlement-policy literal in place and appends exactly two tags, refusing to overwrite an existing schedule tag (`multipartyRootTags.ts:70-78`); with no recipients configured the publish path emits the single-party shape as before — with the `auditor_quorum` change noted in INFO #4.

Reviewer notes, not findings: this review started at `76effb42` and was re-anchored to `042d272b` before posting; the findings and every verification number above were re-run at `042d272b`. Per-repo convention for bot reviewers, this is posted as COMMENT — the APPROVED-equivalent verdict is in the text above.

