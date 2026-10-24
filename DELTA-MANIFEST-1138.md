# PR #1138 own-delta manifest — all 387 files

Delta: `c8c06fd74dd3d259dfc43bf79f7da2c3590eb664..6be7496cc2089db2e2da04bb083312ae6d43a79d`

Generated from `git diff --numstat` / `--name-status`. Column order: status, +, -, path.

Sections ordered by review triage priority (0 = skip/skim, 1 = the target).


## 0-STRAY  (1 files, +9/-0)

```
A        9      0  ctxcn.config.json.bak
```

## 0-baseline  (2 files, +28/-1)

```
A       27      0  scripts/instance-literals-baseline.txt
M        1      1  scripts/ndk-baseline.txt
```

## 0-binary  (1 files, +0/-0)

```
A        -      -  e2e/fixtures/tiny-video.mp4
```

## 0-fixture  (3 files, +1581/-9)

```
A      848      0  docs/protocol/fixtures/auction-multiparty-v1-invalid.json
A      703      0  docs/protocol/fixtures/auction-multiparty-v1-valid.json
M       30      9  e2e/fixtures/index.ts
```

## 0-generated  (1 files, +115/-0)

```
M      115      0  src/routeTree.gen.ts
```

## 0-lockfile  (1 files, +108/-41)

```
M      108     41  bun.lock
```

## 1-src  (214 files, +39165/-1379)

