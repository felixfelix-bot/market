/**
 * Lightweight bid event pre-filter to prevent DoS attacks from malicious bid events.
 * This runs before registry lookup and filters out obviously malformed or spam bids.
 * 
 * Designed to address Issue #1112 - No relay-level bid validation spam/DoS via raw kind-1023 events.
 * 
 * @param bid The raw Nostr bid event to validate
 * @returns true if the bid should proceed to full validation, false if it should be rejected immediately
 */
export const bidEventPreFilter = (bid: NostrEvent): boolean => {
    // Basic structure validation
    if (!bid.kind || bid.kind !== 1023) {
        return false
    }

    if (!bid.pubkey || !bid.id || !bid.tags) {
        return false
    }

    // Required tags for kind 1023 bids
    const requiredTags = ['e', 'amount', 'status', 'child_pubkey']
    const missingTags = requiredTags.filter(tag => 
        !bid.tags.some(eventTag => eventTag[0] === tag)
    )

    if (missingTags.length > 0) {
        return false
    }

    // Validate reference tag points to an auction
    const eTag = bid.tags.find(tag => tag[0] === 'e')?.[1]
    if (!eTag) {
        return false
    }

    // Validate status tag
    const statusTag = bid.tags.find(tag => tag[0] === 'status')?.[1]
    const validStatuses = ['locked', 'pending']
    if (!validStatuses.includes(statusTag)) {
        return false
    }

    // Validate bid amount format - strict integer parsing to prevent parsing inconsistencies
    const amountTag = bid.tags.find(tag => tag[0] === 'amount')?.[1]
    if (!amountTag) {
        return false
    }

    // Use strict regex validation before parseInt to prevent parsing issues
    if (!/^\d+$/.test(amountTag.trim())) {
        return false
    }

    const parsedAmount = parseInt(amountTag.trim(), 10)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        return false
    }

    // Optional: Check for minimum bid amount to prevent spam bids
    const MIN_BID_AMOUNT_SATS = 100
    if (parsedAmount < MIN_BID_AMOUNT_SATS) {
        return false
    }

    // Basic timestamp validation
    if (!bid.created_at || bid.created_at < 0) {
        return false
    }

    // All checks passed - bid should proceed to full validation
    return true
}

/**
 * Settlement event pre-filter to validate settlement events at the gateway level.
 * 
 * @param settlement The raw Nostr settlement event to validate  
 * @returns true if the settlement should proceed to full validation, false if it should be rejected immediately
 */
export const settlementEventPreFilter = (settlement: NostrEvent): boolean => {
    // Basic structure validation
    if (!settlement.kind || settlement.kind !== 1024) {
        return false
    }

    if (!settlement.pubkey || !settlement.id || !settlement.tags) {
        return false
    }

    // Required tags for kind 1024 settlements
    const requiredTags = ['e', 'settlement_type']
    const missingTags = requiredTags.filter(tag => 
        !settlement.tags.some(eventTag => eventTag[0] === tag)
    )

    if (missingTags.length > 0) {
        return false
    }

    // Validate reference tag points to an auction
    const eTag = settlement.tags.find(tag => tag[0] === 'e')?.[1]
    if (!eTag) {
        return false
    }

    // Validate settlement type
    const settlementType = settlement.tags.find(tag => tag[0] === 'settlement_type')?.[1]
    const validTypes = ['path_release', 'refund']
    if (!validTypes.includes(settlementType)) {
        return false
    }

    // Basic timestamp validation
    if (!settlement.created_at || settlement.created_at < 0) {
        return false
    }

    // All checks passed - settlement should proceed to full validation
    return true
}

/**
 * Comprehensive bid event validation function that combines structure validation
 * with stricter business rules.
 * 
 * Designed to address Issue #1113 - Bid amount parsing is non-strict — parseInt accepts trailing garbage
 * 
 * @param bid The raw Nostr bid event to validate
 * @returns ValidationResult object with validation status and error details
 */
export interface BidPreFilterValidationResult {
    isValid: boolean
    reason?: string
    detail?: string
}

