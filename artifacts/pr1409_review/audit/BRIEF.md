# Cold-audit brief — draft review of PR #1409 (kimi / Gate 2.5)

You are a cold auditor (kimi family, Moonshot). You are auditing a DRAFT code
review BEFORE it is published on GitHub. Your job: verify every claim in the
draft FIRST-HAND against the actual bytes at the PR head commit and against the
live GitHub record. You are NOT writing a review of the PR — you are auditing
the REVIEW. Catch: false claims, wrong line numbers, unsourced assertions,
quotes that are paraphrase, missed defects, tone violations.

## Setup facts (verified by the drafter, re-verify cheaply)

- Repo: /home/c03rad0r/repos/market, remote `origin` = PlebeianApp/market
- PR #1409 "docs(adr): mark auction BFT decision accepted", author maximotodev
- Head SHA: `8cf24b9ec134844ef6ebca5d87393a59e8fd0ee7` (MERGED 2026-10-05T23:02:47Z)
- Parent of head: `78c10f48bb674bd979955986b8c6c0cd9520b23b` (= #1407's merge commit)
- Changed files at head (2, +8/−7, docs only):
  - docs/adr/ADR-0017-four-validator-bft-consensus-for-plebeian-auctions.md
  - docs/adr/README.md
- gh is authenticated read-only as felixfelix-bot; use `gh api`/`gh pr view`
  GETs ONLY. Do NOT post/comment/review/write anything. Do NOT modify the repo
  working tree (it holds uncommitted work from another lane). Read files via
  `git show <sha>:<path>` only, or /tmp copies.
- Write your notes incrementally to /tmp/pr1409_audit/audit-verdict.md
  (mkdir -p /tmp/pr1409_audit first). After EACH numbered step append one line:
  `STEP N: <PASS|FAIL> <one-line finding, cite the command>`.
  This survives provider 503s. Your final message should be short; the file is
  the artifact.

## The draft under audit

Read: /home/c03rad0r/repos/market/artifacts/pr1409_review/REVIEW.md

## Method — run each step, append the STEP line to your file as you go

1. Read the draft fully.
2. Line-number check: extract the head file once:
   `git -C /home/c03rad0r/repos/market show 8cf24b9ec134844ef6ebca5d87393a59e8fd0ee7:docs/adr/ADR-0017-four-validator-bft-consensus-for-plebeian-auctions.md > /tmp/pr1409_audit/head_adr.md`
   (README likewise to /tmp/pr1409_audit/head_readme.md). For each cite in the
   draft — ADR :5, :67, :71, :95, :96-98, :226, :230, :232, :234-240; README :25 —
   run `awk 'NR==<n>' <file>` and confirm the draft's characterization matches
   the actual line.
3. Claim "two status cells agree with each other but disagreed with reality"
   before, agree after: verify base status cells are Proposed (git show
   78c10f48:...:5 and README:25) and head cells are Accepted.
4. Claim "choices 1-7 byte-identical to the pre-merge text": diff
   `git show 78c10f48:docs/adr/...md` lines for the 7-item list vs head's
   (sed -n '/^1\. \*\*4 validators/,/^7\. a separate/p' on both).
5. Claim "ratified and PR #1407 was merged" matches the GitHub record:
   `gh pr view 1407 --repo PlebeianApp/market --json state,mergedAt,reviewDecision,headRefOid`
   and `gh api repos/PlebeianApp/market/pulls/1407/reviews --jq '[.[]|{user:.user.login,state,at:.submitted_at}]'`
   Confirm Franchovy APPROVED on 2026-10-05 before the merge, and #1409's
   parent is #1407's merge commit (`git -C /home/c03rad0r/repos/market log --format='%P' -1 8cf24b9ec134`).
6. Claim "leader-change amendment is commit 6ca781fb, lands after this head,
   not in this diff": `git -C /home/c03rad0r/repos/market show --stat 6ca781fb`
   and confirm 6ca781fb is a DESCENDANT of the head
   (`git -C /home/c03rad0r/repos/market merge-base --is-ancestor 8cf24b9ec134 6ca781fb; echo $?` -> 0)
   and that the PR diff (78c10f48..8cf24b9ec134) contains nothing from it:
   `git -C /home/c03rad0r/repos/market diff 78c10f48 8cf24b9ec134 --stat` = exactly 2 files.
7. Claim "tree sweep: no other file references ADR-0017 or its status; no
   leftover 'decision requested' / 'does not ratify' anywhere in docs/": run
   `git -C /home/c03rad0r/repos/market grep -n -i "ADR-0017\|four-validator\|auction BFT" 8cf24b9ec134 -- . | grep -v "docs/adr/ADR-0017\|docs/adr/README.md"`
   (expect empty) and `git -C /home/c03rad0r/repos/market grep -n "decision requested\|does not ratify" 8cf24b9ec134 -- docs/` (expect empty).
   NOTE: ripgrep/search_files silently skips hidden dirs — use git grep.
8. CI claim: `gh api repos/PlebeianApp/market/commits/8cf24b9ec134844ef6ebca5d87393a59e8fd0ee7/check-runs --paginate --jq '[.[]|{name,conclusion}]'`
   — confirm the 5 required + Deploy preview are green, e2e-full skipped, one
   "Tear down preview" failure with failed step "Prepare SSH key + pinned host
   key" (`gh api repos/PlebeianApp/market/actions/jobs/112019971657 --jq '[.steps[]|select(.conclusion=="failure")|.name]'`).
9. NIT claim (:67,:71,:95 say "proposed"): grep the head file for "proposed" —
   confirm exactly those three occurrences remain and the draft didn't miss a
   fourth. Also confirm :96-98 carries the **NOT_RUN** verification requirement.
10. Missed-defect sweep: read the FULL diff
    (`git -C /home/c03rad0r/repos/market diff 78c10f48 8cf24b9ec134`) and the
    two head files' surrounding sections. Ask: does the status flip contradict
    anything else in the repo? Does the registry have any OTHER place ADR-0017
    status is duplicated that this PR missed (search README.md fully)? Does the
    ADR text contain any other "Proposed"-only framing (## Status front-matter
    vs registry vs numbering-gaps section)? Is anything in the draft's wording
    an overclaim (e.g. "byte-identical" where it isn't)?
11. Tone/structure check: blunt correctness-first, never person-directed;
    findings tagged [BLOCK]/[RISK]/[NIT]/[INFO] with file:line; verdict states
    APPROVED with no change requests (docs-only status flip, PR already merged
    — COMMENTED review is the lane pattern here; APPROVED is stated in the body
    per the dispatch).
12. Final verdict — append to your file:
    `AUDIT_VERDICT: <CONFIRMED | CONFIRMED_W_AMENDMENTS | REJECTED>`
    `AMENDMENTS: <list each, or "none">`
    `MISS_CANDIDATES: <defects the draft missed worth adding, or "none">`

Be skeptical. Verify, don't trust. Every finding must cite the bytes you checked.
Your final reply: 5-10 lines summarizing the verdict + the path to your audit file.
