/**
 * Unit tests for the stage-aware relay policy in `lib/relay-policy.ts`.
 *
 * `computeNdkConfig` is a pure resolver (no store reads, no NDK instance),
 * so we feed it inputs and assert the computed outbox flag — including the
 * #1046 production kill-switch (`NEXT_PUBLIC_DISABLE_OUTBOX`, surfaced here
 * as the `disableOutbox` input that `stores/ndk.ts` derives from `Bun.env`).
 */
import { describe, expect, test } from 'bun:test'
import { computeNdkConfig } from '../relay-policy'

describe('computeNdkConfig — enableOutbox rule', () => {
	test('production with no flags keeps the outbox model on', () => {
		expect(computeNdkConfig({ stage: 'production' }).enableOutbox).toBe(true)
	})

	test('production + disableOutbox turns it off (#1046 kill-switch)', () => {
		const { enableOutbox } = computeNdkConfig({ stage: 'production', disableOutbox: true })
		expect(enableOutbox).toBe(false)
	})

	test('disableOutbox defaults to false (unchanged behavior when omitted)', () => {
		// Passing disableOutbox: false must be identical to omitting it.
		expect(computeNdkConfig({ stage: 'production', disableOutbox: false }).enableOutbox).toBe(true)
	})

	test('staging is always off, regardless of disableOutbox', () => {
		expect(computeNdkConfig({ stage: 'staging' }).enableOutbox).toBe(false)
		expect(computeNdkConfig({ stage: 'staging', disableOutbox: true }).enableOutbox).toBe(false)
	})

	test('development is always off', () => {
		expect(computeNdkConfig({ stage: 'development' }).enableOutbox).toBe(false)
	})

	test('localRelayOnly overrides production (off even in prod)', () => {
		const { enableOutbox } = computeNdkConfig({ stage: 'production', localRelayOnly: true })
		expect(enableOutbox).toBe(false)
	})
})
