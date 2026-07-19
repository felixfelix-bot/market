import { CashuMint, getDecodedToken, getEncodedToken, type MintKeyset, type Proof } from '@cashu/cashu-ts'

/**
 * E-cash token keyset-ID resolution utilities.
 *
 * Background — Cashu keyset IDs are versioned (NUT-02):
 *  • v1 / legacy  → first byte 0x00, a full hex hash stored verbatim in proofs.
 *  • v2 "short"   → first byte 0x01, a *truncated* prefix of the full keyset ID.
 *
 * The @cashu/cashu-ts library's `getDecodedToken(token)` — when called WITHOUT a
 * second `keysets` argument — throws:
 *
 *     "A short keyset ID v2 was encountered, but got no keysets to map it to."
 *
 * Unfortunately both `coco-cashu-core` (`WalletApi.receive`) and
 * `@nostr-dev-kit/wallet` (`NDKCashuWallet.receiveToken`) call
 * `getDecodedToken(token)` with no keysets, so any token whose proofs carry a
 * short v2 keyset ID cannot be received/refunded/reclaimed.  This is issue #1044.
 *
 * `normalizeEcashToken()` works around this by fetching the mint's keysets and
 * re-encoding the token with fully-resolved keyset IDs BEFORE handing it to the
 * wallet layer.  Tokens that are already fine pass through unchanged.
 */

const CASHU_PREFIXES = ['web+cashu://', 'cashu://', 'cashu:', 'cashu'] as const

/** Error string thrown by cashu-ts when a short v2 keyset ID can't be mapped. */
export const SHORT_KEYSET_V2_ERROR = 'A short keyset ID v2 was encountered, but got no keysets to map it to'

/**
 * Returns true when the given (hex) keyset ID is a *short* v2 keyset ID.
 *
 * Short v2 IDs start with version byte `0x01` (i.e. the hex string begins with
 * "01"). Full v1 IDs start with `0x00` (hex "00"). Any proof whose id begins
 * with "01" therefore needs to be resolved against the mint's keysets before it
 * can be used by wallet code that does not pass keysets to getDecodedToken().
 */
export function isShortKeysetIdV2(id: string): boolean {
	if (!id || id.length < 2) return false
	// Only hex ids are version-tagged; base64 ids are left untouched by cashu-ts.
	if (!/^[0-9a-fA-F]+$/.test(id)) return false
	return id.slice(0, 2).toLowerCase() === '01'
}

/** Returns true if any proof in the list carries a short v2 keyset ID. */
export function hasShortKeysetIdV2(proofs: Proof[]): boolean {
	return proofs.some((p) => isShortKeysetIdV2(p.id))
}

/** Strip any Cashu URI scheme prefix, returning the bare `A…` / `B…` payload. */
function stripCashuPrefix(token: string): string {
	for (const prefix of CASHU_PREFIXES) {
		if (token.startsWith(prefix)) return token.slice(prefix.length)
	}
	return token
}

/**
 * Base64-decode to a UTF-8 string, tolerating both standard and URL-safe
 * alphabets as well as missing padding (cashu-ts emits URL-safe base64).
 */
function base64DecodeToString(b64: string): string {
	let s = b64.replace(/-/g, '+').replace(/_/g, '/')
	// Re-add padding so atob() doesn't choke.
	while (s.length % 4 !== 0) s += '='
	// `atob` is available in browsers, Bun, and Node ≥ 16.
	return atob(s)
}

/** Extract the raw bytes of a (prefix-stripped) token payload. */
function base64DecodeToBytes(b64: string): Uint8Array {
	const bin = base64DecodeToString(b64)
	const bytes = new Uint8Array(bin.length)
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
	return bytes
}

export interface TokenMintProofs {
	mint: string
	proofs: Proof[]
}

/**
 * Extract the mint URL and raw proofs from a Cashu token WITHOUT performing
 * keyset-ID mapping — i.e. without triggering the short-v2-keyset error.
 *
 * This replicates the structural decode that `getDecodedToken` does internally
 * (its `decodeToken()` step) but deliberately skips the `mapShortKeysetIds()`
 * step that throws.
 *
 * Supports:
 *  • Version "A" (v3 JSON) tokens — exact structural decode.
 *  • Version "B" (v4 binary/CBOR) tokens — the mint URL is recovered by scanning
 *    the decoded bytes for the embedded `http(s)://…` string (the mint URL is
 *    always present as a UTF-8 text string in the CBOR payload). Proofs are not
 *    individually parsed in this fallback path; callers that need them should
 *    re-decode with keysets via `getDecodedToken(token, keysets)`.
 */
