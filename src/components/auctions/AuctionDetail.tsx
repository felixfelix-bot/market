/**
 * AuctionDetail — read-only detail view for a V4V auction listing (kind 30408).
 *
 * Renders the auction's headline fields (title, description, starting bid,
 * type), a V4V split breakdown with proportional horizontal bars, validator
 * fee cards, a settlement-window countdown, and the list of supported mints.
 *
 * The component is presentational: it does not fetch from relays, sign events,
 * or mutate payment state. The parent owns the data and passes it via props.
 * Relay-backed wiring lives in the route (`src/routes/auctions.$auctionId.tsx`)
 * and the query layer (`src/queries/`), per `src/AGENTS.md` boundaries.
 *
 * @see src/lib/schemas/auction-v4v.ts            — V4vSplit, AuctionListingContent
 * @see src/lib/schemas/validator-fee-announcement.ts — ValidatorFeeAnnouncement
 * @see src/routes/auctions.$auctionId.tsx        — public route that renders this
 */

import { Clock, ExternalLink, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailField } from '@/components/ui/DetailField'
import { Separator } from '@/components/ui/separator'
import { TOTAL_BPS } from '@/lib/schemas/auction-kinds'
import { validateV4vSplitSum, type V4vSplit } from '@/lib/schemas/auction-v4v'
import type { ValidatorFeeAnnouncement } from '@/lib/schemas/validator-fee-announcement'
import { getSplitRole, truncateNpub } from '@/components/auctions/AuctionSplitsEditor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuctionDetailProps {
	/** Auction title (display). */
	title: string
	/** Human-readable description of the item being auctioned. */
	description: string
	/** Starting bid in sats. */
	startingBid: number
	/** Auction format (e.g. "english", "sealed", "dutch"). */
	auctionType: string
	/** V4V split recipients (must sum to 10000 bps). */
	splits: V4vSplit[]
	/** Supported Cashu mint URLs. */
	mints: string[]
	/**
	 * Unix timestamp (seconds) at which the settlement window expires.
	 * After this point losing bids auto-refund; the UI shows "expired".
	 */
	settlementWindow: number
	/** Validator fee announcements referenced by the splits. */
	validators: ValidatorFeeAnnouncement[]
	/** Hex pubkey of the seller — used to label the seller split. */
	sellerNpub?: string
	/** Optional className for the root container. */
	className?: string
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/** Converts basis points to a human-readable percentage string. */
export function bpsToPercent(bps: number): string {
	return `${(bps / 100).toFixed(2)}%`
}

/** Formats a starting bid (sats) for display, e.g. "1,000 sats". */
export function formatStartingBid(sats: number): string {
	return `${sats.toLocaleString()} sats`
}

/**
 * Returns a Tailwind background-color class for a split bar, cycling through a
 * fixed palette so adjacent recipients are visually distinct. Pure and stable.
 */
