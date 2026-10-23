# Preflight — PlebeianApp/market PR #1138 "Auctions V1"

**Task:** establish the exact review target before any findings are written.
**Mode:** read-only. **Zero GitHub writes performed** (0 reviews, 0 comments, 0 status changes, 0 PR edits).
**Dispatch:** frozen per brief. `~/.hermes/bot/.dispatch_frozen` **did not exist** on this host (`ls` → ENOENT) — noted, not treated as permission to unfreeze, and nothing was dispatched.
**Run:** 2026-10-23. Branch `preflight/pr1138-20261023` pushed to `fork`.

> Filename note: `REPORT.md` in this worktree is a **tracked** file holding the 2026-10-12 PR #1280 round-4 report. Writing over it would have destroyed another card's deliverable, so preflight artifacts live here and in `MANIFEST.md` instead.

---

## (a) Head SHA — IT MOVED

|                            |                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Head at scheduling         | `50199dce5a11c1d33d42bfe8bdda55447e6ab5d7`                                                                                                          |
| **Head now (verbatim)**    | **`6be7496cc2089db2e2da04bb083312ae6d43a79d`**                                                                                                      |
| Moved?                     | **YES — 312 commits ahead of the scheduling head**                                                                                                  |
| Delta `50199dc..6be7496cc` | 264 files, +31,835 / −3,239                                                                                                                         |
| Head commit                | `fix(auctions): land the production-relevant hardening from the Coco branch, independent of Coco (#1402)` — Diego Aguero, 2026-10-06T14:26:47-04:00 |
| Liveness check             | `refs/heads/auctions` on origin == `6be7496cc…` (API-confirmed) — this is the live branch tip, not a stale cached SHA                               |

PR API snapshot (`gh api repos/PlebeianApp/market/pulls/1138`):

```
head=6be7496cc2089db2e2da04bb083312ae6d43a79d
base=master   base.sha=c8c06fd74dd3d259dfc43bf79f7da2c3590eb664
draft=true    mergeable=false   mergeable_state=dirty
changed_files=387   additions=79922   deletions=1579   commits=784
```

⚠️ **All downstream work must use `6be7496cc`.** The scheduling SHA `50199dc` is a stale pin — 312 commits and 264 files behind.

### Everything downstream must also account for a _second_, much smaller delta

The last **posted** review covered head `eacc4256960217b14553e68b179bd34e68a91d01` (2026-09-26), not `50199dc`. `eacc4256` is an ancestor of the current head, so the genuinely-unreviewed surface is two different spans:

| Span                                              | Commits | Files  | Lines            |
| ------------------------------------------------- | ------- | ------ | ---------------- |
| `50199dc..6be7496cc` (vs scheduling pin)          | 312     | 264    | +31,835 / −3,239 |
| **`eacc4256..6be7496cc` (vs last posted review)** | **6**   | **10** | **+166 / −27**   |

The second row is the _actionable_ unreviewed delta. Its 10 files:

```
 +9  -2  src/lib/__tests__/auctions/privateAuctionClaimMessage.test.ts
 +9  -2  src/lib/__tests__/nostr/nip59.test.ts
+59  -0  src/lib/auction/useNut7Polling.test.ts
 +8  -1  src/lib/auction/useNut7Polling.ts
 +9  -2  src/lib/nostr/nip59.test.ts
+15  -5  src/lib/orders/privateOrderMessage.test.ts
+24  -0  src/lib/piiSentinelFixture.ts
+10  -2  src/publish/orders.test.ts
 +9  -2  src/queries/__tests__/orders-private-details.test.ts
+14 -11  src/routes/_dashboard-layout/dashboard/products/auctions.$auctionId.tsx
```

The two substantive (non-test) items are `useNut7Polling.ts` (runtime-guards `proofYs` at the observer boundary instead of trusting the `ParsedBidEvent` type) and the seller-dashboard route (feeds **parsed** bids to `useNut7Polling` — previously handed raw relay events, which carry no `mint`/`proofYs`, so NUT-7 evidence was silently empty). The rest is a shared `piiSentinelFixture` refactor across six privacy suites.

