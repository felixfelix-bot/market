# REPORT — PR #1226 review tree retirement (operator action, card t_68bf065d)

Worker: fleet offload (worker-heavy) · Date: 2026-10-29 · Repo: PlebeianApp/market
Board: `plebeian-pr-reviews` · Card under decision: **t_68bf065d**
**GitHub writes performed by this task: ZERO.** All GitHub access was read-only `gh api` GET.
**Board mutations: 16 cards archived** (reversible status flip; nothing purged).

---

## 0. Bottom line

**Decision: (A) Retire the tree.** Executed.

I did not take the card's framing at face value, and it did not survive contact with
the evidence. The card presented a genuine trade-off: retire the stale review tree,
or spend two review dispatches plus a public post to put the findings on record.
That trade-off **no longer exists**, because the review was already published — three
weeks before this card was promoted, and again three days before this run. Retiring
therefore carries none of the "findings are lost" cost the card attributed to it,
which was option (A)'s only real downside.

Two premises in the card are also simply wrong, and they change what the safe move is:

1. The deliverable it cites as completed (`pr1226-reviewer-brief.md`, 29,395 B) **does
   not exist**. Option (A) was described as safe *because* findings were preserved in
   that attachment. That safety net was illusory; I had to verify retention through
   other channels before retiring anything.
2. The tree is **19 cards, not 5**. Archiving the 5 named cards would have left 11
   live #1226 cards to keep re-arming the dispatcher — the exact bleed the card
   wanted to stop.

## 1. Live state (re-verified 2026-10-29, not inherited)

`gh api repos/PlebeianApp/market/pulls/1226` → `artifacts/pr1226_retire/raw/raw_pr1226_meta.json`

| field | value |
|---|---|
| state | `closed` |
| merged / merged_at | `false` / `null` — **never merged** |
| closed_at | `2026-09-19T20:43:54Z` by `Franchovy` ("Superceded by #1361") |
| draft | `true` |
| head | `247f9a25156832b66559d30648789d80efb9da00` (`feat/auction-order-details-v2` → base `auctions`) |
| reviewDecision | `APPROVED` — see caveat below |
| reviewRequests | `[]` |

All four fields the card asserted match live. Two card readings are nonetheless
**misleading and should not be reused as evidence**:

- **`reviewDecision=APPROVED`** is literally true but inverts the real picture.
  `felixfelix-bot` has `author_association: CONTRIBUTOR`, and GitHub does not count a
  contributor's `CHANGES_REQUESTED` toward `reviewDecision`. The newest review at head
  is `5635730808` = **CHANGES_REQUESTED**. Reading `APPROVED` as "review-clean" is wrong.
- **`mergeStateStatus=CLEAN`** on a closed draft means nothing about mergeability.

Also note `reviewRequests=[]` on a **closed** PR — the card's claim that the review
request was "still technically outstanding" does not reproduce. GitHub clears
requested reviewers on close; the timeline (`raw_pr1226_comments.json` context) shows
the request from `Franchovy` at `2026-09-10T17:33:50Z` and no removal event, so the
original observation was right when made and is stale now.

## 2. The decisive finding: the public action already happened

The card treated `t_219a189a` ("reconcile + POST consolidated verdict") as the one
card that would take the maintainer-trust cost, and made avoiding-or-accepting that
cost the crux of (A) vs (B). `gh api .../pulls/1226/reviews` shows that cost was paid
before this card was ever promoted:

| review id | state | author | submitted | commit |
|---|---|---|---|---|
| 5591466473 | COMMENTED | felixfelix-bot | 2026-10-20T20:42:50Z | 247f9a25 |
| 5591468909 | COMMENTED | felixfelix-bot | 2026-10-20T20:43:00Z | 247f9a25 |
| **5635730808** | **CHANGES_REQUESTED** | felixfelix-bot | **2026-10-24T00:09:49Z** | 247f9a25 |

