# PR #1284 — publish approved review + contribution-PR dedup

**Task:** t_84b7c185 (board `plebeian-pr-reviews`)
**Worker run:** 2026-10-29, worker-heavy, workspace `/home/c03rad0r/repos/market`
**PR:** https://github.com/PlebeianApp/market/pull/1284 — "feat(config): add self-hosting instance configuration foundation", author `hkarani` (is_own: false)

## VERDICT: DO NOT PUBLISH — the work was already completed on 2026-09-12

No comment was posted by this run, and none should be. Every deliverable in the
task is already present on the PR, six weeks before this card was dispatched.

The card is a **stale duplicate**. Its inputs describe a world that no longer
exists: it asks for a review at head `5963fc77` of an open PR. That PR **merged
on 2026-09-25T12:32:41Z**, its tip is `22a1cebd`, and the review at `5963fc77`
was published on **2026-09-12**. Posting now would be a duplicate comment on a
merged PR — pure noise on a third party's work.

---

## 1. Gate check (the precondition in the task) — NOT APPROVED, never ran

The task says "Only proceed if the GATE 2.5 verdict was APPROVED."

The GATE 2.5 card for exactly this head is `t_cdda8b3f` ("Cold review of PR #1284
draft review (GATE 2.5, glm-5.3)"). Its state:

```
status: blocked
Runs (1): #103 scheduled @worker-reviewer-glm 0s 2026-09-25 02:32
   → urgency-unclassified: classify with hermes-urgency set ...
[2026-09-25 02:30] gate-tick: BLOCKED — missing gate(s): tests_green,
  pushed_or_consolidated, ci_evidence, cold_cross_family_review,
  review_artifact, consolidated, review_benchmark_floor, secrets_clean.
[2026-10-08 06:37] gate-tick: BLOCKED (completion-pending) — ... no_live_drift
```

The reviewer never executed (0s, killed on the urgency-classification gate, then
re-blocked by gate-tick). **There is no APPROVED verdict** — nor a REJECTED one.
The gate is unsatisfiable by construction: it demands `ci_evidence` and
`cold_cross_family_review` from a card whose whole purpose is to *produce* the
cold review.

I did not "re-dispatch cross-family review exactly once" against this draft,
because that path is for REJECTED verdicts and the draft is six weeks obsolete
(it audits an 18,602-line rollup that no longer resembles the PR). Re-running the
gate on dead inputs would burn a reviewer lane to produce a verdict nobody can act
on. See §5 for the correct disposition.

Two sibling cards are in the same state and share the same root cause:
- `t_15b38bcf` "Draft unposted review comment ... @ 5963fc77" — `ready` 770.8h, no worker
- `t_3ead2add` "Publish approved review comment ... if GATE 2.5 approved" — `ready` 770.8h, no worker
- `t_cdda8b3f` — `blocked`, gate unsatisfiable

## 2. The publish target is already satisfied — nothing to post

PR #1284 state, verified via `gh pr view 1284 --json state,headRefOid,mergedAt`:

```json
{"state":"MERGED","headRefOid":"22a1cebd647c6b59d929725f5d288a8c4326a4ce",
 "mergedAt":"2026-09-25T12:32:41Z","mergeCommit":"a3a76b6c...","reviewDecision":"APPROVED"}
```

The reviewed head `5963fc77` is a real commit in the repo
(`fix(tests): self-hosted regression coverage`, 2026-09-11, by hkarani) but it is
**not an ancestor** of the merged tip — it lives on the merged
`fork/fix/1284-selfhost-config-findings` branch, which landed *after* the review.

**The review at `5963fc77` was published on 2026-09-12** —
https://github.com/PlebeianApp/market/pull/1284#issuecomment-5645180703

```
Thanks @hkarani — solid precedence chain and good regression coverage.
Reviewed tip `5963fc77bd1c16b6b113f4d6f3c6ad42136725b1`. New findings:
1. [RISK] `src/lib/stores/ndk.ts:417` (and `:448`) — zap monitoring silently
   loses `ZAP_RELAYS`. ...
2. [RISK] `src/routes/_dashboard-layout/dashboard/app-settings/app-miscelleneous.tsx:138`
   — Handler ID is editable in the owner UI, but discovery reads only
   `process.env.INSTANCE_HANDLER_ID` at boot (`src/server/startup.ts:26`). ...
3. [NIT] `src/lib/instance-config.ts:101` — `optionalBoolean` compares the raw
   string ... Trim before comparing.
Happy to pair on fixes.
```

That is the task's deliverable, verbatim, published 47 days ago. It is not the
zero-findings body from the task's "zero new issues" clause — it contains two real
`[RISK]` findings.

## 3. Contribution-PR dedup — DUPLICATE EXISTS (all three checks)

Eligibility on the merits: `is_own=false` ✅ and the published review carries
**two real `[RISK]` findings** ✅ — so on the naive reading this would be
"eligible". It is not, because the follow-up already happened and already
merged. Evidence for each required check:

### (a) Kanban grep — card exists
`hermes kanban --board <b> ls | grep "1284"` across all three boards:

| board | hits | relevant |
|---|---|---|
| `plebeian` | 0 | — |
| `plebeian-my-prs` | 1 | `t_587ecb9f` blocked — "Review PR #1313: fix(#1284) union zap relays..." |
| `plebeian-pr-reviews` | 11 | `t_15b38bcf`, `t_3ead2add`, `t_75341e70` (ready); `t_84b7c185`, `t_cdda8b3f`, `t_cb288450` (blocked); 5 done |

The contribution-PR work is already tracked as `t_587ecb9f` on
`plebeian-my-prs`. Note `grep -c` counts substring hits, so this number is not a
clean "coverage count" — the individual cards are listed above.

### (b) Fork-branch probe — NEGATIVE, but the historical probe was too narrow
```
gh pr list --repo hkarani/market --head "felixfelix-bot/contrib-1284-*" --state all
→ (empty)
```
This returns nothing, and taken alone it would wrongly suggest no contribution PR
ever existed. **The glob is wrong for this repo's convention.** The actual
contribution PR was opened in PlebeianApp/market, and its branch was
`fix/1284-selfhost-config-findings` — not `felixfelix-bot/contrib-1284-*`.

The prior-contribution-URL grep succeeds:
- #1284 comment 5653548949 (2026-09-13): *"Contribution PR opened against this
  branch: **#1313** — `fix/1284-selfhost-config-findings`."*
- #1313 → https://github.com/PlebeianApp/market/pull/1313, `isCrossRepository: true`,
  head owner `felixfelix-bot`, **MERGED 2026-09-14T06:14:51Z**, title
  *"fix(#1284): union zap relays, derive the handler-id chain, trim booleans
  (review findings 1-3)"* — implementing exactly review findings 1-3.

### (c) Head-vs-fix comparison — fix already in the merged tree
`gh pr view 1284 --json headRefOid` → `22a1cebd`. The reviewed head is
`5963fc77`; they differ, so a naive check would say "proceed".

But check (c)'s *intent* is "does the current head already contain our fix". Probe:

```
git merge-base --is-ancestor 67a76087 22a1cebd   → YES  (fix present in merged tip)
git merge-base --is-ancestor 67a76087 5963fc77   → NO   (fix landed after the review)
67a76087 = "fix(self-hosting): union zap relays, derive the handler-id chain,
            trim booleans"  2026-09-23, the #1313 content
```

Our fix is an ancestor of the merged tip. Findings 1–3 from the `5963fc77`
review were resolved in-tree before merge.

**Dedup verdict: DUPLICATE EXISTS.** No new contribution PR is warranted.

## 4. Downstream state is already closed out

The #1284 history published its own post-merge bookkeeping (comment 5835344809,
2026-09-25T15:54:31Z): the *later* round-3 findings at `22a1cebd` were filed as
tracked issues #1392, #1393, #1394, with the two load-induced test flakes as
#1395. The maintainer block that remains is explicitly marked as staying with
maintainers (ADR-018 boundary decisions). Nothing in this task's scope is open.

