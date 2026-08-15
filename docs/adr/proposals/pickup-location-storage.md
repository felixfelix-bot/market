# ADR Proposal: Pickup location storage & no runtime geocoding

**Status:** Proposed — draft for maintainer and prior-art author review
**Number:** ADR-xxx (assigned at upstream merge; not claimed here — uniform numbering
policy, see `proposals/INDEX.md`)
**Date:** 2026-08-16
**Scope:** Storage format for vendor pickup locations on existing kind 30406 shipping
events, and elimination of third-party geocoding at render time. Docs-only decision
record; no code change in this proposal.
**References:**

- Prior art PR #684 (closed), commit `4424b8acd354d716bdc01a36213b5f8669d9ea3c` — BTC Map
  link on profile + pickup coordinate tags
- `proposals/untrusted-content-rendering-and-markdown-descriptions.md` (Decision 3 —
  URL scheme allowlist before use as `href`)
- ADR-0002 (relay I/O seam), ADR-0005 (test isolation — no external service dependencies)
- `docs/adr/ADR-BACKLOG-HANDOVER.md` § Pending Salvage Drafts, entry 3

---

## Context

Vendors offering local pickup need to publish where buyers can collect goods. Today
`master` derives pickup locations from kind 30406 shipping events where the `service`
tag equals `pickup`, reading the `pickup-address` tag
(`src/lib/schemas/shippingOption.ts`), and the profile page builds a list of all such
options for a vendor (`src/components/pages/ProfilePage.tsx`, the `pickupLocations`
`useMemo` over `useShippingOptionsByPubkey`). A vendor can publish several pickup
shipping options — the data model already supports multiple pickup locations.

The pickup-location _dialog_ then geocodes each location at render time. Inside
`PickupLocationDialog.tsx`, the `geocodeAllLocations` effect
(`src/components/dialogs/PickupLocationDialog.tsx:49–101`) issues a live
`fetch` to `https://nominatim.openstreetmap.org/search` at line 60, using
vendor-supplied address text (`formatAddress` of `pickup-address`) as the query,
sleeping 200 ms between requests to respect Nominatim's rate limit. Coordinates are
recomputed every time the dialog opens, from display text, against a third party.

That is the defect this proposal eliminates:

- It is an undocumented network egress path that predates the "no new network egress
  paths without an explicit decision" constraint in `AGENTS.md`.
- It resolves coordinates from display text (`pickup-address`), the exact
  "prefer coordinates/tags over display text" anti-pattern `AGENTS.md` calls out.
- It leaks the viewer's IP address and the vendor's address text to a third party on
  every open.
- It is rate-limited and failure-prone (sequential fetches with sleep), and it degrades
  the UI silently on error.
- It violates ADR-0005's test-isolation expectations: any e2e that exercises the dialog
  hits Nominatim unless manually mocked — the kind of external dependency ADR-0005
  prohibits in tests.

PR #684 (`feat: add btc map link to profile`, author hkarani, closed unmerged)
attempted a different storage approach and rewrote the dialog to stop geocoding. It
drafted per-shipping-option coordinate tags _and_ introduced a single profile-level map
link. This proposal adopts the first and rejects the second (see Decision 1).

## Decision

### Decision 1: Per-shipping-option `pickup-lat` / `pickup-lon` tags are the storage source of truth (kind 30406)

Pickup coordinates are stored as decimal-string tags on the kind 30406 shipping event:

- `pickup-lat` — decimal latitude, range `[-90, 90]`.
- `pickup-lon` — decimal longitude, range `[-180, 180]`.

Both tags are optional and attach to a shipping option whose `service` tag is
`pickup`. They compose with the existing kind 30406 schema (`d`, `title`, `price`,
`country`, `service`, optional `pickup-address`, `g` geohash, etc. in
`src/lib/schemas/shippingOption.ts`). `pickup-address` may remain as a human-readable
label; coordinates are the machine-readable truth.

