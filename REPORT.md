# PR #1387 review report — feat(auctions): integrate Coco v2 wallet and auction lifecycle

Reviewer: worker-reviewer-ds (gate 1) / worker-reviewer-kimi (gate 2, cold audit)
Repo: PlebeianApp/market
PR: #1387, author maximotodev, base branch `auctions`
Head reviewed: **7d8d1ed47fba** (`feat/coco-v2-wallet-auction-lifecycle`)
Base merge-base: `a3a76b6c`
Method: linus-review (correctness first; special cases are the enemy; evidence over intent)
Verdict: **CHANGES REQUESTED** (posted as such, not APPROVED)

## How this was reviewed

Head extracted read-only to `/tmp/pr1387` (`git archive pr-1387-head`), base compared as
`upstream/auctions...pr-1387-head`. Focus was the money path: bid locking, prepared-bid
lifecycle, winner release/receive, refunds, settlement, DLEQ evidence, mode gating.
No repository files were modified.

## Findings

### [RISK] 1 — the bid path creates rebid chains that release/receive then refuse
- `src/components/AuctionBidder.tsx:217-236` computes `previousBidAmount` and rebids as a
  delta leg; `prepareCocoAuctionBid` accepts `previousBidEventId`.
- `src/publish/auctions.tsx:1632` (`publishCocoWinnerRelease`) and `:1680`
  (`receiveWinner`) both throw `'Coco rebid-chain settlement is not yet enabled'` when
  `canonical.winner.prevBidId` is set.
- Consequence: a normal UI action (raise your bid) produces a winner the system can never
  release or receive. Funds stay locked until locktime. This is an unexitable state created
  by the happy path, not by an attack.
- Fix direction: reject a second Coco bid at prepare time, or implement the chain. Do not
  ship a bid path that can mint an unsettleable winner.

### [RISK] 2 — `resetBrowserCocoAuctionTestState` deletes the wrong databases
- Account DB name: `src/lib/coco/runtime.ts:19` → `plebeian_coco_v2_<env>_<pubkey>`
  (underscores).
- Reset filter: `src/lib/coco/migration/freshAuctionsdevBrowser.ts:366` →
  `name.startsWith('plebeian-market-coco-v2-')` (hyphens).
- So the reset wipes seed-vault / recovery / migration-control / command stores but leaves
  the wallet DB (funds + send operations) intact. The resulting state — bid events carrying
  `coco_operation` on the relay, no local send operation — is exactly what triggers finding 3.
- Note `scripts/audit-coco-production-profile.ts:184` already uses the correct
  `plebeian_coco_v2_` prefix, so the correct form exists in-repo and the reset simply does
  not use it.

### [RISK] 3 — a missing Send operation reports as a successful refund
- `src/lib/coco/auctions/cocoEngine.ts:285`:
  `if (!operation || operation.state === 'rolled_back') return { operationId, state: 'refunded' }`.
- `!operation` (nothing to reclaim / local state gone) is indistinguishable from a real
  rollback, and the dashboard toasts "Original Coco Send refunded."
  (`bids.tsx:443-445`). A refund that moved nothing must not read as a refund: return a
  distinct state and surface it.

### [RISK] 4 — publication cache discarded before the durable status write
- `src/lib/coco/auctions/walletHost.ts:576-588`: `publisher.publish(eventId)` (which deletes
  the cached signed event, `src/publish/auctions.tsx:1453-1465`) runs *before*
  `commands.update(..., 'publication_ready' → 'published')`.
- If that write fails, the command is stuck `publication_ready` with no cached event and the
  retry throws `'Exact cached Coco kind-… is unavailable'` (`auctions.tsx:641`, `:1460`) —
  permanently, for an event that is already on the relay.
- Fix: mark published first, discard the cache second; republish must stay idempotent.

### [RISK] 5 — keyset validation silently dropped in the cashu-ts v5 migration
- `src/lib/auctionSettlementP2pk.ts:119-121`: `inspectCashuToken(input.token)` replaced
  `getDecodedToken(token, input.mintKeysets)`.
- `src/lib/auction/validation.ts:773`: same substitution in `validatePathRelease`.
- Remaining checks are strong (P2PK lock pubkey must equal the xpub-derived child, per-proof
  amount sane, amount sum maintained, duplicate bid ids rejected), so this is not an
  exploitable hole — but nothing now binds a proof's keyset id to a mint that is supposed to
  have issued it, and `mintKeysets` is a dead parameter. Failure moves from validation time
  to redemption time. Reinstate the check explicitly instead of dropping it for the new
  signature.

### [NIT] 6 — `readEnv` six-arm nested ternary
`src/lib/coco/auctions/mode.ts:22-40`. Three `if/throw`s or a
`const PRODUCTION = { hosts, mintUrls }` table reads better and kills the
operator-precedence trap inherent in a chain that long. Static values stay greppable.

