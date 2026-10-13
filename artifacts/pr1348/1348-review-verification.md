# PR #1348 — review-artifact verification (card t_6457008c)

Repo: PlebeianApp/market · Branch under review: `test/unit-suite-coverage` · Author: maxime-tt
Head SHA reviewed: `047d1709f6bbaf0b746fbd370692f09b7a254a0f`
Base: `auctions` (diff base `c9ec53b1`) · PR state at check time: **MERGED**
(merged 2026-09-21T13:34:05Z by Franchovy, merge commit `e8f31b4bdc9dae24d652718253314eacaf6929f4`)

## Outcome

The review this card asks for **already exists and is tip-covering**. It was published by a prior
run of this same card lineage. No second review was posted (that would be duplicate noise on a
merged PR). Every required publish step was verified against GitHub, and the one step that was
genuinely missing (`last_reviewed_sha` in the gate state) has been recorded.

| Required publish step | State | Evidence |
|---|---|---|
| Review posted on the PR citing the head SHA | ALREADY DONE | review id `5258659417`, `felixfelix-bot`, `commit_id == 047d1709f6bbaf0b746fbd370692f09b7a254a0f`, submitted 2026-09-20T00:54:37Z, body cites the full head SHA |
| `APPROVED` stated in the review body (bot posts approvals as comments) | ALREADY DONE | same review, `state=COMMENTED`, body opens `**APPROVED.**` |
| `last_reviewed_sha` recorded in gate state | DONE THIS RUN | `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` → `prs["1348"]["last_reviewed_sha"] = 047d1709f6bbaf0b746fbd370692f09b7a254a0f` |

## Why no second review was posted

`plebeian-review-detector.py` (cron `af624589c774`) and `plebeian-pr-review-gate.py` both decide
"already reviewed" via `reviews_by_us_at(pr, head)`: any review object from `felixfelix-bot`/`c03rad0r`
whose `commit_id` equals the current head counts as tip coverage (gate script lines 143-174). For
#1348 that predicate is already **True**:

```
gh api repos/PlebeianApp/market/pulls/1348/reviews
  {id 5258659417, felixfelix-bot, COMMENTED, commit_id 047d1709f6bbaf0b746fbd370692f09b7a254a0f}
  {id 5267231959, Franchovy,     APPROVED,  commit_id 047d1709f6bbaf0b746fbd370692f09b7a254a0f}
```

Independently, the detector iterates `gate.get_open_prs()` — **open** PRs only — and #1348 is
MERGED/closed, so it can never be selected for dispatch again. Re-posting would add a second
APPROVED comment to a merged PR with zero information gain.

## Independent re-derivation of the published review's claims (this run)

| Claim in the published review | Independent check | Result |
|---|---|---|
| `getMessageSnippet` reads `event.pubkey` at `src/queries/messages.tsx:56` | `git show 047d1709:src/queries/messages.tsx` → line 56 = `const isOwnUser = event.pubkey === authStore.state.user?.pubkey`; function defined at `:49` | CONFIRMED |
| Old glob = 91 files, new glob = 112 files (+21 net) | `git ls-tree -r --name-only <sha>` + the two globs, at BOTH `c9ec53b1` and `047d1709` | CONFIRMED (91 → 112 at both) |
| Test fix is fixture-shape only (`author: { pubkey }` → `pubkey`) | full `git diff` of `src/lib/utils/message-content.test.ts` = 5 hunks, all fixture-shape, `README` no assertion-value change beyond the field | CONFIRMED |
| Runner bump `bun@1.3.4` → `1.4.2` in lockfile + devDep pin | `git diff c9ec53b1 047d1709 -- bun.lock` shows every `@oven/bun-*` package 1.3.4 → 1.4.2; `package.json` adds `"bun": "1.4.2"` | CONFIRMED |
| CI green at head | `gh pr checks 1348` → unit-integration pass (2m19s), prettier pass, security-scan pass, footprint pass, e2e-grep pass, e2e-full skipped | CONFIRMED |

Note: the working tree of the offload branch (`worker-heavy/1286-dedupe-spam-f7`) sits on a
different base, where `src/queries/messages.tsx:56` reads `event.author?.pubkey`. The citation must be
read at the reviewed SHA (as done above), not from the offload tree — they are different revisions.

## Card provenance

- `t_6457008c` (this card, `HERMES_KANBAN_TASK`) — **archived** by manager 2026-09-19 with comment:
  "Duplicate review card — created by plebeian-review-detector's broken dedup (it inspected only the
  last line of `kanban ls`...). Root cause fixed 2026-09-19; this card is archived, the oldest open
  card for the same title (t_f62137d1) is kept."
- `t_8320ecdd` — **done**: the run that actually published the review (run 1175), plus a later
  no-op redispatch (run 1207) confirming "PR head still 047d1709…".
- `t_f62137d1` — **blocked**: fleet loop guard (`looped 8x in 6h`), then `fleet-done rc=75
  verified=True (offloaded) -> blocked`.

## Verdict on the PR

**APPROVED** (no BLOCK / RISK / NIT findings). The published review's conclusions reproduce under
independent commands. The only caveat already noted there stands and is not a regression: the two
excluded files (`src/ws.test.ts`, `src/lib/tests/newProduct.test.ts`) are picked up by no workflow
before or after this PR — a pre-existing gap worth a follow-up issue.
