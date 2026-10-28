# PROGRESS — Cold cross-family verification of PR #1298 draft (card t_0f6a0798)

Task: cold, opposite-family (glm) verification of the DRAFT review comment
(reviews/1298-draft.md, lane t_e736bb4b) for PlebeianApp/market PR #1298
at head d205c158afe7a88a7b2d962e620bfc3b35889b20.

Placement note: repo-root PROGRESS.md/REPORT.md are TRACKED files mid-edit by a
concurrent task (PR #1359 lane, mtimes 2026-10-28 22:01); this lane's
deliverables therefore live at artifacts/pr1298_review/{PROGRESS,REPORT}.md.

## Milestones

- M1 Evidence gathering — DONE. Files: raw/pr1298_diff_fetch_20261028.diff,
  raw/maxime_tt_review_5653225909.body.txt, raw/{pr1298_test_own,pr1298_vet,
  pr1298_scratch_all}.log, probe_zzz_glm_probe_replace_older_test.go.
  - Head confirmed live: d205c158... state MERGED 2026-09-19T20:41:28Z (merge
    3f394190), 9 files, +965/-40; fresh `gh pr diff` byte-identical to the
    pinned copy (cmp IDENTICAL).
  - Draft read: zero-finding body, prev_issues claimed EMPTY, provenance claims
    "no compact-index audit artifact exists anywhere".
  - Live GitHub state: draft body is byte-identical to felixfelix-bot APPROVED
    review 5186090354 (2026-09-12); maxime-tt 6-item review 5653225909
    (2026-09-13) exists → prev_issues is NOT empty.
  - Source anchors verified at head: index.go:69-71 (adoption returns nil, no
    parity check), index.go:54-57 (create(): Mkdir then bleve.New, no marker,
    no cleanup on failure), rebuild.go:49/53/108-114, main.go:266-312.
  - Defect lines main.go:289-296 byte-identical at base 4cbe2b26 (pre-existing;
    PR added guards 266-274 only).
  - Pinned-dep verification: boltdb replace.go uses nostr.IsOlder and keeps
    newer (shouldStore=false); utils.go:102-105 IsOlder definition; khatru
    adding.go:39-40 maps ErrDupEvent→OK; bleve save.go document fields match
    the new document() byte-for-byte.
- M2 Empirical reproduction at head (pinned module cache, GOPROXY=off,
  go1.25.0) — DONE.
  - OWN probe TestGlmProbeOlderReplaceEvictsLiveSearchEntry (unadjudicated
    RISK main.go:266): raw_has_newer=1, search_finds_newer=0 → CONFIRMED.
  - RISK index.go:69 (stale activation): TestScratchStaleActivation... PASS,
    late event in raw, absent from search, no startup error.
  - NIT create-path marker-less wedge: TestScratchFirstBootCrashWindow... PASS,
    fail-closed "metadata missing" on every restart.
  - Close-drain probes (diff-introduced): Close() blocks behind stalled
    subscriber; new queries queue behind it — both PASS.
  - Partial-write divergence probe: raw committed + error surfaced + retry
    ErrDupEvent→OK all CONFIRMED (probe then panics on its own double-close at
    line 84 — harness bug, not product).
  - PR's own tests green at head (go test ./... ok both pkgs, after stashing
    scratch probes); go vet rc=0.
- M3 Verdict + deliverables — DONE. REPORT.md (verdict REJECTED, per-claim
  adjudication, missing-issue suggestions incl. RISK main.go:266 never merged
  into the canonical list). Committed + pushed to fork.
- M4 Kanban comment posted on t_0f6a0798 (board plebeian-pr-reviews) for the
  publish task. No GitHub write of any kind from this lane.
- M5 Verification round (post-verdict) — DONE, commit 0cccbe82 (pushed to
  fork, ls-remote verified). Probe file gofmt-cleaned (trailing newline);
  `go vet ./cmd/market-relay/` rc=0 **with the probe present** (earlier vet ran
  only with probes stashed); probe re-run uncached `-count=1` → PASS (103 s);
  deliverables prettier-clean (`bunx prettier --check artifacts/pr1298_review/`
  → all matched); raw maxime-tt review dump renamed `.md` → `.body.txt` to keep
  its API-verbatim CRLF bytes out of prettier's reach (git rename 100%).
  `bun run build`/`format` (TS toolchain) do not apply to the Go probe in the
  detached head worktree; the Go toolchain is the relevant verifier there.
- M6 Harness verification round — DONE. `hermes verify --skip-start --json` in
  the head worktree module (Go recipe detected: build `go build ./...`, test
  `go test ./...`): **ok:true**, build rc=0 (7.4 s), full `go test ./...` rc=0
  (41.9 s) **with this lane's probe present** (prior-lane scratch probes
  stashed, then restored). Standalone probe re-run `-count=1` → PASS (6.0 s).
  Recorded as the workspace verification evidence for the changed path.

## Findings ledger (draft → status)

- Draft body "no new issues found. Approving." → REJECTED (DROP): false at
  head (3 reproduced defects), byte-duplicate of posted review 5186090354,
  PR already merged.
- Draft prev_issues "EMPTY" → DROP: maxime-tt 5653225909 (6 items) +
  felixfelix-bot 5186090354/5718263024 exist.
- Draft provenance "no artifact exists" → DROP: stale; two committed audit
  artifacts exist (0d821ac/86792c5).
- Canonical RISK index.go:69 → KEEP (independently reproduced).
- Canonical NIT rebuild.go:53 → REWRITE (demonstrated clause is the create()
  first-boot window at index.go:54-57; markIncomplete-failure clause unproven;
  "the next start adopts it" wrong for the rebuild-output clause).
- MISSING RISK main.go:266 (replace-eviction ignores IsOlder) → suggested
  ADDITION (reproduced with own probe; absent from canonical list because the
  merge consumed the stale r1 audit; r2 landed ~21h after the merge comment).

## Files touched (this lane only)

- artifacts/pr1298_review/PROGRESS.md (this file)
- artifacts/pr1298_review/REPORT.md
- artifacts/pr1298_review/raw/pr1298_diff_fetch_20261028.diff
- artifacts/pr1298_review/raw/maxime_tt_review_5653225909.body.txt
- artifacts/pr1298*review/raw/pr1298*{test_own,vet,scratch_all}.log
- artifacts/pr1298_review/probe_zzz_glm_probe_replace_older_test.go
- (untracked, head worktree only, no commit):
  /home/c03rad0r/worktrees/pr1298-consistency/.../zzz_glm_probe_replace_older_test.go
