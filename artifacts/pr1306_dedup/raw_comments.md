# PR #1306 — raw GitHub comments/reviews evidence dump

- Target: PlebeianApp/market PR #1306 ([https://github.com/PlebeianApp/market/pull/1306](https://github.com/PlebeianApp/market/pull/1306))
- Title: fix(preview): a run-body comment must not spell a workflow expression
- Capture time (UTC): 2026-10-01T14:36:26Z, gh CLI authenticated as felixfelix-bot
- Mode: READ-ONLY evidence gathering. No posts, comments, resolves, edits,
  or other GitHub mutations were performed.
- Companion artifact: `artifacts/pr1306_dedup/kanban_artifacts.md` (kanban-side
  review-chain harvest, commit 82b3c9f7). This file covers the GitHub side only.

## Summary of endpoint results

| # | Endpoint | Exit | Items returned |
|---|----------|------|----------------|
| 1 | `gh pr view 1306 --comments --repo PlebeianApp/market` | 0 | 0 (stdout empty, 0 bytes) |
| 2 | `gh api --paginate repos/PlebeianApp/market/pulls/1306/reviews` | 0 | 0 |
| 3 | `gh api --paginate repos/PlebeianApp/market/pulls/1306/comments` | 0 | 0 |
| 4 | `gh api --paginate repos/PlebeianApp/market/issues/1306/comments` | 0 | 0 |

**Every command in this dump returned an EMPTY result set.** Each is called out
below with the exact command, exit code, and byte-exact output. With zero items
returned there are no per-item author/id/permalink attributes to record; the
item counts are cross-checked against the PR metadata fields `comments` and
`review_comments` and the issues endpoint `comments` field (see Cross-checks).

---

## PR identity (from `gh api repos/PlebeianApp/market/pulls/1306`)

- number: 1306
- title: fix(preview): a run-body comment must not spell a workflow expression
- state: closed (merged: True, merged_at: 2026-09-12T06:23:47Z)
- author (login): felixfelix-bot
- permalink: https://github.com/PlebeianApp/market/pull/1306
- created_at: 2026-09-11T22:50:58Z
- updated_at: 2026-09-12T06:23:47Z
- comments (issue-level count per pulls API): 0
- review_comments (inline count per pulls API): 0
- additions/deletions: 192/5
- head sha: c20765e7028fcf5aafafe01ac27cfb2edf1285b0 · base: feat/preview-deployments <- head: fix/preview-deploy-workflow-expr

## Endpoint 1 — `gh pr view 1306 --comments --repo PlebeianApp/market`

Exact command:

```
gh pr view 1306 --comments --repo PlebeianApp/market
```

- exit code: 0
- stdout: **EMPTY — 0 bytes** (verified with `wc -c` = 0 and `od -c` = `0000000`)
- stderr: empty (0 bytes)
- Interpretation of the empty output (fact, not opinion): gh emits nothing on
  stdout for `--comments` when the PR has no comments; the PR itself renders
  normally without `--comments` (see Appendix A for its description body).

stdout, verbatim (empty):

```

```

## Endpoint 2 — `gh api --paginate repos/PlebeianApp/market/pulls/1306/reviews`

Exact command:

```
gh api --paginate repos/PlebeianApp/market/pulls/1306/reviews
```

- exit code: 0; stderr empty (0 bytes)
- **EMPTY result: 2 bytes**
- items returned: **0** — no reviews exist on this PR

stdout, verbatim:

```
[]
```

## Endpoint 3 — `gh api --paginate repos/PlebeianApp/market/pulls/1306/comments` (inline review comments)

Exact command:

```
gh api --paginate repos/PlebeianApp/market/pulls/1306/comments
```

- exit code: 0; stderr empty (0 bytes)
- **EMPTY result: 2 bytes**
- items returned: **0** — no inline review comments exist on this PR

stdout, verbatim:

```
[]
```

## Endpoint 4 — `gh api --paginate repos/PlebeianApp/market/issues/1306/comments` (issue-level comments)

Exact command:

```
gh api --paginate repos/PlebeianApp/market/issues/1306/comments
```

- exit code: 0; stderr empty (0 bytes)
- **EMPTY result: 2 bytes**
- items returned: **0** — no issue-level comments exist on this PR

stdout, verbatim:

```
[]
```

## Cross-checks

Exact command:

```
gh api repos/PlebeianApp/market/issues/1306 --jq '{comments, state, author: .user.login}'
```

stdout, verbatim:

```
{"author":"felixfelix-bot","comments":0,"state":"closed"}
```

This matches: pulls API `comments: 0`, `review_comments: 0`; reviews/comments/
issue-comments endpoints all `[]`. No auth or permission errors occurred on any
command (all exit 0, all stderr empty).

## Appendix A — PR description (opening post), verbatim

