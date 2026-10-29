Reviewed head SHA: `cfef7525e9bebbe1204f7b68d6fdfca6b379714f` — PlebeianApp/market#1317 (base `auctions`, head branch `feat/1050-auction-winning-modal`) · contribution PR implementing findings 1–2: #1323 · full artifact: `~/reports/reviews/market-1317-deepseek-v4.md`

# Review — PlebeianApp/market#1317 `feat(auctions): auction won modal`

**Reviewed head:** `cfef7525e9bebbe1204f7b68d6fdfca6b379714f`
**Base:** `auctions` · **Head branch:** `feat/1050-auction-winning-modal` (in `PlebeianApp/market`, not a fork)
**PR delta (own slice only):** 19 files, +1466/−103 — `git diff --stat origin/auctions...HEAD`
**Artifact of record:** `~/reports/reviews/market-1317-deepseek-v4.md` (fleet rule D-128 §20)
**Contribution PR implementing findings 1–2:** PlebeianApp/market#1323

## Intent

Surface a "you won this auction" prompt to the bidder once bidding has closed with them as the
canonical (validated, reserve-meeting) winner, from anywhere in the app, and then let them release
their path to the seller. New in this slice: `AuctionWonModal`, `ConfettiBurst`, a global
`useAuctionWinMonitor`, a win-resolution module (`src/lib/auction/winNotification.ts`), a
cross-account win queue store, and signature-verification plumbing in the auction read layer.

## Risk framing (surfaces touched)

- **Auction settlement lifecycle** — winner selection, settlement observation, path release, and the
  release-time gates in `src/publish/auctions.tsx`.
- **Bidder-side value transfer** — the released derivation path + locked Cashu token lets the seller
  redeem; the modal front-ends exactly that action.
- **Relay trust boundary** — auction/bid/verdict/settlement/path-release events are relay-observed
  and are now parsed in three new places (monitor, modal, publisher pre-check).
- **Not touched:** identity/signing material, wallet/NWC/Cashu seed handling, order payment lifecycles.

Prior review state at this head: 3 reviews exist, all `copilot-pull-request-reviewer[bot]` at
`9a4c4e36`/`85361cd7`/`c76ab196`, plus a maintainer review posted as an **issue comment** at
`9a4c4e36` (2026-09-15T11:29:26Z). None is at `cfef7525`, so this review is cold at the current tip.
Related: this PR is intended to close **#1050** (still open); **#1278** and **#1279** are open with no
PR and are *not* touched by this delta (see acquittal D).

## Verification battery (all commands run in a worktree at this head SHA)

| # | Command | Result |
| --- | --- | --- |
| 1 | `git log --oneline origin/auctions..HEAD` / `git diff --name-status origin/auctions...HEAD` | 27 commits, 19 files, +1466/−103 (own slice only) |
| 2 | `gh pr view 1317 --repo PlebeianApp/market --json headRefOid,mergeable,mergeStateStatus,reviewDecision,isDraft` | `cfef7525…`, `MERGEABLE`, `BLOCKED`, `REVIEW_REQUIRED`, `isDraft:false` |
| 3 | `bun test src/lib/__tests__/auctionWon.test.ts` | **16 pass / 0 fail** at this head |
| 4 | `bun run test:unit` | **1113 pass / 0 fail, 79 files** at this head |
| 5 | Review of each new/changed file at the head SHA (reads + `grep`), quoted below | see findings |
| 6 | `bunx tsc --noEmit -p tsconfig.json` | **329** repo-wide errors at this head of the contribution branch, **329** at the same base SHA without it (`grep -c "error TS"`); none of the three errors in touched files is on an added line (the repo has no `typecheck` script and CI does not gate on it) |
| 7 | `gh api …/pulls/1317/reviews`, `…/issues/1317/comments`, issues `1050/1278/1279` | 3 older bot reviews, 0 reviews at head; #1050/#1278/#1279 all open |
| 8 | Playwright | **not run** — `e2e/AGENTS.md:13-15` forbids starting e2e services without explicit approval |

## Blocking

