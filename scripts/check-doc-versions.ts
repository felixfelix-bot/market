#!/usr/bin/env bun
/**
 * check-doc-versions.ts — Documentation version drift detector.
 *
 * Compares the dependency versions referenced inside `.claude/` documentation
 * against the real versions declared in `package.json`.  Exits with code 1
 * (failing CI) when any key dependency's documented version has drifted.
 *
 *   Usage:  bun run scripts/check-doc-versions.ts
 *   Exit:   0 = all versions in sync · 1 = drift detected
 *
 * The version-matching logic lives in the exported `findVersionMismatches`
 * function so it can be unit-tested independently of the filesystem.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Key dependencies whose documented versions must track `package.json`.
 * Each entry lists the npm name plus any "friendly" aliases used in prose
 * (case-insensitive).  Aliases are matched with word boundaries that avoid
 * partial hits (e.g. `react` never matches inside `react-dom`).
 */
const KEY_PACKAGES: { name: string; aliases: string[] }[] = [
	{ name: '@nostr-dev-kit/ndk', aliases: ['@nostr-dev-kit/ndk'] },
	{ name: 'react', aliases: ['react'] },
	{ name: 'react-dom', aliases: ['react-dom', 'react dom'] },
	{ name: '@tanstack/react-router', aliases: ['@tanstack/react-router', 'tanstack router'] },
	{ name: '@tanstack/react-query', aliases: ['@tanstack/react-query', 'tanstack query'] },
	{ name: '@tanstack/react-store', aliases: ['@tanstack/react-store', 'tanstack store'] },
	{ name: 'nostr-tools', aliases: ['nostr-tools'] },
	{ name: 'tailwindcss', aliases: ['tailwindcss', 'tailwind css'] },
	{ name: 'zod', aliases: ['zod'] },
]

/** Documentation files scanned for stale version references. */
const DOC_FILES = [
	'.claude/skills/plebeian-market/references/libraries.md',
	'.claude/skills/plebeian-market/SKILL.md',
	'.claude/ARCHITECTURE.md',
	'.claude/skills/plebeian-market/references/nostr-integration.md',
]

const REPO_ROOT = resolve(import.meta.dirname, '..')

// ---------------------------------------------------------------------------
// Pure logic (exported for unit testing)
// ---------------------------------------------------------------------------

export interface Mismatch {
	pkg: string
	file: string
	line: number
	docVersion: string
	expectedVersion: string
	lineText: string
}

export interface DocFile {
	path: string
	content: string
}

/** Matches a semver-like token, optionally prefixed by a range operator or `v`. */
const VERSION_PATTERN = '[~^>=<]*v?\\d+(?:\\.\\d+)+(?:[-+][0-9A-Za-z.]+)?'

/** Strip semver range prefixes (^, ~, >=, …) and a leading `v`. */
export function normalizeVersion(raw: string): string {
	return raw.replace(/^[~^>=<\s]*v?/, '').trim()
}

/**
 * Build a word-boundary regex for an alias.  Both the lookbehind and lookahead
 * reject alphanumerics plus `/`, `.`, and `-` — the separators used inside npm
 * package names.  This prevents partial matches such as `react` firing inside
 * `react-dom`, `@types/react`, `lucide-react`, or `qrcode.react`.
 */
function buildAliasRegex(alias: string): RegExp {
	const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp(`(?<![A-Za-z0-9/.-])${escaped}(?![A-Za-z0-9/.-])`, 'gi')
}

/**
 * Compare expected dependency versions against the version references found in
 * the supplied docs.  Returns one {@link Mismatch} per stale reference.  Lines
 * that mention a package without a version token are ignored.
 */
export function findVersionMismatches(
	expected: Record<string, string>,
	docs: DocFile[],
	packages: { name: string; aliases: string[] }[] = KEY_PACKAGES,
): Mismatch[] {
	const mismatches: Mismatch[] = []

	for (const { name, aliases } of packages) {
		const expectedVersion = normalizeVersion(expected[name] ?? '')
		if (!expectedVersion) continue // package absent from package.json — nothing to check

		for (const doc of docs) {
			const lines = doc.content.split('\n')
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i]

				// Does this line reference the package under any of its aliases?
				const lineMatchesPackage = aliases.some((alias) => {
					const re = buildAliasRegex(alias)
					re.lastIndex = 0
					return re.test(line)
				})
				if (!lineMatchesPackage) continue

				// Extract every semver-like token on the line and compare.
				const tokenRe = new RegExp(VERSION_PATTERN, 'g')
				let m: RegExpExecArray | null
				while ((m = tokenRe.exec(line)) !== null) {
					const docVersion = normalizeVersion(m[0])
					if (docVersion && docVersion !== expectedVersion) {
						mismatches.push({
							pkg: name,
							file: doc.path,
							line: i + 1,
							docVersion,
							expectedVersion,
							lineText: line.trim(),
						})
					}
				}
			}
		}
	}

	return mismatches
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main(): void {
	const pkgPath = resolve(REPO_ROOT, 'package.json')
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
	const allDeps: Record<string, string> = {
		...pkg.dependencies,
		...pkg.devDependencies,
	}

	// Build the expected-version map only for key packages that are actually declared.
	const expected: Record<string, string> = {}
	for (const { name } of KEY_PACKAGES) {
		if (name in allDeps) expected[name] = allDeps[name]
	}

	const docs: DocFile[] = DOC_FILES.map((rel) => ({
		path: rel,
		content: readFileSync(resolve(REPO_ROOT, rel), 'utf8'),
	}))

	const mismatches = findVersionMismatches(expected, docs)

	if (mismatches.length === 0) {
		const checked = Object.keys(expected).length
		console.log(`✓ All documented versions match package.json ` + `(checked ${checked} key packages across ${docs.length} doc files).`)
		process.exit(0)
	}

	console.error(`✗ Documentation version drift detected — ${mismatches.length} stale reference(s):\n`)
	for (const m of mismatches) {
		console.error(
			`  ${m.file}:${m.line}  ${m.pkg}\n` +
				`    docs:     ${m.docVersion}\n` +
				`    expected: ${m.expectedVersion}\n` +
				`    line:     ${m.lineText}`,
		)
	}
	console.error('\nUpdate the version references above to match package.json, or run the sync task.')
	process.exit(1)
}

// Run only when executed directly, not when imported by tests.
if (import.meta.main) {
	main()
}
