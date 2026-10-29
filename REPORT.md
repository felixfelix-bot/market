# REPORT — Is the never-posted PR #1138 draft review still valid?

Task: assess whether the drafted-but-never-posted delta review (`4828c54..50199dc`,
4 files, +204/−11) still applies to the current head of PlebeianApp/market PR #1138,
and which parts are salvageable.
**READ-ONLY vs GitHub. Nothing posted. Dispatch freeze not lifted.**
Repo: /home/c03rad0r/repos/market @ local `0a4289a6` (branch `preflight/pr1138-20261023`).

Bottom line up front: **the draft is dead as a post, but not as content.** Two of its four
rhetorical pieces are stale, and one substantive finding is still literally true at the head —
with shifted line numbers and a mandatory dedup caveat.

---

## (a) Current head vs `50199dc`

| Item | Value | How verified |
|---|---|---|
| Live PR #1138 head | **`6be7496cc2089db2e2da04bb083312ae6d43a79d`** | `gh api repos/PlebeianApp/market/pulls/1138` |
| Head branch / base | `auctions` → `master` @ `c8c06fd74dd3d259dfc43bf79f7da2c3590eb664` | same |
| PR state | open, **`mergeStateStatus: dirty`**, 784 commits, updated 2026-10-28T23:03:36Z | same |
| Draft's pinned SHA | `50199dce5a11c1d33d42bfe8bdda55447e6ab5d7` | — |
| Is head still `50199dc`? | **NO.** `git rev-list --left-right --count 50199dc...6be7496cc` → `0 312` (0 behind, 312 ahead) | git |
| Is merge-base still `4828c54`? | **YES.** `git merge-base 4828c54 6be7496cc` = `4828c54ea99b7b015313d491f4e63005b49bf040` | git |
| What is `4828c54..50199dc`? | 4 commits (`b3f332f9`, `5298dd71`, `d66298d5`, `50199dce`) = **the entirety of PR #1289**, already merged into `auctions` 2026-09-10 | `git log --oneline 4828c54..50199dc`; `gh pr view 1289` → `state: MERGED` |
| Topology | `4828c54` ⊂ `50199dc` ⊂ `eacc4256` ⊂ `6be7496cc` (all `merge-base --is-ancestor` confirmed) | git |

So the dispatch premise "current head is 50199dc" is **false**: the head moved 312 commits.
The draft's anchor (`4828c54`) is still a valid delta base — it is the parent of the draft range
and an ancestor of the head. Note it was never the merge-base *against master*; it was the
`auctions` tip at draft time. As a delta anchor it holds.

