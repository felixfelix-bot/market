import type { Page } from '@playwright/test'
// DEFAULT_PROXY is the host @getalby/lightning-tools uses when LightningAddress is
// constructed without options. Deriving the proxy routes from the library's own constant
// means this mock cannot drift from the host the app actually contacts.
import { DEFAULT_PROXY } from '@getalby/lightning-tools'

/**
 * A syntactically valid BOLT11 invoice that is deliberately never payable: a fixed
 * payment hash, no route hints, and an all-zero signature.
 *
 * It must stay *decodable*. The order-invoice path feeds this string to
 * `new Invoice({ pr })` (via `LightningAddress.requestInvoice()` →
 * `generateInvoice()`), and that constructor calls the library's `decodeInvoice()`,
 * throwing "Failed to decode payment request" on anything it cannot parse. A
 * non-decodable literal therefore makes the app take its failure branch no matter how
 * well the routes are intercepted, which is why the checkout specs assert this value in
 * the UI rather than only asserting that the Invoices step rendered.
 *
 * Regenerate with: `lnbc` + amount + millisatoshi-multiplier HRP, a 7-word timestamp, the
 * `payment_hash` (tag 1) and `description` (tag 13) tags, then 104 signature words,
 * bech32-encoded (see the bundled decoder at @getalby/lightning-tools dist/esm/index.js:942).
 */
export const FAKE_BOLT11 =
	'lnbc10u1p5ww7qqpp5m6kmam774klwlh4dhmhaatd7al02m0h0m6kmam774klwlh4dhmhsdp52pkx2cn9d9skugzdv9exket5ypjnyefqd4hkx6eqd9h8vmmfvdjsqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq0kfhmj'

/**
 * Lightning address this mock serves by default: `test@lnurl.e2e.test`, mirroring
 * `TEST_WALLETED_USER_LUD16` in src/lib/fixtures.ts, which the scenario seeder writes into
 * the merchant profile and payment detail. `.e2e.test` is a reserved TLD, so a route miss
 * fails as NXDOMAIN instead of reaching a live provider.
 */
const DEFAULT_DOMAIN = 'lnurl.e2e.test'
const DEFAULT_USERNAME = 'test'

export interface LnurlMockOptions {
	/** The Lightning address domain to intercept (default: lnurl.e2e.test) */
	domain?: string
	/** The Lightning address username to intercept (default: test) */
	username?: string
	/** If true, fail the LNURL metadata fetch before invoice generation starts */
	failMetadata?: boolean
	/** The minSendable in millisats (default: 1_000 = 1 sat) */
	minSendable?: number
	/** The maxSendable in millisats (default: 100_000_000_000 = 100k sats) */
	maxSendable?: number
	/** Override the bolt11 invoice returned (default: FAKE_BOLT11) */
	bolt11?: string
	/** If true, return allowsNostr: true in metadata (default: true) */
	allowsNostr?: boolean
	/** If true, the callback will return an error instead of an invoice */
	failCallback?: boolean
}

/**
 * The route globs this mock registers, keyed by the code path each one covers.
 *
 * Exported so a focused check can assert the patterns match the URLs
 * `@getalby/lightning-tools` actually builds, instead of trusting a comment.
 */
export function lnurlMockRoutePatterns(domain = DEFAULT_DOMAIN, username = DEFAULT_USERNAME) {
	return {
		/**
		 * Proxied LNURL-pay details. This is the request the order-invoice path really
		 * makes: src/queries/payment.tsx:1011 is the app's only `new LightningAddress(...)`
		 * call site and passes no options, so the library keeps its DEFAULT_PROXY and
		 * `fetch()` → `fetchWithProxy()` GETs
		 * `${DEFAULT_PROXY}/lightning-address-details?ln=<lud16>`.
		 */
		proxyDetails: `${DEFAULT_PROXY}/lightning-address-details**`,
		/**
		 * Proxied invoice generation: `requestInvoice()` / `zapInvoice()` →
		 * `generateInvoice()` GETs `${DEFAULT_PROXY}/generate-invoice?ln=<lud16>&amount=<msat>`
		 * and reads `json.invoice.pr`.
		 */
		proxyInvoice: `${DEFAULT_PROXY}/generate-invoice**`,
		/**
		 * Un-proxied LNURL-pay discovery (`LightningAddress.lnurlpUrl()`). Not used by the
		 * order-invoice path, but it is what raw consumers such as NDK's zapper request, so
		 * the mock keeps covering it.
		 */
		discovery: `https://${domain}/.well-known/lnurlp/${username}`,
		/** Un-proxied invoice callback (the `callback` URL served in discovery). */
		callback: `https://${domain}/lnurlp/${username}/callback**`,
	}
}

