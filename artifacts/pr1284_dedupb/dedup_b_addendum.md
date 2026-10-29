DEDUP B — addendum: scope correction re "no branch was pushed"

The DEDUP B comment above says "no branch was pushed". That sentence is true of the
reconnaissance itself (zero contribution branches created or pushed), but it is imprecise
about the death-proof record commit, which was made and pushed AFTER the comment was posted.
Correcting it explicitly rather than leaving an over-broad claim on the card.

What was pushed:

```
$ git push fork HEAD:review/pr1272-noop-20261029
cred-gate: 11 pre-existing hit(s) suppressed by the cred-exempt path policy (/home/c03rad0r/.git-hooks/cred-exempt.txt); re-audit with --no-exempt
To https://github.com/felixfelix-bot/market.git
   138c7ae5..88468157  HEAD -> review/pr1272-noop-20261029
EXIT:0
$ git push fork HEAD:review/pr1272-noop-20261029
   88468157..9fe17105  HEAD -> review/pr1272-noop-20261029
EXIT:0
$ git ls-remote fork refs/heads/review/pr1272-noop-20261029
9fe17105a80f2421850bca032c88f552c33c49ec	refs/heads/review/pr1272-noop-20261029
$ git rev-parse HEAD
9fe17105a80f2421850bca032c88f552c33c49ec
```

Both pushes went to `fork/review/pr1272-noop-20261029` — a **pre-existing** review-evidence
branch that was already this worktree's upstream (it existed at `138c7ae5` before this run).
No new branch was created. It carries only docs/artifacts (`PROGRESS.md`, the DEDUP B comment
text, the raw `gh` evidence files) — no source change, no #1284 code, and no PR was opened
from it.

What remains true from the DEDUP B comment's scope paragraph:

- No PR was opened, edited, commented on, closed, or merged.
- No issue was created or commented on.
- No contribution branch (`felixfelix-bot/contrib-1284-*` or otherwise) was created.
- The kanban comment on t_d2852d00 is the only GitHub-visible write outside that review branch.

Verdict unchanged:

prior contribution PR exists: yes

Justification unchanged: PlebeianApp/market #1313 (https://github.com/PlebeianApp/market/pull/1313),
head `fix/1284-selfhost-config-findings` from felixfelix-bot/market onto #1284's own head
`feat/924-auction-self-hosted-context`, MERGED 2026-09-14T06:14:51Z and announced on #1284 in
issuecomment-5653548949.
