# PR #1347 — review-artifact verification (this run, 2026-10-09)

Repo: PlebeianApp/market · PR #1347 · branch `ci/e2e-gate-coverage` · author maxime-tt
Base: `auctions` (diff base `c9ec53b1`) · **head SHA: `94129b495c9f738c13f79326bfdd2d0f97268306`**
PR state at check time: **MERGED** (merged 2026-09-21T13:32:53Z by Franchovy, merge commit
`e1fb151453eec1bfc5e301ac7619c2c98015dc74`) · `reviewDecision: APPROVED`

## Outcome

The review this card asks for **already exists and is tip-covering**. It was published by a prior
run of this same card lineage (t_6ab2a344; the doctrine in
`skills/github/review-draft-verification/SKILL.md` records that Gate 2.5 audit). No second review
was posted — that would be duplicate noise on a merged, already-APPROVED PR. Every required publish
step was verified against GitHub, and the one step that was genuinely missing
(`last_reviewed_sha` in the gate state) has been recorded.

| Required publish step | State | Evidence |
|---|---|---|
| Review posted on the PR citing the head SHA | ALREADY DONE | review id `5258605183`, `felixfelix-bot`, `state=COMMENTED`, `commit_id == 94129b495c9f738c13f79326bfdd2d0f97268306`, submitted 2026-09-20T00:43:18Z; body's first line cites the full head SHA |
| `APPROVED` stated in the review body (bot posts approvals as comments) | ALREADY DONE | same review, body closes `**APPROVED**`; no `[BLOCK]`/`[RISK]` findings |
| `last_reviewed_sha` recorded in gate state | **DONE THIS RUN** | `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` → `prs["1347"]["last_reviewed_sha"] = 94129b49…` |

Maintainer approval independent of the bot lane: `Franchovy` APPROVED at the same commit
(review id `5267219699`, 2026-09-21T13:32:43Z), then merged.

## Why no second review was posted (mechanism, not preference)

`plebeian-pr-review-gate.py` and `plebeian-review-detector.py` decide "already reviewed" via
`reviews_by_us_at(pr, head)` (gate script lines 143-174): any review object from
`felixfelix-bot`/`c03rad0r` whose `commit_id` equals the current head counts as tip coverage. For
#1347 that predicate is already **True**:

```
gh api repos/PlebeianApp/market/pulls/1347/reviews
  {id 5258605183, felixfelix-bot, COMMENTED, commit_id 94129b495c9f738c13f79326bfdd2d0f97268306}
  {id 5267219699, Franchovy,     APPROVED,  commit_id 94129b495c9f738c13f79326bfdd2d0f97268306}
```

Independent of that, `get_open_prs()` (gate script line 88-90) queries
`repos/PlebeianApp/market/pulls?state=open` — a MERGED PR is never returned, so #1347 can never be
selected for dispatch again. Re-posting would add a second APPROVED comment to a merged PR with
zero information gain.

## Independent re-derivation of the published review's claims (this run, all read-only)

Working tree for the test run: detached worktree `/home/c03rad0r/worktrees/pr1347-verify` at the
reviewed head, `node_modules` symlinked from the main checkout. The offload branch itself sits on a
different base, so every source read was done at `94129b49` (via `git show` / `gh api contents?ref=`).

| Claim in the published review | Independent check | Result |
|---|---|---|
| Base `c9ec53b1`: gate grep lacks `Collection Management` while `--grep-invert` has it → family ran in NO job | `git show c9ec53b1:.github/workflows/e2e.yml` → GATE 17 terms (absent), INVERT 15 terms (present) | CONFIRMED |
| Head adds `\|Collection Management` to the gate at `e2e.yml:178`, invert untouched at `:326` | head file: line 178 = the gate `run:` with `\|Collection Management\|`; line 326 = the `--grep-invert` list still carrying `Collection Management` | CONFIRMED (line numbers exact) |
| New `invert ⊆ gate` describe at test `:96-109` | head file lines 96-109 are exactly that describe incl. `invertPattern()` | CONFIRMED |
| "4 tests pass under `bun test`" | `bun test src/lib/__tests__/e2e-workflow-gate-membership.test.ts` → `4 pass / 0 fail / 13 expect() calls` | CONFIRMED verbatim |
| The guard pins the regression class | sensitivity probe: delete `\|Collection Management\|` from the gate → new test fails with `expect(received).toEqual(expected) - [] + ["Collection Management"]` (3 pass / 1 fail); restored clean | CONFIRMED |
| `e2e/tests/collections.spec.ts:116` = `test.describe('Collection Management', () => {` | exact line at head | CONFIRMED |
| INFO #2: gate − invert = `Lightning Mock`, `OG Meta Tags`, `Test listing labels — auctions` | Python set difference on the two patterns at head | CONFIRMED (exactly those three) |

Set deltas at head (mechanical): gate = 18 terms, invert = 15 terms; **`invert − gate` = `[]`**;
**`gate − invert` = `['Lightning Mock', 'OG Meta Tags', 'Test listing labels — auctions']`**.

Head CI at `94129b49`: `unit-integration` success, `e2e-grep` success (17m58s), `prettier` success,
`security-scan` success, `footprint` success, `e2e-full` skipped (expected on PR events).

## Verdict on the PR

**APPROVED** (no BLOCK / RISK findings). The published review's conclusions reproduce under
independent commands. The two INFO caveats it recorded stand; the Gate 2.5 audit this run
(`deepseek-flash` failover lane, glm lane down) returned `AUDIT-PASS-WITH-NITS` with one residual
NIT of the same class as INFO #1 — nothing new to post.
