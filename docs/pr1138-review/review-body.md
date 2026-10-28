## Delta review @ `6be7496cc2089db2e2da04bb083312ae6d43a79d`

Head moved since this card was scheduled (`50199dce` → `6be7496cc`, +312 commits). This review is against the **live tip**. No review object existed at this SHA before now (`gh api …/pulls/1138/reviews` filtered on `commit_id == 6be7496cc…` → 0).

Scope: the PR's own delta is `c8c06fd7..6be7496cc` — 387 files / +79,922 / −1,579, matching the API's `changed_files`/`additions`/`deletions` exactly. The genuinely **unreviewed** part of it is `eacc4256..6be7496cc` (the last posted review, 5328118447, covered `eacc4256`): **6 commits, 10 files, +166 / −27**. That window is what this review reads line by line; the four prior findings that were never answered are re-verified against the tip below.

Evidence at the head: CI 7/7 non-skipped checks success (Build, prettier, e2e-grep, instance-literals, footprint, auctions-surface, Deploy to AuctionsDev); **`e2e-full` skipped**, so there is no e2e evidence at this SHA. Targeted unit run at `6be7496cc` over the 7 newly-touched suites: **131 pass / 0 fail / 726 expect() calls**. Mutation-testing those tests myself (below) — suite is not a phantom control for the `proofYs` guard, it goes red when the guard is deleted.

---

### [INFO] The delta's four substantive changes are correct

1. **`a305ecda` — seller dashboard now feeds parsed bids to the NUT-7 reader.** `src/routes/_dashboard-layout/dashboard/products/auctions.$auctionId.tsx:271-278` parses once, `:285` passes `parsedBids` to `useNut7Polling`. This is a real fix, not cosmetic: a raw relay event carries neither `mint` nor `proofYs`, so the previous `useNut7Polling(bids, …)` silently produced an empty map, and `computeValidatedBids` keeps a bid with no NUT-7 entry **valid** (`src/lib/auction/bidValidation.ts:586` — "No NUT-7 evidence, or unspent → valid"). The seller surface was therefore settling on bids that were never spent-checked.
2. **`a64ec4fe` — `useNut7Polling.ts:27` bounds-checks `proofYs` instead of trusting the type.** Deleting that guard turns `useNut7Polling.test.ts` red (2 of 3 tests fail, `TypeError: undefined is not an object (evaluating 'mintUrl.trim')` via `normalizeMintUrl`) — the test bites.
3. **`95eeefca` / `34c333ef` / `6ee42e60` — one shared postcode sentinel across six privacy suites.** The drift was real (`private-postcode::` in five files vs `buyer-postcode::` in `src/publish/orders.test.ts`); the fixture's two-sided assertion (exact marker rejected, 64-hex identifier containing the same digits allowed) is a genuine tightening, and no suite still asserts the bare `'90210'` string.
4. `piiSentinelFixture.ts` is imported by the six test files only — no production import path, so no bundle impact.

### [RISK] The release gate still counts superseded verdicts — and the demotion is still not republished

This restates **RISK 2 of review 4992989990** (2026-08-21), which was never answered and is **unchanged at `6be7496cc`**. Now that the fail-open branch is closed (next item), this is the remaining way a non-winner can release a path.

`src/publish/auctions.tsx:1373-1379` takes every relay copy of a verdict matching `bidEventId` + `claim === 'won_pending_settlement'` and builds `confirmingAuditors` straight from `validatorPubkey`. There is no latest-by-`created_at` dedup per validator and no quorum-eligibility screen. `computeValidatedBids` does both, two lines of intent away: `src/lib/auction/bidValidation.ts:386-394` (dedup per validator+bid, kind-30440 is replaceable) and `:398-412` (`isQuorumEligibleVerdict`, called at `:402` and `:410`).

The window is real, not theoretical. `src/server/auction-validator/lifecycle.ts:514-531` (`assignLateValidLoserRole`) demotes a previously-assigned winner to `'loser'` when a higher late-valid bid arrives, but `src/server/auction-validator/publisher.ts:95-102` re-derives and republishes **only the arriving bid's** verdict — the demoted bid's `won_pending_settlement` stays on the relay until the next `republishAll` tick. On any relay that never sees the replacement, the demoted bidder keeps satisfying quorum at `auctions.tsx:1380-1381` and can publish a losing leg's path release; the seller can then derive the child key and redeem.

