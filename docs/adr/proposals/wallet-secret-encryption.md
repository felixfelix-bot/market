# docs(adr): propose NWC wallet secret encryption at rest (H8)

> **Note:** Extracted from the closed PR #1118 bundle and the H8 finding in #1074. Code lives on branch `security/wallet-encryption` in the `felixfelix-bot/market` fork. Detailed handovers: `~/work/adrs/unique/18_Handover__ADR__NWC_Wallet_Secret_Encryption_at_Rest.md` (decision depth) and `~/work/adrs/unique/08_ADR_Proposal__Encrypted_Sensitive_Data_at_Rest_H8.md` (NIP-07 gap + sensitivity classification).

---

## Motivation

Plebeian Market stores NWC (Nostr Wallet Connect) wallet connection URIs in `localStorage` as **plaintext JSON**. These URIs contain the wallet secret in the query string:

```
nostr+walletconnect://<pubkey>?relay=wss://relay.example&secret=<SECRET_KEY>
```

Anyone with access to `localStorage` can extract the wallet secret and drain funds. Attack surface:

- Physical device access (copy from devtools)
- Malicious browser extension (can read localStorage; doesn't need to execute page JS)
- Leftover data after logout (plaintext persists)
- Shared / public devices

The threat model is **at-rest protection only**. The code comments already acknowledge this: encryption does NOT protect against a live XSS that can call `secureGet()` while the key is in memory — that requires CSP / input sanitisation, which is a separate concern.

## What this ADR covers

- **Rule:** NWC wallet connection URIs MUST be encrypted at rest in `localStorage` using AES-256-GCM.
- **Key derivation:** HKDF-SHA256 from the user's nostr private key hex → AES-256-GCM `CryptoKey`.
- **Envelope format:** `v1:<base64(iv)>:<base64(ciphertext)>` — versioned for future format changes.
- **Plaintext fallback:** When no encryption secret is available (pre-auth), stores plaintext with a `needsMigration` flag.
- **Auto-migration:** Legacy plaintext wallets upgrade to encrypted on the next authenticated write.
- **Module:** `src/lib/wallet/secureStorage.ts` (163 lines):
  - `deriveAesKey(secretHex)` → HKDF-SHA256 → AES-256-GCM CryptoKey
  - `encryptJson(data, secretHex)` / `decryptJson(envelope, secretHex)` (never throws — returns null on failure)
  - `secureSet(key, data, secretHex?)` / `secureGet(key, secretHex?)` → `{ data, isEncrypted, needsMigration }`
- **Integration:** Wired into `src/lib/stores/wallet.ts` (goes through `secureGet`/`secureSet`) and `src/lib/stores/auth.ts` (calls `walletActions.setEncryptionSecret(privateKeyHex)` after login, clears on logout).
- **Tests:** `src/lib/wallet/__tests__/secureStorage.test.ts` — 14 tests: AES-GCM round-trip, unique IV per write, wrong-key decryption failure, plaintext→encrypted migration, pre-auth encrypted-but-no-secret handling, missing key.

## Open decision points

@Franchovy @maximotodev — input welcome on each. These are product-level decisions, not implementation details:

### 1. NIP-07 extension users — the critical gap

Three of four auth paths set the encryption secret:
- `loginWithPrivateKey()` — private key available ✓
- `loginWithNsec()` — private key available ✓
- `loginWithNConnect()` — local signer key available ✓
- **NIP-07 browser extension login** — private key NEVER exposed to the page ✗

NIP-07 extensions only expose `getPublicKey()` and `signEvent()` — never the raw private key. Extension users cannot derive an encryption key from nostr key material. Current implementation: they fall back to plaintext permanently. Options:

- **(A) Random key** stored in localStorage — defeats the purpose (key and data in the same place).
- **(B) Deterministic signed message** — ask the extension to sign a fixed message, derive key from signature. Adds a round-trip on every session but works. Overhead is per-session, not per-operation.
- **(C) Plaintext fallback** — current behavior. Extension users get no at-rest protection. Honest but unequal.
- **(D) Pubkey-derived key** — weak, since the pubkey is public knowledge.

**This is the decision the ADR must make explicitly.** The current implementation punts with Option C; that may be acceptable but should not be an omission.

### 2. Key derivation method

- HKDF from nostr private key (current) — zero UX friction, but key rotation breaks wallets and key loss = unrecoverable.
- PBKDF2 from user-set passphrase — independent of nostr key, recoverable, but adds UX friction and offline brute-force risk.
- WebAuthn (platform authenticator) — hardware-backed, phishing-resistant, but not all devices have it and the API is complex.
- Hybrid (nostr key + optional passphrase fallback) — more flexible but more surface area.

### 3. Key rotation and recovery

If a user rotates their nostr key (key migration, compromise response), all encrypted wallets become unreadable. The old key is needed to decrypt before re-encrypting with the new key. Options:
- Accept unrecoverability (current design — key loss = wallet config loss)
- Add a recovery passphrase (separate from nostr key)
- Add a backup code system (show once, store encrypted on relay)
- Add escrow (server-side key — defeats the purpose)

### 4. Sensitivity classification boundary

Currently: NWC wallet connection strings only. Should we also encrypt:
- Stored NIP-46 bunker URLs? (high — also spending/signing capability)
- Auth state / session tokens? (medium)
- Cart contents, notification prefs, profile cache? (low — probably not worth it)

**Decision needed:** Define the boundary explicitly so future stores know whether to opt in.

### 5. Migration atomicity

Current migration flow: detect plaintext → flag `needsMigration: true` → re-encrypt on next authenticated write. If the browser crashes mid-write, the wallet could end up in an inconsistent state. Options:
- Best-effort (current) — acceptable given the nostr key is deterministic (re-encryption is retryable on next login)
- Atomic write-then-swap — write to temp key, then swap. Safer but more complex.

### 6. Multi-device sync

localStorage doesn't sync between devices. Same nostr key on device B derives the same AES key, so decryption would work IF the encrypted data synced — but it doesn't. This is a pre-existing limitation, not introduced by encryption. **Decision:** is device-local-only wallet storage acceptable, or is relay-based wallet config sync a future requirement? (Likely a separate feature, not this ADR.)

### 7. Web Crypto API availability

The implementation uses `globalThis.crypto.subtle` (Web Crypto API), which requires:
- HTTPS context (or localhost for dev)
- Secure context (no plain HTTP)

**Decision:** Is this guaranteed in all deployment environments? Tor onion services serve over HTTP — does Plebeian support Tor access for the wallet flow? If yes, Web Crypto is unavailable and we need a fallback (or document Tor as unsupported for wallet management).

## Dependencies

- **Web Crypto API** (`globalThis.crypto.subtle`) — requires HTTPS / secure context
- **NIP-07** (browser signer extension interface — central to the key-management gap)
- **NIP-47** (NWC spec — defines the connection URI format being encrypted)
- HKDF-SHA256 and AES-256-GCM primitives (both in Web Crypto)

## Related

- PR #1074 (finding H8 — original audit)
- PR #1118 (closed — bundled fix, superseded by ADR-driven approach)
- Issue #996 (security audit findings)
- Implementation branch: `felixfelix-bot/market@security/wallet-encryption`
- OWASP Cryptographic Storage Cheat Sheet
- NWC spec: NIP-47
- Web Crypto API: MDN `SubtleCrypto`
- Companion proposals: [`relay-websocket-origin-validation.md`](./relay-websocket-origin-validation.md) (H1), [`payment-input-validation.md`](./payment-input-validation.md) (H2) — same PR bundle

## Reference implementation

The crypto in `secureStorage.ts` is sound — HKDF-SHA256 + AES-256-GCM is the correct pattern, unique IVs per write, versioned envelope, never-throw decrypt. The branch `security/wallet-encryption` is merge-ready **except** for the NIP-07 decision (decision point 1). Once the ADR settles Option A/B/C/D, the branch becomes a PR. The other decision points (key derivation, sensitivity boundary, migration atomicity) can ratify the current implementation as-is or prescribe changes.
