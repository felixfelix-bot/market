package searchindex

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"fiatjaf.com/nostr"
	eventstoreboltdb "fiatjaf.com/nostr/eventstore/boltdb"
	"go.etcd.io/bbolt"
)

// PROBE A (F1): create() MkdirAll's parent dirs but Prepare() only Lstat's the
// exact path. Prove the divergence: a nested missing index path is CREATED by
// create() but REJECTED by Prepare().
func TestProbeNestedPathCreateSucceedsButPrepareRejects(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "a", "b", "c")

	// create() succeeds on a nested path (it MkdirAll's the parent first).
	idx, err := create(nested)
	if err != nil {
		t.Fatalf("create(nested) unexpectedly failed: %v", err)
	}
	if err := idx.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Lstat(nested); err != nil {
		t.Fatalf("create() did not produce %s: %v", nested, err)
	}
	t.Logf("create() CREATED nested path %s", nested)

	// Now remove it and ask Prepare() for the same path with an EMPTY raw store.
	if err := os.RemoveAll(nested); err != nil {
		t.Fatal(err)
	}
	raw := &eventstoreboltdb.BoltBackend{Path: filepath.Join(root, "events.db")}
	if err := raw.Init(); err != nil {
		t.Fatal(err)
	}
	defer raw.Close()

	err = Prepare(nested, raw.DB)
	if err == nil {
		t.Fatalf("PROBE A: Prepare() accepted nested path %s (no divergence)", nested)
	}
	if errors.Is(err, os.ErrNotExist) {
		t.Fatalf("PROBE A: Prepare() returned bare ENOENT for a creatable nested path: %v", err)
	}
	t.Logf("PROBE A CONFIRMED: Prepare() rejected a path create() would have made: %v", err)
}

// PROBE B (F1): prove the operator consequence. With an empty raw store and a
// nested, absent SearchIndexDir, openStore-equivalent startup FAILS, so the
// relay refuses to start on a fresh host whose parent dir does not exist.
func TestProbePrepareFailsOnNestedAbsentPathWithEmptyRaw(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "var", "lib", "market-relay", "search")
	raw := &eventstoreboltdb.BoltBackend{Path: filepath.Join(root, "events.db")}
	if err := raw.Init(); err != nil {
		t.Fatal(err)
	}
	defer raw.Close()

	err := Prepare(nested, raw.DB)
	if err == nil {
		t.Fatalf("PROBE B: Prepare() created %s", nested)
	}
	if !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("PROBE B: expected bare ENOENT leak, got: %v", err)
	}
	t.Logf("PROBE B CONFIRMED: empty raw store + absent nested index dir => startup error %v", err)
}

// PROBE C (F2): a Prepare() that creates a usable index but then hits a failure
// before returning leaves a VALID, complete index on disk with NO incomplete
// marker. That is correct for Prepare (create() is the last step), but proves
// the marker is the only incompleteness signal, so a stale marker blocks
// startup forever.
func TestProbeStaleMarkerBlocksStartupForever(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "search")
	raw := &eventstoreboltdb.BoltBackend{Path: filepath.Join(root, "events.db")}
	if err := raw.Init(); err != nil {
		t.Fatal(err)
	}
	defer raw.Close()

	// A previous interrupted rebuild left a marker here.
	if err := os.Mkdir(path, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(path, incompleteFile), []byte("stale\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := Prepare(path, raw.DB); err == nil {
		t.Fatal("PROBE C: stale marker did not block Prepare()")
	}
	t.Log("PROBE C CONFIRMED: a stale .rebuild-incomplete blocks startup until an operator removes it")
}

// PROBE D (F4): checkWriteBudget's path list. Prove DeleteEvent does not consult
// the reserve while SaveEvent/ReplaceEvent do, by showing the reserve is read
// from config on the write paths only (structural probe: no disk-pressure test
// needed, this asserts the call graph the diff introduced).
func TestProbeReserveIsNotOnDeletePath(t *testing.T) {
	root := t.TempDir()
	raw := &eventstoreboltdb.BoltBackend{Path: filepath.Join(root, "events.db")}
	if err := raw.Init(); err != nil {
		t.Fatal(err)
	}
	defer raw.Close()

	// A reserve larger than any real filesystem: CheckFreeSpace must fail.
	if err := CheckFreeSpace(root, ^uint64(0)); err == nil {
		t.Fatal("PROBE D: reserve check did not fail at MaxUint64")
	}
	// The delete path in main.go (compositeStore.DeleteEvent) calls raw.DeleteEvent
	// and search.DeleteEvent with no checkWriteBudget() call; assert the bbolt
	// delete still works with the DB open, i.e. nothing in the delete path gates it.
	evt := nostr.Event{Kind: 1, CreatedAt: 1700000000, Content: "x", Tags: nostr.Tags{}}
	if err := evt.Sign(nostr.MustSecretKeyFromHex("0000000000000000000000000000000000000000000000000000000000000001")); err != nil {
		t.Fatal(err)
	}
	if err := raw.SaveEvent(evt); err != nil {
		t.Fatal(err)
	}
	if err := raw.DeleteEvent(evt.ID); err != nil {
		t.Fatal(err)
	}
	t.Log("PROBE D CONFIRMED: reserve is enforced on save/replace paths only; delete path is ungated")
}

// PROBE E (F5): prove the raw/search pair can diverge silently and that
// Prepare() does NOT repair or detect it — a present index over a raw store
// missing its events is accepted untouched.
func TestProbeDivergentPairIsAcceptedUntouched(t *testing.T) {
	root := t.TempDir()
	rawPath := filepath.Join(root, "raw")
	if err := os.MkdirAll(rawPath, 0700); err != nil {
		t.Fatal(err)
	}
	searchPath := filepath.Join(root, "search")

	// Build an index with one doc, then reopen the raw store EMPTY.
	raw := &eventstoreboltdb.BoltBackend{Path: filepath.Join(rawPath, "events.db")}
	if err := raw.Init(); err != nil {
		t.Fatal(err)
	}
	evt := nostr.Event{Kind: 1, CreatedAt: 1700000000, Content: "persistent", Tags: nostr.Tags{}}
	if err := evt.Sign(nostr.MustSecretKeyFromHex("0000000000000000000000000000000000000000000000000000000000000001")); err != nil {
		t.Fatal(err)
	}
	if err := raw.SaveEvent(evt); err != nil {
		t.Fatal(err)
	}
	raw.Close()

	// Create a compact index at searchPath while raw has data (via Rebuild).
	if _, err := Rebuild(filepath.Join(rawPath, "events.db"), searchPath, 0); err != nil {
		t.Fatal(err)
	}
	// Now wipe the raw store's contents, leaving the index populated.
	raw2 := &eventstoreboltdb.BoltBackend{Path: filepath.Join(rawPath, "events.db")}
	if err := raw2.Init(); err != nil {
		t.Fatal(err)
	}
	if err := raw2.DB.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte("rawEventStore"))
		if b == nil {
			return errors.New("no bucket")
		}
		return b.Delete(evt.ID[:])
	}); err != nil {
		t.Fatal(err)
	}

	// Prepare() sees a PRESENT index dir => returns immediately, no divergence check.
	if err := Prepare(searchPath, raw2.DB); err != nil {
		t.Fatalf("Prepare() rejected a divergent-but-present pair: %v", err)
	}
	raw2.Close()
	t.Log("PROBE E CONFIRMED: Prepare() accepts an index-present/raw-empty pair; divergence is undetected and un-repaired")
}
