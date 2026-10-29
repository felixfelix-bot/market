DEDUP B

PR #1284 prior-contribution-PR reconnaissance (source B: fork branches + PR comments)
Date: 2026-10-29. Card: t_d2852d00 (board plebeian-pr-reviews). Mode: READ-ONLY.
Nothing was opened, edited, commented on, closed, or merged on GitHub; no branch was pushed.
The kanban comment on this card is the only write performed.

Review subject, re-verified live at this run:

```
$ gh api repos/PlebeianApp/market/pulls/1284 --jq '{state: .state, merged: .merged, merged_at: .merged_at, head_ref: .head.ref, head_sha: .head.sha, base_ref: .base.ref, user: .user.login}'
{"base_ref":"auctions","head_ref":"feat/924-auction-self-hosted-context","head_sha":"22a1cebd647c6b59d929725f5d288a8c4326a4ce","merged":true,"merged_at":"2026-09-25T12:32:41Z","state":"closed","user":"hkarani"}
```

=== COMMAND 1 (target search: fork PR by head pattern) ===

Exact command text:

```
gh pr list --repo hkarani/market --head "felixfelix-bot/contrib-1284-*" --state all --json number,url,headRefName,state
```

Raw output, verbatim (stdout):

```
[]
```

stderr: (empty). exit 0. No error — an empty result set. `gh pr list --head` is an exact head-branch match, not a glob, so the literal pattern `felixfelix-bot/contrib-1284-*` could never match even if such a branch existed; the fallbacks below are therefore the load-bearing checks.

=== COMMAND 1a (fallback: enumerate hkarani/market branches, grep the contrib pattern) ===

Exact command text:

```
gh api "repos/hkarani/market/branches?per_page=100" --paginate --jq '.[].name' | grep "felixfelix-bot/contrib-1284"
```

Raw output, verbatim: no match (grep exit 1, stdout empty, stderr empty)

The grep actually saw input — the same branch enumeration is non-empty, 393 names:

```
$ gh api "repos/hkarani/market/branches?per_page=100" --paginate --jq '.[].name' | grep -c ""
393
```

Widened grep over the same 393 names (any branch mentioning 1284 or contrib):

```
$ gh api "repos/hkarani/market/branches?per_page=100" --paginate --jq '.[].name' | grep -i -E "1284|contrib"
(no output)
(exit 1 → no match)
```

=== COMMAND 1b (fallback: hkarani/market PR listing, grep 1284) ===

Exact command text:

```
gh pr list --repo hkarani/market --state all --limit 100 --json number,url,headRefName,state | grep -i "1284"
```

Raw output, verbatim: no match (grep exit 1, stdout empty, stderr empty)

The unfiltered input to that grep is an empty array — the fork has zero PRs in any state:

```
$ gh pr list --repo hkarani/market --state all --limit 100 --json number,url,headRefName,state
[]

$ gh pr list --repo hkarani/market --state all --limit 100 --json number --jq 'length'
0
```

Fork metadata (verbatim):

```
$ gh api repos/hkarani/market --jq '{full_name: .full_name, fork: .fork, parent: .parent.full_name, open_issues_count: .open_issues_count, pushed_at: .pushed_at}'
{"fork":true,"full_name":"hkarani/market","open_issues_count":0,"parent":"PlebeianApp/market","pushed_at":"2026-08-01T15:56:28Z"}
```

A contrib-named head branch was also checked for on the bot's own fork, since that is where every contribution branch actually lives:

```
$ gh api "repos/felixfelix-bot/market/branches?per_page=100" --paginate --jq '.[].name' | grep -i "contrib"
contrib-1286-sig
(exit 0 — one contrib-* branch, for PR #1286, NOT #1284)

$ gh api "repos/felixfelix-bot/market/branches?per_page=100" --paginate --jq '.[].name' | grep -i "contrib-1284"
(no output)
(exit 1 → no match)
```

=== COMMAND 2 (comment grep on the reviewed PR, gh pr view) ===

Exact command text:

```
gh pr view 1284 --repo PlebeianApp/market --json comments --jq '.comments[].body' | grep -i "contrib"
```

Raw output, verbatim (stdout, exit 0 — two matching lines):

```
Contribution PR opened against this branch: **#1313** — `fix/1284-selfhost-config-findings`.
- Contribution PR: **none needed** — nothing in the delta requires a change (NIT-1's smallest-safe fix would delete the only regression guard for the additive-relay invariant, which we decline to ship).
```