**None.** I could not construct a path where this diff produces a false claim about money, a wrong
amount, or an unsafe release. Details of what I probed and dropped are in "Acquitted" below; the
release gate is materially *harder* to pass after this PR than before it.

## Non-blockers

### [P2] 1 — The win prompt invites a settle action the publish layer always rejects, and then holds the head of the queue

**Mechanism (two predicates for one question).** The read side asks the status-specific question:

- `src/lib/auction/winNotification.ts:141-150` — `hasFinalSettlementForAuctionWin` returns true only when
  `parsed.value.status === 'settled'` (line 145).
- `src/publish/auctions.tsx:1273-1285` fails **any** settlement for the auction:
  `if (hasAuctionSettlement) { throw new Error('Auction already has a settlement. Refresh and try again.') }`
  — the predicate there is seller + root + coordinate, with no status test.
- Four terminal statuses are publishable and parse cleanly:
  `src/lib/schemas/auction/settlementEvents.ts:109-111` — `z.enum(['settled','reserve_not_met','cancelled','griefed_no_fallback'])`.

**Consequence (reproducible by reading the state machine).** With a `cancelled` or
`griefed_no_fallback` settlement present for an auction where the user is still the canonical winner:

1. `AuctionWonModal.tsx:99-110` — `hasSellerSettlement`-equivalent (`hasFinalSettlement`) is `false`,
   `hasVerifiedUnresolved` is therefore `true`, and the modal renders the win + "Settle auction".
2. `AuctionWonModal.tsx:153-155` — the pre-settle guard (`latestSettlementExists`) also uses the
   status-specific predicate, so it does not stop the attempt.
3. `nip60Actions.settleAuctionAsWinner` → `publishBidderPathRelease` throws
   `Cannot release path: Auction already has a settlement. Refresh and try again.`
   (`publish/auctions.tsx:1283-1287`), surfacing as
   `toast.error('Failed to settle auction: …')` (`AuctionWonModal.tsx:179`). "Refresh and try again"
   can never succeed — the settlement status does not change.
4. The dismissal effect (`AuctionWonModal.tsx:118-122`) has no condition that fires
   (`hasSettlementExpired` false, status-specific settlement false, `hasReleasedPath` false,
   `isNoLongerWinner` false), so the modal stays up. Because the modal renders only the head of the
   queue (`AuctionWonModal.tsx:53` — `const active = queue[0] ?? null`), **no other win can be
   presented** while this one sits there. The monitor also does not retire it, for the same reason
   (`useAuctionWinMonitor.ts:106-111`).
5. The user's only exit is the X → "Leave settlement?" confirmation, i.e. abandoning the win; the
   state self-clears at settlement-window expiry (≤ `settlement_grace`).

Note this is a *deliberate* asymmetry, not an oversight: the PR asserts it in its own tests —
`src/lib/__tests__/auctionWon.test.ts:303-311`, `'does not treat non-settled terminal statuses as
winner settlement'` (correct for "did the sale complete", wrong for "should the prompt stay up").

**Prescription.** Widen the *read* side to "any seller settlement for this auction + coordinate",
keeping the status-specific predicate as its `settled`-only special case, and apply it at the three
read-side call sites (modal dismissal/`hasVerifiedUnresolved`, modal pre-settle guard, monitor
terminal marking). **Do not** relax the publish gate — refusing the release while any seller
settlement exists is the correct fail-closed behaviour. Implemented and tested in #1323.

**Smallest safe alternative** if you prefer to keep the read side status-specific: widen only the
pre-settle guard (modal:153-155) so the user gets
`'This auction is no longer available for settlement.'` instead of a raw publish error. That removes
the loop, but the queue head still stays occupied until expiry.

### [P2] 2 — New components are placed outside the documented component structure

`src/components/AGENTS.md:22-37` (per ADR-0007 §1b) lists the seven homes for components
(`ui/`, `ui-wrappers/`, `shared/`, `nostr/`, `layout/`, `dialogs/`, `theme-migration/`), states
"New components must be placed in the appropriate subdirectory above", and scopes the migration-debt
carve-out to "Legacy components that currently exist outside `src/components/`". `nostr/` is
documented as "Nostr-domain components (users, products, **auctions**, profiles)" (line 29).

