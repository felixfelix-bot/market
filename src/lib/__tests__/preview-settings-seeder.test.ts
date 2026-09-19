/**
 * Guards `scripts/seed-preview-settings.ts` — the per-PR preview SETTINGS
 * seeder ADOPTED verbatim from PR #1356 (`feat(preview): seed the per-PR relay
 * with app settings and optional dev data`, commit 93e8a8ba).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * PR #1372 (this branch) seeds preview CONTENT; PR #1356 seeds the app SETTINGS
 * a preview needs to boot out of `/setup`. #1356's base is a different branch
 * that is NOT an ancestor of this one, so a preview on this line only gets
 * settings if the settings seeder is carried here too. Carrying it means it is
 * now this branch's responsibility, and until this file existed no test on this
 * branch covered it at all: the content seeder had
 * `src/lib/__tests__/preview-content-fixtures.test.ts`, the settings seeder had
 * nothing.
 *
 * WHAT IS FROZEN HERE
 * -------------------
 *  1. PROVENANCE — the file is byte-identical to 93e8a8ba (sha256 pinned). It
 *     is an adoption, not a rewrite: if someone edits it, this test fails and
 *     the edit has to be justified (and re-attributed) instead of landing as a
 *     silent fork of #1356's contract.
 *  2. GUARD — missing `APP_RELAY_URL` / `APP_PRIVATE_KEY` exits 1 with the
 *     explicit message, publishes nothing.
 *  3. IDEMPOTENCY — against a hermetic in-process relay stub:
 *       * an EMPTY relay is seeded with exactly the three boot events
 *         (31990 app settings `d=plebeian-market-handler`, 30000 admin list,
 *         10002 relay list), all authored by the app key;
 *       * a SECOND run against that same now-seeded relay prints
 *         `already-seeded` and publishes ZERO further events — the property the
 *         deploy workflow relies on so re-deploys never duplicate state;
 *       * the probe is scoped to the APP pubkey, so settings written by some
 *         other key do not make the seeder think the preview is configured.
 *     The stub is `Bun.serve` on 127.0.0.1 with `nak`, no external service and
 *     no public relay — ADR-0005 test isolation, same rule the content seeder
 *     test follows.
 *  4. WIRING + ORDER — exactly ONE workflow invokes the seeder
 *     (`preview-deploy.yml`, the per-PR preview deploy), its step is gated on
 *     preview readiness, and inside that job the order is
 *     settings → app restart → content. Settings are cached at boot, so the
 *     restart is not optional; content is read per request, so it only has to
 *     come after the restart. No other workflow (production, staging,
 *     auctionsdev) may reference either seeder.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { hexToBytes } from '@noble/hashes/utils.js'
import { getPublicKey } from 'nostr-tools/pure'

const REPO_ROOT = join(import.meta.dir, '..', '..', '..')
const SEEDER = 'scripts/seed-preview-settings.ts'
const CONTENT_SEEDER = 'scripts/seed-preview-content.ts'
const PREVIEW_WORKFLOW = '.github/workflows/preview-deploy.yml'

/** The preview app key used by the deploy workflow (`APP_PRIVATE_KEY` in the compose block). */
const PREVIEW_APP_PRIVATE_KEY = 'e2e0000000000000000000000000000000000000000000000000000000000001'
const APP_PUBKEY = getPublicKey(hexToBytes(PREVIEW_APP_PRIVATE_KEY))

/** Must match the seeder's constants AND `APP_SETTINGS_D_TAG` in `src/lib/appSettings.ts`. */
const APP_SETTINGS_KIND = 31990
const ADMIN_LIST_KIND = 30000
const RELAY_LIST_KIND = 10002
const APP_SETTINGS_D_TAG = 'plebeian-market-handler'

/** Where the file was adopted from, and the exact bytes adopted. */
const ADOPTED_FROM = {
	pr: 1356,
	commit: '93e8a8ba4509e1820a16807e90565cc21c514040',
	subject: 'feat(preview): seed the per-PR relay with app settings and optional dev data',
	sha256: 'e8f2cd34f9315bab7b703c098e95ee5c37824ef689943acb0ac1a27f23af2fb2',
}

