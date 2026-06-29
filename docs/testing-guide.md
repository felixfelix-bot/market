# Testing Guide

This guide explains how the Plebeian Market frontend runs its tests, where to add
new ones, and the patterns to follow. It is the companion to
[`e2e/ARCHITECTURE.md`](../e2e/ARCHITECTURE.md), which goes much deeper on the
end-to-end design. Read this first; jump to the architecture doc when you need
the full rationale.

> **TL;DR for new contributors:** unit and integration tests use **Bun's
> built-in test runner** (`bun:test`) — *not* Vitest, *not* Jest. End-to-end
> tests use **Playwright**. Run `bun run test:unit` and `bun run test:e2e`.

---

## 1. Testing Stack Overview

| Layer            | Runner              | Purpose                                                        |
| ---------------- | ------------------- | ------------------------------------------------------------- |
| **Unit**         | `bun:test`          | Pure functions, schemas, caching, crypto round-trips          |
| **Integration**  | `bun:test`          | Code that talks to a live Nostr relay / currency server       |
| **End-to-End**   | Playwright          | Full user flows through the real app in a real browser        |

### What we do NOT use

- **No Vitest, no Jest.** The project runs on the [Bun](https://bun.sh) runtime
  and uses its native test runner for everything below the browser. Importing
  from `vitest` or `jest` will not work.
- **No separate assertion library.** `bun:test` ships its own `expect` (Jest-
  compatible API). E2E tests use Playwright's `expect`.
- **No global mock bootstrap.** `bunfig.toml` only configures the static
  server (Tailwind plugin); there is no `test.preload` doing framework-wide
  mocking. Each test file sets up and tears down its own mocks.

---

## 2. Running Tests

All commands are defined as npm scripts in [`package.json`](../package.json).
Run them with `bun run <script>`.

```bash
# --- Unit & integration (bun:test) ---
bun run test:unit            # Unit tests only (excludes *.integration.test.ts)
bun run test:unit:watch      # Unit tests, re-running on file change
bun run test:integration     # Integration tests only (needs a live relay + currency server)

# --- End-to-end (Playwright) ---
bun run test:e2e             # Headless Chromium
bun run test:e2e:headed      # Visible browser window
bun run test:e2e:ui          # Interactive Playwright UI mode (time travel, picker)
bun run test:e2e:debug       # Step-through debug mode (inspector pauses on each action)
```

### Running a single file or a filtered subset

Both runners accept file paths and grep flags directly:

```bash
# A single bun:test file
bun test src/queries/__tests__/external.test.ts

# A single Playwright spec
bun run test:e2e -- e2e/tests/auth.spec.ts

# Filter E2E tests by title (regex)
bun run test:e2e -- --grep "Multi-Merchant Cart"
bun run test:e2e -- --grep-invert "Product Page - View Only"
```

### First-time setup for E2E

End-to-end tests spin up a real local relay and a real dev server, so you need
a few prerequisites installed once:

```bash
bun install                       # JS dependencies
bun run generate-routes           # Generate TanStack Router route tree
bunx playwright install --with-deps chromium   # Playwright browser + OS deps

# nak — the local Nostr relay (requires Go >= 1.22)
go install github.com/fiatjaf/nak@latest
```

For local runs, Playwright **starts the relay and dev server for you** via the
`webServer` config (see `e2e/playwright.config.ts`) — you usually do not need to
start anything by hand. There is also a convenience script that brings the whole
environment up and launches the headed runner:

```bash
./scripts/start-test-env.sh
```

> **Why a single shared relay?** Tests share one local relay and run sequentially
> (`workers: 1`, `fullyParallel: false`) by design. Each test declares which
> *data scenario* it needs (see §6) instead of accumulating state across tests.

---

## 3. Test File Locations

### Unit and integration tests (run by `bun:test`)

`test:unit` and `test:integration` are defined as `find` commands over three
roots, so **only files inside these directories are actually executed**:

```
contextvm/__tests__/                     ContextVM currency-server tests
contextvm/tools/__tests__/               Price-source, rates-cache, schema tests
src/queries/__tests__/                   Query-layer unit tests
src/lib/__tests__/                       Core library unit + integration tests
```

Current inventory (7 unit files, 1 integration file):

| File                                                          | Kind        |
| ------------------------------------------------------------- | ----------- |
| `contextvm/__tests__/currency-server.test.ts`                 | unit        |
| `contextvm/tools/__tests__/price-sources.test.ts`             | unit        |
| `contextvm/tools/__tests__/rates-cache.test.ts`               | unit        |
| `contextvm/tools/__tests__/schemas.test.ts`                   | unit        |
| `src/queries/__tests__/external.test.ts`                      | unit        |
| `src/queries/__tests__/orders-private-details.test.ts`        | unit        |
| `src/lib/__tests__/contextvm-client.test.ts`                  | unit        |
| `src/lib/__tests__/contextvm-client.integration.test.ts`      | integration |

### ⚠️ Gotcha: co-located tests that are NOT executed

The repo also contains `*.test.ts` files **co-located next to their source**
(e.g. `src/ws.test.ts`, `src/publish/*.test.ts`, `src/lib/stores/*.test.ts`,
`src/lib/nostr/nip59.test.ts`, …). These are **not** matched by the `find`
expressions in `package.json`, so `bun run test:unit` does **not** run them.
If you add a new unit test, put it under one of the three roots above (or
extend the `find` in `package.json`) — otherwise it will silently never execute.

### End-to-end tests (Playwright)

```
e2e/
├── playwright.config.ts        Playwright configuration
├── test-config.ts              Shared constants (relay URL, ports, test keys)
├── global-setup.ts             Verifies the dev server is healthy before tests
├── global-teardown.ts          Logging-only teardown
├── seed-relay.ts               Publishes app settings before the dev server boots
├── purge-leaked-events.ts      Cleanup utility for leaked Nostr events
├── ARCHITECTURE.md             Deep-dive on the E2E design (read this!)
├── fixtures/                   Extended Playwright `test` + auth + relay monitor
├── scenarios/                  Data-seeding scenarios (base / merchant / marketplace)
├── helpers/                    Test helpers (e.g. LNURL mock)
├── utils/                      Lightning / NIP-46 / payment mocks + relay queries
└── tests/                      *.spec.ts — the actual test specs (20 files)
```

> **Note:** older notes referenced a `e2e/po/` "page objects" directory. **It
> does not exist.** This suite uses Playwright *fixtures* and *scenarios*, not
> the page-object pattern. See §6.

---

## 4. Unit Test Patterns

Unit tests import the Bun test primitives from `bun:test` and follow the usual
Jest-like `describe` / `test` / `expect` shape.

```ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
```

### A complete, real example

From `contextvm/tools/__tests__/rates-cache.test.ts` — a SQLite-backed cache
tested with a real temp directory. Note the `beforeEach`/`afterEach` lifecycle
that creates and removes an isolated database per test:

```ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { RatesCache } from '../rates-cache'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'

let cache: RatesCache
let dbPath: string

describe('RatesCache', () => {
    beforeEach(() => {
        const dir = mkdtempSync('rates-cache-test-')
        dbPath = join(dir, 'test-cache.sqlite')
        cache = new RatesCache(dbPath)
    })

    afterEach(() => {
        cache.close()
        const dir = dbPath.replace('/test-cache.sqlite', '')
        rmSync(dir, { recursive: true, force: true })
    })

    test('returns null for missing key', () => {
        expect(cache.get('nonexistent')).toBeNull()
    })

    test('returns null for expired entry', () => {
        const originalNow = Date.now
        const baseTime = 1_700_000_000_000
        try {
            Date.now = () => baseTime
            cache.set('rates', '{"USD": 100000}', 100)
            expect(cache.get('rates')).toBe('{"USD": 100000}')

            Date.now = () => baseTime + 101
            expect(cache.get('rates')).toBeNull()
        } finally {
            Date.now = originalNow          // always restore globals
        }
    })
})
```

### Mocking patterns

**1. Module mocks with `mock.module`** — replace a dependency before it is
imported. From `src/queries/__tests__/external.test.ts`:

```ts
import { mock } from 'bun:test'

mock.module('@/lib/ctxcn-client', () => ({
    PlebianCurrencyClient: class {
        constructor() {
            throw new Error('mocked: no real relay connections in tests')
        }
    },
}))
```

**2. Spies with `spyOn`** — wrap and restore an object method. From
`contextvm/tools/__tests__/price-sources.test.ts`:

```ts
import { spyOn } from 'bun:test'

let fetchSpy: ReturnType<typeof spyOn>

function mockFetch(responses: Record<string, () => Response>) {
    const handler = async (url: string): Promise<Response> => {
        const matcher = Object.keys(responses).find((key) => url.includes(key))
        return matcher ? responses[matcher]() : new Response('{"error":"not found"}', { status: 404 })
    }
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(handler as any)
}

afterEach(() => fetchSpy?.mockRestore())
```

**3. Global `fetch` swap + restore** — a simpler variant used in
`external.test.ts`: stash the original, assign `globalThis.fetch = mock(handler)`,
and restore it in `afterEach`. Always restore globals; otherwise later tests
inherit your mock.

**4. Schema validation with Zod** — test inputs/outputs through the real schema
via `safeParse`. From `contextvm/tools/__tests__/schemas.test.ts`:

```ts
import { z } from 'zod'
import { getBtcPriceInputSchema } from '../../schemas'

function parseSchema(schema: Record<string, z.ZodType>, data: unknown) {
    return z.object(schema).safeParse(data)
}

test('defaults refresh to false when omitted', () => {
    const result = parseSchema(getBtcPriceInputSchema, {})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.refresh).toBe(false)
})
```

**5. Noisy-log suppression** — several files silence `console.warn`/`console.error`
at the top to keep output readable when tests intentionally trigger warnings:

```ts
const originalWarn = console.warn
console.warn = () => {}
// ... restore in afterEach if other tests need it
```

---

## 5. Integration Test Patterns

Integration tests use the same `bun:test` runner but are split out by a filename
suffix: **`*.integration.test.ts`**. The `test:integration` script runs only
those files (currently just `src/lib/__tests__/contextvm-client.integration.test.ts`).

### How they differ from unit tests

| Aspect           | Unit test                              | Integration test                                              |
| ---------------- | -------------------------------------- | ------------------------------------------------------------ |
| Filename         | `*.test.ts`                            | `*.integration.test.ts`                                      |
| External deps    | None (everything mocked or in-process) | A live Nostr relay + the ContextVM currency server           |
| Lifecycle        | `beforeEach` / `afterEach` per test    | `beforeAll` / `afterAll` (expensive setup done once)         |
| What they assert | Pure logic                             | Real wiring: key derivation, relay config, client construct |

### What you need to run them locally

Integration tests connect to `ws://localhost:10547` (overridable via
`RELAY_URL` / `APP_RELAY_URL`) and expect the currency server running. Bring
them up the same way CI does:

```bash
go install github.com/fiatjaf/nak@latest
nak serve --hostname 0.0.0.0 &                       # relay on :10547
CVM_SERVER_KEY=2300f5fff5642341946758cad8214f2c54f3c40fba5ba51b616452b197fd3e71 \
  bun run contextvm/server.ts &                      # currency server
bun run test:integration
```

### Real example

From `src/lib/__tests__/contextvm-client.integration.test.ts`. Notice the
`beforeAll`/`afterAll` shape, the env-driven config, and the honest comment
explaining why the assertion is intentionally lightweight:

```ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { getPublicKey } from 'nostr-tools/pure'
import { PlebianCurrencyClient } from '../ctxcn-client'
import { getCurrencyServerRelays } from '@/lib/constants'

const RELAY_URL = process.env.RELAY_URL || process.env.APP_RELAY_URL || 'ws://localhost:10547'
const SERVER_PRIVATE_KEY = process.env.CVM_SERVER_KEY || '2300f5ff…'
const DERIVED_SERVER_PUBKEY = getPublicKey(new Uint8Array(Buffer.from(SERVER_PRIVATE_KEY, 'hex')))
const RELAYS = Array.from(new Set([RELAY_URL, ...getCurrencyServerRelays()]))

describe('PlebianCurrencyClient integration', () => {
    let client: PlebianCurrencyClient | undefined

    beforeAll(() => {
        client = new PlebianCurrencyClient({
            privateKey: crypto.getRandomValues(new Uint8Array(32)),
            relays: RELAYS,
            serverPubkey: DERIVED_SERVER_PUBKEY,
        })
    })

    afterAll(() => client?.close())

    test('wires the browser/runtime config used by the CTXCN path', () => {
        // The full happy path is exercised in the browser E2E suite.
        // Here we keep a lightweight config smoke test under Bun.
        expect(RELAYS).toContain('ws://localhost:10547')
        expect(() => new PlebianCurrencyClient({ /* … */ })).not.toThrow()
    })
})
```

When to reach for an integration test: you're verifying that two real pieces
(client ↔ relay, client ↔ server) wire together correctly. If you can assert the
behavior with everything in-process, write a **unit** test instead.

---

## 6. E2E Test Patterns

The E2E suite is built on three ideas: **fixtures** (pre-authenticated pages),
**scenarios** (declared data), and **web-first assertions** (no hardcoded
waits). The full design rationale lives in
[`e2e/ARCHITECTURE.md`](../e2e/ARCHITECTURE.md); this section is the practical
version.

### Import the extended `test`, not the bare one

Every spec imports the project's extended `test` and `expect` from
`e2e/fixtures`, **not** directly from `@playwright/test`:

```ts
import { test, expect } from '../fixtures'
```

`e2e/fixtures/index.ts` extends Playwright's base `test` with ready-made
fixtures so you rarely build a page by hand:

| Fixture               | What it gives you                                            |
| --------------------- | ----------------------------------------------------------- |
| `merchantPage`        | A `Page` logged in as **devUser1** (merchant / app owner)   |
| `buyerPage`           | A `Page` logged in as **devUser2** (buyer)                  |
| `newUserPage`         | A `Page` logged in as **devUser3** (fresh, no seeded profile) |
| `unauthenticatedPage` | A `Page` that is logged out                                 |
| `relayMonitor`        | A `RelayMonitor` capturing the default page's WS traffic    |
| `scenario`            | Which data scenario to seed (option; default `'base'`)      |

These fixtures run `ensureScenario(...)`, inject a NIP-07 `window.nostr` mock
(see `e2e/fixtures/auth.ts`) for auto-login, navigate to `/`, and wait for the
app to settle — so each test starts from a known, authenticated state.

### Declare the data you need with `test.use({ scenario })`

Data is **declared per file**, not accumulated across tests. Scenarios are
cumulative and idempotent (defined in `e2e/scenarios/index.ts`):
`'none'` → `'base'` → `'merchant'` → `'marketplace'`.

```ts
import { test, expect } from '../fixtures'

test.use({ scenario: 'marketplace' })   // seed products from two sellers + V4V config

test.describe('Multi-Merchant Cart', () => {
    test('can add products from two different sellers to cart', async ({ newUserPage }) => {
        await newUserPage.goto('/products')
        await expect(newUserPage.getByText('Bitcoin Hardware Wallet')).toBeVisible({ timeout: 30_000 })
        // …
    })
})
```

### Locator strategy: user-facing selectors first

Prefer roles, text, and labels. Reach for `data-testid` only when a stable
accessible selector isn't available. From `e2e/tests/marketplace.spec.ts`:

```ts
// Good: role + name
await newUserPage.getByRole('button', { name: /add to cart/i }).click()

// Acceptable: data-testid for cards without a unique role
const wallet = newUserPage.locator('[data-testid="product-card"]')
    .filter({ hasText: 'Bitcoin Hardware Wallet' })
```

### Waiting strategy: no `waitForTimeout` for correctness

Rely on Playwright's auto-waiting and `expect(...).toPass(...)` for anything
async. The only sanctioned use of `waitForTimeout` is brief UI settle pauses
(e.g. 500 ms for a Radix select to close). For genuinely async conditions, wrap
the assertion:

```ts
await expect(async () => {
    const content = await page.locator('main').textContent()
    expect(content).toContain('Bitcoin Hardware Wallet')
}).toPass({ timeout: 30_000 })
```

### Verifying what hit the relay

Two complementary tools:

- **`RelayMonitor`** (`e2e/fixtures/relay-monitor.ts`) — captures WebSocket
  frames the app sends/receives, queryable by Nostr kind. Available as the
  `relayMonitor` fixture.
- **`queryRelayEvents(filter)`** (`e2e/utils/relay-query.ts`) — connects
  directly to the relay from Node to assert that order/payment events were
  actually published, independent of the browser.

```ts
import { queryRelayEvents, getTagValue } from '../utils/relay-query'

const orders = await queryRelayEvents({ kinds: [30402], authors: [devUser1.pk] })
expect(orders.length).toBeGreaterThan(0)
```

### Mocking Lightning / NIP-46

Real Lightning and Nostr-Connect aren't available in CI, so the suite ships
mocks under `e2e/utils/`:

- **`LightningMock`** — injects a WebLN provider (`window.webln`) so "Pay with
  WebLN" works without a real wallet. Call `await LightningMock.setup(page)`
  **before** navigating.
- **`Nip46Mock`** — a NIP-46 signer that responds over the relay, for testing
  Nostr Connect login flows.
- **`lnurl-mock`** helper (`e2e/helpers/`) for LNURL flows.

### Writing a new E2E test

1. Create `e2e/tests/<feature>.spec.ts` (the `.spec.ts` suffix is required —
   `testMatch` is `/.*\.spec\.ts$/`).
2. `import { test, expect } from '../fixtures'`.
3. Pick a scenario with `test.use({ scenario: '...' })`.
4. Destructure the fixture(s) you need (`merchantPage`, `buyerPage`, …).
5. Drive the UI with roles/text; assert with web-first `expect`.
6. For slow flows, raise the timeout: `test.setTimeout(120_000)`.

### Playwright config at a glance (`e2e/playwright.config.ts`)

- **Browser:** Chromium only (single project).
- **Parallelism:** off — `workers: 1`, `fullyParallel: false` (shared relay).
- **Retries:** `2` on CI, `0` locally.
- **Artifacts:** trace `on-first-retry`, screenshots `only-on-failure`,
  video `retain-on-failure`.
- **Timeouts:** 30 s per test, 5 s per `expect`.
- **`webServer`:** on CI it's empty (the workflow starts servers manually for
  better log visibility); locally Playwright auto-starts the `nak` relay on
  `:10547` and the dev server on `:34567` after seeding.