`git diff --name-status origin/auctions...HEAD` shows both new component files at the root:
`A src/components/AuctionWonModal.tsx`, `A src/components/ConfettiBurst.tsx`. Root-level auction
components such as `src/components/AuctionCountdown.tsx` are the legacy debt being migrated, not a
precedent for new files.

**Prescription (implemented in #1323):** move to `src/components/nostr/AuctionWonModal.tsx` (auction
domain) and `src/components/shared/ConfettiBurst.tsx` (general-purpose), updating the only two import
sites (`src/routes/__root.tsx:24` and the modal's own `ConfettiBurst` import). The move is legal under
the documented import hierarchy, and `git diff -M` records both as renames.

### [P3] 3 — The modal re-resolves the whole auction every 5 s, uncapped, duplicating the monitor's capped 20 s check

`AuctionWonModal.tsx:76-92` runs, on `refetchInterval: 5000`, three uncapped relay queries
(`fetchAuctionBids(…, null, …)`, `fetchAuctionVerdicts(…, null, …)`, `fetchAuctionPathReleases(…, null, …)`)
and then `resolveAuctionWinFromEvents` → `fetchBidNut7States(parsedBids, auction.mints)`
(`winNotification.ts:68`), i.e. one NUT-7 `checkProofStateBatch` POST per distinct auction mint for
every bid's proofs. The monitor already does the same computation with explicit caps every 20 s
(`useAuctionWinMonitor.ts:29-32`: `POLL_INTERVAL_MS = 20000`, `AUCTION_EVENT_LIMIT = 500`,
`PATH_RELEASE_LIMIT = 200`; used at lines 100-105). The modal also re-fetches the auction on its own
query key (`auctionQueryOptions(…, true, true)`, line 61).

Advisory only: the modal is mounted only while a win is pending, and the uncapped fetch is what makes
the winner resolution authoritative (I would *not* cap the bid set here — that could hide the winning
bid in a busy auction). Suggest tuning cadence or sharing the monitor's already-computed result.

### [P3] 4 — Scope: an NDK/applesauce addressing fix rides along (commit `b3204b94`)

`git show --stat b3204b94` — 5 files, 18 insertions / 9 deletions, none on the win path:
`src/lib/nostr/eventLike.ts` (+5, new `getEventAddress`), `src/publish/comments.tsx`,
`src/publish/reactions.tsx`, `src/queries/comments.tsx`, `src/queries/reactions.tsx`.

I checked whether the swap changes behaviour, and **it does not** at any replaced call site: every
site is guarded by `isAddressableKind(...)` (e.g. `src/publish/reactions.tsx:52`), which is
`30000 <= kind < 40000` (`nostr-tools/lib/esm/kinds.js:41-43`) — exactly NDK's param-replaceable
branch — and `getEventAddress` builds `\`${event.kind}:${event.pubkey}:${identifier}\`` from the first
`d` tag (`eventLike.ts:27-30`), identical to NDK's `tagAddress()`
(`@nostr-dev-kit/ndk` `tagAddress() { if (this.isParamReplaceable()) { const dTagId = this.dTag ?? ""; return \`${this.kind}:${this.pubkey}:${dTagId}\` } … }`).

So this is a scope ask, not a correctness ask: either (a) re-home it to a named PR against `auctions`
and link that here, or (b) keep it and state in the description which base-branch crash it fixes plus
that you own it. A one-line comment at the helper naming the crash would make it reviewable on its own.

### [P3] 5 — No e2e coverage for the first surface that tells a bidder they won

30 Playwright specs ship at this head, including the adjacent `e2e/tests/auction-settlement.spec.ts`;
the delta contains no e2e file (`git diff --name-status origin/auctions...HEAD`). This is the surface
that *informs the user of an outcome*, so please add a targeted spec: happy path (prompt appears →
Settle → "Path release published"), plus a negative (a seller settlement published → prompt closes).
Config note: `e2e/playwright.config.ts:19,21` → `trace: 'on-first-retry'`, `video: 'retain-on-failure'`,
so evidence only exists for failures.

### [P3, RISK] 6 — "Auction unavailable" is treated as "auction absent", which deletes an announced win

`useAuctionWinMonitor.ts:76-82`:

```ts
const auction = await fetchAuctionWithRetry(rootEventId, true)
if (!auction) {
	terminalRootEventIds.current.add(rootEventId)
	announcedBidIdsByRoot.current.delete(rootEventId)
	auctionWonActions.removeForAuction(rootEventId)
	continue
}
```

`fetchAuctionWithRetry` is 3 attempts, 500 ms apart (`src/queries/auctions.tsx:210-222`), and the fetch
seam **resolves empty on timeout instead of rejecting** — `src/lib/nostr/io-applesauce.ts:42-46`:
`if (urls.length === 0) return Promise.resolve([])` … `const timer = setTimeout(() => { subscription?.unsubscribe(); resolve(collected) }, opts?.timeoutMs ?? 8000)`.
So "relays did not answer within ~8 s, three times" is indistinguishable here from "the auction was
deleted", and the consequence is that an already-announced win is removed from the queue and that
auction is never re-checked for the rest of the session (until an auth change or reload).

This is the same conflation the doctrine names — *"'metadata not observed from the configured
relays', never a claim of genuine absence"* — and it is a deliberate trade-off: the commit that adds
it exists because an unavailable auction otherwise blocks the queue head (`git log` in the delta shows
the "unavailable auctions blocking the queue" fix). I am **not** asking for a redesign, and I did not
implement anything here: it needs your call on how much relay ambiguity to ride out. Two cheap
options: tolerate N consecutive empty results before marking terminal (3 ticks ≈ 60 s), or only mark
terminal on an explicit deletion signal (`fetchAuction` already consults `isAuctionDeleted`/blacklist,
`src/queries/auctions.tsx:202-204`).

## Explicitly probed and acquitted

- **A. Verdict-signature asymmetry — not a defect.** The monitor and modal fetch verdicts without the
  `verifySignatures` argument while bids, settlements and path releases pass `true`
  (`useAuctionWinMonitor.ts:101,102,103,104`; `AuctionWonModal.tsx:84-86`). Acquitted: verdict reads
  verify unconditionally at the parse boundary —
  `src/queries/auctions.tsx:565-572`: `filterBlacklistedEvents(events) … .filter(isVerifiedVerdictEvent)`
  ("Signature verification at the parse boundary: drop unverified events before any component can
  render a verdict from them") plus a client-side author re-check
  `.filter((event) => !auditorPubkeys || auditorPubkeys.includes(event.pubkey))`. Canonical-winner
  inputs are therefore signature-backed in every new call path.
- **B. Two settlement-deadline formulas — they agree.** The modal uses
  `getAuctionBiddingCutoffAt(auction) + getAuctionSettlementGrace(auction)` (modal:96) while the new
  publish gate uses `parsedAuction.maxEndAt + parsedAuction.settlementGrace`
  (`publish/auctions.tsx:1253`). Acquitted: `parseAuctionEvent` sets
  `const maxEndAt = readIntegerTag(event, 'max_end_at') ?? endAt`
  (`src/lib/schemas/auction/auctionEvent.ts:147`) and refines `maxEndAt >= endAt` (line 101), while
  `getAuctionBiddingCutoffAt` returns `endAt` when `maxEndAt` is absent or smaller
  (`src/lib/auctionSettlement.ts:82-88`: `if (!maxEndAt || maxEndAt < endAt) return endAt`) — identical
  for every parseable auction.
- **C. Query-key suffix change — invalidations still close.** `auctionQueryOptions` /
  `auctionSettlementsQueryOptions` append `'verified'|'unverified'` to the key; there are no
  `getQueryData(auctionKeys.*)` readers anywhere in `src/` (grep), and TanStack invalidates by prefix,
  so `invalidateQueries({ queryKey: auctionKeys.details(id) })` and `auctionKeys.pathReleases(...)`
  (modal:172-173) hit both variants.
- **D. #1279 "definitive results from incomplete data" — not reintroduced; #1278 not touched.** The
  prompt requires `auctionQuery.isSuccess && settlementsQuery.isSuccess && winResolutionQuery.isSuccess`
  (modal:103-110) before rendering anything, and the resolution's NUT-7 step resolves per-mint failure
  to `'unknown'` rather than dropping evidence (`src/lib/auction/useNut7Polling.ts:41-43`), which
  `computeValidatedBids` treats as "no NUT-7 evidence yet → the bid stays VALID (quorum-confirmed)"
  (`src/lib/auction/bidValidation.ts:438-441`) — the documented ADR-0004 split, unchanged here. A
  *spent* winner is still excluded pre-settlement (same lines, `finalInvalid.push(c.bid)`), and the
  publish-side chain gate still refuses unknown/pending/missing states
  (`validateBidChainNut7PrePublish`, `bidValidation.ts:43-77`). No file in the delta belongs to the
  bid-submission/bid-failure surface (#1278).
- **E. The release gate got stronger, not weaker.** The pre-existing `won_pending_settlement` quorum
  throw survives verbatim with a fail-closed catch around it
  (`publish/auctions.tsx:1321-1346`), and the new pre-release re-resolution (1270-1272,
  `'Auction winner changed. Refresh and try again.'`) plus settlement gate (1273-1285) are additive.
- **F. Reserve.** The monitor only announces a reserve-meeting winner
  (`useAuctionWinMonitor.ts:144-149`: `const reserveMet = canonicalWinner.amount >= parsedAuction.reserve`),
  so the modal cannot promise a win the seller is told to close as `reserve_not_met`.
- **G. Account separation.** `retainForBidder` on auth changes and `clear` on logout
  (`src/lib/stores/auctionWon.ts:35-41`; `useAuctionWinMonitor.ts:47-52`), plus an account re-check
  before settling (modal:142-147). No cross-account prompt.
- **H. Test integrity.** The PR's added specs assert behaviour, not existence: e.g.
  `'excludes a quorum-confirmed high bid when NUT-7 reports it spent'`
  (`auctionWon.test.ts:331`, asserting the winner flips to the other bidder) and
  `'requires a valid release for every leg in a winning rebid chain'` (`auctionWon.test.ts:366`).
  No always-true assertions or swallowed failures found in the new tests.

## Test and coverage contract

- The PR's own added specs are green at this head: **16 pass / 0 fail**
  (`bun test src/lib/__tests__/auctionWon.test.ts`), and the full unit suite is
  **1113 pass / 0 fail across 79 files** (`bun run test:unit`).
- For finding 1, the fix is covered by 4 added tests in a new `describe` block
  (`auction win seller-closure verification`) — all four terminal statuses, the no-settlement case,
  wrong seller/root/coordinate, and a malformed event. The four existing settlement tests were **not**
  edited (no assertion weakened): `bun test …auctionWon.test.ts` → **20 pass / 0 fail** on #1323.
- For finding 2, verification is the move itself: `git diff -M` records two renames, the two import
  sites are updated, `bunx prettier --check` is clean on all touched files, and the full unit suite
  stays green (1117 pass / 0 fail).
- E2E: not run here (approval-gated per `e2e/AGENTS.md:13-15`); a targeted spec for the win flow is
  requested in [P3] 5.

## Approval path

**[P2] 1** and **[P2] 2** are the only items I am asking you to act on; both are small and both are
already implemented, tested and pushed in **PlebeianApp/market#1323** (base
`feat/1050-auction-winning-modal` @ `cfef7525e9bebbe1204f7b68d6fdfca6b379714f`) — merge it, or tell me
which alternative you prefer and I will rework it. [P3] 3–5 and the [P3] RISK are lower priority and
can be follow-ups; if you would rather keep the addressing fix in this PR, one sentence of ownership in
the description is enough for [P3] 4.

I will re-review at the next head SHA and will not reopen anything resolved here.

**VERDICT: CHANGES REQUIRED**

