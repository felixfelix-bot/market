**Review — head `ed2fc50d457494eebb5adfc2659451ea403c7a5a`** (PR #1332 @ `ed2fc50d`)

**CHANGES REQUESTED.**

Docs-only ADR addendum; `## Status` stays `Accepted`. Verified read-only at this head (`git show <sha>:<path>`, `git grep`, `node_modules` inspection). One factual premise in the F3 section needs correcting before approval — it is the same point already on the thread from @maximotodev (2026-10-06). Everything else in the addendum is accurate: all 17 of its `path:line` citations resolve at this head.

**[BLOCK] `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md:319-325` — the F3 paragraph calls five `#p`-only reads "author-scoped" and asserts they are "outbox-routed today".**
The sentence *"In production those reads are therefore outbox-routed today"* (`:323-324`) does not hold for most of the sites it lists. NDK's outbox routing derives author relays from `filter.authors`; a filter carrying only a `#p` tag falls back to the configured/pinned relay set, not to outbox discovery.
- Evidence (pinned `@nostr-dev-kit/ndk@3.0.3`, `node_modules/@nostr-dev-kit/ndk/dist/index.js`): `calculateRelaySetsFromFilter` (`:2860`) collects `authors` from `filter.authors` (`:2863-2867`); when `authors.size > 0` it routes to author relays (`:2868-2894`); otherwise (`:2895-2900`) it falls back to `ndk.explicitRelayUrls` (then `pool.permanentAndConnectedRelays()` at `:2902-2905`).
- Of the eight sites listed, five pass `#p`-only filters and are therefore **not** author-outbox-routed:
  - `src/hooks/useNotificationMonitor.ts:59` — orderFilter, `'#p'` at `:55`
  - `:74` — messageFilter, `'#p'` at `:70`
  - `:135` — orderSubscription, `'#p'` at `:138`
  - `:161` — messageSubscription, `'#p'` at `:164`
  - `:185` — purchaseUpdateSubscription, `'#p'` at `:188`
  `git grep -n authors` over that file returns exactly one hit (`:91`, the purchase read) — the only author-filtered site in it, and the only read in it that *is* outbox-routed.
- Only `src/queries/authors.tsx:37` (authors `:31`), `src/hooks/useNotificationMonitor.ts:95` (authors `:91`) and `src/lib/stores/nip60.ts:198` (authors inline) are author-scoped ⇒ outbox-routed.
- Fix: split the premise. Keep "author-scoped reads are outbox-routed in production" for the authors-filtered trio, and describe the `#p`-only notification reads/subscriptions as pinned to the configured relay set. [Same request as @maximotodev's inline comment at `:324`.]

**[RISK] Refresh current-base validation before landing.** The head checks (`unit-integration`, `e2e-grep`, `prettier`, `security-scan`, `footprint` all SUCCESS) ran against the synthetic merge of the old base `4bc7f8c0` (`baseRefOid`). Current `master` is `68b1b7b9d459788613cd820d68792d52f3efa48c`; the branch is now 17 commits behind it, and the current synthetic merge carries no checks. Docs-only, so the risk is low, but the record should not land on un-refreshed integration.

**[NIT] PR body provenance is stale vs the addendum's own citations.** The body's table cites `master` `48714138` line numbers (e.g. `ndk-events.ts:11-13` for `rehydrateVerifiedNdkEvent`, which is at `:20-27` here; latest-wins at `:22-28`/`:46-52`, which is `:29-40`/`:42-62` here). The addendum itself is correctly refreshed; the description is not. Fix the body's table — it is the squash-merge record.

**[INFO] Verified at this head (read-only):**
- `## Status` unchanged (`Accepted`); diff vs base `4bc7f8c0` = 1 file, +83/−0; `git diff --check` clean.
- All 17 addendum citations resolve: `ndk-events.ts:29-40` (`isNewerEvent` `:35-40`) / `:42-62` (`fetchNdkEventSet`) / `:55` (call site); `ndk-events.ts:20` def with `verifyEvent` at `:22`; `orders.tsx:1001`; `stores/ndk.ts:283-291` (`fetchLatestAppEvent`) / `:421` / `:437`; `authors.tsx:37`; `useNotificationMonitor.ts:59/74/95`, `:135/161/185`; `nip60.ts:198`; `appSettings.ts:42` / `:107`; `index.tsx:7` / `:143` / `:409` / `:279-290`.
- F4 correction at `ed2fc50d` is accurate: NDK 3.0.3's default relay path verifies and drops (`shouldValidateEvent` `:2457`, `skipVerification = false` `:9510`, drop block `:9874-9882`, `initialValidationRatio = 1` `:12428` / `:12542`); `applesauce-relay@6.2.1` (bun.lock) dist has 0 `verif` hits. F4 scope enumeration is complete: exactly two call sites (`ndk-events.ts:55`, `orders.tsx:1001`).
- F5 pinning verified: `useAdminSettings` / `useEditorSettings` (`app-settings.tsx:62` / `:212`, `mainRelay` in the dep array at `:107` / `:257`) and `useBlacklistSettings` (`blacklist.tsx:66`, dep array `:108`) subscribe with `relayUrls: [mainRelay]` + `exclusiveRelay: true`.
- `fetchAppSettings` is server-only: sole importer is the server entry `src/index.tsx:7` (called `:143`, refresh block `:409`), and the browser consumes the parsed result from `/api/config` (`:279-290`). The `:107` read in `appSettings.ts` is inside that server function.

Not verified from here: live runtime outbox behaviour in a browser (source inspection only).