`5635730808` opens "Consolidated verdict for head `247f9a25` … This merges the
correctness/behavioural review and the security/data-integrity review of this PR into
one list" — i.e. `t_219a189a`'s deliverable was produced and published by other work.
The two duplicates on 2026-10-20 are a separate (minor) hygiene problem: the same body
was posted twice, 10 seconds apart.

A provenance comment `6484324481` (2026-10-29T00:22:48Z) then records that the #1226
review leg was re-posted on the **live successor #1361** as review `5691384997`.
Verified: `5691384997`, `CHANGES_REQUESTED`, `2026-10-29T00:22:26Z`, commit
`d1a4a647`, body identical to the in-repo `artifacts/pr1226_review/verdict_1361.md`.

**Consequence:** option (B) — "run for the record, accept that a verdict is or isn't
posted" — would have spent two review dispatches re-deriving a verdict that is already
public, twice, on two PRs. Its stated cost is sunk. Its only remaining product is
duplicate noise.

## 3. Retention check (done before retiring, because the claimed safety net was absent)

The card justified (A) with "the correctness/security findings are preserved in the
brief attachment regardless." That attachment does not exist:

- `task_attachments` has **0 rows** for `t_719e6be2`. Board-wide the table holds 2 rows;
  neither filename matches `%1226%` or `%brief%`. → `raw/t_719e6be2_attachments.txt`
- No file named `*1226*brief*` / `pr1226-reviewer-brief.md` in the board's
  `attachments/`, its `workspaces/`, the repo (`attachments/` is absent entirely), or
  any of the 22,206 directories under `~/worktrees` (0 filenames contain `1226`).
  → `raw/brief_search.txt`
- `t_719e6be2`'s own writeback says `fleet-done rc=0 verified=False`, and its status is
  `blocked` — the card's "DONE … gate verdict=pass (tier=recon)" is not supported.

So I established retention independently. Findings survive through four channels:

1. **#1226, public** — review `5635730808` (B1/B2/B3 block list).
2. **#1361, public and live** — review `5691384997` (`CHANGES_REQUESTED`, `d1a4a647`).
   This is the copy that still matters: #1361 is `open`, not draft, and is the standing
   successor to #1226.
3. **In-repo, tracked** — `artifacts/pr1226_review/verdict_1361.md` (7,360 B), the full
   delta verdict including the surviving B2 blocker.
4. **On disk** — `~/reports/reviews/plebeian-pr-reviews-t_bb035076-post-1226-aborted.md`
   and `…-t_8452b87b-verify-1226-consolidated.md`, which record the two prior aborted
   post legs (both correctly refused to post on a closed target).

Nothing depended on the missing brief. Retirement is safe *on the evidence*, though
not for the reason the card gave.

## 4. Executed change

Archived **16** cards on `plebeian-pr-reviews`:

```
t_0fb86800  t_173c0c00  t_219a189a  t_2aefcf2f  t_39a83ab3  t_4d410c55  t_508d64b1
t_54658dfb  t_54b4f69d  t_70ba64ac  t_719e6be2  t_8452b87b  t_a32200ac  t_bb035076
t_bc593435  t_fe2daa8b
```

