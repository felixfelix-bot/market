# HANDOVER E — Staging Relay Strategy

**For:** DevOps / Infrastructure
**From:** Plebeian team call (2026-07-23) + codebase research
**Status:** Planning — extract improvements first, then yolo-nuke

---

## TEAM DECISION

ADR-015 (maximotodev's relay persistence proposal, PR #1174) is **DEPRIORITIZED**. No ADR needed.

Instead: **yolo-nuke** the staging relay search index. Rationale:

- All issues concern the staging relay only
- Staging data is not the unique source — it can be re-seeded
- Search index is a disposable projection (BoltDB is source of truth)

**BUT:** Before nuking, extract 2 improvements from the current situation.

---

## ARCHITECTURE (from codebase research)

The relay uses a `compositeStore` pattern (Go binary at `deploy-simple/relay/cmd/market-relay/main.go`):

```
compositeStore {
    raw:    BoltBackend (BoltDB)     ← SOURCE OF TRUTH
    search: BleveBackend (Scorch)    ← DISPOSABLE SEARCH PROJECTION
}
```

**Data flow:**

- QueryEvents: if search term ≥2 chars → Bleve. Otherwise → BoltDB.
- SaveEvent: writes to BOTH (BoltDB first, then Bleve)
- DeleteEvent: deletes from BOTH
- CountEvents: BoltDB only

**Storage paths (staging):**

- BoltDB: `/var/lib/market-relay/raw/events.db`
- Bleve: `/var/lib/market-relay/search`

**Existing self-heal (partial):** Lines 162-173 of `main.go` — if Bleve fails to Init with "metadata missing", it auto-nukes the search dir and reinitializes. BUT this only handles "metadata missing" errors, not general corruption.

---

## IMPROVEMENT 1: UPGRADE HEALTH-Z (HIGH PRIORITY)

### Current state (BROKEN):

```go
// deploy-simple/relay/cmd/market-relay/main.go:93-96
router.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
    w.Header().Set("Content-Type", "text/plain; charset=utf-8")
    _, _ = w.Write([]byte("ok\n"))
})
```

This returns `"ok\n"` as long as the HTTP goroutine is alive. It checks NOTHING functional.

### What it SHOULD check:

1. **Bleve search probe** — issue a trivial query, confirm it returns within a deadline
2. **BoltDB read** — trivial CountEvents or known-ID lookup
3. **Doc count divergence** — compare BoltDB count vs Bleve count. Divergence = stale/corrupt index
4. Return 503 with JSON body when search is broken:
   ```json
   { "status": "degraded", "search_ok": false, "raw_count": 15234, "search_count": 0 }
   ```

### Implementation approach:

The `compositeStore` already has both handles (`s.raw`, `s.search`). Both support `QueryEvents`/`CountEvents`. The health handler needs access to the store reference — currently it doesn't have it (handler is registered before store init in the router setup).

**Effort:** Small Go change in `main.go`. ~30-50 lines.

---

## IMPROVEMENT 2: START-UP ANALYSIS + REINDEX (MEDIUM PRIORITY)

### Current state (MISSING):

- `install-relay.sh` checks: `systemctl is-active` + NIP-11 curl. That's it.
- `control.sh` (PM2) can't manage the relay at all — only the Bun app.
- systemd's `Restart=on-failure` restarts the process but CAN'T detect a zombie relay (process alive, search broken).
- **NO reindex/rebuild mechanism exists.** If you nuke the Bleve dir, events in BoltDB are NOT re-indexed. Search returns empty until new events trickle in.

### What's needed:

1. **Search-index validation on start** — `install-relay.sh` (or systemd `ExecStartPost=`) should probe the search index, not just NIP-11
2. **Reindex command** — a `market-relay reindex` subcommand or standalone tool that:
   - Iterates `compositeStore.raw.QueryEvents(nostr.Filter{}, maxLimit)`
   - Feeds each event into `compositeStore.search.SaveEvent()`
   - Reports progress
3. **Problem analysis script** — detects and reports index corruption type

**Effort:** Medium. New Go subcommand (~100-200 lines) + shell wrapper.

---

## THE YOLO-NUKE PROCEDURE (after improvements extracted)

Once Health-Z and reindex are in place:

```bash
# 1. Stop relay
sudo systemctl stop market-relay

# 2. Nuke search index (BoltDB is safe — source of truth preserved)
sudo rm -rf /var/lib/market-relay/search

# 3. Restart relay (will create fresh empty Bleve index)
sudo systemctl start market-relay

# 4. Reindex from BoltDB raw store
market-relay reindex

# 5. Verify via upgraded health-z
curl http://localhost:10549/healthz
# Should show: {"status": "ok", "search_ok": true, "raw_count": N, "search_count": N}

# 6. If data itself is also problematic (staging only):
# sudo rm -rf /var/lib/market-relay/raw/events.db /var/lib/market-relay/search
# Then re-seed from scripts/seed.ts or scripts/gen_auctions.ts
```

---

## CRITICAL WARNING

**Without the reindex tool, nuking the search index will leave search permanently degraded.** Events already in BoltDB will NOT appear in search results. The upgraded Health-Z will detect this (count divergence), but there's no fix path without reindexing.

**Recommended order:**

1. Implement Health-Z upgrade → deploy → verify it detects the current broken state
2. Implement reindex tool → test on staging
3. THEN yolo-nuke
4. Reindex
5. Verify via Health-Z

---

## OTHER HEALTH CHECKS (secondary, also shallow)

| Location                         | Current Check                     | Gap                                 |
| -------------------------------- | --------------------------------- | ----------------------------------- |
| `install-relay.sh:77-82`         | systemctl is-active + NIP-11 curl | No search index check               |
| `deploy-relay.yml:140-146`       | curl NIP-11 JSON                  | Same                                |
| `deploy-auctionsdev.yml:264-279` | PM2 status (CVM process alive)    | No CVM functionality check          |
| `deploy.sh:384-390`              | curl /api/config                  | App config only, not relay          |
| `contextvm/server.ts`            | None — no health endpoint at all  | CVM server has zero health checking |

---

## WHO SHOULD DO THIS

This is devops/infrastructure work. It touches the Go relay binary (`deploy-simple/relay/`). Likely owner: maximotodev (he proposed ADR-015 and owns relay ops) or a dedicated devops contributor.

Timeline: "next few days, maybe tomorrow" per team call.

---

_Research-based. No files modified. All findings verified against codebase at ~/repos/market._
