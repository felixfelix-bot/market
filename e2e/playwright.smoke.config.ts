/**
 * Standalone smoke config for V4V auction tests.
 * Points at the v4v worktree dev server on port 34569.
 * Forces video on, no webServer management (server started separately).
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	workers: 1,
	reporter: 'list',
	testMatch: /v4v-auction-smoke\.spec\.ts$/,
	outputDir: './test-results/v4v-smoke-video',
	use: {
		baseURL: 'http://localhost:34569',
		trace: 'on',
		screenshot: 'on',
		video: 'on',
		launchOptions: { slowMo: 150 },
		...devices['Desktop Chrome'],
	},
	timeout: 120_000,
	expect: { timeout: 15_000 },
})
