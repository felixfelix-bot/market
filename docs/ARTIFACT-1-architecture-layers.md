# ARTIFACT 1 — Architecture Layering (for a backend / systems engineer)

> Goal: explain the **intended** layered architecture of `src/`, then show the
> **actual** import graph, and call out every place the real arrows point the
> wrong way.

---

## 1. What the official docs say (CLAUDE.md, §Architecture)

The stack is:

- **React 19 + TypeScript** — the UI runtime.
- **TanStack Router** — file-based routing; files in `src/routes/` become URL
  routes. Think of it like a lightweight Spring MVC `@Controller` per file,
  where the filename *is* the path.
- **TanStack Query** — "server state" caching. Lives in `src/queries/`.
- **TanStack Store** — "client state". Lives in `src/lib/stores/`.
- **NDK** (Nostr Development Kit) — the protocol library. Nostr relays are the
  "database"; there is no SQL server. Every read/write is a relay round-trip.
- **Radix UI + Tailwind** — presentational primitives.

CLAUDE.md names these "Key Directories": `src/routes/`, `src/components/`,
`src/lib/stores/`, `src/lib/schemas/`, `src/queries/`, `src/server/`.

---

## 2. Every top-level directory under `src/`, categorized into a layer

| Directory          | Layer                          | Role (backend analogy)                                                                 |
|--------------------|--------------------------------|----------------------------------------------------------------------------------------|
| `src/routes/`      | **Presentation — routing**     | HTTP controllers. Maps a URL → a component + optional data preloader.                  |
| `src/components/`  | **Presentation — views**       | JSX render components (UI widgets). `ui/` = Radix primitives (form inputs, dialogs).   |
| `src/feature/`     | **Presentation — feature mod** | Self-contained feature slices (e.g. `feature/wallet/`). Coarse-grained UI bundles.     |
| `src/hooks/`       | **Presentation — hooks**       | Reusable React hooks (cross-cutting UI utilities like `useBreakpoint`).                 |
| `src/assets/`      | **Presentation — static**      | Fonts, icons, images. No logic.                                                        |
| `src/config/`      | **Foundation — config**        | Static app configuration (relay defaults, feature flags).                              |
| `src/queries/`     | **Server-state access**        | React Query hooks + query-key factory. The "read-side repository / DAO".               |
| `src/publish/`     | **Server-state write**         | Functions that sign + publish Nostr events and invalidate query caches. "Write DAO".   |
| `src/server/`      | **Protocol / validation**      | Backend-grade logic that does NOT touch React: NDK event validation, HTTP helpers.     |
| `src/lib/`         | **Foundation / domain core**   | The umbrella for pure logic. Sub-packages below.                                       |
| `src/lib/stores/`  | **Client-state**               | TanStack Store instances + action objects (auth, cart, ndk, wallet, ui, product…).     |
| `src/lib/schemas/` | **Foundation — validation**    | Zod schemas (runtime validation, like JSON-Schema / pydantic).                         |
| `src/lib/utils/`   | **Foundation — helpers**       | Pure functions: formatting, math, shipping-tag parsing.                                |
| `src/lib/types/`   | **Foundation — types**         | Shared TypeScript types/interfaces.                                                    |
| `src/lib/nostr/`   | **Foundation — protocol**      | Nostr-specific helpers (NIP-53 live activities, etc.).                                 |
| `src/lib/checkout/`| **Domain — checkout**          | Checkout domain logic (delivery requirements).                                        |
| `src/lib/auction/`,`auctions/` | **Domain — auctions** | Auction settlement / curve math.                                                       |
| `src/lib/payments/`| **Domain — payments**          | Payment-splitting math.                                                                |
| `src/lib/wallet/`  | **Domain — wallet**            | Cashu / NWC / NIP-60 wallet helpers.                                                   |
| `src/lib/cashu/`   | **Domain — cashu**             | Cashu token encoding.                                                                  |

Collapsed into **5 conceptual layers** (top → bottom, may only import downward):