- **`forbidOnly`** is enforced on CI, so `test.only` will fail the build there.

### Debugging

```bash
bun run test:e2e:debug     # Playwright Inspector — step through each action
bun run test:e2e:ui        # UI mode with time-travel, locator picker, watch
bun run test:e2e:headed    # Just show the browser
```

On failure, check `test-results/` for the trace, screenshot, and video. CI
uploads these as artifacts (see §7).

---

## 7. CI Integration

Two workflows live in [`.github/workflows/`](../.github/workflows).

### `ci-unit.yml` — "Unit and Integration Tests"

**Triggers:** push to `main`/`master`/`feature/**`, PRs to `main`/`master`,
and manual dispatch.

**What it does:**

1. Sets up Bun (latest) and Go (≥ 1.22).
2. `bun install --frozen-lockfile` + `bun run generate-routes`.
3. Runs `bun run test:unit`.
4. For integration: installs `nak`, starts `nak serve` and the ContextVM
   currency server (`contextvm/server.ts` with `CVM_SERVER_KEY`), waits for
   both to become ready, then runs `bun run test:integration`.
5. On failure, dumps the relay and currency-server logs as annotations.

**Reading failures:** if the unit step fails, it's a real logic regression.
If only the integration step fails, check whether the relay/currency-server
readiness probe timed out (logs are printed) — that's an environment issue, not
necessarily your code.

