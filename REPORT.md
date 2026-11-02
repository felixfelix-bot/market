# REPORT — Contribution-PR offer for PlebeianApp/market#1319 — SKIPPED (no [BLOCK]/[RISK] finding)

Worker: `worker-heavy` (Hermes, fleet offload) · Repo: `market` ·
Worktree: `/home/c08r4d0r/repos/market-1319-dedup` (branch `task/1319-contribution-dedup`)
Run: 2026-11-02 ~21:05–21:15Z

## Verdict

**No contribution PR required.** The task is CONDITIONAL on the published review of #1319
containing at least one real `[BLOCK]`/`[RISK]` finding. It contains none — the review is
NIT/INFO-only and its verdict text is `APPROVED`. Per the task's own instruction, NIT/INFO-only
reviews mean skip and report.

**Deduplication was clean on all three axes.** This is not a dedup skip; the severity gate
stopped it. No kanban fix task was created, no branch was offered to the author, no push was made
to `maxime-tt/market`.

---

## Condition 1 — `is_own` is false → PASS

```
$ curl -s https://api.github.com/repos/PlebeianApp/market/pulls/1319 | jq '{number,title,state,author:.user.login,head:.head.sha,head_ref:.head.ref,head_repo:.head.repo.full_name,base:.base.ref}'
{
  "number": 1319,
  "title": "docs: NIP-46 remote signer identity separation invariants (ref. #1290)",
  "state": "open",
  "author": "maxime-tt",
  "head": "5067affba283597207a628cec177535a0d9ecf28",
  "head_ref": "docs/nip46-identity-invariants",
  "head_repo": "maxime-tt/market",
  "base": "master"
}
```

External author (`maxime-tt`), cross-repo head (`maxime-tt/market`). Confirmed not ours.

---

## Condition 2 — published review contains >=1 REAL [BLOCK]/[RISK] → **FAIL**

### Supply sweep first (to make sure no finding lives outside the review body)

```
$ curl -s ".../pulls/1319/reviews?per_page=100"      -> 200, array length 1
$ curl -s ".../pulls/1319/comments?per_page=100"     -> {"n":0,"bodies":[]}      # inline review comments
$ curl -s ".../issues/1319/comments?per_page=100"    -> {"n":0,"items":[]}       # conversation comments
$ jq -r '[.[].state],[.[].user.login]' on reviews    -> ["COMMENTED"] ["felixfelix-bot"]
```

Reviews total: **1**. Inline comments: **0**. Issue comments: **0**. There is exactly one
authored body to classify, and its `commit_id` is the current head
`5067affba283597207a628cec177535a0d9ecf28` — the review is on the exact head the task names.

### Severity scan of that body

```
$ jq -r '.[0].body' reviews.json > /tmp/review_body.md
$ grep -n -E '\[?(BLOCK|RISK)\]?' /tmp/review_body.md
grep_exit=1 (1 = no BLOCK/RISK token at all)

$ grep -o -E '\*\*\[[A-Z]+\]\*\*' /tmp/review_body.md | sort | uniq -c
      1 **[INFO]**
      2 **[NIT]**

$ grep -n -E 'VERDICT|Verdict|APPROVED' /tmp/review_body.md
39:**APPROVED** at `5067affba283` — docs-only, zero runtime risk, all cited patterns and file
   references verified accurate against PR #1290 head. Two NITs above are suggestions for clarity /
   accuracy of the doc itself; none block.
```

The review's own findings section reads: *"None blocking. Three things worth flagging as
author-visible INFO/NITs."*

### The three findings, verbatim, so the classification is auditable

1. **[NIT]** `docs/handover/nip46-remote-signer-identity-separation.md:39` — the handover doc cites
   PR #1290's head as `272839a4`, a stale intermediate commit; the actual final head is `2817bb5a`.
   The patterns themselves match `2817bb5a` exactly, so only the hash string is wrong.
2. **[NIT]** `docs/handover/nip46-remote-signer-identity-separation.md:36` — Patterns A–F describe
   code that exists on PR #1290's (closed, unmerged) branch and not on master. The doc is
   forward-looking guidance rather than a description of current `master`. Suggest one clarifying
   sentence.
3. **[INFO]** `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md` — the OG Meta bullets and
   "Amendment (2026-09)" text in the diff are already on master via #1316; the net-new ADR content is
   only the I2 update bullet. "No action needed."

All three are documentation-precision suggestions on a `docs`-only PR with zero runtime surface.
None asserts a defect that blocks merge or carries a risk claim. Classification is correct as
published: NIT, NIT, INFO.

### Why this is a genuine stop, not a technicality

