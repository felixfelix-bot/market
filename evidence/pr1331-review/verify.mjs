import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const repo = process.cwd()
const reviewHead = '5dfe8215940af671da280924b166205662562c4f'
const tests = [
	'pr-workflow-trigger-scope-guard.test.ts',
	'e2e-workflow-gate-membership.test.ts',
	'e2e-workflow-artifact-path.test.ts',
	'preview-deploy-workflow-guard.test.ts',
]
const fixture = mkdtempSync(join(tmpdir(), 'pr1331-review-'))
const archive = spawnSync('git', ['archive', reviewHead], { cwd: repo, encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 })
if (archive.status !== 0) throw new Error(`git archive failed: ${archive.stderr}`)
const extract = spawnSync('tar', ['-x', '-C', fixture], { input: archive.stdout, encoding: 'utf8' })
if (extract.status !== 0) throw new Error(`tar extract failed: ${extract.stderr}`)

function run(label, selectedTests = tests) {
	const result = spawnSync('bun', ['test', '--isolate', ...selectedTests.map((name) => join('src', 'lib', '__tests__', name))], {
		cwd: fixture,
		encoding: 'utf8',
		env: { ...process.env, NO_COLOR: '1' },
	})
	console.log(`=== ${label}: exit ${result.status} ===`)
	console.log(result.stdout)
	console.log(result.stderr)
	if (result.error) throw result.error
	return result
}

const green = run('GREEN: exact live-head tree, guard plus three sibling workflow guards')
const e2ePath = join(fixture, '.github', 'workflows', 'e2e.yml')
const original = readFileSync(e2ePath, 'utf8')
const narrowed = original.replace('  pull_request:\n', "  pull_request:\n    branches: [main, master, 'auctions/**']\n")
if (narrowed === original) throw new Error('RED fixture injection did not change e2e.yml')
writeFileSync(e2ePath, narrowed)
const red = run('RED: pre-PR e2e pull_request base filter restored', ['pr-workflow-trigger-scope-guard.test.ts'])
console.log(`Fixture: ${fixture}`)
if (green.status !== 0 || red.status === 0) process.exitCode = 1
