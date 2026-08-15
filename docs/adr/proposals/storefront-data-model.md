# ADR Proposal: Storefront data model (NIP-99 30402 reframed)

**Status:** Proposed — draft
**Number:** ADR-xxx (assigned at upstream merge — claim nothing here)
**Date:** 2026-08-16
**Scope:** Storefront/stall data model representation and product→storefront linkage
on the existing kind 30402 (NIP-99) product format. Docs-only decision record;
no code change in this proposal.
**References:**

- Prior art PR #694 (closed), commit `06063c0bc76f3b1722fc2d5b3323b3e7b41fee7e` —
  NIP-15 shop profiles
- Upstream issue #435 (open) — "Allow shops to have separate profile details from
  nPub (NIP-15 Stalls concept)"
- ADR-0002 (relay I/O seam), ADR-0005 (test isolation)
- NIP-99: https://github.com/nostr-protocol/nips/blob/master/99.md
- NIP-15: https://github.com/nostr-protocol/nips/blob/master/15.md

---

## Context

Plebeian Market uses NIP-99 kind 30402 (classified listings) as its product
format on `master`. Verified in `src/publish/products.tsx:43` —
`event.kind = 30402`. The product's `.content` is a markdown description string
(line 44: `event.content = formData.description`), and structured data lives in
tags: `d`, `title`, `price`, `type`, `visibility`, `stock`, `summary`, `image`,
`t`, `spec`, `shipping_option`, `weight`, `dim`, `collection`,
`content-warning` (lines 86–103).

NIP-15 (kinds 30017 stall / 30018 product) survives on `master` only as a
read-only migration source. `src/queries/migration.tsx` fetches kind 30018
events (line 106: `kinds: [30018]`) and checks already-migrated 30402 events
for a `migrated` tag (line 142: `kinds: [30402]`). No code on `master` publishes
or reads kind 30017 stall events. NIP-15 is not the current product format.

There is no storefront/stall representation in the NIP-99 world today. Products
have no tag linking them to a storefront or stall. A merchant's shop-level
metadata (name, banner, description, currency, location) comes only from kind 0
user metadata — coupling shop identity to personal identity. Upstream issue #435
(open) requests separate shop profile details from the merchant's npub.

PR #694 by Harshdev098 attempted to add shop profiles using NIP-15 kind 30017
stall events on top of the NIP-99 product format. The PR was closed unmerged.
The approach had a fundamental mismatch: it read `stall_id` from product content
via `JSON.parse(product.content)` (`getProductStallId` in `shopProfile.tsx:86`),
but on `master` the 30402 content is a plain description string, not JSON — so
`groupProductsByStall()` in `shopProfile.tsx:99` returns all products as
ungrouped for every merchant. The salvageable parts are `mergeShopWithProfile`
(the merge-precedence helper) and the UI pattern of stall-scoped display fields.

The NIP-99 spec defines only kind 30402 (product listing) and 30403 (draft). It
does not define stalls or storefronts. The Gamma Market e-commerce extension
(external spec, not repo authority) also lacks a stall concept. The gap is ours
to fill.

## Decision

### Decision 1: New addressable storefront kind (not NIP-15 30017)

A new addressable event kind is proposed for storefront metadata. It is
addressable (NIP-33 `d`-tag coordinate, like 30402), tags-based (no JSON
content), and authored by the merchant's pubkey. The specific kind number is
not claimed in this proposal — it is assigned when the NIP proposal or upstream
merge lands. The kind carries: `d` (storefront identifier), `name`, `about`,
`banner`, `picture`, `location`, `currency`, and `shipping_option` (default
shipping references). Content is a markdown storefront description.

Three options were evaluated:

