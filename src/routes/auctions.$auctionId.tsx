/**
 * Route: /auctions/$auctionId
 *
 * Public route that renders the {@link AuctionDetail} view for a single V4V
 * auction listing (kind 30408).
 *
 * Fetching kind 30408 events by auction coordinate requires relay wiring
 * (NIP-33 parameterized-replaceable lookups via `src/lib/nostr/io.ts`). That
 * query hook is not yet implemented in this branch, so this route renders with
 * deterministic mock data for now. When a `useAuctionListing` query lands, the
 * mock can be swapped for real relay data without changing AuctionDetail — the
 * component stays presentational and only consumes typed props.
 *
 * @see src/components/auctions/AuctionDetail.tsx
 * @see src/lib/schemas/auction-v4v.ts
 */

import { AuctionDetail } from '@/components/auctions/AuctionDetail'
import type { V4vSplit } from '@/lib/schemas/auction-v4v'
import type { ValidatorFeeAnnouncement } from '@/lib/schemas/validator-fee-announcement'
import { AUCTION_LISTING_KIND, VALIDATOR_FEE_ANNOUNCEMENT_KIND } from '@/lib/schemas/auction-kinds'
import { createFileRoute, Link } from '@tanstack/react-router'

// ---------------------------------------------------------------------------
// Mock data (temporary — replaced by a useAuctionListing query hook later)
// ---------------------------------------------------------------------------

/** A stable seller pubkey used for the mock listing (64-char hex). */
const MOCK_SELLER_NPUB = 'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516'

const MOCK_VALIDATOR_PUBKEY = 'b2c3d4e5f60718293a4b5c6d7e8f900102030405060708091011121314151617'

const MOCK_SPLITS: V4vSplit[] = [
	{ npub: MOCK_SELLER_NPUB, bps: 9200 }, // 92%
	{ npub: MOCK_VALIDATOR_PUBKEY, bps: 500 }, // 5%
	{ npub: 'c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516181', bps: 300 }, // 3% V4V
]

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

/**
 * Settlement deadline = ~2 days from now, so the countdown is live and visible
 * during development. The real value comes from the auction's created_at +
 * settlement_window once relay fetching is wired up.
 */
const MOCK_SETTLEMENT_DEADLINE = Math.floor(Date.now() / 1000) + 2 * 86_400

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/auctions/$auctionId')({
	component: AuctionDetailRouteComponent,
})

function AuctionDetailRouteComponent() {
	const { auctionId } = Route.useParams()

	return (
		<div className="space-y-6 p-4">
			<Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
				← Back
			</Link>

			{/* Mock banner — removed once relay-backed fetching replaces this. */}
			<p className="text-xs text-muted-foreground" data-testid="auction-mock-banner">
				Viewing auction <span className="font-mono">{auctionId}</span> (mock data — relay fetch not yet wired).
			</p>

			<AuctionDetail
				title="Rare Digital Artwork — Genesis Edition"
				description="A one-of-a-kind generative artwork minted on the V4V auction protocol. Proceeds split across the seller, a validator, and a V4V recipient per the breakdown below."
				startingBid={1_000}
				auctionType="english"
				splits={MOCK_SPLITS}
				mints={['https://mint.minibits.cash', 'https://mint.nutstash.app']}
				settlementWindow={MOCK_SETTLEMENT_DEADLINE}
				validators={MOCK_VALIDATORS}
				sellerNpub={MOCK_SELLER_NPUB}
			/>

			{/* Reference to the underlying event kind for context. */}
			<p className="text-center text-[10px] text-muted-foreground">Kind {AUCTION_LISTING_KIND} auction listing</p>
		</div>
	)
}
