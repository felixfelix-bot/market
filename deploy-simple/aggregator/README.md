# Market Aggregator Relay

Market-kind-gated strfry aggregation relay for Plebeian Market. It solves
the dead-relay timeout problem identified in #1046 by caching all
market-relevant events on a single fast local relay: the market UI reads
against one endpoint (~ms local) instead of fanning out to many unreliable
relays. A long-lived **scraper daemon** keeps that cache populated by
mirroring events from upstream relays.

This is the **READ tier** of a two-relay topology. See
[`deploy-simple/relay/`](../relay/) for the **WRITE tier** (Khatru Go relay
at `relay.plebeian.market`), and [`../../RELAY_PLAN.md`](../../RELAY_PLAN.md)
for the full relay strategy.

## Architecture

```
                              [Market App]
                                   | queries (ONE relay, ~ms local)
                                   v
                +--------------------------------------------+
                | market-agg.orangesync.tech : strfry :7780 |
                |   write-policy.py  (market-kind gate)     |
                +--------------------------------------------+
                       ^ republish EVENTS
                       |
            +-----------------------+
            | scraper daemon        |
            |  publisher thread ----+
            |  relay workers (N)    |
            |  maintain timer       |
            +-----------------------+
                    |
        scrapes upstream: relay.plebeian.market,
        relay.damus.io, nos.lol + discovered relays
```

The relay accepts writes directly from the market app (and the authoritative
Khatru write relay), and the scraper daemon actively mirrors public market
events from upstream relays so the cache stays complete.

### Data flow

1. **scraper** bootstraps from the seed relays: fetches the root npub's kind 3
   (follows) and kind 10002 (relay list).
2. For each followed pubkey it discovers *their* relay lists (kind 10002),
   building a `(pubkey, relay)` index.
3. One worker thread per relay holds a persistent subscription for all tracked
   pubkeys (chunked author filters) plus a `#p` filter for events mentioning
   the root npub.
4. Every received EVENT is re-published into **strfry** via a dedicated
   publisher socket.
5. Every 5 min the scraper refreshes the root npub's replaceable events;
   every 30 min it expands the tracked set from newly-seen `p` tags (capped at
   `MAX_PUBKEYS`); every hour it prunes pubkeys unseen for `PRUNE_AGE_DAYS`.
6. The tracked pubkey set is written to `state/allowed.npubs`, which the
   **write-policy** hot-reloads (on mtime change) as its additional-trust
   allowlist.

### Write-policy (the gate)

`write-policy.py` is the strfry writePolicy plugin. It is **kind-based**, so
public market data is accepted broadly:

| Kind class | Examples | Accepted from |
|---|---|---|
| **Market-relevant** | 0, 1, 3, 7, 9735, 10000, 10002, 30402, 30405/06/08, 31989/90, 1059, 30078, … | **any pubkey** (the marketplace is open) |
| **root npub (other)** | the operator's non-market events | **root npub** (bootstrap/personal) |
| **allowlisted** | any kind from a trusted pubkey | **optional allowlist** (additional trust layer) |
| **everything else** | — | **rejected** |

The root npub's own events are always accepted, so the relay can bootstrap
before the scraper has populated the tracked set. The optional allowlist
(`state/allowed.npubs`, hot-reloaded on mtime change) is an additional trust
layer for future use cases (verified sellers, etc.), not the primary gate.

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Two services: `strfry-market-agg` + `scraper` |
| `strfry.conf` | Relay config (DB size, limits, write-policy path) |
| `write-policy.py` | strfry plugin — market-kind gate (accepts market events from any pubkey) |
| `scraper.py` | Scraping daemon (bootstrap → discover → scrape → expand → maintain) |
| `Dockerfile` | strfry + python3 + websocket-client (shared by both services) |

## Deploy

This deployment is fully **self-contained**: `docker-compose.yml` defines its
own bridge network (no external networks) and both services build from the
local `Dockerfile`. It runs standalone on any host with Docker — no other
project's networks or containers are required — so it can be deployed wherever
you like. (The VPS2 `/opt/tollgate/strfry-market-agg/` path is a legacy
location carried over from when this relay shared infra with the tollgate
project; it is not a requirement.)

```bash
cd deploy-simple/aggregator
mkdir -p db state
docker compose up -d --build
```

- The relay container (`market-agg-relay`, compose service `strfry-market-agg`)
  listens on `127.0.0.1:7780` (Caddy proxies `market-agg.orangesync.tech` ->
  `:7780`).
- `scraper` starts after the relay, bootstraps the root npub's network, and
  begins scraping. Tail logs with `docker compose logs -f scraper`.

## Scraper configuration

All knobs are environment variables (see `docker-compose.yml`):

| Variable | Default | Meaning |
|---|---|---|
| `ROOT_HEX` | _(required)_ | root npub (hex) defining the tracked graph |
| `STRFRY_URL` | `ws://localhost:7777` | strfry websocket to republish into |
| `SEED_RELAYS` | `wss://relay.plebeian.market,wss://relay.damus.io,wss://nos.lol` | bootstrap + discovery relays |
| `MAX_PUBKEYS` | `2000` | cap on tracked pubkeys |
| `PRUNE_AGE_DAYS` | `30` | prune pubkeys unseen this long |
| `MAX_RELAYS` | `10` | cap on concurrently-scraped relays |
| `MAX_AUTH_PER_REQ` | `200` | authors per REQ filter (relay ceiling) |
| `ROOT_REFRESH_INTERVAL` | `300` (5 min) | root replaceable-event refresh |
| `EXPAND_INTERVAL` | `1800` (30 min) | tracked-set expansion from new `p` tags |
| `PRUNE_INTERVAL` | `3600` (1 hour) | stale-pubkey pruning |

## Market app wiring

After deployment, `src/lib/stores/ndk.ts` uses
`wss://market-agg.orangesync.tech` as a primary relay for production.
