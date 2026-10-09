# REPORT — PR #1332 review (ADR-0002 Wave 1 addendum, descriptive half)

Worker: worker-reviewer-kimi (offload) · Workspace: `/home/c03rad0r/repos/market`
Offload branch: `worker-heavy/1286-dedupe-spam-f7`
Target: PlebeianApp/market PR #1332, branch `pr/adr-0002-wave1-clarifications`, author felixfelix-bot
Card-cited SHA: `d626dd8c` (stale) · **actual head reviewed: `ed2fc50d457494eebb5adfc2659451ea403c7a5a`**

## Status

COMPLETE. Review published to the PR at the live head SHA; gate state recorded. Verdict:
**CHANGES REQUESTED** (one factual premise to correct before approval, matching a maintainer
request already on the thread). Nothing was written to PlebeianApp/market.

## 1. What was asked vs. what was done

| Card requirement | State | Evidence |
|---|---|---|
| `gh pr review <n> --comment` citing the head SHA | **DONE** | review id `5474897927`, `felixfelix-bot`, `state=COMMENTED`, `commit_id = ed2fc50d457494eebb5adfc2659451ea403c7a5a`, submitted `2026-10-09T20:11:37Z` |
| state **APPROVED** if no change requests | n/a — change requests **were** found | body opens `**CHANGES REQUESTED.**` |
| record `last_reviewed_sha` in gate state | **DONE** | `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` → `prs["1332"]` (§5) |
| Gate 2.5 cold audit before posting | **PARTIAL — lane substituted** (§4) | audit ran on `deepseek-flash`, not glm-5.3 |

## 2. PR facts (verified this run)

```
headRefOid  ed2fc50d457494eebb5adfc2659451ea403c7a5a
baseRefOid  4bc7f8c0c73ae4ba2ff2a78f0c66d28347d1c1ce   (= merge base; branch 0 ahead of its base)
mergeable   MERGEABLE · mergeStateStatus BLOCKED · isDraft false
diff vs base  1 file, +83/−0  docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md
head checks  unit-integration ✓ e2e-grep ✓ prettier ✓ security-scan ✓ footprint ✓ (e2e-full skipped)
current master  68b1b7b9d459788613cd820d68792d52f3efa48c  ·  branch now 17 commits behind
```

The card's cited SHA `d626dd8c` is a stale pre-rebase tip (the fork's `backup/pre-fold-…`).
The branch has moved `d626dd8c → … → e1043706 → ed2fc50d`; I reviewed the live head.

## 3. Independent verification at head (read-only, never the offload tree)

The offload working tree sits on a **different** base than the PR (its `ndk-events.ts` has
`rehydrateVerifiedNdkEvent` at `:11` where head has it at `:20`), so every read was done with
`git show ed2fc50d:<path>` / `git grep … ed2fc50d` / `node_modules` inspection.

1. **Every addendum citation resolves at head.** `ndk-events.ts:29-40` (`isNewerEvent`), `:42-62`
   (`fetchNdkEventSet`), `:55` (call site); `orders.tsx:1001`; `stores/ndk.ts:283-291` / `:421` /
   `:437`; `authors.tsx:37`; `useNotificationMonitor.ts:59/74/95`, `:135/161/185`; `nip60.ts:198`;
   `appSettings.ts:42` / `:107`; `index.tsx:7` / `:143` / `:409` / `:279-290`. `## Status` still
   `Accepted`; `git diff --check` clean.
2. **F4 correction (commit `ed2fc50d`) is accurate.** ndk@3.0.3 `dist/index.js`: `shouldValidateEvent`
   `:2457`, `skipVerification = false` `:9510`, drop block `:9874-9882`, `initialValidationRatio = 1`
   `:12428` / `:12542` — the default relay path *does* verify and drop. applesauce-relay@6.2.1
   (bun.lock) `dist/` has 0 `verif` hits. F4 scope enumeration is complete: exactly two call sites.
3. **F5 pinning verified** at `app-settings.tsx:62` / `:212` and `blacklist.tsx:66`
   (`relayUrls: [mainRelay]` + `exclusiveRelay: true`, `mainRelay` in the dep array).
4. **The BLOCK — independently confirmed, not inherited.** `git grep -n authors` in
   `useNotificationMonitor.ts` returns exactly one hit (`:91`). NDK 3.0.3
   `calculateRelaySetsFromFilter` (`dist:2860-2908`) collects authors only from `filter.authors`
   (`:2863-2867`), routes to author relays when present (`:2868-2894`), else falls back to
   `ndk.explicitRelayUrls` (`:2895-2900`) / `pool.permanentAndConnectedRelays()` (`:2902-2905`).
   So the five `#p`-only sites the addendum lists (`:59/74/135/161/185`) are **not** author-outbox-routed,
   which falsifies the sentence at ADR `:323-324`. This is the same objection @maximotodev filed
   inline at `:324` (2026-10-06).

