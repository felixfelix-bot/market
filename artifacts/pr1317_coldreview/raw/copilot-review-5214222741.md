### 🟡 Changes recommended

Unresolved critical and moderate findings affect event verification, settlement safety, winner detection, and queue correctness.

*Get a fresh assessment by requesting another Copilot review.*

<details>
<summary>Review details</summary>

### Suppressed comments (8)

**src/components/AuctionWonModal.tsx:28**
* This new root-level component owns raw relay queries/parsing and invokes the domain `nip60Actions` settlement mutation. The component layout reserves root-level files as migration debt and requires new components to live in a feature subdirectory, while protocol/payment mutations belong in a data/publish layer; move the resolution/publish workflow behind a hook or feature adapter and have the UI receive validated data plus callbacks.
```
import { nip60Actions } from '@/lib/stores/nip60'
import { useAuctionCountdown } from '@/components/AuctionCountdown'
import { getAuctionCoordinate } from '@/lib/auctionSettlement'
import { hasFinalSettlementForAuctionWin, resolveAuctionWin, shouldUseNonBlockingAuctionWinPrompt } from '@/lib/auction/winNotification'
import { fetchBidNut7States } from '@/lib/auction/useNut7Polling'
```
**src/components/AuctionWonModal.tsx:92**
* Every 5-second `winResolutionQuery` refetch calls `fetchBidNut7States`, which performs NUT-7 requests to each allowlisted mint. The shared poller intentionally uses a 60-second interval, so opening this modal creates repeated payment-state traffic and duplicates the monitor's polling. Cache/reuse the NUT-7 state or separate the faster relay-resolution refresh from the slower mint poll.
```
			const nut7States = await fetchBidNut7States(parsedBids, parsedAuction.mints)
			return resolveAuctionWin(
				active,
```
**src/components/AuctionWonModal.tsx:120**
* The modal revalidation also treats `resolveAuctionWin().isActiveWinner` as sufficient, but its canonical winner can be based only on `valid_bid_placed`. That allows the CTA to render before the required `won_pending_settlement` quorum exists, after which the publish path rejects the settlement. Keep this prompt hidden until the settlement-ready quorum is verified.
```
	const hasVerifiedUnresolved =
		auctionQuery.isSuccess &&
		settlementsQuery.isSuccess &&
		winResolutionQuery.isSuccess &&
		winResolutionQuery.data.isActiveWinner &&
		!hasFinalSettlement &&
		!hasReleasedPath
```
**src/components/AuctionWonModal.tsx:116**
* When revalidation returns no `canonicalWinner`, `isNoLongerWinner` remains false. `hasVerifiedUnresolved` is then false, but the dismissal effect also does nothing, so this FIFO item stays at `queue[0]` and all later wins remain hidden. Handle a successful no-winner result as an explicit skip, while keeping loading and transport-error states retryable.
```
	const isNoLongerWinner = !!winResolutionQuery.data?.canonicalWinner && !winResolutionQuery.data.isActiveWinner
	const hasVerifiedUnresolved =
		auctionQuery.isSuccess &&
		settlementsQuery.isSuccess &&
```
**src/components/AuctionWonModal.tsx:240**
* On these detail/order routes this non-blocking prompt is the winner UI, but it renders only the title and amount. Issue #1050 requires the won auction to include its name, image, and seller, so winners on these routes miss two required details. Include the media/seller summary here or keep the full modal for routes where those details are required.
```
							<div className="min-w-0">
								<h2 id="auction-win-prompt-title" className="text-lg font-bold">
									You won this auction
								</h2>
								<p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
```
**src/hooks/useAuctionWinMonitor.ts:114**
* `canonicalWinner` here only means the bid has a generic confirm quorum (`valid_bid_placed` or `won_pending_settlement`). `settleAuctionAsWinner` independently requires a quorum of `won_pending_settlement`, so this can enqueue/show a win while the CTA is guaranteed to fail until validators publish the stronger claim. Gate enqueue on that claim or expose a settlement-ready result from the shared resolution helper.
```
					const validatedBids = getValidatedAuctionBids(parsedAuction, parsedBids, parsedVerdicts, nut7States)
					const canonicalWinner = validatedBids.canonicalWinner

					if (!canonicalWinner) continue
					if (canonicalWinner.bidderPubkey !== pubkey) continue
```
**src/hooks/useAuctionWinMonitor.ts:79**
* The cancellation flag is checked before `fetchAuction`, but this mutation happens after that await without rechecking it. If the authenticated account changes while the request is in flight, the old check can add its root to the shared terminal set; the same post-await writes occur at lines 94 and 125 and can suppress a valid prompt for the new account. Recheck cancellation or a generation token before every ref mutation.
```
						terminalRootEventIds.current.add(rootEventId)
```
**src/queries/auctions.tsx:378**
* Passing `null` only omits the NIP-01 `limit` field; it does not guarantee a complete history because relays may apply their own defaults or caps. Older bids or rebid-chain legs can therefore be omitted, causing false no-win/no-release decisions while the monitor assumes the result is complete. Use pagination or relay-complete aggregation rather than treating `null` as “all”.
```
	limit: number | null = 500,
```

- **Files reviewed:** 18/18 changed files
- **Comments generated:** 9
- **Review effort level:** Lite
</details>
