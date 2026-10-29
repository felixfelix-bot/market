# Relay Deployment Guide

A contributor-facing guide for deploying and managing Plebeian Market's Nostr
relay infrastructure. This document covers the **operational "how"** — building,
deploying, backing up, and troubleshooting the three relay services.

For the **strategic "why"** (data-flow rationale, gate-policy design, the
dead-relay-timeout problem this architecture solves), read
[`RELAY_PLAN.md`](../RELAY_PLAN.md) first. For how the **application itself**
selects relays per stage, see [`relay-configuration.md`](relay-configuration.md).

---

## 1. Architecture Overview

Plebeian Market runs **three relay services with distinct, non-overlapping
roles**. None of them duplicate each other.

| Relay | Software | Role | Internal port | Deploy artifacts |
| --- | --- | --- | --- | --- |
| `relay.plebeian.market` | **Khatru** (custom Go) | **WRITE** — the authoritative source. Sellers publish stalls, listings, auctions, orders, reactions here. | `127.0.0.1:3334` (prod) / `127.0.0.1:10549` (staging) | `deploy-simple/relay/` |
| `market-agg.orangesync.tech` | **strfry** | **READ cache** — pre-fetches market events from upstream relays so the app queries one fast endpoint instead of fanning out to 6+ unreliable public relays. Market-kind gated. | container `:7777` → host `127.0.0.1:7780` | `deploy-simple/aggregator/` |
| `bugs.plebeian.market` | — | Bug report intake (kind 1 text notes). | — | _(no in-repo deploy artifacts)_ |

### Data flow

```
WRITE PATH                                     READ PATH (production)
─────────────                                  ──────────────────────
[Market App]                                   [Market App]
   │ publishes stalls,                            │ queries ONE relay (~ms)
   │ listings, auctions, orders                   ▼
   ▼                                           [market-agg.orangesync.tech : strfry]
[relay.plebeian.market : Khatru]                  │ market-kind gate
   │ (authoritative source)                       │ (public data from any pubkey;
   │                                               │  restricted kinds → root/WoT)
   │                                              ▲ scraped upstream
   └──────────── also scraped by aggregator ──────┘
                                              [relay.plebeian.market]
                                              [relay.damus.io]
                                              [nos.lol]
```