/** Read the seeder inside a test, so a missing file is a named failure rather than a collection error. */
const readSeederSource = (): string => readFileSync(join(REPO_ROOT, SEEDER), 'utf8')

// ── hermetic relay stub ──────────────────────────────────────────────────────
// The smallest NIP-01 server the seeder can talk to: REQ → matching stored
// events + EOSE, EVENT → store + OK. It is also the instrument that RECORDS
// what the seeder published, which is how "publishes nothing" is proven.

type StoredEvent = { id: string; kind: number; pubkey: string; tags: string[][] }
type Filter = { kinds?: number[]; authors?: string[]; '#d'?: string[]; limit?: number }

const matches = (event: StoredEvent, filter: Filter): boolean => {
	if (filter.kinds && !filter.kinds.includes(event.kind)) return false
	if (filter.authors && !filter.authors.includes(event.pubkey)) return false
	if (filter['#d']) {
		const d = event.tags.find((tag) => tag[0] === 'd')?.[1]
		if (!d || !filter['#d'].includes(d)) return false
	}
	return true
}

const startRelayStub = () => {
	const published: StoredEvent[] = []
	const server = Bun.serve({
		hostname: '127.0.0.1',
		port: 0,
		fetch: (request, srv) => (srv.upgrade(request) ? undefined : new Response('relay stub', { status: 200 })),
		websocket: {
			message: (ws, raw) => {
				const message = JSON.parse(String(raw)) as [string, ...unknown[]]
				if (message[0] === 'REQ') {
					const [, subId, ...filters] = message as [string, string, ...Filter[]]
					for (const event of published) {
						if (filters.some((filter) => matches(event, filter))) ws.send(JSON.stringify(['EVENT', subId, event]))
					}
					ws.send(JSON.stringify(['EOSE', subId]))
					return
				}
				if (message[0] === 'EVENT') {
					const event = message[1] as StoredEvent
					published.push(event)
					ws.send(JSON.stringify(['OK', event.id, true, '']))
				}
			},
		},
	})
	return { url: `ws://127.0.0.1:${server.port}`, published, stop: () => server.stop(true) }
}

/**
 * Run the seeder in a subprocess with a clean env; returns exit code + output.
 *
 * ASYNC ON PURPOSE: `Bun.spawnSync` would block this process's event loop, and
 * the relay stub below lives in THIS process — a synchronous spawn deadlocks the
 * seeder against a relay that cannot answer until the spawn returns.
 */
const runSeeder = async (env: Record<string, string>) => {
	const base = { ...process.env } as Record<string, string | undefined>
	for (const key of ['APP_RELAY_URL', 'APP_PRIVATE_KEY']) delete base[key]
	const proc = Bun.spawn(['bun', 'run', SEEDER], {
		cwd: REPO_ROOT,
		env: { ...base, ...env },
		stdout: 'pipe',
		stderr: 'pipe',
	})
	const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
	return { exitCode, stdout, stderr }
}

/** A seeder run that talks to the stub relay needs room for two subprocess boots. */
const SEEDER_TEST_TIMEOUT_MS = 30_000

describe('preview settings seeder — adopted from PR #1356', () => {
	test('is byte-identical to the file on #1356 at 93e8a8ba (adoption, not a fork)', () => {
		const digest = createHash('sha256')
			.update(readFileSync(join(REPO_ROOT, SEEDER)))
			.digest('hex')
		expect(
			digest,
			`${SEEDER} no longer matches PR #${ADOPTED_FROM.pr} @ ${ADOPTED_FROM.commit.slice(0, 8)} (${ADOPTED_FROM.subject}). ` +
				"If this branch really has to change #1356's seeder, update the pinned hash AND say why in the PR text — " +
				'do not let the contract drift silently.',
		).toBe(ADOPTED_FROM.sha256)
	})

	test('writes the three boot events the app needs to leave /setup', () => {
		// Source-level contract: the adopted file's kinds and `d` tag are the
		// coordinates the app reads; they are asserted behaviourally below, and
		// this pins the constants a reviewer would otherwise have to grep for.
		const seederSource = readSeederSource()
		expect(seederSource).toContain('const APP_SETTINGS_KIND = 31990')
		expect(seederSource).toContain('const ADMIN_LIST_KIND = 30000')
		expect(seederSource).toContain('const RELAY_LIST_KIND = 10002')
		expect(seederSource).toContain(`const APP_SETTINGS_D_TAG = '${APP_SETTINGS_D_TAG}'`)
	})
})

