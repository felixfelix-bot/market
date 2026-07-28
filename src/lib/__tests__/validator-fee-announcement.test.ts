import { describe, expect, test } from 'bun:test'
import {
	parseValidatorFeeAnnouncement,
	buildValidatorFeeAnnouncementTags,
	ValidatorFeeAnnouncementSchema,
} from '@/lib/schemas/validator-fee-announcement'
import { VALIDATOR_FEE_ANNOUNCEMENT_KIND } from '@/lib/schemas/auction-kinds'

const VALID_PUBKEY = 'a'.repeat(64)
const VALID_EVENT_ID = 'b'.repeat(64)
const MINT_A = 'https://mint-a.example.com'
const MINT_B = 'https://mint-b.example.com'

function makeRawEvent(
	overrides: Partial<{
		kind: number
		pubkey: string
		content: string
		tags: [string, ...string[]][]
		created_at: number
		id: string
	}> = {},
) {
	return {
		kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
		pubkey: VALID_PUBKEY,
		content: '',
		tags: [
			['d', 'validator-1'],
			['fee_min_bps', '100'],
			['mint', MINT_A],
			['mint', MINT_B],
			['auction_type', 'english'],
			['locking_scheme', 'P2PK'],
			['max_duration', '86400'],
		],
		created_at: 1700000000,
		id: VALID_EVENT_ID,
		...overrides,
	}
}

// ---------------------------------------------------------------------------
// 1. Kind 30409 schema validation
// ---------------------------------------------------------------------------

