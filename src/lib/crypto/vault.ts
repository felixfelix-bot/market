/**
 * Shared at-rest encryption vault for wallet secrets (ADR-017).
 *
 * Encrypts wallet secrets (Cashu seed, NWC URI spending secret, NIP-46
 * signer key) so localStorage only ever holds ciphertext envelopes. The key
 * is derived from a passphrase the user supplies at unlock time; the
 * passphrase and derived key live only in memory for the session.
 *
 * Scheme: PBKDF2-SHA256 (>= 600k iterations, OWASP 2023) stretches the
 * passphrase into a 256-bit AES-GCM key. Each sealed value gets a fresh
 * random IV; the salt used to derive the session key is recorded in every
 * envelope so it is self-describing. AES-GCM's auth tag rejects wrong
 * passphrases and tampered ciphertext.
 *
 * No new dependencies — everything is browser-native `crypto.subtle`.
 */
import { PBKDF2_ITERATIONS, MIN_PBKDF2_ITERATIONS } from './constants'

/** localStorage key holding the JSON vault envelope. */
export const VAULT_STORAGE_KEY = 'nostr_session_v1'

const SALT_BYTES = 16
const IV_BYTES = 12
const KEY_BITS = 256

/** Serialized AES-GCM envelope. `v` allows future envelope evolution. */
export interface VaultEnvelope {
	v: 1
	alg: 'AES-256-GCM'
	kdf: 'PBKDF2-SHA256'
	iterations: number
	/** Salt used to derive the session key, base64. */
	salt: string
	/** Random AES-GCM nonce, base64. */
	iv: string
	/** Ciphertext, base64. */
	ct: string
}

/** Options overriding KDF cost — tests use a low iteration count. */
export interface SealOptions {
	iterations?: number
}

/** Options for {@link open}. `minIterations` lowers the tamper floor. */
export interface OpenOptions {
	minIterations?: number
}

/** Error type for every fail-closed vault path (never a raw DOMException). */
export class VaultError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options)
		this.name = 'VaultError'
	}
}

function toBase64(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
	const binary = atob(value)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

function randomBytes(length: number): Uint8Array {
	const bytes = new Uint8Array(length)
	crypto.getRandomValues(bytes)
	return bytes
}

/**
 * Derive a 256-bit AES-GCM key from a passphrase and salt via
 * PBKDF2-SHA256. The returned CryptoKey is non-extractable and usable only
 * for encrypt/decrypt.
 */
export async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number = PBKDF2_ITERATIONS): Promise<CryptoKey> {
	if (!Number.isInteger(iterations) || iterations < 1) {
		throw new VaultError('Invalid PBKDF2 iteration count')
	}
	const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations },
		material,
		{ name: 'AES-GCM', length: KEY_BITS },
		false,
		['encrypt', 'decrypt'],
	)
}

/**
 * Seal a plaintext string into a base64 envelope. A fresh random IV is used
 * per call; the salt used to derive `key` is recorded in the envelope so it
 * is self-describing. Nothing plaintext is persisted.
 */
export async function seal(plaintext: string, key: CryptoKey, salt: Uint8Array, options: SealOptions = {}): Promise<VaultEnvelope> {
	const iterations = options.iterations ?? PBKDF2_ITERATIONS
	const iv = randomBytes(IV_BYTES)
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: iv as unknown as BufferSource },
		key,
		new TextEncoder().encode(plaintext),
	)
	return {
		v: 1,
		alg: 'AES-256-GCM',
		kdf: 'PBKDF2-SHA256',
		iterations,
		salt: toBase64(salt),
		iv: toBase64(iv),
		ct: toBase64(new Uint8Array(ciphertext)),
	}
}

function validateEnvelope(parsed: VaultEnvelope, options: OpenOptions = {}): void {
	if (parsed?.v !== 1 || parsed?.alg !== 'AES-256-GCM' || parsed?.kdf !== 'PBKDF2-SHA256' || !parsed?.salt || !parsed?.iv || !parsed?.ct) {
		throw new VaultError('Vault envelope has an unsupported shape')
	}
	// Iteration-downgrade tamper check: `iterations` is attacker-writable
	// localStorage, so reject anything below the floor BEFORE deriving.
	const minIterations = options.minIterations ?? MIN_PBKDF2_ITERATIONS
	if (!Number.isInteger(parsed.iterations) || parsed.iterations < minIterations) {
		throw new VaultError('Vault envelope iteration count is below the accepted minimum (possible tampering)')
	}
}

/**
 * Open a vault envelope back to plaintext. Fails closed (`VaultError`) on a
 * wrong passphrase (AES-GCM auth tag), tampered ciphertext, a downgraded
 * iteration count, or a corrupt/absent envelope.
 */
export async function open(envelope: VaultEnvelope | string, key: CryptoKey, options: OpenOptions = {}): Promise<string> {
	let parsed: VaultEnvelope
	if (typeof envelope === 'string') {
		try {
			parsed = JSON.parse(envelope) as VaultEnvelope
		} catch (cause) {
			throw new VaultError('Vault envelope is corrupt', { cause })
		}
	} else {
		parsed = envelope
	}
	validateEnvelope(parsed, options)
	try {
		const plaintext = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: fromBase64(parsed.iv) as unknown as BufferSource },
			key,
			fromBase64(parsed.ct) as unknown as BufferSource,
		)
		return new TextDecoder().decode(plaintext)
	} catch (cause) {
		// Wrong passphrase and tampered ciphertext both surface here (GCM auth
		// tag) — fail closed without leaking which check failed.
		throw new VaultError('Failed to open the vault (wrong passphrase or corrupted vault)', { cause })
	}
}