describe('preview settings seeder — guard', () => {
	test(
		'exits 1 and publishes nothing when APP_RELAY_URL and APP_PRIVATE_KEY are missing',
		async () => {
			const { exitCode, stderr, stdout } = await runSeeder({})
			expect(exitCode).toBe(1)
			expect(stderr).toContain('Missing required environment variables: APP_RELAY_URL and APP_PRIVATE_KEY')
			expect(stdout).not.toContain('seeded')
		},
		SEEDER_TEST_TIMEOUT_MS,
	)

	test(
		'exits 1 when only the relay URL is set',
		async () => {
			const stub = startRelayStub()
			try {
				const { exitCode, stderr } = await runSeeder({ APP_RELAY_URL: stub.url })
				expect(exitCode).toBe(1)
				expect(stderr).toContain('Missing required environment variables')
				expect(stub.published).toEqual([])
			} finally {
				stub.stop()
			}
		},
		SEEDER_TEST_TIMEOUT_MS,
	)
})

describe('preview settings seeder — idempotency', () => {
	test(
		'seeds an empty relay with settings + admin list + relay list, then no-ops on a re-run',
		async () => {
			const stub = startRelayStub()
			try {
				// ── GREEN: first run on an empty relay ──
				const first = await runSeeder({ APP_RELAY_URL: stub.url, APP_PRIVATE_KEY: PREVIEW_APP_PRIVATE_KEY })
				expect(first.stderr).toBe('')
				expect(first.exitCode).toBe(0)
				expect(first.stdout.split('\n')).toContain('seeded')

				const kinds = stub.published.map((event) => event.kind)
				expect(kinds).toEqual([APP_SETTINGS_KIND, ADMIN_LIST_KIND, RELAY_LIST_KIND])
				for (const event of stub.published) expect(event.pubkey).toBe(APP_PUBKEY)

				const settings = stub.published.find((event) => event.kind === APP_SETTINGS_KIND)
				expect(settings?.tags.find((tag) => tag[0] === 'd')?.[1]).toBe(APP_SETTINGS_D_TAG)
				// The app accepts settings only from its own pubkey with that exact `d`
				// tag (`APP_SETTINGS_D_TAG` in src/lib/appSettings.ts), which is why the
				// idempotency probe filters on both.
				expect(settings?.tags.some((tag) => tag[0] === 'p')).toBe(false)
				expect(stub.published.find((event) => event.kind === ADMIN_LIST_KIND)?.tags).toContainEqual(['p', APP_PUBKEY])
				expect(stub.published.find((event) => event.kind === RELAY_LIST_KIND)?.tags).toContainEqual(['r', stub.url])

				// ── the proof that a re-deploy is a pure read ──
				const publishedAfterFirst = stub.published.length
				const second = await runSeeder({ APP_RELAY_URL: stub.url, APP_PRIVATE_KEY: PREVIEW_APP_PRIVATE_KEY })
				expect(second.exitCode).toBe(0)
				expect(second.stdout.split('\n')).toContain('already-seeded')
				expect(second.stdout).not.toContain('published app settings')
				expect(stub.published.length, 'a re-run published events — the preview would duplicate state on every deploy').toBe(
					publishedAfterFirst,
				)
			} finally {
				stub.stop()
			}
		},
		SEEDER_TEST_TIMEOUT_MS,
	)

	test(
		'settings written by a DIFFERENT key do not count as configured',
		async () => {
			const stub = startRelayStub()
			try {
				// A stranger's kind 31990 with the same `d` tag: the app would ignore it
				// (author filter), so the seeder must ignore it too and seed properly.
				stub.published.push({
					id: 'f'.repeat(64),
					kind: APP_SETTINGS_KIND,
					pubkey: '0'.repeat(64),
					tags: [['d', APP_SETTINGS_D_TAG]],
				})
				const { exitCode, stdout } = await runSeeder({ APP_RELAY_URL: stub.url, APP_PRIVATE_KEY: PREVIEW_APP_PRIVATE_KEY })
				expect(exitCode).toBe(0)
				expect(stdout.split('\n')).toContain('seeded')
				expect(stdout).not.toContain('already-seeded')
				expect(stub.published.filter((event) => event.pubkey === APP_PUBKEY).map((event) => event.kind)).toEqual([
					APP_SETTINGS_KIND,
					ADMIN_LIST_KIND,
					RELAY_LIST_KIND,
				])
			} finally {
				stub.stop()
			}
		},
		SEEDER_TEST_TIMEOUT_MS,
	)
})

