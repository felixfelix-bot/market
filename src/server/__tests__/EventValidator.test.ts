import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { EventValidator } from '../EventValidator'
import type { AdminManager, EditorManager, BootstrapManager } from '../types'

// Mock implementations with all required methods
const createMockAdminManager = (): AdminManager => ({
    isAdmin: (pubkey: string) => pubkey === 'admin-pubkey',
    addAdmin: (pubkey: string) => {},
    getAdmins: () => new Set(['admin-pubkey']),
    updateFromEvent: (event) => {},
})

const createMockEditorManager = (): EditorManager => ({
    isEditor: (pubkey: string) => pubkey === 'editor-pubkey',
    addEditor: (pubkey: string) => {},
    getEditors: () => new Set(['editor-pubkey']),
    updateFromEvent: (event) => {},
})

const createMockBootstrapManager = (): BootstrapManager => ({
    isBootstrapMode: () => false,
    exitBootstrapMode: () => {},
    handleSetupEvent: (event) => {},
    hasSetup: () => false,
})

// Fixed createMockEvent function with proper timestamp handling
const createMockEvent = (overrides: Partial<any> = {}) => {
    const now = Math.floor(typeof Date.now === 'function' ? Date.now() : Date.now() / 1000)
    
    return {
        kind: 1023,
        pubkey: 'test-pubkey',
        id: 'test-id',
        content: '{}',
        tags: [],
        created_at: now,
        ...overrides,
    }
}

