/**
 * Publish functions for V4V auction events.
 *
 * Covers:
 *   - Kind 30408: Auction Listing with V4V splits
 *   - Kind 1023:  Multi-Note Bid Commitment
 *   - Kind 1024:  Settlement Reveal
 *
 * Routes Nostr I/O through `src/lib/nostr/io.ts` per ADR-0002.
 * No NDK imports.
 *
 * CRITICAL: Never publishes raw cashu_token or proof data. Only references/
 * commitments appear in event tags/content.
 *
 * @see docs/adr/proposals/v4v-dev-splits-auction.md
 */

import { getNostrIo, type EventTemplate, type NostrEvent } from '@/lib/nostr/io'
import { AUCTION_LISTING_KIND, AUCTION_BID_KIND, AUCTION_SETTLEMENT_KIND } from '@/lib/schemas/auction-kinds'
import {
	buildAuctionListingTags,
	buildAuctionBidTags,
	buildAuctionSettlementTags,
	type AuctionListingInput,
	type AuctionBidInput,
	type AuctionSettlementInput,
} from '@/lib/schemas/auction-v4v'

// ===========================================================================
// Kind 30408 — Auction Listing with V4V splits
// ===========================================================================

/** Creates a kind 30408 auction listing event template with V4V splits. */
export function createAuctionListingTemplate(input: AuctionListingInput): EventTemplate {
	return {
		kind: AUCTION_LISTING_KIND,
		content: JSON.stringify(input.content),
		tags: buildAuctionListingTags(input),
		created_at: Math.floor(Date.now() / 1000),
	}
}

/** Publishes a kind 30408 auction listing event with V4V splits. */
export async function publishAuctionListing(input: AuctionListingInput): Promise<NostrEvent> {
	const io = getNostrIo()
	const template = createAuctionListingTemplate(input)
	const signedEvent = await io.sign(template)
	await io.publish(signedEvent)
	return signedEvent
}

// ===========================================================================
// Kind 1023 — Multi-Note Bid Commitment
// ===========================================================================

/**
 * Creates a kind 1023 multi-note bid event template.
 *
 * CRITICAL: The content contains ONLY note references/commitments — never
 * raw cashu_token or proof data. The derivation_commitment is a hash, not
 * the actual secret.
 */
export function createAuctionBidTemplate(input: AuctionBidInput): EventTemplate {
	return {
		kind: AUCTION_BID_KIND,
		content: JSON.stringify(input.content),
		tags: buildAuctionBidTags(input),
		created_at: Math.floor(Date.now() / 1000),
	}
}

/** Publishes a kind 1023 multi-note bid commitment event. */
export async function publishAuctionBid(input: AuctionBidInput): Promise<NostrEvent> {
	const io = getNostrIo()
	const template = createAuctionBidTemplate(input)
	const signedEvent = await io.sign(template)
	await io.publish(signedEvent)
	return signedEvent
}

// ===========================================================================
// Kind 1024 — Settlement Reveal
// ===========================================================================

/**
 * Creates a kind 1024 settlement reveal event template.
 *
 * The settlement publishes the derivation path (secret) that unlocks all
 * notes. This is a SINGLE public event (decision D1). On reveal, all
 * recipients verify + redeem their respective notes.
 */
export function createAuctionSettlementTemplate(input: AuctionSettlementInput): EventTemplate {
	return {
		kind: AUCTION_SETTLEMENT_KIND,
		content: JSON.stringify(input.content),
		tags: buildAuctionSettlementTags(input),
		created_at: Math.floor(Date.now() / 1000),
	}
}

/** Publishes a kind 1024 settlement reveal event. */
export async function publishAuctionSettlement(input: AuctionSettlementInput): Promise<NostrEvent> {
	const io = getNostrIo()
	const template = createAuctionSettlementTemplate(input)
	const signedEvent = await io.sign(template)
	await io.publish(signedEvent)
	return signedEvent
}
