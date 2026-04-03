import { test as base, expect, type Page } from '@playwright/test'
import { RelayMonitor } from './relay-monitor'
import { setupAuthContext, type TestUser } from './auth'
import { ensureScenario, resetRemoteCartForUser, type ScenarioName } from '../scenarios'
import { devUser1, devUser2, devUser3 } from '../../src/lib/fixtures'

async function installE2EStyleGuards(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const ensureStyle = () => {
			if (document.getElementById('e2e-pointer-guards')) return
			const style = document.createElement('style')
			style.id = 'e2e-pointer-guards'
			style.textContent = `bun-hmr { pointer-events: none !important; }`
			document.head.appendChild(style)
		}

		const removeBunHmr = () => {
			document.querySelectorAll('bun-hmr').forEach((node) => node.remove())
		}

		if (document.readyState === 'loading') {
			document.addEventListener(
				'DOMContentLoaded',
				() => {
					ensureStyle()
					removeBunHmr()
					new MutationObserver(removeBunHmr).observe(document.documentElement, { childList: true, subtree: true })
				},
				{ once: true },
			)
		} else {
			ensureStyle()
			removeBunHmr()
			new MutationObserver(removeBunHmr).observe(document.documentElement, { childList: true, subtree: true })
		}
	})
}

type TestFixtures = {
	/** Page with devUser1 logged in (merchant / app owner) */
	merchantPage: Page

	/** Page with devUser2 logged in (buyer) */
	buyerPage: Page

	/** Page with devUser3 logged in (no seeded profile — fresh user) */
	newUserPage: Page

	/** Relay monitor attached to the default page */
	relayMonitor: RelayMonitor

	/** Which data scenario to seed before tests. Set via test.use({ scenario: '...' }) */
	scenario: ScenarioName
}

export const test = base.extend<TestFixtures>({
	// Default scenario - override per test file with test.use({ scenario: '...' })
	scenario: ['base', { option: true }],

	relayMonitor: async ({ page }, use) => {
		const monitor = new RelayMonitor(page)
		await monitor.start()
		await use(monitor)
	},

	merchantPage: async ({ browser, scenario }, use) => {
		await ensureScenario(scenario)
		const context = await browser.newContext()
		await setupAuthContext(context, devUser1)
		const page = await context.newPage()
		await installE2EStyleGuards(page)

		// Navigate and wait for the app to load
		await page.goto('/')
		await page.waitForLoadState('networkidle')
		// Give the auto-login a moment to complete
		await expect(page.locator('header')).toBeVisible({ timeout: 10_000 })

		await use(page)
		await context.close()
	},

	buyerPage: async ({ browser, scenario }, use) => {
		await ensureScenario(scenario)
		await resetRemoteCartForUser(devUser2.sk)
		const context = await browser.newContext()
		await setupAuthContext(context, devUser2)
		const page = await context.newPage()
		await installE2EStyleGuards(page)

		await page.goto('/')
		await page.waitForLoadState('networkidle')
		await expect(page.locator('header')).toBeVisible({ timeout: 10_000 })

		await use(page)
		await context.close()
	},

	newUserPage: async ({ browser, scenario }, use) => {
		await ensureScenario(scenario)
		await resetRemoteCartForUser(devUser3.sk)
		const context = await browser.newContext()
		await setupAuthContext(context, devUser3)
		const page = await context.newPage()
		await installE2EStyleGuards(page)

		await page.goto('/')
		await page.waitForLoadState('networkidle')
		await expect(page.locator('header')).toBeVisible({ timeout: 10_000 })

		await use(page)
		await context.close()
	},
})

export { expect }
export type { TestUser }