The condition exists so we only offer code to an author when a reviewer found something that
matters. Here the sole reviewer approved the PR and explicitly said nothing blocks. Manufacturing a
contribution PR out of a stale-hash NIT would be exactly the "we force, we don't offer" failure the
authority clause forbids — the author owns this PR, and the honest read of the review is that it is
mergeable as-is. `[RISK]` in the task title refers to the *class* of finding we were sent to fix,
not a finding that exists.

---

## Dedup (mandatory, executed anyway, all three CLEAR)

### (a) no open fix task on the `plebeian` board

```
$ hermes kanban --board plebeian ls | grep 'PR #1319'
grep exit=1 (1=none)
```

Board output confirms `Board: plebeian (125 other boards)` and zero matching lines.

Backstop, because a title grep only proves the title is clean: a read-only scan of the full
`~/.hermes/kanban.db` across **every board** and every text column
(`title`, `body`, …) plus `task_comments`:

```
tasks columns: ['id','title','body','assignee','status','priority','created_by','created_at', …]
rows matching '1319' across ALL tasks in ALL boards: 0
task_comments matching 1319: 0
```

No fix task for #1319 exists anywhere in the fleet ledger.

### (b) no contribution PR already open on the author's fork

```
$ curl -s "https://api.github.com/repos/maxime-tt/market/pulls?state=all&per_page=100" \
  | jq -r '.[] | "PR #\(.number) [\(.state)] head=\(.head.label) base=\(.base.ref) user=\(.user.login) title=\(.title)"'

PR #3 [open] head=felixfelix-bot:fix/1401-prettier-routetree base=feat/v4v-zap-payout user=felixfelix-bot title=chore(format): prettier --write src/routeTree.gen.ts (fixes prettier CI on PlebeianApp/market#1401)
PR #2 [open] head=felixfelix-bot:fix/pr1401-prettier-routeTree base=feat/v4v-zap-payout user=felixfelix-bot title=style: run prettier --write on src/routeTree.gen.ts
PR #1 [open] head=felixfelix-bot:pr/1383-refresh-base base=fix/1329-auctions-component-migration user=felixfelix-bot title=chore: refresh #1383 onto auctions tip (single import-line conflict)
```

Three prior bot contribution PRs exist on the author's fork, but all three target branches other
than `docs/nip46-identity-invariants` (`feat/v4v-zap-payout`, `fix/1329-auctions-component-migration`)
and reference #1401 / #1383 — **none** references #1319. So: no contribution PR for this PR is open.

### (c) the author has not already merged a previous contribution for this PR

```
$ curl -s "https://api.github.com/repos/maxime-tt/market/pulls?state=closed&per_page=100" \
  | jq -r '"merged PRs on author fork: \(length)"'
merged PRs on author fork: 0
```

Zero merged PRs on the fork — nothing was ever accepted, so nothing was superseded. Also verified
the author's PR head is still live at the SHA the task names:

```
$ git ls-remote --heads maxime-tt refs/heads/docs/nip46-identity-invariants
5067affba283597207a628cec177535a0d9ecf28	refs/heads/docs/nip46-identity-invariants
```

---

## What was and was not done

- **Not created:** the `plebeian`-board fix task assigned to `worker-pr-fixer`. Gate 1 of the
  task ("run only if ALL hold") failed, so creating it would be an unauthorized expansion of scope.
- **Not pushed:** nothing went to `maxime-tt/market` (or anywhere else) as a contribution. Only this
  ledger branch, which is ours.
- **Not written:** no `src/`, `docs/`, `e2e/`, or `contextvm/` changes. No fix was implemented,
  because there is no `[BLOCK]`/`[RISK]` to implement.
- **Left for the author:** the two `[NIT]`s are still worth taking — the stale `272839a4` hash at
  `docs/handover/nip46-remote-signer-identity-separation.md:39` is a one-word correction, and the
  forward-looking-vs-current clarification at line 36 is a one-sentence addition. Both are offered
  as observations only; the PR is the author's to land.

## Gate 6 / status

No fix task exists to set `status=review` on. If the maintainer wants the two NITs landed anyway,
that is a new decision and needs a new task — the CONDITIONAL gate as written does not authorize it.

## Artefacts

- This report: `/home/c08r4d0r/repos/market-1319-dedup/REPORT.md`
- Progress ledger: `/home/c08r4d0r/repos/market-1319-dedup/PROGRESS.md`
- Raw review JSON: `/tmp/pulls_1319_reviews.json`, PR JSON: `/tmp/pr1319.json`
- Prior #1332 report preserved from the primary checkout at `REPORT-1332-prior.md`
  (and `~/.hermes/profiles/worker-heavy/cache/scratch/REPORT-1332-prior.md.bak`)
