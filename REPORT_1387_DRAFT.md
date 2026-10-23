Reviewed `feat/coco-v2-wallet-auction-lifecycle` @ **`7d8d1ed47fba`** against base `auctions` (`a3a76b6c`). Read-only review; no branch checkout in my tree.

Verdict: **changes requested** — the money path is mostly gated properly, but the bid lifecycle can enter states the release path refuses to exit, and the Coco test-state reset half-deletes its own state. Four of these are worth fixing before this lands on `auctions`.

Checks that passed (so you know what I did not flag): legacy monetary entry points are all gated (`assertLegacyAuctionMoneyAllowed` at auctions.tsx:709/1365/1855/2155); `fetchAuctionVerdicts(..., true)` call-site change is a no-op (the function takes 5 params, both forms pass `undefined` for `validatorPubkeys`); `--no-sourcemap` really does reach `sourcemap:false` (build.ts:66-71, merged at :177); the republish cache is localStorage-backed, not in-memory.

**[RISK] 1 — the bid path creates rebid chains that release/receive then refuse**
`src/components/AuctionBidder.tsx:217-236` computes `previousBidAmount` and rebids as a delta leg, and `prepareCocoAuctionBid` accepts `previousBidEventId`, so a second bid produces a winner with `prevBidId` set. But `src/publish/auctions.tsx:1632` and `:1680` throw `'Coco rebid-chain settlement is not yet enabled'` for exactly that winner. Net effect: any bidder who raised their bid can never be released or received — the funds sit locked until locktime. Either implement the chain or refuse the rebid at bid time (`prepareCocoAuctionBid` should reject a second bid instead of minting an unsettleable winner).

**[RISK] 2 — the fresh-browser reset deletes the wrong databases**
`src/lib/coco/runtime.ts:19` names the account DB `plebeian_coco_v2_<env>_<pubkey>` (underscores). `src/lib/coco/migration/freshAuctionsdevBrowser.ts:366` filters on `startsWith('plebeian-market-coco-v2-')` (hyphens), so `resetBrowserCocoAuctionTestState` wipes the seed vault, recovery, migration-control and command stores but leaves the wallet DB — funds and send operations — untouched. That is the worst of both worlds: command records gone, wallet still there, which is precisely the state that triggers finding 3. Match the real name (or derive it from the same constant) and assert the wallet DB was actually deleted.

**[RISK] 3 — a missing Send operation is reported as a successful refund**
`src/lib/coco/auctions/cocoEngine.ts:285`: `if (!operation || operation.state === 'rolled_back') return { operationId, state: 'refunded' }`. `!operation` means the send is not there to reclaim, yet the caller treats `state: 'refunded'` as success and the UI toasts "Original Coco Send refunded." Return a distinguishable state (e.g. `unavailable`) for `!operation` and let the UI say so; a refund that moved nothing must not read as a refund.

**[RISK] 4 — the publication cache entry is discarded before the durable status write**
`src/lib/coco/auctions/walletHost.ts:576-588` calls `publisher.publish(eventId)` (which drops the cached signed event) and only *then* `commands.update(..., 'published')`. If that write fails, the command stays `publication_ready` with no cached event, and the retry dies on `'Exact cached Coco kind-… is unavailable'` (auctions.tsx:641, :1460) — permanently, for an event that is already on the relay. Mark published first, then discard the cache; the republish must stay idempotent.

**[RISK] 5 — keyset validation was dropped from two validators while swapping cashu-ts**
`src/lib/auctionSettlementP2pk.ts:119-121` now calls `inspectCashuToken(input.token)` instead of `getDecodedToken(token, input.mintKeysets)`, and `validatePathRelease` (src/lib/auction/validation.ts:773) does the same. The P2PK lock/id/amount checks that remain are good, but nothing now ties a proof's keyset to the mint that is supposed to have issued it — `coco_operation` keysets are simply accepted on the token's own say-so, and the failure surfaces later at redemption. `mintKeysets` is now a dead parameter. Reinstate the keyset check explicitly rather than dropping it to satisfy the v5 signature.

**[NIT] 6 — `readEnv`'s six-arm nested ternary** (`src/lib/coco/auctions/mode.ts:22-40`) reads the same as three `if/throw`s and hides one wrong-operator bug. A `const PRODUCTION = { hosts: [...], mintUrls: [...] }` table keeps the static values greppable and removes the operator-precedence trap.

**[NIT] 7 — `previousBidAmount` filters to `coco_operation` bids only** (`AuctionBidder.tsx:219-221`), so in Coco mode a user's pre-flip bid is invisible to the delta calculation and a rebid locks the full amount again on top of it. Fine if legacy bids are declared unsupported (see below), but then say so at the bid button, not only in the refund toast.

**[INFO] 8 — PR body's "immutable identities" are stale** (base `ea7b4b12`, head `e0e83e98`, app parent `0bdcf48c`; actual base is `a3a76b6c`, head `7d8d1ed4`) and GitHub reports `mergeable: CONFLICTING`. Also: a 741-line rewrite of `src/feature/wallet/components/Nip60Wallet.tsx` plus 195 lines of `src/lib/stores/nip60.ts` ride along with the auction work — that is a bisect hazard in the one PR that must never lose a payment state. Consider splitting it.

**[INFO] 9 — legacy bids become unrefundable the moment Coco mode turns on.** `src/routes/_dashboard-layout/dashboard/products/bids.tsx:359` returns "Coco v2 refunds are unavailable until Checkpoint C is supported" and the per-bid button is disabled without a `coco_operation` tag, while the legacy paths hard-throw. Bids in flight at flip time are stranded until locktime. Acceptable for fake funds, and it is at least fail-closed — but it needs to be written down as a rollout precondition (drain in-flight bids before flipping), not discovered by a user.

I did not run the suite: this checkout has no `@cashu/coco-core` installed from the vendored tarballs, so nothing here is a statement about tests, build, or CI. Findings 1–5 are from reading the code.