---

## (b) Is a review owed at this tip? — **YES**

```
reviews at commit_id == 6be7496cc2089db2e2da04bb083312ae6d43a79d  →  0
```

Full review inventory on PR #1138 (all by `felixfelix-bot`; `c03rad0r` has posted none):

| #              | Submitted      | State             | Commit reviewed | Ancestor of head? |
| -------------- | -------------- | ----------------- | --------------- | ----------------- |
| 4981597986     | 2026-08-20     | CHANGES_REQUESTED | `c564a1c9`      | yes               |
| 4987152393     | 2026-08-20     | COMMENTED         | `cc200f17`      | yes               |
| 4992989990     | 2026-08-21     | COMMENTED         | `03298995`      | yes               |
| **5328118447** | **2026-09-26** | **COMMENTED**     | **`eacc4256`**  | **yes — nearest** |

**Determination: review owed = YES.**

- No review object exists at `6be7496cc`.
- No formal `APPROVED` or `CHANGES_REQUESTED` review exists anywhere after 2026-08-20. Review 5328118447 _says_ "APPROVED as a comment review" **in its body text** but was submitted with state `COMMENTED` — so it satisfies **zero** GitHub approval requirements and is explicitly "not a merge authorisation". Anyone reading the PR's review panel sees no approval.
- The nearest review is 6 commits / 10 files behind the current tip.

Merged/closed PRs #1280 and #1283 do **not** substitute: see (e).

---

## (c) Own-delta manifest

Full per-file table (387 rows, grouped, with the last-touching commit subject as the note) is in **`MANIFEST.md`** next to this file. Generated from `git diff --numstat` + `--name-status` over the range below, cross-checked against the PR API.

**Range:** `c8c06fd74dd3d259dfc43bf79f7da2c3590eb664..6be7496cc2089db2e2da04bb083312ae6d43a79d`

**Verification:** `git diff --shortstat` over that range = `387 files changed, 79922 insertions(+), 1579 deletions(-)` — an **exact match** to the PR API's `changed_files`/`additions`/`deletions`. The range in (e) is therefore provably the PR's own delta.

### Shape of the delta

| Group                                                         | Files   | +/-                  |
| ------------------------------------------------------------- | ------- | -------------------- |
| Production code (auction modules, routes, components, server) | 217     | +39,191 / −1,390     |
| Unit / integration tests                                      | 97      | +25,585 / −56        |
| Playwright e2e (specs, fixtures, harness)                     | 21      | +4,297 / −27         |
| Docs / ADRs / specs                                           | 26      | +8,549 / −5          |
| ContextVM service                                             | 2       | +521 / −17           |
| GitHub workflows                                              | 7       | +226 / −30           |
| Repo scripts + baselines                                      | 7       | +1,206 / −2          |
| Deployment assets (`deploy-simple/`)                          | 4       | +79 / −6             |
| Package config                                                | 1       | +8 / −4              |
| **Generated / lockfile — skippable**                          | **5**   | **+260 / −42**       |
| **Total**                                                     | **387** | **+79,922 / −1,579** |

Group totals were re-derived from the generated table and sum exactly to the API totals (387 rows, +79,922, −1,579).

### Largest files per group (review effort concentrates here)

Production code:

```
+2313   -0   A  src/publish/auctions.tsx                                    bid lock / settlement / refund flow (source of most prior findings)
+2127  -79   M  src/lib/stores/nip60.ts                                     wallet + pending-token persistence
+2023   -0   A  src/components/sheet-contents/auctions/AuctionFormContent.tsx  auction creation form
+1437   -0   A  src/queries/auctions.tsx                                    auction query layer
+1245   -0   A  src/routes/_dashboard-layout/dashboard/products/auctions.$auctionId.tsx  seller dashboard detail
+1233   -0   A  src/lib/auction/validation.ts                               pure validation pipeline
```

Tests / e2e / docs:

```
+1540  A  src/lib/__tests__/settlementDescriptor.test.ts
+1462  A  src/lib/__tests__/computeValidatedBids.test.ts
+1152  A  e2e/tests/auction-bidding-mints.spec.ts
+1038  A  e2e/tests/auction-settlement.spec.ts
+2671  A  AUCTIONS.md                                                       protocol spec
 +848  A  docs/protocol/fixtures/auction-multiparty-v1-invalid.json
 +703  A  docs/protocol/fixtures/auction-multiparty-v1-valid.json
 +483  A  docs/protocol/auction-multiparty-v1.md
```

The whole ordering by size inside each group is in `MANIFEST.md`.

### ⚠️ Files to skip or only skim (generated / vendored / dependency)

| File                                     | +/-      | Why                                                                                                                                   |
| ---------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `bun.lock`                               | +108 −41 | Lockfile. Skim only to confirm a dependency bump is intentional; never review line-by-line.                                           |
| `src/routeTree.gen.ts`                   | +115 −0  | **Generated** by TanStack Router from the route files. Review the routes, not this.                                                   |
| `e2e/fixtures/tiny-video.mp4`            | binary   | Binary fixture. No review value.                                                                                                      |
| `scripts/instance-literals-baseline.txt` | +27 −0   | Generated baseline for the instance-literal guard. Skim: it is _input_ to a CI guard, so a wrong entry silently widens the allowlist. |
| `scripts/ndk-baseline.txt`               | +1 −1    | Generated NDK-footprint baseline. One line moved — worth 5 seconds because the footprint guard is a release gate.                     |
| `ctxcn.config.json.bak`                  | +9 −0    | **A stray `.bak` file committed to the repo.** Not generated — looks accidental. Cheap, concrete finding.                             |

**No i18n/locale/translation files exist in this delta** (grepped over the manifest) — that example in the brief does not apply to this PR.

---

## (d) Existing comments needing in-thread replies

**Inline review comments: 0.** Verified two independent ways:

- `gh api …/pulls/1138/comments` → `[]`
- GraphQL `reviewThreads` → `totalCount: 0`, `nodes: []`

So there are **no inline threads a new review must answer in-thread**. All review history on this PR lives in the top-level timeline: 4 review bodies + 5 issue comments.

### Issue comments (all by `felixfelix-bot`)

| id             | Date           | What it was                                                                                                                                                    | Reply owed?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5500014039     | 2026-09-01     | ADR-0009 rev-2 delta review @ `8bf1a35`, 3 docs NITs, "Previous 13 findings still stand"                                                                       | No. Docs-only, superseded by 5546431063.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 5501698822     | 2026-09-01     | CI triage: `e2e-grep` failure infra-transient (proxy.golang.org 500), not PR code                                                                              | No. Resolved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 5546431063     | 2026-09-04     | Re-review `0329899..8bf1a35`, SHIP-WITH-NITS, docs-only                                                                                                        | No.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **5718194723** | **2026-09-17** | **Suggested carrier body for @Franchovy**, with a 4-item "Before merging" checklist and a request to un-draft once children land                               | ⚠️ **Closest thing to an open ask.** Unticked checklist: (1) all critical-path children merged, (2) `auctions` merged with master, (3) full-suite green at the tagged head + `e2e-full` artifact attached, (4) confirm `promote-production.yml` has no test gate. Items (1)/(2) are now stale (head moved 312 commits, still `dirty` vs master); item (3) is still **unmet** — `e2e-full` is `skipped` at the current head. A new review should restate this checklist against `6be7496cc`, not open a new thread. |
| 5718729369     | 2026-09-17     | Long-form note: "Bar A" (no NDK import in auction code, CI-enforced) is the release gate; "Bar B" (no NDK at runtime) is the Wave-D capstone, tracked in #1028 | No. Framing still correct.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Prior findings still formally open (never answered)

None of these were disputed or answered by the author — they sit in review bodies, not threads:

