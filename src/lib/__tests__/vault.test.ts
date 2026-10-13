/**
 * Shared vault unit tests (ADR-017).
 *
 * The vault seals wallet secrets (Cashu seed, NWC URI, NIP-46 signer key)
 * into WebCrypto PBKDF2 + AES-GCM-256 envelopes so localStorage only ever
 * holds ciphertext. Tests cover round-trip, wrong-passphrase failure via the
 * GCM auth tag, tampered-ciphertext failure, and legacy plaintext migration.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
	VaultError,
	deriveKey,
	seal,
	open,
	isEnvelope,
	unlock,
	lock,
	isUnlocked,
	setSecret,
	getSecret,
	removeSecret,
	migrateLegacy,
} from '@/lib/crypto/vault'
import { PBKDF2_ITERATIONS, MIN_PBKDF2_ITERATIONS } from '@/lib/crypto/constants'

// Fast KDF for round-trip tests; the >= 600k default is asserted separately.
const TEST_ITERATIONS = 1_000

const realLocalStorage = globalThis.localStorage
const memoryStorage = new Map<string, string>()

beforeEach(() => {
	memoryStorage.clear()
	globalThis.localStorage = {
		getItem: (key: string) => memoryStorage.get(key) ?? null,
		setItem: (key: string, value: string) => {
			memoryStorage.set(key, value)
		},
		removeItem: (key: string) => {
			memoryStorage.delete(key)
		},
		clear: () => {
			memoryStorage.clear()
		},
	} as unknown as Storage
})

afterEach(() => {
	globalThis.localStorage = realLocalStorage
	lock()
})

describe('vault seal/open', () => {
	test('round-trip: sealed plaintext opens to the identical string', async () => {
		const salt = new Uint8Array(16)
		crypto.getRandomValues(salt)
		const key = await deriveKey('correct horse battery staple', salt, TEST_ITERATIONS)
		const plaintext = 'cashu_wallet_seed_hex_0123456789abcdef'

		const envelope = await seal(plaintext, key, salt, { iterations: TEST_ITERATIONS })

		expect(envelope.v).toBe(1)
		expect(envelope.alg).toBe('AES-256-GCM')
		expect(envelope.kdf).toBe('PBKDF2-SHA256')
		expect(envelope.iterations).toBe(TEST_ITERATIONS)
		expect(envelope.salt).toBeTruthy()
		expect(envelope.iv).toBeTruthy()
		expect(envelope.ct).toBeTruthy()
		// Ciphertext must not contain the plaintext.
		expect(envelope.ct).not.toContain(plaintext)

		const opened = await open(envelope, key, { minIterations: TEST_ITERATIONS })
		expect(opened).toBe(plaintext)
	})

	test('wrong passphrase fails via the GCM auth tag', async () => {
		const salt = new Uint8Array(16)
		crypto.getRandomValues(salt)
		const key = await deriveKey('right-pass', salt, TEST_ITERATIONS)
		const envelope = await seal('secret-value', key, salt, { iterations: TEST_ITERATIONS })

		const wrongKey = await deriveKey('wrong-pass', salt, TEST_ITERATIONS)
		await expect(open(envelope, wrongKey, { minIterations: TEST_ITERATIONS })).rejects.toThrow(VaultError)
	})

	test('tampered ciphertext fails', async () => {
		const salt = new Uint8Array(16)
		crypto.getRandomValues(salt)
		const key = await deriveKey('passphrase', salt, TEST_ITERATIONS)
		const envelope = await seal('secret-value', key, salt, { iterations: TEST_ITERATIONS })

		// Flip a byte in the ciphertext.
		const ct = fromBase64ForTest(envelope.ct)
		ct[0] ^= 0xff
		const tampered = { ...envelope, ct: toBase64ForTest(ct) }

		await expect(open(tampered, key, { minIterations: TEST_ITERATIONS })).rejects.toThrow(VaultError)
	})

	test('iteration-downgrade tampering is rejected before derivation', async () => {
		const salt = new Uint8Array(16)
		crypto.getRandomValues(salt)
		const key = await deriveKey('passphrase', salt, TEST_ITERATIONS)
		const envelope = await seal('secret-value', key, salt, { iterations: TEST_ITERATIONS })

		// Attacker lowers iterations to 1.
		const tampered = { ...envelope, iterations: 1 }

		await expect(open(tampered, key, { minIterations: TEST_ITERATIONS })).rejects.toThrow(VaultError)
	})

	test('default PBKDF2 iteration count meets the >= 600k floor', () => {
		expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000)
		expect(MIN_PBKDF2_ITERATIONS).toBeLessThanOrEqual(PBKDF2_ITERATIONS)
	})

	test('isEnvelope distinguishes envelopes from plaintext', async () => {
		const salt = new Uint8Array(16)
		crypto.getRandomValues(salt)
		const key = await deriveKey('passphrase', salt, TEST_ITERATIONS)
		const envelope = await seal('secret', key, salt, { iterations: TEST_ITERATIONS })

		expect(isEnvelope(JSON.stringify(envelope))).toBe(true)
		expect(isEnvelope('plaintext-seed-hex')).toBe(false)
		expect(isEnvelope(null)).toBe(false)
		expect(isEnvelope('')).toBe(false)
	})
})

describe('vault session-key flow', () => {
	test('unlock then setSecret/getSecret round-trips through localStorage', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		expect(isUnlocked()).toBe(true)

		await setSecret('cashu_wallet_seed_abc', 'seed-hex-1234')
		const stored = localStorage.getItem('cashu_wallet_seed_abc')
		expect(stored).toBeTruthy()
		// localStorage must hold an envelope, never the plaintext.
		expect(stored).not.toContain('seed-hex-1234')
		expect(isEnvelope(stored)).toBe(true)

		const opened = await getSecret('cashu_wallet_seed_abc')
		expect(opened).toBe('seed-hex-1234')
	})

	test('setSecret never writes plaintext to localStorage', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		await setSecret('nwc_wallets', 'nostr+walletconnect://secret-uri')

		const stored = localStorage.getItem('nwc_wallets')
		expect(stored).not.toContain('secret-uri')
		expect(stored).not.toContain('nostr+walletconnect')
		expect(isEnvelope(stored)).toBe(true)
	})

	test('getSecret returns null for an absent key', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		expect(await getSecret('missing-key')).toBeNull()
	})

	test('removeSecret deletes the envelope', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		await setSecret('some-key', 'value')
		expect(localStorage.getItem('some-key')).toBeTruthy()

		removeSecret('some-key')
		expect(localStorage.getItem('some-key')).toBeNull()
	})

	test('locked vault refuses setSecret/getSecret', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		lock()
		expect(isUnlocked()).toBe(false)

		await expect(setSecret('k', 'v')).rejects.toThrow(VaultError)
		await expect(getSecret('k')).rejects.toThrow(VaultError)
	})

	test('lock clears the in-memory key so a refresh re-prompts', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		await setSecret('k', 'v')
		lock()
		// After lock, the envelope is still there but cannot be opened.
		await expect(getSecret('k')).rejects.toThrow(VaultError)
	})
})

describe('vault legacy migration', () => {
	test('migrateLegacy re-encrypts a plaintext value and removes the plaintext copy', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		// Seed a legacy plaintext value.
		localStorage.setItem('cashu_wallet_seed_abc', 'legacy-plaintext-seed')

		const migrated = await migrateLegacy('cashu_wallet_seed_abc')
		expect(migrated).toBe(true)

		// Plaintext copy is gone; envelope remains.
		const stored = localStorage.getItem('cashu_wallet_seed_abc')
		expect(stored).not.toContain('legacy-plaintext-seed')
		expect(isEnvelope(stored)).toBe(true)

		// The migrated value opens to the original plaintext.
		expect(await getSecret('cashu_wallet_seed_abc')).toBe('legacy-plaintext-seed')
	})

	test('migrateLegacy is a no-op for an absent key', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		expect(await migrateLegacy('missing-key')).toBe(false)
	})

	test('migrateLegacy is a no-op for an already-enveloped value', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		await setSecret('already-encrypted', 'value')
		expect(await migrateLegacy('already-encrypted')).toBe(false)
	})
})

// Test-only base64 helpers (the module's are private).
function toBase64ForTest(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary)
}

function fromBase64ForTest(value: string): Uint8Array {
	const binary = atob(value)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}
