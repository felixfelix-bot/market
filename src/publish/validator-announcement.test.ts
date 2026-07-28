import { afterEach, describe, expect, mock, test } from 'bun:test'
import { VALIDATOR_FEE_ANNOUNCEMENT_KIND } from '@/lib/schemas/auction-kinds'
import { getNostrIo, setNostrIo, type NostrEvent, type NostrIo } from '@/lib/nostr/io'
import { createValidatorAnnouncementTemplate, publishValidatorAnnouncement } from '@/publish/validator-announcement'

const VALID_PUBKEY = 'a'.repeat(64)
const VALID_EVENT_ID = 'b'.repeat(64)
const MINT_A = 'https://mint-a.example.com'
const MINT_B = 'https://mint-b.example.com'

const realIo = getNostrIo()

function makeMockNostrIo(overrides: Partial<NostrIo> = {}): NostrIo {
	return {
		fetchEvents: mock(async () => []),
		subscribe: mock(() => () => {}),
		publish: mock(async () => {}),
		sign: mock(async () => {
			throw new Error('mock sign not configured')
		}),
		getUser: mock(async () => null),
		...overrides,
	}
}

function buildSignedEvent(template: { content: string; created_at: number; kind: number; tags: [string, ...string[]][] }): NostrEvent {
	return {
		...template,
		id: VALID_EVENT_ID,
		pubkey: VALID_PUBKEY,
		sig: '0'.repeat(128),
	}
}

afterEach(() => {
	setNostrIo(realIo)
})

describe('createValidatorAnnouncementTemplate', () => {
	test('returns a kind 30409 event template with correct tags', () => {
		const template = createValidatorAnnouncementTemplate({
			validatorId: 'validator-1',
			feeMinBps: 150,
			mints: [MINT_A, MINT_B],
			auctionType: 'english',
			lockingScheme: 'P2PK',
			maxDuration: 86400,
		})

		expect(template.kind).toBe(VALIDATOR_FEE_ANNOUNCEMENT_KIND)
		expect(template.content).toBe('')
		expect(template.tags).toContainEqual(['d', 'validator-1'])
		expect(template.tags).toContainEqual(['fee_min_bps', '150'])
		expect(template.tags).toContainEqual(['mint', MINT_A])
		expect(template.tags).toContainEqual(['mint', MINT_B])
		expect(template.tags).toContainEqual(['auction_type', 'english'])
		expect(template.tags).toContainEqual(['locking_scheme', 'P2PK'])
		expect(template.tags).toContainEqual(['max_duration', '86400'])
	})

	test('omits optional tags when not provided', () => {
		const template = createValidatorAnnouncementTemplate({
			validatorId: 'validator-min',
			feeMinBps: 1,
			mints: [MINT_A],
		})

		expect(template.kind).toBe(VALIDATOR_FEE_ANNOUNCEMENT_KIND)
		expect(template.tags).toEqual([
			['d', 'validator-min'],
			['fee_min_bps', '1'],
			['mint', MINT_A],
		])
	})

	test('sets created_at to a recent unix timestamp', () => {
		const before = Math.floor(Date.now() / 1000)
		const template = createValidatorAnnouncementTemplate({
			validatorId: 'v',
			feeMinBps: 100,
			mints: [MINT_A],
		})
		const after = Math.floor(Date.now() / 1000)

		expect(template.created_at).toBeGreaterThanOrEqual(before)
		expect(template.created_at).toBeLessThanOrEqual(after)
	})
})

describe('publishValidatorAnnouncement', () => {
	test('calls io.sign and io.publish with the correct kind 30409 event', async () => {
		const sign = mock(async (template: { content: string; created_at: number; kind: number; tags: [string, ...string[]][] }) =>
			buildSignedEvent(template),
		)
		const publish = mock(async () => {})
		const mockIo = makeMockNostrIo({ sign, publish })
		setNostrIo(mockIo)

		const input = {
			validatorId: 'validator-1',
			feeMinBps: 200,
			mints: [MINT_A],
			auctionType: 'english',
			lockingScheme: 'P2PK',
		}
		const result = await publishValidatorAnnouncement(input)

		expect(sign).toHaveBeenCalledTimes(1)
		const signedTemplate = sign.mock.calls[0][0]
		expect(signedTemplate.kind).toBe(VALIDATOR_FEE_ANNOUNCEMENT_KIND)
		expect(signedTemplate.tags).toContainEqual(['d', 'validator-1'])
		expect(signedTemplate.tags).toContainEqual(['fee_min_bps', '200'])
		expect(signedTemplate.tags).toContainEqual(['mint', MINT_A])
		expect(signedTemplate.tags).toContainEqual(['auction_type', 'english'])
		expect(signedTemplate.tags).toContainEqual(['locking_scheme', 'P2PK'])
		expect(signedTemplate.content).toBe('')

		expect(publish).toHaveBeenCalledTimes(1)
		expect(publish).toHaveBeenCalledWith(result)
		expect(result.kind).toBe(VALIDATOR_FEE_ANNOUNCEMENT_KIND)
		expect(result.id).toBe(VALID_EVENT_ID)
		expect(result.pubkey).toBe(VALID_PUBKEY)
	})

	test('does not import the NDK package', async () => {
		const sourceUrl = new URL('./validator-announcement.tsx', import.meta.url)
		const source = await Bun.file(sourceUrl).text()
		const ndkPackage = '@' + 'nostr-dev-kit'
		expect(source).not.toContain(ndkPackage)
	})
})
