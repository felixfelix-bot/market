import { ProductCard } from '@/components/ProductCard'
import { PaymentDialog } from '@/components/checkout/PaymentDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { authStore } from '@/lib/stores/auth'
import type { PaymentInvoiceData } from '@/lib/types/invoice'
import { cn } from '@/lib/utils'
import { getCoordsFromATag } from '@/lib/utils/coords'
import { getStatusMessaging, getStatusStyles } from '@/lib/utils/orderUtils'
import { type OrderWithRelatedEvents } from '@/queries/orders'
import { getProductId, productSmartQueryOptions } from '@/queries/products'
import {
	getShippingInfo,
	getShippingPickupAddressString,
	getShippingService,
	parseShippingReference,
	shippingOptionByCoordinatesQueryOptions,
	shippingOptionQueryOptions,
} from '@/queries/shipping'
import { fetchV4VShares } from '@/queries/v4v'
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import { format } from 'date-fns'
import {
	Ban,
	Check,
	ChevronDown,
	ChevronUp,
	CreditCard,
	Download,
	MapPin,
	MessageSquare,
	Package,
	Receipt,
	Truck,
	CheckCircle,
	Clock,
	AlertTriangle,
	ArrowRightLeft,
	X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DetailField } from '../ui/DetailField'
import { OrderActions } from './OrderActions'
import { PrivateOrderDetailsCard } from './PrivateOrderDetailsCard'
import { TimelineEventCard } from './TimelineEventCard'
import type { ComponentType, ReactNode, SVGProps } from 'react'

// Imported helpers and components
import { getOrderId, getOrderItems, getSellerPubkey, getShippingRef, getTotalAmount } from './orderDetailHelpers'
import { useOrderInvoices } from './useOrderInvoices'
import {
	DeliveryAddressDisplay,
	IncompleteInvoicesBanner,
	InvoiceCard,
	NoPaymentRequestsCard,
	PaymentProgressBar,
	PaymentSummary,
	PickupAddressDisplay,
	ShippingInfoDisplay,
	TrackingInfoDisplay,
} from './detail'
import { UserCard } from '@/components/UserCard'

interface OrderDetailComponentProps {
	order: OrderWithRelatedEvents
}

// Map status icon names to Lucide components
const STATUS_ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
	truck: Truck,
	tick: Check,
	check: Check,
	clock: Clock,
	cross: X,
	ban: Ban,
	circle: CheckCircle,
}

// Custom size classes for consistent rendering
const ICON_SIZE_CLASSES = 'w-4 h-4'

function renderStatusIcon(iconName?: string | null, className?: string) {
	if (!iconName) return null

	const IconComponent = STATUS_ICON_MAP[iconName]

	if (!IconComponent) return null

	return <IconComponent className={cn(ICON_SIZE_CLASSES, className)} />
}

export interface TimelineEntry {
	event: NDKEvent
	type: string
	title: string
	icon: ReactNode
}

/**
 * Orders timeline entries newest-first and splits off the latest entry, which
 * stays rendered even when the timeline is collapsed, so the newest
 * settlement-relevant state is never hidden behind the collapse toggle.
 */
export function splitTimelineEvents(entries: TimelineEntry[]): { latest: TimelineEntry | null; earlier: TimelineEntry[] } {
	if (entries.length === 0) {
		return { latest: null, earlier: [] }
	}

	const sorted = [...entries].sort((a, b) => (b.event.created_at || 0) - (a.event.created_at || 0))
	const [latest, ...earlier] = sorted
	return { latest, earlier }
}

export type ProductsExpandedState = Record<string, boolean>

/** Whether every product row is currently expanded (drives the expand-all toggle). */
export function areAllProductsExpanded(productIds: string[], expanded: ProductsExpandedState): boolean {
	return productIds.length > 0 && productIds.every((id) => expanded[id])
}

/** Next per-product open state after the expand-all/collapse-all toggle is clicked. */
export function nextProductsExpandedState(productIds: string[], expanded: ProductsExpandedState): ProductsExpandedState {
	return areAllProductsExpanded(productIds, expanded) ? {} : Object.fromEntries(productIds.map((id) => [id, true]))
}

