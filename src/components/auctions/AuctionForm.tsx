/**
 * AuctionForm — multi-step wizard for creating a V4V auction listing.
 *
 * Steps:
 *   1. Details      — title, description, starting bid, auction type
 *   2. V4V Splits   — renders AuctionSplitsEditor (validators from useValidators)
 *   3. Mints        — mint URLs, settlement window, locking scheme
 *   4. Review       — summary + publish
 *
 * On publish, builds an AuctionListingContent and calls publishAuctionListing.
 *
 * @see src/components/auctions/AuctionSplitsEditor.tsx
 * @see src/publish/auction-v4v.tsx
 * @see src/lib/schemas/auction-v4v.ts
 */

import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { AuctionSplitsEditor } from '@/components/auctions/AuctionSplitsEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_MAX_DURATION_SECONDS, TOTAL_BPS } from '@/lib/schemas/auction-kinds'
import { AuctionListingContentSchema, validateV4vSplitSum, type V4vSplit } from '@/lib/schemas/auction-v4v'
import type { ValidatorFeeAnnouncement } from '@/lib/schemas/validator-fee-announcement'
import { publishAuctionListing } from '@/publish/auction-v4v'
import { useValidators } from '@/queries/validators'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4

const AUCTION_TYPES = ['english', 'sealed', 'dutch'] as const
const LOCKING_SCHEMES = ['P2PK', 'P2PK-with-timelock'] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AuctionFormProps {
	/** Hex pubkey of the authenticated seller. */
	sellerNpub: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuctionForm({ sellerNpub }: AuctionFormProps) {
	const [step, setStep] = useState(0) // 0-indexed

	// Step 1 — Details
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [startingBid, setStartingBid] = useState('')
	const [auctionType, setAuctionType] = useState<string>('english')

	// Step 2 — V4V Splits (seller starts with 100%)
	const [splits, setSplits] = useState<V4vSplit[]>([{ npub: sellerNpub, bps: TOTAL_BPS }])

	// Step 3 — Mints
	const [mints, setMints] = useState<string[]>([''])
	const [settlementWindow, setSettlementWindow] = useState<string>(String(DEFAULT_MAX_DURATION_SECONDS))
	const [lockingScheme, setLockingScheme] = useState<string>('P2PK')

	// Publish state
	const [isPublishing, setIsPublishing] = useState(false)

	// --- Validators query (filtered by auction type + locking scheme) ------
	const validatorsQuery = useValidators({
		auctionType,
		lockingScheme,
	})
	const validators: ValidatorFeeAnnouncement[] = validatorsQuery.data ?? []

	// Ensure validator splits exist when validators are loaded
	// (runs on every render but only mutates state when new validators appear)
	useMemo(() => {
		const existingNpubs = new Set(splits.map((s) => s.npub))
		const newValidatorSplits: V4vSplit[] = []
		for (const v of validators) {
			if (!existingNpubs.has(v.pubkey)) {
				newValidatorSplits.push({ npub: v.pubkey, bps: 0 })
			}
		}
		if (newValidatorSplits.length > 0) {
			// Remove any splits for validators that are no longer in the list
			const validatorNpubs = new Set(validators.map((v) => v.pubkey))
			const pruned = splits.filter((s) => s.npub === sellerNpub || validatorNpubs.has(s.npub))
			setSplits([...pruned, ...newValidatorSplits])
		}
	}, [validators, splits, sellerNpub])

	// --- Validation --------------------------------------------------------

	const splitsValid = validateV4vSplitSum(splits)
	const detailsValid = title.trim() !== '' && startingBid !== '' && Number(startingBid) > 0
	const mintsValid = mints.filter((m) => m.trim() !== '').length >= 1

	const canGoNext = (step === 0 && detailsValid) || (step === 1 && splitsValid) || (step === 2 && mintsValid) || step === 3

	// --- Navigation --------------------------------------------------------

	function handleNext() {
		if (step < TOTAL_STEPS - 1 && canGoNext) setStep((s) => s + 1)
	}
	function handleBack() {
		if (step > 0) setStep((s) => s - 1)
	}

	// --- Publish -----------------------------------------------------------

	async function handlePublish(_e: FormEvent) {
		if (!splitsValid || !detailsValid || !mintsValid) {
			toast.error('Please complete all required fields before publishing.')
			return
		}

		const content = {
			v4v_splits: splits,
			settlement_window: Number(settlementWindow),
			mints: mints.filter((m) => m.trim() !== ''),
			auction_type: auctionType,
			locking_scheme: lockingScheme,
		}

		// Validate against the Zod schema before publishing
		const parsed = AuctionListingContentSchema.safeParse(content)
		if (!parsed.success) {
			toast.error('Validation failed', { description: parsed.error.issues[0]?.message })
			return
		}

		setIsPublishing(true)
		try {
			const auctionId = crypto.randomUUID()
			await publishAuctionListing({ auctionId, content: parsed.data })
			toast.success('Auction listing published!')
		} catch (err) {
			toast.error('Failed to publish auction', {
				description: err instanceof Error ? err.message : 'Unknown error',
			})
		} finally {
			setIsPublishing(false)
		}
	}

	// --- Step labels for the progress indicator ----------------------------
	const stepLabels = ['Details', 'V4V Splits', 'Mints', 'Review']

	// =======================================================================
	// Render
	// =======================================================================

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			{/* Step indicator */}
			<div className="flex items-center gap-2">
				{stepLabels.map((label, i) => (
					<div key={label} className="flex flex-1 items-center gap-2">
						<div
							className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
								i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
							}`}
						>
							{i < step ? '✓' : i + 1}
						</div>
						<span className={`hidden text-sm sm:inline ${i === step ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
							{label}
						</span>
						{i < stepLabels.length - 1 && <div className="h-px flex-1 bg-border" />}
					</div>
				))}
			</div>

			{/* Step content */}
			<div className="rounded-lg border bg-card p-6 space-y-4">
				{/* Step 1 — Details */}
				{step === 0 && (
					<div className="space-y-4">
						<h2 className="font-semibold text-xl">Auction Details</h2>

						<div className="space-y-2">
							<Label htmlFor="auction-title">Title</Label>
							<Input
								id="auction-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g. Rare digital artwork"
								data-testid="auction-title-input"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="auction-description">Description</Label>
							<Textarea
								id="auction-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Describe the item being auctioned..."
								data-testid="auction-description-input"
								rows={4}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="auction-starting-bid">Starting Bid (sats)</Label>
							<Input
								id="auction-starting-bid"
								type="number"
								min={1}
								value={startingBid}
								onChange={(e) => setStartingBid(e.target.value)}
								placeholder="1000"
								data-testid="auction-starting-bid-input"
							/>
						</div>

						<div className="space-y-2">
							<Label>Auction Type</Label>
							<Select value={auctionType} onValueChange={setAuctionType}>
								<SelectTrigger className="w-full" data-testid="auction-type-select">
									<SelectValue placeholder="Select auction type" />
								</SelectTrigger>
								<SelectContent>
									{AUCTION_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{t.charAt(0).toUpperCase() + t.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}

				{/* Step 2 — V4V Splits */}
				{step === 1 && (
					<div className="space-y-4">
						{validatorsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading validators…</p>}
						{validatorsQuery.isError && (
							<p className="text-sm text-red-500">Failed to load validators. You can still configure splits manually.</p>
						)}
						<AuctionSplitsEditor splits={splits} onChange={setSplits} validators={validators} sellerNpub={sellerNpub} />
					</div>
				)}

				{/* Step 3 — Mints */}
				{step === 2 && (
					<div className="space-y-4">
						<h2 className="font-semibold text-xl">Mints & Settlement</h2>

						<div className="space-y-2">
							<Label>Mint URLs</Label>
							<p className="text-sm text-muted-foreground">Add one or more Cashu mints supported by this auction.</p>
							{mints.map((mint, i) => (
								<div key={i} className="flex items-center gap-2">
									<Input
										value={mint}
										onChange={(e) => {
											const updated = [...mints]
											updated[i] = e.target.value
											setMints(updated)
										}}
										placeholder="https://mint.example.com"
										data-testid="auction-mint-input"
									/>
									<Button
										variant="outline"
										size="icon"
										onClick={() => setMints(mints.filter((_, idx) => idx !== i))}
										disabled={mints.length === 1}
										aria-label="Remove mint"
									>
										×
									</Button>
								</div>
							))}
							<Button variant="outline" size="sm" onClick={() => setMints([...mints, ''])}>
								Add mint
							</Button>
						</div>

						<div className="space-y-2">
							<Label htmlFor="auction-settlement-window">Settlement Window (seconds)</Label>
							<Input
								id="auction-settlement-window"
								type="number"
								min={1}
								value={settlementWindow}
								onChange={(e) => setSettlementWindow(e.target.value)}
								data-testid="auction-settlement-window-input"
							/>
							<p className="text-xs text-muted-foreground">
								After this period, losing bids are auto-refunded. Default: {DEFAULT_MAX_DURATION_SECONDS.toLocaleString()}s (30 days).
							</p>
						</div>

						<div className="space-y-2">
							<Label>Locking Scheme</Label>
							<Select value={lockingScheme} onValueChange={setLockingScheme}>
								<SelectTrigger className="w-full" data-testid="auction-locking-scheme-select">
									<SelectValue placeholder="Select locking scheme" />
								</SelectTrigger>
								<SelectContent>
									{LOCKING_SCHEMES.map((s) => (
										<SelectItem key={s} value={s}>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}

				{/* Step 4 — Review */}
				{step === 3 && (
					<div className="space-y-4">
						<h2 className="font-semibold text-xl">Review & Publish</h2>

						<dl className="space-y-3 text-sm">
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Title</dt>
								<dd className="font-medium text-right">{title || '—'}</dd>
							</div>
							{description && (
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">Description</dt>
									<dd className="font-medium text-right max-w-[60%] truncate">{description}</dd>
								</div>
							)}
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Starting Bid</dt>
								<dd className="font-medium">{startingBid} sats</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Auction Type</dt>
								<dd className="font-medium capitalize">{auctionType}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">V4V Splits</dt>
								<dd className="font-medium">
									{splits.length} recipient{splits.length !== 1 ? 's' : ''}
								</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Mints</dt>
								<dd className="font-medium text-right">{mints.filter((m) => m.trim()).join(', ') || '—'}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Settlement Window</dt>
								<dd className="font-medium">{Number(settlementWindow).toLocaleString()}s</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Locking Scheme</dt>
								<dd className="font-medium">{lockingScheme}</dd>
							</div>
						</dl>

						{!splitsValid && (
							<p className="text-sm text-red-500">V4V splits do not sum to {TOTAL_BPS.toLocaleString()} bps. Go back to step 2 to fix.</p>
						)}

						<Button
							className="w-full"
							onClick={handlePublish}
							disabled={isPublishing || !splitsValid || !detailsValid || !mintsValid}
							data-testid="auction-publish-button"
						>
							{isPublishing ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Publishing…
								</>
							) : (
								<>
									<Send className="size-4" />
									Publish Auction
								</>
							)}
						</Button>
					</div>
				)}
			</div>

			{/* Navigation buttons */}
			<div className="flex items-center justify-between">
				<Button variant="outline" onClick={handleBack} disabled={step === 0 || isPublishing} data-testid="auction-back-button">
					<ChevronLeft className="size-4" />
					Back
				</Button>
				<span className="text-sm text-muted-foreground">
					Step {step + 1} of {TOTAL_STEPS}
				</span>
				{step < TOTAL_STEPS - 1 ? (
					<Button onClick={handleNext} disabled={!canGoNext || isPublishing} data-testid="auction-next-button">
						Next
						<ChevronRight className="size-4" />
					</Button>
				) : (
					<div /> // spacer to keep layout balanced
				)}
			</div>
		</div>
	)
}