```
L4  Presentation   routes/  components/  feature/  hooks/  assets/
L3  Orchestration  publish/   (write side that calls queries + ndk)
L2  Data access    queries/   (read side: React Query cache + fetchers)
L1  Client state   lib/stores/  (TanStack Store: cart, auth, ndk, wallet…)
L0  Foundation     lib/ (utils, schemas, types, nostr, domain math),
                    server/, config/
```

---

## 3. TanStack Query vs TanStack Store — in plain terms

### Server state (TanStack Query, `src/queries/`)
This is data that **ultimately lives on Nostr relays** — product listings,
seller profiles, shipping options, exchange rates. The app is *not* the source
of truth; the relay is. TanStack Query is a **cache + fetch orchestrator** for
that remote data:

- You give it a **query key** (a tuple like `['products', id]`) and an async
  fetcher. It runs the fetcher, caches the result, and hands you
  `{ data, isLoading, error }`.
- It dedupes concurrent requests for the same key, retries on failure, and
  marks data **stale** after a TTL so a re-fetch happens in the background.
- `queryClient.fetchQuery(options)` is the imperative form — "give me the
  cached value or fetch it now". `cart.ts` uses this a lot via its own private
  `cartQueryClient`.

**Backend analogy:** TanStack Query ≈ a read-through cache layer (like Redis
in front of your DAO). The "query keys" are cache keys. `useQuery` is the
reactive subscription; `fetchQuery` is the blocking `getOrLoad`.

### Client state (TanStack Store, `src/lib/stores/`)
This is data the **browser owns** — the in-progress shopping cart, which dialog
is open, the logged-in user's signer handle, UI theme. The app *is* the source
of truth. `Store<T>` is a tiny observable container: `store.setState(...)`
mutates it, `useStore(store)` subscribes a component so it re-renders on change.

Each domain has one store file exporting **two things**:
1. `xxxStore` — the observable container (the "state").
2. `xxxActions` — a plain object of methods that read/write the store
   (the "reducers / commands"). Components call `cartActions.addItem(...)`,
   not `cartStore.setState(...)` directly.

**Backend analogy:** TanStack Store ≈ an in-memory service singleton (like a
Spring `@Service` bean holding session state). Actions are the service methods.

### How they relate
They are **two separate caches for two separate truth-domains**:

- Query = "what the relay says" (async, possibly stale, shared).
- Store  = "what the user is doing right now" (sync, local, ephemeral).

The friction in this codebase is that some stores (notably `cart.ts`) need to
*read* server data to do their job (resolve a product price, fetch shipping
options). That is where the layering gets bent — see §5.

---

## 4. INTENDED dependency diagram

Arrows mean "imports from". Intended rule: **arrows only point downward**.

```
                ┌─────────────────────────────────────┐
   L4           │  routes/   components/   feature/   │   Presentation
                │  hooks/    assets/                  │
                └───────────┬─────────────────────────┘
                            │ (read state, call actions,
                            │  trigger queries/publish)
                ┌───────────▼─────────────────────────┐
   L3           │            publish/                 │   Write-side orchestration
                └───────────┬─────────────────────────┘
                            │ (publish events, invalidate query keys)
                ┌───────────▼─────────────────────────┐
   L2           │            queries/                  │   Server-state read cache
                └───────────┬─────────────────────────┘
                            │ (should NOT import upward)
                ┌───────────▼─────────────────────────┐
   L1           │          lib/stores/                 │   Client state
                └───────────┬─────────────────────────┘
                            │
                ┌───────────▼─────────────────────────┐
   L0           │  lib/ (utils, schemas, types,        │   Foundation
                │  domain), server/, config/           │
                └─────────────────────────────────────┘
```

Key intended invariants:
- `routes/` and `components/` may import from anything below.
- `publish/` may import from `queries/` and `lib/stores/` (it needs the NDK
  signer + query keys to invalidate), and from L0.
- `queries/` should import ONLY from L0 (foundation) + the NDK library — **not**
  from `lib/stores/`.
- `lib/stores/` should import only from L0 — **not** from `queries/` or
  `publish/` (those are higher layers).