export const bidPreFilterValidation = (bid: NostrEvent): BidPreFilterValidationResult => {
    // Basic structure checks
    if (!bid.kind || bid.kind !== 1023) {
        return {
            isValid: false,
            reason: 'invalid_kind',
            detail: 'Event kind must be 1023 for bids'
        }
    }

    if (!bid.pubkey || !bid.id || !bid.tags) {
        return {
            isValid: false,
            reason: 'missing_required_fields',
            detail: 'Bid event is missing pubkey, id, or tags'
        }
    }

    // Validate all required tags are present
    const requiredTags = ['e', 'amount', 'status', 'child_pubkey']
    const missingTags = requiredTags.filter(tag => 
        !bid.tags!.some(eventTag => eventTag[0] === tag)
    )

    if (missingTags.length > 0) {
        return {
            isValid: false,
            reason: 'missing_required_tags',
            detail: `Missing required tags: ${missingTags.join(', ')}`
        }
    }

    // Validate auction reference
    const eTag = bid.tags.find(tag => tag[0] === 'e')?.[1]
    if (!eTag || eTag.length === 0) {
        return {
            isValid: false,
            reason: 'invalid_auction_reference',
            detail: 'Missing or empty auction reference (e tag)'
        }
    }

    // Validate status
    const statusTag = bid.tags.find(tag => tag[0] === 'status')?.[1]
    const validStatuses = ['locked', 'pending']
    if (!validStatuses.includes(statusTag)) {
        return {
            isValid: false,
            reason: 'invalid_status',
            detail: `Status must be one of: ${validStatuses.join(', ')}, got: ${statusTag}`
        }
    }

    // Strict amount validation (Issue #1113 fix)
    const amountTag = bid.tags.find(tag => tag[0] === 'amount')?.[1]
    if (!amountTag) {
        return {
            isValid: false,
            reason: 'missing_amount',
            detail: 'Bid event is missing amount tag'
        }
    }

    // Use strict regex to prevent parseInt issues with trailing garbage
    if (!/^\d+$/.test(amountTag.trim())) {
        return {
            isValid: false,
            reason: 'invalid_amount_format',
            detail: `Amount '${amountTag}' is not a valid positive integer (trailing garbage, scientific notation, etc. not allowed)`
        }
    }

    const parsedAmount = parseInt(amountTag.trim(), 10)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        return {
            isValid: false,
            reason: 'invalid_amount_value',
            detail: `Parsed amount ${parsedAmount} is not a valid finite positive number`
        }
    }

    // Minimum bid check to prevent spam
    const MIN_BID_AMOUNT_SATS = 100
    if (parsedAmount < MIN_BID_AMOUNT_SATS) {
        return {
            isValid: false,
            reason: 'amount_too_small',
            detail: `Bid amount ${parsedAmount} sats is below minimum of ${MIN_BID_AMOUNT_SATS} sats`
        }
    }

    // Maximum bid check to prevent absurd amounts
    const MAX_BID_AMOUNT_SATS = 10000000000 // 10 billion sats
    if (parsedAmount > MAX_BID_AMOUNT_SATS) {
        return {
            isValid: false,
            reason: 'amount_too_large',
            detail: `Bid amount ${parsedAmount} sats exceeds maximum of ${MAX_BID_AMOUNT_SATS} sats`
        }
    }

    // Validate child_pubkey format (basic check)
    const childPubkey = bid.tags.find(tag => tag[0] === 'child_pubkey')?.[1]
    if (!childPubkey || childPubkey.length < 10) {
        return {
            isValid: false,
            reason: 'invalid_child_pubkey',
            detail: 'Child pubkey is missing or too short'
        }
    }

    // Timestamp validation
    if (!bid.created_at || bid.created_at < 0) {
        return {
            isValid: false,
            reason: 'invalid_timestamp',
            detail: 'Bid has invalid timestamp'
        }
    }

    // All checks passed
    return { isValid: true }
}

/**
 * Settlement event validation function with strict rules.
 */
export const settlementPreFilterValidation = (settlement: NostrEvent): BidPreFilterValidationResult => {
    // Basic structure checks
    if (!settlement.kind || settlement.kind !== 1024) {
        return {
            isValid: false,
            reason: 'invalid_kind',
            detail: 'Event kind must be 1024 for settlements'
        }
    }

    if (!settlement.pubkey || !settlement.id || !settlement.tags) {
        return {
            isValid: false,
            reason: 'missing_required_fields',
            detail: 'Settlement event is missing pubkey, id, or tags'
        }
    }

    // Validate all required tags are present
    const requiredTags = ['e', 'settlement_type']
    const missingTags = requiredTags.filter(tag => 
        !settlement.tags!.some(eventTag => eventTag[0] === tag)
    )

    if (missingTags.length > 0) {
        return {
            isValid: false,
            reason: 'missing_required_tags',
            detail: `Missing required tags: ${missingTags.join(', ')}`
        }
    }

    // Validate auction reference
    const eTag = settlement.tags.find(tag => tag[0] === 'e')?.[1]
    if (!eTag || eTag.length === 0) {
        return {
            isValid: false,
            reason: 'invalid_auction_reference',
            detail: 'Missing or empty auction reference (e tag)'
        }
    }

    // Validate settlement type
    const settlementType = settlement.tags.find(tag => tag[0] === 'settlement_type')?.[1]
    const validTypes = ['path_release', 'refund']
    if (!validTypes.includes(settlementType)) {
        return {
            isValid: false,
            reason: 'invalid_settlement_type',
            detail: `Settlement type must be one of: ${validTypes.join(', ')}, got: ${settlementType}`
        }
    }

    // Basic timestamp validation
    if (!settlement.created_at || settlement.created_at < 0) {
        return {
            isValid: false,
            reason: 'invalid_timestamp',
            detail: 'Settlement has invalid timestamp'
        }
    }

    // All checks passed
    return { isValid: true }
}