### `e2e.yml` — "E2E Tests"

**Triggers:** push/PR to `main`/`master`/`auctions/**`, manual dispatch, and a
**weekly schedule** (Mondays 06:00 UTC).

**Two jobs, split to keep PRs fast:**

| Job           | When it runs            | What it runs                                            |
| ------------- | ----------------------- | ------------------------------------------------------ |
| `e2e-pricing` | push / PR               | `--grep 'Product Page - View Only'` — the fast, stable subset |
| `e2e-full`    | manual / scheduled only | `--grep-invert 'Product Page - View Only\|Collection Management'` — the broader suite (120 min timeout) |

Both jobs build `nak` from source, install the Chromium browser (cached),
start the relay + dev server manually, run the filtered suite, and upload
`test-results/` as a 7-day-retention artifact on any outcome.

**Reading failures:** download the `test-results-*` artifact for the trace,
screenshot, and video. If the relay or dev server failed to start, the workflow
prints their logs in a "Show server logs on failure" step.

---

## 8. Best Practices

**Where to add a new test**

- **Pure logic** (a function, a schema, a cache, crypto helpers) → unit test
  under `src/lib/__tests__/`, `src/queries/__tests__/`, or
  `contextvm/**/__tests__/`. *Do not* co-locate it next to the source unless you
  also add that path to the `find` in `package.json` — co-located files are not
  run by default (see §3).
