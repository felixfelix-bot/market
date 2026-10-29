# PR #1226 review tree — RETIRED

**Decision: (A) Retire the tree.**
Operator-action card: `t_68bf065d` (board `plebeian-pr-reviews`)
Worker: fleet offload (worker-heavy) · Date: 2026-10-29 · Repo: PlebeianApp/market
GitHub writes performed by this task: **ZERO**.

Superseded in part by a narrower decision: the tree is retired *because the work it
was queued to produce already exists*. Section 3 is the load-bearing part of this
document; sections 1–2 are the supporting audit.

---

## 1. Why (A) and not (B) or (C)

The card framed the choice as "retire, or run for the record and post a verdict".
That framing assumed the review work was still outstanding and that posting it
would be the only way to put the findings on record. **Both assumptions are false
as of 2026-10-29.** Verifiable state:

| claim in the card | live state | evidence |
|---|---|---|
| `t_719e6be2` DONE, deliverable `attachments/t_719e6be2/pr1226-reviewer-brief.md` (29,395 B) | **No such file. No attachments on that card at all. Zero rows in `task_attachments` for `t_719e6be2`, and no file matching `*1226*brief*` anywhere under `/home/c03rad0r`.** The card is `blocked`, its last writeback says `fleet-done rc=0 verified=False`. | `raw/t_719e6be2_attachments.txt`, `raw/brief_search.txt` |
| `t_219a189a` is `todo` and posting is a *future* decision | `t_219a189a` is `blocked`; **the consolidated verdict was already posted to GitHub on 2026-10-24** as review `5635730808` (`CHANGES_REQUESTED`) at head `247f9a25` | `raw_pr1226_reviews.json` |
| posting a verdict on a closed draft PR is the open maintainer-trust cost | **Already paid, three times, before this card ran.** Reviews `5591466473`/`5591468909` (2026-10-20, `COMMENTED`) and `5635730808` (2026-10-24, `CHANGES_REQUESTED`) are live on #1226. A provenance comment `6484324481` (2026-10-29T00:22:48Z) already explains that the review leg was re-posted on the successor **#1361** as review `5691384997`. | `raw_pr1226_reviews.json`, `raw_pr1226_comments.json` |

So option (B) — "run for the record, accept the posting cost" — would have burned
dispatches to re-derive findings that are already on the public record, and its
one distinguishing risk (a fresh public post on a closed PR) is moot: it happened
days ago. Option (C) leaves ~16 dead cards in `ready`/`todo`, one of which
(`t_70ba64ac`) was already the subject of a false-done audit, and all of which keep
generating `ready for N hundred hours with no worker` criticals that compete with
live PR reviews for dispatcher slots.

**Retiring is the only option that both preserves the findings and stops the bleed.**

## 2. What "the findings survive" actually means

The card asserted findings were "preserved in the brief attachment regardless".
There is no brief attachment, so that safety net did not exist. The findings do
survive, but through four other channels — all verified:

1. **On GitHub, publicly, on #1226**: review `5635730808` (2026-10-24) carries the
   merged correctness + security verdict with the B1/B2/B3 block list.
2. **On GitHub, on the live successor #1361**: review `5691384997`
   (2026-10-29T00:22:26Z, `CHANGES_REQUESTED`, commit `d1a4a647`) — the #1226 review
   leg re-verified at the successor head. This is the review that still matters,
   because #1361 is **OPEN** and not a draft.
3. **In-repo**: `artifacts/pr1226_review/verdict_1361.md` (7,360 B, tracked) holds
   the full delta verdict including the surviving B2 blocker.
4. **On disk**: `~/reports/reviews/plebeian-pr-reviews-t_bb035076-post-1226-aborted.md`
   and `…-t_8452b87b-verify-1226-consolidated.md` document the two prior aborted
   post legs, so the "nothing was posted by those cards" history is not lost.

Archiving a card does **not** delete comments, results, or run history — it flips
`status` to `archived` and clears claim fields (`kanban_db.archive_task`,
`hermes_cli/kanban_db.py:7352`). Nothing was purged; `--rm` was never used.

