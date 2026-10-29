# CITATION_INVENTORY — PR #1286 draft review

Source: `/home/c03rad0r/worktrees/pr1286-review/DRAFT-REVIEW.md`  ·  3291 bytes  ·  sha256 `8de0eb0d2ef9573cc2d8be0922867ba96106b147021fe4a14658b6b86f451e01`

Rows: 24  ·  Claims: 23

| claim_id | file_path:line (or 'NO CITATION') | short claim summary |
|---|---|---|
| C1 | NO CITATION | The PR's overall shape (one name driving NIP-05 + vanity URL + a signed page) is the right shape, and its schema-first block model reads cleanly. |
| C2 | NO CITATION | The new findings are stated at head 2ae85b6f; the ten previously-raised review items still stand and are not repeated in this draft. |
| C3 | src/lib/schemas/storefront.ts:28 | `heroBlock.image` reuses `safeLink`, which only requires an `https:` scheme on any host. |
| C4 | NO CITATION | A signed page event can therefore make every visitor's browser fetch an arbitrary third-party URL. |
| C5 | NO CITATION | `parseStorefrontPage` accepts a hero block whose `image` is an arbitrary attacker host, as demonstrated with `{"type":"hero","title":"Hi","image":"https://attacker.example/pixel.png?u=1"}`. |
| C6 | StorefrontRenderer.tsx:26 | `StorefrontRenderer` puts that image value straight into `<img src>`. |
| C7 | NO CITATION | A seller, or anyone holding a 30024 they can get rendered, obtains a per-visitor tracking pixel and every visitor's IP/timestamp on a page served as the project's own. |
| C8 | ADR-019:146-147 | ADR-019 states that images resolve through the existing Blossom/NIP-96 host allowlist. |
| C9 | src/lib/blossom.ts | No such allowlist exists in this diff, and `src/lib/blossom.ts` only lists servers with no predicate. |
| C10 | src/queries/storefront.tsx:40 | `fetchStorefrontPage` never Schnorr-verifies the 30024 event at the parse boundary. |
| C11 | NO CITATION | It filters on `kind`, `pubkey` and the `d` tag only, then hands `event.content` to `parseStorefrontPage`. |
| C12 | NO CITATION | Without a signature check, a forged event with the right pubkey/kind/`d` and a bad signature renders on a public `/{name}` page. |
| C13 | NO CITATION | The repo already states the rule for this case: NDK's sampling verification may skip forged events, so events are verified explicitly. |
| C14 | src/queries/liveChat.tsx:93-99 | `src/queries/liveChat.tsx` calls `verifyNostrEventSignature` before parsing, as the existing precedent. |
| C15 | src/queries/AGENTS.md | `src/queries/AGENTS.md` requires validating signature assumptions before treating an event as application state. |
| C16 | src/routes/_dashboard-layout/dashboard/account/storefront.tsx:56-58 | The dashboard storefront editor textarea is unconditionally overwritten whenever `publishedPage` changes, with no dirty guard. |
| C17 | src/queries/storefront.tsx:59-63 | `useStorefrontPage`'s subscription invalidates on any incoming 30024 from this pubkey, so a draft being typed is silently replaced by the relay copy. |
| C18 | NO CITATION | The overwrite triggers in practice when publishing from a second device/tab while the first is mid-edit. |
| C19 | src/components/storefront/StorefrontRenderer.tsx:74 | `StorefrontRenderer` renders a `<main>` inside the `<main>` at the root route, giving a storefront document two main landmarks, contrary to the a11y rule of exactly one per document. |
| C19 | src/routes/__root.tsx:102 | `StorefrontRenderer` renders a `<main>` inside the `<main>` at the root route, giving a storefront document two main landmarks, contrary to the a11y rule of exactly one per document. |
| C20 | NO CITATION | `ProfilePage` returns a `<div>` rather than a `<main>` for the same nested-landmark reason. |
| C21 | docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md:163-166 | ADR-019 promises two guards for R5: a renderer unit test asserting a hostile page renders inert, and an e2e path purchase → publish → `/{name}` → NIP-05. |
| C22 | src/lib/schemas/storefront.test.ts | This PR ships only a parser-level test at `src/lib/schemas/storefront.test.ts`. |
| C23 | NO CITATION | No e2e scenario references storefront or 30024, so the render layer is unverified for the exact threats the ADR enumerates. |

## Uncited claims (11)

- **C1** — The PR's overall shape (one name driving NIP-05 + vanity URL + a signed page) is the right shape, and its schema-first block model reads cleanly.
- **C2** — The new findings are stated at head 2ae85b6f; the ten previously-raised review items still stand and are not repeated in this draft.
- **C4** — A signed page event can therefore make every visitor's browser fetch an arbitrary third-party URL.
- **C5** — `parseStorefrontPage` accepts a hero block whose `image` is an arbitrary attacker host, as demonstrated with `{"type":"hero","title":"Hi","image":"https://attacker.example/pixel.png?u=1"}`.
- **C7** — A seller, or anyone holding a 30024 they can get rendered, obtains a per-visitor tracking pixel and every visitor's IP/timestamp on a page served as the project's own.
- **C11** — It filters on `kind`, `pubkey` and the `d` tag only, then hands `event.content` to `parseStorefrontPage`.
- **C12** — Without a signature check, a forged event with the right pubkey/kind/`d` and a bad signature renders on a public `/{name}` page.
- **C13** — The repo already states the rule for this case: NDK's sampling verification may skip forged events, so events are verified explicitly.
- **C18** — The overwrite triggers in practice when publishing from a second device/tab while the first is mid-edit.
- **C20** — `ProfilePage` returns a `<div>` rather than a `<main>` for the same nested-landmark reason.
- **C23** — No e2e scenario references storefront or 30024, so the render layer is unverified for the exact threats the ADR enumerates.
