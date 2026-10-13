/**
 * Cashu wallet seed at-rest encryption tests (ADR-017).
 *
 * Verifies that the Cashu wallet seed is sealed into a vault envelope before
 * persisting to localStorage, that a legacy plaintext seed is migrated on
 * load (re-encrypted and the plaintext copy removed), and that no plaintext
 * seed ever reaches localStorage.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { getOrCreateSeed } from '@/lib/stores/cashu'
import { authStore } from '@/lib/stores/auth'
import { unlock, lock, isEnvelope } from '@/lib/crypto/vault'

// Fast KDF for tests; the >= 600k default is asserted in vault.test.ts.
const TEST_ITERATIONS = 1_000

const TEST_PUBKEY = 'a'.repeat(64)
const SEED_KEY = `cashu_wallet_seed_${TEST_PUBKEY}`

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

	// Authenticate a user so getOrCreateSeed can derive the user-scoped key.
	authStore.setState((s) => ({ ...s, user: { pubkey: TEST_PUBKEY } as never }))
})

afterEach(() => {
	globalThis.localStorage = realLocalStorage
	lock()
	authStore.setState((s) => ({ ...s, user: null }))
})

describe('cashu wallet seed at-rest encryption', () => {
	test('a newly generated seed is persisted only as a vault envelope', async () => {
		await unlock('passphrase', TEST_ITERATIONS)

		const seed = await getOrCreateSeed()
		expect(seed).toBeInstanceOf(Uint8Array)
		expect(seed.length).toBe(64)

		const stored = localStorage.getItem(SEED_KEY)
		expect(stored).toBeTruthy()
		// localStorage must hold an envelope, never the plaintext seed.
		expect(isEnvelope(stored)).toBe(true)
		// The plaintext hex must not appear anywhere in the stored value.
		const seedHex = Array.from(seed)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
		expect(stored).not.toContain(seedHex)
	})

	test('no plaintext seed ever reaches localStorage', async () => {
		await unlock('passphrase', TEST_ITERATIONS)

		await getOrCreateSeed()

		// Every cashu_wallet_seed_* key must hold an envelope, never plaintext.
		for (const [key, value] of memoryStorage.entries()) {
			if (key.startsWith('cashu_wallet_seed_')) {
				expect(isEnvelope(value)).toBe(true)
			}
		}
	})

	test('a legacy plaintext seed is migrated and the plaintext copy removed', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		// Seed a legacy plaintext value.
		const legacySeed = 'deadbeef'.repeat(16) // 64 bytes of hex
		localStorage.setItem(SEED_KEY, legacySeed)

		const seed = await getOrCreateSeed()

		// The plaintext copy is gone; an envelope remains.
		const stored = localStorage.getItem(SEED_KEY)
		expect(stored).not.toContain(legacySeed)
		expect(isEnvelope(stored)).toBe(true)

		// The migrated seed opens to the original plaintext.
		const seedHex = Array.from(seed)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
		expect(seedHex).toBe(legacySeed)
	})

	test('an existing envelope seed is reused (not regenerated)', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		const first = await getOrCreateSeed()
		const firstHex = Array.from(first)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')

		const second = await getOrCreateSeed()
		const secondHex = Array.from(second)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')

		expect(secondHex).toBe(firstHex)
	})
})
