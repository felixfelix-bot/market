package searchindex

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"fiatjaf.com/nostr"
	eventstorebleve "fiatjaf.com/nostr/eventstore/bleve"
	eventstoreboltdb "fiatjaf.com/nostr/eventstore/boltdb"
	bleve "github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
)

// PROBE F: Prepare() returns early for ANY pre-existing SearchIndexDir, so an
// EMPTY pre-existing dir falls through to the unchanged BleveBackend.Init(),
// which on ErrorIndexPathDoesNotExist calls bleve.New with the DEFAULT dynamic
// mapping -- NOT the compact mapping this PR exists to install.
func TestProbeEmptyPreexistingIndexDirGetsLegacyDynamicMapping(t *testing.T) {
	root := t.TempDir()
	searchPath := filepath.Join(root, "search")
	raw := &eventstoreboltdb.BoltBackend{Path: filepath.Join(root, "raw", "events.db")}
	if err := os.MkdirAll(filepath.Dir(raw.Path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := raw.Init(); err != nil {
		t.Fatal(err)
	}
	defer raw.Close()

	// Operator/installer left an empty index directory behind.
	if err := os.Mkdir(searchPath, 0700); err != nil {
		t.Fatal(err)
	}

	// This mirrors openStore(): Prepare then BleveBackend.Init.
	if err := Prepare(searchPath, raw.DB); err != nil {
		t.Fatalf("PROBE F: Prepare rejected an empty dir: %v", err)
	}
	search := &eventstorebleve.BleveBackend{Path: searchPath, RawEventStore: raw}
	if err := search.Init(); err != nil {
		t.Fatalf("PROBE F: Init failed: %v", err)
	}
	defer search.Close()

	// What mapping actually landed on disk?
	rawMeta, err := os.ReadFile(filepath.Join(searchPath, "index_meta.json"))
	if err != nil {
		t.Fatal(err)
	}
	var got map[string]any
	if err := json.Unmarshal(rawMeta, &got); err != nil {
		t.Fatal(err)
	}

	// Build the compact mapping the same way Rebuild/Prepare do, marshal it.
	gotDefault, _ := json.Marshal(got["default_mapping"])

	t.Logf("on-disk default_mapping has \"dynamic\": %v", gotDefault != nil && string(gotDefault) != "null")

	// The compact mapping sets default_mapping to a STATIC document mapping with
	// explicit "c"/"k"/"p"/"a" fields and store=false.
	var onDisk struct {
		DefaultMapping *struct {
			Dynamic *bool `json:"dynamic"`
			Props   map[string]struct {
				Store *bool `json:"store"`
			} `json:"properties"`
		} `json:"default_mapping"`
	}
	if err := json.Unmarshal(rawMeta, &onDisk); err != nil {
		t.Fatal(err)
	}
	if onDisk.DefaultMapping == nil {
		t.Fatal("no default_mapping on disk")
	}
	if onDisk.DefaultMapping.Dynamic != nil && *onDisk.DefaultMapping.Dynamic {
		t.Log("PROBE F CONFIRMED: empty pre-existing index dir silently got the LEGACY DYNAMIC mapping, not the compact mapping")
		return
	}
	if len(onDisk.DefaultMapping.Props) == 0 {
		t.Log("PROBE F CONFIRMED: on-disk default_mapping has NO explicit field properties (dynamic/legacy mapping)")
		return
	}
	t.Logf("PROBE F REFUTED: on-disk mapping has explicit props: %v", onDisk.DefaultMapping.Props)
}

// PROBE G: is the compact mapping really what Prepare() writes (sanity), and
// does the empty-dir path differ? Compare the two index_meta.json files.
func TestProbeCompareMappingFiles(t *testing.T) {
	root := t.TempDir()

	// Path 1: dir does NOT exist -> Prepare creates it with the compact mapping.
	p1 := filepath.Join(root, "absent")
	raw1 := &eventstoreboltdb.BoltBackend{Path: filepath.Join(root, "r1", "events.db")}
	if err := os.MkdirAll(filepath.Dir(raw1.Path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := raw1.Init(); err != nil {
		t.Fatal(err)
	}
	defer raw1.Close()
	if err := Prepare(p1, raw1.DB); err != nil {
		t.Fatal(err)
	}
	compactMeta, err := os.ReadFile(filepath.Join(p1, "index_meta.json"))
	if err != nil {
		t.Fatal(err)
	}

	// Path 2: dir EXISTS but empty -> Prepare no-ops, BleveBackend.Init defaults.
	p2 := filepath.Join(root, "empty")
	if err := os.Mkdir(p2, 0700); err != nil {
		t.Fatal(err)
	}
	raw2 := &eventstoreboltdb.BoltBackend{Path: filepath.Join(root, "r2", "events.db")}
	if err := os.MkdirAll(filepath.Dir(raw2.Path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := raw2.Init(); err != nil {
		t.Fatal(err)
	}
	defer raw2.Close()
	if err := Prepare(p2, raw2.DB); err != nil {
		t.Fatal(err)
	}
	legacy := &eventstorebleve.BleveBackend{Path: p2, RawEventStore: raw2}
	if err := legacy.Init(); err != nil {
		t.Fatal(err)
	}
	legacy.Close()
	legacyMeta, err := os.ReadFile(filepath.Join(p2, "index_meta.json"))
	if err != nil {
		t.Fatal(err)
	}

	if string(compactMeta) == string(legacyMeta) {
		t.Log("PROBE G: mappings identical (no divergence)")
	} else {
		t.Logf("PROBE G CONFIRMED: compact-path meta %d bytes != empty-dir meta %d bytes; the empty-dir branch does NOT get the compact mapping", len(compactMeta), len(legacyMeta))
	}
}

// PROBE H: what does bleve.New do on an EXISTING EMPTY directory? Establishes
// the mechanism behind probe F.
func TestProbeBleveNewOnExistingEmptyDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "empty")
	if err := os.Mkdir(dir, 0700); err != nil {
		t.Fatal(err)
	}
	idx, err := bleve.New(dir, mapping.NewIndexMapping())
	if err != nil {
		t.Logf("PROBE H: bleve.New on existing empty dir FAILED: %v", err)
		return
	}
	idx.Close()
	t.Log("PROBE H CONFIRMED: bleve.New succeeds on an existing EMPTY directory, so BleveBackend.Init's default-mapping fallback is reachable")
}

// PROBE I: Rebuild's DocCount validation vs an empty raw store.
func TestProbeRebuildOnEmptyRawStore(t *testing.T) {
	root := t.TempDir()
	rawPath := filepath.Join(root, "events.db")
	raw := &eventstoreboltdb.BoltBackend{Path: rawPath}
	if err := raw.Init(); err != nil {
		t.Fatal(err)
	}
	raw.Close()
	out := filepath.Join(root, "out")
	n, err := Rebuild(rawPath, out, 0)
	if err != nil {
		t.Fatalf("PROBE I: rebuild of an empty raw store failed: %v", err)
	}
	t.Logf("PROBE I: empty raw store rebuilds successfully to an EMPTY index (count=%d, marker present=%v)",
		n, fileExists(filepath.Join(out, incompleteFile)))
}

func fileExists(p string) bool {
	_, err := os.Lstat(p)
	return err == nil
}

var _ = nostr.Event{}
