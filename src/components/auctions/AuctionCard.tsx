/**
 * AuctionCard — presentational card showing a V4V auction listing summary.
 *
 * Displays title, starting bid, auction type badge, a V4V split summary
 * (e.g. "3 splits: Seller 80%, Validator 15%, V4V Recipient 5%"), and mint
 * count. The whole card links to the auction detail route.
 *
 * The component is presentational — it does not fetch data or publish events.
 *
 * @see src/lib/schemas/auction-v4v.ts        — V4vSplit type
 * @see src/lib/schemas/validator-fee-announcement.ts — role labeling
 */

import { Coins, Gavel } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { V4vSplit } from '@/lib/schemas/auction-v4v'
import type { ValidatorFeeAnnouncement } from '@/lib/schemas/validator-fee-announcement'
import { Link } from '@tanstack/react-router'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AuctionCardProps {
	/** Auction identifier or coordinate (used for the detail link). */
	id: string
	/** Display title of the auction. */
	title: string
	/** Starting bid in sats. */
	startingBid: number
	/** Auction format: "english", "sealed", or "dutch". */
	auctionType: string
	/** V4V split recipients (includes the seller entry). */
	splits: V4vSplit[]
	/** Supported mint URLs. */
	mints: string[]
	/** Hex pubkey of the seller — used for role labeling. */
	sellerNpub: string
	/** Validator announcements for role labeling (optional). */
	validators?: ValidatorFeeAnnouncement[]
	/** Optional className for the root element. */
	className?: string
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Converts basis points to a percentage string.
 * 8000 bps → "80%", 1500 bps → "15%", 500 bps → "5%", 50 bps → "0.5%"
 */
export function bpsToPercent(bps: number): string {
	const pct = bps / 100
	return `${pct}%`
}

/**
 * Returns a short role label for a split recipient.
 * - Seller            → "Seller"
 * - Known validator   → "Validator"
 * - Any other         → "V4V Recipient"
 */
export function getSplitRoleLabel(
	split: V4vSplit,
	sellerNpub: string,
	validators: ValidatorFeeAnnouncement[],
): string {
	if (split.npub === sellerNpub) return 'Seller'
	if (validators.some((v) => v.pubkey === split.npub)) return 'Validator'
	return 'V4V Recipient'
}

/**
 * Formats a human-readable V4V split summary.
 * e.g. "3 splits: Seller 80%, Validator 15%, V4V Recipient 5%"
 */
export function formatSplitSummary(
	splits: V4vSplit[],
	sellerNpub: string,
	validators: ValidatorFeeAnnouncement[] = [],
): string {
	const parts = splits.map((s) => `${getSplitRoleLabel(s, sellerNpub, validators)} ${bpsToPercent(s.bps)}`)
	return `${splits.length} split${splits.length !== 1 ? 's' : ''}: ${parts.join(', ')}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuctionCard({
	id,
	title,
	startingBid,
	auctionType,
	splits,
	mints,
	sellerNpub,
	validators = [],
	className = '',
}: AuctionCardProps) {
	const splitSummary = formatSplitSummary(splits, sellerNpub, validators)
	const mintCount = mints.length

	return (
		<Link
			to={`/auctions/${id}`}
			className={`group block rounded-lg border border-border bg-card text-card-foreground transition-colors hover:border-primary/50 hover:bg-accent/5 ${className}`}
			data-testid="auction-card"
		>
			<Card className="h-full border-0 bg-transparent shadow-none">
				<CardHeader className="space-y-1 pb-3">
					<div className="flex items-start justify-between gap-2">
						<CardTitle className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">
							{title}
						</CardTitle>
						<Badge variant="secondary" className="shrink-0 capitalize" data-testid="auction-type-badge">
							<Gavel className="size-3" />
							{auctionType}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-3 pt-0">
					<div className="flex items-baseline gap-1.5">
						<span className="text-lg font-semibold tabular-nums text-foreground" data-testid="auction-starting-bid">
							{startingBid.toLocaleString()}
						</span>
						<span className="text-sm font-normal text-muted-foreground">sats</span>
					</div>

					<p className="line-clamp-2 text-xs text-muted-foreground" data-testid="auction-split-summary">
						{splitSummary}
					</p>

					<div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="auction-mint-count">
						<Coins className="size-3.5" />
						<span>
							{mintCount} mint{mintCount !== 1 ? 's' : ''}
						</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	)
}
