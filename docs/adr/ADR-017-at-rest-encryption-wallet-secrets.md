# ADR-017: At-Rest Encryption for Wallet Secrets (Shared WebCrypto Vault)

## Status

Accepted

## Date

2026-09-10

## Related

- Security finding: wallet secrets stored plaintext in localStorage
  (Cashu seed, NWC URI spending secret, NIP-46 signer key)
- Implements the shared module consumed by the Cashu seed, NWC URI, and
  NIP-46 signer encryption tasks
- Extends the approach prototyped for the NIP-46 session vault
  (`adr0008/b3-vault` branch, not merged at this HEAD)

## Context

The marketplace persists three classes of wallet secret in browser
localStorage as plaintext:

1. **Cashu wallet seed** — `cashu_wallet_seed_<pubkey>` (hex seed used for
   deterministic key derivation).
2. **NWC connection URI** — `nwc_wallets` (the URI embeds a spending secret).
3. **NIP-46 local signer key** — `nostr_local_signer_key` (the client private
   key used to talk to the bunker).

Any script running in the page, or anyone with access to the browser's
localStorage, can read these secrets. The fix is to encrypt them at rest so
that localStorage only ever holds ciphertext envelopes, with the key derived
from a passphrase the user supplies at unlock time.

Two candidate schemes were considered.

### Option A — WebCrypto AES-GCM with a passphrase-derived key

- PBKDF2-SHA256 to stretch the passphrase into a 256-bit AES key.
- **>= 600,000 iterations** (OWASP 2023 guidance; the brief's floor).
- A fresh random salt and IV per sealed value.
- AES-256-GCM for authenticated encryption (the auth tag rejects wrong
  passphrases and tampered ciphertext).
- Everything is browser-native `crypto.subtle` — **no new dependencies**.

### Option B — NIP-49-style scheme

- NIP-49 (`ncryptsec`) is a Nostr-specific format for encrypting a single
  nsec with a passphrase. It is interoperable with other Nostr clients.
- It is a single-purpose format (one nsec per envelope), not a general
  key-value vault, and it does not cover the NWC URI or Cashu seed.
- It would require either `nostr-tools/nip49` (already a dependency) or a
  reimplementation.

## Decision

**Adopt Option A: WebCrypto AES-GCM-256 with a PBKDF2-SHA256-derived key.**

Rationale:

- **No new dependencies.** `crypto.subtle` is available in every modern
  browser and in the Bun test runtime. The module is self-contained.
- **General-purpose.** The same envelope shape seals the Cashu seed, the NWC
  URI, and the NIP-46 signer key — one shared module, one key list, one
  migration path.
- **Authenticated encryption.** AES-GCM's auth tag gives us wrong-passphrase
  and tamper detection for free, which the acceptance tests require.
- **Interop is not a requirement here.** These are app-internal secrets, not
  Nostr events meant to be read by other clients. NIP-49's interop advantage
  buys nothing for localStorage persistence.

NIP-49 remains available for the NIP-46 signer key specifically (the app
already uses `nostr-tools/nip49` for `nostr_local_encrypted_signer_key`), but
the shared vault is the single mechanism for the three findings so the key
list and migration logic live in one place.

### Envelope format

Each sealed value is a base64 JSON envelope:

```json
{
	"v": 1,
	"alg": "AES-256-GCM",
	"kdf": "PBKDF2-SHA256",
	"iterations": 600000,
	"salt": "<base64>",
	"iv": "<base64>",
	"ct": "<base64>"
}
```

- `v` — envelope version, allows future evolution.
- `alg` / `kdf` — algorithm identifiers.
- `iterations` — PBKDF2 cost. Stored so the envelope can be unlocked later;
  validated against a minimum floor on open to block iteration-downgrade
  tampering.
- `salt` — random per-value salt (16 bytes).
- `iv` — random AES-GCM nonce (12 bytes).
- `ct` — ciphertext (base64).

### Session-key flow

The passphrase is prompted once and held in memory for the session. Each
`setSecret`/`getSecret` derives the per-value key from the passphrase and the
value's own stored salt, so no single derived key is ever persisted and each
value has independent salt + IV. `lock()` clears the in-memory passphrase;
`unlock()` re-prompts. On refresh the in-memory key is gone and the user is
re-prompted.

### Migration

`migrateLegacy(keyName)` reads a key, detects whether it is a plaintext value
(not a vault envelope), and if so re-encrypts it under the unlocked session
key and removes the plaintext copy. This runs on unlock so legacy plaintext
is never silently retained.

## Consequences

- **Positive:** localStorage holds only ciphertext envelopes for the three
  wallet secrets; a script or localStorage dump cannot recover the secrets
  without the passphrase.
- **Positive:** one shared module, one key list, one migration path — the
  downstream Cashu / NWC / NIP-46 tasks and the logout wipe all consume the
  same helpers.
- **Positive:** no new dependencies; tests run in Bun with a mocked
  localStorage.
- **Negative:** the user must supply a passphrase to unlock wallet secrets
  (a UX cost). PBKDF2 at 600k iterations adds a small unlock latency
  (sub-second in modern browsers).
- **Negative:** a lost passphrase is unrecoverable — the secrets are
  unrecoverable. This is inherent to passphrase-based encryption and is
  documented in the unlock UI.
- **Negative:** the audit's original file:line references are stale at this
  HEAD (auth is now `src/lib/stores/auth.ts`); the verification task must
  re-locate the findings at merged HEAD.
