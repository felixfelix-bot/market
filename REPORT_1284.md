# REPORT — Publish approved review for PlebeianApp/market PR #1284 + contribution-PR dedup

Task: `t_84b7c185` · Briefed head `5963fc77bd1c16b6b113f4d6f3c6ad42136725b1` · Author `hkarani` (`is_own: false`)
Date: 2026-10-24 · Worker: worker-heavy (CobradorWave) · Branch: `worker-heavy/1284-publish-review`

## Verdict in one paragraph

**Nothing was published to GitHub, and nothing should be.** The publish condition in the brief
("Only proceed if the GATE 2.5 verdict was APPROVED") is **not met** — no APPROVED verdict exists,
because the draft it was gating was never produced. The root cause is upstream of the gate: the
brief's pinned head SHA is not a head of PR #1284 at all, and the PR itself has been **MERGED since
2026-09-25T12:32:41Z**. Per the brief's enumerated fallthrough path ("DO NOT publish — write the
draft plus the glm verdict into a kanban_comment and set status=review, then stop"), the card is
being moved to `review` with the evidence below. The contribution-PR question still resolves to a
definite answer: **NOT ELIGIBLE — duplicate exists.** Zero GitHub writes were made.

## 1. Why the publish step cannot run

### 1.1 The PR is merged and closed

```
$ gh pr view 1284 --repo PlebeianApp/market --json number,title,state,closed,closedAt,mergedAt,...
{"author":"hkarani","baseRefName":"auctions","closed":true,"closedAt":"2026-09-25T12:32:41Z",
 "headRefName":"feat/924-auction-self-hosted-context",
 "headRefOid":"22a1cebd647c6b59d929725f5d288a8c4326a4ce","isDraft":false,
 "mergeCommit":"a3a76b6c9752f8e3cccf85ff74ce4feea4a922f4","mergedAt":"2026-09-25T12:32:41Z",
 "number":1284,"state":"MERGED",
 "title":"feat(config): add self-hosting instance configuration foundation",
 "url":"https://github.com/PlebeianApp/market/pull/1284"}
```

`state=MERGED`, `mergedAt=2026-09-25T12:32:41Z`, merge commit `a3a76b6c9752`. The code is on `auctions`.

### 1.2 The briefed head SHA is not a head — it is an interior review anchor

```
$ gh api repos/PlebeianApp/market/commits/5963fc77bd1c16b6b113f4d6f3c6ad42136725b1
{"msg":"fix(tests): self-hosted regression coverage","parents":["ed49aa21"],
 "sha":"5963fc77bd1c16b6b113f4d6f3c6ad42136725b1"}

$ gh pr view 1284 --json headRefOid          → 22a1cebd647c6b59d929725f5d288a8c4326a4ce
$ gh api repos/PlebeianApp/market/compare/5963fc77...22a1cebd --jq '{status,ahead,behind}'
{"ahead":230,"behind":10,"status":"diverged"}
```

Local ancestry checks (`git merge-base --is-ancestor`, repo `/home/c03rad0r/repos/market`):

| Question | Answer |
|---|---|
| `5963fc77` ancestor of `upstream/auctions`? | **NO** |
| `5963fc77` ancestor of PR head `22a1cebd`? | **NO** |
| `git rev-parse 61f6d3070b25^1` | `5963fc77bd1c16b6b113f4d6f3c6ad42136725b1` |
| `5963fc77` in PR #1284's 22-commit list? (`gh api .../pulls/1284/commits --paginate`) | **No** — list ends `1d00d508 → 7aaf647e → feeefb18 → c8c2e30a → 22a1cebd` |

`5963fc77` is the **first parent of merge commit `61f6d3070b25`** — i.e. our own 2026-09-12 review
anchor — not a tip of the contributor's branch. Reviewing "the tip" at that SHA is not a
well-defined act, and any comment posted under it would misrepresent what was inspected.

### 1.3 GATE 2.5 never produced a verdict