This is the same defect **RISK 3 of review 4992989990** (`publisher.ts:98` + `lifecycle.ts:551-572`) described from the other side: it is still live at the tip — `assignLateValidLoserRole` at `lifecycle.ts:514` is still called from the lone republish site at `publisher.ts:95`, and the demoted bid's own verdict is still not re-derived or republished there.

Suggestion: run the gate's verdict set through the same screen as `computeValidatedBids` (dedup per validator+bid, then eligibility) rather than a bare `claim` filter — or better, reuse `computeValidatedBids`' output instead of a parallel counting implementation.

### [INFO] The fail-open BLOCK is closed

**BLOCK 1 of review 4992989990** (`auctions.tsx:764-767` at `0329899`: `if (auctionEvent) { if (ok) { …quorum… } }`, silently skipping the gate) is **fixed** at the tip. `src/publish/auctions.tsx:1361-1364` now throws on both failure branches — `'Auction no longer exists'` for a null fetch and `'Auction is malformed'` for a parse failure — and the surrounding `catch` at `:1387-1410` re-throws rather than falling through to publish. Verified by reading the head, not from the prior review's word.

### [RISK] (pre-existing) The public detail page validates bids twice, and only the inner one has NUT-7 evidence

Not introduced by this delta, but it is the **same class of defect** `a305ecda` just fixed on the seller surface, on the buyer-facing surface, so it belongs in this review.

`src/routes/auctions.$auctionId.tsx:479-485` calls `computeValidatedBids` **without** `nut7States`, and `:487-490` / `:607-611` / `:629` derive the displayed `currentPrice`, `bidsCount` and `currentLeaderPubkey` from that set. Per `src/lib/auction/bidValidation.ts:586` every bid with no NUT-7 entry is valid, so a double-spent bid can lead the public page's price/leader display. Meanwhile `src/components/AuctionSettlement.tsx:207` *does* poll (`useNut7Polling(bids, auction.mints)`) and passes the states into its own descriptor. Two validations of the same bid set on one page disagree by construction.

Suggest hoisting the parse + `useNut7Polling` to the route (mirroring what the dashboard fix does) and passing `nut7States` into the route's `computeValidatedBids`.

### [RISK] (pre-existing) Server-side verdicts still skip the DLEQ collateral check

**RISK 1 of review 5328118447** — re-verified at the tip, not relayed: `git grep -ic dleq src/server/auction-validator/` returns **zero matches**. `src/server/auction-validator/lifecycle.ts:191-195` derives the verdict from `validateBid`, whose only amount rule is `amount >= starting_bid` (`src/lib/auction/validation.ts:661-667`), and `:459-474` (`pickWinningBid`) sorts the `valid_bid_placed` set by `bid.amount`. A bid with well-formed but forged `dleq_proof` tuples and an arbitrary declared amount therefore earns `valid_bid_placed` server-side and can take the `winner` role, while every keyset-holding client marks it `dleq_invalid` (`src/lib/auction/bidValidation.ts:332`, `:347-352`). Funds stay safe (settlement still redeems real proofs), so this remains a protocol-claim/griefing defect rather than a fund-loss one.

### [RISK] (pre-existing) The relay tag-index budget is still asserted in comments, not enforced on the `a` tag

**RISK 2 of review 5328118447** — re-verified: `src/lib/nip53.ts:56` defines `isWithinRelayTagIndexBudget`, and every reference to it lives in `src/lib/__tests__/nip53.test.ts` (`:128`, `:136`, `:141-142`, `:211`). `buildLiveActivityTags` emits `['a', params.auctionCoord]` verbatim at `:126` with no assertion. `buildLiveActivityDTag` (`:95-98`) hashes, so the activity's *own* coordinate is bounded by construction — the unbounded value is the reference tag, exactly as the prior review said. A >33-char `d` on a kind-30408 published by another NIP-99 client yields a >100-char `a` that khatru does not index, which is the invisibility this feature exists to avoid.