## 4. Gate 2.5 cold audit — requested lane unavailable, router silently substituted

Brief: dispatch the draft to `worker-reviewer-glm` (glm-5.3). I ran the doctrine's
`consult-lane.py` against the local flat router with `model=glm-5.3`.

- The audit **returned `VERDICT: AUDIT-PASS`** with useful caveats (incorporated into the posted
  review: soften the mechanism claim to "the function that computes outbox relay sets keys on
  `filter.authors`", hedge the `0 verif hits` evidence, avoid a hard "17 citations" arithmetic).
- **But the lane did not serve glm.** The response header reads `provider_seen: deepseek-flash`,
  and a direct probe confirms the substitution:

  ```
  model=glm-5.3        -> resp.model = deepseek-flash        (HTTP 200)
  model=glm-5.2        -> HTTP 503
  model=glm-4.5-flash  -> HTTP 503
  model=glm-4.5-air    -> HTTP 503
  model=tier/review-glm-> HTTP 503
  minimax-m3:cloud / kimi-k3:cloud / deepseek-v4-pro -> HTTP 503
  ```

  The only live lane at audit time was `deepseek-flash`. So the cold audit that passed is a
  **deepseek-family** audit, **not** the requested glm-5.3 audit. Reported as a process limitation,
  not hidden: `provider_seen` is recorded in `artifacts/pr1332/gate25-glm.md`.
- What the audit *did* add (used): it independently recounted the 5 `#p`-only / 3 author-scoped
  split and confirmed it, and flagged that "not author-outbox-routed" is *supported by* the
  `calculateRelaySetsFromFilter` excerpt but not traced end-to-end to those call sites (the posted
  review carries that hedge).

## 5. Gate state update (publish step 3)

File: `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` (the file the detector and
gate load/save). Backup kept as `…-state.json.bak-pr1332-last-reviewed-sha`.

```json
"1332": {
  "last_reviewed_sha": "ed2fc50d457494eebb5adfc2659451ea403c7a5a",
  "last_reviewed_at": "2026-10-09T20:12:00+00:00",
  "last_checked": "2026-10-09T20:12:00+00:00",
  "review_id": 5474897927,
  "review_state": "COMMENTED",
  "review_body_says": "CHANGES REQUESTED",
  "reviewer": "felixfelix-bot"
}
```

`prs` has 43 entries; sibling `prs["1402"]` byte-identical (spot-checked). Note the key already
read `ed2fc50d` before this run (written by an earlier pass that matched the "Wording correction at
`ed2fc50d`" *comment*); this run pins it to the published **review object** as well.

## 6. Posted review (artifact)

`artifacts/pr1332/review-1332.md` — posted verbatim as `gh pr review 1332 --comment`.
Findings: 1 × [BLOCK] (F3 routing conflation, ADR `:319-325`), 1 × [RISK] (base freshness / CI ran on
the old base), 1 × [NIT] (PR-body provenance), [INFO] verification list. Reviewed lane
`tier/review-kimi`; the PR is authored by the same bot account, disclosed as a self-review in the body.

## 7. Commit + push record (observed)

- `bf0c8d44` — pass 1 (PROGRESS.md + `artifacts/pr1332/{review-1332,consultant-brief,bundle,commit-msg-pass1}`).
  `git push dr HEAD:worker-heavy/1286-dedupe-spam-f7` → `175f6671..bf0c8d44`.
Recorded pass 1 in §7 above. Pass 2 (this REPORT + `artifacts/pr1332/gate25-glm.md` + the refined
review body) was committed and pushed to `dr` after this file was written; the observed hash is
appended by a follow-up patch commit (see `git log --oneline -3` on
`worker-heavy/1286-dedupe-spam-f7`).

## 8. Not done / for the manager

1. **Card lifecycle**: this session has no kanban tools, so the card was not marked terminal. The
   detector must stop re-creating it; the gate state (§5) now keys the live head, which
   `needs_review()` treats as done (`current_head == last_reviewed_sha` → never dispatch).
2. **Genuine glm Gate 2.5**: the glm lane was down (all `glm-*` → 503). If a glm-family audit stamp
   is required, re-run `consult-lane.py glm-5.3` once the lane is back.
3. **BLOCK is actionable now**: the PR author should split the F3 premise (authors-filtered trio =
   outbox-routed; `#p`-only notification reads/subs = pinned to the configured relay set).
4. **Self-review caveat**: felixfelix-bot authored the PR and posted this review; a non-author
   maintainer approval is still required, as @maximotodev's COMMENT is not an approval either.
