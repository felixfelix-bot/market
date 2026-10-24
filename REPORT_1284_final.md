# REPORT — PR #1284 review (live re-dispatch) — terminal verdict

Task brief: review PlebeianApp/market PR #1284 at head `5963fc77bd1c16b6b113f4d6f3c6ad42136725b1`, author
`hkarani` (`is_own: false`). Worker: worker-heavy (CobradorWave). Branch
`worker-heavy/1284-publish-review`. Date 2026-10-24.

Live card carrying this brief: `t_cb288450` ("Review PR #1284 …"), board `plebeian-pr-reviews`, status `ready`.
An identical card `t_84b7c185` ("Publish approved review for PR #1284 and run contribution-PR dedup") was
already carried to completion by a previous worker of this same lane; its report is `REPORT_1284.md`.

## VERDICT

**Nothing is published. The brief's publish precondition does not exist, and the contribution-PR follow-up
is already done. No GitHub writes of any kind were made (verified: 6 comments on #1284, none after
2026-09-25; zero reviews by us after that date).** Per the brief's own fallthrough path, the draft-less
state is recorded on kanban and the card is set to `review`. This run independently re-verified every
load-bearing fact of `REPORT_1284.md` against live GitHub; all held.

## Independently re-verified facts (this run)

1. **PR #1284 is MERGED.** `state=MERGED`, `mergedAt=2026-09-25T12:32:41Z`, merge commit
   `a3a76b6c9752f8e3cccf85ff74ce4feea4a922f4`, base `auctions`, live head `22a1cebd647c6b59d929725f5d288a8c4326a4ce`.
2. **The briefed head SHA is not a head of the PR.** `5963fc77…` exists in the repo (subject
   `fix(tests): self-hosted regression coverage`, parent `ed49aa21…`) but is **absent from the PR's
   22-commit list** (`grep -c` on `pulls/1284/commits` = 0). It is an interior review anchor (first parent
   of merge `61f6d307`), not `headRefOid`. Reviewing "the tip" at that SHA is not a well-defined act.
3. **GATE 2.5 never produced a verdict.** Card `t_cdda8b3f` is `archived`, no APPROVED/REJECTED; all 4 runs
   blocked (`#455`, `#507`, `#2358`, `#2365` — dead-worker reclaim backoff). Its parent `t_15b38bcf`
   produced **no draft at all**: it STOPPED at its own STEP 1 head-match rule and wrote a stop report.
   Therefore the brief's "revise and re-dispatch once" branch has nothing to revise.
4. **A review already sits at the true final head.** `felixfelix-bot COMMENTED @ 22a1cebd,
   2026-09-25T12:23:35Z` — our own lane's delta review, verdict APPROVE, closing line
   "Contribution PR: none needed". A new comment would duplicate it.
5. **Contribution PR for this PR already happened and is merged.** PR #1313
   (`fix(#1284): union zap relays, derive the handler-id chain, trim booleans`), author felixfelix-bot,
   head `fix/1284-selfhost-config-findings`, base `feat/924-auction-self-hosted-context`,
   **MERGED 2026-09-14T06:14:51Z**. Its URL is already posted on #1284 (felixfelix-bot,
   2026-09-13T13:23:46Z). The brief's glob `contrib-1284-*` finds nothing only because the real branch
   used the `fix/1284-*` naming — the follow-up is not missing, it is **done**.
6. **The reviewed head already contains our three fixes** (carried by `67a76087`), verified by content at
   `22a1cebd`:
   - `src/lib/relay-policy.ts:134-137` — ZAP_RELAYS union, "never dropped", instance relays additive.
   - `src/lib/instance-config.ts:199` — `resolveHandlerIdChain` present (single chain for write+discovery).
   - `src/lib/instance-config.ts:100` — `optionalBoolean` trims before mapping.
7. **Kanban dedup confirmed.** `plebeian` board: no #1284 match. `plebeian-my-prs`: `t_587ecb9f` (review of
   the #1313 fix PR). `plebeian-pr-reviews`: 9 #1284-related cards. `t_3ead2add` and `t_75341e70` are
   `archived`; `t_cdda8b3f` `archived`; `t_15b38bcf` `done`; the only live card is `t_cb288450` (this brief).

## Why the zero-findings macro was NOT posted

The brief permits posting, when there are zero new issues:
`Reviewed tip 5963fc77… — no new issues found. Approving.`
Two of its three assertions are false: `5963fc77` is not a tip (#2), and "no new issues found" claims a
review that was never performed at any head. Posting it would be a fabricated approval on a PR merged 29
days earlier. A gate that cannot be satisfied is not permission to emit the approval anyway.

## Contribution-PR eligibility

**NOT ELIGIBLE — duplicate exists.** Requires `is_own == false` (satisfied) AND a published review with
>=1 real `[BLOCK]`/`[RISK]` (**not satisfied** — nothing publishable existed, and the review on record at
the final head has only NITs). Independently disqualified by all three dedup checks:
(a) fix/review cards already exist; (b) contribution PR #1313 already merged; (c) fixes already at head.
No fix task was created; creating one (the brief's `hermes kanban --board plebeian create "Contribution PR…"`)
would be a **duplicate** and was deliberately skipped.

## Side effects

| Surface | Action |
|---|---|
| GitHub #1284 — comment / review / approve / merge | **none** (verified 6 comments, none recent; no writes) |
| GitHub — fix task / contribution PR | **none** (duplicate exists) |
| Kanban `plebeian-pr-reviews` | comment on `t_cb288450` + status -> `review` |
| Repo `market` | this file + `PROGRESS_1284.md` on `worker-heavy/1284-publish-review`, pushed |

## Acceptance criteria

| Criterion | Status |
|---|---|
| Draft review comment produced | **N/A by design** — no publishable review exists; PR merged, briefed SHA not a head |
| GATE 2.5 cross-family verdict | **N/A** — no draft to gate; the gate card `t_cdda8b3f` never produced a verdict |
| Published comment URL recorded | **N/A** — nothing posted, deliberately (see macro note). Operative prior art: the 2026-09-25T12:23:35Z delta review @ `22a1cebd` and the #1313 notice @ 2026-09-13T13:23:46Z |
| Contribution-PR dedup verdict | **DONE — NOT ELIGIBLE / duplicate exists** (a+b+c) |

## Remaining steps (if a live re-review is genuinely wanted)

1. Re-derive `headRefOid` at claim time and abort on `state=MERGED` before dispatching a reviewer/gate.
2. Retire the stale chain: `t_cb288450`, `t_cdda8b3f`, `t_3ead2add`, `t_75341e70` (three are archived;
   `t_cb288450` is the live one this run is moving to `review`).
3. If a post-merge audit is wanted, scope it as an audit of the merged tree (`22a1cebd` / merge
   `a3a76b6c`) with a fresh non-duplicating deliverable — not as a #1284 comment.