describe('EventValidator', () => {
    let validator: EventValidator
    let adminManager: AdminManager
    let editorManager: EditorManager
    let bootstrapManager: BootstrapManager

    beforeEach(() => {
        adminManager = createMockAdminManager()
        editorManager = createMockEditorManager()
        bootstrapManager = createMockBootstrapManager()
        validator = new EventValidator('test-private-key', adminManager, editorManager, bootstrapManager)
    })

    afterEach(() => {
        // Clean up rate limits between tests
        validator.cleanupRateLimits()
    })

    describe('Event Type Detection', () => {
        it('should detect setup events', () => {
            const event = createMockEvent({ kind: 31990, content: '{"name": "test"}' })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false) // Not in bootstrap mode
            expect(result.reason).toContain('not in bootstrap mode and not signed by app or admin')
        })

        it('should detect admin list events', () => {
            const event = createMockEvent({ kind: 30000, tags: [['d', 'admins']] })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false) // Not in bootstrap mode
        })

        it('should detect editor list events', () => {
            const event = createMockEvent({ kind: 30000, tags: [['d', 'editors']] })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false) // Not in bootstrap mode
        })

        it('should detect blacklist events', () => {
            const event = createMockEvent({ kind: 10000 })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false) // Not admin or editor
        })

        it('should detect bid events', () => {
            const event = createMockEvent({ kind: 1023 })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false) // Missing required tags
            expect(result.reason).toContain('missing required tags')
        })

        it('should detect settlement events', () => {
            const event = createMockEvent({ kind: 1024 })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false) // Missing required tags
            expect(result.reason).toContain('missing required tags')
        })

        it('should detect general events', () => {
            const event = createMockEvent({ kind: 999 })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false) // Not admin
            expect(result.reason).toContain('not from admin')
        })
    })

    describe('Bid Event Validation', () => {
        it('should accept valid bid events', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })

        it('should reject bid events with missing e tag', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('missing required tags')
        })

        it('should reject bid events with missing amount tag', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('missing required tags')
        })

        it('should reject bid events with missing status tag', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('missing required tags')
        })

        it('should reject bid events with missing child_pubkey tag', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('missing required tags')
        })

        it('should reject bid events with invalid status', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'invalid'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('invalid status tag')
        })

        it('should reject bid events with invalid kind', () => {
            const event = createMockEvent({
                kind: 999,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('event kind must be 1023')
        })

        it('should reject bid events with missing pubkey', () => {
            const event = createMockEvent({
                kind: 1023,
                pubkey: '',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('missing event pubkey or id')
        })

        it('should reject bid events with missing id', () => {
            const event = createMockEvent({
                kind: 1023,
                id: '',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('missing event pubkey or id')
        })
    })

    describe('Bid Amount Validation', () => {
        it('should accept valid amounts', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })

        it('should reject amounts with trailing garbage', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000abc'], // Trailing garbage
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('is not a valid positive integer')
        })

        it('should reject scientific notation amounts', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1e3'], // Scientific notation
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('is not a valid positive integer')
        })

        it('should reject hexadecimal amounts', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '0x3e8'], // Hexadecimal
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('is not a valid positive integer')
        })

        it('should reject negative amounts', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '-1000'], // Negative
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('is not a valid positive integer')
        })

        it('should reject amounts with leading zeros', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '01000'], // Leading zeros
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('is not a valid positive integer')
        })

        it('should reject non-numeric amounts', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', 'thousand'], // Non-numeric
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('is not a valid positive integer')
        })

        it('should reject amounts below minimum', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '50'], // Below minimum of 100
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('amount 50 sats is below minimum of 100 sats')
        })

        it('should accept minimum bid amount', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '100'], // Exactly minimum
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })

        it('should accept large valid amounts', () => {
            const event = createMockEvent({
                kind: 1023,
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000000000'], // Large amount
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })
    })

    describe('Settlement Event Validation', () => {
        it('should accept valid settlement events', () => {
            const event = createMockEvent({
                kind: 1024,
                tags: [
                    ['e', 'auction-event-id'],
                    ['settlement_type', 'path_release']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })

        it('should reject settlement events with missing e tag', () => {
            const event = createMockEvent({
                kind: 1024,
                tags: [['settlement_type', 'path_release']]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('missing required tags')
        })

        it('should reject settlement events with missing settlement_type tag', () => {
            const event = createMockEvent({
                kind: 1024,
                tags: [['e', 'auction-event-id']]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('missing required tags')
        })

        it('should reject settlement events with invalid settlement_type', () => {
            const event = createMockEvent({
                kind: 1024,
                tags: [
                    ['e', 'auction-event-id'],
                    ['settlement_type', 'invalid']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('invalid settlement_type')
        })

        it('should accept path_release settlement type', () => {
            const event = createMockEvent({
                kind: 1024,
                tags: [
                    ['e', 'auction-event-id'],
                    ['settlement_type', 'path_release']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })

        it('should accept refund settlement type', () => {
            const event = createMockEvent({
                kind: 1024,
                tags: [
                    ['e', 'auction-event-id'],
                    ['settlement_type', 'refund']
                ]
            })
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })
    })

    describe('Rate Limiting', () => {
        it('should allow initial bid events', () => {
            const event = createMockEvent({
                kind: 1023,
                pubkey: 'test-user',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })
            
            const result1 = validator.validateEvent(event)
            expect(result1.isValid).toBe(true)
            
            // Same event again should still be allowed within rate limit
            const result2 = validator.validateEvent(event)
            expect(result2.isValid).toBe(true)
        })

        it('should reject bid events after rate limit exceeded', () => {
            const event = createMockEvent({
                kind: 1023,
                pubkey: 'test-user',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })

            // Send 10 bids (rate limit)
            for (let i = 0; i < 10; i++) {
                const result = validator.validateEvent(event)
                expect(result.isValid).toBe(true)
            }

            // 11th bid should be rejected
            const result11th = validator.validateEvent(event)
            expect(result11th.isValid).toBe(false)
            expect(result11th.reason).toContain('rate limit exceeded')
        })

        it('should handle different pubkeys independently', () => {
            const event1 = createMockEvent({
                kind: 1023,
                pubkey: 'user1',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })

            const event2 = createMockEvent({
                kind: 1023,
                pubkey: 'user2',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })

            // Both users should be able to send 10 bids each
            for (let i = 0; i < 10; i++) {
                expect(validator.validateEvent(event1).isValid).toBe(true)
                expect(validator.validateEvent(event2).isValid).toBe(true)
            }

            // 11th bid for either should be rejected
            expect(validator.validateEvent(event1).isValid).toBe(false)
            expect(validator.validateEvent(event2).isValid).toBe(false)
        })

        it('should reset rate limit after window expires (simulated)', () => {
            const event = createMockEvent({
                kind: 1023,
                pubkey: 'test-user',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })

            // Send 10 bids to hit rate limit
            for (let i = 0; i < 10; i++) {
                validator.validateEvent(event)
            }

            // 11th should be rejected immediately
            let result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)

            // Clean up and reset rate limits
            validator.cleanupRateLimits()

            // After cleanup, create a new validator instance to simulate time passing
            const newValidator = new EventValidator('test-private-key', adminManager, editorManager, bootstrapManager)
            
            // Now the user should be able to send bids again
            result = newValidator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })
    })

    describe('Rate Limit Monitoring', () => {
        it('should return null for unknown pubkey', () => {
            const status = validator.getRateLimitStatus('unknown-pubkey')
            expect(status).toBeNull()
        })

        it('should return current rate limit status', () => {
            const event = createMockEvent({
                kind: 1023,
                pubkey: 'test-user',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })

            validator.validateEvent(event) // Send one bid

            const status = validator.getRateLimitStatus('test-user')
            expect(status).not.toBeNull()
            expect(status!.isValid).toBe(true)
            expect(status!.count).toBe(1)
            expect(status!.resetTime).toBeGreaterThan(Math.floor(typeof Date.now === 'function' ? Date.now() : Date.now() / 1000))
        })

        it('should reflect rate limit status correctly', () => {
            const event = createMockEvent({
                kind: 1023,
                pubkey: 'test-user',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })

            // Send 5 bids
            for (let i = 0; i < 5; i++) {
                validator.validateEvent(event)
            }

            let status = validator.getRateLimitStatus('test-user')
            expect(status!.isValid).toBe(true)
            expect(status!.count).toBe(5)

            // Send 5 more to hit limit
            for (let i = 0; i < 5; i++) {
                validator.validateEvent(event)
            }

            status = validator.getRateLimitStatus('test-user')
            expect(status!.isValid).toBe(false)
            expect(status!.count).toBe(10)
        })
    })

    describe('Rate Limit Cleanup', () => {
        it('should not affect existing entries', () => {
            const event = createMockEvent({
                kind: 1023,
                pubkey: 'test-user',
                tags: [
                    ['e', 'auction-event-id'],
                    ['amount', '1000'],
                    ['status', 'locked'],
                    ['child_pubkey', 'child-pubkey']
                ]
            })

            // Send a bid to create rate limit entry
            validator.validateEvent(event)

            // Should have status before cleanup
            let status = validator.getRateLimitStatus('test-user')
            expect(status).not.toBeNull()

            // Cleanup should not remove active entries
            validator.cleanupRateLimits()

            // Status should still exist
            status = validator.getRateLimitStatus('test-user')
            expect(status).not.toBeNull()
        })
    })

    describe('Admin Events', () => {
        it('should accept events from admin in bootstrap mode', () => {
            bootstrapManager.isBootstrapMode = () => true
            
            const event = createMockEvent({
                kind: 999, // General event
                pubkey: 'admin-pubkey'
            })
            
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(true)
        })

        it('should reject events from non-admin in general mode', () => {
            const event = createMockEvent({
                kind: 999, // General event
                pubkey: 'regular-user'
            })
            
            const result = validator.validateEvent(event)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('not from admin')
        })
    })
})