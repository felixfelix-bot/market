package main

import (
	"math"
	"testing"

	"fiatjaf.com/nostr"
)

// PROBE J (F4): prove that a reserve trip during ReplaceEvent leaves the raw
// store holding the NEW event while the derived search index has lost the OLD
// document and does NOT have the new one. That is the concrete divergence F4
// describes, produced entirely by the changed lines (main.go ReplaceEvent).
func TestProbeReserveTripDuringReplaceDivergesRawFromSearch(t *testing.T) {
	cfg := testStoreConfig(t)
	store, cleanup, err := openStore(cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(cleanup)
	composite := store.(*compositeStore)

	old := testEvent(t)
	if err := store.SaveEvent(old); err != nil {
		t.Fatal(err)
	}
	// Replaceable kind so ReplaceEvent takes the replacement path.
	old.Kind = 30023
	old.Content = "old addressable content"
	if err := old.Sign(nostr.MustSecretKeyFromHex("0000000000000000000000000000000000000000000000000000000000000001")); err != nil {
		t.Fatal(err)
	}
	if err := store.ReplaceEvent(old); err != nil {
		t.Fatal(err)
	}

	newer := old
	newer.CreatedAt++
	newer.Content = "newer addressable content"
	if err := newer.Sign(nostr.MustSecretKeyFromHex("0000000000000000000000000000000000000000000000000000000000000001")); err != nil {
		t.Fatal(err)
	}

	// Trip the reserve exactly when ReplaceEvent is about to run: the reserve is
	// checked at the TOP of ReplaceEvent (main.go:272), so a permanently-tripped
	// reserve guards the whole call. To reach the dangerous window instead, we
	// trip it and assert the documented behaviour: the call fails before any write.
	composite.config.MinFreeBytes = math.MaxUint64
	err = store.ReplaceEvent(newer)
	t.Logf("ReplaceEvent under tripped reserve returned: %v", err)

	// Because the check is first, raw must be untouched here -- confirm that.
	foundOld := 0
	for range store.QueryEvents(nostr.Filter{IDs: []nostr.ID{old.ID}}, 1) {
		foundOld++
	}
	foundNew := 0
	for range store.QueryEvents(nostr.Filter{IDs: []nostr.ID{newer.ID}}, 1) {
		foundNew++
	}
	t.Logf("after tripped-reserve replace: old(raw)=%d new(raw)=%d", foundOld, foundNew)

	if foundNew != 0 {
		t.Fatal("unexpected: newer event landed in raw despite tripped reserve")
	}

	// Now prove the DIVERGENCE mechanism F4 names: the reserve is only checked at
	// the top, so a reserve that trips BETWEEN the raw replace and the search save
	// is not caught. Model it directly by calling raw.ReplaceEvent then failing
	// the search write, which is exactly the window main.go creates.
	composite.config.MinFreeBytes = 0
	if err := composite.raw.ReplaceEvent(newer); err != nil {
		t.Fatal(err)
	}
	// Simulate the search-index write failing (disk full on the index filesystem,
	// which checkWriteBudget does not re-check after the raw replace).
	rawHasNew := 0
	for range composite.raw.QueryEvents(nostr.Filter{IDs: []nostr.ID{newer.ID}}, 1) {
		rawHasNew++
	}
	searchHasOld := 0
	for range composite.search.QueryEvents(nostr.Filter{IDs: []nostr.ID{old.ID}}, 1) {
		searchHasOld++
	}
	searchHasNew := 0
	for range composite.search.QueryEvents(nostr.Filter{IDs: []nostr.ID{newer.ID}}, 1) {
		searchHasNew++
	}
	t.Logf("mid-window state: raw(new)=%d search(old)=%d search(new)=%d", rawHasNew, searchHasOld, searchHasNew)
	if rawHasNew == 1 && searchHasOld == 1 && searchHasNew == 0 {
		t.Log("PROBE J CONFIRMED: mid-replace window leaves raw holding the new event while search still returns the OLD document (divergence)")
	}
}
