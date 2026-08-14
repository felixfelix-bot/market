# ADR Proposal: Untrusted content rendering & markdown description format

**Status:** Proposed — draft for maintainer and prior-art author review (proposed number ADR-0017)
**Date:** 2026-08-14
**Scope:** Rendering policy for relay-sourced (untrusted) text in the client, and adoption of markdown as the description wire format. Docs-only decision record; no code change in this PR.
**References:**

- Prior art PR #475 (closed), branch `feat/markdown-descriptions` @ `aac45ffada09` — markdown descriptions
- Prior art PR #684 (closed), commit `4424b8acd354d716bdc01a36213b5f8669d9ea3c` — BTC Map link / vendor URL parsing
- ADR-0002 (relay I/O seam), ADR-0005 (test isolation)

---

## Context

Product descriptions and collection summaries come from relays and are authored
by arbitrary market participants. AGENTS.md requires that relay data be treated
as untrusted until validated, preferring pubkeys, event IDs, coordinates, and
tags over display text. Whatever rendering policy we adopt, the display text
itself remains attacker-controlled input.

Today `master` has no markdown support at all (no `react-markdown`, `remark-*`,
or `rehype-*` in `package.json` — verified on `upstream/master` @ `95bf1fc5`)
and renders relay text as plain text:

- Product description: `src/routes/products.$productId.tsx:160` —
  `<p className="text-gray-700 break-words whitespace-pre-wrap">{description}</p>`
  inside `getTabContent` (defined at `src/routes/products.$productId.tsx:145`).
- Collection summary: `src/routes/collection.$collectionId.tsx:215` — the
  `{summary}` value from `getCollectionSummary`
  (`src/queries/collections.tsx:256`) rendered as a text node.

There is no `dangerouslySetInnerHTML` anywhere in `src/` on `master`, and no
raw-HTML rendering path exists today. We intend to keep it that way.

Merchants want richer descriptions (headings, lists, links, emphasis). PR #475
by Ben Weeks (BenGWeeks) implemented exactly that with `react-markdown` and was
closed unmerged; we have asked the author about re-opening it on tip of
`master`. Independent of descriptions, other relay-sourced strings already
flow into link-shaped UI: vendor pickup-location map links (BTC Map /
OpenStreetMap / Google Maps URLs from profile data) are parsed and rendered by
`PickupLocationDialog`. When any untrusted string becomes an `href`, the URL
scheme is an XSS surface (`javascript:` URIs), so the rendering policy must
cover direct external links, not only markdown bodies.

Related current-behavior context (not decided here): `master` still performs
runtime geocoding against `nominatim.openstreetmap.org` at render time
(`src/components/dialogs/PickupLocationDialog.tsx:60`, inside the
`geocodeAllLocations` effect at lines 49-101), using vendor-supplied map-link
text as the query. Storage of pickup coordinates and elimination of runtime
geocoding is deferred to a separate future proposal (see _Does not decide_).

## Decision

### Decision 1: Markdown is the description wire format

Markdown becomes _the_ format for product descriptions and collection summary
text on existing event shapes (kind 30402 product descriptions; collection
summary). It is a content-format change only — no new event kinds, no tag
changes.

Interop tradeoff, stated explicitly: clients that do not render markdown will
display the raw markdown source (e.g., `**bold**` appears literally). We accept
this. Plain text remains valid markdown, so existing legacy descriptions keep
rendering sensibly (see Consequences for edge cases).

### Decision 2: All untrusted Nostr content renders via react-markdown defaults only

Every relay-sourced text surface (product descriptions, collection summaries,
and any future relay text adopted for markdown rendering) must render through
`react-markdown` configured as follows:

- Defaults only: no `rehype-raw`, no `dangerouslySetInnerHTML`, no raw HTML
  passthrough anywhere. Embedded HTML in markdown is displayed as literal text,
  never interpreted.
