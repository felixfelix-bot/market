import { afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { NostrEvent } from 'nostr-tools/pure'

import { VALIDATOR_FEE_ANNOUNCEMENT_KIND, DEFAULT_MAX_DURATION_SECONDS } from '@/lib/schemas/auction-kinds'
import type { ValidatorFeeAnnouncement } from '@/lib/schemas/validator-fee-announcement'
import { getNostrIo, setNostrIo, type NostrIo, type NostrFilter } from '@/lib/nostr/io'

const VALIDATOR_PUBKEY_A = 'a'.repeat(64)
const VALIDATOR_PUBKEY_B = 'b'.repeat(64)
const MINT_A = 'https://mint-a.example.com'
const MINT_B = 'https://mint-b.example.com'
const VALID_EVENT_ID = 'e'.repeat(64)

let originalIo: NostrIo
let fetchEventsMock = mock<NostrIo['fetchEvents']>(async () => [] as NostrEvent[])

function makeStubIo(): NostrIo {
	return {
		fetchEvents: fetchEventsMock,
		subscribe: mock(() => () => {}),
		publish: mock(async () => {}),
		sign: mock(async () => ({}) as NostrEvent),
		getUser: mock(async () => null),
	}
}

beforeAll(() => {
	originalIo = getNostrIo()
})

beforeEach(() => {
	fetchEventsMock = mock<NostrIo['fetchEvents']>(async () => [] as NostrEvent[])
	setNostrIo(makeStubIo())
})

afterEach(() => {
	fetchEventsMock.mockClear()
	setNostrIo(originalIo)
})

import { fetchValidators, fetchValidatorById, filterCompatibleValidators } from '@/queries/validators'

function makeValidatorEvent(
	overrides: Partial<{
		pubkey: string
		validatorId: string
		feeMinBps: number
		mints: string[]
		auctionType: string
		lockingScheme: string
		maxDuration: number
		createdAt: number
	}> = {},
): NostrEvent {
	const {
		pubkey = VALIDATOR_PUBKEY_A,
		validatorId = 'validator-1',
		feeMinBps = 100,
		mints = [MINT_A],
		auctionType,
		lockingScheme,
		maxDuration,
		createdAt = 1_700_000_000,
	} = overrides
	const tags: [string, ...string[]][] = [
		['d', validatorId],
		['fee_min_bps', String(feeMinBps)],
		...mints.map((m): [string, string] => ['mint', m]),
	]
	if (auctionType) tags.push(['auction_type', auctionType])
	if (lockingScheme) tags.push(['locking_scheme', lockingScheme])
	if (maxDuration !== undefined) tags.push(['max_duration', String(maxDuration)])
	return {
		id: VALID_EVENT_ID,
		kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
		pubkey,
		content: '',
		tags,
		created_at: createdAt,
		sig: 'sig',
	} as NostrEvent
}

describe('filterCompatibleValidators', () => {
	test('returns all validators when no filter options are given', () => {
		const v: ValidatorFeeAnnouncement[] = [
			{
				validatorId: 'v1',
				feeMinBps: 100,
				mints: [MINT_A],
				maxDuration: DEFAULT_MAX_DURATION_SECONDS,
				pubkey: VALIDATOR_PUBKEY_A,
				createdAt: 1,
				eventId: VALID_EVENT_ID,
				kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
			},
			{
				validatorId: 'v2',
				feeMinBps: 200,
				mints: [MINT_B],
				maxDuration: DEFAULT_MAX_DURATION_SECONDS,
				pubkey: VALIDATOR_PUBKEY_B,
				createdAt: 2,
				eventId: VALID_EVENT_ID,
				kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
			},
		]
		expect(filterCompatibleValidators(v, {})).toEqual(v)
	})

	test('filters by mint, auction_type, and locking_scheme', () => {
		const v: ValidatorFeeAnnouncement[] = [
			{
				validatorId: 'v1',
				feeMinBps: 100,
				mints: [MINT_A],
				auctionType: 'english',
				lockingScheme: 'P2PK',
				maxDuration: DEFAULT_MAX_DURATION_SECONDS,
				pubkey: VALIDATOR_PUBKEY_A,
				createdAt: 1,
				eventId: VALID_EVENT_ID,
				kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
			},
			{
				validatorId: 'v2',
				feeMinBps: 200,
				mints: [MINT_B],
				auctionType: 'dutch',
				lockingScheme: 'P2PK',
				maxDuration: DEFAULT_MAX_DURATION_SECONDS,
				pubkey: VALIDATOR_PUBKEY_B,
				createdAt: 2,
				eventId: VALID_EVENT_ID,
				kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
			},
		]
		expect(filterCompatibleValidators(v, { mintUrl: MINT_A, auctionType: 'english', lockingScheme: 'P2PK' })).toEqual([v[0]])
	})
})

describe('fetchValidators deduplication', () => {
	test('deduplicates by NIP-33 coordinate (pubkey + d tag), keeping the latest per coordinate', async () => {
		fetchEventsMock.mockImplementation(async () => [
			makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_A, validatorId: 'v1', createdAt: 1_700_000_000 }),
			makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_A, validatorId: 'v1', createdAt: 1_700_000_001, feeMinBps: 200 }),
			makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_B, validatorId: 'v1', createdAt: 1_700_000_000 }),
		])

		const result = await fetchValidators()
		expect(result).toHaveLength(2)
		const byKey = new Map(result.map((v) => [`${v.pubkey}:${v.validatorId}`, v]))
		expect(byKey.get(`${VALIDATOR_PUBKEY_A}:v1`)?.feeMinBps).toBe(200)
		expect(byKey.get(`${VALIDATOR_PUBKEY_B}:v1`)?.feeMinBps).toBe(100)
	})

	test('does not let a different pubkey overwrite another validator with the same d tag', async () => {
		fetchEventsMock.mockImplementation(async () => [
			makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_A, validatorId: 'shared-id', createdAt: 1_700_000_001 }),
			makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_B, validatorId: 'shared-id', createdAt: 1_700_000_000 }),
		])

		const result = await fetchValidators()
		expect(result).toHaveLength(2)
		expect(result.map((v) => v.pubkey).sort()).toEqual([VALIDATOR_PUBKEY_A, VALIDATOR_PUBKEY_B].sort())
	})
})