```
A     2313      0  src/publish/auctions.tsx
M     2127     79  src/lib/stores/nip60.ts
A     2023      0  src/components/sheet-contents/auctions/AuctionFormContent.tsx
A     1437      0  src/queries/auctions.tsx
A     1245      0  src/routes/_dashboard-layout/dashboard/products/auctions.$auctionId.tsx
A     1233      0  src/lib/auction/validation.ts
A     1196      0  src/routes/auctions.$auctionId.tsx
A     1009      0  src/lib/auction/settlementDescriptor.ts
A      961      0  src/hooks/useAuctionBidFunding.ts
A      950      0  src/components/AuctionBidder.tsx
M      949      5  src/hooks/useNotificationMonitor.ts
A      726      0  src/server/auction-validator/subscriber.ts
A      713      0  src/routes/_dashboard-layout/dashboard/products/auctions.tsx
A      661      0  src/routes/_dashboard-layout/dashboard/products/bids.tsx
A      616      0  src/lib/auction/bidValidation.ts
M      610      8  src/lib/stores/notifications.ts
A      560      0  src/server/auction-validator/state.ts
A      541      0  src/server/auction-validator/lifecycle.ts
A      489      0  src/lib/cashu/dleq.ts
M      479     34  src/feature/wallet/components/DepositLightningModal.tsx
A      469      0  src/components/AuctionTimelineChart.tsx
A      465      0  src/lib/auctions/privateAuctionClaimMessage.ts
A      422      0  src/components/AuctionBidProgressDialog.tsx
A      417      0  src/routes/auctions.index.tsx
A      409      0  src/lib/auction/events.ts
A      409      0  src/lib/auctionSettlement.ts
A      405      0  src/lib/auction/tagBuilders.ts
M      387    139  src/lib/stores/ndk.ts
A      386      0  src/lib/auctionPublishValidation.ts
A      344      0  src/lib/auction/bidderRecords.ts
A      328      0  src/components/AuctionSettlement.tsx
A      320      0  src/lib/cashu/p2pkSecret.ts
A      316      0  src/components/AuctionWonModal.tsx
A      282      0  src/lib/schemas/auction/auctionEvent.ts
A      281      0  src/lib/schemas/auction/validatorEvents.ts
A      276      0  src/server/auction-validator/spamPolicy.ts
A      272      0  src/lib/cashu/dleqFixture.ts
A      256      0  src/components/AuctionBidsContainer.tsx
M      256     31  src/routes/_dashboard-layout/dashboard/app-settings/featured-items.tsx
A      246      0  src/lib/auction/constants.ts
M      246      6  src/routes/_dashboard-layout/dashboard/app-settings/app-miscelleneous.tsx
A      245      0  src/server/auction-validator/mintDestination.ts
A      244      0  src/lib/auctionSettlementP2pk.ts
A      218      0  src/components/ui/calendar.tsx
A      216      0  src/components/LiveChatPanel.tsx
A      210      0  src/lib/cashu/nut7.ts
A      210      0  src/lib/schemas/auction/settlementEvents.ts
A      202      0  src/lib/boot.ts
A      202      0  src/lib/instance-config.ts
A      197      0  src/hooks/useAuctionWinMonitor.ts
A      196      0  src/server/auction-validator/publisher.ts
A      189      0  src/components/AuctionCountdown.tsx
A      186      0  src/components/AuctionCard.tsx
A      185      0  src/lib/schemas/auction/bidEvent.ts
A      182      0  src/lib/utils/auctions.ts
A      180      0  src/lib/nip53.ts
A      177      0  src/components/AuctionClaimDialog.tsx
A      174      0  src/server/auction-validator/observedAtRecovery.ts
A      173      0  src/lib/auction/winNotification.ts
A      170      0  src/components/InvalidAuctionNotice.tsx
A      168      0  src/components/ui/input-group.tsx
A      168      0  src/lib/utils/auctionFormStorage.ts
A      162      0  src/lib/ctxcn-clients/PlebeianServerClient.ts
A      160      0  src/lib/schemas/auction/auctionAdmission.ts
A      157      0  src/lib/auctionCountdownLabels.ts
A      156      0  src/queries/liveChat.tsx
A      152      0  src/components/shared/ProgressBar.tsx
A      150      0  src/server/auction-validator/nut7Poller.ts
A      147      0  src/lib/relay-policy.ts
A      147      0  src/server/auction-validator/index.ts
A      144      0  src/server/auction-validator/pendingBuffer.ts
M      141      0  src/publish/featured.tsx
M      136    106  src/components/dialogs/TermsConditionsDialog.tsx
M      135      5  src/feature/wallet/components/Nip60Wallet.tsx
A      128      0  src/lib/auctionP2pk.ts
M      128      2  src/lib/stores/wallet.ts
A      115      0  src/lib/auction/useNut7Polling.ts
A      110      0  src/components/ConfettiBurst.tsx
A      108      0  src/components/AuctionVerdictPanel.tsx
A      108      0  src/lib/auction/reserveGuard.ts
A      108      0  src/server/http/config.ts
A      106      0  src/components/ConnectionStatusPill.tsx
A      106      0  src/server/auction-validator/mintReachability.ts
A      105      0  src/lib/cashu/hashToCurve.ts
A      103      0  src/server/runtime.ts
A      101      0  src/lib/auctionMintSelection.ts
M      101     54  src/routes/setup.tsx
A       99      0  src/lib/auction/useDleqKeysetPolling.ts
A       98      0  src/lib/cashu/mintCapability.ts
A       97      0  src/components/AuctionFilters.tsx
A       97      0  src/server/startup.ts
A       94      0  src/components/AuctionDisplayComponent.tsx
A       89      0  src/lib/auctionBidderStatus.ts
A       84      0  src/components/Media.tsx
A       84      0  src/server/auction-validator/policy.ts
M       83      1  src/components/orders/OrderDetailComponent.tsx
A       83      0  src/components/ui/button-group.tsx
A       83      0  src/components/ui/toggle-group.tsx
A       83      0  src/hooks/useServiceWorker.ts
A       81      0  src/server/websocket.ts
A       73      0  src/lib/schemas/auction/tagAccess.ts
M       73      3  src/routes/_dashboard-layout.tsx
A       72      0  src/lib/auction/verdictQuorum.ts
M       71      6  src/feature/wallet/components/SendEcashModal.tsx
A       70      0  src/lib/auction/validatedBidView.ts
A       70      0  src/lib/productNotificationScopes.ts
A       70      0  src/server/buildServer.ts
M       68     44  src/lib/appSettings.ts
M       67     41  src/components/layout/Footer.tsx
A       60      0  src/server/http/zapPurchase.ts
M       58      3  src/components/FeaturedSections.tsx
A       57      0  src/lib/nostr/useSubscriptionEvents.ts
A       56      0  src/publish/liveChat.tsx
M       54     34  src/components/ImageViewerModal.tsx
M       53      6  src/components/ui/image-uploader/ImageUploader.tsx
A       53      0  src/lib/auctionShippingRefs.ts
A       50      0  src/components/shared/TooltipToggleGroupItem.tsx
A       49      0  src/lib/schemas/auction/common.ts
M       49     26  src/routes/_dashboard-layout/dashboard/about.tsx
A       48      0  src/server/http/static.ts
M       47     17  src/publish/nip89.ts
A       46      0  src/server/http/og.ts
A       45      0  src/components/ui/toggle.tsx
M       43      1  src/queries/featured.tsx
A       42      0  src/lib/stores/auctionWon.ts
M       41      7  src/components/layout/Header.tsx
A       41      0  src/server/util/lnurl.ts
M       40      2  src/lib/wallet/proofs.ts
A       39      0  src/server/ndk.ts
A       38      0  src/lib/auctionPathOracle.ts
M       36     13  src/lib/constants.ts
M       36      0  src/queries/queryKeyFactory.ts
A       35      0  src/components/nostr/AuctionSectionGrid.tsx
M       35      1  src/lib/nostr/io-applesauce.ts
A       35      0  src/server/lightning.ts
M       34     10  src/components/ImageCarousel.tsx
A       34      0  src/lib/auctionHd.ts
M       32    430  src/index.tsx
M       32      2  src/lib/wallet/storage.ts
M       31      0  src/lib/wallet/types.ts
A       30      0  src/lib/nostr/eventLike.ts
M       30      0  src/lib/nostr/io.ts
M       30      0  src/publish/AGENTS.md
A       30      0  src/server/http/types.ts
A       28      0  src/components/LiveChatMessage.tsx
A       28      0  src/components/shared/InfoTooltip.tsx
M       26      0  src/lib/schemas/app.ts
A       25      0  src/lib/auction/immutability.ts
A       24      0  src/lib/piiSentinelFixture.ts
A       23      0  src/server/util/cashu.ts
M       22     10  src/components/Comments.tsx
M       22    108  src/frontend.tsx
A       21      0  src/lib/media.ts
A       20      0  src/components/sheet-contents/auctions/index.tsx
M       20      0  src/lib/stores/auth.ts
A       20      0  src/lib/utils/cashu.ts
A       19      0  src/server/http/nip05.ts
M       18      2  src/lib/schemas/featured.ts
M       18      0  src/routes/__root.tsx
A       15      0  src/lib/nostr/event-signature.ts
M       12      0  src/routes/_dashboard-layout/dashboard/index.tsx
M       11      3  src/routes/_dashboard-layout/dashboard/products/products.tsx
A       10      0  src/lib/auctionMintSync.ts
M       10      1  src/queries/external.tsx
M        9      0  src/publish/orders.tsx
M        8      0  src/config/dashboardNavigation.ts
M        8      3  src/lib/constants/testLabels.ts
M        8      8  src/lib/utils/testLabelFilters.ts
M        8      0  src/lib/wallet/display.ts
A        8      0  src/server/util/sha256.ts
M        7      2  src/server/BootstrapManager.ts
M        6      0  src/components/SheetRegistry.tsx
M        6      2  src/components/sheet-contents/products/ProductWelcomeScreen.tsx
M        6      5  src/queries/bugReports.tsx
M        6      1  src/server/EventHandler.ts
M        6      0  src/server/index.ts
M        5      5  src/components/BugReportModal.tsx
M        5      2  src/components/ProfileWalletCheck.tsx
M        5      4  src/queries/comments.tsx
M        4      4  src/components/auth/NostrConnectQR.tsx
M        4      3  src/components/messages/ChatMessageBubble.tsx
M        4      1  src/components/sheet-contents/products/index.tsx
M        4      3  src/publish/comments.tsx
M        4     14  src/queries/config.tsx
A        4      0  src/server/util/httpResponses.ts
M        3      2  src/components/CollectionCard.tsx
M        3      3  src/components/ShowTestListingsToggle.tsx
M        3     10  src/lib/stores/config.ts
M        3      2  src/lib/utils/blacklistFilters.ts
M        3      3  src/lib/wallet/index.ts
M        3      1  src/publish/wallet.tsx
M        2      1  src/components/CartItem.tsx
M        2      1  src/components/CollectionDisplayComponent.tsx
M        2      1  src/components/ProductCard.tsx
M        2      1  src/components/ProductDisplayComponent.tsx
M        2      1  src/components/ProductSearch.tsx
M        2      1  src/components/migration/MigrationForm.tsx
A        2      0  src/components/sheet-contents/NewAuctionContent.tsx
M        2      1  src/components/sheet-contents/collections/ProductsTab.tsx
M        2      2  src/lib/nostr/nip59.ts
M        2      1  src/lib/stores/ui.ts
M        2      1  src/publish/reactions.tsx
M        2      1  src/queries/reactions.tsx
M        2      1  src/queries/testLabels.tsx
M        2      1  src/routes/_dashboard-layout/dashboard/products/collections.tsx
M        2      1  src/routes/products.index.tsx
M        2      0  src/server/types.ts
M        1      0  src/components/layout/MobileMenu.tsx
M        1      0  src/lib/nostr/io-ndk.ts
M        1      1  src/queries/messages.tsx
M        1      1  src/routes/index.tsx
M        0      7  src/hooks/usePIIMonitor.ts
D        0     35  src/lib/cvm-identity.ts
M        0      2  src/lib/utils/piiScanner.ts
```

