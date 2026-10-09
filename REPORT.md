# REPORT — PR #1348 review artifact verification (card t_6457008c)

Worker: worker-reviewer-kimi (offload) · Workspace: /home/c03rad0r/repos/market
Offload branch: `worker-heavy/1286-dedupe-spam-f7`
Task: review PlebeianApp/market `test/unit-suite-coverage` @ `047d1709f6bb` (PR #1348, author
maxime-tt), cross-family, Gate 2.5 cold audit, then publish and record `last_reviewed_sha`.

## Status

COMPLETE for the parts that were still outstanding. The review itself **already exists on the PR and
is tip-covering** — it was published by a prior run of this card lineage (`t_8320ecdd`, run 1175,
2026-09-20). I verified that artifact against GitHub with my own commands, independently re-derived
its technical claims at the reviewed SHA, and recorded the one publish step that was genuinely
missing (`last_reviewed_sha` in the gate state). I deliberately did **not** post a second review.

## 1. What the card asked for vs. what was already true

The card body was generated from the detector template (detector source
`~/.hermes/profiles/manager/scripts/plebeian-review-detector.py`, lines 317-319) and assumes no
review exists yet. That premise is false for #1348:

| Card requirement | Actual state | Evidence |
|---|---|---|
| `gh pr review <n> --comment` citing the head SHA | already satisfied | review `5258659417` by `felixfelix-bot`, `commit_id = 047d1709f6bbaf0b746fbd370692f09b7a254a0f` |
| state **APPROVED** in that body | already satisfied | same body opens `**APPROVED.**` (`state=COMMENTED` — felixfelix-bot has pull-only perms, so approvals are published as comments by design) |
| record `last_reviewed_sha` in gate state | **was missing** → fixed this run | see §4 |

## 2. PR facts (verified this run)

```
gh pr view 1348 --repo PlebeianApp/market --json number,title,state,headRefName,headRefOid,baseRefName,author,additions,deletions,changedFiles,mergedAt,mergedBy,mergeCommit
  number 1348 · state MERGED · mergedAt 2026-09-21T13:34:05Z · mergedBy Franchovy
  headRefName test/unit-suite-coverage · headRefOid 047d1709f6bbaf0b746fbd370692f09b7a254a0f
  baseRefName auctions · author maxime-tt · +30 / -32 / 3 files
  mergeCommit e8f31b4bdc9dae24d652718253314eacaf6929f4
```

Scope (3 files): `package.json` (test:unit / test:unit:watch globs + `bun: 1.4.2` devDep),
`bun.lock` (bun 1.3.4 → 1.4.2), `src/lib/utils/message-content.test.ts` (5 fixture-shape hunks).

## 3. Independent re-derivation of the published review's claims

All done with my own commands against the reviewed SHA (never from the offload tree, which is on a
different base).

1. **Source grounding of the test fix.** `git show 047d1709:src/queries/messages.tsx` — `getMessageSnippet`
   is defined at `:49`, and `:56` reads
   `const isOwnUser = event.pubkey === authStore.state.user?.pubkey`. The pre-PR fixtures passed
   `author: { pubkey }` (NDKEvent wrapper shape), so `event.pubkey` was `undefined` and every
   "own message" case exercised the received-message branch. The 5 hunks flip the fixture to the
   field the implementation actually reads. **Review's citation confirmed.**
   *Caveat worth recording:* on the offload branch's base, `messages.tsx:56` reads
   `event.author?.pubkey` — same line number, different content. Line citations are only valid at
   the SHA they were cut from.
2. **Glob widening.** `git ls-tree -r --name-only` at both `c9ec53b1` (base) and `047d1709` (head):
   old 3-dir glob = **91** files; new `contextvm src` glob minus the 2 exclusions = **112** files.
   +21 net. Matches the review's 91 → 112 exactly. (The PR body's "23 files" counts files outside
   the three old dirs before subtracting the 2 exclusions.)
3. **Diff is fixture-shape only.** Full `git diff c9ec53b1 047d1709 -- src/lib/utils/message-content.test.ts`
   = 5 hunks, each `author: { pubkey: X }` → `pubkey: X`; no assertion value or expectation string
   changed. Matches the review's correction (11 → 5 hunks).
4. **Runner pin.** `git diff c9ec53b1 047d1709 -- bun.lock`: every `@oven/bun-*` platform package
   1.3.4 → 1.4.2 (and new platforms appear, e.g. freebsd/android); `package.json` gains
   `"bun": "1.4.2"` in devDependencies.
5. **CI at head.** `gh pr checks 1348` / `statusCheckRollup`:
   `unit-integration` SUCCESS (2m19s), `prettier` SUCCESS (24s), `security-scan` SUCCESS (12s),
   `footprint` SUCCESS (3s), `e2e-grep` SUCCESS (15m5s), `e2e-full` SKIPPED. Matches the review.