## 5. Recommended disposition of the three stale cards

Do **not** re-dispatch. All three (`t_15b38bcf`, `t_3ead2add`, `t_cdda8b3f`)
target head `5963fc77` of a PR that merged 2026-09-25 with the review and the
contrib PR both already landed; `t_84b7c185` is the same stale fan-out. They
should be closed as superseded, not worked. If the fleet wants review coverage of
`22a1cebd` (the merged tip), that is a new card against the *post*-merge round-3
findings — which the 2026-09-25 comment already converted into issues #1392–#1395.

The root cause is worth fixing separately: `auto-decomposer` fanned out a
draft → gate → publish chain at 2026-09-13 23:56 pinned to a head that had already
moved, and the cards sat unrun for 770h while the PR merged underneath them.
Fleet hygiene issue: cards carrying a hard-coded head SHA need a preflight that
re-checks PR state before dispatch.

## 6. Actions taken by this run

| action | result |
|---|---|
| `gh pr comment 1284` | **NOT RUN** — deliverable already published at 5963fc77 |
| Formal approve / request-changes / merge | **NOT RUN** — forbidden by task, and PR is already merged |
| Read-only verification | `gh pr view`, `gh pr list`, `gh api .../commits`, `git merge-base`, `hermes kanban show/ls` |
| Files written | `artifacts/pr1284_publish/REPORT.md`, `PROGRESS.md` |

## 7. Verification transcript (commands actually run)

```
gh pr view 1284 --json state,headRefOid,mergedAt,mergeCommit → MERGED / 22a1cebd / a3a76b6c
gh pr list --repo hkarani/market --head "felixfelix-bot/contrib-1284-*" --state all → empty
gh pr view 1313 --json state,mergedAt → MERGED 2026-09-14T06:14:51Z
git merge-base --is-ancestor 67a76087 22a1cebd → YES
hermes kanban --board plebeian-pr-reviews show t_cdda8b3f → blocked, run #103 0s, no verdict
```
