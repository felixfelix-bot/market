# ContextVM Integration

ContextVM is the currency/price layer that powers real-time Bitcoin ↔ fiat
conversion across the Plebeian Market frontend. This document is the single
source of truth for how the integration is built, configured, run, tested, and
extended.

> **Scope note.** This describes the _application integration_ (the server we
> ship in `contextvm/`, the generated client, and the frontend wiring). For the
> `ctxcn` client-regeneration workflow, see
> [`docs/contextvm-ctxcn-workflow.md`](./contextvm-ctxcn-workflow.md).

---

## Table of contents

1. [What is ContextVM?](#1-what-is-contextvm)
2. [Architecture](#2-architecture)
3. [Environment Variables](#3-environment-variables)
4. [How It Works](#4-how-it-works)
5. [Local Development](#5-local-development)
6. [Updating the Generated Client](#6-updating-the-generated-client)
7. [Testing](#7-testing)

---

## 1. What is ContextVM?

ContextVM is a service that provides **real-time BTC/fiat currency conversion**
for the marketplace. Rather than calling a single price API directly from the
browser, Plebeian runs its own ContextVM **currency server** that:

- Aggregates BTC spot prices from **four independent sources** (Yadio, CoinDesk,
  Binance, CoinGecko).
- Computes a **median** rate per currency so a single misbehaving source can't
  skew prices.
- Exposes the rates as **MCP (Model Context Protocol) tools** served over the
  **Nostr** network using the ContextVM SDK.
- **Caches** aggregated rates locally to stay fast and resilient.

The frontend talks to this server using a checked-in **generated client**
(`PlebianCurrencyClient`) that speaks the ContextVM Nostr protocol directly from
the browser, with a direct HTTP fallback to Yadio if the server is unreachable.

**Why MCP-over-Nostr?** ContextVM uses Nostr relays as the transport so a single
currency server can serve many clients without exposing an open HTTP endpoint.
Requests and responses are encrypted (NIP-44 gift wrap), and the server
identifies itself by a Nostr public key the clients pin.

---

## 2. Architecture

```
                       Nostr relays (transport)
            ┌──────────────────────────────────────────────┐
            │                                              │
  Browser   │   gift-wrapped MCP request (kind 25910/1059) │   Currency Server
┌──────────────────────┐                         ┌─────────────────────────┐
│ PlebianCurrencyClient│  ─────────────────────► │  MCP server (server.ts) │
│  (src/lib/           │                         │                         │
│   ctxcn-client.ts)   │  ◄───────────────────── │  get_btc_price          │
│                      │   gift-wrapped response │  get_btc_price_single   │
│  React Query hooks   │                         │         │               │
│  (src/queries/       │                         │  ┌──────▼──────┐        │
│   external.tsx)      │                         │  │ RatesCache  │ (SQLite)│
└──────────────────────┘                         │  └──────▲──────┘        │
        │ fallback (HTTP)                        └─────────┼───────────────┘
        ▼                                                  │ fetch (median)
  api.yadio.io ───────────────────────────►  4 sources: Yadio / CoinDesk / Binance / CoinGecko
```

### Components

| Component               | Location                                | Role                                                                                                                                                                           |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Currency server**     | `contextvm/server.ts`                   | Bun process. Bootstraps an MCP server, registers the two pricing tools, and listens on Nostr relays via the ContextVM SDK. Run separately with `bun run dev:contextvm-server`. |
| **ContextVM SDK**       | `@contextvm/sdk` (`^0.8.0`)             | Provides `NostrServerTransport`, `PrivateKeySigner`, and `ApplesauceRelayPool` — the Nostr transport + identity primitives the server uses.                                    |
| **MCP SDK**             | `@modelcontextprotocol/sdk` (`^1.29.0`) | Provides `McpServer`, used to register the `get_btc_price` / `get_btc_price_single` tools.                                                                                     |
| **Price sources**       | `contextvm/tools/price-sources.ts`      | Fetchers for Yadio, CoinDesk, Binance, CoinGecko plus the `fetchAllSources()` aggregator (median) and the `SUPPORTED_FIAT` list.                                               |
| **Rates cache**         | `contextvm/tools/rates-cache.ts`        | `RatesCache` — a `bun:sqlite` key/value cache with TTL-based expiry.                                                                                                           |
| **Schemas**             | `contextvm/schemas.ts`                  | Zod input/output schemas for both tools.                                                                                                                                       |
| **Generated client**    | `src/lib/ctxcn-client.ts`               | Checked-in, browser-safe `PlebianCurrencyClient` class. Talks the ContextVM Nostr protocol (NIP-44 gift wrap) using `nostr-tools`.                                             |
| **Client config**       | `ctxcn.config.json`                     | Configuration for `ctxcn` client generation; declares `src/lib/ctxcn-client.ts` as the checked-in source of truth.                                                             |
| **Frontend wiring**     | `src/queries/external.tsx`              | Lazy client singleton + React Query hooks (`useBtcExchangeRates`, `useCurrencyExchangeRate`, `useCurrencyConversion`) and the Yadio HTTP fallback.                             |
| **Relay/key constants** | `src/lib/constants.ts`                  | `CVM_SERVER_PUBKEY` default and `getCurrencyServerRelays()`.                                                                                                                   |

### Tools the server exposes

Both tools are registered on the MCP server in `contextvm/server.ts`:

1. **`get_btc_price`** — Returns BTC exchange rates for **all** supported fiat
   currencies. Input: `{ refresh?: boolean }`. Output includes `rates`,
   `sourcesSucceeded`, `sourcesFailed`, `fetchedAt`, and `cached`.

2. **`get_btc_price_single`** — Returns the BTC rate for a **single** ISO 4217
   currency code. Input: `{ currency: string; refresh?: boolean }`. Output:
   `currency`, `rate`, `fetchedAt`, `cached`.

### Supported fiat currencies (27)

`USD EUR JPY GBP CHF CNY AUD CAD HKD SGD INR MXN RUB BRL TRY KRW ZAR ARS CLP COP PEN UYU PHP THB IDR MYR NGN`

Defined as the `SUPPORTED_FIAT` constant in `contextvm/tools/price-sources.ts`.

---

## 3. Environment Variables

The integration is configured entirely through environment variables. **Production
must set `CVM_SERVER_KEY`; never rely on the built-in development default.**

| Variable              | Used by                                  | Description                                                                                                                                                                   |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CVM_SERVER_KEY`      | server, client                           | Server **private key** (64-char hex). The server signs events with it; the client derives the matching public key from it. Required in production.                            |
| `CVM_SERVER_PUBKEY`   | client (`src/index.tsx`, `constants.ts`) | Server **public key** (64-char hex). Clients pin this to know which server to trust. If unset, it is derived from `CVM_SERVER_KEY`; otherwise a built-in dev default is used. |
| `APP_RELAY_URL`       | server                                   | Override the primary app relay (default: `ws://localhost:10547` in dev, `wss://relay.plebeian.market` in prod).                                                               |
| `CURRENCY_CACHE_PATH` | server                                   | Path to the SQLite cache file (default `./contextvm/data/rates-cache.sqlite`).                                                                                                |
| `NODE_ENV`            | server, client                           | Selects relay sets. `production` / `staging` use the public ContextVM relays; anything else uses the local relay.                                                             |

### Generating a server key pair

Use [`nak`](https://github.com/fiatjaf/nak) (the Nostr swiss-army knife) to
generate a fresh key pair:

```bash
# 1. Generate a private key (hex) → assign to CVM_SERVER_KEY
nak key generate

# 2. Derive the matching public key → assign to CVM_SERVER_PUBKEY
nak key public <your-private-key-hex>
```

Both values are 64-character hex strings. The public key must be the one derived
from your private key, otherwise clients will not be able to talk to the server.

---

## 4. How It Works

### Server-side flow (`contextvm/server.ts`)

1. **Bootstrap.** A `PrivateKeySigner` is created from `CVM_SERVER_KEY`, and an
   `ApplesauceRelayPool` connects to the relay set for the current `NODE_ENV`.
2. **Register tools.** The `McpServer` registers `get_btc_price` and
   `get_btc_price_single` with their Zod input/output schemas from
   `contextvm/schemas.ts`.
3. **Serve on Nostr.** A `NostrServerTransport` binds the MCP server to the relay
   pool. Requests arrive as gift-wrapped Nostr events; the transport handles
   decryption and dispatch.
4. **Fetch + aggregate.** When a tool is called, `getRates()` first checks the
   cache. On a miss (or `refresh: true`), it calls `fetchAllSources()`, which
   fires all four source fetchers concurrently (`Promise.allSettled`), collects
   the successful rates per currency, and computes the **median** across sources.
   If _every_ source fails it throws.
5. **Cache.** The aggregated result is written to the `RatesCache` (SQLite, WAL
   mode) under the key `btc-rates` with a **60-second TTL**
   (`CACHE_TTL_MS = 60_000`). Subsequent reads within the TTL return the cached
   payload marked `cached: true`.

### Price sources (`contextvm/tools/price-sources.ts`)

| Source        | Endpoint                                          | Notes                                                                               |
| ------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Yadio**     | `https://api.yadio.io/exrates/BTC`                | Returns BTC rates for many fiats in one call.                                       |
| **CoinDesk**  | `https://data-api.coindesk.com/...` (CCIX market) | Falls back to the `cryptocompare.com` mirror endpoint if the primary fails.         |
| **Binance**   | `https://api.binance.com/api/v3/ticker/price`     | Fetches `BTCUSDT` then up to 20 direct cross pairs (BTCEUR, BTCGBP, …) in parallel. |
| **CoinGecko** | `https://api.coingecko.com/api/v3/simple/price`   | Single call for all supported `vs_currencies`.                                      |

Each fetch has a **5-second timeout** (`FETCH_TIMEOUT_MS`). Failed sources are
recorded in `sourcesFailed` and reported back to the caller; the aggregate still
succeeds as long as at least one source returns a rate for a given currency.

### Client-side flow (`src/lib/ctxcn-client.ts` + `src/queries/external.tsx`)

1. **Lazy client.** `getCurrencyClient()` creates a single
   `PlebianCurrencyClient` on first use. It generates a random ephemeral private
   key, builds the relay list from the user's app relay + the ContextVM relays,
   and pins `serverPubkey` from config (or the default `CVM_SERVER_PUBKEY`).
2. **Request.** `client.callTool({ name: 'get_btc_price', arguments: {} })` wraps
   the call as a JSON-RPC `tools/call` MCP message, encrypts it with **NIP-44**
   inside a gift-wrapped Nostr event (request kind `25910`, gift-wrap kind
   `1059`), publishes it to the relays, and awaits the matching response.
3. **Response.** The client subscribes for gift-wrapped events addressed to it,
   decrypts the inner MCP response, resolves the pending promise, and enforces a
   **20-second timeout** (`TIMEOUT_MS`).
4. **React Query.** `fetchFromContextVm()` calls the tool with a **5-second**
   application-level timeout. On failure or timeout it **falls back** to a direct
   HTTPS fetch of `https://api.yadio.io/exrates/BTC` so the UI degrades
   gracefully.
5. **Conversion.** `convertCurrencyToSats(currency, amount)` divides the fiat
   amount by the BTC rate and multiplies by `100_000_000` (sats per BTC).

### Relays

| Environment              | Server relays                                                          | Client (`getCurrencyServerRelays()`)                 |
| ------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `development`            | `APP_RELAY_URL` or `ws://localhost:10547`                              | `ws://localhost:10547` + `wss://relay.contextvm.org` |
| `production` / `staging` | app relay + `wss://relay.contextvm.org` + `wss://relay2.contextvm.org` | `wss://relay.contextvm.org`                          |

> For local development you need a Nostr relay listening on `ws://localhost:10547`
> so the server and the browser can exchange events. See
> [Local Development](#5-local-development).

---

## 5. Local Development

The currency server runs as a **separate process** from the app. Start them in
two terminals:

```bash
# Terminal 1 — ContextVM currency server (talks to Nostr + price sources)
bun run dev:contextvm-server

# Terminal 2 — the marketplace app
bun dev
```

### What the server does on startup

On boot the server prints its public key, environment, relay list, cache path,
cache TTL, and the number of supported currencies, e.g.:

```
=== Plebeian Currency ContextVM Server ===
Public key: <server-pubkey>
Environment: development
Public server: false
Relays: ws://localhost:10547
Cache TTL: 60s
Cache path: ./contextvm/data/rates-cache.sqlite
Supported currencies: 27
```

### Prerequisites

- **`CVM_SERVER_KEY`** — set this to a private key you generated with
  `nak key generate` (see [Environment Variables](#3-environment-variables)). If
  unset, the server falls back to a built-in development key; **this default is
  for local dev only and must not be used in production.**
- **A local Nostr relay** on `ws://localhost:10547` (or set `APP_RELAY_URL`).
  The server and the browser both connect here to exchange events. If none is
  running, requests will time out and the client will fall back to the direct
  Yadio HTTP fetch.
- **Network access** to the four price-source APIs (Yadio, CoinDesk, Binance,
  CoinGecko). Each is fetched with a 5s timeout.

### Useful commands

```bash
# Run only the ContextVM + app unit tests (no slow integration tests)
bun test:unit

# Generate a fresh server keypair for local testing
nak key generate
nak key public <private-key>
```

---

## 6. Updating the Generated Client

The browser client (`src/lib/ctxcn-client.ts`) is **checked-in generated code**
— the app imports it directly from `@/lib/ctxcn-client` rather than generating it
on every build. This keeps the runtime dependency-free of the codegen toolchain.

When the ContextVM tools change (new tool, renamed method, changed schema), you
must regenerate the client:

1. **Update `ctxcn.config.json`** if the relay/source settings or output path
   change. The config points the generator at `src/lib/ctxcn-client.ts`.
2. **Regenerate** the client using the `ctxcn` CLI.
3. **Commit** the updated generated client at `src/lib/ctxcn-client.ts`.
4. **Update** any tests or docs that depend on the client shape (e.g.
   `src/lib/__tests__/contextvm-client.test.ts`).

The exported class is named **`PlebianCurrencyClient`**. See the full regeneration
walkthrough in [`docs/contextvm-ctxcn-workflow.md`](./contextvm-ctxcn-workflow.md).

> The legacy compatibility wrapper that used to sit in front of the generated
> client has been removed; the checked-in generated client is now the single
> source of truth.

---

## 7. Testing

ContextVM is covered by unit tests in two places. Run the whole unit suite with:

```bash
bun test:unit
```

This `test:unit` script globs `contextvm/`, `src/queries/__tests__/`, and
`src/lib/__tests__/` for `*.test.ts` files (excluding `*.integration.test.ts`)
and runs them together.

### Test files

| File                                                     | What it covers                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contextvm/__tests__/currency-server.test.ts`            | End-to-end behavior of the two MCP tools over an in-memory transport: fresh fetch, cache hit/miss, `refresh` bypass, source failure, unsupported currency, missing rate, and tool listing. Uses a mock in-memory server so no network or Nostr is needed. |
| `contextvm/tools/__tests__/price-sources.test.ts`        | The source fetchers, median aggregation, `fetchAllSources()`, and the `SUPPORTED_FIAT` list.                                                                                                                                                              |
| `contextvm/tools/__tests__/rates-cache.test.ts`          | The `RatesCache` SQLite cache: set/get, TTL expiry, eviction, and WAL behavior.                                                                                                                                                                           |
| `contextvm/tools/__tests__/schemas.test.ts`              | The Zod input/output schemas for both tools.                                                                                                                                                                                                              |
| `src/lib/__tests__/contextvm-client.test.ts`             | Unit tests for the generated `PlebianCurrencyClient`.                                                                                                                                                                                                     |
| `src/lib/__tests__/contextvm-client.integration.test.ts` | Integration test exercising the client against a real relay (excluded from `test:unit`).                                                                                                                                                                  |

### Adding tests when you change ContextVM

- New price source? Add a fetcher in `price-sources.ts` and a test in
  `price-sources.test.ts` (the `fetchAllSources` array and `SUPPORTED_FIAT` are
  the two places to keep in sync).
- New tool on the server? Register it in `server.ts`, add a Zod schema in
  `schemas.ts` (with a `schemas.test.ts` case), and add a behaviour test in
  `currency-server.test.ts` using the in-memory transport pattern.
- Changed the client protocol? Update the generated client and the matching
  client tests, then run `bun test:unit` to confirm.