The gate card `t_cdda8b3f` ("Cold review of PR #1284 draft review (GATE 2.5, glm-5.3)",
worker-reviewer-glm) is in status **`triage`** with **no APPROVED/REJECTED verdict**:

```
Latest summary: reclaim backoff until 1790934107 (dead worker pid, strike 1)
Runs: #455 blocked, #507 blocked, #2358 blocked, #2365 blocked   ← all blocked, none completed
```

Its parent `t_15b38bcf` ("Draft unposted review comment … @ 5963fc77") completed with
**no draft at all**, having applied its own STEP 1 head-match rule:

> STOPPED at STEP 1 per the task's own head-match rule: no draft review was produced, because PR
> PlebeianApp/market#1284 is MERGED (closed 2026-09-25T12:32:41Z) and the briefed head
> 5963fc77… is not a head at all … Zero findings raised (empty canonical issue list) and zero
> GitHub writes.

That worker's report is on disk and was re-verified line by line during this task:
`/home/c03rad0r/.hermes/kanban/boards/plebeian-pr-reviews/attachments/t_15b38bcf/PR1284-review-stopped-head-mismatch.md`
(every factual claim in it reproduced independently above).

### 1.4 The brief's "revise and re-dispatch exactly once" branch does not apply

That branch presumes a REJECTED draft to revise. There is **no draft**: no review text, no findings,
no canonical issue-summary list. Re-dispatching a cross-family audit against a nonexistent draft
would burn a lane to produce the same REJECTED-on-head-mismatch verdict the glm card's own STEP 1
mandates ("If it is not [5963fc77], stop and report REJECTED with the mismatch as the reason").
The honest terminal state is therefore the brief's own fallthrough: **do not publish; record; stop.**

### 1.5 The "no new issues" macro would have been a false statement

The brief offers a zero-findings macro to post verbatim:

```
Reviewed tip 5963fc77bd1c16b6b113f4d6f3c6ad42136725b1 — no new issues found. Approving.
```

I did **not** post it. It would assert three things, two of which are false and one unverified:

1. `5963fc77` is not a tip (§1.2) — the sentence names a SHA the PR does not recognise as its head.
2. "no new issues found" claims a review happened; no review of the working tree at any head was
   performed in this task or in any completed upstream task.
3. "Approving" on a PR merged 29 days earlier is inert at best, and reads as a stale/misfired bot.

Posts like this are exactly what makes a review lane untrustworthy. A gate that cannot be satisfied
is not permission to emit the approval anyway.

### 1.6 A review of this PR already exists at the true final head

```
felixfelix-bot COMMENTED commit=22a1cebd at=2026-09-25T12:23:35Z   ← delta review at final head
c03rad0r       APPROVED  commit=61f6d307 at=2026-09-16T09:40:08Z
```

That 2026-09-25 comment is our own lane's delta re-review; its verdict reads **"VERDICT: APPROVE"**
and it closes the loop with **"Contribution PR: none needed"**. It further records
`bun run test:unit` 1127 pass / 0 fail and full green check-runs at that head. Any new comment from
us on #1284 would duplicate it.

Check-runs at the briefed anchor SHA, for the record:
`security-scan success · unit-integration success · e2e-grep success · prettier success · footprint success · e2e-full skipped`
(these are historical, for `5963fc77`; they are not evidence about a live head).

## 2. Contribution-PR eligibility

**VERDICT: NOT ELIGIBLE — duplicate exists (three independent disqualifiers).**

Eligibility requires `is_own == false` **AND** a published review containing ≥1 real
`[BLOCK]`/`[RISK]`.

- `is_own == false` — satisfied (`author=hkarani`, external contributor). Not the blocker.
- Published review with ≥1 `[BLOCK]`/`[RISK]` — **not satisfied**. No review was published in this
  task (nothing publishable existed), and the review already on record at the final head contains no
  `[BLOCK]`/`[RISK]` item: its non-blocking notes are explicitly labelled **NITs**.