describe('Kind 30409 — Validator Fee Announcement schema', () => {
	describe('valid events', () => {
		test('parses a fully-specified valid announcement', () => {
			const result = parseValidatorFeeAnnouncement(makeRawEvent())
			expect(result).not.toBeNull()
			expect(result!.kind).toBe(VALIDATOR_FEE_ANNOUNCEMENT_KIND)
			expect(result!.validatorId).toBe('validator-1')
			expect(result!.feeMinBps).toBe(100)
			expect(result!.mints).toEqual([MINT_A, MINT_B])
			expect(result!.auctionType).toBe('english')
			expect(result!.lockingScheme).toBe('P2PK')
			expect(result!.maxDuration).toBe(86400)
			expect(result!.pubkey).toBe(VALID_PUBKEY)
			expect(result!.eventId).toBe(VALID_EVENT_ID)
			expect(result!.createdAt).toBe(1700000000)
		})

		test('parses a minimal valid announcement (only required tags)', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'validator-min'],
						['fee_min_bps', '1'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).not.toBeNull()
			expect(result!.validatorId).toBe('validator-min')
			expect(result!.feeMinBps).toBe(1)
			expect(result!.mints).toEqual([MINT_A])
			expect(result!.auctionType).toBeUndefined()
			expect(result!.lockingScheme).toBeUndefined()
			expect(result!.maxDuration).toBe(2_592_000) // default
		})

		test('fee_min_bps of 1 (0.01%) is valid', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '1'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).not.toBeNull()
			expect(result!.feeMinBps).toBe(1)
		})
	})

	describe('invalid fee_min_bps', () => {
		test('rejects fee_min_bps of 0', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '0'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).toBeNull()
		})

		test('rejects negative fee_min_bps', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '-5'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).toBeNull()
		})

		test('rejects non-numeric fee_min_bps', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', 'abc'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).toBeNull()
		})

		test('rejects decimal fee_min_bps', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '1.5'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).toBeNull()
		})
	})

	describe('missing required tags', () => {
		test('rejects event missing d tag', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['fee_min_bps', '100'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).toBeNull()
		})

		test('rejects event with empty d tag', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', ''],
						['fee_min_bps', '100'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).toBeNull()
		})

		test('rejects event missing fee_min_bps tag', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).toBeNull()
		})

		test('rejects event missing mint tags (no mints at all)', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '100'],
					],
				}),
			)
			expect(result).toBeNull()
		})
	})

	describe('wrong kind', () => {
		test('rejects events that are not kind 30409', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					kind: 30408,
					tags: [
						['d', 'v'],
						['fee_min_bps', '100'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).toBeNull()
		})
	})

	describe('optional tags', () => {
		test('auction_type is optional and preserved when present', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '100'],
						['mint', MINT_A],
						['auction_type', 'sealed-bid'],
					],
				}),
			)
			expect(result).not.toBeNull()
			expect(result!.auctionType).toBe('sealed-bid')
		})

		test('locking_scheme is optional and preserved when present', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '100'],
						['mint', MINT_A],
						['locking_scheme', 'P2SH'],
					],
				}),
			)
			expect(result).not.toBeNull()
			expect(result!.lockingScheme).toBe('P2SH')
		})

		test('max_duration uses default when omitted', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '100'],
						['mint', MINT_A],
					],
				}),
			)
			expect(result).not.toBeNull()
			expect(result!.maxDuration).toBe(2_592_000)
		})

		test('max_duration is preserved when explicitly set', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '100'],
						['mint', MINT_A],
						['max_duration', '3600'],
					],
				}),
			)
			expect(result).not.toBeNull()
			expect(result!.maxDuration).toBe(3600)
		})
	})

	describe('schema-level validation (direct Zod)', () => {
		test('rejects invalid pubkey format', () => {
			const result = ValidatorFeeAnnouncementSchema.safeParse({
				kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
				validatorId: 'v',
				feeMinBps: 100,
				mints: [MINT_A],
				pubkey: 'short',
				createdAt: 1700000000,
				eventId: VALID_EVENT_ID,
			})
			expect(result.success).toBe(false)
		})

		test('rejects invalid event id format', () => {
			const result = ValidatorFeeAnnouncementSchema.safeParse({
				kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
				validatorId: 'v',
				feeMinBps: 100,
				mints: [MINT_A],
				pubkey: VALID_PUBKEY,
				createdAt: 1700000000,
				eventId: 'not-a-hash',
			})
			expect(result.success).toBe(false)
		})

		test('rejects empty mints array', () => {
			const result = ValidatorFeeAnnouncementSchema.safeParse({
				kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
				validatorId: 'v',
				feeMinBps: 100,
				mints: [],
				pubkey: VALID_PUBKEY,
				createdAt: 1700000000,
				eventId: VALID_EVENT_ID,
			})
			expect(result.success).toBe(false)
		})
	})

	describe('WOT/endorsement tags are NOT in schema', () => {
		test('built tags do not contain wot or endorsement tags', () => {
			const tags = buildValidatorFeeAnnouncementTags({
				validatorId: 'v',
				feeMinBps: 100,
				mints: [MINT_A],
			})
			const tagNames = tags.map((t) => t[0])
			expect(tagNames).not.toContain('wot')
			expect(tagNames).not.toContain('endorsement')
		})

		test('parser ignores wot/endorsement tags and still validates', () => {
			const result = parseValidatorFeeAnnouncement(
				makeRawEvent({
					tags: [
						['d', 'v'],
						['fee_min_bps', '100'],
						['mint', MINT_A],
						['wot', 'some-pubkey'],
						['endorsement', 'some-endorsement'],
					],
				}),
			)
			expect(result).not.toBeNull()
			expect(result!.validatorId).toBe('v')
			expect(result!.mints).toEqual([MINT_A])
		})
	})

	describe('tag builder', () => {
		test('builds tags from structured input with all optional fields', () => {
			const tags = buildValidatorFeeAnnouncementTags({
				validatorId: 'validator-1',
				feeMinBps: 200,
				mints: [MINT_A, MINT_B],
				auctionType: 'english',
				lockingScheme: 'P2PK',
				maxDuration: 86400,
			})
			expect(tags).toContainEqual(['d', 'validator-1'])
			expect(tags).toContainEqual(['fee_min_bps', '200'])
			expect(tags).toContainEqual(['mint', MINT_A])
			expect(tags).toContainEqual(['mint', MINT_B])
			expect(tags).toContainEqual(['auction_type', 'english'])
			expect(tags).toContainEqual(['locking_scheme', 'P2PK'])
			expect(tags).toContainEqual(['max_duration', '86400'])
		})

		test('omits optional tags when not provided', () => {
			const tags = buildValidatorFeeAnnouncementTags({
				validatorId: 'v',
				feeMinBps: 50,
				mints: [MINT_A],
			})
			expect(tags).toEqual([
				['d', 'v'],
				['fee_min_bps', '50'],
				['mint', MINT_A],
			])
		})
	})
})