- The default `urlTransform` must not be replaced with a weaker transform. In
  `react-markdown@10.1.0` the published source applies
  `urlTransform = options.urlTransform || defaultUrlTransform`
  (`lib/index.js:320`), and `defaultUrlTransform`
  (`lib/index.js:421-438`) only permits protocols matching
  `safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i` (`lib/index.js:124`) —
  `javascript:` URIs are rejected before any component sees the `href`.
  Custom component overrides receive the already-sanitized `href`, so
  styling-only overrides do not weaken this.
- Link component overrides must preserve external-link hardening
  (`target="_blank"` with `rel="noopener noreferrer"`), matching the prior-art
  renderer.

### Decision 3: External URLs are scheme-allowlisted before use as href

Any untrusted URL that the client places into an `href` (BTC Map /
OpenStreetMap / Google Maps links, markdown link/image URLs, future surfaces)
must pass an explicit scheme allowlist of `http:` / `https:` before use.
Non-allowlisted schemes (`javascript:`, `data:`, etc.) are dropped or
neutralized. This complements Decision 2: react-markdown's default transform
covers markdown-derived URLs, and this rule covers URLs that reach the DOM
directly from relay data, such as vendor map links.

### Decision 4: remark-breaks for single-line-break semantics

The renderer enables the `remark-breaks` plugin so single newlines render as
line breaks. This preserves the line-break expectations merchants already have
from the current `whitespace-pre-wrap` plain-text rendering.

### Scope (accepted, not an open question)

Markdown rendering applies to exactly two surfaces, matching the prior-art
wiring:

1. Product page description (`src/routes/products.$productId.tsx`).
2. Collection hero summary (`src/routes/collection.$collectionId.tsx`).

Product cards (`src/components/ProductCard.tsx` — which renders no description
today, verified) and OG/social meta tags (no OG description generation exists
in the client today, verified) stay plain text. Extending markdown to other
surfaces (e.g., chat, reviews, storefront text, if/when those land) is future
work and must come back through a proposal or ADR update — Decisions 2 and 3
already bind whatever is adopted.

## Consequences

Positive:

- One rendering rule for all untrusted relay text; no per-surface
  sanitization debate. Any future markdown surface inherits the safe defaults
  by construction.
- XSS surface stays minimal: raw HTML is never interpreted, and `javascript:`
  URIs are blocked twice over (react-markdown's `defaultUrlTransform` for
  markdown bodies, the scheme allowlist for direct `href` use).
- Merchants get rich descriptions; the implementation is ~95% salvageable from
  prior art (see _Prior art_).
- `remark-breaks` keeps existing plain-text descriptions rendering with the
  same visual line breaks they have today.
- Master's no-`dangerouslySetInnerHTML` invariant becomes an explicit,
  enforceable policy instead of an accident.

Tradeoffs:

- **Interop (explicitly accepted):** old clients without markdown support
  render raw markdown source. Descriptions authored after this decision are
  optimally readable only in markdown-aware clients.
- **Legacy content edge cases:** existing plain-text descriptions containing
  incidental markdown syntax (a line beginning with `#` or `-`, `*` used as a
  bullet, etc.) may render with unintended formatting once markdown is enabled.
  This is bounded (descriptions were plain prose) and was accepted with the
  format decision.
- Safe-by-default rendering means embedded HTML shows as literal source text
  rather than rendering — intentional, not a bug.
- Two new runtime dependencies (`react-markdown`, `remark-breaks`) and their
  transitive remark/rehype packages.

## Prior art

Authorship credit is mandatory for any re-implementation.

### PR #475 — markdown descriptions (closed)

- https://github.com/PlebeianApp/market/pull/475
- Branch `feat/markdown-descriptions` on PlebeianApp/market. Commits:
  `aac45ffada09` (rendering + editor) → `85683d18ca61` (editor min-height) →
  `d366e6b468ab` (remark-breaks).
- **Author: Ben Weeks (BenGWeeks).** We have asked BenGWeeks about re-opening
  the PR on tip of `master`; if the author re-opens, the
  implementation should support his branch rather than replace it.