The dedup checks additionally each independently kill the follow-up.

### DEDUP a — kanban boards for existing PR #1284 work

```
$ hermes kanban --board plebeian          ls | grep -i 1284   → (no match)  [rc=1]
$ hermes kanban --board plebeian-my-prs   ls | grep -i 1284   → ✓ t_587ecb9f done worker-reviewer-kimi
                                        "Review PR #1313: fix(#1284) union zap relays, derive handler-id chain, trim booleans"
$ hermes kanban --board plebeian-pr-reviews ls | grep -i 1284 → 9 cards:
   ◻ t_cb288450 todo   manager              Review PR #1284: feat(config): add self-hosting instance configuration foundation
   ✓ t_0994ac50 done   worker-reviewer-kimi Review PR #1284 … (hkarani, base auctions)
   ◻ t_84b7c185 todo   manager              Publish approved review for PR #1284 and run contribution-PR dedup   ← this card
   ✓ t_104af1e2 done   worker-reviewer-glm  Review PR #1284: feat(config): add self-hosting instance configuration foundation
   ✓ t_ae8ae890 done   worker-reviewer-kimi Review PR #1284 …
   ✓ t_ee16cd98 done   worker-reviewer-glm  Cross-family cold review of PR #1284 review draft (parent t_104af1e2)
   ✓ t_3b152f53 done   worker-reviewer-glm  Cross-family cold review: PR #1284 draft verdict (no-new-issues)
   ✓ t_15b38bcf done   worker-pr-reviewer   Draft unposted review comment for PR #1284 @ 5963fc77
   ? t_cdda8b3f triage worker-reviewer-glm  Cold review of PR #1284 draft review (GATE 2.5, glm-5.3)
   ? t_3ead2add triage market-master        Publish approved review comment on market PR #1284 (gated on GATE 2.5)
   ? t_75341e70 triage market-master        Dedup check A: search kanban boards for existing PR #1284 work
```

Precedent worth noting: `t_3b152f53` shows an *earlier* round on this same PR was **APPROVED** with a
no-new-issues draft, and `t_ee16cd98` shows an earlier draft was **REJECTED** for reviewing
base-branch content rather than the PR diff. The lane has already converged on this PR twice.

### DEDUP b — a contribution PR for #1284 already exists, and it is merged

```
$ gh pr list --repo hkarani/market --head "felixfelix-bot/contrib-1284-*" --state all
(no output — zero PRs in hkarani's fork under that naming scheme)

$ GIT_SSL_NO_VERIFY=1 git ls-remote https://github.com/felixfelix-bot/market.git 'refs/heads/*1284*'
b2eb0c4660ab054e4adbcbe749218747259806f1  refs/heads/fix/1284-selfhost-config-findings

$ gh pr view 1313 --repo PlebeianApp/market --json ...
{"number":1313,"title":"fix(#1284): union zap relays, derive the handler-id chain, trim booleans (review findings 1-3)",
 "state":"MERGED","mergedAt":"2026-09-14T06:14:51Z","author":"felixfelix-bot",
 "headRefName":"fix/1284-selfhost-config-findings",
 "headRefOid":"b2eb0c4660ab054e4adbcbe749218747259806f1",
 "baseRefName":"feat/924-auction-self-hosted-context"}
```

A prior contribution PR URL is already posted on #1284 itself
(`gh api repos/PlebeianApp/market/issues/1284/comments --jq '.[]|select(.body|test("Contribution PR"))'`):

```
[2026-09-13T13:23:46Z] felixfelix-bot
Contribution PR opened against this branch: **#1313** — `fix/1284-selfhost-config-findings`.
Findings 1-3 from [our review](…#issuecomment-5645180703) are implemented with RED-first tests …
```

PR #1313 targets the contributor's own head branch `feat/924-auction-self-hosted-context` — the
correct §5 base/head shape — and was merged 2026-09-14. **The contribution-PR follow-up for this PR
has already happened.** The brief's glob (`contrib-1284-*`) finds nothing only because the real
branch used the `fix/1284-*` naming; the follow-up is not missing, it is *done*.