Nothing in the published review failed to reproduce. No BLOCK / RISK / NIT findings — the PR is
sound, and it is in any case already merged.

## 4. Gate state update (publish step 3 — the only missing step)

Target file (the one both `plebeian-pr-review-gate.py` and `plebeian-review-detector.py` load/save;
`STATE_FILE` default at gate script line 40-41):

```
~/.hermes/profiles/manager/state/plebeian-pr-review-state.json
```

Before: `prs` had 42 entries; **`prs["1348"]` was absent**. After (atomic write, backup kept at
`.bak-pr1348-last-reviewed-sha`):

```json
"1348": {
  "last_reviewed_sha": "047d1709f6bbaf0b746fbd370692f09b7a254a0f",
  "last_reviewed_at": "2026-10-09T14:20:00+00:00",
  "last_checked": "2026-10-09T14:20:00+00:00",
  "review_id": 5258659417,
  "review_state": "COMMENTED",
  "review_body_says": "APPROVED",
  "reviewer": "felixfelix-bot"
}
```

43 entries after; sibling entries byte-identical (spot-checked `prs["1402"]`). This satisfies both
the card's step 3 and the belt-and-braces branch in `needs_review()` (gate script line 200:
`current_head == pr_state.get("last_reviewed_sha")` → never dispatch).

## 5. Why I did not post a second review (explicit decision)

Three independent reasons, any one of which is sufficient:

1. `reviews_by_us_at(1348, 047d1709…)` already returns **True** (gate script lines 143-174 look at
   both `/pulls/N/reviews` by `commit_id` and `/issues/N/comments` by cited-SHA). The pipeline
   itself already considers this PR reviewed at tip.
2. The detector iterates `gate.get_open_prs()` — **open** PRs only (line 90, `state=open`). #1348 is
   MERGED, so it cannot be selected for dispatch again no matter what the state file says.
3. The PR already carries two same-SHA reviews (ours, `COMMENTED`+`APPROVED` text; Franchovy's,
   native `APPROVED`). A third would be duplicate noise on a merged PR, on a workspace whose whole
   theme is dedupe/spam.

If the manager disagrees and wants a fresh comment anyway, the exact command is:

```
gh pr review 1348 --repo PlebeianApp/market --comment --body-file artifacts/pr1348/1348-review-verification.md
```

(That would post the verification text verbatim; it is not run here.)

## 6. Card provenance / why this card exists at all

- `t_6457008c` — **this** card (`HERMES_KANBAN_TASK=plebeian-pr-reviews:t_6457008c`). **archived**
  2026-09-19 by the manager: *"Duplicate review card — created by plebeian-review-detector's broken
  dedup (it inspected only the last line of `kanban ls`, so it never saw the existing card). Root
  cause fixed 2026-09-19; this card is archived, the oldest open card for the same title
  (t_f62137d1) is kept."*
- `t_8320ecdd` — **done**. The run that published the review (run 1175) plus a no-op redispatch
  (run 1207) that confirmed the review already existed.
- `t_f62137d1` — **blocked**. Fleet loop guard (`looped 8x in 6h`), then `fleet-done rc=75
  verified=True (offloaded)`.

I was dispatched onto the archived duplicate. The work is not merely redundant — it is *done*.

## 7. Gate 2.5 (cold audit) note

The card asks for a Gate 2.5 cold audit of a draft before publishing. There is no draft to audit:
the artifact under audit is the already-published review, and I audited it directly (§3) rather than
dispatching a subagent to review a review I did not author for a PR that is already merged. Dispatching
`worker-reviewer-glm` here would spend tokens to re-derive claims that are (a) already public and
(b) reproduced in §3. If the manager wants the cold-audit stamp recorded regardless, that is the one
remaining discretionary step.

## 8. Commit + push record (observed)

Filled in after the push below (see git log on `worker-heavy/1286-dedupe-spam-f7`). Targets: `dr`
(felixfelix-bot/market) and `fork` — the same pair used by every prior pass on this offload branch.
Nothing is written to PlebeianApp/market.

## 9. Remaining steps for the manager

1. Close/re-archive this duplicate lineage if it re-appears (detector dedup should already prevent it).
2. Optionally post the verification text as a comment if a fresh artifact is wanted (§5 command).
3. Optionally record the Gate 2.5 cold-audit stamp (§7).
4. Follow-up (not a blocker, pre-existing): `src/ws.test.ts` and `src/lib/tests/newProduct.test.ts`
   are matched by neither `test:unit` nor `test:integration` — they run in no workflow.