- **Review 4987152393** — BLOCK: validator restart flips verdicts to `bid_invalid`; BLOCK: locked funds unrecoverable if the kind-1023 publish fails; + 3 RISK + 4 NIT. The 2026-08-21 review acknowledges restart-safety work landed but does **not** confirm the two BLOCKs closed.
- **Review 4992989990** — BLOCK: fail-open quorum gate at `src/publish/auctions.tsx:764-767`; + 2 RISK. **Never confirmed fixed.**
- **Review 5328118447** — 2 RISK raised at `eacc4256`, both still live at the current head: server-side verdicts skip the DLEQ collateral check (`src/server/auction-validator/*` untouched by the last 6 commits), and the relay tag-index budget is asserted in comments rather than enforced on `a`-tag publish (`src/lib/nip53.ts` not in the unreviewed delta).

A new review should verify these or explicitly restate them — not post a findings-free "no new issues" comment, which would silently imply the backlog is closed.

---

## (e) Stack boundary used — **the premise in the brief is inverted**

**Explicit boundary for the PR's own delta:**

```
fork point = c8c06fd74dd3d259dfc43bf79f7da2c3590eb664
             = git merge-base origin/master 6be7496cc
             = PR #1138 base.sha (API-confirmed, exact match)
head       = 6be7496cc2089db2e2da04bb083312ae6d43a79d
```

`origin/master` is currently `d4757b409b58e0ecf7c43e53629dd464c32dfb4e` (2026-10-17). It is **not** an ancestor of the head, and the head is not an ancestor of it. 784 commits are unique to the head, 133 unique to master; `mergeable_state=dirty`.

### #1280 and #1283 are _below_ #1138, not above it

| PR    | State                  | base ref       | base.sha   | Head contained in #1138's head?                     |
| ----- | ---------------------- | -------------- | ---------- | --------------------------------------------------- |
| #1280 | **merged** (closed)    | **`auctions`** | `d0542215` | **YES** — `2386aed3` is an ancestor of `6be7496cc`  |
| #1283 | closed, **not merged** | **`auctions`** | `9d3133de` | **NO** — `da66306b` is not contained in `6be7496cc` |

Consequences:

1. **#1138 is the base of the stack, not a stacked child.** `base.ref` is `master` and the head repo is `PlebeianApp/market` itself — it is the release carrier `auctions → master`. There is no parent PR whose files could leak into the diff view; the 387 files are #1138's own content.
2. **The "parent's files leak into a stacked PR's diff" concern does not apply, but the inverse risk does:** our PRs target `auctions`, so their content is _already inside_ #1138's delta. Reviewing all 387 files will re-review our own merged #1280 / ADR-0011 DLEQ work unless that surface is deliberately excluded or cited as already-reviewed.
3. **#1283 was closed without being merged** into this head. If any of its content is expected in the release, it is **not** present at `6be7496cc` — worth confirming with the maintainer before treating #1138 as release-complete.
4. `auctions` has not been merged with master since the last review; the head is 133 commits behind and conflicting. Carrier checklist item (2) is stale.

---

## (f) The never-posted draft review (`4828c54..50199dc`) — verdict: **superseded, do not post**

**Provenance.** No draft artifact survives on disk. `~/reports/reviews/plebeian-pr-reviews-t_ae6a1207-kimi.md` records it directly:

> "a draft review for delta `4828c54..50199dc` was cold-audited twice (glm cards `t_0156cc5f`, `t_df271b10`, both `done` but with EMPTY result fields — the run died in the 09-25/26 card churn). That draft was never published … and its scope is superseded: review 5328118447 covered those same commits as part of `8bf1a35..eacc4256`. Nothing from the dead draft is resurrected here."

Confirmed the two Gate-2.5 cards left no recoverable output (no matching files under `~/.hermes` or `~/reports`). The draft **body is unrecoverable** — only its scope (`4828c54..50199dc`, 4 files, +204/−11) is known.

**Topology — the "superseded" claim checks out:**

```
8bf1a35 (review floor, 2026-09-01) ⊂ 4828c54 (09-09) ⊂ 50199dc (09-10) ⊂ eacc4256 (09-25, last posted review) ⊂ 6be7496cc (head)
```

All four relations verified with `git merge-base --is-ancestor`. The draft range sits entirely inside the published review window `8bf1a35..eacc4256` (398 commits).

**Staleness per file at the current head:**

