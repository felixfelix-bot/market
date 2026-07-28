/**
 * Validator registration form for Kind 30409 — Validator Fee Announcement.
 *
 * Collects structured input from the validator and delegates signing/publishing
 * to `publishValidatorAnnouncement` in `src/publish/validator-announcement.tsx`.
 * No protocol tag construction or signing happens inside this component — it
 * only shapes the `ValidatorFeeAnnouncementInput` and calls the publish helper.
 *
 * @see src/lib/schemas/validator-fee-announcement.ts (schema + tag builder)
 * @see src/publish/validator-announcement.tsx (signing + relay broadcast)
 */

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { publishValidatorAnnouncement } from '@/publish/validator-announcement'
import { DEFAULT_MAX_DURATION_SECONDS, TOTAL_BPS } from '@/lib/schemas/auction-kinds'
import { CheckCircle2, Plus, ShieldCheck, Trash2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Pure validation helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/** Minimum allowed fee in basis points (0.01%). */
export const MIN_FEE_BPS = 1

/** Maximum allowed fee in basis points (100% = TOTAL_BPS = 10_000). */
export const MAX_FEE_BPS = TOTAL_BPS

const SECONDS_PER_DAY = 86_400

/** Converts a fee in basis points to a human-readable percentage string. */
export function bpsToPercentage(bps: number): string {
	return `${(bps / 100).toFixed(2)}%`
}

/** Converts the form's max-duration field (days) into seconds for the Nostr event. */
export function daysToSeconds(days: number): number {
	return Math.round(days * SECONDS_PER_DAY)
}

/**
 * Validates the fee in basis points.
 * @returns an error message string, or `null` when valid.
 */
export function validateFeeBps(fee: number): string | null {
	if (!Number.isFinite(fee)) return 'Fee is required'
	if (!Number.isInteger(fee)) return 'Fee must be a whole number of basis points'
	if (fee < MIN_FEE_BPS) return `Fee must be at least ${MIN_FEE_BPS} bps (0.01%)`
	if (fee > MAX_FEE_BPS) return `Fee cannot exceed ${MAX_FEE_BPS} bps (100%)`
	return null
}

/**
 * Validates the list of supported mint URLs.
 * @returns an error message string, or `null` when valid.
 */
export function validateMints(mints: string[]): string | null {
	if (mints.length === 0) return 'At least one mint URL is required'
	for (const m of mints) {
		try {
			// Lightweight URL check matching z.string().url() semantics.
			// eslint-disable-next-line no-new
			new URL(m)
		} catch {
			return `'${m}' is not a valid URL`
		}
	}
	return null
}

export interface ValidatorRegistrationFormState {
	validatorId: string
	feeMinBps: number
	mints: string[]
	auctionType: string
	lockingScheme: string
	maxDurationDays: number
}

export interface ValidatorRegistrationErrors {
	validatorId?: string
	feeMinBps?: string
	mints?: string
	maxDurationDays?: string
}

/** Runs all form-level validations and returns a map of field → error message. */
export function validateRegistration(state: ValidatorRegistrationFormState): ValidatorRegistrationErrors {
	const errors: ValidatorRegistrationErrors = {}

	if (!state.validatorId.trim()) {
		errors.validatorId = 'Validator ID is required'
	}

	const feeError = validateFeeBps(state.feeMinBps)
	if (feeError) errors.feeMinBps = feeError

	const mintsError = validateMints(state.mints)
	if (mintsError) errors.mints = mintsError

	if (!Number.isFinite(state.maxDurationDays) || state.maxDurationDays <= 0) {
		errors.maxDurationDays = 'Max duration must be a positive number of days'
	}

	return errors
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PublishStatus = 'idle' | 'publishing' | 'success' | 'error'

/** Default max-duration in days, derived from the schema constant (30 days). */
const DEFAULT_MAX_DURATION_DAYS = DEFAULT_MAX_DURATION_SECONDS / SECONDS_PER_DAY

export function ValidatorRegistration() {
	const [validatorId, setValidatorId] = useState('')
	const [feeMinBps, setFeeMinBps] = useState(100) // 1.00%
	const [mints, setMints] = useState<string[]>([])
	const [mintInput, setMintInput] = useState('')
	const [auctionType, setAuctionType] = useState('')
	const [lockingScheme, setLockingScheme] = useState('')
	const [maxDurationDays, setMaxDurationDays] = useState(DEFAULT_MAX_DURATION_DAYS)

	const [errors, setErrors] = useState<ValidatorRegistrationErrors>({})
	const [status, setStatus] = useState<PublishStatus>('idle')
	const [statusMessage, setStatusMessage] = useState('')
	const [publishedEventId, setPublishedEventId] = useState<string | null>(null)

	const feePercentageLabel = bpsToPercentage(feeMinBps)
	const isPublishing = status === 'publishing'

	const handleAddMint = () => {
		const trimmed = mintInput.trim()
		if (!trimmed || mints.includes(trimmed)) return
		setMints([...mints, trimmed])
		setMintInput('')
	}

	const handleRemoveMint = (url: string) => {
		setMints(mints.filter((m) => m !== url))
	}

	const handleMintInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleAddMint()
		}
	}

	const handlePublish = async () => {
		const formState: ValidatorRegistrationFormState = {
			validatorId: validatorId.trim(),
			feeMinBps,
			mints,
			auctionType: auctionType.trim(),
			lockingScheme: lockingScheme.trim(),
			maxDurationDays,
		}

		const validationErrors = validateRegistration(formState)
		setErrors(validationErrors)

		if (Object.keys(validationErrors).length > 0) {
			setStatus('error')
			setStatusMessage('Please fix the highlighted fields before publishing.')
			setPublishedEventId(null)
			return
		}

		setStatus('publishing')
		setStatusMessage('')
		setPublishedEventId(null)

		try {
			const signedEvent = await publishValidatorAnnouncement({
				validatorId: formState.validatorId,
				feeMinBps: formState.feeMinBps,
				mints: formState.mints,
				auctionType: formState.auctionType || undefined,
				lockingScheme: formState.lockingScheme || undefined,
				maxDuration: daysToSeconds(formState.maxDurationDays),
			})
			setStatus('success')
			setPublishedEventId(signedEvent.id)
			setStatusMessage(`Announcement published — event ${signedEvent.id.slice(0, 16)}…`)
		} catch (err) {
			setStatus('error')
			setStatusMessage(err instanceof Error ? err.message : 'Failed to publish announcement.')
		}
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-center gap-3">
				<ShieldCheck className="w-6 h-6 text-muted-foreground" />
				<div>
					<h1 className="text-2xl font-bold">Register as Validator</h1>
					<p className="text-muted-foreground text-sm">Announce your validator services, fees, and supported mints (Kind 30409).</p>
				</div>
			</div>

			{/* Status banners */}
			{status === 'success' && (
				<Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300">
					<CheckCircle2 className="w-4 h-4" />
					<AlertDescription data-testid="validator-success-message">
						{statusMessage}
						{publishedEventId && <span className="block text-xs mt-1 opacity-70">Event ID: {publishedEventId}</span>}
					</AlertDescription>
				</Alert>
			)}
			{status === 'error' && statusMessage && (
				<Alert variant="destructive" data-testid="validator-error-message">
					<AlertDescription>{statusMessage}</AlertDescription>
				</Alert>
			)}

			<div className="max-w-2xl space-y-6">
				{/* Validator ID */}
				<div className="space-y-2">
					<Label htmlFor="validator-id-input">Validator ID</Label>
					<Input
						id="validator-id-input"
						value={validatorId}
						onChange={(e) => setValidatorId(e.target.value)}
						placeholder="e.g. my-validator-service"
						data-testid="validator-id-input"
						aria-invalid={!!errors.validatorId}
					/>
					{errors.validatorId && <p className="text-xs text-destructive">{errors.validatorId}</p>}
					<p className="text-xs text-muted-foreground">A unique identifier for your validator (the Nostr `d` tag).</p>
				</div>

				{/* Fee in bps */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="validator-fee-input">Fee (basis points)</Label>
						<span className="text-sm font-medium tabular-nums" data-testid="validator-fee-percentage">
							{feePercentageLabel}
						</span>
					</div>
					<Input
						id="validator-fee-input"
						type="number"
						min={MIN_FEE_BPS}
						max={MAX_FEE_BPS}
						step={1}
						value={feeMinBps}
						onChange={(e) => {
							const v = e.target.value === '' ? NaN : Number(e.target.value)
							setFeeMinBps(v)
						}}
						data-testid="validator-fee-input"
						aria-invalid={!!errors.feeMinBps}
					/>
					<Slider
						value={[Number.isFinite(feeMinBps) ? feeMinBps : MIN_FEE_BPS]}
						min={MIN_FEE_BPS}
						max={MAX_FEE_BPS}
						step={1}
						onValueChange={(value) => setFeeMinBps(value[0])}
						className="mt-3"
					/>
					{errors.feeMinBps ? (
						<p className="text-xs text-destructive">{errors.feeMinBps}</p>
					) : (
						<p className="text-xs text-muted-foreground">Minimum fee you charge, in basis points. 100 bps = 1%, 10000 bps = 100%.</p>
					)}
				</div>

				{/* Supported mint URLs */}
				<div className="space-y-2">
					<Label htmlFor="validator-mint-input">Supported mint URLs</Label>
					<div className="flex gap-2">
						<Input
							id="validator-mint-input"
							value={mintInput}
							onChange={(e) => setMintInput(e.target.value)}
							onKeyDown={handleMintInputKeyDown}
							placeholder="https://mint.example.com"
							data-testid="validator-mint-input"
						/>
						<Button
							type="button"
							variant="outline"
							onClick={handleAddMint}
							disabled={!mintInput.trim()}
							data-testid="validator-mint-add-button"
						>
							<Plus className="w-4 h-4" />
							Add
						</Button>
					</div>
					<ul className="space-y-2" data-testid="validator-mint-list">
						{mints.map((url) => (
							<li
								key={url}
								className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
								data-testid="validator-mint-item"
							>
								<span className="truncate">{url}</span>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => handleRemoveMint(url)}
									aria-label={`Remove ${url}`}
									data-testid="validator-mint-remove-button"
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							</li>
						))}
					</ul>
					{errors.mints ? (
						<p className="text-xs text-destructive">{errors.mints}</p>
					) : (
						<p className="text-xs text-muted-foreground">Add at least one Cashu mint URL that your validator supports.</p>
					)}
				</div>

				{/* Auction type (optional) */}
				<div className="space-y-2">
					<Label htmlFor="validator-auction-type-input">
						Auction type <span className="text-muted-foreground font-normal">(optional)</span>
					</Label>
					<Input
						id="validator-auction-type-input"
						value={auctionType}
						onChange={(e) => setAuctionType(e.target.value)}
						placeholder="e.g. english, sealed-bid"
						data-testid="validator-auction-type-input"
					/>
				</div>

				{/* Locking scheme (optional) */}
				<div className="space-y-2">
					<Label htmlFor="validator-locking-scheme-input">
						Locking scheme <span className="text-muted-foreground font-normal">(optional)</span>
					</Label>
					<Input
						id="validator-locking-scheme-input"
						value={lockingScheme}
						onChange={(e) => setLockingScheme(e.target.value)}
						placeholder="e.g. P2PK, P2SH"
						data-testid="validator-locking-scheme-input"
					/>
				</div>

				{/* Max duration (optional, default 30 days) */}
				<div className="space-y-2">
					<Label htmlFor="validator-max-duration-input">
						Max auction duration (days) <span className="text-muted-foreground font-normal">(optional, default 30)</span>
					</Label>
					<Input
						id="validator-max-duration-input"
						type="number"
						min={1}
						step={1}
						value={maxDurationDays}
						onChange={(e) => {
							const v = e.target.value === '' ? NaN : Number(e.target.value)
							setMaxDurationDays(v)
						}}
						data-testid="validator-max-duration-input"
						aria-invalid={!!errors.maxDurationDays}
					/>
					{errors.maxDurationDays ? (
						<p className="text-xs text-destructive">{errors.maxDurationDays}</p>
					) : (
						<p className="text-xs text-muted-foreground">
							Maximum auction duration you will validate, in days (default {DEFAULT_MAX_DURATION_DAYS}).
						</p>
					)}
				</div>

				{/* Publish */}
				<div className="pt-2">
					<Button type="button" className="w-full" onClick={handlePublish} disabled={isPublishing} data-testid="validator-publish-button">
						{isPublishing ? 'Publishing…' : 'Publish Announcement'}
					</Button>
				</div>
			</div>
		</div>
	)
}
