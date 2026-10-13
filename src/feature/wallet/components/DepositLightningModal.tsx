import { useState, useEffect, useReducer } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { nip60Actions, nip60Store } from '@/lib/stores/nip60'
import { useStore } from '@tanstack/react-store'
import { Loader2, Copy, Check, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'

interface DepositLightningModalProps {
	open: boolean
	onClose: () => void
}

/*
 * Form state for the deposit modal, kept in a pure reducer so its re-open
 * transitions are unit-testable (src/lib/__tests__/deposit-modal-reopen.test.ts).
 * Payment state is deliberately NOT here: depositStatus/depositInvoice/
 * activeDeposit live in the nip60 store and are reset on re-open through
 * nip60Actions.cancelDeposit().
 */
export interface DepositFormState {
	amount: string
	copied: boolean
}

export type DepositFormAction = { type: 'reset' } | { type: 'setAmount'; value: string } | { type: 'setCopied'; value: boolean }

export const initialDepositFormState: DepositFormState = { amount: '', copied: false }

export function depositFormReducer(state: DepositFormState, action: DepositFormAction): DepositFormState {
	switch (action.type) {
		case 'reset':
			return initialDepositFormState
		case 'setAmount':
			return { ...state, amount: action.value }
		case 'setCopied':
			return { ...state, copied: action.value }
	}
}

export function DepositLightningModal({ open, onClose }: DepositLightningModalProps) {
	const { mints, defaultMint, depositInvoice, depositStatus } = useStore(nip60Store)
	const [selectedMint, setSelectedMint] = useState<string>('')
	const [isGenerating, setIsGenerating] = useState(false)
	const [form, dispatchForm] = useReducer(depositFormReducer, initialDepositFormState)

	// Sync selectedMint with defaultMint when modal opens or defaultMint changes
	useEffect(() => {
		if (open) {
			setSelectedMint(defaultMint ?? mints[0] ?? '')
		}
	}, [open, defaultMint, mints])

	// Reset stale form input and deposit session state each time the modal
	// opens, so a previously completed deposit doesn't show "done" (or a stale
	// invoice/amount) on the next open. Deps are [open] only — mint changes
	// while open must not wipe in-progress form input.
	useEffect(() => {
		if (open) {
			dispatchForm({ type: 'reset' })
			nip60Actions.cancelDeposit()
		}
	}, [open])

	const handleGenerateInvoice = async () => {
		const amountNum = parseInt(form.amount, 10)
		if (isNaN(amountNum) || amountNum <= 0) {
			toast.error('Please enter a valid amount')
			return
		}

		if (!selectedMint) {
			toast.error('Please select a mint')
			return
		}

		setIsGenerating(true)
		try {
			await nip60Actions.startDeposit(amountNum, selectedMint)
		} finally {
			setIsGenerating(false)
		}
	}

	const handleCopyInvoice = async () => {
		if (!depositInvoice) return
		try {
			await navigator.clipboard.writeText(depositInvoice)
			dispatchForm({ type: 'setCopied', value: true })
			toast.success('Invoice copied to clipboard')
			setTimeout(() => dispatchForm({ type: 'setCopied', value: false }), 2000)
		} catch {
			toast.error('Failed to copy invoice')
		}
	}

	const handleClose = () => {
		if (depositStatus === 'pending') {
			nip60Actions.cancelDeposit()
		}
		dispatchForm({ type: 'reset' })
		onClose()
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Zap className="w-5 h-5 text-yellow-500" />
						Deposit Lightning
					</DialogTitle>
					<DialogDescription>Generate a Lightning invoice to mint eCash</DialogDescription>
				</DialogHeader>

				{depositStatus === 'success' ? (
					<div className="py-6 text-center">
						<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
							<Check className="w-6 h-6 text-green-600" />
						</div>
						<p className="text-lg font-medium text-green-600">Deposit Successful!</p>
						<p className="text-sm text-muted-foreground mt-2">Your eCash has been minted</p>
						<Button onClick={handleClose} className="mt-4">
							Done
						</Button>
					</div>
				) : depositInvoice ? (
					<div className="space-y-4">
						<div className="flex justify-center">
							<div className="p-4 bg-white rounded-lg">
								<QRCodeSVG value={depositInvoice} size={200} />
							</div>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium">Lightning Invoice</p>
							<div className="flex gap-2">
								<input
									type="text"
									value={depositInvoice}
									readOnly
									className="flex-1 px-3 py-2 text-sm bg-muted rounded-md font-mono truncate"
								/>
								<Button variant="outline" size="icon" onClick={handleCopyInvoice}>
									{form.copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
								</Button>
							</div>
						</div>
						<p className="text-sm text-muted-foreground text-center">Waiting for payment...</p>
						<div className="flex justify-center">
							<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={handleClose}>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Amount (sats)</label>
							<input
								type="number"
								value={form.amount}
								onChange={(e) => dispatchForm({ type: 'setAmount', value: e.target.value })}
								placeholder="Enter amount in sats"
								className="w-full px-3 py-2 text-sm border rounded-md bg-background"
								min="1"
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Mint</label>
							<select
								value={selectedMint}
								onChange={(e) => setSelectedMint(e.target.value)}
								className="w-full px-3 py-2 text-sm border rounded-md bg-background"
							>
								{mints.map((mint) => (
									<option key={mint} value={mint}>
										{new URL(mint).hostname}
									</option>
								))}
							</select>
						</div>

						{depositStatus === 'error' && <p className="text-sm text-destructive">Failed to generate invoice. Please try again.</p>}

						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button onClick={handleGenerateInvoice} disabled={isGenerating || !form.amount || !selectedMint}>
								{isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
								Generate Invoice
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
