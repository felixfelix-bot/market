/**
 * Logout wallet-secret wipe tests (ADR-017).
 *
 * Verifies that `wipeWalletSecrets()` removes every wallet secret from
 * localStorage: the NIP-46 signer key, bunker URL, ncryptsec key, the NWC
 * wallets array, every `cashu_wallet_seed_<pubkey>` entry (multi-pubkey), and
 * the vault envelope/session material. The stores are imported so their
 * module-level key registration runs; the wipe helper then removes everything
 * in one place.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { unlock, lock, isUnlocked, setSecret, wipeWalletSecrets, VAULT_STORAGE_KEY } from '@/lib/crypto/vault'
// Import the stores so their module-level key registration runs.
import { NOSTR_LOCAL_SIGNER_KEY, NOSTR_CONNECT_KEY, NOSTR_LOCAL_ENCRYPTED_SIGNER_KEY } from '@/lib/stores/auth'
import { NWC_WALLETS_KEY } from '@/lib/stores/wallet'
import '@/lib/stores/cashu'

// Fast KDF for tests; the >= 600k default is asserted in vault.test.ts.
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
		key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
		get length() {
			return memoryStorage.size
		},
	} as unknown as Storage
})

afterEach(() => {
	globalThis.localStorage = realLocalStorage
	lock()
})

describe('wipeWalletSecrets on logout', () => {
	test('removes the NIP-46 signer key, bunker URL, ncryptsec key, NWC wallets, and vault envelope', async () => {
		await unlock('passphrase', TEST_ITERATIONS)
		expect(isUnlocked()).toBe(true)

		// Seed every wallet secret the wipe must remove.
		await setSecret(NOSTR_LOCAL_SIGNER_KEY, 'nsec-signer-key')
		localStorage.setItem(NOSTR_CONNECT_KEY, 'bunker://remote?relay=wss%3A%2F%2Fr')
		localStorage.setItem(NOSTR_LOCAL_ENCRYPTED_SIGNER_KEY, 'pubkey:ncryptsec1...')
		await setSecret(NWC_WALLETS_KEY, JSON.stringify([{ nwcUri: 'nostr+walletconnect://...&secret=spending' }]))
		await setSecret('cashu_wallet_seed_aaaa', 'seed-hex-aaaa')
		await setSecret('cashu_wallet_seed_bbbb', 'seed-hex-bbbb')
		localStorage.setItem(VAULT_STORAGE_KEY, '{"v":1,"alg":"AES-256-GCM","kdf":"PBKDF2-SHA256","iterations":1000,"salt":"x","iv":"y","ct":"z"}')

		// Sanity: everything is present before the wipe.
		expect(localStorage.getItem(NOSTR_LOCAL_SIGNER_KEY)).toBeTruthy()
		expect(localStorage.getItem(NOSTR_CONNECT_KEY)).toBeTruthy()
		expect(localStorage.getItem(NOSTR_LOCAL_ENCRYPTED_SIGNER_KEY)).toBeTruthy()
		expect(localStorage.getItem(NWC_WALLETS_KEY)).toBeTruthy()
		expect(localStorage.getItem('cashu_wallet_seed_aaaa')).toBeTruthy()
		expect(localStorage.getItem('cashu_wallet_seed_bbbb')).toBeTruthy()
		expect(localStorage.getItem(VAULT_STORAGE_KEY)).toBeTruthy()

		wipeWalletSecrets()

		// Every wallet secret is gone.
		expect(localStorage.getItem(NOSTR_LOCAL_SIGNER_KEY)).toBeNull()
		expect(localStorage.getItem(NOSTR_CONNECT_KEY)).toBeNull()
		expect(localStorage.getItem(NOSTR_LOCAL_ENCRYPTED_SIGNER_KEY)).toBeNull()
		expect(localStorage.getItem(NWC_WALLETS_KEY)).toBeNull()
		expect(localStorage.getItem('cashu_wallet_seed_aaaa')).toBeNull()
		expect(localStorage.getItem('cashu_wallet_seed_bbbb')).toBeNull()
		expect(localStorage.getItem(VAULT_STORAGE_KEY)).toBeNull()

		// The in-memory session key is locked so a later getSecret fails closed.
		expect(isUnlocked()).toBe(false)
	})

	test('wipes every cashu_wallet_seed_* key (multi-pubkey) and leaves unrelated keys intact', async () => {
		await unlock('passphrase', TEST_ITERATIONS)

		await setSecret('cashu_wallet_seed_pubkey1', 'seed-1')
		await setSecret('cashu_wallet_seed_pubkey2', 'seed-2')
		await setSecret('cashu_wallet_seed_pubkey3', 'seed-3')
		// An unrelated key must survive the wipe.
		localStorage.setItem('some_unrelated_key', 'keep-me')

		wipeWalletSecrets()

		expect(localStorage.getItem('cashu_wallet_seed_pubkey1')).toBeNull()
		expect(localStorage.getItem('cashu_wallet_seed_pubkey2')).toBeNull()
		expect(localStorage.getItem('cashu_wallet_seed_pubkey3')).toBeNull()
		expect(localStorage.getItem('some_unrelated_key')).toBe('keep-me')
	})

	test('is idempotent and safe when nothing is stored', async () => {
		await unlock('passphrase', TEST_ITERATIONS)

		wipeWalletSecrets()
		wipeWalletSecrets()

		expect(localStorage.getItem(NOSTR_LOCAL_SIGNER_KEY)).toBeNull()
		expect(localStorage.getItem(NWC_WALLETS_KEY)).toBeNull()
		expect(isUnlocked()).toBe(false)
	})
})