The only prose ever authored on PR #1306 itself is the PR description by
@felixfelix-bot (created 2026-09-11T22:50:58Z,
permalink https://github.com/PlebeianApp/market/pull/1306). Included verbatim for completeness:

````
## Why: every preview deploy in #1271 is dead while the PR looks green

`feat/preview-deployments` carries a `preview-deploy.yml` that **GitHub cannot
load at all**. The signal is in the run list: [run
34653473352](https://github.com/PlebeianApp/market/actions/runs/34653473352)
(push, 2026-09-11T22:19:17Z, head `5e1c1aa6`) has **zero jobs, no log**, and its
run name is the **truncated file path** `.github/workflows/preview-deploy.y`
instead of the workflow name `Preview Deploy`.

That is the signature of a workflow file rejected at parse time. And because
GitHub never registers a workflow it cannot parse, it creates **no check run**
for it either — so #1271 shows every check green while no preview is ever
deployed. The failure is silent on the pull request and only visible as an empty
run.

## Root cause

Line 212 of `.github/workflows/preview-deploy.yml` at `5e1c1aa6` (introduced by
`621bca03`, squashed into `5e1c1aa6` / #1305):

```yaml
      - name: Claim host-port offset (M6) then bring up services
        run: |
          # The remote script is piped to `bash -s` on the VPS over stdin. The
          # ${{ ... }} expressions are substituted by GitHub BEFORE this shell
```

It is a **shell comment inside a `run:` body**, and it spells a literal
`${{ ... }}`. GitHub scans `${{ }}` sequences inside a run body for expression
validity **before** the shell ever sees them, comment or not, so `...` is parsed
as an expression and the whole file is rejected at load time. The comment was
added after `0b4e6f39` (which had no such comment and whose deploy runs did load
the workflow), so the regression window is exactly #1305.

`actionlint` reports it precisely, one error, nothing else in the file:

```
$ actionlint .github/workflows/preview-deploy.yml
.github/workflows/preview-deploy.yml:210:89: unexpected token "." while parsing
variable access, function call, null, bool, int, float or string. expecting
"IDENT", "(", "INTEGER", "FLOAT", "STRING" [expression]
```

(`actionlint` maps the position into the block scalar differently from the file's
own line numbering; the offending comment is line 212.)

## The change

1. **Fix** — reword that one comment so it contains no `${{`. No other line of
   any workflow changes; no behaviour changes; no workflow or third-party action
   is added:

   ```diff
   -          # The remote script is piped to `bash -s` on the VPS over stdin. The
   -          # ${{ ... }} expressions are substituted by GitHub BEFORE this shell
   +          # The remote script is piped to `bash -s` on the VPS over stdin.
   +          # Expression placeholders are substituted by GitHub BEFORE this shell
   ```

   `infra/preview-vps/*` was swept for the same defect: this was the **only**
   `${{` inside a comment in any workflow file in the repo.

2. **Regression guard** — `infra/preview-vps/test_pinned_openssh.sh` (the repo's
   existing offline workflow guard) gains two checks, in the same style and with
   the same tally format:

   - **5A** parses **every** `.github/workflows/*.yml` as YAML (python3 + pyyaml)
     and fails if any shell comment inside a `run` body spells a workflow
     expression. Parsed properly rather than grepped, so legitimate `${{ }}` in
     `if:`, `env:`, `with:` and on live run-body lines is never flagged. The
     check is self-proving: a temp fixture with the defect's exact shape must be
     flagged (and the reported line must be the right one), and a fixture full of
     legitimate expressions must stay silent.
   - **5B** runs `actionlint` over those files and fails on any error; when
     actionlint is absent it prints `actionlint not installed - skipped` rather
     than failing, so the test stays offline-portable. shellcheck is disabled
     (`-shellcheck=`) on purpose: its pre-existing findings in `deploy*.yml`,
     `e2e.yml` and `release.yml` are unrelated to whether a workflow loads, and
     they only appear when shellcheck happens to be installed.

3. **Docs** — one sentence in `docs/ops/preview-deploy.md`, which already
   enumerates what this guard covers.

## Evidence (offline, nothing deployed, no secrets touched)

`actionlint`, before → after:

```
BEFORE: .github/workflows/preview-deploy.yml:210:89: unexpected token "." ... [expression]   (1 error, exit 1)
AFTER : (no output, exit 0)
```

Guard, with the comment reverted → with the fix (the same command, the same
file, only the comment reverted):

```
BEFORE (comment reverted):
  preview-deploy.yml:212: shell comment inside a run body spells a workflow expression: # ${{ ... }} expressions ...
  FAIL  no shell comment inside a workflow run body spells a workflow expression (5A)
  FAIL  actionlint reports no error in any .github/workflows/*.yml
  35 checks, 2 failure(s)
  RESULT: FAIL        (exit 1)

AFTER:
  35 checks, 0 failure(s)
  RESULT: PASS        (exit 0)
```

Siblings and hygiene, unchanged and clean:

```
bash infra/preview-vps/test_ssh_port.sh           -> 35 checks, 0 failure(s)  PASS
bash infra/preview-vps/test_key_materialisation.sh -> 11 checks, 0 failure(s)  PASS
bun run format:check   -> All matched files use Prettier code style!
git diff --check       -> clean
```

Reproduce locally:

```
bash infra/preview-vps/test_pinned_openssh.sh   # 5A + 5B in the output
```

## Notes for review

- The workflow diff is comment text on one line only — no trigger, permission,
  environment, secret or step changes, so the "explain trigger/permission/secret
  effects" requirement is satisfied by "none".
- The guard is what makes the fix durable: the defect class is invisible on the
  pull request (no check run at all), so nothing else in CI can catch it.
- This does not touch #1271; it lands on its base branch
  (`feat/preview-deployments`). Once merged there, #1271 picks it up and the
  preview deploy can actually run.

````

## Appendix B — raw capture files (this directory)

| file | bytes | sha256 |
|------|-------|--------|
| `gh_pr_view_comments.stderr` | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| `gh_pr_view_comments.txt` | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| `issue_comments.json` | 2 | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| `issue_comments.stderr` | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| `pr_metadata.json` | 23146 | f41db3675646d08024da90f58765f76dd1818a3a156d6c27827200d4b202e0f1 |
| `pr_metadata.stderr` | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| `review_comments.json` | 2 | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| `review_comments.stderr` | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| `reviews.json` | 2 | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| `reviews.stderr` | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

Generated 2026-10-01T14:37:09Z by `raw/build_raw_comments.py` from the captures above.
