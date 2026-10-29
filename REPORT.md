# REPORT — PR #1409 review (`docs(adr): mark auction BFT decision accepted`)

Worker: fleet offload (worker-reviewer-glm, tier/review-glm) · Date: 2026-10-29
PR: PlebeianApp/market #1409, author maximotodev, branch `docs/adr0017-accepted-status`, head `8cf24b9ec134844ef6ebca5d87393a59e8fd0ee7`
State at review: **MERGED** 2026-10-05T23:02:47Z (merge commit `614ff3a0def0`, parent of head = `78c10f48` = #1407's merge commit)
Method: linus-review (correctness-first), cross-family Gate 2.5 cold audit before posting.

## Decision

**APPROVED — no change requests.** Published as felixfelix-bot COMMENTED review id **5696444929** (2026-10-29T10:45:51Z, commit_id = head `8cf24b9ec134…`, body byte-identical to artifacts/pr1409_review/REVIEW.md modulo trailing newline). Post-merge COMMENT review-of-record is the documented lane pattern for merged PRs (same as #1410 review 5694825411, #1422 review 5694363189); the body states APPROVED with zero change requests, per the dispatch. No prior felixfelix-bot review existed at this head, so this is the lane's review-of-record, not a duplicate.

## What the PR is and why it's right

Docs-only status flip (+8/−7, exactly 2 files): ADR-0017 `Proposed` → `Accepted` in the ADR front-matter (ADR-0017:5) and the registry row (docs/adr/README.md:25), plus replacement of the now-false "Maintainer decision requested" section with "Maintainer ratification" wording. Verified against the GitHub record:

- "On 2026-10-05, this ADR was ratified and PR #1407 was merged" (ADR-0017:230) — matches: Franchovy APPROVED #1407 at `96cbdd1f` 2026-10-05T15:38:06Z, #1407 merged 15:48:12Z, and head's direct parent IS #1407's merge commit `78c10f48`.
- The 7 enumerated architecture choices (ADR-0017:234-240) are byte-identical to base — ratification of exactly those seven, no eighth smuggled in.
- The dropped "does not ratify" sentence was true pre-merge, false post-merge — removing it is the point of the PR.
- PR-body exclusion claim verified: the leader-change soft-close amendment is commit `6ca781fb`, a descendant of this head, NOT in this diff.
- Tree sweep at head: no other file references ADR-0017 status; no leftover "decision requested"/"does not ratify" text in docs/.
- CI at head: unit-integration, prettier, footprint, security-scan, e2e-grep, Deploy preview green; e2e-full skipped; the one failed "Tear down preview" is the known preview-lane teardown defect (Prepare SSH key + pinned host key, exit 127), unreachable from a docs diff.

Non-blocking notes posted in the review body:
- [NIT] ADR-0017:67,71,95 — stale "proposed" architecture framing survives in three spots (post-audit amended to note :100/:161-162 are BFT protocol terms, not status framing).
- [INFO] README:25 — registry Notes cell lacks PR provenance (#1407/#1409), unlike ADR-0015/0016 rows.

## Gate 2.5 — cross-family cold audit (true cross-family this run)

Fleet routing named `worker-reviewer-kimi-code` (gate 2). `kimi-k2.7-code` is served on this node's gateway; the audit ran as a one-shot `hermes --yolo -p worker-reviewer-kimi -m kimi-k2.7-code --provider zai` session over the exact draft (artifacts/pr1409_review/audit/BRIEF.md) — kimi (Moonshot) family, different family from the drafter (glm/zhipu). First attempt on `tier/review-kimi` (kimi-k3.1) died on provider 503 (capacity exhausted); retried on the locally-served `kimi-k2.7-code` lane, which succeeded. The auditor wrote findings incrementally to /tmp (survives provider loss), copied to artifacts/pr1409_review/audit/audit-verdict.md.

**Verdict: CONFIRMED_W_AMENDMENTS.** All 12 steps PASS except STEP 9, which flagged that the draft's "exactly three proposed spots" was literally off (:161 contains "proposal" — but as a BFT protocol term, "Byzantine proposer"). I verified first-hand (grep at head: :67/:71/:95 status-framing; :100/:161/:162 protocol terms) and applied the wording amendment to the [NIT] BEFORE posting. MISS_CANDIDATES: none. Audit also independently confirmed: all 17 cited line numbers, base/head status cells, byte-identity of choices 1-7, #1407 approval/merge timeline, 6ca781fb descendant + not-in-diff, empty tree sweep, CI conclusions, tone/structure.

## Actions taken (all observed)

1. Recovered live PR state + diff + reviews + comments + check-runs (raw/, incl. --paginate check-runs: 10 runs = 6 success / 1 failure / 3 skipped).
2. Verified head file contents via `git show` (no worktree checkout; shared checkout was contended mid-session by the concurrent pr399 lane — my commits a41aaf5d/851cb5b6 initially landed on review/pr399-glm-20261029, so I pushed my own evidence branch `review/pr1409-glm-20261029` to isolate the lane; a41aaf5d is purely additive on top of their 0d336ad3).
3. Drafted the review (REVIEW.md), ran the cross-family kimi cold audit, applied its amendment, posted via `gh pr review 1409 --repo PlebeianApp/market --comment --body-file …` → review id 5696444929 observed at commit 8cf24b9ec134.
4. Recorded `prs["1409"].last_reviewed_sha = 8cf24b9ec134844ef6ebca5d87393a59e8fd0ee7` in ~/.hermes/profiles/manager/state/plebeian-pr-review-state.json (backup .bak_pr1409_20261029_104624 first, atomic os.replace, re-verified from the file's own keys) — the detector should stop re-creating the card.
5. Evidence committed and pushed to fork branch `review/pr1409-glm-20261029` (commits a41aaf5d, 851cb5b6, + final close-out commit).

GitHub writes performed: exactly one — the PR review (COMMENTED, id 5696444929). Everything else was read-only gh api GETs.

## REMAINING steps

None. Task complete: review posted (APPROVED, cites head SHA), gate state recorded, evidence pushed.