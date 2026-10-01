# Kanban artifacts — PR #1306 review chain (dedup baseline input)

- Card: `t_140228d7` (board `plebeian-my-prs`) — "Harvest prior kanban review artifacts for the PR #1306 review chain"
- Produced: 2026-10-01, worker profile `worker-admin` (fleet offload lane). Read-only on the
  board: no task was created, moved, commented on, or mutated.
- Subject: PlebeianApp/market PR #1306 "fix(preview): a run-body comment must not spell a
  workflow expression", head SHA `c20765e7028fcf5aafafe01ac27cfb2edf1285b0` (state MERGED,
  merged 2026-09-12T06:23:47Z, merge commit `a10a9499`).
- Anchors requested by the card: `t_666dccb5` (blocked, "Verify PR #1306 draft findings against
  code at head SHA") and `t_018476f0` (todo, "Build dedup baseline from PR #1306 existing
  comments", decomposer root of this fan-out: t_4ebf1ad1, t_140228d7, t_5b3a28c4, t_9ff7fc28,
  t_13d47044).

## 1. Searches performed

All read-only (`sqlite3` module, `mode=ro`, no sqlite3 CLI on this host):

1. **Board read (home board).** `~/.hermes/kanban/boards/plebeian-my-prs/kanban.db` —
   `tasks`, `task_comments`, `task_events` (8,250 events). Located both anchor tasks
   (both on `plebeian-my-prs`). Extracted the full #1306 chain: 24 tasks whose
   title/body match `1306` (list in §2), then read **every** comment on every one of
   those 24 tasks (not only string-matching ones).