## 2-test  (108 files, +29392/-56)

```
A     1540      0  src/lib/__tests__/settlementDescriptor.test.ts
A     1462      0  src/lib/__tests__/computeValidatedBids.test.ts
A     1300      0  src/lib/__tests__/auctionBidFundingSessionGuard.test.ts
A     1293      0  src/lib/__tests__/auctionValidatorLifecycle.test.ts
A     1152      0  e2e/tests/auction-bidding-mints.spec.ts
A     1040      0  src/lib/__tests__/auctionBidValidation.test.ts
A     1038      0  e2e/tests/auction-settlement.spec.ts
A      866      0  src/lib/__tests__/auctionBidPublishRetry.test.ts
A      860      0  src/lib/__tests__/auctionValidatorSubscriber.test.ts
A      747      0  src/lib/__tests__/nostr/nip59.test.ts
A      605      0  src/lib/__tests__/auctionValidatorContext.test.ts
A      520      0  src/lib/__tests__/auctionValidatorSubscriberBounds.test.ts
A      479      0  e2e/tests/test-labels-auctions.spec.ts
A      471      0  src/lib/__tests__/auctionWon.test.ts
A      462      0  src/lib/__tests__/auctionBidFundingLifecycle.test.ts
A      458      0  src/lib/__tests__/auctionSettlementCompleteness.test.ts
A      430      0  src/lib/__tests__/auctionDLEQ.test.ts
A      402      0  src/lib/__tests__/auctionSettlementP2pk.test.ts
A      398      0  src/lib/__tests__/validatedBidView.unit.test.ts
A      391      0  src/queries/__tests__/auctionTestLabelGate.test.ts
A      387      0  src/lib/__tests__/notifications.test.ts
A      385      0  src/lib/__tests__/auctionSettlement.test.ts
A      384      0  src/lib/__tests__/nip53.test.ts
A      375      0  src/queries/__tests__/liveChat.test.ts
A      358      0  src/lib/__tests__/pathReleasePipeline.test.ts
A      352      0  src/lib/__tests__/auctions/privateAuctionClaimMessage.test.ts
A      343      0  src/lib/__tests__/auctionFormStorage.test.ts
A      339      0  src/lib/__tests__/auctionValidatorPublisher.test.ts
A      325      0  src/queries/__tests__/auctionAdmissionGate.test.ts
A      312      0  src/lib/__tests__/auctionValidatorMintReachability.test.ts
A      302      0  src/lib/__tests__/nip60LockAuctionBidFunds.test.ts
A      297      0  src/lib/__tests__/nip60DepositIdentity.test.ts
A      286      0  src/lib/__tests__/reserveGuard.test.ts
A      277      0  src/lib/wallet/nip60.test.ts
A      276      0  e2e/tests/auction-invalid-event-gate.spec.ts
A      274      0  src/lib/__tests__/bidderPathRelease.test.ts
A      269      0  src/lib/__tests__/auctionMintSelection.test.ts
A      269      0  src/lib/__tests__/auctionSettlementPhase6.test.ts
A      258      0  src/lib/__tests__/bidderChainRecords.test.ts
A      249      0  src/lib/__tests__/auctionAdmission.test.ts
A      241      0  src/queries/__tests__/auctionListHelpers.test.ts
A      238      0  src/lib/__tests__/instance-config.test.ts
A      229      0  src/lib/__tests__/auctionDLEQ.mint.integration.test.ts
A      215      0  src/lib/__tests__/auctionBidderStatus.test.ts
A      208      0  e2e/tests/auction-live-chat-ui.spec.ts
A      208      0  src/lib/__tests__/auctionValidatorNut7Poller.test.ts
A      204      0  src/queries/__tests__/auctionVerdicts.test.ts
A      198      0  src/lib/__tests__/auctionBidLockDleq.test.ts
A      196      0  src/lib/__tests__/auctionBidEventSchema.test.ts
A      186      0  src/lib/__tests__/auctionMintSelection.integration.test.ts
A      180      0  e2e/tests/auction-live-chat.spec.ts
A      171      0  src/lib/__tests__/walletStorageStrict.test.ts
A      166      0  src/lib/__tests__/auctionValidatorSpamPolicy.test.ts
A      162      0  src/lib/__tests__/auctions-ndk-surface-guard.test.ts
A      161      0  src/lib/__tests__/preLockRecoveryRecordBound.test.ts
A      149      0  src/lib/__tests__/relay-policy.test.ts
A      147      0  src/lib/__tests__/auctionBidFundingCrossLeg.test.ts
A      141      0  src/lib/__tests__/auctionP2pk.test.ts
A      139      0  src/lib/__tests__/auctionStartingBidRequired.test.ts
A      138      0  src/lib/__tests__/auctionValidatorObservedAtRecovery.test.ts
A      138      0  src/lib/__tests__/dleqFixture.test.ts
A      134      0  e2e/tests/auction-home-grids.spec.ts
A      130      0  src/queries/__tests__/auctionPathReleases.test.ts
A      128      0  src/lib/__tests__/verdictQuorum.test.ts
A      127      0  src/lib/__tests__/auctionPublishValidation.test.ts
A      123      0  src/queries/__tests__/LiveChatPanel.test.ts
A      122      0  src/lib/__tests__/auctionValidatorPendingBuffer.test.ts
A      121      0  src/lib/__tests__/dleqKeysetFetch.test.ts
A      118      0  src/lib/__tests__/productNotificationScopes.test.ts
A      115      0  src/lib/__tests__/eventLike.test.ts
A      110      0  src/lib/__tests__/auctionEndingSoonOrder.test.ts
A      108      0  src/lib/__tests__/cvm-server-key.test.ts
A      107      0  src/queries/__tests__/auctionBidStream.test.ts
A      106      0  src/lib/__tests__/fetchMintKeysets.test.ts
A      105      0  src/lib/__tests__/hashToCurveVsCashuTs.test.ts
A      103      0  src/lib/__tests__/server-bootstrap-persistence.test.ts
A      101      0  e2e/tests/self-hosted-config.spec.ts
A      100      0  e2e/tests/media-rendering.spec.ts
A       97      0  src/lib/__tests__/auctionValidatorPolicy.test.ts
A       94      0  e2e/tests/cvm-config.spec.ts
A       93      0  src/lib/__tests__/auctionCountdownPreStart.test.ts
M       91      9  src/lib/__tests__/appSettings.test.ts
A       86      0  src/lib/__tests__/auctionTagBuilders.test.ts
A       80      0  e2e/tests/auction-mint-state.spec.ts
M       74     11  src/lib/__tests__/e2e-workflow-gate-membership.test.ts
A       73      0  e2e/tests/auction-shipping.spec.ts
A       70      0  src/lib/__tests__/mintCapability.test.ts
A       65      0  src/lib/utils/cashu.test.ts
A       63      0  src/lib/__tests__/hashToCurve.test.ts
A       63      0  src/queries/__tests__/auctionsPrivateClaim.test.ts
A       59      0  src/lib/__tests__/auctionShippingRefs.test.ts
A       59      0  src/lib/auction/useNut7Polling.test.ts
A       58      0  src/lib/auctionMintSync.test.ts
A       45      0  src/lib/__tests__/auctionValidatorIndex.test.ts
A       42      0  src/lib/__tests__/ndkZapRelays.test.ts
A       37      0  src/lib/__tests__/auctionCountdownLabels.test.ts
M       31      0  src/lib/__tests__/io.test.ts
A       31      0  src/lib/wallet/proofs.test.ts
M       15      5  src/lib/orders/privateOrderMessage.test.ts
M       12     18  src/lib/utils/message-content.test.ts
M       10      2  src/publish/orders.test.ts
M        9      3  src/lib/__tests__/contextvm-client.integration.test.ts
M        9      2  src/lib/nostr/nip59.test.ts
M        9      1  src/queries/__tests__/external.test.ts
M        9      2  src/queries/__tests__/orders-private-details.test.ts
M        2      1  src/ws.test.ts
M        1      1  src/lib/stores/cart.test.ts
M        1      1  src/queries/__tests__/profile-validation.test.ts
```

