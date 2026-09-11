import { SHIPPING_KIND } from '@/lib/schemas/shippingOption'
import { normalizeProductShippingSelections, type ProductShippingSelectionInput } from '@/lib/utils/productShippingSelections'
import { productKeys } from '@/queries/queryKeyFactory'
import { markProductAsDeleted } from '@/queries/products'
import { getUser, publish, sign, type EventTemplate } from '@/lib/nostr/io'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClientTag } from './nip89'

export interface ProductFormData {
	name: string
	summary: string
	description: string
	price: string
	quantity: string
	currency: string
	status: 'hidden' | 'on-sale' | 'pre-order'
	productType: 'single' | 'variable'
	mainCategory: string
	selectedCollection: string | null
	categories: Array<{ key: string; name: string; checked: boolean }>
	images: Array<{ imageUrl: string; imageOrder: number }>
	specs: Array<{ key: string; value: string }>
	shippings: ProductShippingSelectionInput[]
	weight: { value: string; unit: string } | null
	dimensions: { value: string; unit: string } | null
	isNSFW: boolean
}

/**
 * Creates a new product event template (kind 30402).
 *
 * Returns a raw nostr-tools `EventTemplate` (no wrapper class). Signing and
 * publishing are handled by the io.ts seam (`sign` / `publish`), which route
 * through the active adapter.
 */