stderr: (empty).

=== COMMAND 2a (comment grep on the reviewed PR, issues REST endpoint) ===

Exact command text:

```
gh api repos/PlebeianApp/market/issues/1284/comments --jq '.[].body' | grep -i "contrib"
```

Raw output, verbatim (stdout, exit 0 — the same two lines, byte-identical set):

```
Contribution PR opened against this branch: **#1313** — `fix/1284-selfhost-config-findings`.
- Contribution PR: **none needed** — nothing in the delta requires a change (NIT-1's smallest-safe fix would delete the only regression guard for the additive-relay invariant, which we decline to ship).
```

stderr: (empty). `diff` of the two full comment dumps (`gh pr view --json comments` vs the REST issues endpoint) exits 0 — the 67-line bodies are identical, so both paths are the same population of comments.

#1284 comment timeline at this run — 6 comments, every one authored by felixfelix-bot:

```
$ gh api repos/PlebeianApp/market/issues/1284/comments --jq '.[] | {user: .user.login, created_at: .created_at, url: .html_url}'
{"created_at":"2026-09-10T09:08:26Z","url":"https://github.com/PlebeianApp/market/pull/1284#issuecomment-5616073589","user":"felixfelix-bot"}
{"created_at":"2026-09-12T09:56:38Z","url":"https://github.com/PlebeianApp/market/pull/1284#issuecomment-5645180703","user":"felixfelix-bot"}
{"created_at":"2026-09-13T13:23:46Z","url":"https://github.com/PlebeianApp/market/pull/1284#issuecomment-5653548949","user":"felixfelix-bot"}
{"created_at":"2026-09-16T07:13:38Z","url":"https://github.com/PlebeianApp/market/pull/1284#issuecomment-5693516461","user":"felixfelix-bot"}
{"created_at":"2026-09-17T17:04:18Z","url":"https://github.com/PlebeianApp/market/pull/1284#issuecomment-5718264457","user":"felixfelix-bot"}
{"created_at":"2026-09-25T15:54:31Z","url":"https://github.com/PlebeianApp/market/pull/1284#issuecomment-5835344809","user":"felixfelix-bot"}
```