- **Real wiring with a relay/server** → `*.integration.test.ts` under
  `src/lib/__tests__/`.
- **User-visible behavior** → `e2e/tests/<feature>.spec.ts`. Prefer E2E for
  anything a contributor would demonstrate by clicking through the app.

**Naming conventions**

| Type         | Suffix                   | Runner      |
| ------------ | ------------------------ | ----------- |
| Unit         | `*.test.ts`              | `bun:test`  |
| Integration  | `*.integration.test.ts`  | `bun:test`  |
| End-to-end   | `*.spec.ts`              | Playwright  |

Group related cases with `describe`. Name `test(...)` titles as sentences
("returns null for expired entry"), so failures read like a spec.

**Coverage expectations**

There is no enforced coverage threshold today. The expectation is pragmatic:
every new piece of pure business logic gets a unit test, and every new user
flow gets at least one E2E test. Don't add `skip`/`xfail`/`test.only` to make
a suite green — fix the code or the test. (`test.only` will actually fail CI
because of `forbidOnly`.)

**Keep tests independent**

Each E2E test must be runnable on its own. Declare the data you need via
`test.use({ scenario })` rather than relying on a previous test having run.
For unit tests, use `beforeEach`/`afterEach` to reset state (temp dirs,
mocked globals, `fetch`) so tests never depend on ordering.

**Restore what you mock**

Global mutations (`globalThis.fetch`, `Date.now`, `console.warn`) must be
restored in `afterEach` / `finally`. A leaked mock is the most common cause of
"passes alone, fails in the full suite" mysteries.

**Commit tests with the code**

Ship tests and docs in the same commit as the change they cover. A feature
without a test is incomplete; a test without the feature it documents rots.