describe('fetchValidatorById', () => {
	test('returns the latest announcement for the requested pubkey + d tag coordinate', async () => {
		fetchEventsMock.mockImplementation(async () => [
			makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_A, validatorId: 'v1', createdAt: 1_700_000_000 }),
			makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_A, validatorId: 'v1', createdAt: 1_700_000_001, feeMinBps: 250 }),
		])

		const result = await fetchValidatorById(VALIDATOR_PUBKEY_A, 'v1')
		expect(result).not.toBeNull()
		expect(result!.feeMinBps).toBe(250)
		expect(result!.pubkey).toBe(VALIDATOR_PUBKEY_A)
	})

	test('ignores announcements from a different pubkey with the same d tag', async () => {
		fetchEventsMock.mockImplementation(async () => [
			makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_B, validatorId: 'v1', createdAt: 1_700_000_001, feeMinBps: 999 }),
		])

		const result = await fetchValidatorById(VALIDATOR_PUBKEY_A, 'v1')
		expect(result).toBeNull()
	})

	test('filters relays by author pubkey when fetching by coordinate', async () => {
		fetchEventsMock.mockImplementation(async (filter: NostrFilter) => {
			expect(filter.authors).toEqual([VALIDATOR_PUBKEY_A])
			expect(filter['#d']).toEqual(['v1'])
			return [makeValidatorEvent({ pubkey: VALIDATOR_PUBKEY_A, validatorId: 'v1', createdAt: 1_700_000_000 })]
		})

		const result = await fetchValidatorById(VALIDATOR_PUBKEY_A, 'v1')
		expect(result).not.toBeNull()
	})
})
