import { expect, type Locator, type Page } from '@playwright/test'

type WaitForWebLnOptions = {
	timeoutMs?: number
	maxInvoiceRetries?: number
}

type WaitForPaymentButtonOptions = WaitForWebLnOptions & {
	buttonName: RegExp
}

export async function waitForWebLnPaymentReady(page: Page, options: WaitForWebLnOptions = {}): Promise<Locator> {
	return waitForPaymentButtonReady(page, {
		...options,
		buttonName: /Pay with WebLN/i,
	})
}

export async function waitForPayLaterReady(page: Page, options: WaitForWebLnOptions = {}): Promise<Locator> {
	return waitForPaymentButtonReady(page, {
		...options,
		buttonName: /Pay Later|Skip Payment/i,
	})
}

async function waitForPaymentButtonReady(page: Page, options: WaitForPaymentButtonOptions): Promise<Locator> {
	const timeoutMs = options.timeoutMs ?? 30_000
	const maxInvoiceRetries = options.maxInvoiceRetries ?? 2
	const button = page.getByRole('button', { name: options.buttonName }).first()
	const deadline = Date.now() + timeoutMs
	let retriesUsed = 0

	await expect(page.getByText('Invoices', { exact: true }).first()).toBeVisible({ timeout: timeoutMs })

	while (Date.now() < deadline) {
		if (await button.isVisible().catch(() => false)) {
			return button
		}

		const generatingInvoices = page.getByText('Generating Lightning invoices...')
		if (await generatingInvoices.isVisible().catch(() => false)) {
			await page.waitForTimeout(1000)
			continue
		}

		const invoiceError = page.getByText('Unable to generate payment invoices')
		if (await invoiceError.isVisible().catch(() => false)) {
			if (retriesUsed < maxInvoiceRetries) {
				const tryAgainButton = page.getByRole('button', { name: /Try Again/i })
				if (await tryAgainButton.isVisible().catch(() => false)) {
					await tryAgainButton.click()
					retriesUsed += 1
					await page.waitForTimeout(1500)
					continue
				}
			}

			const bodyText = (
				(await page
					.locator('body')
					.textContent()
					.catch(() => '')) || ''
			).slice(0, 600)
			throw new Error(`Invoice generation failed before WebLN became available. Page excerpt: ${bodyText}`)
		}

		await page.waitForTimeout(1000)
	}

	const bodyText = (
		(await page
			.locator('body')
			.textContent()
			.catch(() => '')) || ''
	).slice(0, 600)
	throw new Error(`Timed out waiting for payment button ${options.buttonName}. Page excerpt: ${bodyText}`)
}

export async function clickWebLnPayment(button: Locator): Promise<void> {
	try {
		await button.click({ timeout: 3_000 })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		if (message.includes('intercepts pointer events') || message.includes('Timeout')) {
			await button.evaluate((el) => {
				;(el as HTMLButtonElement).click()
			})
			return
		}
		throw error
	}
}