describe('preview settings seeding — wiring and order', () => {
	const workflowsDir = '.github/workflows'
	const workflowPaths = readdirSync(join(REPO_ROOT, workflowsDir)).map((file) => `${workflowsDir}/${file}`)
	const workflow = readFileSync(join(REPO_ROOT, PREVIEW_WORKFLOW), 'utf8')

	/** Deploy-job steps, in file order (6-space list items). */
	const deploySteps = (): string[] => {
		const jobStart = workflow.indexOf('\n  deploy:\n')
		if (jobStart < 0) throw new Error(`deploy job not found in ${PREVIEW_WORKFLOW}`)
		const job = workflow.slice(jobStart)
		const starts = [...job.matchAll(/^ {6}- /gm)].map((match) => match.index as number)
		return starts.map((start, index) => job.slice(start, starts[index + 1] ?? job.length))
	}

	/**
	 * Locate the step that actually RUNS a seeder. Matching the invocation (not
	 * just the file name) matters: a step's slice runs to the next `- `, so a
	 * comment mentioning another seeder attaches to the step above it and a
	 * name-only match would resolve two different steps to the same index.
	 */
	const stepRunning = (script: string): { step: string; index: number } => {
		const needle = `bun run ${script}`
		const index = deploySteps().findIndex((step) => step.includes(needle))
		if (index < 0) throw new Error(`no deploy step in ${PREVIEW_WORKFLOW} runs '${needle}'`)
		return { step: deploySteps()[index], index }
	}

	test('exactly one workflow invokes the settings seeder, and it is the per-PR preview deploy', () => {
		const invoking = workflowPaths.filter((path) => readFileSync(join(REPO_ROOT, path), 'utf8').includes(SEEDER))
		expect(invoking).toEqual([PREVIEW_WORKFLOW])
	})

	test('the settings seeding step is gated on preview readiness', () => {
		const { step } = stepRunning(SEEDER)
		expect(step).toContain("steps.secrets.outputs.previews_ready == 'true'")
	})

	test('order inside the deploy job is settings → app restart → content', () => {
		const settings = stepRunning(SEEDER)
		const content = stepRunning(CONTENT_SEEDER)
		const restart = deploySteps().findIndex(
			(step, index) => index > settings.index && index < content.index && /docker compose restart\b/.test(step),
		)

		expect(settings.index, 'the settings seeder step must come first').toBeLessThan(content.index)
		expect(
			restart,
			'app settings are cached at boot, so a restart must sit between the settings seed and the content seed',
		).toBeGreaterThan(settings.index)
		expect(restart, 'the restart must come before the content seed').toBeLessThan(content.index)
		expect(deploySteps()[restart]).toContain('market-app')
	})

	test('content seeding still follows the restart, which is what makes it correct', () => {
		const content = stepRunning(CONTENT_SEEDER)
		// The content step keeps its own guarantees: idempotent, preview-gated.
		expect(content.step).toContain("steps.secrets.outputs.previews_ready == 'true'")
		expect(content.step).toContain('already-seeded')
	})

	test('no non-preview workflow references either preview seeder', () => {
		// A production/staging/auctionsdev deploy must never carry these steps.
		for (const path of workflowPaths.filter((candidate) => candidate !== PREVIEW_WORKFLOW)) {
			const body = readFileSync(join(REPO_ROOT, path), 'utf8')
			expect(body.includes('seed-preview-settings'), `${path} references the preview settings seeder`).toBe(false)
			expect(body.includes('seed-preview-content'), `${path} references the preview content seeder`).toBe(false)
		}
	})
})
