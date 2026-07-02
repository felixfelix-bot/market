import { HDKey } from '@scure/bip32'
import { getP2PKRefundPubkeys } from './utils/cashu'

const P2PK_XONLY_HEX_LENGTH = 64
const P2PK_COMPRESSED_HEX_LENGTH = 66

type CashuP2pkSecretPayload = {
	data?: unknown
}

const toHex = (bytes: Uint8Array): string =>
	Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')

export const normalizeAuctionDerivationPath = (path: string): string => {
	const trimmed = path.trim()
	if (!trimmed) {
		throw new Error('Missing derivation path')
	}
	return trimmed.startsWith('m/') || trimmed === 'm' ? trimmed : `m/${trimmed.replace(/^\/+/, '')}`
}

export const normalizeAuctionP2pkPubkey = (pubkey: string): string => {
	const trimmed = pubkey.trim().toLowerCase()
	if (!trimmed) {
		throw new Error('Missing P2PK pubkey')
	}
	if (!/^[0-9a-f]+$/.test(trimmed)) {
		throw new Error('P2PK pubkey must be hex encoded')
	}
	if (trimmed.length === P2PK_XONLY_HEX_LENGTH) {
		return trimmed
	}
	if (trimmed.length === P2PK_COMPRESSED_HEX_LENGTH && (trimmed.startsWith('02') || trimmed.startsWith('03'))) {
		return trimmed.slice(2)
	}
	throw new Error('P2PK pubkey must be x-only or compressed secp256k1 hex')
}

export const validateAuctionP2pkPubkey = (pubkey: string): string => {
	const trimmed = pubkey.trim().toLowerCase()
	normalizeAuctionP2pkPubkey(trimmed)
	return trimmed
}

export const toCompressedAuctionP2pkPubkey = (pubkey: string): string => {
	const trimmed = pubkey.trim().toLowerCase()
	if (!trimmed) {
		throw new Error('Missing P2PK pubkey')
	}
	if (!/^[0-9a-f]+$/.test(trimmed)) {
		throw new Error('P2PK pubkey must be hex encoded')
	}
	if (trimmed.length === P2PK_COMPRESSED_HEX_LENGTH && (trimmed.startsWith('02') || trimmed.startsWith('03'))) {
		return trimmed
	}
	if (trimmed.length === P2PK_XONLY_HEX_LENGTH) {
		throw new Error('Cashu P2PK pubkey must be compressed secp256k1 (66 hex chars with 02/03 prefix); received x-only form')
	}
	throw new Error('P2PK pubkey must be compressed secp256k1 hex (66 chars, 02/03 prefix)')
}

export const auctionP2pkPubkeysMatch = (left: string, right: string): boolean =>
	normalizeAuctionP2pkPubkey(left) === normalizeAuctionP2pkPubkey(right)

export const getAuctionP2pkLockPubkeyFromSecret = (secret: string): string => {
	let parsed: unknown
	try {
		parsed = JSON.parse(secret)
	} catch {
		throw new Error('Cashu proof secret is not a valid P2PK secret')
	}

	if (!Array.isArray(parsed) || parsed[0] !== 'P2PK' || typeof parsed[1] !== 'object' || parsed[1] === null) {
		throw new Error('Cashu proof secret is not a valid P2PK secret')
	}

	const payload = parsed[1] as CashuP2pkSecretPayload
	if (typeof payload.data !== 'string' || !payload.data.trim()) {
		throw new Error('Cashu P2PK proof secret is missing a lock pubkey')
	}

	return payload.data
}

export const deriveAuctionChildP2pkPubkeyFromXpub = (xpub: string, path: string): string => {
	const hdRoot = HDKey.fromExtendedKey(xpub.trim())
	const child = hdRoot.derive(normalizeAuctionDerivationPath(path))
	if (!child.publicKey) {
		throw new Error('Failed to derive child pubkey from p2pk_xpub')
	}

	return validateAuctionP2pkPubkey(toHex(child.publicKey))
}

export interface AuctionPathGrantVerificationInput {
	xpub: string
	derivationPath: string
	childPubkey: string
	expectedXpub: string
	expectedIssuer: string
	grantIssuer: string
}

/**
 * Verifies that a path-oracle grant's (derivationPath, childPubkey) pair actually
 * derives from the auction's p2pk_xpub, and that the grant came from the expected
 * issuer. Throws on any mismatch so the caller MUST NOT lock funds when this
 * raises. See AUCTIONS.md §5.6.
 */
export const verifyAuctionPathGrant = (input: AuctionPathGrantVerificationInput): void => {
	const grantIssuer = input.grantIssuer.trim().toLowerCase()
	const expectedIssuer = input.expectedIssuer.trim().toLowerCase()
	if (!grantIssuer || grantIssuer !== expectedIssuer) {
		throw new Error('Path grant issuer does not match the auction path_issuer')
	}

	const grantXpub = input.xpub.trim()
	const expectedXpub = input.expectedXpub.trim()
	if (!grantXpub || grantXpub !== expectedXpub) {
		throw new Error('Path grant xpub does not match the auction p2pk_xpub')
	}

	const derived = deriveAuctionChildP2pkPubkeyFromXpub(grantXpub, input.derivationPath)
	if (!auctionP2pkPubkeysMatch(derived, input.childPubkey)) {
		throw new Error('Path grant child_pubkey does not match xpub + derivation path derivation')
	}
}

/**
 * Minimal structural shape of a Cashu proof this module needs: just the
 * encoded NUT-11 P2PK `secret` string. Keeping it structural lets us collect
 * from a decoded bid token's proofs without a hard dependency on the full
 * `Proof` type.
 */
export interface ProofLike {
	secret: string
}

/**
 * Collect and normalize every NUT-11 `refund` (refundKeys) pubkey embedded in a
 * decoded bid token's proofs, deduped to canonical x-only form.
 *
 * Used by the refund/reclaim path as a fallback when the cached
 * `auctionContext.refundPubkey` is stale or missing (issue #6): the proof
 * secret is the source of truth — `lockAuctionBidProofs` encodes a `refund`
 * tag into every bid proof, so a bidder's wallet can still recover the refund
 * key the bid was actually locked with. Proofs whose secret isn't a P2PK
 * secret, and refund values that aren't valid pubkeys, are skipped.
 */
export const collectAuctionP2pkRefundPubkeys = (proofs: ReadonlyArray<ProofLike>): string[] => {
	const seen = new Set<string>()
	for (const proof of proofs) {
		let candidates: string[]
		try {
			candidates = getP2PKRefundPubkeys(proof.secret)
		} catch {
			// Proof isn't a P2PK secret — it can't contribute a refund pubkey.
			continue
		}
		for (const candidate of candidates) {
			try {
				seen.add(normalizeAuctionP2pkPubkey(candidate))
			} catch {
				// Invalid pubkey value — skip.
			}
		}
	}
	return Array.from(seen)
}
