/**
 * Zod schemas for auction events with V4V dev splits.
 *
 * Covers:
 *   - Kind 30408: Auction Listing with v4v_splits extension
 *   - Kind 1023:  Multi-Note Bid Commitment (one locked note per recipient)
 *   - Kind 1024:  Settlement Reveal (derivation path)
 *
 * @see docs/adr/proposals/v4v-dev-splits-auction.md
 * @see docs/adr/proposals/adr-v4v-dev-splits-DECISIONS.md
 */

import { z } from 'zod'
import { AUCTION_LISTING_KIND, AUCTION_BID_KIND, AUCTION_SETTLEMENT_KIND, TOTAL_BPS, DEFAULT_MAX_DURATION_SECONDS } from './auction-kinds'

// ===========================================================================
// Payment lifecycle states (per AGENTS.md — keep distinct, do NOT collapse)
// ===========================================================================

export const AuctionPaymentStateSchema = z.enum([
	'requested', // bid submitted, awaiting settlement
	'attempted', // settlement reveal published
	'wallet_acknowledged', // mint acknowledges the note exists
	'settled', // derivation path revealed + notes unlocked
	'receipt_published', // settlement event (1024) published
	'confirmed', // validators confirmed the settlement
	'expired', // settlement window expired without settlement
	'failed', // settlement failed (funds invalid, wrong recipient, etc.)
	'refunded', // losing bidder: notes auto-refunded after window
	'fulfilled', // recipient successfully redeemed their note
])

export type AuctionPaymentState = z.infer<typeof AuctionPaymentStateSchema>

// ===========================================================================
// V4V Split (shared structure for validator fees + V4V donations)
// ===========================================================================

const HEX_PUBKEY = /^[0-9a-f]{64}$/

/**
 * A single V4V split entry. Both validator fees and V4V donations use this
 * structure (decision D4). The only distinction: validator fee is a mandatory
 * floor, PM donation is optional (seller's discretion, can be zero).
 */
export const V4vSplitSchema = z.object({
	/** Recipient npub (hex pubkey format). */
	npub: z.string().regex(HEX_PUBKEY, 'npub must be a 64-char hex pubkey'),
	/** Basis points allocated to this recipient (100 = 1%, 10000 = 100%). */
	bps: z.number().int().min(0).max(TOTAL_BPS),
})

export type V4vSplit = z.infer<typeof V4vSplitSchema>

// ===========================================================================
// Kind 30408 — Auction Listing with V4V splits
// ===========================================================================

/** Content JSON for a kind 30408 auction listing. */
export const AuctionListingContentSchema = z.object({
	/** V4V splits array. Sum of all bps MUST equal 10000. */
	v4v_splits: z.array(V4vSplitSchema).min(1, 'At least one v4v_split is required (seller must be included)'),
	/** Settlement window in seconds. After this, losing bids auto-refund. */
	settlement_window: z.number().int().positive().default(DEFAULT_MAX_DURATION_SECONDS),
	/** Supported mint URLs for this auction. */
	mints: z.array(z.string().url()).min(1, 'At least one mint URL is required'),
	/** Auction format (e.g. "english"). */
	auction_type: z.string().default('english'),
	/** Locking scheme (e.g. "P2PK"). */
	locking_scheme: z.string().default('P2PK'),
})

export type AuctionListingContent = z.infer<typeof AuctionListingContentSchema>

/**
 * Validates that V4V splits sum to exactly 10000 bps (100%).
 * Pure function — does not touch the network.
 */
export function validateV4vSplitSum(splits: V4vSplit[]): boolean {
	return splits.reduce((sum: number, s: V4vSplit) => sum + s.bps, 0) === TOTAL_BPS
}

/**
 * Validates that each assigned validator's bps >= their announced fee_min_bps.
 *
 * @param splits The auction's v4v_splits array.
 * @param validatorFees Map of validator pubkey → announced fee_min_bps (from kind 30409).
 * @returns Array of validation errors (empty = all valid).
 */
export function validateValidatorMinimums(splits: V4vSplit[], validatorFees: Map<string, number>): string[] {
	const errors: string[] = []
	for (const split of splits) {
		const announcedMin = validatorFees.get(split.npub)
		if (announcedMin !== undefined && split.bps < announcedMin) {
			errors.push(`Validator ${split.npub.slice(0, 12)}… assigned ${split.bps} bps but announced minimum is ${announcedMin} bps`)
		}
	}
	return errors
}

/**
 * Full validation of an auction listing's V4V configuration.
 * Checks: sum = 10000, each validator's bps >= their fee_min_bps.
 *
 * @param content The parsed auction listing content.
 * @param validatorFees Map of validator pubkey → announced fee_min_bps.
 * @returns Object with `valid` boolean and `errors` array.
 */
export function validateAuctionV4vConfig(
	content: AuctionListingContent,
	validatorFees: Map<string, number>,
): { valid: boolean; errors: string[] } {
	const errors: string[] = []

	if (!validateV4vSplitSum(content.v4v_splits)) {
		const sum = content.v4v_splits.reduce((s: number, x: V4vSplit) => s + x.bps, 0)
		errors.push(`V4V splits must sum to ${TOTAL_BPS} bps, got ${sum}`)
	}

	errors.push(...validateValidatorMinimums(content.v4v_splits, validatorFees))

	return { valid: errors.length === 0, errors }
}

// ===========================================================================
// Kind 1023 — Multi-Note Bid Commitment
// ===========================================================================

