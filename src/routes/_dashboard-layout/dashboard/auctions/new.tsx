/**
 * Route: /dashboard/auctions/new
 *
 * Renders the multi-step AuctionForm for creating a V4V auction listing.
 */

import { AuctionForm } from '@/components/auctions/AuctionForm'
import { authStore } from '@/lib/stores/auth'
import { useDashboardTitle } from '@/routes/_dashboard-layout'
import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'

export const Route = createFileRoute('/_dashboard-layout/dashboard/auctions/new')({
	component: NewAuctionComponent,
})

function NewAuctionComponent() {
	useDashboardTitle('Create Auction')

	const { user } = useStore(authStore)
	const sellerNpub = user?.pubkey ?? ''

	if (!sellerNpub) {
		return (
			<div className="flex items-center justify-center py-12 text-muted-foreground">
				<p>Please sign in to create an auction.</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<AuctionForm sellerNpub={sellerNpub} />
		</div>
	)
}
