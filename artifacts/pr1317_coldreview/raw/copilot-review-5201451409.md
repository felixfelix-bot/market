### 🟡 Changes recommended

One or more issues must be addressed before approval.

*Get a fresh assessment by requesting another Copilot review.*

<details>
<summary>Pull request overview</summary>

Adds a global auction-winner settlement experience, including queued wins, settlement validation, CTA handling, and repeating confetti.

**Changes:**
- Adds global win monitoring and queued modal progression.
- Adds settlement countdown, confirmation flow, and confetti animation.
- Replaces NDK address generation with a shared helper.
</details>

<details>
<summary>File summaries</summary>

| File | Description |
| ---- | ----------- |
| src/routes/__root.tsx | Updated as part of this pull request. |
| src/queries/reactions.tsx | Updated as part of this pull request. |
| src/queries/comments.tsx | Updated as part of this pull request. |
| src/publish/reactions.tsx | Updated as part of this pull request. |
| src/publish/comments.tsx | Updated as part of this pull request. |
| src/lib/stores/auctionWon.ts | Updated as part of this pull request. |
| src/lib/nostr/eventLike.ts | Updated as part of this pull request. |
| src/hooks/useAuctionWinMonitor.ts | Updated as part of this pull request. |
| src/components/ConfettiBurst.tsx | Updated as part of this pull request. |
| src/components/AuctionWonModal.tsx | Updated as part of this pull request. |
</details>

<details>
<summary>Review details</summary>

### Suppressed comments (6)

**src/components/AuctionWonModal.tsx:63**
* `parseSettlementEvent` validates only the event shape; `fetchAuctionSettlements` returns raw relay events and this check does not verify the Nostr signature or the settlement's semantic validity against the validated bids. An unsigned/forged kind-1024 event or an invalid `reserve_not_met`/`cancelled` record matching these three fields can therefore dismiss a real winner's modal. Validate the event at this trust boundary and reuse the existing settlement validity checks before treating it as terminal.
```
			const parsed = parseSettlementEvent(toRawEvent(event))
			return (
				parsed.ok &&
				parsed.value.sellerPubkey === auction.pubkey &&
				parsed.value.auctionRootEventId === active?.auctionRootEventId &&
				parsed.value.auctionCoordinate === auctionCoordinate
```
**src/components/AuctionWonModal.tsx:77**
* If either query errors, `hasVerifiedUnresolved` becomes false and this component returns `null`, but no effect removes the active queue item or provides a retry path. The FIFO head can consequently remain hidden forever and prevent every later win from being displayed. Handle query failures/unknown auctions explicitly with retryable UI or a deliberate queue dismissal.
```
	useEffect(() => {
		if (active && (hasSettlementExpired || hasFinalSettlement)) auctionWonActions.dismissActive()
	}, [active, hasFinalSettlement, hasSettlementExpired])

	if (!active || !hasVerifiedUnresolved || hasSettlementExpired) return null
```
**src/components/AuctionWonModal.tsx:98**
* The completion handler dismisses the queue head after several awaits. The expiry/final-settlement effect can dismiss that same item while publishing is in flight; if the next win has become active, this stale completion calls `dismissActive()` again and drops the next win without showing it. Make queue removal conditional on the submitted auction/bid, or serialize transitions.
```
			await queryClient.invalidateQueries({ queryKey: auctionKeys.pathReleases(active.auctionRootEventId) })
			await queryClient.invalidateQueries({ queryKey: auctionKeys.details(active.auctionRootEventId) })
			toast.success('Path release published — seller can now redeem')
			auctionWonActions.dismissActive()
```
**src/hooks/useAuctionWinMonitor.ts:85**
* The cancellation flag is checked before `fetchAuction`, but not after the later awaited bid fetch/build. If logout or account switching happens while those requests are in flight, this old effect can still append a win to the global queue after cleanup, recreating the stale-account modal. Recheck `cancelled` immediately before mutating `resolvedRootEventIds` or enqueueing.
```
					resolvedRootEventIds.current.add(rootEventId)

					const topChain = [...chains].sort(compareAuctionBidChainPriority)[0]
					if (!topChain || topChain.bidderPubkey !== pubkey) continue

					const bidAmount = getBidAmount(topChain.latestBid)
					const reserveMet = bidAmount >= getAuctionReserve(auction)
					if (!reserveMet) continue
					auctionWonActions.enqueue({
```
**src/hooks/useAuctionWinMonitor.ts:80**
* `resolvedRootEventIds` is populated before the winner decision. Because the bid lookup is capped and relay data can be incomplete, a partial fetch can make `topChain` missing or point at another bidder; this line then suppresses the auction for the rest of the session, so a later poll can never surface a valid win. Mark it resolved only after a complete/validated terminal result, or retry candidates until the settlement window expires.
```
					resolvedRootEventIds.current.add(rootEventId)

					const topChain = [...chains].sort(compareAuctionBidChainPriority)[0]
					if (!topChain || topChain.bidderPubkey !== pubkey) continue
```
**src/hooks/useAuctionWinMonitor.ts:60**
* Every 20 seconds this scan can call `fetchAuction` once per distinct auction, and then `fetchAuctionBids` again for each ended auction, for up to 500 candidates. Since `fetchAuction` also loads versions, this creates hundreds or thousands of relay fetches per poll and defeats the batch helpers already used elsewhere to avoid relay saturation. Batch or otherwise bound/cache this scan before enabling it globally.
```
					const auction = await fetchAuction(rootEventId)
					if (!auction) continue

					const biddingCutoffAt = getAuctionBiddingCutoffAt(auction)
					const now = Math.floor(Date.now() / 1000)
```

- **Files reviewed:** 10/10 changed files
- **Comments generated:** 4
- **Review effort level:** Lite
</details>

---

💡 Configure MCP servers for context-aware, tailored reviews. <a href="https://docs.github.com/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui#mcp-servers-and-agent-skills" class="Link--inTextBlock" target="_blank" rel="noopener noreferrer">Learn more in the docs.</a>