Pre-state snapshot (all 19 #1226 cards, with status/assignee/result):
`artifacts/pr1226_retire/pre_state_1226_cards.json`.

`hermes kanban archive` was confirmed non-destructive **before** use: it flips `status`
to `archived` and clears claim fields, keeping comments, results and run history
(`kanban_db.archive_task`, `hermes_cli/kanban_db.py:7352`). `archive --rm` is the only
purging path and was **not** used.

**Promotion check.** `archive_task` calls `recompute_ready` at the end, and archived
parents unblock children — so retiring a tree can silently re-arm dependents. Verified
post-archive: board went `archived 311, done 132, blocked 69, ready 48, todo 19,
triage 5`, and the 48 `ready` cards are all unrelated PR reviews that were already
`ready` (none are #1226). Zero cards were newly promoted.

Deliberately untouched:

- `t_62f36501`, `t_d18bf9c5` — already `done` with honest `NO-OP` results; correct
  terminal state, archiving them would only lose that record.
- `t_68bf065d` — this decision card, completed separately.
- `market t_c9b109fb` — **`ready`**, "Fix PR#1226 auction order-details v2". This is the
  *fix* leg, on a *different board*, so outside this card's stated scope. Flagged in
  §6 rather than archived unilaterally.
- All #1361 cards — unaffected.

## 5. Reversal

Archive is reversible and destroyed nothing:

```
hermes kanban --board plebeian-pr-reviews unblock --reason "<why>" <id>
hermes kanban --board plebeian-pr-reviews promote <id> "<why>"
```

`promote` only accepts `todo`/`blocked`, so for an archived card reset the status
first, then promote. Do **not** use `archive --rm` on these ids.

## 6. Residual items

1. **`market t_c9b109fb`** (fix leg) is `ready` and targets a superseded PR. Needs an
   operator call: retarget to #1361 or retire. Out of scope here only because it is a
   different board and a different leg.
2. **Automated unblocks re-armed dead cards.** `t_54658dfb` and `t_2aefcf2f` carried
   `UNBLOCK: price window open: urgency=now tier=expensive` — machine-written by
   `urgency_gate.tick` (`urgency_source='escalation'`), not an operator. The same
   pattern is documented in both aborted-leg reports. The gate has no closed-PR check;
   that is why this tree kept resurrecting. Worth fixing generally.
3. **Duplicate reviews on #1226.** `5591466473` and `5591468909` are the same body
   10 seconds apart. Cosmetic now (PR is closed) but indicates a retry bug.
4. **Worker-harness crash pattern.** `t_54b4f69d` / `t_719e6be2` / `t_219a189a` carry
   `Agent crash x2 … worker exited cleanly (rc=0) without calling kanban_complete or
   kanban_block`. Archived now, but that is a harness defect, not a #1226 one.
5. **This card's own body should not be reused as fact.** The 29,395 B attachment, the
   5-card tree size, and "`t_219a189a` is todo / posting is still pending" are all
   contradicted by live state (details in `DECISION.md` §3).

## 7. Honesty contract

- Commit `7a3ab206` created and observed.
- Push observed: `f429debb..7a3ab206` → `fork/review/pr1272-noop-20261029`; confirmed by
  `git ls-remote` returning `7a3ab2068268b6044b6d4168f159cd24e7f8ca35` == local `HEAD`.
- Zero GitHub writes: no review, comment, PR, branch or issue created/edited/closed/
  merged. No push to `origin` (PlebeianApp) or any contribution branch.
- Board mutation is exactly the 16 archives listed in §4, plus completing `t_68bf065d`.
  No card was purged.
- No test/build run: this task changed no application code. The only repo writes are
  documents under `artifacts/` and `PROGRESS.md`.
- **Erratum:** commit `7a3ab206`'s message transposes one character of the #1361 head
  SHA, printing `d1a4c647` where the correct value is `d1a4a647`. The SHA is correct
  everywhere in this report and in `DECISION.md`; the commit message was not amended
  because the commit was already pushed and rewriting published history was not
  authorised.

## 8. Files

```
artifacts/pr1226_retire/DECISION.md                     decision record + reversal
artifacts/pr1226_retire/pre_state_1226_cards.json       19 cards, pre-archive state
artifacts/pr1226_retire/raw/raw_pr1226_meta.json        live #1226 metadata
artifacts/pr1226_retire/raw/raw_pr1226_reviews.json     all 12 reviews, incl. 5635730808
artifacts/pr1226_retire/raw/raw_pr1226_comments.json    all 13 comments, incl. 6484324481
artifacts/pr1226_retire/raw/raw_pr1361_meta.json        successor #1361, open/non-draft
artifacts/pr1226_retire/raw/raw_pr1361_reviews.json     incl. 5691384997 CHANGES_REQUESTED
artifacts/pr1226_retire/raw/t_719e6be2_attachments.txt  proves 0 attachments
artifacts/pr1226_retire/raw/brief_search.txt            proves the brief never existed
artifacts/pr1286_citations/REPORT.md                    preserved prior root REPORT.md (sha256 37f8891e)
PROGRESS.md                                             appended this task's section
```