export function extractMintFromToken(token: string): string {
	const bare = stripCashuPrefix(token)
	const version = bare.slice(0, 1)
	const payload = bare.slice(1)

	if (version === 'A') {
		try {
			const parsed = JSON.parse(base64DecodeToString(payload))
			// cashu-ts v3 JSON shape: { token: [{ mint, proofs }], unit, memo }
			const entry = parsed?.token?.[0] ?? parsed
			const mint: unknown = entry?.mint
			if (typeof mint === 'string' && /^https?:\/\//.test(mint)) return mint
		} catch {
			// fall through to byte scan
		}
	}

	// Fallback for version "B" (binary) tokens and any JSON we failed to parse:
	// scan the raw payload bytes for an http(s) URL. The mint URL is always
	// embedded as a UTF-8 string, so this reliably recovers it.
	const raw = version === 'B' ? base64DecodeToBytes(payload) : new TextEncoder().encode(base64DecodeToString(payload))
	const text = new TextDecoder().decode(raw)
	const match = text.match(/https?:\/\/[^\s"'<>{}\\^`|\x00-\x1f]+/i)
	if (match) return match[0].replace(/[/]+$/, '') // trim trailing slashes

	throw new Error('Could not extract mint URL from Cashu token')
}

/**
 * Returns true when `getDecodedToken(token)` would throw the short-keyset-v2
 * error (or the related "couldn't map" error) because the token carries short
 * v2 keyset IDs that cannot be resolved without mint keysets.
 */
export function tokenNeedsKeysetResolution(token: string): boolean {
	try {
		getDecodedToken(token)
		return false
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e)
		return msg.includes('short keyset ID v2') || msg.includes("Couldn't map short keyset ID")
	}
}

/**
 * Fetch the keysets advertised by a mint.
 *
 * Uses `getKeySets` (the lightweight `/v1/keysets` metadata endpoint) rather
 * than `getKeys` (the heavier `/v1/keys` endpoint) because keyset-ID mapping
 * only needs the `id` field of each keyset.
 */
async function fetchMintKeysets(mintUrl: string): Promise<MintKeyset[]> {
	const resp = await CashuMint.getKeySets(mintUrl)
	return resp.keysets ?? []
}

/**
 * Normalize an e-cash token so that every proof carries a fully-resolved
 * keyset ID, allowing it to be decoded by code that does not pass keysets to
 * `getDecodedToken()` (the root cause of issue #1044).
 *
 * Behaviour:
 *  • If the token already decodes cleanly → returned unchanged (fast path).
 *  • If it carries short v2 keyset IDs → the mint's keysets are fetched and
 *    `getDecodedToken(token, keysets)` is used to map them, then the token is
 *    re-encoded. The returned token has full keyset IDs and will decode
 *    anywhere.
 *
 * @param token  A Cashu token string (`cashuA…` / `cashuB…`, with or without
 *               a `web+cashu://` scheme prefix).
 * @returns      A token string with fully-resolved keyset IDs.
 * @throws       If the token is malformed, the mint cannot be reached, or no
 *               known keyset matches a short v2 ID.
 */
export async function normalizeEcashToken(token: string): Promise<string> {
	if (typeof token !== 'string' || token.length === 0) {
		throw new Error('normalizeEcashToken: token must be a non-empty string')
	}

	// Fast path: token decodes without issue — nothing to do.
	if (!tokenNeedsKeysetResolution(token)) return token

	// We need the mint URL to fetch keysets, but we can't use getDecodedToken()
	// (it throws). Extract the mint structurally instead.
	const mintUrl = extractMintFromToken(token)

	let keysets: MintKeyset[]
	try {
		keysets = await fetchMintKeysets(mintUrl)
	} catch (e) {
		throw new Error(
			`normalizeEcashToken: failed to fetch keysets from mint ${mintUrl} — ${(e instanceof Error ? e.message : String(e))}`,
		)
	}

	if (keysets.length === 0) {
		throw new Error(`normalizeEcashToken: mint ${mintUrl} returned no keysets`)
	}

	// Re-decode WITH keysets so short v2 IDs are mapped to full IDs.
	let decoded
	try {
		decoded = getDecodedToken(token, keysets)
	} catch (e) {
		throw new Error(
			`normalizeEcashToken: could not map short keyset IDs against mint ${mintUrl} — ${(e instanceof Error ? e.message : String(e))}`,
		)
	}

	// Re-encode: proofs now carry full keyset IDs, so this token decodes cleanly
	// anywhere, including in coco-cashu-core and @nostr-dev-kit/wallet.
	return getEncodedToken(decoded)
}
