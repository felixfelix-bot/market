package main

// COLD VERIFIER PROBE (glm, 2026-10-28, card t_0f6a0798) — independent of all
// prior scratch tests in this worktree. Targets the build-eviction lane's
// RISK claim at main.go:266: compositeStore.ReplaceEvent deletes every
// previously-stored event from the search index regardless of nostr.IsOlder,
// so publishing an OLDER replacement makes the newest live event disappear
// from search while it remains in the raw store.

import (
	"slices"
	"testing"

	"fiatjaf.com/nostr"
)

func newerProfile(t *testing.T) nostr.Event {
	t.Helper()
	evt := nostr.Event{Kind: 0, CreatedAt: 1800000000, Content: "glmprobe-newest-profile", Tags: nostr.Tags{}}
	if err := evt.Sign(nostr.MustSecretKeyFromHex("0000000000000000000000000000000000000000000000000000000000000001")); err != nil {
		t.Fatal(err)
	}
	return evt
}

func olderProfile(t *testing.T) nostr.Event {
	t.Helper()
	evt := nostr.Event{Kind: 0, CreatedAt: 1700000000, Content: "glmprobe-stale-profile", Tags: nostr.Tags{}}
	if err := evt.Sign(nostr.MustSecretKeyFromHex("0000000000000000000000000000000000000000000000000000000000000001")); err != nil {
		t.Fatal(err)
	}
	return evt
}

func TestGlmProbeOlderReplaceEvictsLiveSearchEntry(t *testing.T) {
	cfg := testStoreConfig(t)
	store, cleanup, err := openStore(cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(cleanup)

	// Seed the newest profile first.
	newer := newerProfile(t)
	if err := store.ReplaceEvent(newer); err != nil {
		t.Fatalf("store newest profile: %v", err)
	}

	// Sanity: both raw and search see it before the trigger.
	rawHit := slices.Collect(store.QueryEvents(nostr.Filter{IDs: []nostr.ID{newer.ID}}, 1))
	if len(rawHit) != 1 {
		t.Fatalf("precondition: newest profile not in raw store")
	}
	searchHit := slices.Collect(store.QueryEvents(nostr.Filter{Search: "glmprobe-newest-profile"}, 100))
	if len(searchHit) != 1 {
		t.Fatalf("precondition: newest profile not in search index (hits=%d)", len(searchHit))
	}

	// TRIGGER: a client republishes an OLDER profile event.
	older := olderProfile(t)
	if err := store.ReplaceEvent(older); err != nil {
		t.Fatalf("ReplaceEvent(older): %v", err)
	}

	// Raw store: IsOlder comparator keeps the newer event, declines the older.
	rawHasNewer := slices.Collect(store.QueryEvents(nostr.Filter{IDs: []nostr.ID{newer.ID}}, 1))
	rawHasOlder := slices.Collect(store.QueryEvents(nostr.Filter{IDs: []nostr.ID{older.ID}}, 1))
	t.Logf("raw_has_newer=%d raw_has_older=%d", len(rawHasNewer), len(rawHasOlder))

	// Search index: what survived the eviction loop?
	searchNewer := slices.Collect(store.QueryEvents(nostr.Filter{Search: "glmprobe-newest-profile"}, 100))
	searchOlder := slices.Collect(store.QueryEvents(nostr.Filter{Search: "glmprobe-stale-profile"}, 100))
	t.Logf("search_finds_newer=%d search_finds_older=%d", len(searchNewer), len(searchOlder))

	if len(rawHasNewer) == 1 && len(searchNewer) == 0 {
		t.Logf("CONFIRMED: newest live event (%s) present in raw, permanently absent from search", newer.ID.Hex())
	}
}