## 3-adr  (13 files, +3068/-3)

```
A      438      0  docs/adr/ADR-0004-auction-settlement-descriptor.md
A      419      0  docs/adr/ADR-0003-auctions-comprehensive-validation-protocol.md
A      336      0  docs/adr/ADR-0012-bid-validity-selection-and-winner-derivation.md
A      332      0  docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md
A      290      0  docs/adr/proposals/auction-multiparty-wire-profile.md
A      286      0  docs/adr/ADR-0008-direct-lightning-bid-funding.md
A      273      0  docs/adr/proposals/adr-0012-phase1-amendment-spec.md
A      202      0  docs/adr/ADR-018-instance-configuration-and-self-hosting.md
M      174      2  docs/adr/ADR-0009-test-listing-labels-via-nip-32.md
A      144      0  docs/adr/ADR-0011-bid-time-collateral-verification-via-nut12-dleq.md
A      102      0  docs/adr/ADR-0006-local-cashu-mint-for-e2e-tests.md
M       65      1  docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md
M        7      0  docs/adr/ADR-0005-no-external-service-dependencies-in-tests.md
```

## 3-docs  (5 files, +967/-0)

```
A      483      0  docs/protocol/auction-multiparty-v1.md
A      160      0  docs/handover/live-activity-addressing.md
A      139      0  docs/tasks/pr1144-followup-improvements.md
A      138      0  docs/ndk-to-applesauce-migration-guide.md
A       47      0  docs/tasks/validator-nut7-winner-check.md
```