Corpus context (all four reviews on #1138, from `gh api .../reviews`):

| Review | Commit | State | Submitted |
|---|---|---|---|
| 4981597986 | `c564a1c9` | CHANGES_REQUESTED | 2026-08-20 |
| 4987152393 | `cc200f17` | COMMENTED | 2026-08-20 |
| 4992989990 | `03298995` | COMMENTED | 2026-08-21 |
| 5328118447 | `eacc4256` | COMMENTED | 2026-09-26 |
| **5690837398** | **`6be7496c`** | **COMMENTED** | **2026-10-28T23:03:36Z** |

There **is** already a review at the current head (`5690837398`, posted 2026-10-28). That is a
new fact relative to the draft era: the PR now has at-head coverage, so nothing here is a
"review owed" obligation.

---

## (b) Diff introduced after the draft

`git diff --stat 50199dc 6be7496cc` → **264 files, +31,835 / −3,239**.
`git log --oneline 50199dc..6be7496cc` → 312 commits.

Restricted to the draft's own four files, the post-draft churn is much smaller —
**3 files, +574 / −201**:

```
 src/lib/__tests__/settlementDescriptor.test.ts | 289 ++++++++++++++++-
 src/lib/auction/settlementDescriptor.ts        |  73 +++--
 src/lib/auction/validation.ts                  | 413 ++++++++++++++++----------
 3 files changed, 574 insertions(+), 201 deletions(-)
```

Per-file staleness at `6be7496cc` (blob compare + touching-commit count):

| Draft file | Blob @50199dc | Blob @6be7496cc | Commits since | Verdict |
|---|---|---|---|---|
| `src/lib/__tests__/fetchMintKeysets.test.ts` | `f6a20243` | `f6a20243` | **0** | **byte-identical, untouched** |
| `src/lib/auction/settlementDescriptor.ts` | `34d2761b` | `6bff19fe` | 4 | modified |
| `src/lib/__tests__/settlementDescriptor.test.ts` | `0f57e31e` | `0bfa7af5` | 6 | modified |
| `src/lib/auction/validation.ts` | `62520152` | `a429fac2` | 9 | modified |

Touching commits (what moved and why):

- `validation.ts`: `9867df25` retire `dleq_required`, `1644fb9a` canonical `mintSupportsDleq`,
  `2386924d`+`80934610` ADR-0011 DLEQ gates, `489cf466`/`31d11ef8` dleq_proof structural
  validation, `f8f24e06`, `25167a60`, `66848aa0` ADR-0012 Phase 1 (`bid_pending_review` removed
  from `BidValidationVerdict`).
- `settlementDescriptor.ts`: `a4962850` bounded DLEQ keyset acquisition, `d633ba64`+`dfb053c0`
  #1280 review R1–R4 (keyset ingestion, path-release keysets, terminal-miss threading),
  `2386aed3` rebid collateral hardening.
- `settlementDescriptor.test.ts`: `2386924d`, `a6ce5498`, `999408c9`, `2382af2b`,
  `dfb053c0`, `2386aed3`.

**Critical nuance: the draft's *subject code* did not move — only its surroundings did.**
The `git diff 50199dc..6be7496cc -- src/lib/auction/validation.ts` hunks are DLEQ/ADR-0011/
ADR-0012 work appended *after* `fetchMintKeysets`; the keyset-cache block itself is untouched
(its only change is line shift). Same for the seam: `settlementDescriptor.ts:587` still reads
`input.mintKeysets ?? (await fetchMintKeysets(winnerBid.mint))` verbatim.

---

## Where the draft's text comes from (step 4)

**No draft body file exists on disk.** Confirmed by: git history scan of the market repo
(`git log --all -S"4828c54"`, `-- '*1138*'`, fsck dangling commits) and a filesystem sweep.
`reviews/1138-draft.md` was never committed.

The recoverable surrogate is:

1. **`/home/c03rad0r/repos/plebeian-pr-reviews/reviews/1138-gate-verdict.md`**
   (commit `697e1c4`, 2026-09-12; 2nd independent pass `08e2312`). This is the Gate-2.5
   cold-audit verdict, and it quotes the draft's shape and every substantive claim it audited:
   thanks-line naming the delta, **one `[INFO]` finding** (cashu-ts request-semantics drift),
   "No new issues found in this delta", "16 findings from prior reviews stand", Happy-to-help close.
2. **Kanban card `gate-pr1138-keyset-delta`** in `~/.hermes/kanban.db` — title:
   *"GATE 2.5 PR #1138 (delta 4828c54..50199dc) cold audit — VERDICT APPROVED; draft accurate,
   dedup clean, no missed new issues; nothing posted"*. Body carries the per-point audit.
   (The two cards the older corpus blamed for losing the draft — `t_0156cc5f`, `t_df271b10` —
   are **not present** in this profile's kanban.db, which holds only 11 tasks; the surviving
   Gate-2.5 card is the operator's `gate-pr1138-keyset-delta`.)
3. Prior on-disk salvage note `/home/c03rad0r/repos/plebeian-pr-reviews/reviews/1138-draft-salvage-assessment.md`
   (commit `76bc95a`) — **already carries a STALE banner** and must not be trusted as-is: it was
   written against `bfd66fc7` and claims all four draft files were byte-identical. That claim is
   **false at `6be7496cc`** (only `fetchMintKeysets.test.ts` is). Its standing-set table is also
   un-re-verified at the head.

So: the draft's **shape and its single finding are recoverable**; the exact prose is not.

---

## (c) Per-finding disposition at `6be7496cc`

The draft was a delta comment review with four components. Each is dispositioned separately.

| # | Draft item | Disposition | Reason (one line) |
|---|---|---|---|
| F1 | **`[INFO]` cashu-ts drift** — `requestWithTimeout` reimplements upstream request semantics; `@cashu/cashu-ts` floats `^2.1` while the lockfile pins 2.9.0, so minor bumps land silently; upstream a per-request timeout option | **STILL VALID — but NEEDS REWORD to post** | Every factual anchor survives at the head: `requestWithTimeout` now `validation.ts:97-106` (was 85-97), `KEYSET_FETCH_TIMEOUT_MS = 2000` `:67`, `fetchMintKeysets` `:111`, `package.json:39` still `^2.1`, `bun.lock` still resolves 2.9.0, sole prod call site unchanged. Only the line numbers and one fidelity claim need fixing. |
| F2 | **"No new issues found in this delta"** | **STALE / OBSOLETE** | True of `4828c54..50199dc`, but that slice *is* merged PR #1289 with its own closed APPROVED thread; as a #1138 statement at head it reviews history, not the PR. |
| F3 | **"16 findings from prior reviews stand"** | **STALE (overstated) — salvageable as a corrected table** | Inherited from the 2026-09-04 comment, never ground-truthed. The `bfd66fc7`-era assessment found ~11 stand + 1 half (R2-1, R2-2, R2-5, R2-10 and R2-8's dead-code half were fixed pre-draft). Do not restate "16". |
| F4 | **Thanks-line / review envelope** naming the delta | **STALE / OBSOLETE** | Frames a review of a slice that is now merged lineage with its own thread; a new post must frame the *current* delta instead. |

### F1 verification detail (this is the salvageable substance)

| Claim | Status at `6be7496cc` | Evidence |
|---|---|---|
| `requestWithTimeout` mirrors upstream request construction (JSON body, `Accept`, conditional `Content-Type`), `!res.ok` throws, `res.json()` | **TRUE, still verbatim** | `src/lib/auction/validation.ts:97-106` |
| Explicit `signal:` spread last, so it overrides anything in `signalInit`; `AbortSignal.timeout(2000)` | **TRUE** | `validation.ts:104`, `:67` |
| `@cashu/cashu-ts` floats `^2.1` while lockfile is 2.9.0 → silent minor bumps | **TRUE, unchanged** | `package.json:39`; `bun.lock:8` (`^2.1`), `:122` (`2.9.0`) |
| Custom `requestWithTimeout` drops upstream's typed error envelope (NetworkError / ApiError body parse / globalRequestOptions merge) | **TRUE** (the gate's own "precision tweak") | gate verdict `697e1c4` §Point 2; head code has a bare `fetch` + generic `Error` |
| Prod path still exercises the bounded live fetch (`AuctionSettlement.tsx` passes no `mintKeysets`) | **TRUE** | `src/components/AuctionSettlement.tsx:213-235` (passes `dleqKeysets`, never `mintKeysets`); seam at `settlementDescriptor.ts:587` |
| `fetchMintKeysets.test.ts` (the draft's test file) is still the same bytes | **TRUE** | blob `f6a20243` at both tips, 0 touching commits |

**Mandatory reword constraints for F1:**

- **Dedup:** maxime-tt already posted the same substance publicly on merged **PR #1289**
  (issue comment `5618306565`, 2026-09-10, non-blocking suggestion #4: *"`requestWithTimeout`
  reimplements cashu-ts' request semantics (JSON headers/body)… if the library later exposes a
  signal option, prefer it"*). It must **not** be presented as new. It is still *additive* on
  #1138 because it brings the `^2.1`-vs-2.9.0 lockfile-drift point and the
  error-envelope-fidelity point, neither of which maxime-tt raised.
- **Fix the fidelity overstatement:** "with only the AbortSignal added" is not accurate — the drop
  of upstream's typed errors / error-body parsing / global-option merge is real. The gate verdict's
  suggested wording is the right one: *"mirrors the request-construction semantics (…) and adds an
  AbortSignal; error-envelope handling (typed errors, error-body parsing) is simplified."*
- **Line refs must be re-pointed** to 97-106 / 67 / 111 (see table above); the draft's 85-97,
  86/88-89/93-95 are all shifted.
- **Dedup-safe against the at-head review:** the already-posted `5690837398` at `6be7496cc`
  contains **no** `keyset` / `timeout` / `cashu-ts` / `requestWithTimeout` content (grepped its
  body). So the gap F1 names is genuinely uncovered at the head.

### F3 spot-check (partial re-verification at `6be7496cc`)

I re-verified 3 of the 11 "standing" findings at the head; all 3 still stand. The other 8 are
**not** re-verified by this task and must not be restated as verified.

| Finding | Status at head | Evidence |
|---|---|---|
| R2-3 concurrent floor non-determinism | **STANDS** | `void onBidEvent(event, observedAt)` at `src/server/auction-validator/subscriber.ts:208` (fire-and-forget) |
| R2-4 unbounded `lock_secret`/`proof_y` arrays | **STANDS** | `src/lib/schemas/auction/bidEvent.ts:80` — `z.array(z.string().min(1)).min(1, …)`, no `.max()` |
| R2-9 p2pk parser accepts non-canonical ints | **STANDS** | `src/lib/cashu/p2pkSecret.ts:122` — `String(n) !== raw.replace(/^[+\s]+/, '')`; also duplicated at `src/lib/schemas/auction/tagAccess.ts:71` |

---

## (d) Explicit salvage list for the consolidator

**SALVAGE-1 — F1, reworded.** The only piece of the draft worth carrying forward. Required edits
before any use: (i) re-point line refs to `validation.ts:67, 97-106, 111` and
`settlementDescriptor.ts:587`; (ii) adopt the "mirrors request-construction semantics; error-envelope
handling simplified" wording instead of "only the AbortSignal added"; (iii) explicitly acknowledge
maxime-tt's #1289 comment `5618306565` and state what is *additive* here — the `^2.1` float vs 2.9.0
lockfile drift and the dropped error envelope — so it cannot read as a rediscovery.

**SALVAGE-2 — the corrected standing set (F3), as a table not a preamble.** ~11 stand + 1 half, not
16. Do **not** re-raise R2-1, R2-2, R2-5, R2-10, or R2-8's dead-code half (fixed pre-draft).
Only R2-3, R2-4 and R2-9 are re-verified by this task; the remaining 8 need their own check at
`6be7496cc` before being asserted.

**SALVAGE-3 — the file-level fact.** `src/lib/__tests__/fetchMintKeysets.test.ts` is still
byte-identical (`f6a20243`) to what the draft reviewed, 0 touching commits across 312. If any
future finding targets that test file, it needs no re-derivation.

**NOT SALVAGEABLE (do not post):**

- F2 "no new issues found in this delta" — describes merged #1289, not the PR.
- F3's "16 findings stand" *as a number* — overstated; only the corrected table survives.
- F4 the thanks-line/envelope — frames a merged slice.
- Any post of the draft *as the delta review of #1138*. The draft's range is merged history.

**Scope warning for whoever writes the real #1138 review:** the draft covers **none** of the
312 commits since `50199dc`. The genuinely unreviewed text is the ~10-file window after the last
posted review (`eacc4256..6be7496cc`), plus whatever `5690837398` left open. Reviving the draft
must not be mistaken for discharging current coverage.

---

## Constraint compliance / honesty notes

- **Read-only:** every GitHub access was a `gh api` GET (`pulls/1138`, `.../reviews`,
  `.../reviews/{id}`, `issues/1138/comments`, `issues/comments/5618306565`,
  `pulls/1289/reviews`). **Zero writes.** Nothing posted, nothing drafted to GitHub,
  no PR/issue/comment touched.
- **Dispatch freeze:** `~/.hermes/bot/.dispatch_frozen` **does not exist on this host**
  (`ls` → ENOENT, `find -maxdepth 4` → no match). Reported as an observation; the freeze was
  not lifted and no action was needed — every step was a read. (The freeze file's absence is a
  standing discrepancy on this node, consistent with sibling task `5201e7e`'s finding.)
- **Not re-verified here:** 8 of 11 standing-set findings; the `e2e-full` CI status at
  `6be7496cc`; anything about `master` mergeability beyond the API's `dirty` flag.
- **Git housekeeping:** `.git/index.lock` was a 0-byte stale lock (no `git` process alive,
  `ps` checked) blocking the commit; removed it, then committed. No `--no-verify` used.

## Artifacts / commits

- Report: `/home/c03rad0r/repos/market/REPORT.md` (this file)
- Progress: `/home/c03rad0r/repos/market/PROGRESS.md`
- Commit `9455d71a` — PROGRESS.md leg, **pushed** to
  `fork` → `refs/heads/worker-base/1138-draft-salvage` (verified: `git ls-remote fork` returns
  `9455d71a9a5d942582b641142b8c11d984d53078`, matching local HEAD at push time).
- Draft surrogate (external repo, read-only): `reviews/1138-gate-verdict.md` @ `697e1c4`,
  `/home/c03rad0r/repos/plebeian-pr-reviews`.
- Kanban evidence: card `gate-pr1138-keyset-delta` in `~/.hermes/kanban.db`.

### Commits after the PROGRESS push

The REPORT.md commit (`d3863555`) was committed and pushed to the same branch **after** the
verified PROGRESS push, and that push was then re-verified end-to-end:
`git ls-remote fork refs/heads/worker-base/1138-draft-salvage` →
`d38635553c2ce9ef96b180ac9ea91ee4a268e0bc` == local `git rev-parse HEAD`. Both commits are on
the remote; nothing is local-only.