- `server/` is pure protocol logic; it imports nothing upward.

---

## 5. ACTUAL dependency graph (verified by grepping real imports)

Notation: `A ──► B` means "files in A import from B".

```
routes/      ──► components/, lib/stores/, lib/, publish/, queries/
components/  ──► components/ui/, queries/, lib/stores/, lib/, feature/
feature/     ──► lib/stores/, lib/, queries/            (wallet slice)
hooks/       ──► lib/                                    (clean)

publish/     ──► lib/stores/ (ndk, config, wallet, nip60, auth),
                 queries/   (queryKeyFactory, products, shipping, …),
                 components/ (orders.tsx → CheckoutFormData type)   ⚠

queries/     ──► lib/stores/ (ndk, config, auth, wallet),           ⚠ INVERSION
                 lib/stores/cart (v4v.tsx imports type V4VDTO)       ⚠ INVERSION
                 lib/ (boot, utils)

lib/stores/  ──► queries/   (cart, auth, collection, product, ndk),  ⚠ INVERSION
                 publish/   (cart → publish/cart, collection, product)⚠ INVERSION
                 components/ (auth → TermsConditionsDialog)          ⚠ INVERSION

lib/ (non-store) ──► queries/ (boot, utils/auctions, utils/orderUtils) ⚠ mild

server/      ──► (nothing upward — CLEAN)                            ✓
config/      ──► (nothing upward — CLEAN)                            ✓
```

### Concrete evidence (file : line)

**stores ──► queries (intended-direction violation):**
- `src/lib/stores/cart.ts:3` `import { fetchLatestCartSnapshot } from '@/queries/cart'`
- `src/lib/stores/cart.ts:4-14` imports from `@/queries/external`, `products`, `shipping`, `v4v`
- `src/lib/stores/auth.ts:5` `import { fetchProductsByPubkey } from '@/queries/products'`
- `src/lib/stores/collection.ts:2` `from '@/queries/collections'`
- `src/lib/stores/product.ts:21-22` `from '@/queries/products'`, `queryKeyFactory`
- `src/lib/stores/ndk.ts:3-4` `from '@/queries/wallet'`, `@/queries/relay-list'`

**queries ──► stores (reverse-direction violation — the worse one):**
- `src/queries/v4v.tsx:1` `import type { V4VDTO } from '@/lib/stores/cart'`
- `src/queries/messages.tsx:3` `import { authStore } from '@/lib/stores/auth'`
- `src/queries/config.tsx:4`, `external.tsx:5`, `payment.tsx:2-3`, `migration.tsx:2`,
  `liveChat.tsx:19`, `wallet.tsx:2` → import `ndkActions`/`configStore`/`walletActions`
- **~20 of ~25 query files import `ndkActions` from `lib/stores/ndk`.**

**stores ──► publish (violation):**
- `src/lib/stores/cart.ts:15` `import { publishCartSnapshot } from '@/publish/cart'`
- `src/lib/stores/collection.ts:1` `from '@/publish/collections'`
- `src/lib/stores/product.ts:2` `from '@/publish/products'`

**stores ──► components (violation):**
- `src/lib/stores/auth.ts:6` `import { hasAcceptedTerms, TERMS_ACCEPTED_KEY } from '@/components/dialogs/TermsConditionsDialog'`

**publish ──► components (violation):**
- `src/publish/orders.tsx:9` `import type { CheckoutFormData } from '@/components/checkout/ShippingAddressForm'`
- `src/publish/collections.tsx:7` `import type { RichShippingInfo } from '@/lib/stores/cart'`

---

## 6. Where the real arrows violate the intended arrows (the inversions)

### Inversion 1 — **Mutual dependency between `queries/` and `lib/stores/`** ⚠⚠⚠
This is the most serious. It is a **cycle**:

```
   queries/ ──────────────────────► lib/stores/ndk     (ndkActions: ~20 files)
   queries/ ──────────────────────► lib/stores/cart    (V4VDTO type, v4v.tsx)
   lib/stores/cart ──► queries/ (cart, external, products, shipping, v4v)
   lib/stores/auth  ──► queries/products
   lib/stores/ndk   ──► queries/wallet, queries/relay-list
   lib/stores/product, collection ──► queries/...
```

