import { describe, expect, test } from 'bun:test'
import { findVersionMismatches, normalizeVersion, type DocFile } from './check-doc-versions'

const PACKAGES = [
	{ name: 'react', aliases: ['react'] },
	{ name: 'react-dom', aliases: ['react-dom', 'react dom'] },
	{ name: '@nostr-dev-kit/ndk', aliases: ['@nostr-dev-kit/ndk'] },
	{ name: '@tanstack/react-router', aliases: ['@tanstack/react-router', 'tanstack router'] },
	{ name: '@tanstack/react-store', aliases: ['@tanstack/react-store', 'tanstack store'] },
	{ name: 'tailwindcss', aliases: ['tailwindcss', 'tailwind css'] },
	{ name: 'zod', aliases: ['zod'] },
]

describe('normalizeVersion', () => {
	test('strips caret prefix', () => {
		expect(normalizeVersion('^19.2.6')).toBe('19.2.6')
	})
	test('strips tilde prefix', () => {
		expect(normalizeVersion('~0.11.0')).toBe('0.11.0')
	})
	test('strips leading v', () => {
		expect(normalizeVersion('v3.0.3')).toBe('3.0.3')
	})
	test('leaves bare semver untouched', () => {
		expect(normalizeVersion('3.0.3')).toBe('3.0.3')
	})
	test('strips combined prefix ^v', () => {
		expect(normalizeVersion('^v1.2.3')).toBe('1.2.3')
	})
})

describe('findVersionMismatches', () => {
	test('returns no mismatches when docs match package.json', () => {
		const docs: DocFile[] = [
			{
				path: 'libraries.md',
				content: [
					'- **React:** ^19.2.6',
					'- **React DOM:** ^19.2.6',
					'- **@nostr-dev-kit/ndk:** 3.0.3 (core NDK)',
					'- **zod:** ^4.4.3 (validation)',
				].join('\n'),
			},
		]
		const expected = {
			react: '^19.2.6',
			'react-dom': '^19.2.6',
			'@nostr-dev-kit/ndk': '3.0.3',
			zod: '^4.4.3',
		}
		expect(findVersionMismatches(expected, docs, PACKAGES)).toEqual([])
	})

	test('detects a stale version in bold-list format', () => {
		const docs: DocFile[] = [{ path: 'libraries.md', content: '- **React:** ^19.1.0' }]
		const mismatches = findVersionMismatches({ react: '^19.2.6' }, docs, PACKAGES)
		expect(mismatches).toHaveLength(1)
		expect(mismatches[0]).toMatchObject({
			pkg: 'react',
			docVersion: '19.1.0',
			expectedVersion: '19.2.6',
			file: 'libraries.md',
		})
	})

	test('detects a stale version in a markdown table row', () => {
		const docs: DocFile[] = [
			{
				path: 'ARCHITECTURE.md',
				content: '| **@nostr-dev-kit/ndk** | 2.15.2 | Nostr client library |',
			},
		]
		const mismatches = findVersionMismatches({ '@nostr-dev-kit/ndk': '3.0.3' }, docs, PACKAGES)
		expect(mismatches).toHaveLength(1)
		expect(mismatches[0].docVersion).toBe('2.15.2')
	})

	test('normalises a v-prefixed version inside backticks', () => {
		const docs: DocFile[] = [
			{
				path: 'nostr-integration.md',
				content: '**Package:** `@nostr-dev-kit/ndk` v3.0.3',
			},
		]
		expect(findVersionMismatches({ '@nostr-dev-kit/ndk': '3.0.3' }, docs, PACKAGES)).toEqual([])
	})

	test('does NOT match `react` inside react-dom', () => {
		// react alias must not fire on a react-dom line → no false mismatch
		const docs: DocFile[] = [{ path: 'libraries.md', content: '- **react-dom:** ^18.0.0' }]
		expect(findVersionMismatches({ react: '^19.2.6' }, docs, PACKAGES)).toEqual([])
	})

	test('does NOT match `react` inside @types/react', () => {
		// @types/react has a different version; react alias must ignore it
		const docs: DocFile[] = [{ path: 'libraries.md', content: '- **@types/react:** ^19.2.14 (dev)' }]
		expect(findVersionMismatches({ react: '^19.2.6' }, docs, PACKAGES)).toEqual([])
	})

	test('does NOT match `tailwindcss` inside tailwindcss-animate', () => {
		const docs: DocFile[] = [{ path: 'libraries.md', content: '- **tailwindcss-animate:** ^1.0.7 (dev)' }]
		expect(findVersionMismatches({ tailwindcss: '^4.3.0' }, docs, PACKAGES)).toEqual([])
	})

	test('does NOT match `react` inside lucide-react / qrcode.react / embla-carousel-react', () => {
		const docs: DocFile[] = [
			{
				path: 'libraries.md',
				content: [
					'- **lucide-react:** ^1.14.0 (icon library)',
					'- **qrcode.react:** ^4.2.0',
					'- **embla-carousel-react:** ^8.6.0 (carousels)',
				].join('\n'),
			},
		]
		expect(findVersionMismatches({ react: '^19.2.6' }, docs, PACKAGES)).toEqual([])
	})

	test('flags table row using friendly alias "TanStack Store"', () => {
		const docs: DocFile[] = [
			{
				path: 'ARCHITECTURE.md',
				content: '| **TanStack Store**  | 0.7.1   | Client state management |',
			},
		]
		const mismatches = findVersionMismatches({ '@tanstack/react-store': '^0.11.0' }, docs, PACKAGES)
		expect(mismatches).toHaveLength(1)
		expect(mismatches[0].docVersion).toBe('0.7.1')
	})

	test('ignores lines that mention the package without a version token', () => {
		const docs: DocFile[] = [
			{
				path: 'SKILL.md',
				content: 'All data flows through NDK (Nostr Dev Kit) and React for rendering.',
			},
		]
		expect(findVersionMismatches({ '@nostr-dev-kit/ndk': '3.0.3', react: '^19.2.6' }, docs, PACKAGES)).toEqual([])
	})
})