export const createProductEvent = (
	formData: ProductFormData,
	productId?: string, // Optional for updates
	appPubkey?: string, // Optional app pubkey for client tag
	handlerId?: string, // Optional handler ID for client tag
): EventTemplate => {
	// Generate a unique ID if not provided (for new products)
	const id = productId || `product_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

	// Build tags
	const imagesTags = formData.images.map((img) => ['image', img.imageUrl, '800x600', img.imageOrder.toString()])

	const categoryTags: string[][] = []
	categoryTags.push(['t', formData.mainCategory])

	formData.categories
		.filter((cat) => cat.checked && cat.name.trim() !== '')
		.forEach((cat) => {
			categoryTags.push(['t', cat.name])
		})

	const specTags = formData.specs.map((spec) => ['spec', spec.key, spec.value])

	const normalizedShippings = normalizeProductShippingSelections(formData.shippings)

	const shippingTags = normalizedShippings
		.filter((ship) => ship.shippingRef)
		.map((ship) => {
			return ship.extraCost
				? (['shipping_option', ship.shippingRef, ship.extraCost] as string[])
				: (['shipping_option', ship.shippingRef] as string[])
		})

	const weightTag = formData.weight ? [['weight', formData.weight.value, formData.weight.unit] as string[]] : []

	const dimensionsTag = formData.dimensions ? [['dim', formData.dimensions.value, formData.dimensions.unit] as string[]] : []

	const collectionTag = formData.selectedCollection ? [['collection', formData.selectedCollection] as string[]] : []

	// Add client tag if app pubkey and handler ID are provided (NIP-89)
	const clientTag = appPubkey && handlerId ? [createClientTag(appPubkey, handlerId)] : []

	// Add content warning tag for NSFW products
	const contentWarningTag = formData.isNSFW ? [['content-warning', 'nsfw'] as string[]] : []

	// Required tags
	const tags: string[][] = [
		['d', id], // Product identifier - this is the key for updates!
		['title', formData.name],
		['price', formData.price, formData.currency],
		['type', formData.productType === 'single' ? 'simple' : 'variable', 'physical'],
		['visibility', formData.status],
		['stock', formData.quantity],
		...(formData.summary ? [['summary', formData.summary] as string[]] : []),
		...imagesTags,
		...categoryTags,
		...specTags,
		...shippingTags,
		...weightTag,
		...dimensionsTag,
		...collectionTag,
		...clientTag,
		...contentWarningTag,
	]

	return {
		kind: 30402, // Product listings kind
		content: formData.description,
		tags,
		created_at: Math.floor(Date.now() / 1000),
	}
}

/**
 * Publishes a new product
 */
export const publishProduct = async (formData: ProductFormData): Promise<string> => {
	// Validation
	if (!formData.name.trim()) {
		throw new Error('Product name is required')
	}

	if (!formData.description.trim()) {
		throw new Error('Product description is required')
	}

	if (!formData.price.trim() || isNaN(Number(formData.price))) {
		throw new Error('Valid product price is required')
	}

	if (!formData.quantity.trim() || isNaN(Number(formData.quantity))) {
		throw new Error('Valid product quantity is required')
	}

	if (formData.images.length === 0) {
		throw new Error('At least one product image is required')
	}

	if (!formData.mainCategory) {
		throw new Error('Main category is required')
	}

	// Validate shipping options
	const validShippings = normalizeProductShippingSelections(formData.shippings).filter((ship) => ship.shippingRef)
	if (validShippings.length === 0) {
		throw new Error('At least one shipping option is required')
	}

	const template = createProductEvent(formData)

	const event = await sign(template)
	await publish(event)

	return event.id
}

/**
 * Updates an existing product by preserving the original d tag
 */
export const updateProduct = async (productDTag: string, formData: ProductFormData): Promise<string> => {
	// Validation
	if (!productDTag) {
		throw new Error('Product d tag is required for updates')
	}

	if (!formData.name.trim()) {
		throw new Error('Product name is required')
	}

	if (!formData.description.trim()) {
		throw new Error('Product description is required')
	}

	if (!formData.price.trim() || isNaN(Number(formData.price))) {
		throw new Error('Valid product price is required')
	}

	if (!formData.quantity.trim() || isNaN(Number(formData.quantity))) {
		throw new Error('Valid product quantity is required')
	}

	if (formData.images.length === 0) {
		throw new Error('At least one product image is required')
	}

	if (!formData.mainCategory) {
		throw new Error('Main category is required')
	}

	// Validate shipping options
	const validShippings = normalizeProductShippingSelections(formData.shippings).filter((ship) => ship.shippingRef)
	if (validShippings.length === 0) {
		throw new Error('At least one shipping option is required')
	}

	// Create event with the same d tag to update the existing product
	const template = createProductEvent(formData, productDTag)

	const event = await sign(template)
	await publish(event)

	return event.id
}

/**
 * Deletes a product by publishing a deletion event
 */
export const deleteProduct = async (productDTag: string): Promise<boolean> => {
	try {
		// Create a deletion event (kind 5)
		const user = await getUser()
		if (!user?.pubkey) throw new Error('No active user')

		const template: EventTemplate = {
			kind: 5,
			content: 'Product deleted',
			tags: [['a', `30402:${user.pubkey}:${productDTag}`]],
			created_at: Math.floor(Date.now() / 1000),
		}

		const deleteEvent = await sign(template)
		await publish(deleteEvent)

		return true
	} catch (error) {
		console.error('Error deleting product:', error)
		throw error
	}
}

/**
 * Mutation hook for publishing a new product
 */
export const usePublishProductMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (formData: ProductFormData) => {
			return publishProduct(formData)
		},

		onSuccess: async (eventId) => {
			// Get current user pubkey
			const user = await getUser()
			const userPubkey = user?.pubkey ?? ''

			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: productKeys.all })
			if (userPubkey) {
				queryClient.invalidateQueries({ queryKey: productKeys.byPubkey(userPubkey) })
			}

			toast.success('Product published successfully')
			return eventId
		},

		onError: (error) => {
			console.error('Failed to publish product:', error)
			toast.error(`Failed to publish product: ${error instanceof Error ? error.message : String(error)}`)
		},
	})
}

/**
 * Mutation hook for updating an existing product
 */
export const useUpdateProductMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ productDTag, formData }: { productDTag: string; formData: ProductFormData }) => {
			return updateProduct(productDTag, formData)
		},

		onSuccess: async (eventId, { productDTag }) => {
			// Get current user pubkey
			const user = await getUser()
			const userPubkey = user?.pubkey ?? ''

			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: productKeys.all })
			if (userPubkey) {
				queryClient.invalidateQueries({ queryKey: productKeys.byPubkey(userPubkey) })
			}

			// Also invalidate the specific product if we can
			if (eventId) {
				queryClient.invalidateQueries({ queryKey: productKeys.details(eventId) })
			}

			toast.success('Product updated successfully')
			return eventId
		},

		onError: (error) => {
			console.error('Failed to update product:', error)
			toast.error(`Failed to update product: ${error instanceof Error ? error.message : String(error)}`)
		},
	})
}

/**
 * Mutation hook for deleting a product
 */
export const useDeleteProductMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (productDTag: string) => {
			return deleteProduct(productDTag)
		},

		onSuccess: async (success, productDTag) => {
			// Mark product as deleted locally so it's filtered from queries
			// even if relays still return it
			markProductAsDeleted(productDTag)

			// Get current user pubkey
			const user = await getUser()
			const userPubkey = user?.pubkey ?? ''

			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: productKeys.all })
			if (userPubkey) {
				queryClient.invalidateQueries({ queryKey: productKeys.byPubkey(userPubkey) })
			}

			toast.success('Product deleted successfully')
			return success
		},

		onError: (error) => {
			console.error('Failed to delete product:', error)
			toast.error(`Failed to delete product: ${error instanceof Error ? error.message : String(error)}`)
		},
	})
}
