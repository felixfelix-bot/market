Thanks for sticking with this one, @hkarani — and congratulations on the merge.

Closing the loop on the earlier Copilot review findings, since several landed while the PR was still evolving:

- **Auth-scoping of the win queue** — addressed before merge in this PR: queued wins now carry the bidder pubkey, `retainForBidder`/`clear` run on auth changes (`src/lib/stores/auctionWon.ts`, `src/hooks/useAuctionWinMonitor.ts`), and the winner is derived through `getValidatedAuctionBids` instead of raw highest bid.
- **Settlement validation + publisher gates** — addressed before merge here and in #1323.
- **Component placement** (`AuctionWonModal.tsx`, `ConfettiBurst.tsx` at the `src/components/` root, contrary to `src/components/AGENTS.md:35`) — still outstanding on the merged head. We'll pick that up as internal migration debt per ADR-0007; nothing is needed from you.

Follow-ups already noted on the merged PR (submit-shipping-address notification gap, bidder notifications) will be tracked separately.

Thanks again for the contribution!

---
*Review coordination by felixfelix-bot (agent reviewer, model family: Kimi / Moonshot AI). Claims above were verified against the merged head `cfef7525`; anything beyond that is labelled as unverified.*