## 4-ci  (7 files, +226/-30)

```
M       86     11  .github/workflows/deploy-auctionsdev.yml
M       82      4  .github/workflows/e2e.yml
A       26      0  .github/workflows/ci-instance-literals-guard.yml
M       18      1  .github/workflows/ci-unit.yml
M        9      1  .github/workflows/ci-ndk-guard.yml
M        3     11  .github/workflows/deploy.yml
M        2      2  .github/workflows/prettier.yml
```

## 5-script  (7 files, +1206/-2)

```
A      407      0  scripts/gen_auctions.ts
M      267      1  scripts/seed.ts
A      191      0  scripts/diagnose-nut7.ts
A      155      0  scripts/check-auctions-ndk-surface.sh
A      131      0  scripts/dev-seed.ts
A       54      0  scripts/check-instance-literals.sh
M        1      1  scripts/fetch-btc-price.ts
```

## 6-infra  (9 files, +906/-23)

```
A      370      0  contextvm/tools/live-activity-worker.ts
M      151     17  contextvm/server.ts
M      144      0  deploy-simple/RELAY_DEPLOY.md
A      108      0  contextvm/tools/__tests__/live-activity-worker.test.ts
M       54      0  deploy-simple/README.md
M       37      0  deploy-simple/env/.env.production.example
M       20      5  deploy-simple/deploy.sh
M       20      0  deploy-simple/env/.env.staging.example
M        2      1  deploy-simple/control.sh
```

## 7-e2e-other  (7 files, +352/-18)

```
M       90      2  e2e/ARCHITECTURE.md
M       82      7  e2e/seed-relay.ts
M       63      0  e2e/scenarios/index.ts
A       51      0  e2e/start-local-mint.sh
M       43      5  e2e/playwright.config.ts
M       17      1  e2e/test-config.ts
M        6      3  e2e/AGENTS.md
```

## 8-root  (8 files, +2799/-17)

```
A     2671      0  AUCTIONS.md
M       50      2  AGENTS.md
M       24      0  .env.example
M       21      3  styles/globals.css
M       14      0  README.md
M        8      1  .env.local.example
M        8      4  package.json
M        3      7  ctxcn.config.json
```
