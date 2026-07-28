/**
 * Zod schema for Kind 30409 — Validator Fee Announcement.
 *
 * A parameterized replaceable event (NIP-33, 3xxxx range) that sits next to
 * kind 30408 (auction listing). Validators publish this to announce their
 * services, fees, and compatibility. Validators can update it over time
 * (latest event wins).
 *
 * Per ADR decision D7:
 *   - d tag: validator identifier (required)
 *   - fee_min_bps: minimum fee in basis points (required, min 1)
 *   - mint: supported mint URLs, one tag per mint (required, at least one)
 *   - auction_type: compatible auction formats (optional)
 *   - locking_scheme: compatible key-locking schemes (optional)
 *   - max_duration: max auction duration in seconds (optional, default 30 days)
 *   - NO WOT/endorsement tags on this kind
 *
 * @see docs/adr/proposals/v4v-dev-splits-auction.md (section 4, decision D7)
 */

import { z } from 'zod'
import { VALIDATOR_FEE_ANNOUNCEMENT_KIND, DEFAULT_MAX_DURATION_SECONDS, TOTAL_BPS } from './auction-kinds'

/** Maximum validator fee in basis points (100% = 10000). */
const MAX_FEE_MIN_BPS = TOTAL_BPS

/** Maximum allowed max_duration value in seconds (1 year). */
const MAX_MAX_DURATION_SECONDS = 31_536_000

// ---------------------------------------------------------------------------
// Parsed / application-level types
// ---------------------------------------------------------------------------

/** The structured data extracted from a kind 30409 event. */
export const ValidatorFeeAnnouncementSchema = z.object({
	/** Event kind — always 30409. */
	kind: z.literal(VALIDATOR_FEE_ANNOUNCEMENT_KIND),
	/** Validator identifier (the `d` tag value). */
	validatorId: z.string().min(1),
	/** Minimum fee in basis points (100 = 1%). */
	feeMinBps: z.number().int().min(1).max(MAX_FEE_MIN_BPS),
	/** Supported mint URLs. */
	mints: z.array(z.string().url()).min(1, 'At least one mint URL is required'),
	/** Compatible auction format, if specified. */
	auctionType: z.string().optional(),
	/** Compatible locking scheme, if specified. */
	lockingScheme: z.string().optional(),
	/** Max auction duration in seconds (default 30 days). */
	maxDuration: z.number().int().positive().max(MAX_MAX_DURATION_SECONDS).default(DEFAULT_MAX_DURATION_SECONDS),
	/** Author pubkey of the announcement. */
	pubkey: z.string().regex(/^[0-9a-f]{64}$/, 'Must be a 64-char hex pubkey'),
	/** Creation timestamp (unix seconds). */
	createdAt: z.number().int().positive(),
	/** Event ID. */
	eventId: z.string().regex(/^[0-9a-f]{64}$/, 'Must be a 64-char hex event id'),
})

export type ValidatorFeeAnnouncement = z.infer<typeof ValidatorFeeAnnouncementSchema>

// ---------------------------------------------------------------------------
// Tag-building helper (for publish functions)
// ---------------------------------------------------------------------------

export interface ValidatorFeeAnnouncementInput {
	validatorId: string
	feeMinBps: number
	mints: string[]
	auctionType?: string
	lockingScheme?: string
	maxDuration?: number
}

/**
 * Builds the Nostr tag array for a kind 30409 event from structured input.
 * Does NOT include WOT/endorsement tags — per decision D7, those are excluded.
 */
export function buildValidatorFeeAnnouncementTags(input: ValidatorFeeAnnouncementInput): [string, ...string[]][] {
	const tags: [string, ...string[]][] = [
		['d', input.validatorId],
		['fee_min_bps', String(input.feeMinBps)],
	]

	for (const mint of input.mints) {
		tags.push(['mint', mint])
	}

	if (input.auctionType) {
		tags.push(['auction_type', input.auctionType])
	}
	if (input.lockingScheme) {
		tags.push(['locking_scheme', input.lockingScheme])
	}
	if (input.maxDuration !== undefined) {
		tags.push(['max_duration', String(input.maxDuration)])
	}

	return tags
}

// ---------------------------------------------------------------------------
// Event parsing
// ---------------------------------------------------------------------------

/** Raw Nostr event shape (minimal — matches nostr-tools NostrEvent). */
interface RawNostrEvent {
	kind: number
	pubkey: string
	content: string
	tags: [string, ...string[]][]
	created_at: number
	id: string
}

/**
 * Parses a raw kind 30409 event into a validated ValidatorFeeAnnouncement.
 * Returns null if the event is malformed or does not match the schema.
 */
export function parseValidatorFeeAnnouncement(event: RawNostrEvent): ValidatorFeeAnnouncement | null {
	if (event.kind !== VALIDATOR_FEE_ANNOUNCEMENT_KIND) return null

	const getTagValue = (name: string): string | undefined => event.tags.find((t) => t[0] === name)?.[1]
	const getTagValues = (name: string): string[] => event.tags.filter((t) => t[0] === name).map((t) => t[1])

	const validatorId = getTagValue('d')
	if (!validatorId) return null

	const feeMinBpsStr = getTagValue('fee_min_bps')
	if (feeMinBpsStr === undefined) return null
	const feeMinBps = Number(feeMinBpsStr)
	if (!Number.isInteger(feeMinBps) || feeMinBps < 1) return null

	const mints = getTagValues('mint')
	if (mints.length === 0) return null

	const auctionType = getTagValue('auction_type')
	const lockingScheme = getTagValue('locking_scheme')
	const maxDurationStr = getTagValue('max_duration')
	const maxDuration = maxDurationStr !== undefined ? Number(maxDurationStr) : undefined

	const result = ValidatorFeeAnnouncementSchema.safeParse({
		kind: event.kind,
		validatorId,
		feeMinBps,
		mints,
		auctionType,
		lockingScheme,
		maxDuration,
		pubkey: event.pubkey,
		createdAt: event.created_at,
		eventId: event.id,
	})

	return result.success ? result.data : null
}
