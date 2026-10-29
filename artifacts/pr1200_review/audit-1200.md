# Cold audit of draft-verdict.md — PR #1200 (PlebeianApp/market, head 6b8aeb6ea1b4)

Auditor: worker-reviewer-glm (cold-audit delegate, fresh context). Date: 2026-10-29.
Draft under audit: /home/c03rad0r/repos/market/artifacts/pr1200_review/draft-verdict.md
Worktree: /tmp/wt1200 (detached HEAD 6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93 — verified via git rev-parse)

## Step 0: Draft claims extracted

1. felixfelix-bot CHANGES_REQUESTED review id 4981547214 + consolidated issue comment id 5354414353 both sit at live head 6b8aeb6ea1b4 → fresh review post would be a duplicate → verdict NO-OP dedup close, zero GitHub writes.
2. Head unchanged since 2026-07-30; all 8 carried items still open.
3. 33/33 bash tests pass at head.
4. Two new INFO-grade observations: (a) readiness test not wired into PR-branch CI; (b) exit 75 invisible to workflow caller.

Verification steps below, appended incrementally.

## Step 1: Live PR state — CONFIRMED

`gh pr view 1200 --json state,headRefOid,reviewDecision,mergedAt,closedAt`:

- state=OPEN, headRefOid=6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93, reviewDecision=CHANGES_REQUESTED, mergedAt=null, closedAt=null.
- Matches draft exactly (head == claimed head, OPEN, CHANGES_REQUESTED).

## Step 2: Review-of-record + consolidated comment — CONFIRMED (existence)

`gh api .../pulls/1200/reviews` (5 reviews total, all at commit 6b8aeb6ea1b4):

- felixfelix-bot id 4981547214, CHANGES_REQUESTED, commit 6b8aeb6ea1b4, at 2026-08-20T10:13:10Z → EXISTS, matches draft.
- History matches draft: APPROVED 4851923082 (felixfelix-bot, 2026-08-04), COMMENTED 4852408282 (maxime-tt, 2026-08-04), CHANGES_REQUESTED 4852771391 (Franchovy, 2026-08-04), COMMENTED 4936204000 (felixfelix-bot, 2026-08-14, not mentioned in draft but immaterial), CHANGES_REQUESTED 4981547214 (2026-08-20). Review-of-record is the latest review and is CHANGES_REQUESTED at live head.

`gh api .../issues/1200/comments`:

- felixfelix-bot comment id 5354414353 at 2026-08-20T10:04:27Z → EXISTS, matches draft's timestamp.
- felixfelix-bot comment id 5604800185 at 2026-09-09T15:56:29Z → EXISTS; body confirms contribution PR maximotodev/market#10 offering fixes.

## Step 3: Evidence bytes — CONFIRMED

`gh api .../reviews/4981547214 --jq .body > /tmp/rev498.md` then diff vs raw/review_4981547214_body.md → IDENTICAL. Local evidence is a byte-exact copy of the live review body.

