/**
 * Route: /auctions/
 *
 * Public route listing active V4V auction listings (kind 30408).
 *
 * Fetching kind 30408 events by auction coordinate requires relay wiring
 * (NIP-33 parameterized-replaceable lookups via `src/lib/nostr/io.ts`). That
 * query hook is not yet implemented on this branch, so this route renders with
 * deterministic mock data for now. When a `useAuctionListings` query lands, the
 * mock array can be swapped for real relay data without changing the layout —
 * AuctionCard stays presentational and only consumes typed props.
 *
 * @see src/components/auctions/AuctionCard.tsx
 * @see src/lib/schemas/auction-v4v.ts
 */

import { Plus } from 'lucide-react'

import { AuctionCard } from '@/components/auctions/AuctionCard'
import { Button } from '@/components/ui/button'
import { AUCTION_LISTING_KIND, VALIDATOR_FEE_ANNOUNCEMENT_KIND } from '@/lib/schemas/auction-kinds'
import type { V4vSplit } from '@/lib/schemas/auction-v4v'
import type { ValidatorFeeAnnouncement } from '@/lib/schemas/validator-fee-announcement'
import { createFileRoute, Link } from '@tanstack/react-router'

// ---------------------------------------------------------------------------
// Mock data (temporary — replaced by a useAuctionListings query hook later)
// ---------------------------------------------------------------------------

/** Stable pubkeys used for the mock listings (64-char hex). */
const MOCK_SELLER_NPUB = 'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516'
const MOCK_VALIDATOR_PUBKEY = 'b2c3d4e5f60718293a4b5c6d7e8f900102030405060708091011121314151617'
const MOCK_PM_PUBKEY = 'c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516181'

const MOCK_VALIDATORS: ValidatorFeeAnnouncement[] = [
	{
		kind: VALIDATOR_FEE_ANNOUNCEMENT_KIND,
		validatorId: 'pleb-validator-01',
		feeMinBps: 400,
		mints: ['https://mint.minibits.cash', 'https://mint.nutstash.app'],
		auctionType: 'english',
		lockingScheme: 'P2PK',
		maxDuration: 2_592_000,
		pubkey: MOCK_VALIDATOR_PUBKEY,
		createdAt: Math.floor(Date.now() / 1000) - 86_400,
		eventId: 'd4e5f60718293a4b5c6d7e8f90010203040506070809101112131415161718219',
	},
]

interface MockAuction {
	id: string
	title: string
	startingBid: number
	auctionType: string
	sellerNpub: string
	splits: V4vSplit[]
	mints: string[]
}

const MOCK_AUCTIONS: MockAuction[] = [
	{
		id: 'genesis-edition',
		title: 'Rare Digital Artwork — Genesis Edition',
		startingBid: 1_000,
		auctionType: 'english',
		sellerNpub: MOCK_SELLER_NPUB,
		splits: [
			{ npub: MOCK_SELLER_NPUB, bps: 8_000 },
			{ npub: MOCK_VALIDATOR_PUBKEY, bps: 1_500 },
			{ npub: MOCK_PM_PUBKEY, bps: 500 },
		],
		mints: ['https://mint.minibits.cash', 'https://mint.nutstash.app'],
	},
	{
		id: 'sealed-treasury',
		title: 'Sealed-Bid Treasury Allocation',
		startingBid: 50_000,
		auctionType: 'sealed',
		sellerNpub: MOCK_SELLER_NPUB,
		splits: [
			{ npub: MOCK_SELLER_NPUB, bps: 9_500 },
			{ npub: MOCK_VALIDATOR_PUBKEY, bps: 500 },
		],
		mints: ['https://mint.minibits.cash'],
	},
	{
		id: 'dutch-clearance',
		title: 'Dutch Auction — Inventory Clearance',
		startingBid: 25_000,
		auctionType: 'dutch',
		sellerNpub: MOCK_SELLER_NPUB,
		splits: [
			{ npub: MOCK_SELLER_NPUB, bps: 9_200 },
			{ npub: MOCK_VALIDATOR_PUBKEY, bps: 500 },
			{ npub: MOCK_PM_PUBKEY, bps: 300 },
		],
		mints: ['https://mint.minibits.cash', 'https://mint.nutstash.app', 'https://mint.coinos.io'],
	},
]

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/auctions/')({
	component: AuctionsIndexRouteComponent,
})

function AuctionsIndexRouteComponent() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-8" data-testid="auctions-index">
			{/* Header */}
			<div className="mb-8 flex items-center justify-between gap-4">
				<div>
					<h1 className="font-theylive text-3xl text-foreground">Active Auctions</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						V4V auction listings with validator-verified splits.
					</p>
				</div>
				<Button asChild>
					<Link to="/dashboard/auctions/new" data-testid="create-auction-link">
						<Plus className="size-4" />
						Create Auction
					</Link>
				</Button>
			</div>

			{/* Mock banner — removed once relay-backed fetching replaces this. */}
			<p className="mb-6 text-xs text-muted-foreground" data-testid="auctions-mock-banner">
				Showing mock data — relay fetch for kind {AUCTION_LISTING_KIND} listings is not yet wired.
			</p>

			{/* Auction grid */}
			<div
				className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
				data-testid="auctions-grid"
			>
				{MOCK_AUCTIONS.map((auction) => (
					<AuctionCard
						key={auction.id}
						id={auction.id}
						title={auction.title}
						startingBid={auction.startingBid}
						auctionType={auction.auctionType}
						splits={auction.splits}
						mints={auction.mints}
						sellerNpub={auction.sellerNpub}
						validators={MOCK_VALIDATORS}
					/>
				))}
			</div>
		</div>
	)
}