### [NIT] The new projection guard covers `proofYs` but not `mint`

`src/lib/auction/useNut7Polling.ts:27-30`: the guard `continue`s on a missing/short/non-string `proofYs`, then `:30` immediately dereferences `bid.mint` through `normalizeMintUrl` with no check. The comment claims to defend "the boundary … instead of trusting the ParsedBidEvent type", but validates one of the two fields it consumes. A projection carrying `proofYs` and no `mint` still throws:

```
TypeError: undefined is not an object (evaluating 'mintUrl.trim')
  at normalizeMintUrl (src/lib/wallet/display.ts:30:9)
  at fetchBidNut7States (src/lib/auction/useNut7Polling.ts:30:25)
```

(`probe_nut7.test.ts`, run at the head; guard deleted → the suite goes red instead, so this hole is the one case the new tests do not pin.) Inside the hook this rejects out of `poll` (`:93`) — there is no `try/catch` in the effect, so the rejection repeats every 60 s and `nut7States` never updates. Cheap fix: `typeof bid.mint === 'string' && bid.mint.length > 0` in the same condition.

### [NIT] `ctxcn.config.json.bak` is committed to the repo

`ctxcn.config.json.bak` (9 lines, added by `3239b2bb` in this PR's range) sits beside the real `ctxcn.config.json` and is not in `master` (`git cat-file -e d4757b40:ctxcn.config.json.bak` → not in tree). Looks like an editor backup caught by a broad `git add`; no reader references it.

---

### Merge-readiness (not a code request)

- `draft: true`, `mergeable: false`, `mergeable_state: dirty`, **133 commits behind** `master` (`d4757b40`, 2026-10-17). Requires a rebase and un-drafting.
- **`e2e-full` is `skipped` at this SHA**, so the 2026-09-17 carrier checklist item 3 ("full-suite green at the tagged head + `e2e-full` artifact attached") is still unmet. Item 4 stands too: `promote-production.yml` has no test gate.
- Prior BLOCKs 1–2 of review 4987152393: the restart-safety work is wired at the tip — `src/server/auction-validator/index.ts:94` calls `recoverObservedAt` (awaited at `:94-99`) before `subscriber.start()` at `:111`, and `src/server/auction-validator/subscriber.ts:415` prefers `seedObservedAt` over replay-time `now()` — so I am recording those as **addressed by the code as written**, without claiming the original review's exact preconditions were met.

**Verdict: no new BLOCKs in the `eacc4256..6be7496cc` delta — the four changes in it are sound and tested. Two RISKs from prior reviews remain live and unfixed (superseded-verdict quorum, DLEQ-skipping server verdicts), plus the tag-index budget and the public-page NUT-7 gap above; none of them is introduced by this delta.** This is a `COMMENTED` review, not an approval and not a merge authorisation — the PR is a draft, conflicting with `master`, and has no e2e evidence at this head.

Zero inline review comments exist on this PR (`pulls/1138/comments` → `[]`), so there is no thread to answer in place; this body is the response to the unanswered items in reviews 4987152393 / 4992989990 / 5328118447.

```
reviewer_model: tier/worker-heavy
reviewed_head: 6be7496cc2089db2e2da04bb083312ae6d43a79d
prior_covered_head: eacc4256960217b14553e68b179bd34e68a91d01
delta: eacc4256960217b14553e68b179bd34e68a91d01..6be7496cc2089db2e2da04bb083312ae6d43a79d (6 commits, 10 files, +166/-27)
own_delta: c8c06fd74dd3d259dfc43bf79f7da2c3590eb664..6be7496cc2089db2e2da04bb083312ae6d43a79d (387 files, +79922/-1579 — matches API)
ci_evidence repo=PlebeianApp/market head=6be7496cc2089db2e2da04bb083312ae6d43a79d ref=auctions
unit_run: 131 pass / 0 fail / 726 expect() calls (7 files, mutation-tested)
e2e_full: skipped at this head — no e2e evidence
secrets_clean: scanned — no credentials, tokens or keys quoted in this review
```