**FINDING on review-body content (draft amendment #1):** The live review 4981547214 body does NOT itself enumerate the 8 consolidated items. It carries **4 new numbered items**:

1. RISK — Workflow doesn't distinguish exit code 75 from 70 (installer step has no id:/output capture/conditional)
2. NIT — check_growth error messages lack context prefix
3. NIT — validate_payload extracted but untested
4. NIT — rollback() performs du/df I/O during service downtime
   …plus an "Already covered (not repeated)" cross-reference list pointing at maxime-tt's 8 items and felixfelix-bot's earlier review items.

The **8 consolidated items** (1 BLOCK + 3 RISK + 4 NIT) live in **issue comment 5354414353**. The draft's line "Its body carries 8 items: BLOCK..., RISK..., NITs..." is a MIS-ATTRIBUTION — that enumeration matches the comment, not the review body. (Draft line 12 separately and correctly attributes the 8 items to the comment.) Net effect: **12 distinct open items** (8 carried + 4 from the review body), which strengthens rather than weakens the CHANGES_REQUESTED stance.

## Step 4: Tests at head — CONFIRMED

`bash /tmp/wt1200/deploy-simple/relay/tests/install-staging-relay-readiness.test.sh`:

- rc=0, 33 `ok` lines, 0 `not ok` lines, final line `1..33` → 33/33 pass. Matches draft.
- Worktree HEAD verified: 6b8aeb6ea1b4f2d7f9704e2d2d34e43cc87eff93 (detached; only untracked artifacts/audit files).
- `bash -n` on installer and test file: both clean. Matches draft.
- Live re-run of shellcheck on installer: 15 × SC2015 (info) only, nothing higher. Matches draft's raw/shellcheck_head.txt.

## Step 5: Head date + carried items — ALL 8 CONFIRMED OPEN AT HEAD

- Head commit 6b8aeb6ea1b4 authored 2026-07-30T23:15:38+02:00 (Maximoto) → "unchanged since 2026-07-30" CONFIRMED.
- Item 1/4 (observe() SECONDS + bare sleep): install-staging-relay.sh:629 `deadline=$((SECONDS + OBSERVE_SECONDS))`, :631 `sleep "$SAMPLE_SECONDS"`, :651 `sleep "$SAMPLE_SECONDS"` → CONFIRMED (draft's line cites exact).
- Item 2 (workflow sleep 5): deploy-relay.yml:152 and :219 both `sleep 5` → CONFIRMED (draft's line cites exact).
- Item 3 (no upper bound on RELAY_READINESS_SECONDS): validate_config at install-staging-relay.sh:53-58 checks only `uint "$READINESS_SECONDS" && ((10#$READINESS_SECONDS > 0))` → CONFIRMED, no max.
- Item 5 (check_journal_window -n 1000): install-staging-relay.sh:583 and :589 both `journalctl ... -n 1000 --since` → CONFIRMED.
- Item 6 (stale elapsed in timeout path): install-staging-relay.sh:572 `elapsed=$((now - start))` after loop break, no fresh `now` read → CONFIRMED.
- Item 7 (no shellcheck CI): `grep -rn 'shellcheck' /tmp/wt1200/.github/workflows/` → no matches → CONFIRMED.
- Item 8 (grep-based wiring test with line-number assertions): test_readiness_wiring (test file :222) asserts on grep'd line-number ordering (`uint $line && ((a < b && ...))`) → CONFIRMED; no `observe_case`/`observe()` behavioral test exists in the test file (0 occurrences) → BLOCK item still valid.
- CI at head (live check-runs for 6b8aeb6ea1b4): prettier/unit-integration/security-scan/footprint/e2e-pricing = success, e2e-full = skipped → "5 success + 1 skipped (e2e-full)" CONFIRMED.

## Step 6: Draft's two "new INFO" claims

(a) Readiness test not wired into PR-branch CI — **CONFIRMED (genuinely new)**:

- `grep -n 'pull_request' deploy-relay.yml` → no matches; triggers are `push: branches: [master]` (paths-filtered) + `workflow_dispatch` only.
- `grep -rn 'install-staging-relay-readiness' .github/workflows/` → only deploy-relay.yml:55.
- ci-unit.yml runs on `pull_request` (line 9) but contains no reference to the relay test (`grep -rn 'install-staging-relay' ci-unit.yml` → no matches).
- Neither the 8 carried items nor the review body's 4 items raised this. Novel observation, substance verified.

(b) Exit 75 invisible to workflow caller — substance CONFIRMED, novelty **REFUTED** (draft amendment #2):

- Substance: deploy-relay.yml:146 `"$deploy_dir/install-staging-relay.sh" "$deploy_dir"` sits inside the "Install relay on staging" appleboy/ssh-action step (:137) with no `id:`, no `continue-on-error:`, no output capture; installer :27 `READINESS_TIMEOUT_STATUS=75` preserved by on_exit (:411-452). CONFIRMED.
- Novelty: the draft asserts "felixfelix-bot's Aug-20 review-of-record did NOT raise this" — **FALSE**. Review-of-record 4981547214 item #1 is exactly this issue ("RISK — Workflow doesn't distinguish exit code 75 from 70", citing the same missing id:/output capture), graded RISK not INFO. Comment 5604800185 also lists "exit 75-vs-70 distinction" among the review items its contribution PR addresses. The draft's second "new" observation duplicates the review-of-record and must not be presented as new; its RISK grade in the review-of-record also stands over the draft's INFO re-grade.

## Step 7: Dedup logic / NO-OP decision — CONFIRMED

- Review-of-record: felixfelix-bot CHANGES_REQUESTED 4981547214 at commit == live head (both verified live). Latest review on the PR; reviewDecision=CHANGES_REQUESTED reflects it.
- Head unchanged: commit dated 2026-07-30; PR OPEN, not merged/closed.
- Fixes offered via maximotodev/market#10 (comment 5604800185): live check `gh pr view 10 --repo maximotodev/market --json state,headRefOid,mergedAt,closedAt` → state=OPEN, mergedAt=null, closedAt=null, head 88162b610ad9 — never merged, so the head never absorbed the fixes.
- All 8 carried items (+ the review body's 4) verified still present in code at head.
- Therefore any new review post would duplicate the review-of-record: NO-OP dedup close with zero GitHub writes is the correct decision. CONFIRMED.

## Minor evidence-citation error (draft amendment #3)

Draft line 9 cites "raw/pr_meta.json" — no such file exists in raw/ (15 files, none named pr_meta\*). Live state was independently re-verified here and matches the draft's numbers, so the error is citation-hygiene only, not a factual error.

## Verdict

Core decision (NO-OP dedup close, zero GitHub writes) is sound and fully verified against live GitHub API + worktree. Three amendments to the draft's descriptive text are required (mis-attribution of the 8 items to the review body; false novelty claim on the exit-75 observation; missing evidence file pr_meta.json). None of the amendments changes the decision or the reviewDecision=CHANGES_REQUESTED stance — if anything, the review body's 4 additional open items strengthen it.

AUDIT_VERDICT: CONFIRMED_W_AMENDMENTS
AMENDMENTS: (1) The 8-item enumeration (BLOCK + 3 RISK + 4 NIT) lives in issue comment 5354414353, NOT in review 4981547214's body — the review body carries 4 different numbered items (RISK exit-75/70 invisibility; NIT check_growth context prefix; NIT validate_payload untested; NIT rollback du/df during downtime), so 12 distinct items are open, not 8; the draft's "Its body carries 8 items" sentence must be re-attributed. (2) The draft's "new" INFO observation #2 (exit 75 invisible to caller) is NOT new — it is review-of-record 4981547214's RISK item #1; the draft's claim that the review-of-record "did NOT raise this" is false, and the observation must be dropped as a duplicate or re-labeled as already-covered (its RISK grade in the review-of-record stands). (3) Draft cites raw/pr_meta.json, which does not exist in the raw/ evidence directory (live API re-verification here matches the draft's stated values, so citation hygiene only). The NO-OP dedup decision itself: CONFIRMED — review-of-record at live head 6b8aeb6ea1b4, head unchanged since 2026-07-30, fixes PR maximotodev/market#10 still OPEN/unmerged, a fresh review would duplicate.