const SPLIT_COLORS = [
	'bg-blue-500',
	'bg-emerald-500',
	'bg-purple-500',
	'bg-amber-500',
	'bg-pink-500',
	'bg-cyan-500',
	'bg-orange-500',
	'bg-indigo-500',
]
export function splitColor(index: number): string {
	return SPLIT_COLORS[index % SPLIT_COLORS.length]
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Live countdown that re-renders every second until the deadline passes. */
function SettlementCountdown({ deadline }: { deadline: number }) {
	const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

	useEffect(() => {
		setNow(Math.floor(Date.now() / 1000))
		const id = window.setInterval(() => {
			setNow(Math.floor(Date.now() / 1000))
		}, 1000)
		return () => window.clearInterval(id)
	}, [])

	const remaining = deadline - now

	if (remaining <= 0) {
		return <span className="font-semibold text-red-500">expired</span>
	}

	const days = Math.floor(remaining / 86_400)
	const hours = Math.floor((remaining % 86_400) / 3_600)
	const minutes = Math.floor((remaining % 3_600) / 60)
	const seconds = remaining % 60

	const parts: string[] = []
	if (days > 0) parts.push(`${days}d`)
	parts.push(`${hours}h`, `${minutes}m`, `${seconds}s`)

	return (
		<span className="font-mono tabular-nums" data-testid="auction-settlement-countdown">
			{parts.join(' ')}
		</span>
	)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuctionDetail({
	title,
	description,
	startingBid,
	auctionType,
	splits,
	mints,
	settlementWindow,
	validators,
	sellerNpub,
	className = '',
}: AuctionDetailProps) {
	const splitsValid = validateV4vSplitSum(splits)
	const totalBps = splits.reduce((sum, s) => sum + s.bps, 0)

	// Index validators by pubkey for quick lookup while rendering split rows.
	const validatorByNpub = new Map(validators.map((v) => [v.pubkey, v]))

	return (
		<div className={`mx-auto max-w-3xl space-y-6 ${className}`} data-testid="auction-detail">
			{/* ----------------------------------------------------------------- */}
			{/* Header: title, type, starting bid                                  */}
			{/* ----------------------------------------------------------------- */}
			<Card className="overflow-hidden">
				<CardHeader>
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="space-y-1">
							<CardTitle className="text-2xl">{title}</CardTitle>
							<Badge variant="secondary" className="capitalize" data-testid="auction-detail-type">
								{auctionType}
							</Badge>
						</div>
						<div className="text-right">
							<p className="text-xs text-muted-foreground">Starting bid</p>
							<p className="font-mono text-lg font-semibold tabular-nums">{formatStartingBid(startingBid)}</p>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{description ? (
						<p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{description}</p>
					) : (
						<p className="text-sm italic text-muted-foreground">No description provided.</p>
					)}
				</CardContent>
			</Card>

			{/* ----------------------------------------------------------------- */}
			{/* V4V split breakdown                                                */}
			{/* ----------------------------------------------------------------- */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">V4V Split Breakdown</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4" data-testid="auction-splits-breakdown">
					{/* Stacked proportional bar — shows the whole split at a glance */}
					{splitsValid && (
						<div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" data-testid="auction-splits-bar">
							{splits.map((split, i) => {
								if (split.bps <= 0) return null
								return (
									<div
										key={split.npub}
										data-testid={`auction-split-bar-segment-${split.npub}`}
										className={splitColor(i)}
										style={{ width: `${(split.bps / TOTAL_BPS) * 100}%` }}
										title={`${truncateNpub(split.npub)} — ${bpsToPercent(split.bps)}`}
									/>
								)
							})}
						</div>
					)}

					{/* Per-recipient rows with individual proportional bars */}
					<div className="space-y-3">
						{splits.map((split, i) => {
							const role = getSplitRole(split, sellerNpub ?? '', validators)
							const widthPct = (split.bps / TOTAL_BPS) * 100
							return (
								<div key={split.npub} className="space-y-1.5" data-testid={`auction-split-row-${split.npub}`}>
									<div className="flex items-center justify-between gap-2 text-sm">
										<div className="flex min-w-0 items-center gap-2">
											<span className="truncate font-mono text-xs text-muted-foreground">{truncateNpub(split.npub)}</span>
											<Badge variant="outline" className="shrink-0">
												{role}
											</Badge>
										</div>
										<div className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
											<span>{split.bps.toLocaleString()} bps</span>
											<span className="font-semibold">{bpsToPercent(split.bps)}</span>
										</div>
									</div>
									<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
										<div className={`h-full rounded-full ${splitColor(i)}`} style={{ width: `${widthPct}%` }} />
									</div>
								</div>
							)
						})}
					</div>

					<Separator />

					{/* Running total + validation status */}
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">Total</span>
						<span
							className={`font-mono text-sm font-semibold tabular-nums ${splitsValid ? 'text-emerald-500' : 'text-red-500'}`}
							data-testid="auction-splits-total"
						>
							{totalBps.toLocaleString()} / {TOTAL_BPS.toLocaleString()} bps
						</span>
					</div>
					{!splitsValid && (
						<p className="text-xs text-red-500" data-testid="auction-splits-invalid">
							Splits do not sum to {TOTAL_BPS.toLocaleString()} bps.
						</p>
					)}
				</CardContent>
			</Card>

			{/* ----------------------------------------------------------------- */}
			{/* Validator fee cards                                                */}
			{/* ----------------------------------------------------------------- */}
			{validators.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Validators</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3 sm:grid-cols-2" data-testid="auction-validator-list">
							{validators.map((validator) => {
								const assigned = splits.find((s) => s.npub === validator.pubkey)
								return (
									<div key={validator.eventId} data-testid="auction-validator-card" className="space-y-2 rounded-lg border bg-card/50 p-3">
										<div className="flex items-center gap-2">
											<ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
											<span className="truncate text-sm font-medium">{validator.validatorId}</span>
										</div>
										<DetailField
											label="Announced fee"
											value={
												<span className="font-mono tabular-nums">
													{validator.feeMinBps.toLocaleString()} bps ({bpsToPercent(validator.feeMinBps)})
												</span>
											}
										/>
										{assigned && (
											<DetailField
												label="Assigned"
												value={
													<span className="font-mono tabular-nums">
														{assigned.bps.toLocaleString()} bps ({bpsToPercent(assigned.bps)})
													</span>
												}
											/>
										)}
										<div className="flex flex-wrap gap-1">
											{validator.mints.map((mint) => (
												<Badge key={mint} variant="secondary" className="max-w-[180px] truncate font-mono text-[10px]">
													{mint}
												</Badge>
											))}
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* ----------------------------------------------------------------- */}
			{/* Settlement window + mints                                          */}
			{/* ----------------------------------------------------------------- */}
			<div className="grid gap-6 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Clock className="size-4 text-muted-foreground" />
							Settlement Window
						</CardTitle>
					</CardHeader>
					<CardContent data-testid="auction-settlement-window">
						<SettlementCountdown deadline={settlementWindow} />
						<p className="mt-2 text-xs text-muted-foreground">After the window expires, losing bids are auto-refunded.</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Mints</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-1.5" data-testid="auction-mint-list">
							{mints.length === 0 && <li className="text-sm text-muted-foreground">No mints listed.</li>}
							{mints.map((mint) => (
								<li key={mint}>
									<a
										href={mint}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex max-w-full items-center gap-1 truncate text-sm text-blue-500 hover:underline"
										data-testid="auction-mint-link"
									>
										<span className="truncate">{mint}</span>
										<ExternalLink className="size-3 shrink-0" />
									</a>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