/**
 * Sets up Playwright route mocks to intercept LNURL-pay HTTP calls.
 *
 * The app uses `@getalby/lightning-tools`' LightningAddress class, which has two paths and
 * this mock covers both:
 *
 * 1. **Proxied (what src/queries/payment.tsx uses).** Constructed without options, so the
 *    library keeps its `DEFAULT_PROXY` and both hops go to that host:
 *    `GET ${DEFAULT_PROXY}/lightning-address-details?ln=<lud16>` for the pay params, then
 *    `GET ${DEFAULT_PROXY}/generate-invoice?ln=<lud16>&amount=<msat>` for the invoice.
 *    It does **not** request `https://<lud16-domain>/.well-known/lnurlp/<username>` on this
 *    path — intercepting only `.well-known/lnurlp/` would leave the real request to escape
 *    the mock (review 5317252389, Blocking 1).
 * 2. **Un-proxied.** `LightningAddress.lnurlpUrl()` (`https://<domain>/.well-known/lnurlp/
 *    <username>`) and the `callback` URL it advertises, for consumers that fetch the
 *    discovery document directly (e.g. NDK's zapper).
 *
 * No `nostr` block is served, so `nostrPubkey` stays undefined and the app takes its plain
 * `requestInvoice()` path rather than the zap branch — keeping the mocked flow on one
 * deterministic route pair.
 */
export async function setupLnurlMock(page: Page, options?: LnurlMockOptions): Promise<void> {
	const domain = options?.domain ?? DEFAULT_DOMAIN
	const username = options?.username ?? DEFAULT_USERNAME
	const bolt11 = options?.bolt11 ?? FAKE_BOLT11
	const minSendable = options?.minSendable ?? 1_000
	const maxSendable = options?.maxSendable ?? 100_000_000_000
	const allowsNostr = options?.allowsNostr ?? true
	const callbackUrl = `https://${domain}/lnurlp/${username}/callback`
	const context = page.context()
	const routes = lnurlMockRoutePatterns(domain, username)

	/** LNURL-pay metadata, in the flat shape a `.well-known/lnurlp/` endpoint returns. */
	const lnurlpMetadata = {
		callback: callbackUrl,
		minSendable,
		maxSendable,
		metadata: JSON.stringify([['text/plain', `Payment to ${username}`]]),
		tag: 'payRequest',
		allowsNostr,
		nostrPubkey: '0'.repeat(64),
	}

	// 1. Proxy: LNURL-pay details. Served as `{ lnurlp }`, the envelope
	//    `fetchWithProxy()` parses via `parseLnUrlPayResponse(json.lnurlp)`.
	await context.route(routes.proxyDetails, (route) => {
		if (options?.failMetadata) {
			route.fulfill({
				status: 503,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'ERROR',
					reason: 'Mocked LNURL metadata failure for testing',
				}),
			})
			return
		}

		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ lnurlp: lnurlpMetadata }),
		})
	})

	// 2. Proxy: invoice generation. Served as `{ invoice: { pr } }`, the envelope
	//    `generateInvoice()`'s proxy branch reads (`json.invoice` → `data.pr`).
	await context.route(routes.proxyInvoice, (route) => {
		if (options?.failCallback) {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'ERROR',
					reason: 'Mocked failure for testing',
				}),
			})
			return
		}

		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ invoice: { pr: bolt11, routes: [] } }),
		})
	})

	// 3. Un-proxied LNURL-pay discovery
	await context.route(routes.discovery, (route) => {
		if (options?.failMetadata) {
			route.fulfill({
				status: 503,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'ERROR',
					reason: 'Mocked LNURL metadata failure for testing',
				}),
			})
			return
		}

		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(lnurlpMetadata),
		})
	})

	// 4. Un-proxied invoice generation callback
	await context.route(routes.callback, (route) => {
		if (options?.failCallback) {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'ERROR',
					reason: 'Mocked failure for testing',
				}),
			})
			return
		}

		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				pr: bolt11,
				routes: [],
			}),
		})
	})
}