The two hits are sourced from issuecomment-5653548949 (2026-09-13T13:23:46Z — the #1313 announcement, posted ~12s after #1313 was created) and issuecomment-5693516461 (2026-09-16T07:13:38Z — a later review round declining a further contribution PR as "none needed").

=== COMMAND 3 (PlebeianApp/market head-branch contrib-pattern check) ===

Exact command text:

```
gh pr list --repo PlebeianApp/market --state all --limit 200 --json number,url,headRefName,state | grep -i "contrib-1284"
```

Raw output, verbatim: no match (grep exit 1, stdout empty, stderr empty)

Listing-window coverage — the grep's input really was 200 PRs:

```
$ gh pr list --repo PlebeianApp/market --state all --limit 200 --json number --jq '[.[].number]|{count:length,min:min,max:max}'
{"count":200,"max":1425,"min":1182}
```

Structural (jq, not grep) form of the same question, so a pretty-printer cannot mask a hit:

```
$ gh pr list --repo PlebeianApp/market --state all --limit 200 --json number,headRefName --jq '[.[] | select(.headRefName|test("contrib-1284"))] | length'
0
```

Widened: any upstream PR whose head branch contains "contrib" at all:

```
$ gh pr list --repo PlebeianApp/market --state all --limit 200 --json number,headRefName,state --jq '.[] | select(.headRefName|test("contrib"))'
{"headRefName":"core/validation-contribution","number":1418,"state":"MERGED"}
```

That single hit is PR #1418 `core/validation-contribution` — unrelated to #1284 (it does not mention 1284 and is not the #1284 contribution PR).

=== HIT DETAIL — the contribution PR that does exist ===

```
$ gh pr view 1313 --repo PlebeianApp/market --json number,url,headRefName,headRepositoryOwner,baseRefName,state,title,mergedAt,createdAt,author
{"author":{"id":"U_kgDOEfb55Q","is_bot":false,"login":"felixfelix-bot","name":"Felix"},"baseRefName":"feat/924-auction-self-hosted-context","createdAt":"2026-09-13T13:23:34Z","headRefName":"fix/1284-selfhost-config-findings","headRepositoryOwner":{"id":"U_kgDOEfb55Q","name":"Felix","login":"felixfelix-bot"},"mergedAt":"2026-09-14T06:14:51Z","number":1313,"state":"MERGED","title":"fix(#1284): union zap relays, derive the handler-id chain, trim booleans (review findings 1-3)","url":"https://github.com/PlebeianApp/market/pull/1313"}
```

```
$ gh api repos/PlebeianApp/market/pulls/1313 --jq '{head_repo: .head.repo.full_name, head_ref: .head.ref, base_ref: .base.ref, state: .state, merged: .merged, merged_at: .merged_at, created_at: .created_at, user: .user.login}'
{"base_ref":"feat/924-auction-self-hosted-context","created_at":"2026-09-13T13:23:34Z","head_ref":"fix/1284-selfhost-config-findings","head_repo":"felixfelix-bot/market","merged":true,"merged_at":"2026-09-14T06:14:51Z","state":"closed","user":"felixfelix-bot"}
```

→ PR number: 1313
→ URL: https://github.com/PlebeianApp/market/pull/1313
→ head branch: fix/1284-selfhost-config-findings
→ head repo: felixfelix-bot/market (NOT the hkarani fork)
→ base branch: feat/924-auction-self-hosted-context (= #1284's own head branch)
→ state: MERGED (2026-09-14T06:14:51Z)

Repo-wide corroboration that survives listing windows (PR title/body search):

```
$ gh api "search/issues?q=repo:PlebeianApp/market+type:pr+1284+in:title,body&per_page=50" --jq '.total_count, (.items[] | {number: .number, state: .state, title: .title})'
1
{"number":1313,"state":"closed","title":"fix(#1284): union zap relays, derive the handler-id chain, trim booleans (review findings 1-3)"}
```

total_count = 1 → #1313 is the only PR in the repository whose title or body mentions 1284.

Org-wide search for the literal contrib pattern returns nothing anywhere:

```
$ gh search prs --repo PlebeianApp/market "contrib-1284" --limit 20 --json number,title,state,url
[]

$ gh search prs --owner hkarani "contrib-1284" --limit 20 --json number,title,state,url,repository
[]
```

=== PRE-EXISTING DEDUP B COMMENT ON THIS SAME CARD (disclosed) ===

This card was already swept once. A `DEDUP B` comment exists at `[2026-09-25 23:18] worker-heavy` (len 9511) reaching the same YES verdict. Rather than trust it, every prescribed command above was re-run live in this session, and its claims were independently re-derived. Deltas observed versus that 2026-09-25 sweep:

- Listing window has rolled: the PlebeianApp/market 200-PR window is now #1182–1425 (it was #1160–1396 on 2026-09-25). #1313 remains inside both windows, so the command-3 result is unchanged.
- #1284 remains MERGED at `22a1cebd` (2026-09-25T12:32:41Z); #1313 remains MERGED at 2026-09-14T06:14:51Z. No new #1284 comment has appeared since issuecomment-5835344809 — still 6 comments.
- The bot fork now also carries `contrib-1286-sig` (PR #1286's contribution branch) but still no `contrib-1284-*`. hkarani/market is unchanged: 393 branches, 0 PRs, none matching.
- Everything material in the 2026-09-25 comment reproduced exactly; nothing in it was falsified.

=== VERDICT ===

prior contribution PR exists: yes

Justification: PlebeianApp/market #1313 (https://github.com/PlebeianApp/market/pull/1313), head branch `fix/1284-selfhost-config-findings` from felixfelix-bot/market onto #1284's own head branch `feat/924-auction-self-hosted-context`, is already MERGED (2026-09-14T06:14:51Z) and is announced on #1284 itself in issuecomment-5653548949 — and #1284 too has since merged (2026-09-25T12:32:41Z).

Strict-pattern caveat (explicit): no branch and no PR named `felixfelix-bot/contrib-1284-*` exists in any of the three relevant repos — hkarani/market has 393 branches and 0 PRs with zero matches (widened `1284|contrib` grep also zero), felixfelix-bot/market's only contrib-* branch is `contrib-1286-sig`, and the PlebeianApp/market 200-PR window #1182–1425 has zero `contrib-1284` head branches. The contribution PR that exists did not originate from the hkarani fork and did not use the contrib-1284-* name.
