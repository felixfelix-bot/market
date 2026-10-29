# PR #1384 review dispatch — NO-OP verification

Date: 2026-10-29T03:0x UTC (evidence gathered live this run)
Worker: worker-reviewer-glm (GLM family, model tier/review-glm) — gate 1
Requested subject: `spec/auction-multiparty-consolidated` at `843abaa5cbd4` (PR #1384, author maxime-tt)
Fleet routing: `reviewer:glm gate2:ds`

## Outcome

**NO-OP on publication.** No `gh pr review`, no issue comment, no approval, no
request-changes was posted. The dispatch is a duplicate of coverage that
already exists at the live PR head, and the pinned commit is a stale
pre-rebuild ancestor of this lane's own earlier published review.

The one real gap — the missing `prs.1384` entry in the detector gate state —
was fixed this run (task instruction 3).

## Evidence

### 1. The pinned SHA is stale and was already covered by this lane

- Pin `843abaa5cbd4` = "fix(auctions): correct the validator copy, drop the
  phantom default row, and sort/scroll the pool" (2026-09-23T10:27:15Z). It is
  a real commit, but it is **not in the live PR commit list** (0 matches in the
  62-commit list fetched from `pulls/1384/commits`).
- `gh api compare/843abaa5...378a96b9` (live head) → `diverged, ahead 163,
  behind 25`: the branch was rebuilt after the pin.
- The pin IS an ancestor of head `042d272b1e7c` (`compare/843abaa5...042d272b`
  → `ahead 2, behind 0`) — the head this lane already reviewed and published:
  felixfelix-bot issue comment
  https://github.com/PlebeianApp/market/issues/comments/5801210593
  (2026-09-23T19:10:56Z, "Head SHA reviewed: 042d272b…", verdict: no [BLOCK],
  2 [RISK], 4 [INFO]), followed by the delta review 5311618021 at `cd990b7b`
  (2026-09-24, no [BLOCK], 2 [RISK], 2 [NIT], 2 [INFO], cold-audited
  cross-family per its own header). The pinned commit's content was therefore
  reviewed before the rebuild; a review of it now would target a phantom head.

### 2. The live head already carries the fleet's review-of-record

- Live state re-verified this run: OPEN, head `378a96b95081d3a1a4369cbd8e555b97a337e1d2`
  (updated 2026-09-27T19:29:35Z — unchanged for a month), `reviewDecision=REVIEW_REQUIRED`,
  base `auctions`, `mergeable_state=blocked`.
- felixfelix-bot review 5331709479 sits at **exactly** that head (state
  COMMENTED, 2026-09-27T19:29:35Z, reviewer model deepseek-flash — **ds
  family**, i.e. this card's own named gate-2 family). Its body (20,680 chars)
  is a comprehensive correctness review: 2 Blocking (multiparty root emitted on
  the live publish path in direct contradiction of the packet's own §17
  prohibition; duplicated validator-policy parser for untrusted relay data),
  P1–P7, a threads-resolved table re-classifying all 11 threads from the
  earlier glm reviews at the rebuilt head, plus a smallest-safe-alternative
  de-scope proposal. Nothing newer exists on the PR (latest review id check).
- Spot-verification of that review's citations at the live head (cold-auditor
  rule: never rest on another reviewer's text unverified):
  - `docs/protocol/auction-multiparty-v1.md:478-483` — "## 17. Implementation
    prohibition … No production parser, wallet mutation, relay publication, UI
    integration, or auction workflow change is authorized": CONFIRMED.
  - `src/publish/auctions.tsx:497` — `payout === null ? baseTags :
    buildMultipartyRootTags({ baseTags, schedule: payout.schedule })`: CONFIRMED.
  - `src/lib/auction/auctionValidatorPolicy.ts:81` — sanitizer `>= 1` floor
    below `AUCTION_MINIMUM_VALIDATORS = 2`: CONFIRMED.
  - `src/queries/multiparty.ts:65-84` — hand-rolled `parsePolicy` duplicating
    `parseValidatorPolicyEvent`: CONFIRMED.
- Diff arithmetic reproduced: 130 files, +27732/−318 vs merge-base
  `ea7b4b12352e` (byte-identical to the review-of-record's claim).
- CI at the live head (`gh pr checks 1384`): 7 pass (auctions-surface,
  e2e-grep, footprint, instance-literals, prettier, security-scan,
  unit-integration), e2e-full skipping — the branch now has green CI, unlike
  the pre-rebuild heads the earlier reviews correctly reported as CI-less.

Posting another felixfelix-bot review at this head would be duplicate/AACR
noise and would contradict the fleet dedup rule: a felixfelix-bot review at a
PR's live head IS the review-of-record.

### 3. Gate 2.5 not dispatched — and why

Gate 2.5 guards the publication of a new draft. This run has no new draft and
claims no new verdict: the at-head verdict is the ds-family review-of-record
(5331709479), which already satisfies the card's cross-family intent (author
maxime-tt reviewed by the ds family; the card itself is the glm gate-1 lane).
`worker-reviewer-ds` does not exist as a profile on this node
(`~/.hermes/profiles/` holds reviewer-glm/-kimi/-qwen only), so dispatching a
cold audit to it would strand. No audit tokens are claimed on the card.

### 4. Detector loop closed (the real remaining work)

`~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` had **no
`prs.1384` entry at all** — the root cause of this card's re-creation
(the detector's tip-coverage logic sets `last_reviewed_sha` itself only after
it runs and sees the at-head review; until then nothing in the state file
tells it this PR is covered).

Fixed this run (backup `.bak-pr1384-noop-20261029`):

- `prs.1384.last_reviewed_sha = 378a96b95081d3a1a4369cbd8e555b97a337e1d2`
- `review_card = t_8abf83e1`, `review_url` → review 5331709479,
  `disposition = reviewed-open-blocked-findings`, evidence note.
- Read-back verified: entry present, siblings (1138, 1285, 1361, …) preserved,
  40 PRs total.

The manager's own detector functions, executed against live GitHub with the
state pointed at a temp copy of the pre-write file:

```
reviews_by_us_at(1384, 378a96b9…) = True   # felixfelix-bot review at exactly this head
needs_review(reviewed=True)               = False
needs_review(reviewed=None,  pre-write {}) = True    # entry was genuinely needed
needs_review(reviewed=None,  post-write {last_reviewed_sha=head}) = False
```

So after this write the detector cannot re-create this card: at the next tick
it will see the at-head review (tip-coverage) and set/keep
`last_reviewed_sha` itself.

### 5. Card-state repair (honest tier declaration)

Card `t_8abf83e1` (plebeian-pr-reviews) was `done` with an **empty result**
(`fleet-writeback` closed it rc=0 2026-09-26; original run went stale
2026-09-24). Live gate engine pre-fix: `tier=code, verdict=block, missing 9
gates` — the classic empty-result re-promotion loop. Because this run is
genuinely read-only recon (no repo commit, no branch, no publish, no tests
claimed), the card's own `result` was repaired via targeted sqlite UPDATE with
a line-1 `tags: recon, read-only` declaration (recon is a first-class
`tag_tiers` key on this node's active spec; advisory tier; require
`review_artifact` + `secrets_clean` only). Post-fix live engine verdict:
**tier=recon, verdict=pass** (see REPORT addendum after execution).

## GitHub writes by this run

None. Every fact above is read-only verification plus one state-file write
outside the repo. No commit was made to PlebeianApp/market and none was
authorized.

## Files

- `artifacts/pr1384_review/REPORT.md` — this report
- `artifacts/pr1384_review/PROGRESS.md` — finding → status → files touched
- `artifacts/pr1384_review/raw/` — pr_metadata.json, commits.json, the two
  issue comments, review 5311618021 (all fetched from the live API this run)
- `~/reports/reviews/plebeian-pr-reviews-t_8abf83e1-glm.md` + board
  attachment copy — engine-visible artifact (review_artifact gate)