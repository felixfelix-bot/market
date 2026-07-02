import type { Secret, SecretData } from '@cashu/crypto/modules/common'
import { parseSecret } from '@cashu/crypto/modules/common/NUT11'

interface P2PKSecretData extends SecretData {
	tags?: Array<Array<string>>
}

function isP2PKSecret(parsed: Secret): parsed is ['P2PK', P2PKSecretData] {
	return Array.isArray(parsed) && parsed[0] === 'P2PK' && parsed[1] != null
}

export function getP2PKLocktime(secret: Uint8Array | string): number {
	const parsed = parseSecret(secret instanceof Uint8Array ? new TextDecoder().decode(secret) : secret)
	if (!isP2PKSecret(parsed)) {
		throw new Error('Invalid P2PK secret: must start with "P2PK"')
	}
	const tags = parsed[1].tags
	const locktimeTag = tags?.find((t) => t[0] === 'locktime')
	return locktimeTag && locktimeTag.length > 1 ? parseInt(locktimeTag[1], 10) : Infinity
}

/**
 * Read every NUT-11 `refund` (refundKeys) pubkey embedded in a P2PK proof
 * secret. `lockAuctionBidProofs` encodes `refundKeys: [refundPubkey]` → a
 * `["refund", "<pubkey>"]` tag on every bid proof, so the refund key a bid was
 * actually locked with is always recoverable from the secret itself — the
 * source of truth, independent of any cached auction context (issue #6).
 *
 * Returns the raw pubkey strings in tag order (may be compressed or x-only
 * form); callers normalize. Returns `[]` when no refund tag is present. Throws
 * for a secret that isn't a P2PK secret, mirroring `getP2PKLocktime`.
 */
export function getP2PKRefundPubkeys(secret: Uint8Array | string): string[] {
	const parsed = parseSecret(secret instanceof Uint8Array ? new TextDecoder().decode(secret) : secret)
	if (!isP2PKSecret(parsed)) {
		throw new Error('Invalid P2PK secret: must start with "P2PK"')
	}
	const tags = parsed[1].tags
	if (!tags) return []
	const refundPubkeys: string[] = []
	for (const tag of tags) {
		if (Array.isArray(tag) && tag[0] === 'refund' && tag.length > 1 && typeof tag[1] === 'string' && tag[1].trim()) {
			refundPubkeys.push(tag[1])
		}
	}
	return refundPubkeys
}
