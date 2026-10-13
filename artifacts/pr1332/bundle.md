# MATERIAL — Gate 2.5 audit bundle (PR #1332 @ ed2fc50d)

## DRAFT REVIEW (the artifact under audit)

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


## ADR addendum section at head (lines 258-340)
```
258|## Wave 1 addendum — behaviour `master` already has
259|
260|**Status of this section.** Descriptive only. It records the seam behaviour that
261|wave 1 depends on and that `master` already implements: the signature check on
262|rehydration (F4), the main-relay pinning discipline and its effect-dependency
263|invariant (F5), and the latest-wins ordering rule for replaceable events. It
264|records **no new decision** and leaves the `## Status` field of this ADR at
265|`Accepted`.
266|
267|The read-reach question for author-scoped reads (F3) is **not** recorded here.
268|It is a proposed decision, separated into its own PR, and the F3 subsection
269|below carries only the verified premise so the question is legible without the
270|decision being smuggled in with the description.
271|
272|### F4 — invalid-signature events are dropped on rehydration
273|
274|`rehydrateVerifiedNdkEvent` runs `verifyEvent` on every raw event and discards
275|those failing. NDK's default relay path verifies signatures and drops failures,
276|but the applesauce relay adapter these reads route through does not, so
277|bad-signature events that previously flowed into query data are now filtered.
278|This matches AGENTS.md ("Treat relay data as untrusted until validated"). The
279|failure is silent (a relay serving malformed data now reads as absence). A
280|debug-level drop counter does not exist today; it is a separate follow-up, not
281|a behavior this addendum asserts.
282|
283|**Scope of this behavior.** It applies where events are rehydrated through
284|`rehydrateVerifiedNdkEvent` — the seam fetch path (`src/lib/nostr/ndk-events.ts:55`)
285|and `src/queries/orders.tsx:1001`. Reads that call NDK directly without
286|rehydration are not covered by it.
287|
288|### F5 — live-subscribe stays pinned to the main relay once it is known
289|
290|`useAdminSettings` / `useEditorSettings` / `useBlacklistSettings` subscribe only
291|when `getMainRelay()` is defined, and pin that subscription to the main relay.
292|This preserves the pinning discipline `master` already has; the
293|`getAppRelaySet()` pool-wide fallback it replaces belongs to the `auctions` line
294|that wave 1 is migrating.
295|
296|The invariant this wave must keep: **the main-relay value is an effect dependency
297|of the subscription.** A hook that mounts before config resolves must subscribe as
298|soon as the relay becomes known; dropping the value from the dependency array
299|leaves the subscription silently absent for the rest of the session. Fetch parity
300|is unchanged — both the old and the new fetch paths return null while the relay is
301|unknown.
302|
303|### Deterministic latest-wins for replaceable event reads
304|
305|Conflicting `created_at` versions of the same deduplication-key event resolve to
306|the highest `created_at`, independent of relay-arrival order; on an equal
307|timestamp the lexicographically lower event id wins (NIP-01's tie-break). On
308|`master` this is `isNewerEvent` (`src/lib/nostr/ndk-events.ts:29-40`), applied by
309|`fetchNdkEventSet` (`:42-62`), which dedupes on the NDK coordinate key
310|(`kind:pubkey`, or `kind:pubkey:d` for parameterized kinds) and keeps the newest
311|copy. The single-event helper used for app-owned replaceable events is
312|`fetchLatestAppEvent` (`src/lib/stores/ndk.ts:283-291`), which selects by
313|`created_at`.
314|
315|### F3 — the read-reach question (premise only)
316|
317|Production NDK is constructed with `enableOutboxModel: true`
318|(`src/lib/stores/ndk.ts:421`, `:437`); outbox discovery is gated off for
319|`staging`, `development` and `LOCAL_RELAY_ONLY`. On `master` the author-scoped
320|reads this wave touches still call NDK directly — `ndk.fetchEvents` at
321|`src/queries/authors.tsx:37`, `src/hooks/useNotificationMonitor.ts:59/74/95`, and
322|`ndk.fetchEvent` at `src/lib/stores/nip60.ts:198`, with live subscriptions at
323|`src/hooks/useNotificationMonitor.ts:135/161/185`. In production those reads are
324|therefore outbox-routed today; no pinning is described here because none ships on
325|`master`.
326|
327|`src/lib/appSettings.ts:107` is **not** a client read: `fetchAppSettings`
328|(`:42`) is imported only by the server entry (`src/index.tsx:7`, called at boot
329|`:143` and refreshed at `:409`), and the browser consumes the parsed result from
330|`/api/config` (`appSettings`, `appPublicKey`, `needsSetup`, `src/index.tsx:279-290`).
331|
332|**No decision is recorded.** Whether production keeps that reach for
333|author-scoped reads, or gains a bounded author-relay path, is proposed in a
334|separate PR and deliberately not decided in this one.
335|
336|### Out of scope
337|
338|- Publish-path relay selection (`writeRelayUrls`) lands with Wave A4 / Wave C.
339|  This section covers reads only.
340|
```


## src/hooks/useNotificationMonitor.ts — filters and subscriptions (lines 40-200)
```
40|			const lastSeen = notificationActions.getLastSeenForConversation(pubkey)
41|			return (event.created_at || 0) > lastSeen
42|		}
43|
44|		const isNewPurchaseUpdate = (event: NDKEvent): boolean => {
45|			const lastSeen = notificationActions.getLastSeenPurchases()
46|			return (event.created_at || 0) > lastSeen
47|		}
48|
49|		// Initial fetch to calculate current unseen counts
50|		const initializeNotifications = async () => {
51|			try {
52|				// Fetch recent orders where user is seller (recipient)
53|				const orderFilter: NDKFilter = {
54|					kinds: [ORDER_PROCESS_KIND],
55|					'#p': [user.pubkey],
56|					limit: 100,
57|				}
58|
59|				const orderEvents = await ndk.fetchEvents(orderFilter)
60|
61|				// Filter for order creation events
62|				const newOrders = Array.from(orderEvents).filter((event) => {
63|					const typeTag = event.tags.find((tag) => tag[0] === 'type')
64|					return typeTag?.[1] === ORDER_MESSAGE_TYPE.ORDER_CREATION && isNewOrder(event)
65|				})
66|
67|				// Fetch recent messages (kind 14)
68|				const messageFilter: NDKFilter = {
69|					kinds: [ORDER_GENERAL_KIND],
70|					'#p': [user.pubkey],
71|					limit: 100,
72|				}
73|
74|				const messageEvents = await ndk.fetchEvents(messageFilter)
75|
76|				// Group messages by sender and count unseen per conversation
77|				const conversationCounts: Record<string, number> = {}
78|				let totalUnseenMessages = 0
79|
80|				Array.from(messageEvents).forEach((event) => {
81|					const senderPubkey = event.pubkey
82|					if (senderPubkey !== user.pubkey && isNewMessage(event, senderPubkey)) {
83|						conversationCounts[senderPubkey] = (conversationCounts[senderPubkey] || 0) + 1
84|						totalUnseenMessages++
85|					}
86|				})
87|
88|				// Fetch recent purchase updates (orders where user is buyer)
89|				const purchaseFilter: NDKFilter = {
90|					kinds: [ORDER_PROCESS_KIND],
91|					authors: [user.pubkey],
92|					limit: 100,
93|				}
94|
95|				const purchaseEvents = await ndk.fetchEvents(purchaseFilter)
96|
97|				// Filter for purchase updates (payment requests, status updates, shipping updates)
98|				// Exclude order creation events since those are initiated by the buyer
99|				const newPurchaseUpdates = Array.from(purchaseEvents).filter((event) => {
100|					const typeTag = event.tags.find((tag) => tag[0] === 'type')
101|					const isUpdate =
102|						typeTag?.[1] === ORDER_MESSAGE_TYPE.PAYMENT_REQUEST ||
103|						typeTag?.[1] === ORDER_MESSAGE_TYPE.STATUS_UPDATE ||
104|						typeTag?.[1] === ORDER_MESSAGE_TYPE.SHIPPING_UPDATE
105|
106|					// Only count if it's an update type AND it's from the seller (not the buyer)
107|					return isUpdate && event.pubkey !== user.pubkey && isNewPurchaseUpdate(event)
108|				})
109|
110|				// Update store with initial counts
111|				notificationActions.recalculateFromEvents({
112|					orderCount: newOrders.length,
113|					messageCount: totalUnseenMessages,
114|					purchaseCount: newPurchaseUpdates.length,
115|					conversationCounts,
116|				})
117|
118|				console.log('[NotificationMonitor] Initial counts:', {
119|					orders: newOrders.length,
120|					messages: totalUnseenMessages,
121|					purchases: newPurchaseUpdates.length,
122|					conversations: Object.keys(conversationCounts).length,
123|				})
124|			} catch (error) {
125|				console.error('[NotificationMonitor] Failed to initialize notifications:', error)
126|			}
127|		}
128|
129|		// Start initial fetch
130|		initializeNotifications()
131|
132|		// Set up real-time subscriptions
133|
134|		// 1. Subscribe to new orders where user is seller
135|		const orderSubscription = ndk.subscribe(
136|			{
137|				kinds: [ORDER_PROCESS_KIND],
138|				'#p': [user.pubkey],
139|				since: Math.floor(Date.now() / 1000), // Only new events from now
140|			},
141|			{
142|				closeOnEose: false,
143|			},
144|		)
145|
146|		orderSubscription.on('event', (event: NDKEvent) => {
147|			// Check if it's an order creation event
148|			const typeTag = event.tags.find((tag) => tag[0] === 'type')
149|			if (typeTag?.[1] === ORDER_MESSAGE_TYPE.ORDER_CREATION) {
150|				// Only increment if it's newer than last seen
151|				if (isNewOrder(event)) {
152|					console.log('[NotificationMonitor] New order received:', event.id)
153|					notificationActions.incrementUnseenOrders()
154|				}
155|			}
156|		})
157|
158|		subscriptionsRef.current.push(orderSubscription)
159|
160|		// 2. Subscribe to new messages where user is recipient
161|		const messageSubscription = ndk.subscribe(
162|			{
163|				kinds: [ORDER_GENERAL_KIND],
164|				'#p': [user.pubkey],
165|				since: Math.floor(Date.now() / 1000), // Only new events from now
166|			},
167|			{
168|				closeOnEose: false,
169|			},
170|		)
171|
172|		messageSubscription.on('event', (event: NDKEvent) => {
173|			const senderPubkey = event.pubkey
174|			// Don't count messages we sent
175|			if (senderPubkey !== user.pubkey && isNewMessage(event, senderPubkey)) {
176|				console.log('[NotificationMonitor] New message received from:', senderPubkey)
177|				notificationActions.incrementUnseenForConversation(senderPubkey)
178|			}
179|		})
180|
181|		subscriptionsRef.current.push(messageSubscription)
182|
183|		// 3. Subscribe to purchase updates (orders where user is buyer)
184|		// Listen for events tagged with user's pubkey that are updates from sellers
185|		const purchaseUpdateSubscription = ndk.subscribe(
186|			{
187|				kinds: [ORDER_PROCESS_KIND],
188|				'#p': [user.pubkey],
189|				since: Math.floor(Date.now() / 1000),
190|			},
191|			{
192|				closeOnEose: false,
193|			},
194|		)
195|
196|		purchaseUpdateSubscription.on('event', (event: NDKEvent) => {
197|			// Only count if event is from someone else (the seller)
198|			if (event.pubkey === user.pubkey) return
199|
200|			const typeTag = event.tags.find((tag) => tag[0] === 'type')
```


## src/queries/authors.tsx (lines 20-42)
```
20|	picture: JSON.parse(event.content)?.picture,
21|	nip05: JSON.parse(event.content)?.nip05,
22|})
23|
24|export const fetchAuthor = async (pubkey: string) => {
25|	// Reject an invalid pubkey before constructing the filter — a malformed
26|	// value in { authors: [...] } trips NDK's strict filter validation.
27|	if (!isValidHexKey(pubkey)) throw new Error('Author pubkey is required')
28|
29|	const filter: NDKFilter = {
30|		kinds: [0], // kind 0 is metadata
31|		authors: [pubkey],
32|	}
33|
34|	const ndk = ndkActions.getNDK()
35|	if (!ndk) throw new Error('NDK not initialized')
36|
37|	const events = await ndk.fetchEvents(filter)
38|	const eventArray = Array.from(events)
39|
40|	if (eventArray.length === 0) {
41|		throw new Error('Author not found')
42|	}
```


## src/lib/stores/nip60.ts (lines 190-200)
```
190|			...s,
191|			status: 'initializing',
192|			error: null,
193|		}))
194|
195|		let candidateWallet: NDKCashuWallet | undefined
196|		try {
197|			// First, try to fetch the existing wallet event (kind 17375)
198|			const walletEvent = await ndk.fetchEvent({ kinds: [17375], authors: [pubkey] })
199|			if (!isLifecycleCurrent(lifecycle)) return
200|
```


## src/lib/nostr/ndk-events.ts (lines 1-62)
```
1|import {
2|	NDKEvent,
3|	NDKNip46Signer,
4|	NDKUser,
5|	type NDKEncryptionScheme,
6|	type NDKFilter,
7|	type NDKRelaySet,
8|	type NDKSigner,
9|	type NDKTag,
10|} from '@nostr-dev-kit/ndk'
11|import { verifyEvent, type Event } from 'nostr-tools'
12|
13|import type { NostrFilter, NostrIo } from './io'
14|
15|export { NDKEvent, NDKNip46Signer, NDKUser }
16|export type { NDKEncryptionScheme, NDKFilter, NDKRelaySet, NDKSigner, NDKTag }
17|
18|type NdkEventContext = ConstructorParameters<typeof NDKEvent>[0]
19|
20|export function rehydrateVerifiedNdkEvent(ndk: NdkEventContext, event: Event): NDKEvent | null {
21|	try {
22|		if (!verifyEvent(event)) return null
23|		return new NDKEvent(ndk, event)
24|	} catch {
25|		return null
26|	}
27|}
28|
29|/**
30| * Latest-wins ordering for two versions of the same deduplication-key event.
31| * Higher `created_at` wins; on an equal timestamp the lexicographically lower
32| * id wins (NIP-01 replaceable-event tie-break), so the winner never depends on
33| * relay-arrival order.
34| */
35|function isNewerEvent(candidate: NDKEvent, existing: NDKEvent): boolean {
36|	const candidateTime = candidate.created_at ?? 0
37|	const existingTime = existing.created_at ?? 0
38|	if (candidateTime !== existingTime) return candidateTime > existingTime
39|	return candidate.id < existing.id
40|}
41|
42|export async function fetchNdkEventSet(
43|	nostrIo: Pick<NostrIo, 'fetchEvents'>,
44|	ndk: NdkEventContext,
45|	filter: NDKFilter | NDKFilter[],
46|): Promise<Set<NDKEvent>> {
47|	const rawEvents = await nostrIo.fetchEvents(filter as NostrFilter | NostrFilter[])
48|	// Dedupe on NDK's coordinate-level identity, not the raw event id: replaceable
49|	// (kind 0/3/1e4-2e4 -> `kind:pubkey`) and parameterized replaceable
50|	// (kind 3e4-4e4 -> `kind:pubkey:d`) events are versions of one logical event,
51|	// so conflicting copies collected from different relays must collapse to a
52|	// single latest-wins winner instead of leaking in relay-arrival order.
53|	const eventsByKey = new Map<string, NDKEvent>()
54|	for (const event of rawEvents) {
55|		const ndkEvent = rehydrateVerifiedNdkEvent(ndk, event)
56|		if (!ndkEvent) continue
57|		const key = ndkEvent.deduplicationKey()
58|		const existing = eventsByKey.get(key)
59|		if (!existing || isNewerEvent(ndkEvent, existing)) eventsByKey.set(key, ndkEvent)
60|	}
61|	return new Set(eventsByKey.values())
62|}
```


## src/lib/stores/ndk.ts (lines 280-292 and 415-440)
```
280| * Fetch the latest event (highest created_at) matching the filter from the app relay only.
281| * Returns null if NDK isn't ready, the app relay isn't known yet, or no event was found.
282| */
283|export async function fetchLatestAppEvent(filter: AppEventFilter): Promise<NDKEvent | null> {
284|	const ndk = ndkStore.state.ndk
285|	const relaySet = getAppRelaySet()
286|	if (!ndk || !relaySet) return null
287|	const events = await ndk.fetchEvents(filter as NDKFilter, undefined, relaySet)
288|	const arr = Array.from(events)
289|	if (arr.length === 0) return null
290|	return arr.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0]
291|}
292|
...
415|		// @ts-ignore - Bun.env is available in Bun runtime
416|		const localRelayOnly = typeof Bun !== 'undefined' && Bun.env?.LOCAL_RELAY_ONLY === 'true'
417|		const stage = getCurrentStage()
418|
419|		// Disable outbox model for staging, development, and local-only mode
420|		// This prevents NDK from discovering and connecting to additional relays
421|		const enableOutbox = stage !== 'staging' && stage !== 'development' && !localRelayOnly
422|
423|		// AI Guardrails are an NDK dev-time educational tool (shipped off by
424|		// default). Enabling them in production turns a single malformed pubkey
425|		// in any filter into a fatal throw ("AI_GUARDRAILS ERROR") that crashes
426|		// the page. Keep them on only in dev/staging where they're useful.
427|		//
428|		// NDK's default filter validation ('validate', strict) is intentionally
429|		// retained in all stages: invalid/empty pubkeys are rejected at the query
430|		// layer before any filter is built (fail closed) — never by loosening NDK
431|		// validation. 'fix' mode would strip a bad author and broaden an
432|		// identity-scoped request instead of rejecting it, which is unsafe for
433|		// marketplace identity/order/payment boundaries.
434|		const enableGuardrails = stage === 'development' || stage === 'staging'
435|		const ndk = new NDK({
436|			explicitRelayUrls: explicitRelays,
437|			enableOutboxModel: enableOutbox,
438|			// Plebeian explicitly loads user relay preferences through the
439|			// session-scoped initializeSignerServices/loadRelaysFromNostr path.
440|			autoConnectUserRelays: false,
```


## src/queries/app-settings.tsx — getMainRelay/subscribe/deps (selected lines)
```
60| * Hook to fetch admin settings for the app
61| */
62|export const useAdminSettings = (appPubkey?: string) => {
63|	const queryClient = useQueryClient()
64|	const ndk = ndkActions.getNDK()
65|	const mainRelay = getMainRelay()
66|
67|	// Set up a live subscription to monitor admin list changes
68|	useEffect(() => {
69|		if (!appPubkey || !ndk || !mainRelay) return
70|
71|		const adminListFilter = {
72|			kinds: [30000],
73|			authors: [appPubkey],
74|			'#d': ['admins'],
75|		}
76|
77|		// Track latest event timestamp to avoid reacting to historical events
78|		let latestEventTime = 0
79|		let receivedEose = false
80|
81|		const subscription = ndk.subscribe(adminListFilter, {
82|			closeOnEose: false, // Keep subscription open
83|			relayUrls: [mainRelay],
84|			exclusiveRelay: true, // Reject stale copies from other relays in the pool
85|		})
86|
87|		// Event handler for admin list updates - only react to newer events after EOSE
88|		subscription.on('event', (newEvent) => {
89|			const eventTime = newEvent.created_at ?? 0
90|			if (receivedEose && eventTime > latestEventTime) {
91|				queryClient.invalidateQueries({ queryKey: configKeys.admins(appPubkey) })
92|				queryClient.refetchQueries({ queryKey: configKeys.admins(appPubkey) })
93|			}
94|			if (eventTime > latestEventTime) {
95|				latestEventTime = eventTime
96|			}
97|		})
98|
99|		subscription.on('eose', () => {
100|			receivedEose = true
101|		})
102|
103|		// Clean up subscription when unmounting
104|		return () => {
105|			subscription.stop()
106|		}
107|	}, [appPubkey, ndk, mainRelay, queryClient])
108|
109|	return useQuery({
110|		queryKey: configKeys.admins(appPubkey || ''),
```


## src/queries/blacklist.tsx — selected lines
```
64| * Hook to fetch blacklist settings for the app
65| */
66|export const useBlacklistSettings = (appPubkey?: string) => {
67|	const queryClient = useQueryClient()
68|	const ndk = ndkActions.getNDK()
69|	const mainRelay = getMainRelay()
70|
71|	// Set up a live subscription to monitor blacklist changes
72|	useEffect(() => {
73|		if (!appPubkey || !ndk || !mainRelay) return
74|
75|		const blacklistFilter = {
76|			kinds: [10000], // NIP-51 mute list
77|			authors: [appPubkey],
78|		}
79|
80|		let latestEventTime = 0
81|		let receivedEose = false
82|
83|		const subscription = ndk.subscribe(blacklistFilter, {
84|			closeOnEose: false, // Keep subscription open
85|			relayUrls: [mainRelay],
86|			exclusiveRelay: true, // Reject stale copies from other relays in the pool
87|		})
88|
89|		// Event handler for blacklist updates - only react to newer events after EOSE
90|		subscription.on('event', (newEvent) => {
91|			const eventTime = newEvent.created_at ?? 0
92|			if (receivedEose && eventTime > latestEventTime) {
93|				queryClient.invalidateQueries({ queryKey: configKeys.blacklist(appPubkey) })
94|			}
95|			if (eventTime > latestEventTime) {
96|				latestEventTime = eventTime
97|			}
98|		})
99|
100|		subscription.on('eose', () => {
101|			receivedEose = true
102|		})
103|
104|		// Clean up subscription when unmounting
105|		return () => {
106|			subscription.stop()
107|		}
108|	}, [appPubkey, ndk, mainRelay, queryClient])
109|
110|	return useQuery({
```


## src/index.tsx — selected lines
```
1|import { serve } from 'bun'
2|import { Relay } from 'nostr-tools'
3|import { getPublicKey, verifyEvent, type Event } from 'nostr-tools/pure'
4|import NDK from '@nostr-dev-kit/ndk'
5|import { bech32 } from '@scure/base'
6|import index from './index.html'
7|import { fetchAppSettings } from './lib/appSettings'
8|import { AppSettingsSchema } from './lib/schemas/app'
...
140|	try {
141|		const privateKeyBytes = new Uint8Array(Buffer.from(APP_PRIVATE_KEY, 'hex'))
142|		APP_PUBLIC_KEY = getPublicKey(privateKeyBytes)
143|		appSettings = await fetchAppSettings(RELAY_URL as string, APP_PUBLIC_KEY)
144|		if (appSettings) {
145|			console.log('App settings loaded successfully')
...
275|		'/api/config': {
276|			GET: () => {
277|				const stage = determineStage()
278|				// Return cached settings loaded at startup
279|				return Response.json({
280|					appRelay: RELAY_URL,
281|					stage,
282|					commit: COMMIT_SHA,
283|					nip46Relay: NIP46_RELAY_URL,
284|					appSettings: appSettings,
285|					appPublicKey: APP_PUBLIC_KEY,
286|					cvmServerPubkey: getCvmServerPublicKey(),
287|					needsSetup: !appSettings,
288|					serverReady: eventHandlerReady,
289|					externalZapRelaysEnabled: stage === 'production' || (stage === 'development' && process.env.LOCAL_RELAY_ONLY !== 'true'),
290|				})
291|			},
292|		},
```


## src/lib/appSettings.ts lines 40-44 and 104-110
```
40|}
41|
42|export async function fetchAppSettings(relayUrl: string, appPubkey: string): Promise<AppSettings | null> {
43|	console.log(`Fetching app settings from relay: ${relayUrl} for pubkey: ${appPubkey}`)
44|
...
104|				})
105|			})
106|
107|		const events = (await fetchWithTimeout(ndk.fetchEvents(filter), 10000)) as Set<NDKEvent>
108|		const eventArray = Array.from(events)
109|		console.log(`Fetch returned ${eventArray.length} events`)
110|
```


## @nostr-dev-kit/ndk@3.0.3 dist/index.js calculateRelaySetsFromFilter (2860-2908)
```
2860|function calculateRelaySetsFromFilter(ndk, filters, pool, relayGoalPerAuthor) {
2861|  const result = /* @__PURE__ */ new Map();
2862|  const authors = /* @__PURE__ */ new Set();
2863|  filters.forEach((filter) => {
2864|    if (filter.authors) {
2865|      filter.authors.forEach((author) => authors.add(author));
2866|    }
2867|  });
2868|  if (authors.size > 0) {
2869|    const authorToRelaysMap = getRelaysForFilterWithAuthors(ndk, Array.from(authors), relayGoalPerAuthor);
2870|    for (const relayUrl of authorToRelaysMap.keys()) {
2871|      result.set(relayUrl, []);
2872|    }
2873|    for (const filter of filters) {
2874|      if (filter.authors) {
2875|        for (const [relayUrl, authors2] of authorToRelaysMap.entries()) {
2876|          const authorFilterAndRelayPubkeyIntersection = filter.authors.filter(
2877|            (author) => authors2.includes(author)
2878|          );
2879|          result.set(relayUrl, [
2880|            ...result.get(relayUrl),
2881|            {
2882|              ...filter,
2883|              // Overwrite authors sent to this relay with the authors that were
2884|              // present in the filter and are also present in the relay
2885|              authors: authorFilterAndRelayPubkeyIntersection
2886|            }
2887|          ]);
2888|        }
2889|      } else {
2890|        for (const relayUrl of authorToRelaysMap.keys()) {
2891|          result.set(relayUrl, [...result.get(relayUrl), filter]);
2892|        }
2893|      }
2894|    }
2895|  } else {
2896|    if (ndk.explicitRelayUrls) {
2897|      ndk.explicitRelayUrls.forEach((relayUrl) => {
2898|        result.set(relayUrl, filters);
2899|      });
2900|    }
2901|  }
2902|  if (result.size === 0) {
2903|    pool.permanentAndConnectedRelays().slice(0, 5).forEach((relay) => {
2904|      result.set(relay.url, filters);
2905|    });
2906|  }
2907|  return result;
2908|}
```


## ndk dist verification anchors
```
2457|  shouldValidateEvent() {
9510|  skipVerification = false;
9874|          const shouldVerify = relay.shouldValidateEvent();
9875|          if (shouldVerify && !this.skipVerification) {
9880|              if (!ndkEvent.verifySignature(true)) {
9881|                this.debug("Event failed signature validation", event);
9882|                this.ndk.reportInvalidSignature(ndkEvent, relay);
12427|  asyncSigVerification = false;
12428|  initialValidationRatio = 1;
12542|    this.initialValidationRatio = opts.initialValidationRatio || 1;
```


## PR facts (gh, 2026-10-09)
headRefOid ed2fc50d457494eebb5adfc2659451ea403c7a5a; baseRefOid 4bc7f8c0c73ae4ba2ff2a78f0c66d28347d1c1ce
mergeable MERGEABLE; mergeStateStatus BLOCKED; 1 file +83/-0
head check-runs: unit-integration success, e2e-grep success, prettier success, security-scan success, footprint success, e2e-full skipped
current master: 68b1b7b9d459788613cd820d68792d52f3efa48c; branch behind master: 17
bun.lock resolves applesauce-relay@6.2.1; grep -ri verif node_modules/applesauce-relay/dist -> 0 hits
maintainer @maximotodev review at ed2fc50d (2026-10-06): COMMENTED, asks to correct the F3 routing premise (inline at ADR :324) and refresh line refs/PR-body provenance; notes head checks tested older master integration.