- **Write** goes only to the Khatru relay, which is the system of record.
- **Read** (in production) goes primarily to the aggregator, which has already
  pre-fetched and cached market events from upstream relays. This eliminates the
  multi-second `fetchEventsWithTimeout` waterfall caused by fanning out to
  potentially-dead public relays (see `RELAY_PLAN.md`, issue #1046).
- The app surfaces the aggregator via the `MARKET_AGGREGATOR_RELAY` constant in
  `src/lib/constants.ts`.

> In development/staging there is **no aggregator** — the app reads
> `MAIN_RELAY_BY_STAGE[stage]` + `DEFAULT_PUBLIC_RELAYS` directly. See
> [`relay-configuration.md`](relay-configuration.md).

---

## 2. Prerequisites

| Requirement | Khatru relay (`relay.plebeian.market`) | strfry aggregator |
| --- | --- | --- |
| **VPS** | Ubuntu/Debian Linux | Any host with Docker |
| **Runtime** | none (single static Go binary) | Docker + Docker Compose |
| **Reverse proxy / TLS** | Caddy (terminates `wss://`, proxies to the local port) | Caddy (terminates `wss://`, proxies to `127.0.0.1:7780`) |
| **Domain + DNS** | `relay.<stage>.plebeian.market` A/AAAA record | `market-agg.orangesync.tech` A/AAAA record |
| **Process manager** | systemd (`market-relay.service`) | Docker (`restart: unless-stopped`) |
| **Build toolchain** | Go 1.25 (in CI; not required on the VPS) | none (image builds itself) |

### First-time VPS setup (Khatru relay host)

Follow the bootstrap in [`deploy-simple/README.md`](../deploy-simple/README.md#first-time-vps-setup):
create a `deployer` user with passwordless sudo for the deployment commands
(`/usr/bin/caddy`, `/bin/cp`, `/bin/mkdir`, `/bin/systemctl`), install Caddy,
and add your SSH key. The relay itself ships as a self-contained binary, so no
Node/Bun/PM2 is required on the relay host.

---

## 3. Khatru Relay Setup (`relay.plebeian.market`)

### What it is

`relay.plebeian.market` is a **custom Nostr relay built with
[Khatru](https://github.com/fiatjaf/khatru)**, a Go framework for composing
relay behavior. The application lives in `deploy-simple/relay/cmd/market-relay/`
and is built into a single static binary, `market-relay`.

Storage is a composite of two backends:

- **BoltDB** (`/var/lib/market-relay/raw/events.db`) — the raw event store.
- **Bleve** (`/var/lib/market-relay/search`) — a full-text search index layered
  over the raw store; queries with a `search` term of ≥2 chars hit Bleve,
  everything else hits BoltDB directly.

Built-in policies: `ValidateKind`, `RejectEventsWithBase64Media`,
`RejectUnprefixedNostrReferences` (on EVENT), and `NoComplexFilters` (on REQ).
A `/healthz` endpoint returns `ok`. Supported NIPs: **1, 11, 50**.

### Configuration

The relay is configured entirely by environment variables, sourced from a
committed stage file:

- [`deploy-simple/relay/config/production.env`](../deploy-simple/relay/config/production.env)
- [`deploy-simple/relay/config/staging.env`](../deploy-simple/relay/config/staging.env)

These files are intentionally committed so relay operational state stays
declarative in git. **No secrets are required** for the relay service itself
(`RELAY_PUBKEY` is empty by default).

| Variable | Default | Production value | Notes |
| --- | --- | --- | --- |
| `RELAY_NAME` | `Plebeian Market Relay` | `Plebeian Market Relay` | NIP-11 `name` |
| `RELAY_DESCRIPTION` | — | `Application relay for plebeian.market` | NIP-11 `description` |
| `RELAY_PUBLIC_URL` | `ws://localhost:10547` | `wss://relay.plebeian.market` | advertised URL |
| `RELAY_LISTEN_ADDR` | `127.0.0.1:10547` | `127.0.0.1:3334` | loopback only; Caddy fronts it |
| `RELAY_DATA_DIR` | `/var/lib/market-relay` | same | parent data dir |
| `RELAY_SEARCH_INDEX_DIR` | `/var/lib/market-relay/search` | same | Bleve index |
| `RELAY_RAW_DB_DIR` | `/var/lib/market-relay/raw` | same | BoltDB store |
| `RELAY_MAX_QUERY_LIMIT` | `500` | `500` | per-REQ limit |
| `RELAY_SUPPORTED_NIPS` | `1,11,50` | `1,11,50` | advertised in NIP-11 |

### Remote layout

`install-relay.sh` converges the VPS to this layout:

| Path | Purpose |
| --- | --- |
| `/usr/local/bin/market-relay` | the binary |
| `/etc/market-relay.env` | the stage env file |
| `/etc/systemd/system/market-relay.service` | systemd unit |
| `/var/lib/market-relay/` | data dir (BoltDB + Bleve) |
| `/var/lib/market-relay/search` | Bleve search index |
| `/var/lib/market-relay/raw` | raw BoltDB event store |

The systemd unit runs as user `deployer`, reads `/etc/market-relay.env`, and
restarts on failure (`RestartSec=5`, `LimitNOFILE=65536`).

### Deploy via CI (recommended)

The canonical path is the **Deploy Relay** workflow,
[`.github/workflows/deploy-relay.yml`](../.github/workflows/deploy-relay.yml).

- **Build job:** sets up Go 1.25, runs `go test ./...`, builds a static
  `linux/amd64` binary (`CGO_ENABLED=0`, version stamped from the commit SHA),
  and assembles a deploy package (binary + systemd unit + both stage env files +
  both Caddyfiles).
- **Staging deploy** runs automatically on pushes to `master` that touch
  `deploy-simple/relay/**` or the relay Caddyfiles — no manual action needed.
- **Production deploy** is **manual only**: trigger the workflow via GitHub
  Actions → "Run workflow", choosing `production` (or `all` to do both stages).

Both deploy steps SSH in, run `install-relay.sh <stage>`, reload Caddy (with an
automatic backup + rollback if the new Caddyfile fails to reload), and verify by
fetching NIP-11 (`application/nostr+json`). The installer itself also backs up
the previous binary/env/unit and restores them if the restart fails — so a bad
deploy rolls back automatically.

### Manual deployment (fallback)

If you must deploy without CI, build the binary locally and run the installer on
the host:

```bash
# 1. Build (Go 1.25)
cd deploy-simple/relay
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -ldflags "-s -w" -o market-relay ./cmd/market-relay

# 2. Copy the package to the VPS
scp market-relay deploy-simple/relay/systemd/market-relay.service \
    deploy-simple/relay/config/production.env \
    deploy-simple/relay/install-relay.sh \
    deployer@relay.plebeian.market:/tmp/relay-deploy/

# 3. Run the installer on the host
ssh deployer@relay.plebeian.market
chmod +x /tmp/relay-deploy/install-relay.sh
sudo /tmp/relay-deploy/install-relay.sh production /tmp/relay-deploy
```

### Verification

```bash
# NIP-11 info document
curl -s -H 'Accept: application/nostr+json' https://relay.plebeian.market/ | jq .

# Health endpoint
curl -s https://relay.plebeian.market/healthz   # → "ok"

# systemd status + recent logs
ssh deployer@relay.plebeian.market 'sudo systemctl status market-relay --no-pager'
ssh deployer@relay.plebeian.market 'sudo journalctl -u market-relay -n 50 --no-pager'
```

For staging, substitute `relay.staging.plebeian.market`.

---

## 4. Strfry Aggregator Setup (`market-agg.orangesync.tech`)

### What it is

The aggregator is a **read-only cache relay** that solves the dead-relay-timeout
problem. A scraper daemon actively pulls market-relevant events from upstream
Nostr relays and re-publishes them into a local **[strfry](https://github.com/hoytech/strfry)**
relay. The app then reads from this single fast endpoint (~ms, local) instead of
fanning out to many unreliable public relays.

A **write-policy plugin** (`write-policy.py`) gates what strfry actually
persists. The deployment is fully self-contained: `docker-compose.yml` defines
its own bridge network and both services build from one local `Dockerfile`. It
runs standalone on any host with Docker — no other project's networks or
containers are required.

### Components

| File | Purpose |
| --- | --- |
| [`docker-compose.yml`](../deploy-simple/aggregator/docker-compose.yml) | two services: `strfry-market-agg` (the relay) + `scraper` (the daemon) |
| [`strfry.conf`](../deploy-simple/aggregator/strfry.conf) | relay config (DB size, limits, write-policy plugin path, negentropy) |
| [`write-policy.py`](../deploy-simple/aggregator/write-policy.py) | strfry writePolicy plugin — the dual-mode market-kind gate |
| [`scraper.py`](../deploy-simple/aggregator/scraper.py) | the scraping daemon (bootstrap → discover → scrape → expand → maintain) |
| [`Dockerfile`](../deploy-simple/aggregator/Dockerfile) | strfry + python3 + websocket-client (shared by both services) |

### The write-policy gate (dual-mode)

`write-policy.py` is invoked by strfry as a long-lived process (one JSON request
per stdin line, one JSON response per stdout line). It is **kind-based**, not
membership-based, so public market data is accepted broadly:

| Kind class | Examples | Accepted from |
| --- | --- | --- |
| **PUBLIC market** | `0, 1, 3, 5, 7, 1111, 30018, 30402, 30405, 30406, 30408, 30440–30442, 31555, 31989, 31990, 9735, 1985, 10000, 10002, 30000, 1023–1026, 25910` | **anyone** (public data) |
| **RESTRICTED** | `1059, 1060` (NIP-17 gift-wrap), `30078` (NIP-78 app data), `13, 14, 16, 17` (seals/order messages/receipts), `17375` (NIP-60 Cashu) | **root npub or WoT allowlist only** |
| everything else | — | **rejected** |

The root npub's own events are always accepted so the relay can bootstrap before
the allowlist is populated. The allowlist (`state/allowed.npubs`, one hex pubkey
per line) is **hot-reloaded** when its mtime changes, so the scraper's maintain
timer can update the served set without restarting strfry.

> See `RELAY_PLAN.md` → "Aggregator Gate Policy" for the full rationale,
> including why the original WoT-social gate was replaced by this market-kind
> gate.

### The scraper daemon (`scraper.py`)

The scraper mirrors events relevant to the root npub's market network in five
phases:

1. **BOOTSTRAP** — query seed relays for the root npub's kind 3 (follows) and
   kind 10002 (relay list).
2. **DISCOVER** — for each followed pubkey, fetch *their* kind 10002 to learn
   which relays they publish to, building a `(pubkey, relay)` index.
3. **SCRAPE** — one worker thread per relay holds a persistent subscription
   (chunked author filters + a `#p` filter for the root npub) and re-publishes
   every received EVENT to the local strfry.
4. **EXPAND** — every 30 min, harvest new pubkeys seen in `p` tags (capped at
   `MAX_PUBKEYS`).
5. **MAINTAIN** — every 5 min refresh the root npub's replaceable events;
   every 1 h prune pubkeys unseen for `PRUNE_AGE_DAYS`; rewrite
   `state/allowed.npubs` (the WoT set the write-policy gates on).

All knobs are environment variables (see `docker-compose.yml`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `ROOT_HEX` | _(required)_ | root npub (hex) defining personal mode |
| `STRFRY_URL` | `ws://localhost:7777` | strfry websocket to republish into |
| `SEED_RELAYS` | `wss://relay.plebeian.market,wss://relay.damus.io,wss://nos.lol` | bootstrap + discovery relays |
| `MAX_PUBKEYS` | `2000` | cap on tracked pubkeys (personal mode) |
| `PRUNE_AGE_DAYS` | `30` | prune pubkeys unseen this long |
| `MAX_RELAYS` | `10` | cap on concurrently-scraped relays |
| `MAX_AUTH_PER_REQ` | `200` | authors per REQ filter (relay ceiling) |
| `ROOT_REFRESH_INTERVAL` | `300` (5 min) | root replaceable-event refresh |
| `EXPAND_INTERVAL` | `1800` (30 min) | WoT expansion from new `p` tags |
| `PRUNE_INTERVAL` | `3600` (1 hour) | stale-pubkey pruning |

The write-policy side reads:

| Variable | Default | Meaning |
| --- | --- | --- |
| `STRFRY_AGG_ROOT_HEX` | — | root npub hex (bootstrap trust anchor) |
| `STRFRY_AGG_ALLOWED` | `/opt/strfry-agg/state/allowed.npubs` | allowlist path (hot-reloaded on mtime change) |

### strfry configuration highlights

From [`strfry.conf`](../deploy-simple/aggregator/strfry.conf):

| Setting | Value | Rationale |
| --- | --- | --- |
| `dbParams.mapsize` | 3 GB (3221225472) | market events are small but numerous |
| `events.maxNumTags` | 2000 | stalls/listings carry many tags (price, images, shipping) |
| `events.maxEventSize` | 65536 | per-event cap |
| `relay.maxFilterLimit` | 500 | matches app-side query limits |
| `relay.maxReqFilterSize` | 200 | complex market filters |
| `relay.maxTagsPerFilter` | 3 | _(see note below)_ |
| `writePolicy.plugin` | `/opt/strfry-agg/write-policy.py` | the dual-mode gate |
| `negentropy.enabled` | true | fast sync from upstream relays |

> **Tuning note:** `RELAY_PLAN.md` tracks raising `maxTagsPerFilter` from 3 to 8
> (market queries filter on stall_id, category, price, location). The committed
> `strfry.conf` currently sets `3`; confirm against `RELAY_PLAN.md` before
> relying on a higher value.

### Deploy

```bash
cd deploy-simple/aggregator
mkdir -p db state          # strfry DB + scraper allowlist state (gitignored)
docker compose up -d --build
```

- The relay container (`market-agg-relay`, compose service `strfry-market-agg`)
  listens on `127.0.0.1:7780` (container `:7777`). Caddy proxies
  `market-agg.orangesync.tech` → `127.0.0.1:7780`.
- `scraper` (`market-agg-scraper`) starts after the relay, bootstraps the root
  npub's network, and begins scraping.

```bash
# Tail the scraper
docker compose logs -f scraper

# Check the relay is serving
curl -s -H 'Accept: application/nostr+json' https://market-agg.orangesync.tech/ | jq .
```

> The `db/` and `state/` directories hold the strfry LMDB store and the
> hot-reloaded allowlist respectively. Both should be persistent host-mounted
> volumes (the compose file bind-mounts `./db` and `./state`).

### Market app wiring

After deployment, point the app at the aggregator. The production read path uses
the `MARKET_AGGREGATOR_RELAY` constant (in `src/lib/constants.ts`), which is
prepended to the relay set in production `getRelayUrls()`. See
[`relay-configuration.md`](relay-configuration.md) and `RELAY_PLAN.md` → "Relay
Constants in App Code".

---

## 5. Backup and Restore

Market events on the Khatru relay can be backed up and restored as editable
NDJSON using the repo-owned scripts in
[`deploy-simple/scripts/market-events/`](../deploy-simple/scripts/market-events/).

| File | Purpose |
| --- | --- |
| `backup.ts` | fetches market events from a stage relay → one NDJSON file per scope + `all.ndjson` + `manifest.json` |
| `restore.ts` | reads those NDJSON files and republishes the raw signed events to a target relay |
| `_shared.ts` | shared stage resolution, scope definitions, manifest + publish logic |

### Default scopes

| Scope | Contents |
| --- | --- |
| `app-authored` | every event authored by the app pubkey |
| `catalog` | product + collection events (`30402`, `30405`) |
| `lists` | all `30003` list events |
| `app-data` | all `30078` app-specific data events |
| `orders` | all order + payment events (`14`, `16`, `17`) |

### Backup

```bash
# Back up a stage relay (creates deploy-simple/backups/market-<stage>-<timestamp>/)
bun run deploy-simple/scripts/market-events/backup.ts --stage staging
bun run deploy-simple/scripts/market-events/backup.ts --stage production
```

With overrides:

```bash
bun run deploy-simple/scripts/market-events/backup.ts \
  --stage staging \
  --out-dir deploy-simple/backups/staging-snapshot \
  --scopes app-authored,catalog,orders \
  --since 1773900000
```

Output layout: `manifest.json` (stage, relay, app pubkey, counts, scope
metadata), `all.ndjson` (deduped union), and one `<scope>.ndjson` per scope —
so you can inspect or edit the backup before restoring.

### Restore

```bash
bun run deploy-simple/scripts/market-events/restore.ts \
  --stage staging \
  --in-dir deploy-simple/backups/market-staging-20260320T000000Z
```

Dry-run or selective restore:

```bash
bun run deploy-simple/scripts/market-events/restore.ts \
  --stage production \
  --in-dir deploy-simple/backups/prod-snapshot \
  --dry-run                 # preview without publishing

bun run deploy-simple/scripts/market-events/restore.ts \
  --stage staging \
  --in-dir deploy-simple/backups/staging-snapshot \
  --scopes app-authored,orders
```

Duplicate-publish rejections are treated as skips by default, so reruns are safe
against an already-seeded relay.

> **Note:** run these from the repo root. There are no `deploy:market-events:*`
> npm-script aliases in `package.json`; invoke the `.ts` files directly with
> `bun run` as shown above.

---

## 6. CI/CD Deployment

### Deploy Relay (`.github/workflows/deploy-relay.yml`)

Deploys the Khatru relay. See [§3](#3-khatru-relay-setup-relayplebeianmarket) for
the full flow. Summary:

| Stage | Trigger | Environment | Auto-rollback |
| --- | --- | --- | --- |
| Staging | push to `master` touching `deploy-simple/relay/**` or relay Caddyfiles | `staging` | installer restores previous binary/env/unit on failed restart; Caddyfile restored on failed reload |
| Production | manual `workflow_dispatch` with `stage=production` (or `all`) | `production` | same |

Build runs `go test ./...` and produces a stamped static binary; the deploy step
runs `install-relay.sh`, reloads Caddy, and verifies NIP-11.

### Deploy App (`.github/workflows/deploy.yml`)

Deploys the **application** (not the relay) to staging. It triggers on
successful completion of the **E2E Tests** workflow on `master`, or on manual
dispatch. It builds the app with Bun, creates a release package (`dist/`,
`src/`, `contextvm/`), uploads it to the VPS, does a blue-green symlink swap
under PM2, reloads Caddy, and runs a health check against
`https://staging.plebeian.market/api/config`. A failed deploy rolls back the
symlink and Caddyfile automatically.

Production app deploys are driven by the **release** and **promote-production**
workflows (push a `*-release` tag, or dispatch promote-production to bump and
push the next tag).

### Required GitHub secrets

**Relay deployment** (`deploy-relay.yml`) — the relay service itself needs no
secrets, but SSH access to the hosts does:

| Secret | Used for |
| --- | --- |
| `STAGING_HOST` / `STAGING_USER` / `STAGING_PASSWORD` | SSH to the staging relay host |
| `PROD_HOST` / `PROD_USER` / `PROD_PASSWORD` | SSH to the production relay host |

**App deployment** (`deploy.yml` / release workflows):

| Secret | Description |
| --- | --- |
| `STAGING_HOST` / `STAGING_USER` / `STAGING_PASSWORD` | staging VPS access |
| `STAGING_RELAY_URL` | e.g. `wss://relay.staging.plebeian.market` |
| `STAGING_APP_PRIVATE_KEY` | app's Nostr private key (hex) |
| `STAGING_CVM_SERVER_KEY` | ContextVM server key |
| `PROD_HOST` / `PROD_USER` / `PROD_PASSWORD` | production VPS access |
| `PROD_RELAY_URL` | e.g. `wss://relay.plebeian.market` |
| `PROD_APP_PRIVATE_KEY` | app's Nostr private key (hex) |

Configure these under **Settings → Secrets and variables → Actions**, scoped to
the `staging` and `production` environments respectively (enable "Required
reviewers" on the `production` environment).

---

## 7. Monitoring and Troubleshooting

### Khatru relay

```bash
# NIP-11 info document (should return JSON with name, supported_nips, etc.)
curl -s -H 'Accept: application/nostr+json' https://relay.plebeian.market/ | jq .

# Health endpoint
curl -sf https://relay.plebeian.market/healthz    # → "ok"

# Service status + logs
ssh deployer@relay.plebeian.market 'sudo systemctl status market-relay --no-pager'
ssh deployer@relay.plebeian.market 'sudo journalctl -u market-relay -n 100 --no-pager'

# Restart the service
ssh deployer@relay.plebeian.market 'sudo systemctl restart market-relay'
```

**Deploy failed / relay won't start:** `install-relay.sh` automatically restores
the previous binary, env file, and systemd unit if the post-restart health check
fails. Check `journalctl -u market-relay` for the underlying error (common
causes: a bad env value, or the Bleve search index needing a rebuild — the relay
deletes and reinitializes a corrupt Bleve index automatically on startup).

**Caddy/TLS issues:** both relay and app deploys back up `/etc/caddy/Caddyfile`
before reloading; if the reload fails they restore it. Verify with
`sudo caddy validate --config /etc/caddy/Caddyfile`.

### strfry aggregator

```bash
cd deploy-simple/aggregator

# Container health
docker compose ps

# Relay logs (strfry)
docker compose logs -f strfry-market-agg

# Scraper logs (bootstrap/scrape/expand/maintain phases)
docker compose logs -f scraper

# NIP-11
curl -s -H 'Accept: application/nostr+json' https://market-agg.orangesync.tech/ | jq .

# Rebuild from scratch (wipes the cache; scraper re-bootstraps)
docker compose down
rm -rf db state && mkdir -p db state
docker compose up -d --build
```

**Events missing from the aggregator:** the write-policy rejects anything
outside `PUBLIC_MARKET_KINDS` / `RESTRICTED_KINDS`. Confirm the kind is in the
accepted set (see [§4](#the-write-policy-gate-dual-mode)) and, for restricted
kinds, that the author is the root npub or on the allowlist. The scraper must
also have discovered the pubkey — check `docker compose logs scraper` for the
discover/expand phases and confirm the pubkey appears in `state/allowed.npubs`.

**Allowlist not updating:** the write-policy hot-reloads `state/allowed.npubs`
on mtime change. If it's stale, confirm the scraper's maintain timer is running
and that the file is being rewritten (the relay container mounts `state`
read-only; only the scraper writes it).

### Bug report relay (`bugs.plebeian.market`)

Receives kind 1 text notes (bug reports) via the `BUG_RELAY` constant. It has no
in-repo deploy artifacts; inspect reports directly with `nak`:

```bash
nak req -k 1 wss://bugs.plebeian.market | jq .
```

### Cross-relay data migration

To copy events from one relay to another at the Nostr protocol layer, use
[`scripts/migrate-relay.ts`](../scripts/migrate-relay.ts):

```bash
# Migrate bug reports into the main app relay
SOURCE_RELAYS=wss://bugs.plebeian.market \
TARGET_RELAYS=wss://relay.plebeian.market \
TAG_T=plebian2beta \
bun run scripts/migrate-relay.ts
```

### Rollback

- **Khatru relay:** automatic on failed restart (installer restores previous
  binary/env/unit). To roll back manually, redeploy the prior commit via CI or
  `install-relay.sh`.
- **Aggregator:** `docker compose` has no versioned images, so "rollback" means
  `docker compose down`, restoring a known-good `strfry.conf` / `write-policy.py`
  / `scraper.py` from git, and `docker compose up -d --build`. The `db/` volume
  survives container recreation.