/**
 * True if the value stored under `keyName` is a vault envelope (not a
 * legacy plaintext value).
 */
export function isEnvelope(value: string | null | undefined): boolean {
	if (!value) return false
	try {
		const parsed = JSON.parse(value) as VaultEnvelope
		return parsed?.v === 1 && parsed?.alg === 'AES-256-GCM' && parsed?.kdf === 'PBKDF2-SHA256' && !!parsed?.ct
	} catch {
		return false
	}
}

// ---------------------------------------------------------------------------
// In-memory unlocked-session-key flow
// ---------------------------------------------------------------------------

let sessionKey: CryptoKey | null = null
let sessionSalt: Uint8Array | null = null

/** True when a session key is currently held in memory. */
export function isUnlocked(): boolean {
	return sessionKey !== null
}

/**
 * Unlock the vault: derive the session key from the passphrase and a fresh
 * random salt, and hold it in memory. Re-prompt on lock/refresh.
 */
export async function unlock(passphrase: string, iterations: number = PBKDF2_ITERATIONS): Promise<void> {
	const salt = randomBytes(SALT_BYTES)
	sessionKey = await deriveKey(passphrase, salt, iterations)
	sessionSalt = salt
}

/** Clear the in-memory session key. Subsequent getSecret/setSecret fail. */
export function lock(): void {
	sessionKey = null
	sessionSalt = null
}

function requireSessionKey(): { key: CryptoKey; salt: Uint8Array } {
	if (!sessionKey || !sessionSalt) {
		throw new VaultError('Vault is locked — unlock with a passphrase first')
	}
	return { key: sessionKey, salt: sessionSalt }
}

/**
 * Seal `plaintext` with the unlocked session key and persist the envelope
 * under `keyName`. Only ever writes an envelope to localStorage.
 */
export async function setSecret(keyName: string, plaintext: string): Promise<void> {
	const { key, salt } = requireSessionKey()
	const envelope = await seal(plaintext, key, salt)
	localStorage.setItem(keyName, JSON.stringify(envelope))
}

/**
 * Read the envelope under `keyName` and open it with the unlocked session
 * key. Returns null when the key is absent.
 */
export async function getSecret(keyName: string): Promise<string | null> {
	const { key } = requireSessionKey()
	const raw = localStorage.getItem(keyName)
	if (!raw) return null
	return open(raw, key)
}

/** Remove a secret (and its envelope) from localStorage. */
export function removeSecret(keyName: string): void {
	localStorage.removeItem(keyName)
}

/**
 * Migrate a legacy plaintext value under `keyName` to a vault envelope.
 * Detects whether the stored value is already an envelope; if it is
 * plaintext, re-encrypts it under the unlocked session key and removes the
 * plaintext copy. Returns true if a migration happened, false if the key was
 * absent or already an envelope.
 */
export async function migrateLegacy(keyName: string): Promise<boolean> {
	const raw = localStorage.getItem(keyName)
	if (!raw) return false
	if (isEnvelope(raw)) return false
	// Plaintext value — re-encrypt it. setSecret overwrites the same key with
	// the envelope, so the plaintext copy is gone once it returns.
	await setSecret(keyName, raw)
	return true
}

// ---------------------------------------------------------------------------
// Wallet-secret key registry + logout wipe
// ---------------------------------------------------------------------------

/**
 * Registry of wallet-secret localStorage keys and key prefixes. Stores
 * register the keys they own so `wipeWalletSecrets()` can remove every wallet
 * secret from localStorage in one place (ADR-017). Exact keys cover
 * single-entry secrets (e.g. the NWC wallets array, the NIP-46 signer key);
 * prefixes cover enumerated keys (e.g. `cashu_wallet_seed_<pubkey>`).
 */
const walletSecretKeys = new Set<string>()
const walletSecretPrefixes = new Set<string>()

/** Register an exact localStorage key as a wallet secret to wipe on logout. */
export function registerWalletSecretKey(keyName: string): void {
	walletSecretKeys.add(keyName)
}

/** Register a localStorage key prefix; every key starting with it is wiped. */
export function registerWalletSecretPrefix(prefix: string): void {
	walletSecretPrefixes.add(prefix)
}

/**
 * Remove every registered wallet secret from localStorage: exact keys,
 * prefix-enumerated keys (e.g. all `cashu_wallet_seed_<pubkey>` entries), and
 * the vault envelope/session material. Also locks the in-memory session key so
 * a subsequent getSecret/setSecret fails closed. Idempotent.
 */
export function wipeWalletSecrets(): void {
	for (const key of walletSecretKeys) {
		localStorage.removeItem(key)
	}
	for (const prefix of walletSecretPrefixes) {
		const keysToRemove: string[] = []
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key && key.startsWith(prefix)) keysToRemove.push(key)
		}
		for (const key of keysToRemove) {
			localStorage.removeItem(key)
		}
	}
	// Vault envelope/session material.
	localStorage.removeItem(VAULT_STORAGE_KEY)
	lock()
}
