import { expect, type Locator, type Page } from '@playwright/test'

type WaitForWebLnOptions = {
	timeoutMs?: number
	maxInvoiceRetries?: number
}

export async function waitForWebLnPaymentReady(page: Page, options: WaitForWebLnOptions = {}): Promise<Locator> {
	const timeoutMs = options.timeoutMs ?? 30_000
	const maxInvoiceRetries = options.maxInvoiceRetries ?? 2
	const webLnButton = page.getByRole('button', { name: 'Pay with WebLN' })

	await expect(page.getByText('Invoices', { exact: true })).toBeVisible({ timeout: timeoutMs })

	for (let attempt = 0; attempt <= maxInvoiceRetries; attempt++) {
		if (await webLnButton.isVisible().catch(() => false)) {
			return webLnButton
		}

		const invoiceError = page.getByText('Unable to generate payment invoices')
		if (await invoiceError.isVisible().catch(() => false)) {
			if (attempt < maxInvoiceRetries) {
				const tryAgainButton = page.getByRole('button', { name: /Try Again/i })
				if (await tryAgainButton.isVisible().catch(() => false)) {
					await tryAgainButton.click()
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
	throw new Error(`Timed out waiting for \"Pay with WebLN\". Page excerpt: ${bodyText}`)
}