2. **String sweep, all boards.** All 115 board DBs under `~/.hermes/kanban/boards/*/kanban.db`
   — `tasks` + `task_comments` swept for: `1306`, `PlebeianApp/market`,
   `preview-deploy.yml`, `provision.sh`, `previews_ready`. (On the home board,
   `task_events` was swept too.) `PlebeianApp/market` full-detail reads were done on the
   home board (35 comment hits — all about other PRs: #1232, #1252, #1271, #1280, #1292,
   #1300, #1308, #1331, #1333, #1335, #1337, #1373…); on other boards it was adjudicated via
   the co-occurring discriminators below (any artifact about PR #1306 must also contain
   `1306` or the file names).
3. **Board artifact tree / git history.** `~/repos/plebeian-my-prs/artifacts/pr1306/`
   (4 markdown artifacts + diff/body/probes, listed in §3) and the board repo's history for
   them: `git log -- artifacts/pr1306/*` → commits `1609ca13` (2026-09-15 01:00 +0200) and
   `343f45f3` (2026-09-15 01:33 +0200), both authored `c03rad0r`, both subjects
   "docs(pr-1306): … nothing posted". Board attachments dir
   (`~/.hermes/kanban/boards/plebeian-my-prs/attachments/t_7d05200b/`) also read.
4. **Prior-run check on this card.** `t_140228d7` (and sibling `t_4ebf1ad1`) were run
   offloaded on 2026-09-28 and closed `fleet-done rc=0 verified=True`, but `tasks.result`
   is empty for both and no `artifacts/pr1306_dedup/` file existed — the writeback path
   persists no stdout (same root cause documented in comment c738 on t_666dccb5). This file
   is therefore a fresh deliverable, not a recovery.

Rule-outs (searched, found, adjudicated NOT about PR #1306):

- `plebeian-pr-reviews` board: 6 hits for `preview-deploy.yml`/`provision.sh` — tasks/comments
  about PR #1229 (t_cfc89893, 2026-08-13), PR #1363 (t_c66d6dd2/t_1953c477), PR #1359
  (t_18bbe164). Same workflow file, different PRs; no #1306 finding raised there.
- `market` board: t_b7c686f1 (2026-08-27) — the design task that created
  `preview-deploy.yml` + `provision.sh`; not a review finding.
- `merge-deputy` (t_04fb2753) and `pr-trust-pipeline` (t_0d7d3f49, t_36ac1593): August
  fork-repo (felixfelix-bot/market) design/review work; predate and don't concern #1306.
- Coincidental `1306` substrings: `llm-routing` (7), `meshcore` (5), `net4sats-mvp-v2` (5),
  `tollgate-module-basic-go` (3), `tollgate` (1) — all are SHA fragments (`be913069`,
  `51cb56…30602…`, `dfda57a1306efe2`), a line number (`valve.go:1306`), or byte-range
  markers. None reference PlebeianApp/market PR #1306.
- `previews_ready` extra matches: t_0061c823, t_7f98385d, t_5759ef16, t_06fe3654,
  t_20983bc6 — all cards of the **PR #1271** (base-PR) review chain, where the three known
  items were originally raised on GitHub (felixfelix-bot comment 5618108451 per the
  t_06fe3654/t_20983bc6 audit records); they quote `previews_ready` as known context, not as
  a new #1306 finding.

## 2. The PR #1306 chain on `plebeian-my-prs` (24 tasks)

Review/dispatch chain (2026-09-12 → 09-14): t_a9d42685 (review, blocked) →
t_3dd86d27 (draft, done — produced no output, runs 421/427 crashed) → t_71f487f7
(cross-family cold review, blocked — crashed) → t_a7bd2466, t_9dc75303, t_ad8555bb,
t_ea176297 (archived, 0 runs, 0 comments — never claimed). Analysis fan-out (2026-09-14):
t_16a4561c (pin, done), t_2ed2bb22 (doc/test parity, done — **findings**), t_7d05200b
(grep-guard review, done — **findings**). Cold-review fan-out (2026-09-14→25): t_f31d86c0
(todo) → t_cb413d63 (Q1, blocked), t_17e55745 (Q2, blocked), t_892d5720 (synthesis, todo);
t_666dccb5 (audit parent, blocked — **ground truth + blocker comments**), t_7433d93e
(pin, done), t_77abc183 (draft extraction, done — **blocker comment**). Dedup fan-out
(2026-09-25): t_018476f0 (todo, root) → t_4ebf1ad1, t_140228d7 (**this card**), t_5b3a28c4,
t_9ff7fc28, t_13d47044.

## 3. Prior kanban-raised findings about PR #1306

Six distinct findings were raised on the board (two independent sub-chains converged on the
same root cause for K1). Head SHA for all file:line claims: `c20765e7`.

### K1 — [RISK] DOC/TEST PARITY: docs over-assert the 5A guard — trailing shell comment escapes it (parity holds only via 5B/actionlint)

- Earliest artifact: `~/repos/plebeian-my-prs/artifacts/pr1306/PR1306-parity-verdict.md`
  (board-repo commit `1609ca13`, 2026-09-15) — produced by the t_2ed2bb22 sub-chain
  ("Review #1306 doc/test parity: preview-deploy.md vs test_pinned_openssh.sh").
- Re-raised & re-verified as comment **c391** on **t_2ed2bb22** (worker-reviewer-kimi,
  2026-09-26 22:37) and comment **c549** on **t_2ed2bb22** (worker-reviewer-kimi,
  2026-09-26 23:54). Independently confirmed as F1 in the t_7d05200b artifact (K1' below).
- file:line as stated: `docs/ops/preview-deploy.md:335-337` (key line `:336`) vs
  `infra/preview-vps/test_pinned_openssh.sh:294` (predicate), glob at `:259-261`, wiring at
  `:311-314`, 5B skip branch `:383-385`.
- Verbatim (c391, worker-reviewer-kimi):

> **[RISK] (iii) DOC/TEST PARITY — doc over-asserts the 5A guard's scope**
> DOC CITATION (c20765e7): `docs/ops/preview-deploy.md:L336-L337`
>
> > "It also fails if any `.github/workflows/*.yml` spells an expression placeholder inside a shell comment in a `run:` body"
> > TEST CITATION (c20765e7): `infra/preview-vps/test_pinned_openssh.sh:L294`
> > `if body_line.lstrip().startswith("#") and "${{" in body_line:`
> > CONCRETE TRIGGER (verified in both directions):
> > Run-body line (inside `run: |`): `echo hi  # ${{ bad.thing }}`
>
> - 5A guard: **PASS** — exit 0, no output. `lstrip()` yields `echo hi  # ${{ bad.thing }}`, which does not start with `#`.
> - Doc claim: **FAIL** — that text is an expression placeholder inside a shell comment in a `run:` body.
> - Net with actionlint **absent** (allowed by the test's own SKIP branch, L383-L385): `test_pinned_openssh.sh` reports PASS on a run-body comment placeholder that `docs/ops/preview-deploy.md:L336-L337` states it fails on. 5B closes that gap only when actionlint is installed.

- Verbatim (re-verification c549, same author/task, 2026-09-26 23:54):

> **[RISK] (iii) DOC/TEST PARITY — re-verified read-only in this run; the doc clause is true only via 5B (actionlint), not via the guard it describes (5A), and it lapses when actionlint is absent**
> ⇒ on the supported actionlint-absent configuration the doc's unconditional clause is false for the guard it describes; the guarantee it claims for the script holds only through the conditional actionlint clause.

- Verbatim (earliest artifact, PR1306-parity-verdict.md §Verdict):

> ## Verdict: [RISK] — the doc over-claims the 5A guard: "a shell comment" vs whole-line comments only
>
> Only a run-body line whose FIRST non-space character is `#` is examined — i.e. a whole-line comment. A TRAILING comment (a `# …` after a command on the same line) is a shell comment in a run: body, and the predicate skips it.
> Net: the doc promises the test fails on "a shell comment … spelling an expression placeholder"; the test demonstrably does not. The unconditional 5A line of defense has a hole in its own threat model.

### K1' — [RISK] same root cause, guard side: trailing/merged shell comments escape the 5A predicate (independent confirmation with more trigger shapes)

- Artifact: `~/repos/plebeian-my-prs/artifacts/pr1306/PR1306-review-5A5B.md` (board-repo
  commit `343f45f3`, 2026-09-15) — produced by the t_7d05200b sub-chain ("Review PR #1306
  grep guard in test_pinned_openssh.sh").
- Also raised as comment **c425** on **t_7d05200b** (worker-reviewer-qwen, 2026-09-26 22:42);
  verdict re-stated in comment **c585** on **t_7d05200b** (worker-reviewer-qwen,
  2026-09-27 00:22; durable copy `~/reports/reviews/plebeian-my-prs-t_7d05200b-qwen.md`,
  byte-identical attachment under the board's `attachments/t_7d05200b/`).
- file:line as stated: `infra/preview-vps/test_pinned_openssh.sh:293-294` (predicate),
  `:292` (span/line-mapping), check name `:313`; same claim in `docs/ops/preview-deploy.md:336-337`.
- Verbatim (artifact F1 — self-declared "SAME FINDING AS" K1, i.e. one dedup root):

> ### F1 [RISK] — trailing / merged shell comments escape the guard (same root cause and summary string as the sibling docs-parity verdict)
>
> The predicate requires the comment to **begin** the composed line (`body_line.lstrip().startswith("#")`). A `${{ ... }}` in a _trailing_ shell comment is missed, and GitHub's value-level token scan is position-independent …
> Concrete trigger, demonstrated end-to-end on the real c20765e7 tree with the unmodified script: insert … `echo ok # ${{ ... }} substituted by GitHub BEFORE this shell`
> → script output: `PASS no shell comment inside a workflow run body spells a workflow expression (5A)` … `RESULT: PASS`. Control: the same token as a _full-line_ comment at the same spot → `FAIL … (5A)` + `RESULT: FAIL`, rc=1. So the guard is green on exactly the defect class it exists for, one word into the line.

### K2 — [RISK] folded block scalar (`run: >`) escapes the guard; line-mapping also assumes one source line per value line

- Comment **c425** on **t_7d05200b** (worker-reviewer-qwen, 2026-09-26 22:42); also in
  PR1306-review-5A5B.md F1 ("folded scalar `run: >` … not flagged" + "multi-line
  double-quoted `run:` scalar: same merge, same miss").
- file:line as stated: `infra/preview-vps/test_pinned_openssh.sh:294` (predicate) and `:292`
  (`span=2` line-mapping assumption).
- Verbatim (c425):

> **[RISK] Folded block scalar (`run: >`).** Trigger bytes: `        run: >` / `          echo start` / `          # ${{ ... }} folded comment` / `          echo end`. Guard rc=0. actionlint rc=1: `wf.yml:8:31: unexpected token "." … [expression]`. Cause: PyYAML folds the three body lines into ONE value line … whose lstrip starts with `echo` → `:294` never fires. `:292`'s `span=2` line-mapping also assumes one value line per source line, so a folded body would additionally mis-report line numbers if it ever did fire.

### K3 — [NIT] doc/test file-scope mismatch: doc says `*.yml`, 5A globs `*.yml` **and** `*.yaml` (both directions of the parity delta)

- Comment **c391** (and re-verified in **c549**) on **t_2ed2bb22** (worker-reviewer-kimi);
  scope note 1 of PR1306-parity-verdict.md; coverage row of PR1306-review-5A5B.md.
- file:line as stated: `docs/ops/preview-deploy.md:336` vs
  `infra/preview-vps/test_pinned_openssh.sh:259-261` (5B is `*.yml`-only at `:390`).
- Verbatim (c391):

> SECONDARY [NIT]: `docs/ops/preview-deploy.md:L336` constrains the set to `.github/workflows/*.yml`, but 5A globs `*.yaml` too (`test_pinned_openssh.sh:L259-L261`). Verified: `.github/workflows/alt.yaml` with the same line-leading comment → guard exit 1 (a file the doc's `*.yml` wording does not cover). Note 5B's actionlint call is `*.yml` only (L390), so doc and 5B agree with each other while 5A is wider than both.

### K4 — [INFO] in-comment conservatism: valid expressions in whole-line comments are flagged even though GitHub loads the file fine

- PR1306-review-5A5B.md **F2** (commit `343f45f3`); same class as "[NIT] 3" in comment
  **c425** on **t_7d05200b** (worker-reviewer-qwen).
- file:line as stated: `infra/preview-vps/test_pinned_openssh.sh:294` (rule stated at
  `:227-233`); `docs/ops/preview-deploy.md:336-337`.
- Verbatim (artifact F2):

> ### F2 [INFO] — intentional conservatism: valid expressions in comments are flagged too
>
> `# See ${{ secrets.X }} docs` (a _valid_ expression) as a run-body comment → FLAGGED, although GitHub loads such a file fine (it substitutes into the comment). This is the guard's documented contract … so it is not a false positive against its own spec; it is strictly broader than GitHub's loader.

### K5 — [NIT] reported line number is wrong for run scalars with embedded `\n` escapes

- PR1306-review-5A5B.md **F3** (commit `343f45f3`); inventoried as candidate finding in
  comment **c738** on **t_666dccb5** (worker-base, 2026-09-27 01:53).
- file:line as stated: `infra/preview-vps/test_pinned_openssh.sh:300`
  (`run.start_mark.line + span + offset`).
- Verbatim (artifact F3):

> ### F3 [NIT] — reported line number is wrong for run scalars with embedded `\n` escapes
>
> The arithmetic is exact for block scalars … but composed-line offsets ≠ physical lines for double-quoted scalars containing `\n` escapes. Concrete trigger … `run: "echo a\n# c ${{ x }} tail"` → reported as `wf.yml:9` — one line past the scalar; in a real workflow the diagnostic would point at an unrelated line. Verdict still correct (flagged, fail-closed), diagnostic only.

### K6 — [NIT] premise correction (review-question side, not a code defect): single-quoted run scalars are NOT safe from interpolation

- Comment **c425** on **t_7d05200b** (worker-reviewer-qwen, 2026-09-26 22:42).
- file:line as stated: `infra/preview-vps/test_pinned_openssh.sh:294` (5A silent on the
  shape), `:390`/`:394` (5B coverage when actionlint installed), `:383-384` (SKIP).
- Verbatim:

> **[NIT] 4 — premise correction on the single-quoted case.** Q(ii) assumes single quotes stop interpolation. They do not: YAML drops the quotes and GitHub substitutes in the resolved scalar regardless of quoting, so `run: 'echo ${{ x }}'` is itself a load-failure shape (actionlint rc=1 …). 5A is silent (value doesn't start with `#`, `:294`) → not a false positive, but not caught by 5A either; covered by 5B when actionlint is installed (`:390`, `:394`), `SKIP`ped when not (`:383-384`). Scope choice, flagged so "single-quoted is safe" is not assumed.

## 4. Chain artifacts that raise NO findings (for completeness)

- **t_7433d93e** c711 + **t_666dccb5** c709 (worker-base, 2026-09-27 01:28–01:30) —
  "GROUND TRUTH PINNED": detached head at `c20765e7…`, diff artifact (237 lines,
  sha256 `a95c26f7…`), changed files (3: preview-deploy.yml +2/−2, preview-deploy.md +7/−3,
  test_pinned_openssh.sh +183/−0), phantom-path check (none), and: GitHub thread surfaces on
  #1306 are **empty** (`issues/1306/comments`, `pulls/1306/comments`, `pulls/1306/reviews`
  all 0 rows at that time).
- **t_77abc183** c739 + **t_666dccb5** c738 (worker-base, 2026-09-27 01:53) — "BLOCKER:
  draft not found": the PR #1306 DRAFT review comment was never authored anywhere
  (t_3dd86d27 runs 421/427 crashed; three drafting sessions dead-spawned; sweeps of 117
  boards, 10 profile state DBs, filesystem, and the board repo's full git history were
  negative). This is why the "findings set" of the intended published review is UNDEFINED —
  the K1–K6 items above are the only #1306 findings that exist on the board.
- Board artifact tree also holds `PR1306-groundtruth-t_7433d93e.md` and
  `PR1306-draft-search-t_77abc183.md` (durable copies of the two comments above).

## 5. The three "known items" — not raised as findings on kanban

The card's three known items (`preview-deploy.yml:L107-L121` guard omits CF secrets;
`provision.sh:L88-L96` docker.io only, no compose v2 plugin; teardown job has no
`previews_ready` guard) appear on the board only as **dedup-known context** (quoted in the
task bodies of t_a9d42685, t_3dd86d27, t_71f487f7, t_666dccb5, t_9dc75303, t_ad8555bb,
t_ea176297, t_018476f0, t_f31d86c0 and the dedup fan-out) and in the parity artifact's
dedup sweep (which restates them with SHA-specific line numbers:
`preview-deploy.yml:118-132`, `provision.sh:124-131`, teardown guard `preview-deploy.yml:415-433`).
They originate from the **PR #1271** chain / GitHub comment 5618108451 (felixfelix-bot),
not from any kanban artifact; no kanban card raises them as a new #1306 finding.

## 6. One-line dedup list (canonical summary strings)

| id     | summary string                                                                                                                                                                                       | origin                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| K1/K1' | `infra/preview-vps/test_pinned_openssh.sh:293-294` trailing/merged shell comment with `${{` escapes 5A; doc over-claims (`docs/ops/preview-deploy.md:336-337`) — parity holds only via 5B/actionlint | t_2ed2bb22 (kimi c391/c549) + board artifacts 1609ca13/343f45f3 + t_7d05200b (qwen c425/c585) |
| K2     | `infra/preview-vps/test_pinned_openssh.sh:292-294` folded `run: >` scalar escapes 5A; span line-mapping assumes 1 value line per source line                                                         | t_7d05200b (qwen c425) + artifact 343f45f3                                                    |
| K3     | `docs/ops/preview-deploy.md:336` says `*.yml` but 5A globs `*.yml`+`*.yaml` (`test_pinned_openssh.sh:259-261`)                                                                                       | t_2ed2bb22 (kimi c391/c549) + artifact 1609ca13                                               |
| K4     | `test_pinned_openssh.sh:294` flags valid expressions in whole-line comments (in-comment conservatism, [INFO])                                                                                        | artifact 343f45f3 F2 + t_7d05200b c425 [NIT] 3                                                |
| K5     | `test_pinned_openssh.sh:300` line-number arithmetic wrong for DQ scalars with `\n` escapes ([NIT], diagnostic only)                                                                                  | artifact 343f45f3 F3; inventoried in t_666dccb5 c738                                          |
| K6     | premise: single-quoted run scalars are not interpolation-safe; 5A silent, 5B-only coverage ([NIT])                                                                                                   | t_7d05200b (qwen c425 [NIT] 4)                                                                |
