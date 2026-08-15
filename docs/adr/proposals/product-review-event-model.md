# ADR Proposal: Product review event model (kind 31555)

**Status:** Proposed — draft for maintainer and prior-art author review
**Number:** ADR-xxx (assigned at upstream merge; this draft claims no number — the PR #462 salvage never carried a fork number)
**Date:** 2026-08-16
**Scope:** Wire format, validation, and display-aggregation policy for kind 31555 product-review events, plus the review-authorization question framed as the gating open decision. Ratifies the in-tree zod schema; no code change in this proposal.
**References:**

- Prior art PR #462 (closed 2026-08-14), branch `feat/product-reviews` @ `ab64dd48e0`
- External compatibility spec: `gamma_spec.md` §5 — external to this repo, cited per the labeling rule in `docs/AGENTS.md`
- ADR-0002 (relay I/O seam), ADR-013 / ADR-014 (NIP-17 order transport)
- Ratified schema: `src/lib/schemas/productReview.ts`

---

## Context

The marketplace has no product-review capability on `master`. What it does have is an orphan
schema: `src/lib/schemas/productReview.ts` defines a complete zod validation for kind 31555
events, but nothing consumes it. Verified on this branch: `grep -rln ProductReview src/ scripts/`
returns exactly two files — the schema itself and `scripts/gen_review.ts`, which imports the type
only to generate fake review events. The schema is documentation-as-code waiting for a decision
to back it.

PR #462 by Ben Weeks (BenGWeeks) implemented the full feature — publish, query, aggregate, and
UI — and was closed unmerged on 2026-08-14. The branch `feat/product-reviews` @ `ab64dd48e0`
diffs +669/-43 across 8 files (publish/queries layers, three new components, query key factory,
product route wiring). Per `docs/adr/ADR-BACKLOG-HANDOVER.md` § Pending Salvage Drafts entry 1,
the salvage is ≈95% reusable, but review authorization "must be decided before implementation".

The wire format itself was not invented in this repo or in that PR: it comes from the Gamma
marketplace spec (`gamma_spec.md` §5, "Product Reviews (Kind: 31555)", which traces to NIP-85
and QTS rating guidelines). Per `docs/AGENTS.md`, external specs are never proof of repo
behavior — they are cited here only as external compatibility context. The repo-side artifact
this proposal ratifies is the in-tree zod schema, which predates this ADR and matches that
external format.

## Decision

### Decision 1: Ratify the kind 31555 wire format as defined by the in-tree schema

The event model is locked as `src/lib/schemas/productReview.ts` specifies it today. This ADR
ratifies that schema; it does not redefine or extend it:

- `kind` MUST be `31555`; `created_at` a positive integer; `content` free text.
- `d` tag (required): the reviewed product's addressable coordinate,
  `a:30402:<merchant-pubkey>:<product-d-tag>` — 64 lowercase hex chars for the merchant
  pubkey, identifier over `[a-zA-Z0-9_-]+` (schema regex, `productReview.ts:9`).
- `rating` tag (required, primary): `["rating", "<score>", "thumb"]` — the literal category
  `thumb` marks the primary up/down verdict.
- `rating` tags (optional, categories): `["rating", "<score>", "<category>"]`, one per category.
- All scores are normalized decimals 0–1 inclusive, matching `^[01](\.\d+)?$` — `0`, `0.8`,
  `1.0` are valid; `2`, `-1`, `.5`, `1e0` are not. No 1–5 star integers on the wire.
- Category labels are free-form strings. The external spec names a standard set (value,
  quality, delivery, communication) but explicitly allows custom categories, and the in-tree
  generator already emits others (`scripts/gen_review.ts:24` uses quality, value, shipping,
  customer_service, appearance). Clients MUST NOT assume the standard four are exhaustive.
- Tag-shape validation is the schema's tuple union plus its refinement requiring both the `d`
  tag and the `thumb` primary rating to be present.

Compatibility note (external context, not repo proof): this shape matches `gamma_spec.md` §5,
so conforming events interoperate with Gamma-lineage clients.

### Decision 2: Aggregate display score formula

Per-review display score:

```
overall = (thumb × 0.5) + (0.5 × categoryAvg)
categoryAvg = mean of the review's category scores, falling back to thumb when the review
carries no category ratings (so overall = thumb)
```

The formula and 50/50 weighting are external compatibility context from `gamma_spec.md` §5
"Rating Calculation"; the repo-side evidence is that the PR #462 aggregate helper
(`calculateAggregateRatings` in its `src/queries/reviews.tsx`) implements exactly this,
including the thumb fallback, and averages per-review scores for product-level display. The
fallback keeps reviews without categories scoring sanely instead of dividing by zero.

### Decision 3: All relay-sourced 31555 events flow through ProductReviewSchema

Kind 31555 events from relays are untrusted input (AGENTS.md: relay data is untrusted until
validated). They MUST pass `ProductReviewSchema` before becoming application state; events that
fail validation are dropped, not repaired.

Defect flag against prior art: PR #462's `transformReviewEvent` hand-parsed tags
(`event.tags.find(...)`, `parseFloat`) instead of using the schema, and silently defaulted a
missing/invalid thumb score to `0` — a malformed event would render as a real 0% review rather
than being rejected. Re-implementations must not reproduce this; the schema is the single
parse-and-reject point.

### Decision 4: Review authorization — OPEN DECISION, required before implementation

Who may publish a review is the gating question. It is framed here, not resolved; per the
backlog handover, implementation must not start until maintainers resolve it.

- **Option A — open reviews** (PR #462's approach): any signed pubkey can review any product.
  Zero friction, zero purchase required, matches the external spec (which specifies no auth).
  Sybil risk is structural: keypairs are free, so aggregate scores are trivially manipulable
  by merchants (self-praise) and competitors (attack).
- **Option B — verified-buyer via NIP-17 order proof**: a review publishes (or counts toward
  aggregates) only with proof of a completed order relationship with that merchant. The
  transport mechanism exists on paper: ADR-013 defines the NIP-17 order-message boundary and
  ADR-014 its migration/cutover (foundation PRs #1095, #1096, #1098, #1099). Sybil cost rises
  to a real transaction; residual risk remains (merchant self-dealing: buying one's own
  product to earn review rights).

**Recommendation:** Option B for anything that feeds aggregate scores or merchant reputation.
Option A is acceptable only as explicitly labeled "unverified" display that is excluded from
all aggregates, and only if maintainers accept that labeling burden knowingly.

The Decision 1 wire format works under either option: a future buyer-proof tag can be added as
an OPTIONAL tag without breaking the required set, so ratifying the format now does not
pre-empt the auth decision.

### Decision 5: Spam/sybil posture must be explicit

The prior art ships no spam or sybil mitigations at all — that gap is flagged, not inherited.
Whichever auth option is chosen, the implementation must state its posture:

- Under Option A: accepted-risk statement in writing, or mitigations (see below).
- Under Option B: purchase-gated publishing, with self-dealing and key-compromise risks
  documented.

One mitigation comes free from protocol semantics: kind 31555 sits in the NIP-01 addressable
band (30000–39999) and the `d` tag carries the product coordinate, so a given reviewer's second
review of the same product shares the `(kind, pubkey, d)` address and replaces the first —
natural one-review-per-reviewer-per-product edit semantics, no extra machinery. (Protocol
consequence; verify the publish path relies on it at implementation time.) UI-side rate
limiting is cosmetic; relay-side admission/moderation policy is out of scope for a client ADR.

## Consequences

Positive:

- The wire format is locked and matches the external Gamma spec, so conforming review events
  interoperate across Gamma-lineage clients instead of forking a private format.
- The orphan schema gains a decision backing it; today it is unconsumed dead code (verified).
- One parse-and-reject validation point (Decision 3) closes the hand-parse drift defect class
  before it ships.
- One-review-per-reviewer edit semantics fall out of NIP-01 addressability.

Tradeoffs:

- Kind 31555 is not a ratified NIP kind; it is an ecosystem-specific adoption from the external
  spec. Other clients may never implement it — accepted with eyes open.
- Normalized 0–1 scores require a display mapping (stars, thumbs, percentages). UI mapping is
  not decided here.
- The schema's strict tag-tuple union rejects unknown tags: a conforming-elsewhere review
  carrying a foreign tag (e.g., a future `nonce` or buyer-proof tag) would fail validation and
  be dropped until the union is extended. Extending the union for forward compatibility is an
  implementation-time question to settle with tests.
- If Option B is chosen, reviews depend on ADR-013/014 landing first — a sequencing cost that
  Option A avoids.

## Prior art

Authorship credit is mandatory for any re-implementation.

### PR #462 — product reviews via kind 31555 (closed)

- https://github.com/PlebeianApp/market/pull/462
- Branch `feat/product-reviews` on PlebeianApp/market. Commits: `5934d95e` (feature:
  publish/query/UI) → `43ecf105` (prettier) → `6b623316` (Copilot feedback) → `ab64dd48e0`
  (head, further review fixes). **Author: Ben Weeks (BenGWeeks).** Closed unmerged 2026-08-14.
  Per the handover ground rules, check with BenGWeeks whether he prefers re-opening his branch
  before any re-implementation lands.
- Verified against `ab64dd48e0` (`git diff --stat` vs `master`: +669/−43, 8 files):
  - `src/publish/reviews.tsx` (new) — builds the 31555 event, enforces 0–1 bounds, formats the
    `d` coordinate and rating tags per Decision 1.
  - `src/queries/reviews.tsx` (new) — `transformReviewEvent` hand-parses tags (Decision 3
    defect); `calculateAggregateRatings` implements the Decision 2 formula with thumb fallback.
  - `src/components/ProductReviews.tsx`, `StarRating.tsx`, `LeaveReviewDialog.tsx` (new) —
    display and submission UI; `src/queries/queryKeyFactory.ts` gains `reviewKeys`;
    `src/routes/products.$productId.tsx` wires the product page.
  - Gaps this proposal flags rather than inherits: no schema validation of relay data, no
    review-auth gate, no spam/sybil posture, direct NDK publish (relay routing is governed by
    ADR-0002 Wave 0 at implementation time, not by that PR's shape).

## AGENTS.md constraint alignment

- _No new event kinds … without code, tests, and documentation that make the decision
  explicit._ Kind 31555 adoption is exactly such a new event kind; this proposal is the
  documentation half of that rule. The code-and-tests half follows only after Decision 4 is
  resolved.
- _Treat relay data as untrusted until validated._ Decision 3 is the enforcement for this kind:
  schema-or-drop, never hand-parse-and-default.
- _Do not use external specs as proof of repo behavior_ (`docs/AGENTS.md`). `gamma_spec.md` is
  cited throughout only as external compatibility context; the repo proof is the in-tree schema
  and the verified PR diff.
- _New relay I/O routes through `src/lib/nostr/io.ts`_ (AGENTS Wave 0 / ADR-0002). Cited, not
  re-decided — see below.

## Does not decide

- **Relay I/O routing** — locked by ADR-0002 Wave 0 (new relay I/O via `src/lib/nostr/io.ts`).
  This proposal cites that rule and does not re-decide it; the prior art's direct NDK publish
  path is an implementation detail to be rebuilt on the seam.
- **The Decision 4 resolution itself** — maintainer input is the point; implementation is gated
  on it.
- **UI specifics** — star/thumb rendering of 0–1 scores, dialog flows, product-page placement.
- **Merchant-level aggregation** — whether reviews roll up beyond a single product coordinate.
- **Relay admission/moderation policy** — relay-side, outside a client ADR's reach.
- **Query-layer caching/storage** of review events.

## References

- PR #462: https://github.com/PlebeianApp/market/pull/462
- `gamma_spec.md` §5 (external compatibility spec, in-repo copy)
- `src/lib/schemas/productReview.ts` (ratified schema)
- `scripts/gen_review.ts` (existing fake-review generator)
- ADR-0002: `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md`
- ADR-013: `docs/adr/ADR-013-nip17-order-message-transport.md`
- ADR-014: `docs/adr/ADR-014-nip17-order-transport-migration.md`
- Salvage entry: `docs/adr/ADR-BACKLOG-HANDOVER.md` § Pending Salvage Drafts, item 1
- NIP-01 (addressable/parameterized-replaceable events): https://github.com/nostr-protocol/nips/blob/master/01.md
- NIP-17 (private direct messages): https://github.com/nostr-protocol/nips/blob/master/17.md
