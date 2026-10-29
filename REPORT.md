# REPORT — Review PR #1284 `feat(config): add self-hosting instance configuration foundation`

Worker: fleet offload (worker-heavy) · Date: 2026-10-29 · Repo: PlebeianApp/market
Briefed head: `5963fc77bd1c16b6b113f4d6f3c6ad42136725b1` · Author: hkarani (is_own: **false**)

## VERDICT: DUPLICATE DISPATCH — no publish, no contribution PR

Every stage of the mandated workflow was reached, and stages 3–7 were correctly
**skipped** because the work was already done and merged. No GitHub write of any
kind was performed (no comment, no approve, no request-changes, no merge).

## Evidence (all independently re-verified this run, not inherited)

| # | Claim | Verified value | Source |
|---|-------|----------------|--------|
| 1 | PR state | **MERGED** 2026-09-25T12:32:41Z | `pr1284_meta.json` |
| 2 | Merged tip | `22a1cebd647c6b59d929725f5d288a8c4326a4ce` (base `auctions`) | `pr1284_meta.json` |
| 3 | Merge commit | `a3a76b6c9752f8e3cccf85ff74ce4feea4a922f4` | `pr1284_meta.json` |
| 4 | Briefed head is real | yes, `5963fc77` = "fix(tests): self-hosted regression coverage", 2026-09-11T05:15:07Z | `ancestry.txt` |
| 5 | Review at **exact briefed head** | already published 2026-09-12T09:56:38Z by felixfelix-bot, body explicitly names `5963fc77` — 2× [RISK] + 1× [NIT] | `issuecomment_5645180703.json` |
| 6 | Review at later/merged head | also exists — review id `5317551633` at `22a1cebd`, 2026-09-25T12:23:35Z | `pr1284_meta.json` |
| 7 | Contribution PR | **#1313** `fix(#1284): union zap relays, derive the handler-id chain, trim booleans` — **MERGED** 2026-09-14T06:14:51Z | `pr1313_meta.json` |
| 8 | Fix already in merged tree | fix commit `67a76087` **is** ancestor of `22a1cebd`; **not** ancestor of `5963fc77` | `ancestry.txt` |

## Why each workflow stage was skipped

**Stage 1 (fetch).** Done. `headRefOid` is `22a1cebd`, which does **not** match the
brief's `5963fc77`. Per the review-task contract ("Confirm headRefOid == … If it
does not match, STOP and report the mismatch … instead of reviewing a moving
target"), this alone is a stop condition.

**Stage 2 (dedup).** The review-of-record **is** the deliverable. The briefed head
was reviewed on 2026-09-12 and the comment is live at
<https://github.com/PlebeianApp/market/pull/1284#issuecomment-5645180703>. Its
three findings were:

1. `[RISK]` `src/lib/stores/ndk.ts:417` (also `:448`) — zap monitoring silently loses `ZAP_RELAYS`; `/api/config` now always returns `publicRelays`, so `resolveZapRelays`'s `undefined` fallback never fires → receipts on coins/primal relays undetected.
2. `[RISK]` `src/routes/_dashboard-layout/dashboard/app-settings/app-miscelleneous.tsx:138` — editable Handler ID in owner UI vs. boot discovery reading only `process.env.INSTANCE_HANDLER_ID` (`src/server/startup.ts:26`) → settings silently revert to legacy event / `needsSetup` flips true.
3. `[NIT]` `src/lib/instance-config.ts:101` — `optionalBoolean` compares raw string; trailing space/CRLF throws in `setAppSettings` → `process.exit(1)` at boot.

Re-raising any of these, or re-reviewing the merged tip, would be exactly the
duplicate the dedup rule forbids.

**Stage 3–4 (new-issue review + draft).** Not reached — no draft produced. Note
`5963fc77` is **not** an ancestor of the merged tip (`ancestry.txt`), so "review
the tip" would mean reviewing a *different* diff than the brief specifies, and
that diff is already covered by review `5317551633`.

**Stage 5 (GATE 2.5 cross-family).** Correctly not dispatched: there is no draft
to verify, and dispatching glm on an empty/no-op draft burns a card for nothing.
(Related history: card `t_cdda8b3f` for this PR's GATE 2.5 was **blocked and never
ran** — recorded by a prior worker; no glm verdict ever existed for this PR.)

**Stage 6 (publish).** Skipped. Posting "no new issues found / Approving." on a
**merged** PR whose exact head already carries a substantive published review would
be duplicate noise and would misrepresent an already-landed result.

**Stage 7 (contribution PR, external author).** All three dedup gates were checked
and **every one** matches, so creation is forbidden:

- (a) **kanban** — no open fix/contribution card for #1284 on `plebeian`;
  `plebeian-my-prs` holds `t_587ecb9f` (blocked, review of PR #1313);
  `plebeian-pr-reviews` holds `t_84b7c185` **done** ("Publish approved review for
  PR #1284 and run contribution-PR dedup").
- (b) **existing contribution PR** — the fork glob
  (`hkarani/market`, head `felixfelix-bot/contrib-1284-*`) is empty, but the
  actual contribution landed **in-repo as PR #1313** (merged 2026-09-14). The
  briefed glob simply does not match this repo's convention; the underlying
  condition — "a contribution PR already exists" — is unambiguously true.
- (c) **already merged** — `67a76087` is an ancestor of the merged tip
  `22a1cebd`, so the head already contains our fix.

Caveat worth flagging: `5963fc77` is *not* an ancestor of `22a1cebd` (the branch
was rebased/merged via #1313's tip `b2eb0c46`), so "current head contains our fix"
is true of the *merge result* but not by ancestry of the briefed SHA. Either way,
the fix is in `main`'s history via `a3a76b6c`, so there is nothing left for a
contribution PR to contribute.

## Remaining / follow-up

1. **Stale brief.** Any further dispatch of "review PR #1284 @ 5963fc77" should be
   dropped at the source — the review is published, the PR is merged, and the
   contribution PR (#1313) is merged. Suggested canonical dedup summary:
   `PR #1284 @ 5963fc77 review published 2026-09-12 (issuecomment-5645180703); PR merged 22a1cebd; contribution PR #1313 merged`.
2. **Stale kanban cards** on `plebeian-pr-reviews` still sitting `ready`/`blocked`
   for #1284 (`t_15b38bcf`, `t_3ead2add`, `t_75341e70`, `t_cb288450`,
   `t_cdda8b3f`). They are the source of repeated duplicate dispatches; a manager
   sweep should close them. Not actioned here — cards belong to other assignees.
3. **No contribution PR created**, by rule. Nothing to offer @hkarani.

## Artifacts

`/home/c03rad0r/repos/market/artifacts/pr1284_review_dup_20261029/`

- `pr1284_meta.json` — PR state, merge commit, base, tip
- `issuecomment_5645180703.json` — full body of the already-published review
- `pr1313_meta.json` — the already-merged contribution PR
- `ancestry.txt` — `git merge-base --is-ancestor` matrix
- `fork_contrib_probe.txt` — fork head-glob probes (both empty)
- `kanban_probe.txt` — three-board grep for #1284

## Honesty statement

No comment was posted, no review submitted, no approval given, no PR created, no
kanban card mutated by this run. All state above was read via `gh`/`git` and the
raw responses are saved under the artifacts directory so the next reader can
re-verify without trusting this report.
