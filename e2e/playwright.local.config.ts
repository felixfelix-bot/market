import path from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { TEST_APP_PRIVATE_KEY, RELAY_URL, BASE_URL, TEST_PORT } from './test-config'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Use system Chromium when Playwright's bundled browser isn't available
// (e.g. on Ubuntu 26.04 where prebuilt Playwright browsers don't exist yet)
const SYSTEM_CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || ''
const launchOptions = SYSTEM_CHROMIUM
	? { executablePath: SYSTEM_CHROMIUM }
	: {}

// Playwright needs its OWN ffmpeg build (not the system one) for video recording.
// On platforms where the prebuilt ffmpeg isn't installable (e.g. Ubuntu 26.04 —
// `npx playwright install ffmpeg` errors with "does not support ffmpeg on ubuntu26.04-x64"),
// `browserContext.newPage` hard-fails on every context that opts into video.
// Detect the binary and disable video when it's absent so tests can at least run.
// Video is debug-only ('retain-on-failure'), so disabling it never affects assertions.
const PW_CACHE = `${homedir()}/.cache/ms-playwright`
const hasPlaywrightFfmpeg =
	existsSync(PW_CACHE) &&
	readdirSync(PW_CACHE).some(
		(dir) => dir.startsWith('ffmpeg-') && existsSync(`${PW_CACHE}/${dir}/ffmpeg-linux`),
	)
const videoMode = hasPlaywrightFfmpeg ? 'retain-on-failure' : 'off'

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: process.env.CI ? 'github' : 'list',
	testMatch: /.*\.spec\.ts$/,

	use: {
		baseURL: BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: videoMode,
		launchOptions,
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	webServer: process.env.CI
		? []
		: [
				{
					command: 'nak serve --hostname 0.0.0.0',
					port: 10547,
					reuseExistingServer: true,
					stdout: 'pipe',
					stderr: 'pipe',
				},
				{
					command: 'bun e2e/seed-relay.ts && NODE_ENV=test bun dev',
					cwd: PROJECT_ROOT,
					port: TEST_PORT,
					reuseExistingServer: true,
					stdout: 'pipe',
					stderr: 'pipe',
					env: {
						NODE_ENV: 'test',
						PORT: String(TEST_PORT),
						APP_RELAY_URL: RELAY_URL,
						APP_PRIVATE_KEY: TEST_APP_PRIVATE_KEY,
						LOCAL_RELAY_ONLY: 'true',
						NIP46_RELAY_URL: RELAY_URL,
					},
				},
			],

	globalSetup: './global-setup.ts',
	globalTeardown: './global-teardown.ts',
	timeout: 30_000,
	expect: { timeout: 5_000 },
})
