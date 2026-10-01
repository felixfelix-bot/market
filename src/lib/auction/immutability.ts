import type { NostrEventLike } from '../nostr/eventLike'
import { AUCTION_IMMUTABLE_MULTI_TAGS, AUCTION_IMMUTABLE_SINGLE_TAGS } from './constants'

const getAuctionTagValues = (event: NostrEventLike, tagName: string): string[] =>
	event.tags.filter((tag) => tag[0] === tagName && !!tag[1]).map((tag) => tag[1] || '')

/**
 * ALL values carried by every occurrence of `tagName`, in tag order,
 * empty values included.
 *
 * B3 (PR #1280 review 5235113240): the immutable-single-tag comparison must
 * mirror the STRICT single reader (`readDleqRequiredTag`): a candidate that
 * appends a second, dropping, or empty occurrence of an immutable tag is
 * non-canonical and must NOT compare equal to a root that carries one clean
 * occurrence — even when the FIRST values happen to match. Comparing only the
 * first value (`getAuctionTagValue`) let a replacement carrying
 * `[dleq_required,1],[dleq_required,0]` pass the immutability filter while the
 * strict reader classifies it non-canonical: two readers, two answers.
 */
const getAuctionTagValuesStrict = (event: NostrEventLike, tagName: string): string[] =>
	event.tags.filter((tag) => tag[0] === tagName).map((tag) => tag[1] ?? '')

const normalizeComparableValueList = (values: string[]): string[] =>
	Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right))

export const auctionImmutableFieldsMatch = (rootEvent: NostrEventLike, candidateEvent: NostrEventLike): boolean => {
	for (const tagName of AUCTION_IMMUTABLE_SINGLE_TAGS) {
		// Strict mirror (B3): compare the full ordered occurrence list, not the
		// first value — duplicate/extra/dropped/empty occurrences of an
		// immutable single tag are non-canonical and fail the match.
		const rootValues = getAuctionTagValuesStrict(rootEvent, tagName)
		const candidateValues = getAuctionTagValuesStrict(candidateEvent, tagName)
		if (rootValues.length !== candidateValues.length) return false
		if (rootValues.some((value, index) => value !== candidateValues[index])) return false
	}

	for (const tagName of AUCTION_IMMUTABLE_MULTI_TAGS) {
		const rootValues = normalizeComparableValueList(getAuctionTagValues(rootEvent, tagName))
		const candidateValues = normalizeComparableValueList(getAuctionTagValues(candidateEvent, tagName))
		if (rootValues.length !== candidateValues.length) return false
		if (rootValues.some((value, index) => value !== candidateValues[index])) return false
	}

	return true
}
