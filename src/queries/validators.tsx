/**
 * Query hooks for discovering V4V auction validators (kind 30409 events).
 *
 * Fetches validator fee announcements from relays via `src/lib/nostr/io.ts`
 * (per ADR-0002 — no `@nostr-dev-kit` imports in new code), parses them with
 * the Zod schema, and filters by mint / auction_type / locking_scheme
 * compatibility so the caller only sees validators that can service their
 * auction.
 *
 * @see src/lib/schemas/validator-fee-announcement.ts
 * @see src/lib/nostr/io.ts
 */

import { useQuery } from '@tanstack/react-query'
import { getNostrIo, type NostrEvent } from '@/lib/nostr/io'
import { VALIDATOR_FEE_ANNOUNCEMENT_KIND } from '@/lib/schemas/auction-kinds'
import { parseValidatorFeeAnnouncement, type ValidatorFeeAnnouncement } from '@/lib/schemas/validator-fee-announcement'
import { validatorKeys } from './queryKeyFactory'

// ---------------------------------------------------------------------------
// Filtering helpers (pure — no side effects, no network)
// ---------------------------------------------------------------------------

/** Options for narrowing the validator list to those compatible with an auction. */
export interface ValidatorFilterOptions {
	/** Only return validators supporting this mint URL. */
	mintUrl?: string
	/** Only return validators supporting this auction format (e.g. "english"). */
	auctionType?: string
	/** Only return validators supporting this locking scheme (e.g. "P2PK"). */
	lockingScheme?: string
}

/**
 * Filters a list of parsed validator announcements by compatibility.
 * A validator is compatible when it supports every criterion that was
 * specified — unspecified criteria are not checked.
 */
export function filterCompatibleValidators(
	validators: ValidatorFeeAnnouncement[],
	opts: ValidatorFilterOptions,
): ValidatorFeeAnnouncement[] {
	return validators.filter((v) => {
		if (opts.mintUrl && !v.mints.includes(opts.mintUrl)) return false
		if (opts.auctionType && v.auctionType !== undefined && v.auctionType !== opts.auctionType) return false
		if (opts.lockingScheme && v.lockingScheme !== undefined && v.lockingScheme !== opts.lockingScheme) return false
		return true
	})
}

// ---------------------------------------------------------------------------
// Fetch (async — routes through the I/O port)
// ---------------------------------------------------------------------------

/**
 * Fetches and parses all kind 30409 validator announcements from relays.
 * Returns only well-formed announcements (malformed events are silently
 * discarded — relay data is untrusted per src/queries/AGENTS.md).
 *
 * If a filter is provided the result is narrowed to compatible validators.
 */
export async function fetchValidators(opts?: ValidatorFilterOptions): Promise<ValidatorFeeAnnouncement[]> {
	const io = getNostrIo()
	const events = await io.fetchEvents({ kinds: [VALIDATOR_FEE_ANNOUNCEMENT_KIND] })

	const parsed: ValidatorFeeAnnouncement[] = []
	for (const event of events) {
		const announcement = parseValidatorFeeAnnouncement(event as unknown as NostrEvent)
		if (announcement) parsed.push(announcement)
	}

	// Deduplicate by NIP-33 coordinate (pubkey + d tag), keeping the most recent
	// (latest created_at wins). A bare d tag is not a unique validator identity —
	// any pubkey can publish a kind 30409 with the same d value, so the dedup key
	// must include the author's pubkey to prevent d-tag squatting.
	const byCoordinate = new Map<string, ValidatorFeeAnnouncement>()
	for (const v of parsed) {
		const coordinate = `${v.pubkey}:${v.validatorId}`
		const existing = byCoordinate.get(coordinate)
		if (!existing || v.createdAt > existing.createdAt) {
			byCoordinate.set(coordinate, v)
		}
	}
	const deduped = Array.from(byCoordinate.values())

	return opts ? filterCompatibleValidators(deduped, opts) : deduped
}

/**
 * Fetches a single validator by its NIP-33 coordinate (pubkey + d-tag).
 * Returns `null` when the validator is not found or malformed.
 */
export async function fetchValidatorById(pubkey: string, validatorId: string): Promise<ValidatorFeeAnnouncement | null> {
	const io = getNostrIo()
	const events = await io.fetchEvents({
		kinds: [VALIDATOR_FEE_ANNOUNCEMENT_KIND],
		authors: [pubkey],
		'#d': [validatorId],
	})

	const coordinate = `${pubkey}:${validatorId}`
	let best: ValidatorFeeAnnouncement | null = null
	for (const event of events) {
		const announcement = parseValidatorFeeAnnouncement(event as unknown as NostrEvent)
		if (announcement && `${announcement.pubkey}:${announcement.validatorId}` === coordinate) {
			if (!best || announcement.createdAt > best.createdAt) {
				best = announcement
			}
		}
	}
	return best
}

// ---------------------------------------------------------------------------
// React hooks (TanStack Query)
// ---------------------------------------------------------------------------

/**
 * Discovers validators, optionally filtered by mint / auction_type /
 * locking_scheme compatibility.
 */
export function useValidators(opts?: ValidatorFilterOptions) {
	return useQuery({
		queryKey: validatorKeys.compatible({
			mintUrl: opts?.mintUrl,
			auctionType: opts?.auctionType,
			lockingScheme: opts?.lockingScheme,
		}),
		queryFn: () => fetchValidators(opts ?? {}),
		staleTime: 1000 * 60 * 5, // 5 minutes — validator announcements are relatively stable
	})
}

/** Fetches a single validator announcement by its NIP-33 coordinate. */
export function useValidator(pubkey: string, validatorId: string) {
	return useQuery({
		queryKey: validatorKeys.details(pubkey, validatorId),
		queryFn: () => fetchValidatorById(pubkey, validatorId),
		enabled: !!pubkey && !!validatorId,
		staleTime: 1000 * 60 * 5,
	})
}