/**
 * A single locked e-cash note reference in a bid.
 *
 * CRITICAL SECURITY: This contains ONLY a reference/commitment to the locked
 * note — never raw cashu_token or proof data. The `locked_note_ref` is an
 * opaque identifier (e.g. a hash or mint quote ID) that allows the recipient
 * to identify and verify the note without exposing spendable material.
 */
export const BidNoteEntrySchema = z.object({
	/** Recipient pubkey (seller, validator, or V4V recipient). */
	recipient_npub: z.string().regex(HEX_PUBKEY, 'recipient_npub must be a 64-char hex pubkey'),
	/** Mint URL where this note is locked. May differ per note (cross-mint). */
	mint_url: z.string().url('mint_url must be a valid URL'),
	/**
	 * Opaque reference to the locked note (e.g. hash, mint quote ID, or
	 * commitment). NEVER raw cashu_token or proof data.
	 */
	locked_note_ref: z.string().min(1, 'locked_note_ref must not be empty'),
})

export type BidNoteEntry = z.infer<typeof BidNoteEntrySchema>

/** Content JSON for a kind 1023 multi-note bid. */
export const AuctionBidContentSchema = z.object({
	/** One locked note per recipient (seller, validators, V4V recipients). */
	notes: z.array(BidNoteEntrySchema).min(1, 'At least one note is required'),
	/**
	 * Shared derivation path commitment. All notes share the same derivation
	 * path. This is a COMMITMENT (hash), not the actual secret.
	 * The actual derivation path is revealed in the settlement event (1024).
	 */
	derivation_commitment: z.string().min(1, 'derivation_commitment must not be empty'),
})

export type AuctionBidContent = z.infer<typeof AuctionBidContentSchema>

// ===========================================================================
// Kind 1024 — Settlement Reveal
// ===========================================================================

/** Content JSON for a kind 1024 settlement reveal event. */
export const AuctionSettlementContentSchema = z.object({
	/**
	 * The actual derivation path (secret) that unlocks all notes.
	 * This is the SINGLE public reveal event (decision D1).
	 * On reveal, all recipients verify + redeem their respective notes.
	 */
	derivation_path: z.string().min(1, 'derivation_path must not be empty'),
	/** Reference to the winning bid event (kind 1023) being settled. */
	winning_bid_id: z.string().regex(/^[0-9a-f]{64}$/, 'winning_bid_id must be a 64-char hex event id'),
})

export type AuctionSettlementContent = z.infer<typeof AuctionSettlementContentSchema>

// ===========================================================================
// Parsing helpers
// ===========================================================================

interface RawNostrEvent {
	kind: number
	pubkey: string
	content: string
	tags: [string, ...string[]][]
	created_at: number
	id: string
}

function safeParseContent<T>(event: RawNostrEvent, schema: z.ZodSchema<T>): T | null {
	try {
		return schema.parse(JSON.parse(event.content))
	} catch {
		return null
	}
}

/** Parses a kind 30408 auction listing's content (V4V splits etc). */
export function parseAuctionListingContent(event: RawNostrEvent): AuctionListingContent | null {
	if (event.kind !== AUCTION_LISTING_KIND) return null
	return safeParseContent(event, AuctionListingContentSchema)
}

/** Parses a kind 1023 multi-note bid's content. */
export function parseAuctionBidContent(event: RawNostrEvent): AuctionBidContent | null {
	if (event.kind !== AUCTION_BID_KIND) return null
	return safeParseContent(event, AuctionBidContentSchema)
}

/** Parses a kind 1024 settlement reveal's content. */
export function parseAuctionSettlementContent(event: RawNostrEvent): AuctionSettlementContent | null {
	if (event.kind !== AUCTION_SETTLEMENT_KIND) return null
	return safeParseContent(event, AuctionSettlementContentSchema)
}

// ===========================================================================
// Tag-building helpers (for publish functions)
// ===========================================================================

export interface AuctionListingInput {
	/** Auction identifier (d tag). */
	auctionId: string
	/** V4V splits content. */
	content: AuctionListingContent
}

/** Builds the Nostr tag array for a kind 30408 auction listing event. */
export function buildAuctionListingTags(input: AuctionListingInput): [string, ...string[]][] {
	const tags: [string, ...string[]][] = [
		['d', input.auctionId],
		['auction_type', input.content.auction_type],
		['locking_scheme', input.content.locking_scheme],
	]

	for (const mint of input.content.mints) {
		tags.push(['mint', mint])
	}

	for (const split of input.content.v4v_splits) {
		tags.push(['p', split.npub])
	}

	return tags
}

export interface AuctionBidInput {
	/** Auction coordinate being bid on (30408:pubkey:d-tag). */
	auctionRef: string
	/** Bid content (notes + derivation commitment). */
	content: AuctionBidContent
}

/** Builds the Nostr tag array for a kind 1023 bid event. */
export function buildAuctionBidTags(input: AuctionBidInput): [string, ...string[]][] {
	const tags: [string, ...string[]][] = [['a', input.auctionRef]]

	for (const note of input.content.notes) {
		tags.push(['p', note.recipient_npub])
	}

	return tags
}

export interface AuctionSettlementInput {
	/** Auction coordinate being settled (30408:pubkey:d-tag). */
	auctionRef: string
	/** Settlement content (derivation path + winning bid reference). */
	content: AuctionSettlementContent
}

/** Builds the Nostr tag array for a kind 1024 settlement event. */
export function buildAuctionSettlementTags(input: AuctionSettlementInput): [string, ...string[]][] {
	return [
		['a', input.auctionRef],
		['e', input.content.winning_bid_id],
	]
}