PR #684 already drafted these schemas (`ShippingPickupLatTagSchema`,
`ShippingPickupLonTagSchema`, `^-?\d+(\.\d+)?$` decimal-string regex) but left them
orphaned — defined as exports but never wired into the `ShippingOptionSchema` tag
union. This proposal fixes that: the two schemas are added to the union so relay
events are validated at ingestion. Range bounds (lat ±90, lon ±180) are part of the
schema decision; the precise regex form is an implementation detail (see _Does not
decide_).

**Rejected alternative — single kind-0 `pickupMapLink`:** PR #684 also added a
`pickupMapLink` field to profile metadata (kind 0), reading it in `ProfilePage.tsx`
with `(profile as any)?.pickupMapLink` and writing it in the dashboard profile form
with `(fetchedProfile as any).pickupMapLink`, both `as any` casts with no zod schema.
This collapses a vendor to a single pickup location — `master`'s existing
multi-location derivation (one entry per `service: 'pickup'` shipping option) was
deleted in the same PR — uses a non-standard profile-metadata field with no schema
validation, and stores a display-text-shaped URL instead of typed coordinates. It is
rejected.

### Decision 2: No third-party geocoding at runtime — parse and validate coordinates at save time

The one-line rule: coordinates are parsed and validated when the merchant saves a
shipping option, never geocoded when a buyer renders the dialog. The `geocodeAllLocations`
effect at `PickupLocationDialog.tsx:49–101` — including the Nominatim `fetch` at line 60
and the 200 ms inter-request sleep — is removed. The dialog reads already-validated
`pickup-lat` / `pickup-lon` from the event.

This removes an external network egress path rather than adding one, which is
directionally aligned with the `AGENTS.md` egress constraint. Save-time parsing follows
PR #684's `parseCoordsFromLink` approach — pure client-side extraction of coordinates
from a merchant-supplied map URL (BTC Map / OpenStreetMap `#map=z/lat/lon` and
`#z/lat/lon`, two-segment `#lat/lon`, Google Maps `@lat,lon` and `?q=lat,lon`), with no
network calls. The specific vendor regexes are an implementation detail; the rule is
that the result is schema-validated coordinates stored as tags, not display text
re-resolved at render.

### Decision 3: External map links remain untrusted data — governed by the untrusted-content proposal

Any residual map-link surface (e.g., an "Open Map" anchor that hands the user off to
BTC Map / OpenStreetMap / Google Maps) is untrusted relay data placed into an `href`.
Scheme sanitization for those URLs is already decided in
`proposals/untrusted-content-rendering-and-markdown-descriptions.md`, Decision 3
(scheme allowlist of `http:` / `https:` before use as `href`). This proposal cites that
decision and does not re-decide URL sanitization.

## Consequences

Positive:

- Coordinates become typed, validated tags instead of display text resolved at render,
  matching the `AGENTS.md` preference for coordinates and tags over display text.
- Multi-location pickup is preserved (one `pickup-lat` / `pickup-lon` pair per kind 30406
  option) instead of collapsed to a single profile link.
- The Nominatim egress path — an external dependency with privacy, reliability, and
  test-isolation costs — is eliminated. The dialog becomes e2e-testable without mocks,
  consistent with ADR-0005.
- PR #684's drafted schemas and `parseCoordsFromLink` approach are salvaged (~60% of the
  PR) with author credit preserved.

Tradeoffs:

- Vendors must enter coordinates (or a map URL the client can parse) at save time
  rather than only an address. The "Open Map" hand-off still works for human use; the
  machine-readable coordinates are what the dialog renders.
- Existing shipping events on relays do not yet carry `pickup-lat` / `pickup-lon`. Until
  merchants re-save, the dialog falls back to the `pickup-address` label (display only,
  no geocoding) rather than showing a map pin — an explicit, bounded regression traded
  for ending third-party geocoding.
- Two new optional tags are added to the kind 30406 schema union; clients that ignore
  unknown tags are unaffected, but the tags are now part of the validated event shape.

## Prior art