### DEDUP c — the reviewed head already contains our fix

The three findings from our review are present in the merged head `22a1cebd`, carried by
`67a76087 fix(self-hosting): union zap relays, derive the handler-id chain, trim booleans`:

| Finding | Evidence at `22a1cebd` |
|---|---|
| 1 — zap relays additive, never displaced | `src/lib/relay-policy.ts:146` → `return Array.from(new Set([...ZAP_RELAYS, ...(zapRelays ?? []), ...explicitRelays]))` |
| 2 — single handler-id chain for write **and** discovery | `resolveHandlerIdChain` present (`src/lib/instance-config.ts`, exercised in `src/lib/__tests__/instance-config.test.ts:155-166`) |
| 3 — boolean env values trimmed | `optionalBoolean` trims before mapping (`src/lib/instance-config.ts:100-106`) |

`git log -S'Array.from(new Set([...ZAP_RELAYS' -- src/lib/relay-policy.ts` at `22a1cebd` attributes
the union to `67a76087`, which is in the merged history. Note the fixes arrived via the contributor
re-applying/adopting the #1313 patch on a rebased branch — `b2eb0c46` is **not** an ancestor of
`22a1cebd` (`git merge-base --is-ancestor` → NO), so ancestry alone would have given a false
"fix missing" reading. Verified by content, not by parentage.

## 3. What was actually done to the outside world

| Surface | Action |
|---|---|
| GitHub — `gh pr comment` / `gh pr review` / inline | **none** (zero calls that write) |
| GitHub — formal approve / request-changes / merge | **none** |
| Kanban `plebeian-pr-reviews` | comment on `t_84b7c185` + status → `review` |
| Repo `market` | `PROGRESS_1284.md`, `REPORT_1284.md` on branch `worker-heavy/1284-publish-review` |

No `[BLOCK]`/`[RISK]` findings were invented to manufacture eligibility, and no review text was
fabricated to satisfy an acceptance criterion whose precondition does not exist.

## 4. Acceptance criteria

| Criterion | Status |
|---|---|
| Posted comment URL recorded | **N/A — nothing posted, by design** (§1.5). The operative answer is the 2026-09-25T12:23:35Z felixfelix-bot delta review at the true final head, and the already-posted contribution-PR notice (2026-09-13T13:23:46Z, PR #1313). |
| Eligibility verdict recorded | **DONE — NOT ELIGIBLE / duplicate exists** |
| Dedup a evidence | **DONE** (§2, 9 cards on `plebeian-pr-reviews`, incl. merged #1313 review `t_587ecb9f` on `plebeian-my-prs`) |
| Dedup b evidence | **DONE** (§2, PR #1313 merged 2026-09-14T06:14:51Z, comment URL on #1284) |
| Dedup c evidence | **DONE** (§2, all three fixes present at `22a1cebd` via `67a76087`) |

## 5. Recommendation to the operator

1. **Close/retire the publish chain** for #1284: `t_84b7c185`, `t_3ead2add`, `t_75341e70`,
   `t_cdda8b3f`, `t_cb288450`. They gate on a PR merged on 2026-09-25 and on a head SHA that was
   never a head. Leaving them `todo`/`triage` causes a worker to redo this analysis indefinitely.
2. **Fix the decomposer's head-SHA source.** The brief pinned `5963fc77`, an *interior review anchor*,
   instead of a `headRefOid`. Any future card for this PR should re-derive `headRefOid` at claim
   time and abort on `state=MERGED` before dispatching a reviewer or a gate.
3. If a **post-merge audit** of this feature is actually wanted, it is legitimate work — but it must
   be scoped as an audit of the merged tree (`22a1cebd` / merge commit `a3a76b6c`) with a fresh,
   non-duplicating deliverable, not as a review comment on #1284.