## 3. Correction to the card's own premises

Recorded because the next operator will read the card body as fact:

- The claimed 29,395 B brief **never existed** on this host. The tree's context
  leg (`t_719e6be2`) is `blocked` with `verified=False`, not DONE.
- The tree is **19 cards**, not 5. The card named 5. The other 14, all
  `#1226`-titled and all non-archived, were: `t_0fb86800`, `t_173c0c00`,
  `t_39a83ab3`, `t_4d410c55`, `t_8452b87b`, `t_a32200ac`, `t_bb035076`,
  `t_bc593435`, `t_fe2daa8b`, `t_508d64b1`, `t_70ba64ac`, plus two already-`done`
  cards (`t_62f36501`, `t_d18bf9c5`) that needed no action.
- `reviewDecision=APPROVED` in the card is **literally true but misleading**. Live
  GitHub reports `APPROVED` because `felixfelix-bot` is `author_association:
  CONTRIBUTOR`, and GitHub does not count a contributor's `CHANGES_REQUESTED`
  toward `reviewDecision`. The most recent review at head is in fact
  `CHANGES_REQUESTED` (`5635730808`). The card's `APPROVED` reading should not be
  cited as evidence the PR was review-clean.
- `mergeStateStatus=CLEAN` on a closed draft is meaningless; it does not indicate
  the PR was mergeable.

## 4. What was done

Archived **16** cards on `plebeian-pr-reviews` (pre-state snapshot committed at
`raw/pre_state_1226_cards.json`):

```
t_0fb86800 t_173c0c00 t_219a189a t_2aefcf2f t_39a83ab3 t_4d410c55 t_508d64b1
t_54658dfb t_54b4f69d t_70ba64ac t_719e6be2 t_8452b87b t_a32200ac t_bb035076
t_bc593435 t_fe2daa8b
```

Left untouched deliberately:

- `t_62f36501`, `t_d18bf9c5` — already `done`, correct terminal state.
- `t_68bf065d` — **this decision card**, completed separately with a pointer here.
- **PR #1226 cards on other boards**: `market t_c9b109fb` (`ready`, "Fix PR#1226
  auction order-details v2"). This is the *fix* leg, not a review leg, it lives on
  a different board (so out of this decision's stated scope), and #1226's content
  continues under #1361. Flagged for a separate operator call rather than silently
  archived.
- All #1361 cards — unaffected.

Post-archive board state verified: `archived 311, done 132, blocked 69, ready 48,
todo 19, triage 5`. The archive promoted **zero** new cards into `ready` — checked
explicitly because archived parents unblock children (`recompute_ready` runs at the
end of `archive_task`).

## 5. Reversal

Archive is a reversible status flip; no data was destroyed. To reopen:

```
hermes kanban --board plebeian-pr-reviews unblock --reason "<why>" <id>   # if blocked
hermes kanban --board plebeian-pr-reviews promote <id> "<why>"           # -> ready
```

Caveat: `promote` refuses `archived` status directly, so a raw status reset is the
reliable path if the CLI refuses:

```sql
UPDATE tasks SET status='blocked' WHERE id='<id>';   -- then promote/unblock
```

Do not run `hermes kanban archive --rm` on these ids — that is the only
destructive operation and it would drop comments and run history.

## 6. Residual items for the operator

1. `market t_c9b109fb` (fix leg for #1226) is still `ready` on the `market` board
   and now points at a superseded PR. Decision needed: retarget to #1361 or retire.
2. `t_54658dfb` and `t_2aefcf2f` were both `ready` with `now` urgency and stale
   `UNBLOCK: price window open` comments written by `urgency_gate.tick`, **not** by
   an operator. Those automated unblocks are what kept re-arming dead review cards;
   worth a look at the gate for closed-PR targets generally.
3. Two `#1226` cards (`t_54b4f69d`, `t_719e6be2`) carry
   `Agent crash x2 … protocol violation` diagnostics from 2026-09-27. They are
   archived now, but the crash pattern (worker exits rc=0 without calling
   `kanban_complete`/`kanban_block`) is a worker-harness issue, not a #1226 issue.
