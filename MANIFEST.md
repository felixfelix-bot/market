# MANIFEST — PR #1138 own delta
Range: `c8c06fd74dd3d259dfc43bf79f7da2c3590eb664..6be7496cc2089db2e2da04bb083312ae6d43a79d` (merge-base with origin/master == PR base.sha)
Totals: 387 files, +79922 / -1579

Status: A=new, M=modified. `Note` is the subject of the last commit in range touching the file.

## Production code (auction modules, routes, components, server) — 217 files, +39191 / -1390

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +2313 -0 | A | `src/publish/auctions.tsx` | fix(auctions): spell the DLEQ pending reason and override flag consistently |
| +2127 -79 | M | `src/lib/stores/nip60.ts` | fix(auctions): #1280 re-review — descriptor terminal-miss threading + test, R2 seam test, seller-override helper + test, |
| +2023 -0 | A | `src/components/sheet-contents/auctions/AuctionFormContent.tsx` | feat(guardrails): add instance-literal guard and browse/cart/checkout coverage (R5) |
| +1437 -0 | A | `src/queries/auctions.tsx` | fix(auctions): repair conflict-resolution artifacts from the #1280 rebase |
| +1245 -0 | A | `src/routes/_dashboard-layout/dashboard/products/auctions.$auctionId.tsx` | fix(auctions): read NUT-7 evidence from parsed bids in the seller dashboard |
| +1233 -0 | A | `src/lib/auction/validation.ts` | wip(auctions): retire dleq_required — core code (tests pending) |
| +1196 -0 | A | `src/routes/auctions.$auctionId.tsx` | fix(e2e): retire CashuMintMock; seed settlement tests with real DLEQ collateral from the local nutshell mint; fix keyset |
| +1009 -0 | A | `src/lib/auction/settlementDescriptor.ts` | fix(auctions): harden rebid collateral validation |
| +961 -0 | A | `src/hooks/useAuctionBidFunding.ts` | fix(auction): gate the reclaim promise on a persisted pending token |
| +949 -5 | M | `src/hooks/useNotificationMonitor.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +950 -0 | A | `src/components/AuctionBidder.tsx` | fix(e2e): retire CashuMintMock; seed settlement tests with real DLEQ collateral from the local nutshell mint; fix keyset |
| +726 -0 | A | `src/server/auction-validator/subscriber.ts` | fix(auction-validator): preserve recovered bid observation time |
| +713 -0 | A | `src/routes/_dashboard-layout/dashboard/products/auctions.tsx` | fix(auctions): gate spec-invalid events out of the feed, name them on the detail page, and stop bidding on them (#1368) |
| +661 -0 | A | `src/routes/_dashboard-layout/dashboard/products/bids.tsx` | fix(auctions): address #1343 review — signing-time created_at, scoped NDK guard with coverage, publish-result fail-close |
| +610 -8 | M | `src/lib/stores/notifications.ts` | fix(notifications): scope auction activity notifications |
| +616 -0 | A | `src/lib/auction/bidValidation.ts` | fix(auctions): spell the DLEQ pending reason and override flag consistently |
| +560 -0 | A | `src/server/auction-validator/state.ts` | feat: add protection at validator’s relay-facing subscriber boundary |
| +541 -0 | A | `src/server/auction-validator/lifecycle.ts` | fix(auction-validator): bound child replay and clarify policy semantics |
| +387 -139 | M | `src/lib/stores/ndk.ts` | fix(config): wire trustedMints and bugRelay into their consumers (R3) |
| +479 -34 | M | `src/feature/wallet/components/DepositLightningModal.tsx` | fix(auction): deposit outcome uncertain lifecycle state |
| +489 -0 | A | `src/lib/cashu/dleq.ts` | fix(auctions): #1280 re-review — descriptor terminal-miss threading + test, R2 seam test, seller-override helper + test, |
| +469 -0 | A | `src/components/AuctionTimelineChart.tsx` | refactor(auctions): route production file set through the nostr io seam |
| +465 -0 | A | `src/lib/auctions/privateAuctionClaimMessage.ts` | refactor(auctions): route production file set through the nostr io seam |
| +32 -430 | M | `src/index.tsx` | Removed references to dotenv (bun automatically loads env variables) |
| +422 -0 | A | `src/components/AuctionBidProgressDialog.tsx` | fix(auction): honest branding for uncertain-lock failures |
| +417 -0 | A | `src/routes/auctions.index.tsx` | feat(labels): complete the auctions half of ADR-0009 (gating + surfaces) |
| +409 -0 | A | `src/lib/auction/events.ts` | wip(auctions): retire dleq_required — core code (tests pending) |
| +409 -0 | A | `src/lib/auctionSettlement.ts` | fix(auctions): pass validatedBidSet to badge function, add @deprecated to legacy helpers |
| +405 -0 | A | `src/lib/auction/tagBuilders.ts` | feat(auction): emit dleq_proof tags in buildBidEventTags (ADR-0011 B2) |
| +386 -0 | A | `src/lib/auctionPublishValidation.ts` | fix(auctions): reserve draft round-trip + treat 0 as no reserve + show bid ladder |
| +344 -0 | A | `src/lib/auction/bidderRecords.ts` | fix(auction): fail closed at the pre-lock recovery-record bound |
| +328 -0 | A | `src/components/AuctionSettlement.tsx` | fix(auctions): address #1280 review — R1 keyset ingestion, R2 path-release keysets, R3 terminal-miss/caps/seller-overrid |
| +320 -0 | A | `src/lib/cashu/p2pkSecret.ts` | refactor: remove old CVM auction path oracle code |
| +316 -0 | A | `src/components/AuctionWonModal.tsx` | fix(auctions): fix unavailable auctions blocking the queue |
| +256 -31 | M | `src/routes/_dashboard-layout/dashboard/app-settings/featured-items.tsx` | fix(e2e): stabilize checkout and order transitions |
| +282 -0 | A | `src/lib/schemas/auction/auctionEvent.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +281 -0 | A | `src/lib/schemas/auction/validatorEvents.ts` | fix(auction-validator): add bounded late-settlement observation window |
| +276 -0 | A | `src/server/auction-validator/spamPolicy.ts` | fix(auction-validator): add bounded late-settlement observation window |
| +272 -0 | A | `src/lib/cashu/dleqFixture.ts` | test(auctions): fixture sweep for unconditional DLEQ + thread keysets through win paths |
| +256 -0 | A | `src/components/AuctionBidsContainer.tsx` | refactor(auctions): close the round-2 non-blocking findings on the validated bid view |
| +246 -6 | M | `src/routes/_dashboard-layout/dashboard/app-settings/app-miscelleneous.tsx` | fix(self-hosting):app settings authorization with server and owner signing |
| +246 -0 | A | `src/lib/auction/constants.ts` | wip(auctions): retire dleq_required — core code (tests pending) |
| +245 -0 | A | `src/server/auction-validator/mintDestination.ts` | fix(auction-validator): disable mint probing by default, require explicit operator allowlist |
| +244 -0 | A | `src/lib/auctionSettlementP2pk.ts` | fix(auctions): reject fractional bid amounts |
| +136 -106 | M | `src/components/dialogs/TermsConditionsDialog.tsx` | fix(legal): let instances supply their own Terms and Conditions (R4) |
| +218 -0 | A | `src/components/ui/calendar.tsx` | feat(auction): add calendar component and enhanced auction time controls |
| +216 -0 | A | `src/components/LiveChatPanel.tsx` | feat(nip53): CVM-authoritative status resolver + identity enforcement |
| +210 -0 | A | `src/lib/cashu/nut7.ts` | fix(settlement): quorum-eligible verdicts + truthful NUT-7 evidence |
| +210 -0 | A | `src/lib/schemas/auction/settlementEvents.ts` | fix: reduce ndk footprint |
| +202 -0 | A | `src/lib/boot.ts` | feat(config): add self-hosting instance configuration foundation |
| +202 -0 | A | `src/lib/instance-config.ts` | fix(self-hosting): union zap relays, derive the handler-id chain, trim booleans |
| +197 -0 | A | `src/hooks/useAuctionWinMonitor.ts` | fix(auctions): address #1280 review — R1 keyset ingestion, R2 path-release keysets, R3 terminal-miss/caps/seller-overrid |
| +196 -0 | A | `src/server/auction-validator/publisher.ts` | feat(auctions): structural-only bid validity, REQUIRED starting_bid (ADR-0012 Phase 1) |
| +189 -0 | A | `src/components/AuctionCountdown.tsx` | refactor(auctions): route production file set through the nostr io seam |
| +186 -0 | A | `src/components/AuctionCard.tsx` | refactor(auctions): route production file set through the nostr io seam |
| +185 -0 | A | `src/lib/schemas/auction/bidEvent.ts` | fix(auctions): spell the DLEQ pending reason and override flag consistently |
| +182 -0 | A | `src/lib/utils/auctions.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +180 -0 | A | `src/lib/nip53.ts` | fix(live-chat): address the live activity inside the relay tag-index budget |
| +177 -0 | A | `src/components/AuctionClaimDialog.tsx` | feat(auctions): add post-settlement claim order flow for winners |
| +174 -0 | A | `src/server/auction-validator/observedAtRecovery.ts` | fix(settlement): review fixes — resumability, pending gate, memoization, proof map defaults, skipped tests, parse mismat |
| +173 -0 | A | `src/lib/auction/winNotification.ts` | fix(auctions): spell the DLEQ pending reason and override flag consistently |
| +170 -0 | A | `src/components/InvalidAuctionNotice.tsx` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +168 -0 | A | `src/components/ui/input-group.tsx` | Progress Bar & Stylized UI for Auctions |
| +168 -0 | A | `src/lib/utils/auctionFormStorage.ts` | fix(auctions): reserve draft round-trip + treat 0 as no reserve + show bid ladder |
| +162 -0 | A | `src/lib/ctxcn-clients/PlebeianServerClient.ts` | refactor: remove old CVM auction path oracle code |
| +160 -0 | A | `src/lib/schemas/auction/auctionAdmission.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +157 -0 | A | `src/lib/auctionCountdownLabels.ts` | feat: add countdown timer to auction list item |
| +156 -0 | A | `src/queries/liveChat.tsx` | fix(live-chat): address the live activity inside the relay tag-index budget |
| +101 -54 | M | `src/routes/setup.tsx` | feat(setup): add owner-authorized Blossom branding uploads |
| +152 -0 | A | `src/components/shared/ProgressBar.tsx` | Progress Bar Improvements |
| +150 -0 | A | `src/server/auction-validator/nut7Poller.ts` | feat(auctions): structural-only bid validity, REQUIRED starting_bid (ADR-0012 Phase 1) |
| +147 -0 | A | `src/lib/relay-policy.ts` | fix(self-hosting): union zap relays, derive the handler-id chain, trim booleans |
| +147 -0 | A | `src/server/auction-validator/index.ts` | fix(auctions): make spam policy configurable |
| +144 -0 | A | `src/server/auction-validator/pendingBuffer.ts` | fix(chore):prettier fix |
| +141 -0 | M | `src/publish/featured.tsx` | Merge branch 'master' into auctions/p2pk-path-oracle-via-cvm-v1-test |
| +135 -5 | M | `src/feature/wallet/components/Nip60Wallet.tsx` | feat(guardrails): add instance-literal guard and browse/cart/checkout coverage (R5) |
| +22 -108 | M | `src/frontend.tsx` | Merge remote-tracking branch 'origin/master' into auctions |
| +128 -2 | M | `src/lib/stores/wallet.ts` | fix(wallet): pay nip60 deposits with saved nwc wallet |
| +128 -0 | A | `src/lib/auctionP2pk.ts` | fix(auctions): force p2pk swap for bid tokens |
| +115 -0 | A | `src/lib/auction/useNut7Polling.ts` | fix(auctions): harden the NUT-7 observer against an absent proofYs array |
| +68 -44 | M | `src/lib/appSettings.ts` | feat(config): add self-hosted handler ID fallback for app settings |
| +110 -0 | A | `src/components/ConfettiBurst.tsx` | feat(auctions): launch confetti upward from the bottom of the screen every 3 seconds |
| +108 -0 | A | `src/components/AuctionVerdictPanel.tsx` | fix(auction): wire auditor authors filter into verdict query call sites (#1235) |
| +67 -41 | M | `src/components/layout/Footer.tsx` | fix: replace hardcoded Plebeian name, logo, URLs, footer links, and support/contact details with resolved config values |
| +108 -0 | A | `src/lib/auction/reserveGuard.ts` | fix(auctions): spell the DLEQ pending reason and override flag consistently |
| +108 -0 | A | `src/server/http/config.ts` | fix(setup): resolve bootstrap handler ID from instance config |
| +106 -0 | A | `src/components/ConnectionStatusPill.tsx` | refactor: remove old CVM auction path oracle code |
| +106 -0 | A | `src/server/auction-validator/mintReachability.ts` | fix(auction-validator): disable mint probing by default, require explicit operator allowlist |
| +105 -0 | A | `src/lib/cashu/hashToCurve.ts` | feat(auctions): implement bidder-held-path multi-proof Cashu bids |
| +103 -0 | A | `src/server/runtime.ts` | feat(config): add self-hosting instance configuration foundation |
| +101 -0 | A | `src/lib/auctionMintSelection.ts` | fix(auctions): prompt deposit when bidder has insufficient balance |
| +99 -0 | A | `src/lib/auction/useDleqKeysetPolling.ts` | fix(e2e): retire CashuMintMock; seed settlement tests with real DLEQ collateral from the local nutshell mint; fix keyset |
| +98 -0 | A | `src/lib/cashu/mintCapability.ts` | feat(cashu): add mint NUT-12 DLEQ capability probe (mintSupportsDleq) |
| +97 -0 | A | `src/components/AuctionFilters.tsx` | Fixed comments from PR review |
| +97 -0 | A | `src/server/startup.ts` | fix(self-hosting): union zap relays, derive the handler-id chain, trim booleans |
| +94 -0 | A | `src/components/AuctionDisplayComponent.tsx` | refactor(media): consolidate media rendering behind shared Media component |
| +89 -0 | A | `src/lib/auctionBidderStatus.ts` | refactor(auctions): route production file set through the nostr io seam |
| +54 -34 | M | `src/components/ImageViewerModal.tsx` | fix(media): address felixfelix-bot re-review (lightbox controls, video a11y, URL detection, e2e determinism) |
| +84 -0 | A | `src/components/Media.tsx` | fix(media): address felixfelix-bot re-review (lightbox controls, video a11y, URL detection, e2e determinism) |
| +83 -1 | M | `src/components/orders/OrderDetailComponent.tsx` | fix(auctions): #1343 re-review — ADR-0002 Wave-A3 branch-relative + nip60 supersession notes, private-claim relay_error  |
| +84 -0 | A | `src/server/auction-validator/policy.ts` | fix(auction-validator): add bounded late-settlement observation window |
| +83 -0 | A | `src/components/ui/button-group.tsx` | Progress Bar & Stylized UI for Auctions |
| +83 -0 | A | `src/components/ui/toggle-group.tsx` | WIP |
| +83 -0 | A | `src/hooks/useServiceWorker.ts` | refactor(auction,ui): improve reliability and add monitoring |
| +81 -0 | A | `src/server/websocket.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +71 -6 | M | `src/feature/wallet/components/SendEcashModal.tsx` | Added QR Code error safeguard, QR Code optimisations |
| +73 -3 | M | `src/routes/_dashboard-layout.tsx` | feat: track auction events & thread comments notifications |
| +49 -26 | M | `src/routes/_dashboard-layout/dashboard/about.tsx` | fix: replace hardcoded Plebeian name, logo, URLs, footer links, and support/contact details with resolved config values |
| +73 -0 | A | `src/lib/schemas/auction/tagAccess.ts` | fix: reduce ndk footprint |
| +72 -0 | A | `src/lib/auction/verdictQuorum.ts` | fix(auctions): bind validator confirmation to exact bid event + auditor quorum (review #5) |
| +70 -0 | A | `src/lib/auction/validatedBidView.ts` | feat(auctions): validated bid set selectors for UI gates |
| +70 -0 | A | `src/lib/productNotificationScopes.ts` | fix(notifications): scope auction activity notifications |
| +70 -0 | A | `src/server/buildServer.ts` | Merge remote-tracking branch 'origin/master' into chore/auctions-merge-master-20260917 |
| +47 -17 | M | `src/publish/nip89.ts` | fix(nip89): stop implying the handler event's r tag is conditional (R2) |
| +58 -3 | M | `src/components/FeaturedSections.tsx` | Fixed alternating style featured sections |
| +60 -0 | A | `src/server/http/zapPurchase.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +53 -6 | M | `src/components/ui/image-uploader/ImageUploader.tsx` | feat(setup): add owner-authorized Blossom branding uploads |
| +57 -0 | A | `src/lib/nostr/useSubscriptionEvents.ts` | perf(auctions): live subscriptions for home-page grids |
| +56 -0 | A | `src/publish/liveChat.tsx` | feat: NIP-53 auction live chat — rebased on bidder-held-path base |
| +53 -0 | A | `src/lib/auctionShippingRefs.ts` | fix(auctions): dedupe auction shipping refs |
| +50 -0 | A | `src/components/shared/TooltipToggleGroupItem.tsx` | WIP |
| +36 -13 | M | `src/lib/constants.ts` | feat(nip53): CVM-authoritative status resolver + identity enforcement |
| +49 -0 | A | `src/lib/schemas/auction/common.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +41 -7 | M | `src/components/layout/Header.tsx` | fix: replace hardcoded Plebeian name, logo, URLs, footer links, and support/contact details with resolved config values |
| +48 -0 | A | `src/server/http/static.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +46 -0 | A | `src/server/http/og.ts` | Merge remote-tracking branch 'origin/master' into chore/auctions-merge-master-20260917 |
| +45 -0 | A | `src/components/ui/toggle.tsx` | WIP |
| +34 -10 | M | `src/components/ImageCarousel.tsx` | fix(media): address review — error reset, video fallback, lightbox, a11y |
| +43 -1 | M | `src/queries/featured.tsx` | feat: add featured auctions support and data hooks |
| +42 -0 | A | `src/lib/stores/auctionWon.ts` | fix(auctions): clear announcedRootEventIds when the canonical winner changes |
| +40 -2 | M | `src/lib/wallet/proofs.ts` | Merge 'auctions' (with #1144 settlement) into 1235 |
| +41 -0 | A | `src/server/util/lnurl.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +39 -0 | A | `src/server/ndk.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +38 -0 | A | `src/lib/auctionPathOracle.ts` | refactor: remove old CVM auction path oracle code |
| +35 -1 | M | `src/lib/nostr/io-applesauce.ts` | refactor(auctions): route production file set through the nostr io seam |
| +36 -0 | M | `src/queries/queryKeyFactory.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +35 -0 | A | `src/components/nostr/AuctionSectionGrid.tsx` | fix(auctions): reorder home grids under filter bar, drop loading spinner, match titles |
| +0 -35 | D | `src/lib/cvm-identity.ts` | feat(nip53): CVM-authoritative status resolver + identity enforcement |
| +35 -0 | A | `src/server/lightning.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +34 -0 | A | `src/lib/auctionHd.ts` | fix(identity): freeze the NIP-89 client tag software name (R1) |
| +32 -2 | M | `src/lib/wallet/storage.ts` | fix(auction): fail-closed post-lock publish pipeline + strict bidder-record write (#1235) |
| +22 -10 | M | `src/components/Comments.tsx` | feat(auctions): add comments tab to auction detail |
| +31 -0 | M | `src/lib/wallet/types.ts` | feat(auction): add exponential backoff and permanent failure handling for token reclaim |
| +30 -0 | A | `src/lib/nostr/eventLike.ts` | fix(ndk): add fix to retrieve tagAddresses for plain relay data |
| +30 -0 | M | `src/lib/nostr/io.ts` | fix(auctions): address #1343 review — signing-time created_at, scoped NDK guard with coverage, publish-result fail-close |
| +30 -0 | A | `src/server/http/types.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +28 -0 | A | `src/components/LiveChatMessage.tsx` | feat: NIP-53 auction live chat — rebased on bidder-held-path base |
| +28 -0 | A | `src/components/shared/InfoTooltip.tsx` | Added tooltip for set auction reserve |
| +26 -0 | M | `src/lib/schemas/app.ts` | fix: replace hardcoded Plebeian name, logo, URLs, footer links, and support/contact details with resolved config values |
| +25 -0 | A | `src/lib/auction/immutability.ts` | fix: reduce ndk footprint |
| +24 -0 | M | `.env.example` | feat(config): add self-hosting instance configuration foundation |
| +24 -0 | A | `src/lib/piiSentinelFixture.ts` | test(privacy): share one postcode sentinel fixture across the six privacy suites |
| +21 -3 | M | `styles/globals.css` | Merge remote-tracking branch 'origin/master' into chore/auctions-merge-master-20260806 |
| +23 -0 | A | `src/server/util/cashu.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +21 -0 | A | `src/lib/media.ts` | fix(media): address felixfelix-bot re-review (lightbox controls, video a11y, URL detection, e2e determinism) |
| +20 -0 | A | `src/components/sheet-contents/auctions/index.tsx` | feat: add auction feature with listing, bidding, and management |
| +18 -2 | M | `src/lib/schemas/featured.ts` | feat(auctions): add featured auctions support with hero carousel and management |
| +20 -0 | M | `src/lib/stores/auth.ts` | fix(auctions): cross account queue vulnerability |
| +20 -0 | A | `src/lib/utils/cashu.ts` | Fix: Trusted Mint State Ownership in Auction Form (#890) |
| +19 -0 | A | `src/server/http/nip05.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +4 -14 | M | `src/queries/config.tsx` | feat(config): add self-hosting instance configuration foundation |
| +18 -0 | M | `src/routes/__root.tsx` | feat(self-hosting): Make document title/favicon update after /api/config loads |
| +8 -8 | M | `src/lib/utils/testLabelFilters.ts` | fix(labels): accept raw relay events in the test-label filters |
| +15 -0 | A | `src/lib/nostr/event-signature.ts` | fix(nip53): signature verification + pre-dedup validation + deterministic sort (#1228) |
| +11 -3 | M | `src/routes/_dashboard-layout/dashboard/products/products.tsx` | refactor(media): swap remaining dashboard/index/chat/migration media to Media |
| +3 -10 | M | `src/lib/stores/config.ts` | feat(config): add self-hosting instance configuration foundation |
| +12 -0 | M | `src/routes/_dashboard-layout/dashboard/index.tsx` | feat(dashboard): add bids management page for auction participants |
| +8 -3 | M | `src/lib/constants/testLabels.ts` | feat(labels): complete the auctions half of ADR-0009 (gating + surfaces) |
| +6 -5 | M | `src/queries/bugReports.tsx` | fix(config): wire trustedMints and bugRelay into their consumers (R3) |
| +10 -1 | M | `src/queries/external.tsx` | Merge remote-tracking branch 'origin/master' into test |
| +3 -7 | M | `ctxcn.config.json` | style: format code and documentation with consistent spacing |
| +5 -5 | M | `src/components/BugReportModal.tsx` | fix(config): wire trustedMints and bugRelay into their consumers (R3) |
| +10 -0 | A | `src/lib/auctionMintSync.ts` | Fix: Trusted Mint State Ownership in Auction Form (#890) |
| +8 -1 | M | `.env.local.example` | docs: clarify CVM_SERVER_PUBKEY env var alternatives |
| +9 -0 | M | `src/publish/orders.tsx` | Merge remote-tracking branch 'origin/master' into test |
| +5 -4 | M | `src/queries/comments.tsx` | fix(ndk): add fix to retrieve tagAddresses for plain relay data |
| +7 -2 | M | `src/server/BootstrapManager.ts` | fix(server): harden bootstrap authority |
| +4 -4 | M | `src/components/auth/NostrConnectQR.tsx` | fix: replace hardcoded Plebeian name, logo, URLs, footer links, and support/contact details with resolved config values |
| +6 -2 | M | `src/components/sheet-contents/products/ProductWelcomeScreen.tsx` | fix: replace hardcoded Plebeian name, logo, URLs, footer links, and support/contact details with resolved config values |
| +8 -0 | M | `src/config/dashboardNavigation.ts` | feat(dashboard): add bids management page for auction participants |
| +8 -0 | M | `src/lib/wallet/display.ts` | fix(auctions): prompt deposit when bidder has insufficient balance |
| +8 -0 | A | `src/server/util/sha256.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +5 -2 | M | `src/components/ProfileWalletCheck.tsx` | fix: replace hardcoded Plebeian name, logo, URLs, footer links, and support/contact details with resolved config values |
| +4 -3 | M | `src/components/messages/ChatMessageBubble.tsx` | refactor(media): swap remaining dashboard/index/chat/migration media to Media |
| +0 -7 | M | `src/hooks/usePIIMonitor.ts` | Removed PII logs |
| +4 -3 | M | `src/publish/comments.tsx` | fix(ndk): add fix to retrieve tagAddresses for plain relay data |
| +6 -1 | M | `src/server/EventHandler.ts` | fix(server): harden bootstrap authority |
| +6 -0 | M | `src/components/SheetRegistry.tsx` | feat: add auction feature with listing, bidding, and management |
| +3 -3 | M | `src/components/ShowTestListingsToggle.tsx` | feat(labels): complete the auctions half of ADR-0009 (gating + surfaces) |
| +3 -3 | M | `src/lib/wallet/index.ts` | fix: prevent bids via already spent proofs |
| +6 -0 | M | `src/server/index.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +3 -2 | M | `src/components/CollectionCard.tsx` | refactor(media): consolidate media rendering behind shared Media component |
| +4 -1 | M | `src/components/sheet-contents/products/index.tsx` | fix: replace hardcoded Plebeian name, logo, URLs, footer links, and support/contact details with resolved config values |
| +3 -2 | M | `src/lib/utils/blacklistFilters.ts` | perf(auctions): route list queries through applesauce I/O path |
| +2 -2 | M | `src/lib/nostr/nip59.ts` | fix(nip53): signature verification + pre-dedup validation + deterministic sort (#1228) |
| +3 -1 | M | `src/publish/wallet.tsx` | fix(identity): freeze the NIP-89 client tag software name (R1) |
| +4 -0 | A | `src/server/util/httpResponses.ts` | feat(server): add modular HTTP server with auction path oracle endpoints |
| +2 -1 | M | `src/components/CartItem.tsx` | refactor(media): consolidate media rendering behind shared Media component |
| +2 -1 | M | `src/components/CollectionDisplayComponent.tsx` | refactor(media): consolidate media rendering behind shared Media component |
| +2 -1 | M | `src/components/ProductCard.tsx` | Merge remote-tracking branch 'origin/master' into chore/auctions-merge-master-20260917 |
| +2 -1 | M | `src/components/ProductDisplayComponent.tsx` | refactor(media): consolidate media rendering behind shared Media component |
| +2 -1 | M | `src/components/ProductSearch.tsx` | refactor(media): consolidate media rendering behind shared Media component |
| +2 -1 | M | `src/components/migration/MigrationForm.tsx` | refactor(media): swap remaining dashboard/index/chat/migration media to Media |
| +2 -1 | M | `src/components/sheet-contents/collections/ProductsTab.tsx` | refactor(media): consolidate media rendering behind shared Media component |
| +2 -1 | M | `src/lib/stores/ui.ts` | feat: add auction feature with listing, bidding, and management |
| +2 -1 | M | `src/publish/reactions.tsx` | fix(ndk): add fix to retrieve tagAddresses for plain relay data |
| +2 -1 | M | `src/queries/reactions.tsx` | fix(ndk): add fix to retrieve tagAddresses for plain relay data |
| +2 -1 | M | `src/queries/testLabels.tsx` | fix(labels): accept raw relay events in the test-label filters |
| +2 -1 | M | `src/routes/_dashboard-layout/dashboard/products/collections.tsx` | refactor(media): swap remaining dashboard/index/chat/migration media to Media |
| +2 -1 | M | `src/routes/products.index.tsx` | Merge remote-tracking branch 'origin/master' into chore/auctions-merge-master-20260917 |
| +2 -0 | A | `src/components/sheet-contents/NewAuctionContent.tsx` | feat: add auction feature with listing, bidding, and management |
| +0 -2 | M | `src/lib/utils/piiScanner.ts` | Removed PII logs |
| +1 -1 | M | `src/queries/messages.tsx` | Fix: direct event.pubkey reference instead of event.authors?.pubkey |
| +1 -1 | M | `src/routes/index.tsx` | Merge branch 'master' into auctions/p2pk-path-oracle-via-cvm-v1-test |
| +2 -0 | M | `src/server/types.ts` | fix(server): harden bootstrap authority |
| +1 -0 | M | `src/components/layout/MobileMenu.tsx` | feat: add auction feature with listing, bidding, and management |
| +1 -0 | M | `src/lib/nostr/io-ndk.ts` | refactor(auctions): route production file set through the nostr io seam |

## Unit/integration tests — 109 files, +29500 / -56

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +1540 -0 | A | `src/lib/__tests__/settlementDescriptor.test.ts` | fix(auctions): harden rebid collateral validation |
| +1462 -0 | A | `src/lib/__tests__/computeValidatedBids.test.ts` | fix(auctions): spell the DLEQ pending reason and override flag consistently |
| +1300 -0 | A | `src/lib/__tests__/auctionBidFundingSessionGuard.test.ts` | fix(auction): gate the reclaim promise on a persisted pending token |
| +1293 -0 | A | `src/lib/__tests__/auctionValidatorLifecycle.test.ts` | test(auctions): fixture sweep for unconditional DLEQ + thread keysets through win paths |
| +1152 -0 | A | `e2e/tests/auction-bidding-mints.spec.ts` | fix(auctions): address #1280 review — R1 keyset ingestion, R2 path-release keysets, R3 terminal-miss/caps/seller-overrid |
| +1040 -0 | A | `src/lib/__tests__/auctionBidValidation.test.ts` | test(auctions): fixture sweep for unconditional DLEQ + thread keysets through win paths |
| +1038 -0 | A | `e2e/tests/auction-settlement.spec.ts` | test(e2e): add an explicit recordVideo fixture option for the auth page fixtures; use it in the settlement spec |
| +866 -0 | A | `src/lib/__tests__/auctionBidPublishRetry.test.ts` | test(auctions): keep the rebased auction-bid tests on the ADR-0011 lock contract |
| +860 -0 | A | `src/lib/__tests__/auctionValidatorSubscriber.test.ts` | fix(auction-validator): preserve recovered bid observation time |
| +747 -0 | A | `src/lib/__tests__/nostr/nip59.test.ts` | test(privacy): share one postcode sentinel fixture across the six privacy suites |
| +605 -0 | A | `src/lib/__tests__/auctionValidatorContext.test.ts` | fix(auction-validator): monotonic NUT-7 writes ignore stale overlapping responses |
| +520 -0 | A | `src/lib/__tests__/auctionValidatorSubscriberBounds.test.ts` | fix(chore):prettier fix |
| +479 -0 | A | `e2e/tests/test-labels-auctions.spec.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +471 -0 | A | `src/lib/__tests__/auctionWon.test.ts` | fix(auctions): harden rebid collateral validation |
| +462 -0 | A | `src/lib/__tests__/auctionBidFundingLifecycle.test.ts` | test(auction): drop tautological classifier combo asserts (#1235) |
| +458 -0 | A | `src/lib/__tests__/auctionSettlementCompleteness.test.ts` | fix: rebid chain settlement validation + E2E test fixes |
| +430 -0 | A | `src/lib/__tests__/auctionDLEQ.test.ts` | fix(cashu): require a sat-unit keyset for DLEQ collateral (review A4) |
| +402 -0 | A | `src/lib/__tests__/auctionSettlementP2pk.test.ts` | fix(auctions): reject fractional bid amounts |
| +398 -0 | A | `src/lib/__tests__/validatedBidView.unit.test.ts` | test(auctions): cover the all-pending (no-quorum) validated bid set |
| +391 -0 | A | `src/queries/__tests__/auctionTestLabelGate.test.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +387 -0 | A | `src/lib/__tests__/notifications.test.ts` | fix(notifications): scope auction activity notifications |
| +385 -0 | A | `src/lib/__tests__/auctionSettlement.test.ts` | fix: add strict bid amount parsing |
| +384 -0 | A | `src/lib/__tests__/nip53.test.ts` | fix(live-chat): address the live activity inside the relay tag-index budget |
| +375 -0 | A | `src/queries/__tests__/liveChat.test.ts` | fix(live-chat): address the live activity inside the relay tag-index budget |
| +358 -0 | A | `src/lib/__tests__/pathReleasePipeline.test.ts` | fix: rebid chain settlement validation + E2E test fixes |
| +352 -0 | A | `src/lib/__tests__/auctions/privateAuctionClaimMessage.test.ts` | test(privacy): share one postcode sentinel fixture across the six privacy suites |
| +343 -0 | A | `src/lib/__tests__/auctionFormStorage.test.ts` | test(live-chat): guard LiveChatPanel test against document-less CI runners (#1268) |
| +339 -0 | A | `src/lib/__tests__/auctionValidatorPublisher.test.ts` | test(auctions): fixture sweep for unconditional DLEQ + thread keysets through win paths |
| +325 -0 | A | `src/queries/__tests__/auctionAdmissionGate.test.ts` | test(auctions): stop leaking an identity label gate into later test files |
| +312 -0 | A | `src/lib/__tests__/auctionValidatorMintReachability.test.ts` | fix(auction-validator): disable mint probing by default, require explicit operator allowlist |
| +302 -0 | A | `src/lib/__tests__/nip60LockAuctionBidFunds.test.ts` | test(auctions): fixture sweep for unconditional DLEQ + thread keysets through win paths |
| +297 -0 | A | `src/lib/__tests__/nip60DepositIdentity.test.ts` | test(nip60): isolate deposit-identity suite from process-wide nip60 mock |
| +286 -0 | A | `src/lib/__tests__/reserveGuard.test.ts` | fix(auctions): spell the DLEQ pending reason and override flag consistently |
| +277 -0 | A | `src/lib/wallet/nip60.test.ts` | fix(auctions): address review feedback on Lightning bid funding |
| +276 -0 | A | `e2e/tests/auction-invalid-event-gate.spec.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +274 -0 | A | `src/lib/__tests__/bidderPathRelease.test.ts` | fix(auction): fail-closed post-lock publish pipeline + strict bidder-record write (#1235) |
| +269 -0 | A | `src/lib/__tests__/auctionMintSelection.test.ts` | test: allowlist order determines auto-selected mint when multiple are eligible and excludes funded but untrusted mints f |
| +269 -0 | A | `src/lib/__tests__/auctionSettlementPhase6.test.ts` | fix: reduce ndk footprint |
| +258 -0 | A | `src/lib/__tests__/bidderChainRecords.test.ts` | feat: add refund pubkey lookup and improve reclaim flow, update docs |
| +249 -0 | A | `src/lib/__tests__/auctionAdmission.test.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +241 -0 | A | `src/queries/__tests__/auctionListHelpers.test.ts` | test(auctions): fix list-helper tests for applesauce fetch migration |
| +238 -0 | A | `src/lib/__tests__/instance-config.test.ts` | fix(identity): freeze the NIP-89 client tag software name (R1) |
| +229 -0 | A | `src/lib/__tests__/auctionDLEQ.mint.integration.test.ts` | test(e2e): re-enable Direct Lightning bid funding scenarios on the DLEQ-required lock path |
| +215 -0 | A | `src/lib/__tests__/auctionBidderStatus.test.ts` | refactor(auctions): close the round-2 non-blocking findings on the validated bid view |
| +208 -0 | A | `e2e/tests/auction-live-chat-ui.spec.ts` | fix(live-chat): address the live activity inside the relay tag-index budget |
| +208 -0 | A | `src/lib/__tests__/auctionValidatorNut7Poller.test.ts` | fix(settlement): review fixes — resumability, pending gate, memoization, proof map defaults, skipped tests, parse mismat |
| +204 -0 | A | `src/queries/__tests__/auctionVerdicts.test.ts` | fix(auctions): premature "resolved" marking silently loses wins |
| +198 -0 | A | `src/lib/__tests__/auctionBidLockDleq.test.ts` | test(auctions): fixture sweep for unconditional DLEQ + thread keysets through win paths |
| +196 -0 | A | `src/lib/__tests__/auctionBidEventSchema.test.ts` | style(auction): prettier-format dleq_proof schema + test (ADR-0011) |
| +186 -0 | A | `src/lib/__tests__/auctionMintSelection.integration.test.ts` | Fix/862 bidding with any mint (#886) |
| +180 -0 | A | `e2e/tests/auction-live-chat.spec.ts` | fix(live-chat): address the live activity inside the relay tag-index budget |
| +171 -0 | A | `src/lib/__tests__/walletStorageStrict.test.ts` | fix(auction): fail-closed post-lock publish pipeline + strict bidder-record write (#1235) |
| +166 -0 | A | `src/lib/__tests__/auctionValidatorSpamPolicy.test.ts` | fix(auction-validator): add bounded late-settlement observation window |
| +162 -0 | A | `src/lib/__tests__/auctions-ndk-surface-guard.test.ts` | fix(auctions): address #1343 review — signing-time created_at, scoped NDK guard with coverage, publish-result fail-close |
| +161 -0 | A | `src/lib/__tests__/preLockRecoveryRecordBound.test.ts` | fix(auction): fail closed at the pre-lock recovery-record bound |
| +149 -0 | A | `src/lib/__tests__/relay-policy.test.ts` | fix(self-hosting): union zap relays, derive the handler-id chain, trim booleans |
| +147 -0 | A | `src/lib/__tests__/auctionBidFundingCrossLeg.test.ts` | fix(auction): scope progress-dialog verdicts to the current funding session (#1235) |
| +141 -0 | A | `src/lib/__tests__/auctionP2pk.test.ts` | fix(auctions): force p2pk swap for bid tokens |
| +139 -0 | A | `src/lib/__tests__/auctionStartingBidRequired.test.ts` | feat(auctions): structural-only bid validity, REQUIRED starting_bid (ADR-0012 Phase 1) |
| +138 -0 | A | `src/lib/__tests__/auctionValidatorObservedAtRecovery.test.ts` | fix(auction-validator): per-bid d-tag, observed_at recovery, post-close late_arrival suppression |
| +138 -0 | A | `src/lib/__tests__/dleqFixture.test.ts` | feat(cashu): add offline NUT-12 DLEQ test fixture |
| +134 -0 | A | `e2e/tests/auction-home-grids.spec.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +130 -0 | A | `src/queries/__tests__/auctionPathReleases.test.ts` | fix(auctions): premature "resolved" marking silently loses wins |
| +128 -0 | A | `src/lib/__tests__/verdictQuorum.test.ts` | fix(auctions): bind validator confirmation to exact bid event + auditor quorum (review #5) |
| +127 -0 | A | `src/lib/__tests__/auctionPublishValidation.test.ts` | fix(auctions): reserve draft round-trip + treat 0 as no reserve + show bid ladder |
| +123 -0 | A | `src/queries/__tests__/LiveChatPanel.test.ts` | fix(nip53): test isolation, pubkey privacy, param naming |
| +122 -0 | A | `src/lib/__tests__/auctionValidatorPendingBuffer.test.ts` | fix(auction-validator): enforce one shared total budget across all three buffers |
| +121 -0 | A | `src/lib/__tests__/dleqKeysetFetch.test.ts` | fix(auctions): #1280 re-review — descriptor terminal-miss threading + test, R2 seam test, seller-override helper + test, |
| +118 -0 | A | `src/lib/__tests__/productNotificationScopes.test.ts` | fix(notifications): scope auction activity notifications |
| +115 -0 | A | `src/lib/__tests__/eventLike.test.ts` | Fixes for CI |
| +110 -0 | A | `src/lib/__tests__/auctionEndingSoonOrder.test.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +108 -0 | A | `contextvm/tools/__tests__/live-activity-worker.test.ts` | feat: NIP-53 auction live chat — rebased on bidder-held-path base |
| +108 -0 | A | `src/lib/__tests__/cvm-server-key.test.ts` | Reconfigured server loading CVM key to match logic on master |
| +107 -0 | A | `src/queries/__tests__/auctionBidStream.test.ts` | tests: auctions bid streaming |
| +106 -0 | A | `src/lib/__tests__/fetchMintKeysets.test.ts` | fix(settlement): use explicit isFailure flag for mint-keyset negative cache |
| +105 -0 | A | `src/lib/__tests__/hashToCurveVsCashuTs.test.ts` | refactor: clean up wallet code, add dev tooling and tests |
| +103 -0 | A | `src/lib/__tests__/server-bootstrap-persistence.test.ts` | fix(server): harden bootstrap authority |
| +101 -0 | A | `e2e/tests/self-hosted-config.spec.ts` | test(e2e): isolate self-hosted instance configuration |
| +100 -0 | A | `e2e/tests/media-rendering.spec.ts` | fix(media): address felixfelix-bot re-review (lightbox controls, video a11y, URL detection, e2e determinism) |
| +91 -9 | M | `src/lib/__tests__/appSettings.test.ts` | feat(config): add self-hosted handler ID fallback for app settings |
| +97 -0 | A | `src/lib/__tests__/auctionValidatorPolicy.test.ts` | fix(auction-validator): add bounded late-settlement observation window |
| +94 -0 | A | `e2e/tests/cvm-config.spec.ts` | fix(cvm): add self-detection guard for CVM_SERVER_KEY matching APP_PRIVATE_KEY |
| +93 -0 | A | `src/lib/__tests__/auctionCountdownPreStart.test.ts` | feat: countdown for auctions before start time |
| +86 -0 | A | `src/lib/__tests__/auctionTagBuilders.test.ts` | test(auction): add dleq_proof emission tests for buildBidEventTags (B2 RED) |
| +74 -11 | M | `src/lib/__tests__/e2e-workflow-gate-membership.test.ts` | fix(e2e): avoid Bun hot-reload port collision |
| +80 -0 | A | `e2e/tests/auction-mint-state.spec.ts` | style: apply prettier formatting to 3 files |
| +73 -0 | A | `e2e/tests/auction-shipping.spec.ts` | Fixed imports in test file |
| +70 -0 | A | `src/lib/__tests__/mintCapability.test.ts` | feat(cashu): add mint NUT-12 DLEQ capability probe (mintSupportsDleq) |
| +65 -0 | A | `src/lib/utils/cashu.test.ts` | style: apply prettier formatting to 3 files |
| +63 -0 | A | `src/lib/__tests__/hashToCurve.test.ts` | feat(auctions): implement bidder-held-path multi-proof Cashu bids |
| +63 -0 | A | `src/queries/__tests__/auctionsPrivateClaim.test.ts` | fix(auctions): #1343 re-review — ADR-0002 Wave-A3 branch-relative + nip60 supersession notes, private-claim relay_error  |
| +59 -0 | A | `src/lib/__tests__/auctionShippingRefs.test.ts` | Fix: Auction Shipping Ref Deduplication |
| +59 -0 | A | `src/lib/auction/useNut7Polling.test.ts` | fix(auctions): read NUT-7 evidence from parsed bids in the seller dashboard |
| +58 -0 | A | `src/lib/auctionMintSync.test.ts` | Fix: Trusted Mint State Ownership in Auction Form (#890) |
| +45 -0 | A | `src/lib/__tests__/auctionValidatorIndex.test.ts` | fix(chore):prettier fix |
| +42 -0 | A | `src/lib/__tests__/ndkZapRelays.test.ts` | fix(self-hosting): union zap relays, derive the handler-id chain, trim booleans |
| +37 -0 | A | `src/lib/__tests__/auctionCountdownLabels.test.ts` | fix(auctions): show ended countdown label |
| +31 -0 | M | `src/lib/__tests__/io.test.ts` | refactor(auctions): route production file set through the nostr io seam |
| +31 -0 | A | `src/lib/wallet/proofs.test.ts` | fix: prevent bids via already spent proofs |
| +12 -18 | M | `src/lib/utils/message-content.test.ts` | test(unit): run every unit test file on the runner CI claims to use |
| +15 -5 | M | `src/lib/orders/privateOrderMessage.test.ts` | test(privacy): share one postcode sentinel fixture across the six privacy suites |
| +9 -3 | M | `src/lib/__tests__/contextvm-client.integration.test.ts` | feat(nip53): CVM-authoritative status resolver + identity enforcement |
| +10 -2 | M | `src/publish/orders.test.ts` | test(privacy): share one postcode sentinel fixture across the six privacy suites |
| +9 -2 | M | `src/lib/nostr/nip59.test.ts` | test(privacy): share one postcode sentinel fixture across the six privacy suites |
| +9 -2 | M | `src/queries/__tests__/orders-private-details.test.ts` | test(privacy): share one postcode sentinel fixture across the six privacy suites |
| +9 -1 | M | `src/queries/__tests__/external.test.ts` | test: fix localStorage assertion for missing keys |
| +2 -1 | M | `src/ws.test.ts` | build: update @contextvm/sdk to v0.10.0 and adjust server config |
| +1 -1 | M | `src/lib/stores/cart.test.ts` | Merge branch 'feat/1202-direct-lightning-bid-funding' of github.com:PlebeianApp/market into feat/1202-direct-lightning-b |
| +1 -1 | M | `src/queries/__tests__/profile-validation.test.ts` | Merge remote-tracking branch 'origin/master' into auctions |

## Playwright e2e + fixtures + harness — 9 files, +382 / -27

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +90 -2 | M | `e2e/ARCHITECTURE.md` | test(e2e): isolate self-hosted instance configuration |
| +82 -7 | M | `e2e/seed-relay.ts` | test(e2e): isolate self-hosted instance configuration |
| +63 -0 | M | `e2e/scenarios/index.ts` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +51 -0 | A | `e2e/start-local-mint.sh` | feat(e2e): local Cashu mint for auction test infrastructure |
| +43 -5 | M | `e2e/playwright.config.ts` | test(e2e): isolate self-hosted instance configuration |
| +30 -9 | M | `e2e/fixtures/index.ts` | test(e2e): add an explicit recordVideo fixture option for the auth page fixtures; use it in the settlement spec |
| +17 -1 | M | `e2e/test-config.ts` | fix(live-chat): address the live activity inside the relay tag-index budget |
| +6 -3 | M | `e2e/AGENTS.md` | feat(e2e): document local mint in e2e AGENTS and point shared seed helper at it |
| +0 -0 | A | `e2e/fixtures/tiny-video.mp4` | fix(media): address felixfelix-bot re-review (lightbox controls, video a11y, URL detection, e2e determinism) |

## Docs / ADRs / specs — 26 files, +8549 / -5

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +2671 -0 | A | `AUCTIONS.md` | fix(auctions): spell the DLEQ pending reason and override flag consistently |
| +848 -0 | A | `docs/protocol/fixtures/auction-multiparty-v1-invalid.json` | docs(auctions): propose multiparty payout wire profile (#1219) |
| +703 -0 | A | `docs/protocol/fixtures/auction-multiparty-v1-valid.json` | docs(auctions): propose multiparty payout wire profile (#1219) |
| +483 -0 | A | `docs/protocol/auction-multiparty-v1.md` | docs(auctions): propose multiparty payout wire profile (#1219) |
| +438 -0 | A | `docs/adr/ADR-0004-auction-settlement-descriptor.md` | fix(auctions): #1280 re-review — descriptor terminal-miss threading + test, R2 seam test, seller-override helper + test, |
| +419 -0 | A | `docs/adr/ADR-0003-auctions-comprehensive-validation-protocol.md` | docs(auctions): amend AUCTIONS.md and ADR-0003 for ADR-0012 Phase 1 |
| +336 -0 | A | `docs/adr/ADR-0012-bid-validity-selection-and-winner-derivation.md` | docs(adr): record the maintainer authorisation for ADR-0012 |
| +332 -0 | A | `docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md` | docs(ADR): Unified Storefront Identity and Page Builder |
| +290 -0 | A | `docs/adr/proposals/auction-multiparty-wire-profile.md` | docs(auctions): propose multiparty payout wire profile (#1219) |
| +286 -0 | A | `docs/adr/ADR-0008-direct-lightning-bid-funding.md` | fix(auction): fail closed at the pre-lock recovery-record bound |
| +273 -0 | A | `docs/adr/proposals/adr-0012-phase1-amendment-spec.md` | docs(auctions): amend AUCTIONS.md and ADR-0003 for ADR-0012 Phase 1 |
| +202 -0 | A | `docs/adr/ADR-018-instance-configuration-and-self-hosting.md` | docs(ADR): self-hosted context ADR |
| +174 -2 | M | `docs/adr/ADR-0009-test-listing-labels-via-nip-32.md` | fix(auctions): gate spec-invalid events out of the feed, and stop bidding on them |
| +160 -0 | A | `docs/handover/live-activity-addressing.md` | style(docs): prettier formatting for the live-activity addressing note |
| +144 -0 | M | `deploy-simple/RELAY_DEPLOY.md` | style: format code and documentation for consistency |
| +144 -0 | A | `docs/adr/ADR-0011-bid-time-collateral-verification-via-nut12-dleq.md` | fix(auctions): #1280 re-review — descriptor terminal-miss threading + test, R2 seam test, seller-override helper + test, |
| +139 -0 | A | `docs/tasks/pr1144-followup-improvements.md` | docs: correct item #6 — aggregate NUT-7 returns 'spent' for ANY spent proof, not all-spent |
| +138 -0 | A | `docs/ndk-to-applesauce-migration-guide.md` | docs: add NDK -> applesauce port migration guide |
| +102 -0 | A | `docs/adr/ADR-0006-local-cashu-mint-for-e2e-tests.md` | fix(auctions): #1280 re-review — descriptor terminal-miss threading + test, R2 seam test, seller-override helper + test, |
| +65 -1 | M | `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md` | docs(adr): #1343 single-emphasis runs for the two nip60 supersession notes |
| +54 -0 | M | `deploy-simple/README.md` | fix(self-hosting): Implement and validate the deployment documentation |
| +50 -2 | M | `AGENTS.md` | docs(agents): state the event-validation rule and the surface taxonomy |
| +47 -0 | A | `docs/tasks/validator-nut7-winner-check.md` | style: format task doc |
| +30 -0 | M | `src/publish/AGENTS.md` | fix: Issue 1 + Issue 5 — computeValidatedBids + legLockedAmount from signed chain |
| +14 -0 | M | `README.md` | fix(self-hosting): Implement and validate the deployment documentation |
| +7 -0 | M | `docs/adr/ADR-0005-no-external-service-dependencies-in-tests.md` | docs(e2e): ADR-0006 local Cashu mint, deprecate mock mint fixtures |

## ContextVM service — 2 files, +521 / -17

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +370 -0 | A | `contextvm/tools/live-activity-worker.ts` | fix(live-chat): address the live activity inside the relay tag-index budget |
| +151 -17 | M | `contextvm/server.ts` | fix(auctions): make spam policy configurable |

## GitHub workflows — 7 files, +226 / -30

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +86 -11 | M | `.github/workflows/deploy-auctionsdev.yml` | Added CI workflows for auctions branch |
| +82 -4 | M | `.github/workflows/e2e.yml` | fix(e2e): avoid Bun hot-reload port collision |
| +26 -0 | A | `.github/workflows/ci-instance-literals-guard.yml` | feat(guardrails): add instance-literal guard and browse/cart/checkout coverage (R5) |
| +18 -1 | M | `.github/workflows/ci-unit.yml` | ci(unit): pin local Cashu mint to 0.19.2 (keyset-id compat with cashu-ts 2.9) |
| +3 -11 | M | `.github/workflows/deploy.yml` | Merge remote-tracking branch 'origin/master' into auctions |
| +9 -1 | M | `.github/workflows/ci-ndk-guard.yml` | fix(auctions): #1343 re-review — finalization-error test + comment, ADR sign/Wave-A3 + nip60 supersession, guard globs,  |
| +2 -2 | M | `.github/workflows/prettier.yml` | Added CI workflows for auctions branch |

## Repo scripts + baselines — 7 files, +1206 / -2

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +407 -0 | A | `scripts/gen_auctions.ts` | feat(auctions): add auction path release settlement flow with Cashu token support |
| +267 -1 | M | `scripts/seed.ts` | feat(nip53): CVM-authoritative status resolver + identity enforcement |
| +191 -0 | A | `scripts/diagnose-nut7.ts` | style: fix quote escaping and improve code/markdown formatting |
| +155 -0 | A | `scripts/check-auctions-ndk-surface.sh` | fix(auctions): #1343 re-review — finalization-error test + comment, ADR sign/Wave-A3 + nip60 supersession, guard globs,  |
| +131 -0 | A | `scripts/dev-seed.ts` | refactor: move auction issuer logic to contextvm server |
| +54 -0 | A | `scripts/check-instance-literals.sh` | feat(guardrails): add instance-literal guard and browse/cart/checkout coverage (R5) |
| +1 -1 | M | `scripts/fetch-btc-price.ts` | feat(nip53): CVM-authoritative status resolver + identity enforcement |

## Deployment assets — 4 files, +79 / -6

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +37 -0 | M | `deploy-simple/env/.env.production.example` | fix(self-hosting): Implement and validate the deployment documentation |
| +20 -5 | M | `deploy-simple/deploy.sh` | chore(deploy): add auctionsdev staging target |
| +20 -0 | M | `deploy-simple/env/.env.staging.example` | fix(self-hosting): Implement and validate the deployment documentation |
| +2 -1 | M | `deploy-simple/control.sh` | chore(deploy): add auctionsdev staging target |

## Package/TS config — 1 files, +8 / -4

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +8 -4 | M | `package.json` | test(e2e): isolate self-hosted instance configuration |

## Generated / vendored / lockfile — skippable — 5 files, +260 / -42

| +/- | st | file | note (last commit in range) |
|---|---|---|---|
| +108 -41 | M | `bun.lock` | lockfile — skim only (dependency resolution) |
| +115 -0 | M | `src/routeTree.gen.ts` | GENERATED (TanStack route tree) — do not review by hand |
| +27 -0 | A | `scripts/instance-literals-baseline.txt` | generated baseline data — skim |
| +9 -0 | A | `ctxcn.config.json.bak` | BACKUP FILE (.bak) — should probably not be committed; skim |
| +1 -1 | M | `scripts/ndk-baseline.txt` | generated baseline data — skim |
