/**
 * Publish function for Kind 30409 — Validator Fee Announcement.
 *
 * Routes Nostr I/O through `src/lib/nostr/io.ts` per ADR-0002.
 * No `@nostr-dev-kit` imports.
 *
 * @see docs/adr/proposals/v4v-dev-splits-auction.md (section 4, decision D7)
 */

import { getNostrIo, type EventTemplate, type NostrEvent } from '@/lib/nostr/io'
import { VALIDATOR_FEE_ANNOUNCEMENT_KIND } from '@/lib/schemas/auction-kinds'
import { buildValidatorFeeAnnouncementTags, type ValidatorFeeAnnouncementInput } from '@/lib/schemas/validator-fee-announcement'

/**
 * Creates a kind 30409 event template for a validator fee announcement.
 * Does NOT include WOT/endorsement tags (decision D7).
 */
export function createValidatorAnnouncementTemplate(input: ValidatorFeeAnnouncementInput): EventTemplate {
	return {
		kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
		content: '',
		tags: buildValidatorFeeAnnouncementTags(input),
		created_at: Math.floor(Date.now() / 1000),
	}
}

/**
 * Publishes a kind 30409 validator fee announcement event.
 *
 * The event is signed via the active Nostr I/O adapter and broadcast to
 * write relays. Returns the signed event on success.
 */
export async function publishValidatorAnnouncement(input: ValidatorFeeAnnouncementInput): Promise<NostrEvent> {
	const io = getNostrIo()
	const template = createValidatorAnnouncementTemplate(input)
	const signedEvent = await io.sign(template)
	await io.publish(signedEvent)
	return signedEvent
}