export function OrderDetailComponent({ order }: OrderDetailComponentProps) {
	const { user } = useStore(authStore)
	const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
	const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState(0)
	const [dialogInvoices, setDialogInvoices] = useState<PaymentInvoiceData[]>([])
	const [expandedProducts, setExpandedProducts] = useState<ProductsExpandedState>({})
	const [timelineExpanded, setTimelineExpanded] = useState(false)

	if (!order) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="p-8 text-center">
						<p className="text-gray-500">Order not found</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Parse order data
	const orderEvent = order.order
	const orderId = getOrderId(orderEvent)
	const buyerPubkey = orderEvent.pubkey
	const sellerPubkey = getSellerPubkey(orderEvent)
	const isBuyer = buyerPubkey === user?.pubkey
	const isOrderSeller = sellerPubkey === user?.pubkey
	const canViewLegacyBuyerContact = isBuyer
	const canViewBuyerContact = isBuyer || isOrderSeller

	const totalAmount = getTotalAmount(orderEvent)

	// Extract shipping information
	const shippingRef = getShippingRef(orderEvent)
	const shippingAddress = isBuyer ? orderEvent.tags.find((tag) => tag[0] === 'address')?.[1] : undefined
	const deliveryContact = isBuyer ? orderEvent.tags.find((tag) => tag[0] === 'email')?.[1] : undefined

	// Get status styles for coloring the header
	const {
		headerBgColor,
		bgColor: statusBadgeBgColor,
		iconName,
		label: statusLabel,
	} = useMemo(() => getStatusStyles(order), [order.latestStatus, order.latestShipping]) ?? {}
	const statusExplanation = useMemo(() => getStatusMessaging(order, isBuyer), [order.latestStatus, order.latestShipping, isBuyer])

	// Get product references and quantities from order
	const orderItems = getOrderItems(orderEvent)
	const parsedOrderItems = useMemo(
		() =>
			orderItems.map((item) => {
				let coords: { identifier: string; pubkey: string } | null = null

				if (item.productRef.includes(':')) {
					try {
						const parsed = getCoordsFromATag(item.productRef)
						coords = { identifier: parsed.identifier, pubkey: parsed.pubkey }
					} catch (err) {
						console.warn('Failed to parse product reference as a-tag', err)
					}
				}

				return {
					...item,
					lookupId: coords?.identifier || item.productRef,
					itemSellerPubkey: coords?.pubkey || sellerPubkey,
				}
			}),
		[orderItems, sellerPubkey],
	)

	// Create a quantity map keyed by the product lookup id (prefer d-tag over event id)
	const quantityMap = useMemo(() => {
		const map = new Map<string, number>()
		parsedOrderItems.forEach((item) => {
			if (item.lookupId) {
				map.set(item.lookupId, item.quantity)
			}
			map.set(item.productRef, item.quantity)
		})
		return map
	}, [parsedOrderItems])

	// Fetch products
	const productQueries = useQueries({
		queries: parsedOrderItems.map((item) => ({
			...productSmartQueryOptions(item.lookupId, item.itemSellerPubkey),
			enabled: !!item.lookupId,
		})),
	})

	// Fetch V4V shares for the seller
	const { data: sellerV4VShares = [] } = useQuery({
		queryKey: ['v4vShares', sellerPubkey],
		queryFn: () => fetchV4VShares(sellerPubkey),
		enabled: !!sellerPubkey,
	})

	// Use the invoice hook
	const {
		enrichedInvoices,
		paidInvoices,
		incompleteInvoices,
		totalInvoices,
		paymentProgress,
		generatingInvoices,
		handleGenerateNewInvoice,
		handlePaymentComplete,
		handlePaymentFailed,
	} = useOrderInvoices({
		order,
		sellerV4VShares,
		userPubkey: user?.pubkey,
	})

	// Parse shipping reference and fetch shipping option details
	const parsedShippingData = useMemo(() => {
		if (!shippingRef) return null

		if (shippingRef.includes(':')) {
			const parts = shippingRef.split(':')
			if (parts.length === 3 && parts[0] === '30406') {
				return { pubkey: parts[1], dTag: parts[2] }
			}
		}

		return null
	}, [shippingRef])

	// Fetch shipping option by coordinates if we have parsed data
	const { data: shippingOptionByCoords } = useQuery({
		...shippingOptionByCoordinatesQueryOptions(parsedShippingData?.pubkey || '', parsedShippingData?.dTag || ''),
		enabled: !!parsedShippingData,
	})

	// Fetch shipping option by ID if we don't have coordinates
	const { data: shippingOptionById } = useQuery({
		...shippingOptionQueryOptions(parseShippingReference(shippingRef || '')),
		enabled: !!shippingRef && !parsedShippingData,
	})

	// Use the appropriate shipping option
	const shippingOption = shippingOptionByCoords || shippingOptionById

	// Extract shipping information
	const shippingInfo = shippingOption ? getShippingInfo(shippingOption) : null
	const isPickupService = shippingOption ? getShippingService(shippingOption)?.[1] === 'pickup' : false
	const isDigitalService = shippingOption ? getShippingService(shippingOption)?.[1] === 'digital' : false
	const pickupAddress = shippingOption && isPickupService ? getShippingPickupAddressString(shippingOption) : null
	const shouldShowPrivateDetailsUnavailable = isOrderSeller && Boolean(shippingOption) && !isPickupService && !order.privateOrderDetails

	const products = productQueries.map((query) => query.data).filter(Boolean) as NDKEvent[]

	const openPaymentDialog = (invoiceList: PaymentInvoiceData[]) => {
		if (!invoiceList.length) return
		setDialogInvoices(invoiceList)
		setSelectedInvoiceIndex(0)
		setPaymentDialogOpen(true)
	}

	const onPaymentComplete = async (invoiceId: string, preimage: string) => {
		setPaymentDialogOpen(false)
		await handlePaymentComplete(invoiceId, preimage, dialogInvoices)
	}

	const onPaymentFailed = (invoiceId: string, error: string) => {
		handlePaymentFailed(invoiceId, error)
	}

	if (!order.order) {
		return (
			<div className="text-center py-8">
				<h2 className="text-xl font-semibold text-gray-900">Order not found</h2>
				<p className="text-gray-600 mt-2">The requested order could not be found.</p>
			</div>
		)
	}

	// Timeline events
	const allEvents: TimelineEntry[] = [
		...order.statusUpdates.map((event) => ({
			event,
			type: 'status',
			title: 'Status Update',
			icon: <Package className="w-5 h-5" />,
		})),
		...order.shippingUpdates.map((event) => ({
			event,
			type: 'shipping',
			title: 'Shipping Update',
			icon: <Truck className="w-5 h-5" />,
		})),
		...order.paymentRequests.map((event) => ({
			event,
			type: 'payment_request',
			title: 'Payment Request',
			icon: <CreditCard className="w-5 h-5" />,
		})),
		...order.paymentReceipts.map((event) => ({
			event,
			type: 'payment',
			title: 'Payment Receipt',
			icon: <Receipt className="w-5 h-5" />,
		})),
		...order.generalMessages.map((event) => ({
			event,
			type: 'message',
			title: 'Message',
			icon: <MessageSquare className="w-5 h-5" />,
		})),
	]

	// The latest event is always rendered; older events live behind the collapse toggle
	const { latest: latestTimelineEvent, earlier: earlierTimelineEvents } = splitTimelineEvents(allEvents)
	const timelineTotal = allEvents.length

	const headerTitle = `Products (${products.length} unique)`
	const headerSubText = `${orderItems.reduce((total, item) => total + item.quantity, 0)} items`
	const productIds = products.map((product) => product.id)
	const allProductsExpanded = areAllProductsExpanded(productIds, expandedProducts)

	return (
		<div className="container mx-auto px-4 py-4">
			<div className="space-y-6">
				{/* Order Header */}
				{/* === ORDER HEADER === */}
				<Card>
					<CardHeader className="p-0">
						<div className={cn('p-4 rounded-t-xl', headerBgColor)}>
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
								<div>
									<p className="text-sm font-medium text-gray-900">{'Products'}</p>
									<h2 className="font-semibold truncate max-w-[300px] text-gray-800" title={headerTitle}>
										{headerTitle}
									</h2>
									{headerSubText && <p className="text-xs text-gray-600 mt-0.5">{headerSubText}</p>}
								</div>
							</div>

							<div className="border-t border-white/20 pt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<DetailField label="Amount:" value={`${totalAmount} sats`} valueClassName="font-bold text-gray-900" />
									<DetailField
										label="Date:"
										value={orderEvent.created_at ? format(new Date(orderEvent.created_at * 1000), 'dd.MM.yyyy, HH:mm') : 'N/A'}
										valueClassName="text-gray-900"
									/>
								</div>
							</div>
						</div>
					</CardHeader>

					<CardContent className="pt-4">
						{/* STATUS SECTION - Separated from actions */}
						<div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
							<div className="flex items-center gap-2 mb-2">
								<div className={`p-1.5 rounded-md ${statusBadgeBgColor}`}>{renderStatusIcon(iconName)}</div>
								<span className="font-semibold text-gray-900 capitalize">{statusLabel}</span>
							</div>
							<p className="text-sm text-gray-700 ml-9">{statusExplanation || 'No pending actions required.'}</p>
						</div>

						{/* ORDER ACTIONS - Now at the bottom with labels */}
						<OrderActions order={order} userPubkey={user?.pubkey || ''} />
					</CardContent>
				</Card>

				{/* Buyer Information Card */}
				<Card>
					<CardHeader>
						<CardTitle>Buyer</CardTitle>
					</CardHeader>
					<CardContent>
						<UserCard pubkey={buyerPubkey} size="md" subtitle="nip-05" />
					</CardContent>
				</Card>

				{canViewLegacyBuyerContact && deliveryContact && (
					<Card>
						<CardHeader>
							<CardTitle>Buyer Contact</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-gray-700">
								<strong>Delivery contact:</strong> {deliveryContact}
							</p>
							<p className="text-xs text-gray-500 mt-2">The seller can use this contact for order coordination after payment settles.</p>
						</CardContent>
					</Card>
				)}

				<PrivateOrderDetailsCard order={order} currentUserPubkey={user?.pubkey} showUnavailable={shouldShowPrivateDetailsUnavailable} />

				{/* Products */}
				{products.length > 0 && (
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>{'Products'}</CardTitle>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setExpandedProducts((prev) => nextProductsExpandedState(productIds, prev))}
									aria-label={allProductsExpanded ? 'Collapse all products' : 'Expand all products'}
								>
									{allProductsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 gap-4">
								{products.map((product) => {
									const lookupId = getProductId(product) || product.id
									const quantity = quantityMap.get(lookupId) || quantityMap.get(product.id) || 1
									const productTitle = product.tags.find((tag) => tag[0] === 'title')?.[1] || 'Product'
									const isExpanded = !!expandedProducts[product.id]

									return (
										<Collapsible
											key={product.id}
											className="border rounded-lg overflow-hidden"
											open={isExpanded}
											onOpenChange={(open) => setExpandedProducts((prev) => ({ ...prev, [product.id]: open }))}
										>
											<CollapsibleTrigger asChild>
												<button
													type="button"
													className="w-full p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
													aria-label={`${isExpanded ? 'Hide' : 'Show'} details for ${productTitle}`}
												>
													<span className="flex items-center gap-3 flex-1 min-w-0 text-left">
														<span className="font-medium truncate">{productTitle}</span>
														<span className="text-sm text-gray-500 shrink-0">Qty: {quantity}</span>
													</span>
													{isExpanded ? (
														<ChevronUp className="w-5 h-5 text-gray-500 shrink-0" />
													) : (
														<ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
													)}
												</button>
											</CollapsibleTrigger>
											<CollapsibleContent>
												<div className="p-4 border-t border-gray-200 bg-gray-50">
													<ProductCard product={product} />
												</div>
											</CollapsibleContent>
										</Collapsible>
									)
								})}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Shipping Information */}
				{(shippingInfo || shippingAddress) && (
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								{isPickupService ? (
									<MapPin className="w-5 h-5" />
								) : isDigitalService ? (
									<Download className="w-5 h-5" />
								) : (
									<Truck className="w-5 h-5" />
								)}
								<CardTitle>
									{isPickupService ? 'Pickup Information' : isDigitalService ? 'Digital Delivery' : 'Shipping Information'}
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{shippingInfo && <ShippingInfoDisplay shippingInfo={shippingInfo} />}

								{isPickupService && pickupAddress && <PickupAddressDisplay pickupAddress={pickupAddress} />}

								{isDigitalService && (
									<div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
										<div className="flex items-start gap-2">
											<Download className="w-4 h-4 text-purple-600 mt-0.5" />
											<div>
												<p className="font-medium text-purple-900">Digital Delivery</p>
												<p className="text-sm text-purple-800 mt-1">
													The seller will use the buyer-provided delivery contact after payment settles.
												</p>
											</div>
										</div>
									</div>
								)}

								{!isPickupService && !isDigitalService && shippingAddress && <DeliveryAddressDisplay shippingAddress={shippingAddress} />}

								<TrackingInfoDisplay
									trackingNumber={order.latestShipping?.tags.find((tag) => tag[0] === 'tracking')?.[1]}
									carrier={order.latestShipping?.tags.find((tag) => tag[0] === 'carrier')?.[1]}
									shippingStatus={order.latestShipping?.tags.find((tag) => tag[0] === 'status')?.[1]}
								/>

								{shippingInfo?.description && (
									<div className="mt-4 p-3 bg-gray-50 rounded-lg">
										<p className="text-sm text-gray-700">{shippingInfo.description}</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* --- PAYMENT SECTION --- */}
				{
					/* For Products: Show Invoice Logic */
					<>
						{totalInvoices > 0 && (
							<Card>
								<CardHeader className="p-0">
									<div className="bg-gray-50 p-4 rounded-t-xl">
										<div className="flex items-start gap-2">
											<CreditCard className="w-5 h-5" />
											<div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
												<CardTitle>Payment Details</CardTitle>
												<span className="text-muted-foreground">({totalInvoices} invoices)</span>
											</div>
										</div>
										<div className="my-3 border-b border-gray-300 sm:hidden" />
										<PaymentSummary enrichedInvoices={enrichedInvoices} />
									</div>
								</CardHeader>
								<CardContent className="space-y-4 pt-4">
									{isBuyer && incompleteInvoices.length > 0 && (
										<IncompleteInvoicesBanner
											count={incompleteInvoices.length}
											onRefresh={() => {
												toast.info('Refreshing payment status for all incomplete invoices...')
											}}
										/>
									)}

									<PaymentProgressBar paidCount={paidInvoices.length} totalCount={totalInvoices} progressPercent={paymentProgress} />

									<div className="grid gap-3">
										{enrichedInvoices.map((invoice, index) => (
											<InvoiceCard
												key={invoice.id}
												invoice={invoice}
												index={index}
												totalInvoices={enrichedInvoices.length}
												isBuyer={isBuyer}
												isGenerating={generatingInvoices.has(invoice.id)}
												onPay={(inv) => openPaymentDialog([inv])}
												onGenerateNew={handleGenerateNewInvoice}
											/>
										))}
									</div>

									{/* V4V recipients render removed (#472); the sellerV4VShares query stays and keeps feeding invoice generation in useOrderInvoices. */}
								</CardContent>
							</Card>
						)}
						{totalInvoices === 0 && <NoPaymentRequestsCard isBuyer={isBuyer} />}
					</>
				}

				{/* Order Timeline */}
				{allEvents.length > 0 && (
					<div>
						<h2 className="text-xl font-bold mb-4">Order Timeline</h2>

						{/* Latest state is always visible, even when the rest of the
						    timeline is collapsed, so settlement proof stays on screen. */}
						{latestTimelineEvent && (
							<TimelineEventCard
								event={latestTimelineEvent.event}
								type={latestTimelineEvent.type}
								title={latestTimelineEvent.title}
								icon={latestTimelineEvent.icon}
								timelineIndex={timelineTotal}
							/>
						)}

						{earlierTimelineEvents.length > 0 && (
							<Collapsible open={timelineExpanded} onOpenChange={setTimelineExpanded}>
								<div className="mt-2">
									<CollapsibleTrigger asChild>
										<Button variant="ghost" size="sm" className="text-sm text-gray-500">
											{timelineExpanded ? (
												<>
													<ChevronUp className="w-4 h-4" />
													Hide earlier events
												</>
											) : (
												<>
													<ChevronDown className="w-4 h-4" />
													Show {earlierTimelineEvents.length} earlier {earlierTimelineEvents.length === 1 ? 'event' : 'events'}
												</>
											)}
										</Button>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div className="space-y-4 mt-4">
											{earlierTimelineEvents.map(({ event, type, title, icon }, index) => (
												<TimelineEventCard
													key={event.id}
													event={event}
													type={type}
													title={title}
													icon={icon}
													timelineIndex={timelineTotal - (index + 1)}
												/>
											))}
										</div>
									</CollapsibleContent>
								</div>
							</Collapsible>
						)}
					</div>
				)}
			</div>

			{/* Payment Dialog */}
			<PaymentDialog
				open={paymentDialogOpen}
				onOpenChange={setPaymentDialogOpen}
				invoices={dialogInvoices}
				currentIndex={selectedInvoiceIndex}
				onPaymentComplete={onPaymentComplete}
				onPaymentFailed={onPaymentFailed}
				title={`Pay for Order #${orderId.substring(0, 8)}...`}
				showNavigation={dialogInvoices.length > 1}
				nwcEnabled={true}
			/>
		</div>
	)
}
