/**
 * V4V Auction UI — end-to-end smoke test (video-recorded).
 *
 * Runs against the v4v worktree dev server on port 34569.
 * Tests all 4 auction routes with auth fixture.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, expect, type Page } from '@playwright/test'
import { setupAuthContext } from '../fixtures/auth'
import { devUser1 } from '../../src/lib/fixtures'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PAUSE = 800
const BASE = 'http://localhost:34569'
const VIDEO_DIR = path.resolve(__dirname, '..', 'test-results', 'v4v-smoke-video')

const test = base.extend<{ authedPage: Page }>({
	authedPage: async ({ browser }, use) => {
		const context = await browser.newContext({
			recordVideo: { dir: VIDEO_DIR },
		})
		await setupAuthContext(context, devUser1)
		const page = await context.newPage()
		await page.goto(BASE + '/')
		await page.waitForLoadState('networkidle')
		await expect(page.locator('header')).toBeVisible({ timeout: 15_000 })
		await use(page)
		await context.close()
	},
})

test.describe('V4V Auction UI smoke', () => {
	test('dashboard auction form + validator registration + detail', async ({ authedPage: page }) => {
		test.setTimeout(120_000)

		// 1. Auction creation form — step 1 (details)
		await test.step('auction form step 1 — details', async () => {
			await page.goto(BASE + '/dashboard/auctions/new')
			await expect(page.getByTestId('auction-title-input')).toBeVisible({ timeout: 20_000 })
			await expect(page.getByText('Step 1 of 4')).toBeVisible()
			await page.getByTestId('auction-title-input').fill('Smoke Test Auction')
			await page.getByTestId('auction-description-input').fill('E2E smoke-test auction for V4V dev splits')
			await page.getByTestId('auction-starting-bid-input').fill('1500')
			await page.waitForTimeout(PAUSE)
		})

		// 2. Step 2 — V4V splits editor
		await test.step('auction form step 2 — V4V splits', async () => {
			await page.getByTestId('auction-next-button').click()
			await expect(page.getByText('Step 2 of 4')).toBeVisible()
			await expect(page.getByTestId('auction-splits-table')).toBeVisible({ timeout: 10_000 })
			await expect(page.getByTestId('seller-bps-display')).toBeVisible()
			await expect(page.getByTestId('splits-total-bps')).toBeVisible()
			await expect(page.getByTestId('splits-validation-status')).toContainText(/balanced|valid/i)
			await page.waitForTimeout(PAUSE)
		})

		// 3. Step 3 — mints
		await test.step('auction form step 3 — mints', async () => {
			await page.getByTestId('auction-next-button').click()
			await expect(page.getByText('Step 3 of 4')).toBeVisible()
			await expect(page.getByTestId('auction-mint-input')).toBeVisible()
			await page.getByTestId('auction-mint-input').fill('https://mint.minibits.cash')
			await expect(page.getByTestId('auction-settlement-window-input')).toBeVisible()
			await page.waitForTimeout(PAUSE)
		})

		// 4. Step 4 — review
		await test.step('auction form step 4 — review', async () => {
			await page.getByTestId('auction-next-button').click()
			await expect(page.getByText('Step 4 of 4')).toBeVisible()
			await expect(page.getByText('Smoke Test Auction')).toBeVisible()
			await expect(page.getByTestId('auction-publish-button')).toBeVisible()
			await page.waitForTimeout(PAUSE)
		})

		// 5. Validator registration form
		await test.step('validator registration form', async () => {
			await page.goto(BASE + '/dashboard/auctions/register-validator')
			await expect(page.getByTestId('validator-id-input')).toBeVisible({ timeout: 20_000 })
			await page.getByTestId('validator-id-input').fill('smoke-validator-01')
			await page.getByTestId('validator-fee-input').fill('500')
			await expect(page.getByTestId('validator-fee-percentage')).toBeVisible()
			await page.getByTestId('validator-mint-input').fill('https://mint.nutstash.app')
			await page.getByTestId('validator-mint-add-button').click()
			await expect(page.getByTestId('validator-mint-list')).toBeVisible()
			await expect(page.getByTestId('validator-publish-button')).toBeVisible()
			await page.waitForTimeout(PAUSE)
		})

		// 6. Auction detail (mock data route)
		await test.step('auction detail with split breakdown', async () => {
			await page.goto(BASE + '/auctions/genesis-edition')
			await expect(page.getByTestId('auction-detail')).toBeVisible({ timeout: 20_000 })
			await expect(page.getByTestId('auction-splits-breakdown')).toBeVisible()
			await expect(page.getByTestId('auction-settlement-window')).toBeVisible()
			await page.waitForTimeout(PAUSE * 2)
		})
	})
})
