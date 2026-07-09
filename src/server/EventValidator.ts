import type { NostrEvent } from '@nostr-dev-kit/ndk'
import { getPublicKey } from 'nostr-tools'
import type { EventValidationResult, AdminManager, EditorManager, BootstrapManager } from './types'
import { bytesFromHex } from '../lib/utils/keyConversion'

// Rate limiting for bid events
interface RateLimitEntry {
    count: number
    resetTime: number
}

const bidRateLimits = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_BIDS = 10

export class EventValidator {
    private appPrivateKey: string
    private adminManager: AdminManager
    private editorManager: EditorManager
    private bootstrapManager: BootstrapManager

    constructor(appPrivateKey: string, adminManager: AdminManager, editorManager: EditorManager, bootstrapManager: BootstrapManager) {
        this.appPrivateKey = appPrivateKey
        this.adminManager = adminManager
        this.editorManager = editorManager
        this.bootstrapManager = bootstrapManager
    }

    public validateEvent(event: NostrEvent): EventValidationResult {
        const eventType = this.getEventType(event)

        switch (eventType) {
            case 'setup':
                return this.validateSetupEvent(event)
            case 'adminList':
            case 'editorList':
                return this.validateRoleListEvent(event)
            case 'blacklist':
                return this.validateBlacklistEvent(event)
            case 'bid':
                return this.validateBidEvent(event)
            case 'settlement':
                return this.validateSettlementEvent(event)
            default:
                return this.validateGeneralEvent(event)
        }
    }

    private getEventType(event: NostrEvent): string {
        if (event.kind === 31990 && event.content.includes('"name":')) {
            return 'setup'
        }
        if (event.kind === 30000) {
            const dTag = event.tags.find((tag) => tag[0] === 'd')?.[1]
            if (dTag === 'admins') return 'adminList'
            if (dTag === 'editors') return 'editorList'
        }
        if (event.kind === 10000) {
            return 'blacklist'
        }
        if (event.kind === 1023) {
            return 'bid'
        }
        if (event.kind === 1024) {
            return 'settlement'
        }
        return 'general'
    }

    private validateSetupEvent(event: NostrEvent): EventValidationResult {
        try {
            const appPubkey = getPublicKey(bytesFromHex(this.appPrivateKey))

            if (!this.bootstrapManager.isBootstrapMode() && event.pubkey !== appPubkey && !this.adminManager.isAdmin(event.pubkey)) {
                return {
                    isValid: false,
                    reason: 'Setup event rejected: not in bootstrap mode and not signed by app or admin',
                }
            }
        } catch (error) {
            // Handle cases where private key is invalid/empty (like test environments)
            if (!this.bootstrapManager.isBootstrapMode() && !this.adminManager.isAdmin(event.pubkey)) {
                return {
                    isValid: false,
                    reason: 'Setup event rejected: not in bootstrap mode and not signed by app or admin',
                }
            }
        }

        return { isValid: true }
    }

    private validateRoleListEvent(event: NostrEvent): EventValidationResult {
        if (!this.bootstrapManager.isBootstrapMode() && !this.adminManager.isAdmin(event.pubkey)) {
            return {
                isValid: false,
                reason: 'Role list event rejected: not in bootstrap mode and not from admin',
            }
        }

        return { isValid: true }
    }

    private validateBlacklistEvent(event: NostrEvent): EventValidationResult {
        if (!this.adminManager.isAdmin(event.pubkey) && !this.editorManager.isEditor(event.pubkey)) {
            return {
                isValid: false,
                reason: 'Blacklist event rejected: not from admin or editor',
            }
        }

        return { isValid: true }
    }

    /**
     * Validate bid events (kind 1023) at the gateway level to prevent DoS and spam
     * This is lightweight validation - full validation happens in the auction validator
     */
    private validateBidEvent(event: NostrEvent): EventValidationResult {
        // Check rate limiting first - this should be very fast
        const rateLimitResult = this.checkBidRateLimit(event.pubkey)
        if (!rateLimitResult.isValid) {
            return rateLimitResult
        }

        // Validate structure - this catches most malformed bids quickly
        const structureResult = this.validateBidStructure(event)
        if (!structureResult.isValid) {
            return structureResult
        }

        // Validate amount format - this handles parsing consistency issues
        const amountResult = this.validateBidAmount(event)
        if (!amountResult.isValid) {
            return amountResult
        }

        return { isValid: true }
    }

    /**
     * Validate settlement events (kind 1024) at the gateway level
     */
    private validateSettlementEvent(event: NostrEvent): EventValidationResult {
        // Validate basic structure for settlements
        const structureResult = this.validateSettlementStructure(event)
        if (!structureResult.isValid) {
            return structureResult
        }

        return { isValid: true }
    }

    /**
     * Check rate limiting for bid events
     */
    private checkBidRateLimit(pubkey: string): EventValidationResult {
        const now = Math.floor(typeof Date.now === 'function' ? Date.now() : Date.now() / 1000)
        const entry = bidRateLimits.get(pubkey)

        if (entry && entry.resetTime > now) {
            if (entry.count >= RATE_LIMIT_MAX_BIDS) {
                return {
                    isValid: false,
                    reason: 'Bid rate limit exceeded: maximum 10 bids per minute',
                }
            }
            entry.count++
        } else {
            // Reset window
            bidRateLimits.set(pubkey, {
                count: 1,
                resetTime: now + RATE_LIMIT_WINDOW_SECONDS,
            })
        }

        return { isValid: true }
    }

