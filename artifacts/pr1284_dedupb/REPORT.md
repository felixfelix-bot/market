# Dedup recon B — fork branches + PR comments, prior contribution PR for #1284

Worker: fleet offload (worker-heavy) · Date: 2026-10-29 · Repo: PlebeianApp/market
Card: t_d2852d00 (board plebeian-pr-reviews) · Mode: READ-ONLY on GitHub
Worktree branch: review/pr1272-noop-20261029

## Verdict

**prior contribution PR exists: yes** — PlebeianApp/market **#1313**
(https://github.com/PlebeianApp/market/pull/1313), head `fix/1284-selfhost-config-findings`
from felixfelix-bot/market onto #1284's own head `feat/924-auction-self-hosted-context`,
MERGED 2026-09-14T06:14:51Z; announced on #1284 in issuecomment-5653548949. #1284 itself
merged 2026-09-25T12:32:41Z.

Strict-pattern caveat: **no** branch/PR named `felixfelix-bot/contrib-1284-*` exists in
hkarani/market, felixfelix-bot/market, or PlebeianApp/market. The contribution PR that
exists did not come from the hkarani fork and did not use that name.

## Commands run (all six prescribed, re-run live)

| #    | command (abridged)                                                        | result           |
| ---- | ------------------------------------------------------------------------- | ---------------- |
| 1    | `gh pr list --repo hkarani/market --head "felixfelix-bot/contrib-1284-*" …` | `[]`, exit 0     |
| 1a   | `gh api "repos/hkarani/market/branches?per_page=100" … \| grep "felixfelix-bot/contrib-1284"` | no match, exit 1 |
| 1b   | `gh pr list --repo hkarani/market --state all --limit 100 … \| grep -i "1284"` | no match, exit 1 |
| 2    | `gh pr view 1284 --repo PlebeianApp/market --json comments … \| grep -i "contrib"` | 2 lines, exit 0  |
| 2a   | `gh api repos/PlebeianApp/market/issues/1284/comments … \| grep -i "contrib"` | 2 lines, exit 0  |
| 3    | `gh pr list --repo PlebeianApp/market --state all --limit 200 … \| grep -i "contrib-1284"` | no match, exit 1 |

Command 1's `[]` is not a clean negative on its own: `gh pr list --head` is an exact match,
not a glob. 1a/1b and the supplementary branch/PR enumerations carry the negative.

## Deliverable

`DEDUP B` comment posted on t_d2852d00 via
`python3 artifacts/pr1284_dedupa/post_comment.py artifacts/pr1284_dedupb/dedup_b_comment.md --board plebeian-pr-reviews --card t_d2852d00`
(subprocess argv, no shell quoting; `--dry-run` first reported 11721 chars in a single argv slot).
Posting, observed verbatim:

```
$ python3 artifacts/pr1284_dedupa/post_comment.py artifacts/pr1284_dedupb/dedup_b_comment.md --board plebeian-pr-reviews --card t_d2852d00
posting 11721 chars to t_d2852d00
Comment added to t_d2852d00
EXIT:0
```

Read-back verification from `hermes kanban --board plebeian-pr-reviews show t_d2852d00`:

```
  [2026-10-29 05:48] worker-heavy: DEDUP B
  ...
  prior contribution PR exists: yes
  ...
  commented {'author': 'worker-heavy', 'len': 11720}
```

11720 chars stored vs 11721 submitted = one trailing newline; no trimming. The pre-existing
`[2026-09-25 23:18] worker-heavy` comment (len 9511) is still present, untouched.

Comment text source of truth: `artifacts/pr1284_dedupb/dedup_b_comment.md`.

## Evidence files

- `artifacts/pr1284_dedupb/raw/commands.txt` — the six prescribed commands with stdout, stderr, exit codes
- `artifacts/pr1284_dedupb/raw/supplement.txt` — hit detail (#1313, #1284), fork metadata, listing-window coverage, search corroboration, comment timeline
- `artifacts/pr1284_dedupb/raw/supplement2.txt` — structural jq checks (not grep), widened contrib sweeps, `gh search prs` outputs, bot-fork branch sweep
- `artifacts/pr1284_dedupb/raw/fork_branches.txt` — 393 hkarani/market branch names
- `artifacts/pr1284_dedupb/raw/felix_branches.txt` — 692 felixfelix-bot/market branch names
- `artifacts/pr1284_dedupb/raw/pr1284_comments_prview.txt` / `..._api.txt` — the two comment dumps (`diff` exit 0)
- `artifacts/pr1284_dedupb/raw/fork_prs.txt` — `[]` (hkarani/market has zero PRs)
- `artifacts/pr1284_dedupb/raw/upstream_prs.txt` / `upstream_heads.json` — the 200-PR window

## Pre-existing DEDUP B comment on this card

A `DEDUP B` comment already existed at `[2026-09-25 23:18] worker-heavy` (len 9511), same YES
verdict. Every prescribed command was re-run live instead of trusting it. Material deltas:
the upstream 200-PR window rolled from #1160–1396 to #1182–1425 (#1313 still inside);
felixfelix-bot/market now also has `contrib-1286-sig`; nothing else changed. No claim in the
earlier comment was falsified. The 2026-10-29 comment discloses this explicitly.

## Scope / honesty notes

- No PR, branch, issue, or comment was created/modified/closed/merged **on GitHub as a review
  action**. No contribution branch was pushed. Read-only `gh` calls only; the kanban comment on
  t_d2852d00 is the sole GitHub-visible write.
- One local record commit (`88468157`) records these artifacts + root PROGRESS.md, pushed to the
  bot fork's existing review branch `fork/review/pr1272-noop-20261029` — the worktree's own
  pre-existing tracking branch, per the death-proof convention. Observed push output:

```
cred-gate: 11 pre-existing hit(s) suppressed by the cred-exempt path policy (/home/c03rad0r/.git-hooks/cred-exempt.txt); re-audit with --no-exempt
To https://github.com/felixfelix-bot/market.git
   138c7ae5..88468157  HEAD -> review/pr1272-noop-20261029
EXIT:0
$ git ls-remote fork refs/heads/review/pr1272-noop-20261029
884681574279b0921cb5e1bd456dc42e780abe5b	refs/heads/review/pr1272-noop-20261029
$ git rev-parse HEAD
884681574279b0921cb5e1bd456dc42e780abe5b
```

  That is a review-evidence branch, not a contribution branch: it carries no #1284 code change
  and opens no PR.
- `gh pr list 1313 --repo hkarani/market` was attempted once and errored with a usage message
  (`unknown argument "1313"`) — that was my malformed cross-check, superseded by the
  `--limit 100 --jq length` → `0` enumeration in supplement.txt. Recorded, not hidden.
