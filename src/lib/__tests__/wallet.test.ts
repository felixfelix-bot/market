/**
 * NWC wallet store at-rest encryption tests (ADR-017).
 *
 * Verifies that the NWC wallets array (which embeds NWC URIs with spending
 * secrets) is sealed into a vault envelope before persisting to localStorage,
 * that a legacy plaintext wallets array is migrated on load (re-encrypted and
 * the plaintext copy removed), and that no plaintext NWC URI ever reaches
 * localStorage.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { walletActions, NWC_WALLETS_KEY, type Wallet } from '@/lib/stores/wallet'
import { unlock, lock, isEnvelope } from '@/lib/crypto/vault'

// Fast KDF for tests; the >= 600k default is asserted in vault.test.ts.
const TEST_ITERATIONS = 1_000

const NWC_URI = 'nostr+walletconnect://pubkey123?relay=wss%3A%2F%2Frelay.example.com&secret=spending-secret-abc'

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

// saveWalletsToLocalStorage is fire-and-forget (void setSecret), so tests must
// wait for the async seal to land before asserting on storage. Poll until the
// envelope appears (PBKDF2 at TEST_ITERATIONS takes ~1s).
async function waitForStoredKey(key: string, timeoutMs = 5000): Promise<string | null> {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const value = localStorage.getItem(key)
		if (value) return value
		await new Promise((resolve) => setTimeout(resolve, 25))
	}
	return localStorage.getItem(key)
}

function sampleWallet(overrides: Partial<Wallet> = {}): Wallet {
	return {
		id: 'wallet-1',
		name: 'My Wallet',
		nwcUri: NWC_URI,
		pubkey: 'pubkey123',
		relays: ['wss://relay.example.com'],
		storedOnNostr: false,
		createdAt: 1_700_000_000_000,
		updatedAt: 1_700_000_000_000,
		...overrides,
	}
}

describe('NWC wallet store at-rest encryption', () => {
	test('saveWalletsToLocalStorage persists only a vault envelope, never the plaintext URI', async () => {
		await unlock('passphrase', TEST_ITERATIONS)

		walletActions.saveWalletsToLocalStorage([sampleWallet()])
		const stored = await waitForStoredKey(NWC_WALLETS_KEY)
		expect(stored).toBeTruthy()
		// localStorage must hold an envelope, never the plaintext NWC URI.
		expect(isEnvelope(stored)).toBe(true)
		expect(stored).not.toContain('spending-secret-abc')
		expect(stored).not.toContain('nostr+walletconnect')
	})

	test('loadWalletsFromLocalStorage opens the envelope and returns the wallets', async () => {
		await unlock('passphrase', TEST_ITERATIONS)

		walletActions.saveWalletsToLocalStorage([sampleWallet()])
		await waitForStoredKey(NWC_WALLETS_KEY)

		const wallets = await walletActions.loadWalletsFromLocalStorage()
		expect(wallets).toHaveLength(1)
		expect(wallets[0].nwcUri).toBe(NWC_URI)
		expect(wallets[0].pubkey).toBe('pubkey123')
	})

	test('a legacy plaintext wallets array is migrated and the plaintext copy removed', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		// Seed a legacy plaintext wallets array.
		localStorage.setItem(NWC_WALLETS_KEY, JSON.stringify([sampleWallet()]))

		const wallets = await walletActions.loadWalletsFromLocalStorage()

		// The plaintext copy is gone; an envelope remains.
		const stored = localStorage.getItem(NWC_WALLETS_KEY)
		expect(stored).not.toContain('spending-secret-abc')
		expect(stored).not.toContain('nostr+walletconnect')
		expect(isEnvelope(stored)).toBe(true)

		// The migrated wallets open to the original plaintext URI.
		expect(wallets).toHaveLength(1)
		expect(wallets[0].nwcUri).toBe(NWC_URI)
	})

	test('no plaintext NWC URI ever reaches localStorage', async () => {
		await unlock('passphrase', TEST_ITERATIONS)

		walletActions.saveWalletsToLocalStorage([sampleWallet()])
		await waitForStoredKey(NWC_WALLETS_KEY)

		// The nwc_wallets key must hold an envelope, never plaintext.
		const stored = localStorage.getItem(NWC_WALLETS_KEY)
		expect(isEnvelope(stored)).toBe(true)
		expect(stored).not.toContain('spending-secret-abc')
	})
})
