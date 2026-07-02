import { describe, expect, test } from 'bun:test'
import { getP2PKLocktime, getP2PKRefundPubkeys } from './cashu'

describe('getP2PKLocktime', () => {
	test('extracts locktime from valid P2PK secret string', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['locktime', '1700000000']] }])
		expect(getP2PKLocktime(secret)).toBe(1700000000)
	})

	test('returns Infinity when no locktime tag present', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def' }])
		expect(getP2PKLocktime(secret)).toBe(Infinity)
	})

	test('returns Infinity when tags array is empty', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [] }])
		expect(getP2PKLocktime(secret)).toBe(Infinity)
	})

	test('handles Uint8Array input', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['locktime', '1700000000']] }])
		const encoded = new TextEncoder().encode(secret)
		expect(getP2PKLocktime(encoded)).toBe(1700000000)
	})

	test('throws for non-P2PK secret', () => {
		const secret = JSON.stringify(['OTHER', { nonce: 'abc', data: 'def' }])
		expect(() => getP2PKLocktime(secret)).toThrow('Invalid P2PK secret')
	})

	test('throws for unparseable secret', () => {
		expect(() => getP2PKLocktime('not-json')).toThrow()
	})

	test('handles locktime tag with empty value', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['locktime']] }])
		expect(getP2PKLocktime(secret)).toBe(Infinity)
	})

	test('parses locktime as integer from string', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['locktime', '1700000000']] }])
		const result = getP2PKLocktime(secret)
		expect(Number.isInteger(result)).toBe(true)
	})

	test('handles multiple tags, finds locktime', () => {
		const secret = JSON.stringify([
			'P2PK',
			{
				nonce: 'abc',
				data: 'def',
				tags: [
					['sigflag', 'SIG_ALL'],
					['locktime', '1700000001'],
				],
			},
		])
		expect(getP2PKLocktime(secret)).toBe(1700000001)
	})

	test('handles SecretData with additional unknown fields', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['locktime', '1700000002']], custom: 'field' }])
		expect(getP2PKLocktime(secret)).toBe(1700000002)
	})
})

describe('getP2PKRefundPubkeys', () => {
	test('extracts a single refund pubkey from a refund tag', () => {
		const refund = '02b72fc0f74836f2066957875bc0e48c6fe734f537117c8fc80d4a365a84f31712'
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['refund', refund]] }])
		expect(getP2PKRefundPubkeys(secret)).toEqual([refund])
	})

	test('extracts multiple refund pubkeys from multiple refund tags', () => {
		const a = '02' + 'aa'.repeat(32)
		const b = '03' + 'bb'.repeat(32)
		const secret = JSON.stringify([
			'P2PK',
			{
				nonce: 'abc',
				data: 'def',
				tags: [
					['refund', a],
					['refund', b],
				],
			},
		])
		expect(getP2PKRefundPubkeys(secret)).toEqual([a, b])
	})

	test('returns [] when no refund tag present', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['locktime', '1700000000']] }])
		expect(getP2PKRefundPubkeys(secret)).toEqual([])
	})

	test('returns [] when tags array is empty', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [] }])
		expect(getP2PKRefundPubkeys(secret)).toEqual([])
	})

	test('returns [] when tags absent', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def' }])
		expect(getP2PKRefundPubkeys(secret)).toEqual([])
	})

	test('handles Uint8Array input', () => {
		const refund = '02' + 'cc'.repeat(32)
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['refund', refund]] }])
		expect(getP2PKRefundPubkeys(new TextEncoder().encode(secret))).toEqual([refund])
	})

	test('throws for non-P2PK secret', () => {
		const secret = JSON.stringify(['OTHER', { nonce: 'abc', data: 'def' }])
		expect(() => getP2PKRefundPubkeys(secret)).toThrow('Invalid P2PK secret')
	})

	test('throws for unparseable secret', () => {
		expect(() => getP2PKRefundPubkeys('not-json')).toThrow()
	})

	test('ignores refund tag with empty value', () => {
		const secret = JSON.stringify(['P2PK', { nonce: 'abc', data: 'def', tags: [['refund', '']] }])
		expect(getP2PKRefundPubkeys(secret)).toEqual([])
	})

	test('finds refund alongside locktime in a realistic bid secret', () => {
		const lock = '02' + '11'.repeat(32)
		const refund = '03' + '22'.repeat(32)
		const secret = JSON.stringify([
			'P2PK',
			{
				nonce: '00'.repeat(32),
				data: lock,
				tags: [
					['sigflag', 'SIG_ALL'],
					['locktime', '2000000000'],
					['refund', refund],
				],
			},
		])
		expect(getP2PKRefundPubkeys(secret)).toEqual([refund])
	})
})