1. **New addressable storefront kind (recommended).** Clean separation of shop
   identity from personal identity (directly satisfies issue #435). Tags-based
   and addressable, consistent with NIP-99's design philosophy. Does not
   conflict with NIP-15 migration code. AGENTS.md requires that new event kinds
   come with "code, tests, and documentation that make the decision explicit" —
   this ADR is that documentation; implementation follows as a focused PR.
2. **30402 `h`-tag hierarchy (rejected).** An `h` tag on products could create
   a grouping hierarchy without a separate event. But it provides no home for
   storefront metadata (name, banner, currency, default shipping). A hierarchy
   tag answers "which group does this product belong to" but not "what is this
   shop called" or "what currency does this shop use."
3. **Kind 0 tags (rejected).** Putting storefront fields as tags on the kind 0
   metadata event couples shop identity to personal identity — the exact problem
   issue #435 asks to solve. A merchant may operate multiple shops, or may want
   a shop name different from their personal display name. Kind 0 is
   one-per-pubkey; storefronts are potentially one-per-shop.

**NIP-15 kind 30017 is rejected as the target.** Master is NIP-99 30402; NIP-15
survives only as a read-only migration source. Introducing 30017 as a live
write target would create a hybrid system — two content models (JSON vs tags),
two addressability semantics (replaceable vs addressable), and confusion about
which NIP governs the marketplace.

### Decision 2: Product→storefront linkage via `a` tag on 30402

Products link to their storefront via an `a` tag containing the storefront
event coordinate: `["a", "<storefront-kind>:<pubkey>:<d-tag>"]`. This is
consistent with the existing `a`-tag pattern already used on 30402 for
collection membership (`products.tsx:216`, `queries/products.tsx:413–414`) and
for product variation parent references (see
`product-format-stock-shipping-orthogonal-dimensions.md`).

`stall_id` in content (the PR #694 approach) is rejected because:

- Master's 30402 content is a markdown description string, not JSON. The PR's
  `getProductStallId` does `JSON.parse(product.content)` which throws or returns
  null for every product on `master` — `groupProductsByStall()` is
  non-functional.
- AGENTS.md prefers "pubkeys, event IDs, coordinates, and tags over display
  text." An `a`-tag coordinate is a structured reference; a content JSON field
  is display-adjacent.
- The `a` tag is already established in the codebase for addressable event
  references on 30402. Reusing it avoids a new linkage mechanism.

### Decision 3: Storefront fields override kind 0 for shop-scoped display

When rendering shop-scoped surfaces (merchant profile page, storefront header,
product listings grouped by shop), storefront event fields take precedence over
kind 0 metadata. If a storefront field is absent, the kind 0 value is used as
fallback. This is the `mergeShopWithProfile` pattern from PR #694's
`shopProfile.tsx:196` — shop value takes precedence, falls back to profile
value. The PR applied this to `name`, `about`, `banner`, `picture`, and
`location` (ProfilePage.tsx lines 70–74 on pr-694). This merge semantics is
salvageable as-is; only the event kind and linkage mechanism change.

Kind 0 remains the source of truth for personal identity surfaces (user's own
profile, direct messages, nostr-wide identity). Storefront overrides apply only
to shop-scoped display contexts.

### Decision 4: One-storefront-per-product (not many-to-many)

Each product links to exactly one storefront via a single `a` tag. This matches
NIP-15's one-stall-per-product model (each 30018 product had one `stall_id`),
simplifies queries (one `a`-tag filter retrieves the storefront), and avoids
ambiguity in currency and shipping resolution.

Many-to-many (a product appearing in multiple storefronts) adds query
complexity and semantic ambiguity (which storefront's currency applies?) with
no clear benefit for the current marketplace model. If cross-storefront product
sharing becomes needed, it can be revisited via an ADR update — the `a`-tag
mechanism supports multiple `a` tags if that decision is made later.

### Decision 5: Shipping stays in existing `shipping_option` tags on 30402

Product-level shipping options stay in the existing `shipping_option` tags on
kind 30402 (`products.tsx:65–71`). The NIP-15 approach of embedding shipping
zones in the stall event's JSON content (30017) is rejected as a duplicate
shipping surface — it creates two sources of truth for shipping, and the
product-level tags are already wired into the publish and query layers.

The storefront event may carry default `shipping_option` references as a
convenience (apply-to-all-products defaults), but product-level shipping
options always take precedence. A product with its own `shipping_option` tags
is not overridden by storefront defaults.

## Consequences

Positive:

- Shop identity is separable from personal identity (issue #435 resolved at the
  data model level).
- Product→storefront linkage works on `master`'s actual 30402 format
  (tag-based, not JSON content).
- `groupProductsByStall()` becomes functional — products can be grouped by
  their storefront `a`-tag coordinate, the same pattern already used for
  collection grouping.
- `mergeShopWithProfile` is salvageable from PR #694 with only the event kind
  and linkage mechanism changed.
- No NIP-15/NIP-99 hybrid: the marketplace is consistently NIP-99-tag-based.

Tradeoffs:

- A new event kind requires NIP-level justification or application-specific
  documentation. AGENTS.md requires "code, tests, and documentation that make
  the decision explicit" — this ADR is the documentation; implementation
  follows.
- Merchants who already have NIP-15 30017 stall events on relays will not be
  read by the new system. Migration from 30017 is a separate concern extending
  the existing `migration.tsx` path.
- One-storefront-per-product limits cross-storefront product sharing. Accepted
  for simplicity; revisitable via ADR update.
- Storefront default shipping is a secondary surface to product shipping. UI
  must make clear which shipping options apply per product.

## Prior art

Authorship credit is mandatory for any re-implementation.

### PR #694 — NIP-15 shop profiles (closed)

- https://github.com/PlebeianApp/market/pull/694
- Commit `06063c0bc76f3b1722fc2d5b3323b3e7b41fee7e`. **Author: Harshdev098.**
- Diff against `fork/master` (verified): 3 files changed, +786/-216.
  - `src/queries/shopProfile.tsx` (+204, NEW) — stall event kind 30017, parse,
    fetch, publish, `groupProductsByStall`, `mergeShopWithProfile`. Spec-correct
    for NIP-15 but mismatched against master's NIP-99 product format.
  - `src/routes/dashboard/account/profile.tsx` (+474/-183) — shop editor UI.
    Heavily rewritten since on `master`; stale, not directly salvageable.
  - `src/components/pages/ProfilePage.tsx` (+108/-33) — stall-scoped display
    using `mergeShopWithProfile` and `groupProductsByStall`. The merge pattern
    is salvageable; the stall event kind and linkage are not.
- Salvage estimate: ~30%. The salvageable parts are `mergeShopWithProfile`
  (Decision 3), the concept of stall-scoped display fields, and the
  `groupProductsByStall` grouping pattern (rewired to `a`-tag coordinates per
  Decision 2). The 30017 event kind, JSON content parsing, and `stall_id` in
  content are not salvageable.

### Upstream issue #435 — separate shop identity (open)

- https://github.com/PlebeianApp/market/issues/435
- Title: "Allow shops to have separate profile details from nPub (NIP-15 Stalls
  concept)."
- Still open. This proposal reframes the issue's "NIP-15 Stalls concept" away
  from NIP-15 (migration-only on master) and onto the NIP-99 tag-based model.
  The underlying need — separate shop profile details — is addressed by
  Decision 1 (new addressable storefront kind) and Decision 3 (storefront
  overrides kind 0 for shop-scoped display).

## AGENTS.md constraint alignment

- _No new event kinds without code, tests, and documentation that make the
  decision explicit._ Decision 1 proposes a new kind. This ADR is the
  documentation; implementation must bring code and tests. The kind is not
  published until the implementation PR lands with validation, tests, and a
  schema.
- _Treat relay data as untrusted until validated. Prefer pubkeys, event IDs,
  coordinates, and tags over display text._ Decision 2 uses an `a`-tag
  coordinate (structured reference) instead of `stall_id` in content
  (display-adjacent). Storefront events from relays must be schema-validated
  before use, same as product events.
- _New relay I/O should route through `src/lib/nostr/io.ts`._ Any implementation
  that fetches or publishes storefront events must route through the io.ts seam
  per ADR-0002 Wave 0. This proposal cites that rule; it does not re-decide it.
- _Event kind justification._ Decision 1 records why a new kind is needed (no
  storefront representation in NIP-99; NIP-15 30017 rejected as migration-only;
  kind 0 rejected as coupling shop to personal identity).

## Does not decide

- **Implementation PR split and UI specifics.** The editor form, query wiring,
  and component layout are implementation concerns for focused PRs, not this
  ADR.
- **The specific kind number.** No number is claimed. It is assigned when a NIP
  proposal or upstream merge lands.
- **Relay routing for reads/writes.** Locked by ADR-0002 Wave 0: new relay I/O
  routes through `src/lib/nostr/io.ts`. This ADR cites that rule and does not
  re-decide it.
- **Migration from existing NIP-15 30017 stall events.** If merchants have
  published 30017 events on relays, migrating them to the new kind is a
  separate concern that extends the existing `migration.tsx` path. Not decided
  here.
- **Storefront default shipping application logic.** Decision 5 states the
  precedence rule (product > storefront) but the UI for applying defaults is an
  implementation concern.

## References

- PR #694: https://github.com/PlebeianApp/market/pull/694
- Issue #435: https://github.com/PlebeianApp/market/issues/435
- NIP-99: https://github.com/nostr-protocol/nips/blob/master/99.md
- NIP-15: https://github.com/nostr-protocol/nips/blob/master/15.md
- ADR-0002: `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md`
- ADR-0005: `docs/adr/ADR-0005-no-external-service-dependencies-in-tests.md`
- Related proposal: `docs/adr/proposals/product-format-stock-shipping-orthogonal-dimensions.md`
