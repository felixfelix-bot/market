# PR #1138 — is the never-posted draft review (4828c54..50199dc) still valid?

Task: t_5f86aa70 (fleet offload worker). Repo: PlebeianApp/market. Worktree:
`/home/c03rad0r/worktrees/AV-1138-DRAFT-SALVAGE`.
**READ-ONLY.** Nothing was posted, pushed to GitHub, commented, labelled, or merged.
Dispatch freeze untouched. The draft was NOT posted from this task.

---

## TL;DR

The draft's **range no longer describes anything PR #1138 owns**, and its four files are
already on `master` by a separate merged PR. Against the current head the draft is
**textually absent where it would be posted** (the delta hunks are gone from the diff) and
**structurally inapplicable** (its anchor range is an ancestor of the PR base, not part of
the PR delta). Its two surviving behaviours are **unextractable without git archaeology**
because the file that carried them was rewritten by 9 later commits.

Verdict: **do not salvage the draft as a review body.** Salvage only the two *verification
targets* listed in §(d), and re-derive them against the head; treat the rest as STALE.

---

## (a) Current head vs 50199dc

| Item | Value |
|---|---|
| Draft anchor range | `4828c54..50199dc` (4 files, +204/-11) |
| Draft tip SHA | `50199dce5a11c1d33d42bfe8bdda55447e6ab5d7` (2026-09-10T14:04:13+02:00, "…(#1289)") |
| Head at the Gate-2.5 audit | `eacc4256960217b14553e68b179bd34e68a91d01` (2026-09-25) |
| **Live PR #1138 head NOW** | **`6be7496cc2089db2e2da04bb083312ae6d43a79d`** (2026-10-06T18:26:49Z) |
| PR base ref / base SHA | `master` / `c8c06fd74dd3d259dfc43bf79f7da2c3590eb664` |
| PR state | OPEN, **isDraft=true**, mergeable=**CONFLICTING**, mergeStateStatus=**DIRTY**, reviewDecision=REVIEW_REQUIRED |
| PR size at head | 387 changed files, +79922/-1579 |
| Ancestry | `50199dc` **is** an ancestor of `6be7496c` (6be7496c is a 2-parent commit: `eacc4256` + master `95eeefca`) |

**The head moved twice, not once:** `50199dc → eacc4256` (312 commits: `git rev-list --count
50199dc..6be7496c` = 312) and `eacc4256 → 6be7496c` (6 commits). The brief's premise "the PR
head may have moved" is an understatement — at draft time the head was already `eacc4256`
(2026-09-25), and the draft anchors on `50199dc` (2026-09-10).

