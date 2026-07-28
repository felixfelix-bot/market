/**
 * AuctionSplitsEditor — table-based editor for V4V split recipients in an
 * auction listing (kind 30408).
 *
 * Each row shows a truncated npub, a role label, and a bps (basis-points)
 * input. The seller row is always read-only: its bps is auto-calculated as
 * 10000 minus the sum of all other splits. A live validation indicator shows
 * green when the total equals exactly 10000.
 *
 * The component is presentational — it does not fetch data or publish events.
 * The parent owns the `splits` array and receives updates via `onChange`.
 *
 * @see src/lib/schemas/auction-v4v.ts  — V4vSplit type + validateV4vSplitSum
 * @see src/queries/validators.tsx      — ValidatorFeeAnnouncement type
 */

import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useMemo, type ChangeEvent } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TOTAL_BPS } from '@/lib/schemas/auction-kinds'
import { validateV4vSplitSum, type V4vSplit } from '@/lib/schemas/auction-v4v'
import type { ValidatorFeeAnnouncement } from '@/lib/schemas/validator-fee-announcement'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuctionSplitsEditorProps {
	/** Current splits array (includes the seller entry). */
	splits: V4vSplit[]
	/** Called with an updated splits array whenever a bps value changes. */
	onChange: (splits: V4vSplit[]) => void
	/** Validator announcements for role labelling and fee-min display. */
	validators: ValidatorFeeAnnouncement[]
	/** Hex pubkey of the seller — identifies the auto-calculated row. */
	sellerNpub: string
	/** Optional className for the root container. */
	className?: string
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Calculates the seller's bps as the remainder after subtracting all non-seller
 * splits from TOTAL_BPS. Does NOT clamp — a negative result signals an
 * over-allocation that the UI should surface as invalid.
 *
 * Pure function — no side effects.
 */
export function calculateSellerBps(splits: V4vSplit[], sellerNpub: string): number {
	const otherTotal = splits.filter((s) => s.npub !== sellerNpub).reduce((sum, s) => sum + s.bps, 0)
	return TOTAL_BPS - otherTotal
}

/**
 * Returns a human-readable role label for a split recipient.
 */
export function getSplitRole(split: V4vSplit, sellerNpub: string, validators: ValidatorFeeAnnouncement[]): string {
	if (split.npub === sellerNpub) return 'Seller'
	const validator = validators.find((v) => v.pubkey === split.npub)
	if (validator) return `Validator (${validator.validatorId})`
	return 'V4V Recipient'
}

/**
 * Truncates a 64-char hex pubkey for display: first 12 + … + last 8 chars.
 */
export function truncateNpub(npub: string): string {
	if (npub.length <= 24) return npub
	return `${npub.slice(0, 12)}…${npub.slice(-8)}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuctionSplitsEditor({ splits, onChange, validators, sellerNpub, className = '' }: AuctionSplitsEditorProps) {
	// Auto-calculate seller bps so the table always reflects the true total.
	const sellerBps = useMemo(() => calculateSellerBps(splits, sellerNpub), [splits, sellerNpub])

	// Apply the calculated seller bps to the splits used for display/validation.
	const displaySplits = useMemo<V4vSplit[]>(() => {
		return splits.map((s) => (s.npub === sellerNpub ? { ...s, bps: sellerBps } : s))
	}, [splits, sellerNpub, sellerBps])

	const isValid = validateV4vSplitSum(displaySplits)
	const totalBps = displaySplits.reduce((sum, s) => sum + s.bps, 0)

	// --- Handlers ----------------------------------------------------------

	function handleBpsChange(npub: string, e: ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value
		const parsed = raw === '' ? 0 : Math.max(0, Math.min(TOTAL_BPS, Math.floor(Number(raw))))
		if (Number.isNaN(parsed)) return

		const updated = splits.map((s) => (s.npub === npub ? { ...s, bps: parsed } : s))
		onChange(updated)
	}

	// --- Render ------------------------------------------------------------

	return (
		<div className={`space-y-4 ${className}`}>
			<div>
				<h3 className="font-semibold text-lg">V4V Splits</h3>
				<p className="text-sm text-muted-foreground">
					Allocate basis points (bps) to validators and V4V recipients. The seller receives the remainder. Total must equal{' '}
					{TOTAL_BPS.toLocaleString()} bps (100%).
				</p>
			</div>

			<Table data-testid="auction-splits-table">
				<TableHeader>
					<TableRow>
						<TableHead>Recipient</TableHead>
						<TableHead>Role</TableHead>
						<TableHead className="text-right">BPS</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{displaySplits.map((split) => {
						const isSeller = split.npub === sellerNpub
						const isValidator = validators.some((v) => v.pubkey === split.npub)
						const rowTestId = isValidator ? 'validator-row' : undefined

						return (
							<TableRow key={split.npub} data-testid={rowTestId}>
								<TableCell className="font-mono text-xs">{truncateNpub(split.npub)}</TableCell>
								<TableCell>{getSplitRole(split, sellerNpub, validators)}</TableCell>
								<TableCell className="text-right">
									{isSeller ? (
										<div className="text-right font-mono text-sm tabular-nums" data-testid="seller-bps-display">
											{sellerBps.toLocaleString()}
										</div>
									) : (
										<Input
											type="number"
											min={0}
											max={TOTAL_BPS}
											value={split.bps}
											onChange={(e) => handleBpsChange(split.npub, e)}
											data-testid={isValidator ? 'validator-bps-input' : undefined}
											className="ml-auto w-24 text-right tabular-nums"
										/>
									)}
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>

			{/* Running total + validation status */}
			<div className="flex items-center justify-between border-t pt-3">
				<div className="flex items-center gap-2">
					<Label className="text-muted-foreground">Total BPS:</Label>
					<span
						className={`font-mono text-lg font-semibold tabular-nums ${isValid ? 'text-green-500' : 'text-red-500'}`}
						data-testid="splits-total-bps"
					>
						{totalBps.toLocaleString()} / {TOTAL_BPS.toLocaleString()}
					</span>
				</div>
				<div className="flex items-center gap-1.5 text-sm" data-testid="splits-validation-status">
					{isValid ? (
						<>
							<CheckCircle2 className="size-4 text-green-500" />
							<span className="text-green-500">Splits balanced</span>
						</>
					) : (
						<>
							<AlertCircle className="size-4 text-red-500" />
							<span className="text-red-500">
								{totalBps < TOTAL_BPS
									? `${(TOTAL_BPS - totalBps).toLocaleString()} bps unallocated`
									: `${(totalBps - TOTAL_BPS).toLocaleString()} bps overallocated`}
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
