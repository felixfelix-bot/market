PROGRESS — PR #1138 own-delta review: auction domain (logic / state machine / settlement math)

Reviewed head: 6be7496cc2089db2e2da04bb083312ae6d43a79d
Delta base:    c8c06fd74dd3d259dfc43bf79f7da2c3590eb664  (387 files, +79,922 / -1,579 — verified in PREFLIGHT-1138.md)
Worktree:      /home/c03rad0r/worktrees/t_1138-own  (branch review/1138-auction-domain)
Scope:         auction domain only. Do NOT post to GitHub.

FINDINGS SO FAR
[f1] BLOCK — validator-path settlement completeness rejects every multi-leg (rebid) chain.
     REPRODUCED: .review/repro-rebid-payout.ts -> validator-path {isComplete:false,
     failureCode:"path_release_invalid", detail:"cashu_token proof sum 4000 does not match
     expected leg amount 10000"}; client-descriptor {isComplete:true}. Root cause:
     src/lib/schemas/auction/bidEvent.ts:148 sets legLockedAmount := `amount` tag (cumulative),
     and src/server/auction-validator/lifecycle.ts:322-329 buildSettlementChain() pushes the
     parsed bid unchanged, so src/lib/auction/validation.ts:1147 credits every leg the
     CUMULATIVE amount. settlementDescriptor.ts:209 has the adapter that rewrites it; the
     validator path does not.
     STATUS: reproduced, needs one more confirmation of the descriptor-path contrast + report.

[f2] INFO — getAuctionEffectiveEndAt / extension_rule is dead v1-superseded code (AUCTIONS.md §6.1
     "v1 retires the dynamic extension_rule model") yet still exported and reachable from
     src/queries/auctions.tsx:826.
     STATUS: confirmed by grep (only test + re-export callers).

[f3] pending — seller self-bid: no check that bidderPubkey != auction.sellerPubkey anywhere in
     validateBid or the schema.
     STATUS: needs one confirming grep + a spec citation.

NEXT STEPS
1. Confirm f3 (self-bid) with a direct grep and spec check.
2. Check cancellation reachability: 'cancelled' status is parsed/handled but never published.
3. Check assignCloseRoles/pickWinningBid late-bid demotion interaction.
4. Write REPORT.md, commit + push.
