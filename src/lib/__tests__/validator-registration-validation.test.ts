import { describe, expect, test } from 'bun:test'
import {
	bpsToPercentage,
	daysToSeconds,
	MAX_FEE_BPS,
	MIN_FEE_BPS,
	validateFeeBps,
	validateMints,
	validateRegistration,
	type ValidatorRegistrationFormState,
} from '@/components/auctions/ValidatorRegistration'

const MINT_A = 'https://mint-a.example.com'
const MINT_B = 'https://mint-b.example.com'

function makeValidState(overrides: Partial<ValidatorRegistrationFormState> = {}): ValidatorRegistrationFormState {
	return {
		validatorId: 'validator-1',
		feeMinBps: 100,
		mints: [MINT_A],
		auctionType: '',
		lockingScheme: '',
		maxDurationDays: 30,
		...overrides,
	}
}

// ---------------------------------------------------------------------------
// Fee validation
// ---------------------------------------------------------------------------

describe('Validator registration — fee validation', () => {
	test('MIN_FEE_BPS is 1 and MAX_FEE_BPS is 10000', () => {
		expect(MIN_FEE_BPS).toBe(1)
		expect(MAX_FEE_BPS).toBe(10000)
	})

	test('accepts the minimum fee of 1 bps (0.01%)', () => {
		expect(validateFeeBps(1)).toBeNull()
	})

	test('accepts the maximum fee of 10000 bps (100%)', () => {
		expect(validateFeeBps(10000)).toBeNull()
	})

	test('accepts a typical fee of 100 bps (1%)', () => {
		expect(validateFeeBps(100)).toBeNull()
	})

	test('rejects 0 bps', () => {
		expect(validateFeeBps(0)).not.toBeNull()
	})

	test('rejects negative fees', () => {
		expect(validateFeeBps(-5)).not.toBeNull()
	})

	test('rejects fees above 10000', () => {
		expect(validateFeeBps(10001)).not.toBeNull()
	})

	test('rejects non-integer fees', () => {
		expect(validateFeeBps(1.5)).not.toBeNull()
	})

	test('rejects NaN / non-finite fees', () => {
		expect(validateFeeBps(NaN)).not.toBeNull()
		expect(validateFeeBps(Infinity)).not.toBeNull()
	})
})

// ---------------------------------------------------------------------------
// Mint URL validation
// ---------------------------------------------------------------------------

describe('Validator registration — mint URL validation', () => {
	test('rejects an empty mint list (at least 1 required)', () => {
		expect(validateMints([])).not.toBeNull()
	})

	test('accepts a single valid mint URL', () => {
		expect(validateMints([MINT_A])).toBeNull()
	})

	test('accepts multiple valid mint URLs', () => {
		expect(validateMints([MINT_A, MINT_B])).toBeNull()
	})

	test('rejects an invalid URL', () => {
		expect(validateMints(['not-a-url'])).not.toBeNull()
	})

	test('rejects when the list contains one valid and one invalid URL', () => {
		expect(validateMints([MINT_A, 'also-not-a-url'])).not.toBeNull()
	})
})

// ---------------------------------------------------------------------------
// Full-form validation
// ---------------------------------------------------------------------------

describe('Validator registration — full form validation', () => {
	test('passes with all valid required fields', () => {
		const errors = validateRegistration(makeValidState())
		expect(Object.keys(errors)).toHaveLength(0)
	})

	test('fails when validatorId is empty', () => {
		const errors = validateRegistration(makeValidState({ validatorId: '' }))
		expect(errors.validatorId).toBeDefined()
	})

	test('fails when validatorId is whitespace only', () => {
		const errors = validateRegistration(makeValidState({ validatorId: '   ' }))
		expect(errors.validatorId).toBeDefined()
	})

	test('fails when fee is below the minimum', () => {
		const errors = validateRegistration(makeValidState({ feeMinBps: 0 }))
		expect(errors.feeMinBps).toBeDefined()
	})

	test('fails when fee is above the maximum', () => {
		const errors = validateRegistration(makeValidState({ feeMinBps: 10001 }))
		expect(errors.feeMinBps).toBeDefined()
	})

	test('fails when no mints are provided', () => {
		const errors = validateRegistration(makeValidState({ mints: [] }))
		expect(errors.mints).toBeDefined()
	})

	test('fails when max duration is non-positive', () => {
		const errors = validateRegistration(makeValidState({ maxDurationDays: 0 }))
		expect(errors.maxDurationDays).toBeDefined()
	})

	test('passes when optional fields are populated', () => {
		const errors = validateRegistration(makeValidState({ auctionType: 'english', lockingScheme: 'P2PK', maxDurationDays: 7 }))
		expect(Object.keys(errors)).toHaveLength(0)
	})
})

// ---------------------------------------------------------------------------
// Unit conversion helpers
// ---------------------------------------------------------------------------

describe('Validator registration — unit conversions', () => {
	test('bpsToPercentage converts basis points to a percentage string', () => {
		expect(bpsToPercentage(0)).toBe('0.00%')
		expect(bpsToPercentage(1)).toBe('0.01%')
		expect(bpsToPercentage(100)).toBe('1.00%')
		expect(bpsToPercentage(10000)).toBe('100.00%')
	})

	test('daysToSeconds converts days to seconds (30 days = 2592000)', () => {
		expect(daysToSeconds(30)).toBe(2_592_000)
		expect(daysToSeconds(1)).toBe(86_400)
		expect(daysToSeconds(7)).toBe(604_800)
	})
})
