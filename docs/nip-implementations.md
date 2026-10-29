# NIP Implementation Map

A map of which [NIPs (Nostr Implementation Possibilities)](https://github.com/nostr-protocol/nips) are
implemented in Plebeian Market, where in the code, and their status.

> **Status legend:** ✅ Active · 🚧 In Progress · ⚠️ Migrating · 🕳️ Deprecated · 🔌 NDK-provided

---

## Summary Table

| NIP | Title | Status | Primary Implementation Files | Notes |
|-----|-------|--------|------------------------------|-------|
| [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) | Basic Protocol Flow | 🔌 NDK | `src/lib/stores/ndk.ts`, all `src/publish/*`, `src/queries/*` | Foundation; NDK handles events, filters, relay I/O |
| [NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md) | Encrypted Direct Messages | 🕳️ Deprecated | `scripts/encrypt_test_wallet.ts`, `e2e/utils/nip46-mock.ts` | Superseded by NIP-44; mock still auto-detects NIP-04 vs NIP-44 |
| [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) | DNS-based Internet Identifiers | ✅ Active | `src/server/Nip05Manager.ts`, `src/components/Nip05Badge.tsx`, `src/hooks/useNip05Sync.ts`, `src/routes/_dashboard-layout/dashboard/account/nostr-address.tsx`, `src/lib/utils.ts` | Registered as a zap purchase; server serves `/.well-known/nostr.json` |
| [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) | `window.nostr` Browser Signer | ✅ Active | `src/lib/stores/auth.ts` (`NDKNip07Signer`), `src/components/auth/*` | Primary signer for extension users; e2e mock in `e2e/fixtures/auth.ts` |
| [NIP-09](https://github.com/nostr-protocol/nips/blob/master/09.md) | Event Deletion | ✅ Active | `src/publish/reactions.tsx`, `e2e/purge-leaked-events.ts`, `e2e/tests/pii-exposure-remediation.spec.ts` | Kind `5` deletion requests; used for reactions + PII remediation |
| [NIP-11](https://github.com/nostr-protocol/nips/blob/master/11.md) | Relay Information Document | ✅ Active | `src/lib/relays.ts`, `src/queries/products.tsx`, `deploy-simple/relay/` | Clients read `supported_nips`; aggregator relay is NIP-11 compliant |
| [NIP-15](https://github.com/nostr-protocol/nips/blob/master/15.md) | Marketplace Stalls (legacy) | ⚠️ Migrating | `scripts/gen_nip15_products.ts`, `src/routes/_dashboard-layout/dashboard/products/migration-tool.tsx`, `scripts/seed.ts` | Kind `30018`; **migrating to NIP-99**. See migration note below |
| [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) | Encrypted Direct Messages (gift-wrapped) | ✅ Active | `src/lib/schemas/order.ts`, `src/publish/orders.tsx`, `src/queries/orders.tsx` | Order communication per Gamma Market Spec (kinds `14`/`16`/`17`) |
| [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md) | bech32-encoded Entities | ✅ Active | `src/lib/utils.ts`, `src/lib/nostr/naddr.ts`, `src/lib/stores/auth.ts`, `src/queries/v4v.tsx`, `src/components/v4v/RecipientItem.tsx`, `src/queries/payment.tsx` | `npub`/`nsec`/`naddr` encode + decode |
| [NIP-22](https://github.com/nostr-protocol/nips/blob/master/22.md) | Comments | ✅ Active | `src/publish/comments.tsx` | Comment events on products/comments; references NIP-99 products via `a` tags |
| [NIP-25](https://github.com/nostr-protocol/nips/blob/master/25.md) | Reactions | ✅ Active | `src/publish/reactions.tsx` | Kind `7` reactions on events |
| [NIP-33](https://github.com/nostr-protocol/nips/blob/master/33.md) | Parameterized Replaceable Events | ✅ Active | `src/lib/nostr/naddr.ts`, `src/publish/app-settings.tsx`, all `30xxx` kinds | Coordinate addressing via `naddr`; admin/editor lists |
| [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) | Versioned Encryption | ✅ Active | `src/lib/nostr/nip59.ts`, `src/lib/orders/privateOrderMessage.ts`, `src/lib/ctxcn-client.ts` | `nip44.v2`; used by NIP-59 gift wrap + NIP-17 order DMs |
| [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) | Nostr Connect (Remote Signer) | ✅ Active | `src/lib/stores/auth.ts` (`NDKNip46Signer`), `src/components/auth/NostrConnectQR.tsx`, `src/lib/constants.ts` (`DEFAULT_NIP46_RELAYS`), `src/index.tsx` (`NIP46_RELAY_URL`) | QR + bunker URL flows; nsec.app default. Mock in `e2e/utils/nip46-mock.ts` |
| [NIP-47](https://github.com/nostr-protocol/nips/blob/master/47.md) | Nostr Wallet Connect (NWC) | ✅ Active | `src/publish/payment.tsx` (`payInvoiceWithNwc`), `src/lib/stores/wallet.ts`, `src/components/lightning/LightningPaymentProcessor.tsx`, `src/queries/wallet.tsx` | `pay_invoice` over NWC relay |
| [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) | Lists | ✅ Active | `src/publish/blacklist.tsx` (kind `10000`), `src/publish/featured.tsx` (kinds `30000`/`30003`), `src/server/BlacklistManager.ts` | Mute lists, featured collections/users, admin/editor/pleb role lists |
| [NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) | Live Activities | ❌ Not implemented | — | No references found in codebase; not used by the marketplace |
| [NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md) | Lightning Zaps | ✅ Active | `src/lib/stores/ndk.ts` (`NDKKind.Zap`), `src/components/dialogs/ZapDialog.tsx`, `src/components/lightning/LightningPaymentProcessor.tsx`, `e2e/utils/lightning-mock.ts` | Zap receipts drive paid actions (vanity URLs, NIP-05, badges); `zap` tags for V4V shares |
| [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) | Gift Wrap | ✅ Active | `src/lib/nostr/nip59.ts` (seal kind `13`, gift wrap kind `1059`), `src/lib/orders/privateOrderMessage.ts` | Wraps private order/shipping/delivery details; supports signer-based + raw-key flows |
| [NIP-60](https://github.com/nostr-protocol/nips/blob/master/60.md) | Cashu Wallet | ✅ Active | `src/lib/stores/nip60.ts` (`NDKCashuWallet`), `src/lib/stores/cashu.ts`, `src/lib/wallet/`, `src/components/dialogs/ZapDialog.tsx` | Cashu melt for Lightning payments; deposit/withdraw |
| [NIP-61](https://github.com/nostr-protocol/nips/blob/master/61.md) | Nutzaps | ✅ Active | `src/components/dialogs/ZapDialog.tsx` (`NDKNutzap`), `src/lib/stores/nip60.ts` | Ecash zaps alongside Lightning zaps |
| [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) | Relay List Metadata | ✅ Active | `src/publish/relay-list.tsx` | Kind `10002`; user's read/write relay preferences |
| [NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md) | Application-specific Data | ✅ Active | `src/publish/relay-preferences.tsx`, `src/queries/payment.tsx` (`NDKKind.AppSpecificData`), `src/lib/appSettings.ts` | Kind `30078`; relay prefs, payment details, encrypted app config |
| [NIP-89](https://github.com/nostr-protocol/nips/blob/master/89.md) | Recommended Application Handlers | ✅ Active | `src/publish/nip89.ts` (kinds `31989`/`31990`), `src/publish/products.tsx`, `src/publish/collections.tsx` | Declares Plebeian Market handles product/collection kinds; `client` tags |
| [NIP-96](https://github.com/nostr-protocol/nips/blob/master/96.md) | HTTP File Storage (Blossom) | ✅ Active | `src/lib/blossom.ts` (`NDKBlossom`), `src/components/ui/image-uploader/ImageUploader.tsx`, `src/routes/_dashboard-layout/dashboard/app-settings/app-miscelleneous.tsx` (`NIP96_SERVER`) | Image uploads via Blossom servers; `NIP96_SERVER` configurable |
| [NIP-99](https://github.com/nostr-protocol/nips/blob/master/99.md) | Classified Listings | ✅ Active | `src/publish/products.tsx` (kind `30402`), `src/publish/collections.tsx` (kind `30405`), `src/publish/migration.tsx`, `src/lib/schemas/shippingOption.ts` (kind `30406`) | **Current** marketplace listing format per `gamma_spec.md` |

---

## By Category

### Identity & Key Management
- **NIP-05** — DNS identity verification. The backend (`Nip05Manager`) builds the
  `/.well-known/nostr.json` response from active registrations; the frontend renders a verified
  badge (`Nip05Badge`) and lets users register an address as a zap purchase. Validation in
  `src/lib/utils.ts`.
- **NIP-07** — `window.nostr` browser-extension signing. The default signer path for extension
  users via `NDKNip07Signer`.
- **NIP-19** — bech32 encoding/decoding (`npub`, `nsec`, `naddr`) used throughout for safe key
  display and addressable-event coordinates.
- **NIP-46** — Nostr Connect remote signers (nsec.app, Amber). QR-code and `bunker://` URL flows;
  relay selection in `NostrConnectQR.tsx`.

### Marketplace Domain (the Gamma Market Spec)
The marketplace protocol is defined in [`gamma_spec.md`](../gamma_spec.md) and [`SPEC.md`](../SPEC.md).
Plebeian Market implements it on top of NIP-99 classifieds:
- **NIP-99** — Product listings (kind `30402`), product collections (kind `30405`), and shipping
  options (kind `30406`) are the current data model.
- **NIP-15 → NIP-99 migration** — legacy marketplace stalls (kind `30018`) are migrated to NIP-99
  via the [migration tool](../src/routes/_dashboard-layout/dashboard/products/migration-tool.tsx)
  and `src/publish/migration.tsx`, which republishes products with a `migrated` tag referencing the
  original NIP-15 event ID. See the migration note below.
- **NIP-17 + NIP-44 + NIP-59** — order communication. Buyer↔merchant messages are gift-wrapped
  (NIP-59) and NIP-44-encrypted, flowing through NIP-17 direct-message kinds (`14` general,
  `16` order processing, `17` payment receipts) per the Gamma spec. Private delivery details
  (name, email, address, phone) are wrapped in `src/lib/orders/privateOrderMessage.ts`.

### Payments (Lightning)
- **NIP-57** — Lightning Zaps. Zap receipts authorize paid server-side actions (vanity URL
  registration, NIP-05 activation, badge awards); see [`docs/zap-purchase-manager.md`](zap-purchase-manager.md).
  `zap` tags carry V4V (value-for-value) revenue shares.
- **NIP-47 (NWC)** — Nostr Wallet Connect. Pays BOLT11 invoices directly from a user's wallet via
  the `pay_invoice` method (`src/publish/payment.tsx`).
- **NIP-60** — Cashu ecash wallet (`NDKCashuWallet`). Supports Lightning melt-to-pay and
  deposit/withdraw.
- **NIP-61** — Nutzaps (ecash zaps), offered alongside Lightning zaps in the Zap dialog.

### Content & Social
- **NIP-09** — event deletion requests (kind `5`), used to delete reactions and as a PII-leak
  remediation tool.
- **NIP-22** — comment events on products and other comments.
- **NIP-25** — reactions (kind `7`).

### Lists & Curation
- **NIP-51** — mute/blacklist (kind `10000`), featured collections (kind `30003`), featured users
  (kind `30000`), and admin/editor/pleb role lists (per `SPEC.md`).

### Application Config & Handlers
- **NIP-33** — parameterized replaceable events addressed by `naddr` coordinate (`kind:pubkey:d`).
- **NIP-78** — application-specific data (kind `30078`) for relay preferences, payment details, and
  encrypted app settings.
- **NIP-89** — recommended application handlers. Plebeian Market publishes kind `31990` handler
  info and kind `31989` recommendations, and tags `client` on product/collection events.

### Relays & Media
- **NIP-11** — relay information documents; the aggregator/relay in `deploy-simple/relay/` is
  NIP-11 compliant and advertises `supported_nips`.
- **NIP-65** — user relay list metadata (kind `10002`).
- **NIP-96 (Blossom)** — HTTP file storage for image uploads via `NDKBlossom`; the
  `NIP96_SERVER` env var selects the media server.

---

## NIP-15 → NIP-99 Migration

Plebeian Market originally ran on **NIP-15** marketplace stalls (event kind `30018`). The current
version uses **NIP-99** classifieds (product kind `30402`, collection kind `30405`, shipping kind
`30406`) as defined in [`gamma_spec.md`](../gamma_spec.md).

- Existing NIP-15 listings are migrated through the
  [migration tool](../src/routes/_dashboard-layout/dashboard/products/migration-tool.tsx), which
  parses legacy kind `30018` events and republishes them as NIP-99 products.
- `src/publish/migration.tsx` adds a `migrated` tag pointing back to the original NIP-15 event ID
  so history is preserved.
- Seed/test scripts (`scripts/seed.ts`, `scripts/gen_nip15_products.ts`) still emit NIP-15 products
  to exercise the migration path.

---

## NDK-Provided NIPs

Plebeian Market builds on [`@nostr-dev-kit/ndk`](https://ndk.docs.nostrnet.org/) (`3.0.3`),
[`@nostr-dev-kit/blossom`](https://www.npmjs.com/package/@nostr-dev-kit/blossom) (`^8.0.0`), and
[`@nostr-dev-kit/wallet`](https://www.npmjs.com/package/@nostr-dev-kit/wallet) (`1.0.0`). NDK
implements many NIPs internally, so the app gets the following for free (marked 🔌 in the table):

- **NIP-01** — event creation, signing, filters, relay pooling (`NDK`, `NDKEvent`, `NDKSubscription`).
- **NIP-07 / NIP-46** — signer abstractions (`NDKNip07Signer`, `NDKNip46Signer`).
- **NIP-19** — bech32 entity handling.
- **NIP-44** — versioned encryption primitives (the app calls `nip44.v2` directly from
  `nostr-tools` in its NIP-59 helper).
- **NIP-57** — zap construction (`NDKZapper`, `NDKKind.Zap`).
- **NIP-60 / NIP-61** — Cashu wallet and nutzaps (`NDKCashuWallet`, `NDKNutzap`).

When debugging or extending a feature, check whether the NIP is handled by NDK before
re-implementing it.

---

## How This Map Was Generated

1. `grep -rn 'NIP-\|nip-\|NIP[0-9]' src/ docs/ e2e/ scripts/ deploy-simple/ | sort`
2. Cross-checked against `.claude/skills/nostr/references/nips-overview.md` and
   `.claude/skills/nostr/references/event-kinds.md`.
3. Cross-checked against [`gamma_spec.md`](../gamma_spec.md) and [`SPEC.md`](../SPEC.md) for
   marketplace event kinds.
4. Searched for kind literals and `NDKKind.*` usage across `src/`.
5. Searched for feature keywords: `blossom`, `cashu`, `nwc`, `nip44`, `nip59`, `giftWrap`,
   `NDKNutzap`, etc.

To regenerate after code changes, re-run step 1 and reconcile any new NIP references against this
table.
