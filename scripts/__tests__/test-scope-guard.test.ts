import { test, expect, describe } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Regression guard for the bun/CI test *scope*, not for product behaviour.
 *
 * Why this exists: `bunfig.toml` used to set
 * `pathIgnorePatterns = ["e2e/**", "node_modules/**"]`. That ignored the whole
 * `e2e/` tree, which silently orphaned the plain `bun:test` unit guards that
 * live there (they never ran locally and no CI job referenced them) while the
 * intent was only to keep Playwright's `*.spec.ts` files away from `bun test`.
 *
 * These tests pin both halves of the fix:
 *   1. bunfig ignores Playwright specs but NOT bun:test guards under e2e/.
 *   2. the coverage-gate workflow's unit-test scope actually includes e2e/,
 *      so the guards run in CI instead of only on a developer's machine.
 */

const REPO_ROOT = join(import.meta.dir, '..', '..')

/** bun:test files under e2e/ that MUST stay runnable. */
const E2E_UNIT_GUARDS = ['e2e/lib/diff-specs.test.ts', 'e2e/playwright.config.test.ts', 'e2e/fixtures/video.test.ts']

/** Playwright specs that MUST stay out of `bun test`. */
const PLAYWRIGHT_SPECS = ['e2e/tests/products.spec.ts', 'e2e/tests/product-page.spec.ts']

/**
 * Minimal glob → RegExp for the subset of patterns bunfig uses (`**`, `*`, `?`),
 * anchored to the full path. `**&#47;` matches zero or more leading path segments.
 */
function globToRegExp(glob: string): RegExp {
	let out = ''
	for (let i = 0; i < glob.length; i++) {
		const c = glob[i]
		if (c === '*') {
			if (glob[i + 1] === '*') {
				const consumesSlash = glob[i + 2] === '/'
				out += consumesSlash ? '(?:.*/)?' : '.*'
				i += consumesSlash ? 2 : 1
			} else {
				out += '[^/]*'
			}
		} else if (c === '?') {
			out += '[^/]'
		} else {
			out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		}
	}
	return new RegExp(`^${out}$`)
}

function readBunfigIgnorePatterns(): string[] {
	const raw = readFileSync(join(REPO_ROOT, 'bunfig.toml'), 'utf8')
	const block = raw.match(/^\s*pathIgnorePatterns\s*=\s*\[([^\]]*)\]/m)
	if (!block) throw new Error('pathIgnorePatterns not found in bunfig.toml')
	return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

/** The `find …` invocation that builds the coverage-gate job's unit-test list. */
function readCoverageGateFindRoots(): { roots: string[]; nameFilter: string } {
	const wf = readFileSync(join(REPO_ROOT, '.github/workflows/coverage-gate.yml'), 'utf8')
	const block = wf.match(/UNIT_TESTS="\$\(([\s\S]*?)\)"/)
	if (!block) throw new Error('UNIT_TESTS block not found in .github/workflows/coverage-gate.yml')
	const find = block[1].match(/find\s+([\s\S]*?)-type f\s+-name '([^']+)'/)
	if (!find) throw new Error('find invocation not found inside the UNIT_TESTS block')
	const roots = find[1]
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0 && !t.startsWith('#') && !t.startsWith('\\'))
	return { roots, nameFilter: find[2] }
}

describe('bunfig test scope', () => {
	test('every e2e bun:test guard exists and uses bun:test', () => {
		for (const guard of E2E_UNIT_GUARDS) {
			const path = join(REPO_ROOT, guard)
			expect(existsSync(path)).toBe(true)
			expect(readFileSync(path, 'utf8')).toContain("from 'bun:test'")
		}
	})

	test('no pathIgnorePatterns entry swallows the e2e bun:test guards', () => {
		const patterns = readBunfigIgnorePatterns().map(globToRegExp)
		for (const guard of E2E_UNIT_GUARDS) {
			const matched = patterns.filter((re) => re.test(guard)).map((re) => re.source)
			expect({ guard, matched }).toEqual({ guard, matched: [] })
		}
	})

	test('Playwright specs stay excluded from `bun test`', () => {
		const patterns = readBunfigIgnorePatterns().map(globToRegExp)
		for (const spec of PLAYWRIGHT_SPECS) {
			expect(patterns.some((re) => re.test(spec))).toBe(true)
		}
	})

	test('a blanket e2e/** ignore would be caught by this guard', () => {
		// Sanity-check the matcher itself against the regression we fixed.
		const blanket = globToRegExp('e2e/**')
		expect(blanket.test('e2e/lib/diff-specs.test.ts')).toBe(true)
		expect(blanket.test('e2e/tests/products.spec.ts')).toBe(true)
		const narrowed = globToRegExp('e2e/**/*.spec.ts')
		expect(narrowed.test('e2e/lib/diff-specs.test.ts')).toBe(false)
		expect(narrowed.test('e2e/fixtures/video.test.ts')).toBe(false)
		expect(narrowed.test('e2e/tests/products.spec.ts')).toBe(true)
		expect(narrowed.test('e2e/nested/deep/thing.spec.ts')).toBe(true)
	})
})

describe('CI runs the e2e bun:test guards', () => {
	test('coverage-gate unit-test scope includes e2e/', () => {
		const { roots, nameFilter } = readCoverageGateFindRoots()
		expect(roots).toContain('e2e')
		// Only *.test.ts may be swept in — Playwright's *.spec.ts must never be.
		expect(nameFilter).toBe('*.test.ts')
		expect(nameFilter).not.toContain('spec')
	})

	test('the guards are inside the CI scope directories', () => {
		const { roots } = readCoverageGateFindRoots()
		for (const guard of E2E_UNIT_GUARDS) {
			expect(roots.some((root) => guard.startsWith(`${root}/`))).toBe(true)
		}
	})
})
