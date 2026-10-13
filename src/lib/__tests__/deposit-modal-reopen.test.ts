import { describe, expect, test } from 'bun:test'
import { depositFormReducer, initialDepositFormState } from '../../feature/wallet/components/DepositLightningModal'
import { nip60Actions, nip60Store } from '../stores/nip60'

/*
 * Regression tests for the deposit modal re-open bug (#995 family):
 * closing the modal after a completed deposit and re-opening it showed the
 * stale "done" view and stale form input instead of a fresh form.
 *
 * The fix splits modal state along the form-vs-payment boundary:
 *  - FORM state (amount, copied) lives in a pure, exported reducer so its
 *    re-open transitions are unit-testable without a DOM renderer.
 *  - PAYMENT/session state (depositStatus, depositInvoice, activeDeposit)
 *    stays in the nip60 store and is reset on re-open via the existing
 *    nip60Actions.cancelDeposit() action — the same action handleClose
 *    already used for pending deposits.
 */

describe('depositFormReducer (modal form state)', () => {
	test('re-open resets a stale amount and copied flag', () => {
		const stale = { amount: '5000', copied: true }

		expect(depositFormReducer(stale, { type: 'reset' })).toEqual({ amount: '', copied: false })
	})

	test('typing updates only the amount', () => {
		const state = { amount: '', copied: true }

		const next = depositFormReducer(state, { type: 'setAmount', value: '210' })

		expect(next).toEqual({ amount: '210', copied: true })
	})

	test('copy affordance toggles only the copied flag', () => {
		const state = { amount: '210', copied: false }

		expect(depositFormReducer(state, { type: 'setCopied', value: true })).toEqual({
			amount: '210',
			copied: true,
		})
		expect(depositFormReducer({ amount: '210', copied: true }, { type: 'setCopied', value: false })).toEqual({
			amount: '210',
			copied: false,
		})
	})

	test('initial form state is fresh (empty amount, not copied)', () => {
		expect(initialDepositFormState).toEqual({ amount: '', copied: false })
	})
})

describe('nip60 deposit session reset (modal re-open dependency)', () => {
	test('cancelDeposit clears deposit session fields but leaves the rest of the store intact', () => {
		const before = { ...nip60Store.state }
		try {
			// Simulate the stale "done" state a completed deposit leaves behind.
			nip60Store.setState((s) => ({
				...s,
				depositStatus: 'success',
				depositInvoice: null,
				activeDeposit: null,
			}))

			nip60Actions.cancelDeposit()

			// Session state is cleared — the modal re-opens on a fresh form.
			expect(nip60Store.state.depositStatus).toBe('idle')
			expect(nip60Store.state.depositInvoice).toBeNull()
			expect(nip60Store.state.activeDeposit).toBeNull()

			// Payment state is NOT wiped: wallet and balance survive the reset.
			expect(nip60Store.state.wallet).toEqual(before.wallet)
			expect(nip60Store.state.balance).toEqual(before.balance)
		} finally {
			nip60Store.setState(() => before)
		}
	})
})