### [NIT] 7 — pre-flip bids invisible to the rebid delta
`src/components/AuctionBidder.tsx:219-221` filters to `coco_operation` bids, so a legacy bid
does not count toward `previousBidAmount` and a Coco rebid locks the full amount on top of
it. Consistent with legacy being unsupported, but the bid button says nothing; say it there.

### [INFO] 8 — PR hygiene
PR body's "immutable identities" (base `ea7b4b12`, head `e0e83e98`, app parent `0bdcf48c`)
do not match the branch (base `a3a76b6c`, head `7d8d1ed4`); GitHub reports
`mergeable: CONFLICTING`. A 741-line rewrite of `Nip60Wallet.tsx` and 195 lines of
`src/lib/stores/nip60.ts` ride along with the auction work — a bisect hazard in the PR that
must never lose a payment state.

### [INFO] 9 — legacy bids unrefundable after the flip
`bids.tsx:359` refuses reclaims in Coco mode; the per-bid refund button is disabled without
a `coco_operation` tag; legacy paths hard-throw. Fail-closed, acceptable for fake funds, but
"drain in-flight bids before flipping Coco mode on" belongs in the rollout preconditions.

## Checked and cleared (no finding raised)

- All four legacy monetary entry points are gated by `assertLegacyAuctionMoneyAllowed`:
  `auctions.tsx:709`, `:1365`, `:1855`, `:2155`.
- `fetchAuctionVerdicts(..., true)` call-site change is a no-op: the function takes five
  parameters (`src/queries/auctions.tsx:589`), so both call shapes pass `undefined` for
  `validatorPubkeys`. No verification was disabled.
- `--no-sourcemap` is honoured: `build.ts:66-71` turns `--no-*` into `sourcemap: false`, and
  `...cliConfig` at `build.ts:177` overrides the hardcoded `sourcemap: 'linked'`.
- Republish cache is localStorage-backed with a post-sign identity drift guard; the
  deterministic-id freeze is checked again after signing.
- `resolveCocoCanonicalWinner` fails closed on: identity change, auction not ended, settlement
  grace expired, terminal settlement present, missing DLEQ keyset evidence.
- Mint allowlist / environment gating in `mode.ts` is fail-closed.

## Not verified

No test, build, typecheck, or CI run was performed. `/tmp/pr1387` was reviewed statically and
this worktree lacks `@cashu/coco-core` from the vendored tarballs; running
`bun install` + the suite was outside the authorized scope for this review. Nothing in the
posted review claims otherwise.

## Gate 2 (cross-family cold audit)

Draft dispatched to the `worker-reviewer-kimi` lane (`HERMES_PROFILE=worker-reviewer-kimi
hermes -z`, output at /tmp/gate2_1387_out.txt) with instructions to falsify each [RISK]
finding and to name missed blockers. Outcome, and what I did with it:

| Draft finding | Gate 2 | Action taken |
|---|---|---|
| 1 rebid chains unsettleable | HOLDS, "blocker" | promoted to **[BLOCK]**, evidence tightened to auctions.tsx:541-558/:620 vs :1632/:1680 |
| 2 reset deletes wrong DBs | **WRONG** | **withdrawn** — see below |
| 3 missing operation = refunded | HOLDS | kept as [RISK], added the timelock-ordering point |
| 4 cache discard before status write | WEAK (no fund risk) | downgraded to [NIT] |
| 5 keyset validation dropped | WEAK (framing wrong) | reframed as [NIT] dead `mintKeysets` parameters |

Finding 2 was my error and gate 2 was right: `freshAuctionsdevBrowser.ts:365-367` filters on
`name === accountDatabase || name.startsWith('plebeian-market-coco-v2-')`, where
`accountDatabase` is `getCocoDatabaseName(account)` (`runtime.ts:18-19`) — the wallet DB *is*
deleted. I had read only the `startsWith` half of the predicate. Withdrawn before posting.
Finding 5's original framing ("nothing ties a proof's keyset to the mint") was also wrong:
base's `getDecodedToken(token, mintKeysets)` expanded short v2 keyset IDs, it never validated
issuance, so only the dead-parameter observation survives.

## Publish

- Review posted: `gh pr review 1387 --repo PlebeianApp/market --request-changes --body-file REVIEW_BODY_1387.md`
- State: `CHANGES_REQUESTED`
- Commit reviewed (`commit_id`): `7d8d1ed47fba0f7db1f1a40ede8aad04817459d3` (verified via
  `gh api repos/PlebeianApp/market/pulls/1387/reviews`)
- URL: https://github.com/PlebeianApp/market/pull/1387#pullrequestreview-5635293825
- Gate state: `last_reviewed_sha = 7d8d1ed47fba…` recorded for PR 1387 in
  `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json`. The detector pipeline had
  already recorded this review itself at 22:59:04Z (independent confirmation that the review
  landed); my write re-asserted `last_reviewed_sha` plus `last_review_state`/`last_review_url`.
- Posted body verified byte-for-byte against `REVIEW_BODY_1387.md` via
  `gh api …/reviews/5635293825 --jq .body` (only a trailing newline differs).