| Draft file                                       | Draft +/- | Still present at head                                    | Commits since `50199dc` |
| ------------------------------------------------ | --------- | -------------------------------------------------------- | ----------------------- |
| `src/lib/__tests__/fetchMintKeysets.test.ts`     | new, +106 | 91/91 added lines verbatim; blob `f6a2024` **unchanged** | **0**                   |
| `src/lib/auction/validation.ts`                  | +79 / −?  | 67/67 added lines present; blob differs                  | **9**                   |
| `src/lib/auction/settlementDescriptor.ts`        | +13       | 12/12 added lines present; blob differs                  | **4**                   |
| `src/lib/__tests__/settlementDescriptor.test.ts` | +17       | 14/15 added lines present; blob differs                  | **6**                   |

**What is salvageable:**

- ✅ **Only** `src/lib/__tests__/fetchMintKeysets.test.ts` — byte-identical to the draft's target and untouched by all 312 subsequent commits. If the draft had a finding there, it still applies verbatim.
- ⚠️ **Partially**: `settlementDescriptor.ts` / `validation.ts`. The draft's subject matter (DLEQ keyset resolution, structural validation) has since been reworked by ADR-0011 / #1280 (`dleq_required` retirement, keyset threading, canonical `mintSupportsDleq`, sum-check). Any finding must be re-derived against current code; the contract it was written against no longer exists.
- ❌ **Nothing else** — the draft body is gone, so there is no text to reuse.

**Recommendation:** do not resurrect, do not post as-is, and do not cite it as pending coverage. Treat `eacc4256..6be7496cc` (10 files) as the true open review surface, with the older findings tracked separately.

---

## (g) Merge / CI state at the head

`mergeable=false`, `mergeable_state=dirty`, `draft=true`, 133 commits behind master.

Check-runs at `6be7496cc` (8 total):

```
success   Build
success   prettier
success   e2e-grep
success   instance-literals
success   footprint
success   auctions-surface
success   Deploy to AuctionsDev
skipped   e2e-full          ← no full-suite evidence at this head
```

`e2e-full` is skipped again. Per the 2026-09-17 carrier checklist, `e2e-full` dispatched with the artifact attached is a **pre-merge requirement that remains unmet**. `promote-production.yml` also has no test gate — confirm master's push CI is green at the exact SHA before promoting.

---

## Bottom line for the next reviewer

1. Review target is **`6be7496cc2089db2e2da04bb083312ae6d43a79d`** — the scheduling SHA `50199dc` is 312 commits stale.
2. A review is **owed**: nothing exists at this tip, and the only "approval" is prose inside a `COMMENTED` review.
3. The PR's own delta is `c8c06fd7..6be7496cc`, 387 files / +79,922 / −1,579 — verified against the API to the byte.
4. #1138 is the **base** of the stack. Don't expect a parent's files to leak in; instead expect our merged #1280 work to be _inside_ this delta.
5. Skip 5 generated/lockfile files; `ctxcn.config.json.bak` is an accidental commit worth flagging.
6. **Zero inline threads** — nothing needs an in-thread reply. The open asks are the 2026-09-17 carrier checklist (2 items stale, 1 unmet) and 4 unconfirmed prior findings (2 BLOCK, 2 RISK).
7. The never-posted draft is unrecoverable and superseded; only one of its four files is byte-identical at head.

### Remaining steps (not done here, by design)

Nothing was posted. To act on this preflight:

1. Decide the review scope: full 387-file PR, or the 10-file `eacc4256..6be7496cc` delta (the only genuinely unreviewed text).
2. If full-PR: partition the 217 production files by subsystem, and explicitly carve out the #1280/ADR-0011 surface as already-reviewed to avoid re-litigating it.
3. Verify or restate the 2 BLOCKs (4987152393 #1–2, 4992989990 #1) and 2 RISKs (5328118447) at `6be7496cc`.
4. Run the Gate-2.5 cold audit on the drafted text **before** posting.
5. Only then post — as a `COMMENTED` delta review at `6be7496cc`, restating the carrier checklist rather than opening a new thread.
