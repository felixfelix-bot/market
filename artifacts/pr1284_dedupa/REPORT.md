# Dedup recon A — kanban grep for existing PR #1284 coverage

Worker: fleet offload (worker-heavy) · Date: 2026-10-29 · Repo: PlebeianApp/market
Card: t_75341e70 (board plebeian-pr-reviews) · Mode: READ-ONLY on kanban
Branch: fork/review/pr1272-noop-20261029

## Deliverable

The required `DEDUP A` comment **was posted** and verified:

```
$ hermes kanban --board plebeian-pr-reviews comment t_75341e70 "$(cat artifacts/pr1284_dedupa/dedup_a_comment.md)"
Comment added to t_75341e70
```

Verification from `hermes kanban --board plebeian-pr-reviews show t_75341e70`:

```
  [2026-10-29 05:21] commented {'author': 'worker-heavy', 'len': 9493}
```

9493 chars stored vs 9494 chars submitted (one trailing newline), so the body landed
verbatim — no `--max-len` trimming occurred. Comment text source of truth:
`artifacts/pr1284_dedupa/dedup_a_comment.md`.

No card was created, edited, transitioned, archived or closed. The only write to the
kanban DB is the one comment on the target card.

## Raw evidence files

- `artifacts/pr1284_dedupa/exact_grep.txt` — the three exact `grep "PR #1284"` runs
- `artifacts/pr1284_dedupa/loose_grep.txt` — the three `grep -i "1284"` runs
- `artifacts/pr1284_dedupa/archived_grep.txt` — the three `--archived` runs (extra sweep)
- `artifacts/pr1284_dedupa/dedup_a_comment.md` — exact comment body that was posted
- `artifacts/pr1284_dedupa/post_comment.py` — the posting script (subprocess, no shell quoting risk)

## Findings per board

| board | exact `PR #1284` | loose `1284` | loose + `--archived` |
|---|---|---|---|
| plebeian | no match (exit 1) | no match (exit 1) | no match (exit 1) |
| plebeian-my-prs | no match (exit 1) | 1 hit (t_587ecb9f) | 2 hits (adds t_58015366) |
| plebeian-pr-reviews | 11 hits | 11 hits (identical) | 14 hits |

Board line counts prove each board actually listed (empty grep ≠ failed command):
plebeian 113 lines / 124 with `--archived`; plebeian-my-prs 449 / 576;
plebeian-pr-reviews 291 / 586. No board name errored; none of the nine commands
emitted stderr.

### Why `--archived` was added

`hermes kanban ls` hides archived tasks by default, but a dedup question ("does a card
already cover this?") must include retired coverage. The extra sweep found three archived
PR #1284 cards (`t_8b491872`, `t_cf9c28a1`, `t_fee3df1d`) that the two prescribed command
sets could not see. This is additive evidence; all three prescribed commands were still
run exactly as specified and recorded verbatim.

### Matches in plebeian-my-prs are not PR #1284 coverage

Both hits are PR **#1313** review cards that merely contain `fix(#1284)` in the title:
`t_587ecb9f` (blocked), `t_58015366` (archived). Different PR, no overlap with the
#1284 review or its contribution-PR follow-up.

### plebeian-pr-reviews matches (full set)

ready: t_15b38bcf (draft unposted review @ 5963fc77), t_3ead2add (publish if GATE 2.5
approved), t_75341e70 (this dedup card).
blocked: t_cb288450 (Review PR #1284), t_cdda8b3f (cold review, GATE 2.5 glm-5.3).
done/closed: t_104af1e2, t_ae8ae890, t_ee16cd98, t_3b152f53, t_0994ac50, t_84b7c185.
archived: t_8b491872, t_cf9c28a1, t_fee3df1d.

## VERDICT

**YES — PR #1284 is already covered: `t_84b7c185`** (status **done**, i.e. closed),
titled "Publish approved review for PR #1284 and run contribution-PR dedup" — it names
both the published-review step and the contribution-PR dedup follow-up in one card.
The live publish path is also held by `t_3ead2add` (ready) with draft `t_15b38bcf`
(ready), and the contribution-PR follow-up was previously tracked as `t_fee3df1d`
(archived). A new PR #1284 card would be a duplicate.

## Scope / honesty notes

- Read-only with respect to all kanban cards other than the one required comment.
  No `show` was run against any other card — titles/statuses come only from `ls` output,
  which is what the task asked for.
- The archived sweep is an addition to the prescribed steps, disclosed as such above.
- `PROGRESS.md` (root) is appended; this file replaces the previous root `REPORT.md`,
  following the fleet convention that the root report describes the current offload run.