`queries/` and `lib/stores/` import **each other**. In the intended model
`queries/` (L2) sits *above* `lib/stores/` (L1) and stores must not reach up;
here both directions are violated, creating a circular package dependency.
TypeScript resolves it because ES modules allow it at runtime, but it means you
cannot reason about either layer in isolation, and tests must mock both.

**Root cause:** `ndkActions` (the NDK signer/instance accessor) lives in a
*store*, but every query needs it to fetch from relays. And the stores need
query data to enrich client state (e.g. cart needs product prices).

### Inversion 2 — **`lib/stores/` ──► `publish/`** ⚠⚠
Intended: `publish/` (L3) sits *above* `stores/` (L1). But `cart.ts`,
`collection.ts`, `product.ts` call publish functions directly. So a "lower"
layer depends on a "higher" layer. The cart store both *reads* server state
(via queries) and *writes* it (via publish) — it has become an orchestration
layer dressed as a store.

### Inversion 3 — **`lib/stores/` ──► `components/`** ⚠
`auth.ts` imports a constant (`TERMS_ACCEPTED_KEY`) from a JSX dialog component.
This couples foundation state to a specific UI widget. Low severity but a
clear layering smell — the constant should live in `lib/constants` or a types
file.

### Inversion 4 — **`publish/` ──► `components/`** ⚠
`publish/orders.tsx` imports the `CheckoutFormData` *type* from a component
file, and `publish/collections.tsx` imports `RichShippingInfo` from the cart
store. Type-only imports are cheaper than value imports, but they still create
a build-time dependency from the write-orchestration layer into the
presentation layer. The types belong in `lib/types/`.

### Inversion 5 — **`lib/` (utils) ──► `queries/`** (mild) ⚠
`lib/utils/auctions.ts`, `lib/utils/orderUtils.ts`, `lib/utils/adminUtils.ts`,
and `lib/boot.ts` import from `queries/`. L0 should not reach up to L2. Mild
because these are mostly type imports and helper wiring, but it muddies the
"foundation has no upward deps" guarantee.

### What is clean ✓
- `src/server/` imports **nothing** upward — it is a true foundation module.
- `src/config/` is leaf-level.
- `src/hooks/` only touches `lib/`.

---

## 7. Summary table — intended vs actual

| Edge                      | Intended? | Actual? | Verdict        |
|---------------------------|:---------:|:-------:|----------------|
| routes → components       |    ✓      |    ✓    | OK             |
| routes → queries/stores   |    ✓      |    ✓    | OK             |
| routes → publish          |    ✓      |    ✓    | OK             |
| components → queries      |    ✓      |    ✓    | OK             |
| components → stores       |    ✓      |    ✓    | OK             |
| publish → queries         |    ✓      |    ✓    | OK             |
| publish → stores (ndk)    |    ✓      |    ✓    | OK             |
| publish → components      |    ✗      |    ⚠    | **INVERSION 4**|
| queries → stores          |    ✗      |    ⚠⚠⚠  | **INVERSION 1**|
| stores → queries          |    ✗      |    ⚠⚠⚠  | **INVERSION 1**|
| stores → publish          |    ✗      |    ⚠⚠   | **INVERSION 2**|
| stores → components       |    ✗      |    ⚠    | **INVERSION 3**|
| lib/utils → queries       |    ✗      |    ⚠    | **INVERSION 5**|
| server → (upward)         |    ✗      |    —    | CLEAN          |

The single biggest architectural debt is the **queries ⇄ stores cycle**
(Inversion 1), driven by `ndkActions` living in a store that queries must
import, and by stores (especially `cart.ts`) acting as orchestration layers
that call both queries and publish. Fixing Inversion 1 is the prerequisite for
any clean separation — and is exactly what the "cart orchestrator" discussion
in ARTIFACT-2 addresses for the cart slice.