**The merge-base is NOT `4828c54`.** `git merge-base origin/master 6be7496c` =
`c8c06fd74dd3d259dfc43bf79f7da2c3590eb664` ("feat(labels): NIP-32 test-listing curation
(#1266)", 2026-09-17), which equals the live `pulls/1138.base.sha`. The Gate-2.5 audit
recorded exactly this correction: *"the never-posted draft range 4828c54..50199dc is
anchored on the stale tip; t_5f86aa70's premise is invalid as written."*

### What the draft range actually is

`git log --format='%h %ad %an %s' --date=short 4828c54..50199dc`:

    50199dce 2026-09-10 c03rad0r       fix(settlement): make mint-keyset resolution deterministic and network-free in unit tests (#1289)
    d66298d5 2026-09-10 felixfelix-bot fix(settlement): use explicit isFailure flag for mint-keyset negative cache
    5298dd71 2026-09-10 felixfelix-bot fix(settlement): use short failure TTL for mint-keyset lookup
    b3f332f9 2026-09-10 felixfelix-bot fix(settlement): make mint-keyset resolution deterministic and network-free in unit tests

That is **PR #1289** — our own accounts' work, 4 files, matching the announced +204/-11
exactly (`git diff --numstat` reproduces 106/0, 16/1, 12/1, 70/9). It is **not Franchovy
auction code**.

Decisive structural fact:

- `git merge-base --is-ancestor 4828c54 c8c06fd7` → **NO** (`4828c54` is not in the PR base's history as an ancestor relation we can rely on)
- `git merge-base --is-ancestor c8c06fd7 50199dc` → **NO** → **`50199dc` is an ancestor of the PR base `c8c06fd7`, i.e. it sits OUTSIDE `c8c06fd7..6be7496c`, the range that is PR #1138's diff.**

So `4828c54..50199dc` is a stretch of `master` lineage that the PR base already contains.
Reviewing that range and posting it as PR #1138 feedback would attach findings about
already-merged master code to an unrelated PR.

---

## (b) Diff introduced after the draft

Whole-tree drift `50199dc..6be7496c`: **264 files, +31835/-3239** (dominated by the base's
advance — the classic "a whole-tree diff on a moved-base PR is mostly not the PR" trap).

Restricted to the draft's own four files, `git diff --stat 50199dc..6be7496c -- <paths>`:

| Draft file | state at draft | post-draft commits | draft→head diff |
|---|---|---|---|
| `src/lib/__tests__/fetchMintKeysets.test.ts` | NEW (A, +106) | **none** | **unchanged** (absent from the diff) |
| `src/lib/__tests__/settlementDescriptor.test.ts` | M, +17/-1 | 6 | **+289/-?** (rewritten around the additions) |
| `src/lib/auction/settlementDescriptor.ts` | M, +13/-1 | 4 | **+73/-?** |
| `src/lib/auction/validation.ts` | M, +79/-9 | 9 | **+413/-?** |
| **total** | +204/-11 | — | **+574/-201 across 3 files** |

Post-draft commits touching the draft's files (newest first, partial list):

- `settlementDescriptor.ts`: `2386aed3` harden rebid collateral validation · `dfb053c0` #1280
  re-review — descriptor terminal-miss threading · `d633ba64` address #1280 review — R1 keyset
  ingestion / R2 path-release keysets / R3 terminal-miss · `a4962850` wire bounded DLEQ keyset
  acquisition into ingestion/settlement; unavailable DLEQ evidence is pending not valid
  (ADR-0011 Blocker 1)
- `validation.ts`: `9867df25` **retire dleq_required — core code** · `1644fb9a` **single
  canonical mintSupportsDleq** · `2386924d` canonical DLEQ activation via signed
  `dleq_required` tag (ADR-0011 Blocker 4) · `80934610` enforce NUT-12 DLEQ mint support at
  auction publish · `489cf466` guard null/undefined `dleq_proof` entries · `31d11ef8` validate
  structural fields of `dleq_proof` entries · `f8f24e06` doc/parse split, test distinctness,
  ordering · `25167a60` extend unit suites · `66848aa0` **structural-only bid validity,
  REQUIRED `starting_bid` (ADR-0012 Phase 1)**
- `settlementDescriptor.test.ts`: the same `2386aed3`, `dfb053c0`, plus `2382af2b`,
  `999408c9`, `a6ce5498`, `2386924d`
- file growth: `validation.ts` 1099 → 1160 → **1233** lines at `4828c54` / `50199dc` / `6be7496c`

**Hunk-level answer to the brief's step 2.** The draft's hunks were:

| File | Draft hunks (in `4828c54..50199dc`) |
|---|---|
| `fetchMintKeysets.test.ts` | `@@ -0,0 +1,106 @@` (whole file) |
| `settlementDescriptor.test.ts` | import of `MintKeyset`; `+mintKeysets` in `makeInput`; ADR-0005 comment; new `mockMintKeysets()` helper |
| `settlementDescriptor.ts` | interface `mintKeysets?` doc block; injection short-circuit replacing the bare `await fetchMintKeysets(...)` |
| `validation.ts` | `KEYSET_CACHE_FAILURE_TTL_MS` / `KEYSET_FETCH_TIMEOUT_MS` / `isFailure` cache type; `clearKeysetCache()`; `CashuRequestOptions` + `requestWithTimeout`; cached-TTL branch; `CashuMint.getKeySets(mintUrl, requestWithTimeout)`; `console.warn` on failure; negative-cache + success-cache writes |

Did they move? **The lines moved; the delta did not survive as a delta.**

- Already identical to master (no-op within the PR diff): the entire `fetchMintKeysets.test.ts`
  (106 lines) is byte-identical at `50199dc` and `6be7496c` — but it also **already exists at
  the PR base `c8c06fd7`**, so it contributes **zero** lines to `c8c06fd7..6be7496c`.
- Landed elsewhere and now indistinguishable from master: every other draft hunk is present at
  the head, and its content **is already in the base** `c8c06fd7` too (the PR base was cut on
  2026-09-17, *after* `50199dc` on 2026-09-10). Within `c8c06fd7..6be7496c` the diff for all
  four files is a **pure-add** (`3888 insertions(+)`, 0 deletions) — the base simply does not
  contain those paths yet in the PR's line of history, at all sizes (1540 / 1009 / 1233 lines).
- So: at `4828c54..50199dc` the draft was reviewing a **4-file, 204-line delta**. At the head
  there **is no such delta to review** — the lines are (i) already in the base, or (ii) part of
  files that the PR adds wholesale. Either way the draft's own 204 lines are **not** the diff.

**Non-vacuity note (why "the symbols still exist" is not a salvage case).** Every symbol the
draft added is still present verbatim at head — this is a *survival* check, not a *delta*
check:

    validation.ts @6be7496c   KEYSET_CACHE_FAILURE_TTL_MS:66  KEYSET_FETCH_TIMEOUT_MS:67
                              isFailure:68-72   clearKeysetCache:78   requestWithTimeout:97
                              AbortSignal.timeout(…):104   ttl = isFailure?short:long:118
                              CashuMint.getKeySets(mintUrl, requestWithTimeout):125
                              negative-cache set:134   success-cache set:137
    settlementDescriptor.ts    mintKeysets?: MintKeyset[]  :86 (draft: :80)
                              param threading :135 :155 :307
                              injection: input.mintKeysets ?? (await fetchMintKeysets(…)) :587 (draft: :558)

The semantics survived; the **line anchors did not** (`:80 → :86`, `:558 → :587`, and
`validation.ts` shifted by tens of lines under the 9 DLEQ/bid-validity commits). A posted
review quoting `:80`/`:558` would cite the wrong lines.

---

## (c) Per-finding disposition

The draft *artifact* could not be recovered (§ step 4 below), so "findings" here means the
draft's four files and their reviewable content, plus the two dependency results that this
task was scoped against. Each is classified at the **current head**.

| # | Draft item | Current state at head | Disposition | Reason (one line) |
|---|---|---|---|---|
| 1 | `fetchMintKeysets.test.ts` (new, +106) | present at head, byte-identical to `50199dc`, **also present at PR base** | **STALE** | Contributes 0 lines to the PR diff and is already merged; nothing to review. |
| 2 | `settlementDescriptor.test.ts` mint-keyset injection (`mockMintKeysets()`, `mintKeysets` in `makeInput`, ADR-0005 comment) | present at head; file rewritten by 6 later commits | **NEEDS REWORD** | The AST is real but the file is +289 lines different and every draughted line number is gone; any finding must be re-derived, not re-posted. |
| 3 | `settlementDescriptor.ts` — inject `mintKeysets`, replace bare `await fetchMintKeysets` | present at head at `:86` / `:587` (draft: `:80` / `:558`) | **NEEDS REWORD** | Fix and its rationale survive, but 4 later commits moved the seam and the draughted anchors are wrong. |
| 4 | `validation.ts` — failure TTL + `isFailure` + `requestWithTimeout` + `clearKeysetCache` | present at head verbatim (`:66ff`); file rewritten by 9 later commits (1099→1233) | **NEEDS REWORD** | The negative-cache/timeout design is intact, but the module now also carries DLEQ retirement and ADR-0012 bid validity, and two of those commits actively reworked the same mint-support surface. |
| 5 | Draft *as a whole* as a postable review body on PR #1138 | anchor range outside the PR diff range (`c8c06fd7..6be7496c`) | **STALE/OBSOLETE** | `50199dc` is an ancestor of the PR base; findings about it are findings about merged `master`, not about #1138. |
| 6 | Draft *tip* `50199dc` / merge-base `4828c54` | head is `6be7496c`; merge-base is `c8c06fd7` | **STALE** | Both anchors moved; the audit already recorded "premise invalid as written". |
| 7 | Dependency result — tip-verification head `eacc4256` | superseded | **STALE** | Head is now `6be7496c`; `eacc4256` is merely 6be7496c's first parent. |
| 8 | Dependency result — own-delta manifest (fork `c8c06fd7`, 381 files/711 commits) | fork point still `c8c06fd7`; counts moved to 387 files | **NEEDS REWORD** | Fork point correct, file/commit counts and mergeability (now CONFLICTING/DIRTY) are out of date. |
| 9 | Draft's implied "review owed at tip" posture | 4 reviews exist; `c03rad0r` = 0 | **NEEDS REWORD** | reviewDecision=REVIEW_REQUIRED, PR is CONFLICTING, and the last tip review (`felixfelix-bot`, COMMENTED, commit `eacc4256`, 2026-09-26) is itself 6 commits stale. |

Nothing in the draft is **STILL VALID** as a postable finding: the strongest candidate items
(#2–#4) all require re-anchoring, and the remaining items are stale by construction.

---

## (d) Salvage list for the consolidator

**Do not salvage the draft text.** Recover these three things, and nothing else:

1. **Verification target only — the negative-cache / bounded-timeout design.** The behaviour
   (`KEYSET_CACHE_FAILURE_TTL_MS` 5 s, `KEYSET_FETCH_TIMEOUT_MS` 2000 ms,
   `AbortSignal.timeout`, explicit `isFailure` so a legitimately-empty successful keyset keeps
   the long TTL, `clearKeysetCache()` for test isolation) is live at head in
   `src/lib/auction/validation.ts:66-137`. Salvage value = *"re-confirm this design at the head
   after 9 intervening commits"*, **not** the draft's words.
2. **Verification target only — the keyset injection seam.** `mintKeysets?: MintKeyset[]` on
   `GetSettlementDescriptorInput` (`settlementDescriptor.ts:86`) with the
   `input.mintKeysets ?? (await fetchMintKeysets(...))` short-circuit at `:587`. Salvage value =
   *"re-anchor `:80`→`:86` and `:558`→`:587` before quoting"*.
3. **The ADR-0005 rationale sentence** ("test mint URLs are data, not services; inject
   deterministic keysets so no HTTP call is made") — it survives in
   `settlementDescriptor.test.ts` and is the only draft prose whose *meaning* is still exactly
   right at the head.

Carry-forward corrections the consolidator must apply:

- Head is `6be7496cc2089db2e2da04bb083312ae6d43a79d`, **not** `50199dc`, **not** `eacc4256`.
- Merge-base / PR base is `c8c06fd74dd3d259dfc43bf79f7da2c3590eb664`.
- `4828c54..50199dc` is **outside** the PR diff range → the draft is not a delta review of
  #1138; it is a review of PR #1289 (our own, already merged).
- PR #1138 is `isDraft=true`, `CONFLICTING`/`DIRTY`, `REVIEW_REQUIRED`; 387 files, +79922/-1579.
- Any new review must anchor on `c8c06fd7..6be7496c` and re-derive findings there.

---

## Step 4 — artifact location (explicit)

**No draft artifact for this range exists on disk.** Only the range and the 4-file list were
recoverable. Searched: `~/hermes-orchestration/state/**` and its `cw-untracked-backup-*`
twin, `~/reports/reviews/**`, `~/worktrees/**`, `~/notes`, `~/.hermes/**`, plus a recursive
filename sweep (`*1138*`, `*draft*review*`) and a content sweep for files containing both
`4828c54` and `50199dc`.

Near-misses, each ruled out with reason:

| Path | Why it is NOT the draft |
|---|---|
| `/home/c03rad0r/hermes-orchestration/state/reports/review-1138-delta-POST.md` (1951 B, Sep 13) — dup at `/home/c03rad0r/cw-untracked-backup-1789205713/state/reports/…` (same sha256 `2f4672f6…`) | Range is `0329899..8bf1a35` (ADR-0009 docs), docs-only, verdict SHIP-WITH-NITS; predates and is a different range from `4828c54..50199dc`. |
| `…/review-1138-delta-TRIMMED.md` (378 B, sha256 `dea64061…`) | Same wrong range; trimmed variant of the above. |
| `/home/c03rad0r/reports/reviews/plebeian-pr-reviews-t_4d6cdb2d-pr1138-own-delta-manifest.md` (117,764 B) | The read-only **manifest** produced by dependency task `t_4d6cdb2d`; a manifest, not a findings draft. |
| `/home/c03rad0r/worktrees/t_c610c6fa/draft-review.md` | Unrelated card artifact (not #1138). |

Kanban evidence that the draft never had a persisted artifact: cards `t_0156cc5f` and
`t_df271b10` (the Gate-2.5 audits) are both `status=done` with an **empty `result`**;
`t_83dc431a` ("Locate the never-posted draft artifact") is stuck in `triage`; `t_d5b556da`
and `t_7008029f` likewise never produced a result. The Gate-2.5 verdict survives only as a
session record (`worker-pr-reviewer` session `20261002_144847_a6ced3`, verdict APPROVED with
the "premise invalid as written" correction).

---

## Reproduce

```bash
cd ~/worktrees/AV-1138-DRAFT-SALVAGE
git diff --stat  4828c54..50199dc                       # 4 files, +204/-11
git log --oneline 4828c54..50199dc                      # PR #1289, our accounts
git rev-parse pr1138-head                               # 6be7496c…
git merge-base origin/master 6be7496c                   # c8c06fd7…
git merge-base --is-ancestor c8c06fd7 50199dc; echo $?  # 1 => 50199dc is NOT in the PR range
git log --oneline 50199dc..6be7496c -- src/lib/auction/validation.ts   # 9 commits
git diff --stat 50199dc..6be7496c -- <the 4 draft files>               # +574/-201, 3 files
gh pr view 1138 --repo PlebeianApp/market \
  --json headRefOid,baseRefName,state,isDraft,mergeable,mergeStateStatus,reviewDecision
```

## NOT DONE / constraints honoured

- No review, comment, label, or push to GitHub. Read-only throughout.
- Dispatch freeze untouched (not lifted, not probed destructively).
- The draft was **not** posted from this task.