- Verified against `aac45ffada09`:
  - `src/components/ui/markdown-renderer.tsx:15-67` — `ReactMarkdown` with
    styling-only `components` overrides (headings, lists, emphasis, code,
    blockquotes, rules). No `rehype-raw`, no `dangerouslySetInnerHTML`, no raw
    HTML passthrough. Safe by default.
  - `src/components/ui/markdown-renderer.tsx:34-38` — custom link component
    with `target="_blank"` and `rel="noopener noreferrer"`.
  - `src/components/ui/markdown-editor.tsx` (new, 191 lines) — Write/Preview
    editor with a formatting toolbar.
  - `package.json:88` — `react-markdown ^10.1.0`.
  - Surfaces wired: product page description and collection hero summary only
    (the scope this ADR ratifies).
- Verified against branch tip `d366e6b468ab`:
  - `package.json:88-90` — adds `remark-breaks ^4.0.0`.
  - `src/components/ui/markdown-renderer.tsx` — adds
    `remarkPlugins={[remarkBreaks]}` (Decision 4).

### PR #684 — BTC Map link on profile (closed)

- https://github.com/PlebeianApp/market/pull/684
- Commit `4424b8acd354d716bdc01a36213b5f8669d9ea3c`. **Author: hkarani.**
- Verified: `src/components/dialogs/PickupLocationDialog.tsx:28-61` —
  `parseCoordsFromLink()` extracts lat/lon client-side from vendor map URLs
  with pure regexes: OpenStreetMap/BTC Map `#map=z/lat/lon` and `#z/lat/lon`
  hashes (line 30), two-segment `#lat/lon` hashes (line 38), Google Maps
  `@lat,lon` (line 46) and `?q=lat,lon` (line 53).
- Relevance here: vendor map URLs are untrusted relay data that the client
  turns into external links. That PR did not scheme-sanitize URLs before
  placing them in `href`s; Decision 3 closes that gap. The geocoding/storage
  aspects of that PR are out of scope for this ADR.

## AGENTS.md constraint alignment

- _Treat relay data as untrusted until validated._ Decisions 2 and 3 are the
  rendering-side enforcement of this constraint for display text.
- _No new event kinds, payment semantics, relay assumptions, or network
  egress paths._ Markdown is a content-format change on existing kinds and
  tags. Rendering markdown adds no network egress: links render as anchors;
  navigation is user-initiated. No new relay I/O is introduced by this
  decision.
- _ADR-0005 test isolation._ Markdown rendering tests (unit or e2e) must not
  contact external services: fixtures stay on the local relay and dev server,
  following the established mock patterns. Note that `master`'s runtime
  Nominatim call (`PickupLocationDialog.tsx:60`) is exactly the class of
  external dependency ADR-0005 prohibits in tests — cited as context; its
  removal is decided elsewhere.

## Does not decide

- **Relay routing for any implementation reads/writes** — locked by ADR-0002
  Wave 0: new relay I/O routes through `src/lib/nostr/io.ts`. This ADR cites
  that rule and does not re-decide it.
- **Pickup-location storage and runtime geocoding** (per-shipping-option
  coordinate tags vs. profile links, eliminating the runtime Nominatim call) —
  separate future proposal, informed by PR #684.
- **New event kinds** — none are proposed or implied.
- Editor UX specifics beyond the prior-art component (toolbar, preview tabs).
- Which future surfaces beyond the two in Scope adopt markdown.

## References

- PR #475: https://github.com/PlebeianApp/market/pull/475
- PR #684: https://github.com/PlebeianApp/market/pull/684
- ADR-0002: `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md`
- ADR-0005: `docs/adr/ADR-0005-no-external-service-dependencies-in-tests.md`
- react-markdown: https://github.com/remarkjs/react-markdown
- remark-breaks: https://github.com/remarkjs/remark-breaks