Authorship credit is mandatory for any re-implementation.

### PR #684 — BTC Map link on profile + pickup coordinate tags (closed)

- https://github.com/PlebeianApp/market/pull/684
- Commit `4424b8acd354d716bdc01a36213b5f8669d9ea3c`. **Author: hkarani.**
- Verified against the commit:
  - `src/lib/schemas/shippingOption.ts` (+8) — `ShippingPickupLatTagSchema` and
    `ShippingPickupLonTagSchema` drafted with `^-?\d+(\.\d+)?$` decimal-string regex,
    but not added to the `ShippingOptionSchema` tag union (orphaned).
  - `src/components/pages/ProfilePage.tsx` (+44/−...) — replaced the multi-location
    derivation from shipping options with a single `(profile as any)?.pickupMapLink`
    read from kind-0 metadata.
  - `src/components/dialogs/PickupLocationDialog.tsx` (+87/−82) — removed the Nominatim
    `fetch`; added `parseCoordsFromLink()` (pure regex, four URL families) and an
    "Open Map" anchor with `href={location.mapLink}` (no scheme sanitization — gap
    closed by the untrusted-content proposal's Decision 3).
  - `src/routes/_dashboard-layout/dashboard/account/profile.tsx` (+30) — added an
    optional "BTC Map" Map Link form field writing `pickupMapLink` into profile
    metadata via `as any`.
- Salvage disposition: adopt the `pickup-lat` / `pickup-lon` schemas (wired into the
  union this time) and the `parseCoordsFromLink` save-time approach (~60% of the PR);
  reject the single kind-0 `pickupMapLink` storage and the unsanitized `href`
  (governed by the cited Decision 3).

### Backlog provenance

- `docs/adr/ADR-BACKLOG-HANDOVER.md` § Pending Salvage Drafts, entry 3 — "Pickup
  location storage + no runtime geocoding", sourced from PR #684, commit `4424b8ac`.

## AGENTS.md constraint alignment

- _Prefer pubkeys, event IDs, coordinates, and tags over display text._ Decision 1
  stores coordinates as tags; Decision 2 stops deriving coordinates from address
  display text at render.
- _Treat relay data as untrusted until validated._ `pickup-lat` / `pickup-lon` are
  schema-validated at ingestion (zod); residual map links are governed by the cited
  Decision 3.
- _No new ... network egress paths without code, tests, and documentation that make
  the decision explicit._ This proposal removes an undocumented egress path
  (Nominatim) and adds none — save-time parsing is pure client-side, and map rendering
  uses the already-shipped maplibre stack. This record is the documentation.
- _ADR-0005 test isolation._ Removing the Nominatim call makes the dialog testable
  without mocking an external geocoder, consistent with ADR-0005.

## Does not decide

- **Vendor-specific parsing regexes** for map URLs — implementation detail; PR #684's
  four URL families are a starting point, not the decision.
- **Dialog UI rewrite** — the dialog's map rendering, popups, and "Open Map" anchor are
  display concerns unchanged by the storage decision.
- **Map tile / stylesheet sources** — a display-layer concern; this proposal governs
  location-to-coordinate resolution (geocoding), not tile fetching.
- **Relay I/O for reads/writes** — locked by ADR-0002 Wave 0: new relay I/O routes
  through `src/lib/nostr/io.ts`. This proposal cites that rule and does not re-decide it.
- **New event kinds** — none proposed; `pickup-lat` / `pickup-lon` are new optional tags
  on the existing kind 30406.

## References

- PR #684: https://github.com/PlebeianApp/market/pull/684
- Untrusted-content proposal: `proposals/untrusted-content-rendering-and-markdown-descriptions.md`
- ADR-0002: `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md`
- ADR-0005: `docs/adr/ADR-0005-no-external-service-dependencies-in-tests.md`
- Salvage backlog: `docs/adr/ADR-BACKLOG-HANDOVER.md` § Pending Salvage Drafts
- Proposals index: `proposals/INDEX.md`
