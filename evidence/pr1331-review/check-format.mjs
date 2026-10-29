import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const repo = process.cwd()
const reviewHead = '5dfe8215940af671da280924b166205662562c4f'
const files = [
	'.github/workflows/ci-ndk-guard.yml',
	'.github/workflows/ci-unit.yml',
	'.github/workflows/e2e.yml',
	'.github/workflows/prettier.yml',
	'src/lib/__tests__/pr-workflow-trigger-scope-guard.test.ts',
]
const fixture = mkdtempSync(join(tmpdir(), 'pr1331-format-'))
const archive = spawnSync('git', ['archive', reviewHead], { cwd: repo, encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 })
if (archive.status !== 0) throw new Error(`git archive failed: ${archive.stderr}`)
const extract = spawnSync('tar', ['-x', '-C', fixture], { input: archive.stdout, encoding: 'utf8' })
if (extract.status !== 0) throw new Error(`tar extract failed: ${extract.stderr}`)
const result = spawnSync('/home/c03rad0r/repos/market/node_modules/.bin/prettier', ['--check', ...files], {
	cwd: fixture,
	encoding: 'utf8',
})
console.log(result.stdout)
console.log(result.stderr)
console.log(`Prettier exit: ${result.status}; fixture: ${fixture}`)
if (result.error) throw result.error
process.exitCode = result.status ?? 1
