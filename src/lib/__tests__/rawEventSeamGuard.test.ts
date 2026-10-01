/**
 * B2 regression guard (PR #1280 review 5235113240, round 4).
 *
 * The seller dashboard's DLEQ ingestion path called `b.rawEvent()` on data
 * fetched through the Nostr I/O seam. `useAuctionBids` returns
 * `NostrEventLike[]` (`eventLike.ts`), which has no `rawEvent` member — a
 * static type error, and a runtime `b.rawEvent is not a function` render
 * crash whenever the active fetch port returns plain raw events (the
 * applesauce/io port does; `io.ts:54-64`). The supported conversion is the
 * `toRawEvent` helper, per the contract in `src/lib/nostr/eventLike.ts`.
 *
 * Render surfaces (routes/, components/) consume fetch-seam data, not
 * `NDKEvent`s they constructed themselves — `NDKEvent` construction and its
 * `.rawEvent()` calls belong to publish/, queries' NDK bridges, and server/
 * managers. So this guard scans routes/ and components/ for direct
 * `.rawEvent()` calls and fails on the first one, naming file:line.
 *
 * Styled after the NDK footprint guard (`ndk-footprint-guard.test.ts`):
 * a source-scanning regression test, no rendering required.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

const SCANNED_ROOTS = [join(import.meta.dir, '..', '..', 'routes'), join(import.meta.dir, '..', '..', 'components')] as const

const SOURCE_FILE = /\.(ts|tsx)$/
const TEST_FILE = /\.(test|integration)\./
const DIRECT_RAW_EVENT_CALL = /\.rawEvent\s*\(\s*\)/

/** Remove `//`-line and `/* *\/`-block comments so the guard matches code only. */
const stripComments = (source: string): string =>
	source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|\s)\/\/.*$/gm, '$1')

/** Recursively collect non-test .ts/.tsx files under `dir` (concurrent walk). */
async function collectSourceFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true })
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const path = join(dir, entry.name)
			if (entry.isDirectory()) return collectSourceFiles(path)
			return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : []
		}),
	)
	return nested.flat()
}

describe('B2: render surfaces must not call .rawEvent() directly (use toRawEvent)', () => {
	test(
		'no direct .rawEvent() call exists under src/routes/ or src/components/',
		async () => {
			const files = (await Promise.all(SCANNED_ROOTS.map((root) => collectSourceFiles(root)))).flat()
			const sources = await Promise.all(files.map(async (file) => [file, stripComments(await readFile(file, 'utf8'))] as const))
			const offenders = sources.flatMap(([file, source]) =>
				source
					.split('\n')
					.map((line, index) => (DIRECT_RAW_EVENT_CALL.test(line) ? `${file}:${index + 1}: ${line.trim()}` : ''))
					.filter(Boolean),
			)
			expect(offenders).toEqual([])
		},
		20000,
	)
})