    /**
     * Validate bid event structure
     */
    private validateBidStructure(event: NostrEvent): EventValidationResult {
        // Required tags for kind 1023 bids
        const requiredTags = ['e', 'amount', 'status', 'child_pubkey']
        const missingTags = requiredTags.filter(tag => 
            !event.tags.some(eventTag => eventTag[0] === tag)
        )

        if (missingTags.length > 0) {
            return {
                isValid: false,
                reason: `Bid validation failed: missing required tags ${missingTags.join(', ')}`,
            }
        }

        // Validate reference tag points to an auction
        const eTag = event.tags.find(tag => tag[0] === 'e')?.[1]
        if (!eTag) {
            return {
                isValid: false,
                reason: 'Bid validation failed: missing auction reference (e tag)',
            }
        }

        // Validate status tag
        const statusTag = event.tags.find(tag => tag[0] === 'status')?.[1]
        const validStatuses = ['locked', 'pending']
        if (!validStatuses.includes(statusTag)) {
            return {
                isValid: false,
                reason: `Bid validation failed: invalid status tag '${statusTag}'. Must be one of: ${validStatuses.join(', ')}`,
            }
        }

        // Validate basic event structure
        if (event.kind !== 1023) {
            return {
                isValid: false,
                reason: 'Bid validation failed: event kind must be 1023',
            }
        }

        if (!event.pubkey || !event.id) {
            return {
                isValid: false,
                reason: 'Bid validation failed: missing event pubkey or id',
            }
        }

        return { isValid: true }
    }

    /**
     * Validate settlement event structure
     */
    private validateSettlementStructure(event: NostrEvent): EventValidationResult {
        // Required tags for kind 1024 settlements
        const requiredTags = ['e', 'settlement_type']
        const missingTags = requiredTags.filter(tag => 
            !event.tags.some(eventTag => eventTag[0] === tag)
        )

        if (missingTags.length > 0) {
            return {
                isValid: false,
                reason: `Settlement validation failed: missing required tags ${missingTags.join(', ')}`,
            }
        }

        // Validate reference tag points to an auction
        const eTag = event.tags.find(tag => tag[0] === 'e')?.[1]
        if (!eTag) {
            return {
                isValid: false,
                reason: 'Settlement validation failed: missing auction reference (e tag)',
            }
        }

        // Validate settlement type
        const settlementType = event.tags.find(tag => tag[0] === 'settlement_type')?.[1]
        const validTypes = ['path_release', 'refund']
        if (!validTypes.includes(settlementType)) {
            return {
                isValid: false,
                reason: `Settlement validation failed: invalid settlement_type '${settlementType}'. Must be one of: ${validTypes.join(', ')}`,
            }
        }

        // Validate basic event structure
        if (event.kind !== 1024) {
            return {
                isValid: false,
                reason: 'Settlement validation failed: event kind must be 1024',
            }
        }

        if (!event.pubkey || !event.id) {
            return {
                isValid: false,
                reason: 'Settlement validation failed: missing event pubkey or id',
            }
        }

        return { isValid: true }
    }

    /**
     * Validate bid amount format - strict integer parsing to prevent parsing inconsistencies
     */
    private validateBidAmount(event: NostrEvent): EventValidationResult {
        const amountTag = event.tags.find(tag => tag[0] === 'amount')?.[1]
        if (!amountTag) {
            return {
                isValid: false,
                reason: 'Bid validation failed: missing amount tag',
            }
        }

        // Use strict regex validation before parseInt to prevent parsing issues
        if (!/^\d+$/.test(amountTag.trim())) {
            return {
                isValid: false,
                reason: `Bid validation failed: amount '${amountTag}' is not a valid positive integer`,
            }
        }

        const parsedAmount = parseInt(amountTag.trim(), 10)
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
            return {
                isValid: false,
                reason: `Bid validation failed: amount '${amountTag}' results in invalid number ${parsedAmount}`,
            }
        }

        // Check for minimum bid amount (optional security check)
        const MIN_BID_AMOUNT_SATS = 100 // Can be adjusted based on requirements
        if (parsedAmount < MIN_BID_AMOUNT_SATS) {
            return {
                isValid: false,
                reason: `Bid validation failed: amount ${parsedAmount} sats is below minimum of ${MIN_BID_AMOUNT_SATS} sats`,
            }
        }

        return { isValid: true }
    }

    private validateGeneralEvent(event: NostrEvent): EventValidationResult {
        if (!this.adminManager.isAdmin(event.pubkey)) {
            return {
                isValid: false,
                reason: 'General event rejected: not from admin',
            }
        }

        return { isValid: true }
    }

    /**
     * Clean up old rate limit entries to prevent memory leaks
     */
    public cleanupRateLimits(): void {
        const now = Math.floor(typeof Date.now === 'function' ? Date.now() : Date.now() / 1000)
        // Convert to array to avoid iterator issues with older TypeScript targets
        const entries: [string, RateLimitEntry][] = []
        for (const [key, value] of bidRateLimits.entries()) {
            entries.push([key, value])
        }
        
        for (const [pubkey, entry] of entries) {
            if (entry.resetTime < now) {
                bidRateLimits.delete(pubkey)
            }
        }
    }

    /**
     * Get current rate limit status for a pubkey (for monitoring)
     */
    public getRateLimitStatus(pubkey: string): { isValid: boolean; count: number; resetTime: number } | null {
        const entry = bidRateLimits.get(pubkey)
        if (!entry) return null

        const now = Math.floor(typeof Date.now === 'function' ? Date.now() : Date.now() / 1000)
        if (entry.resetTime < now) {
            bidRateLimits.delete(pubkey)
            return null
        }

        return {
            isValid: entry.count < RATE_LIMIT_MAX_BIDS,
            count: entry.count,
            resetTime: entry.resetTime,
        }
    }
}