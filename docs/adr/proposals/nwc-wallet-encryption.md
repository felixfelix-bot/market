# NWC Wallet Secret Encryption at Rest

## Status

Proposal — not yet surfaced to team

## Problem

NWC wallet connection URIs (`nostr+walletconnect://...?secret=...`) are stored in `localStorage` as plaintext JSON. These strings grant spending capability from the user's Lightning wallet — they are the functional equivalent of a wallet password. Anyone with read access to `localStorage` can extract the URI and drain the wallet: browser extensions, shared-device users, XSS payloads, forensic disk access, or a backup/restore of browser data.

The threat model matters here. Encryption at rest does **not** protect against a live XSS that can execute code while the decryption key is in memory — that requires a Content Security Policy and input sanitization, which are separate concerns. What encryption at rest _does_ protect against is the quieter, more common cases: a shared laptop, a copied browser profile, a nosy extension that reads `localStorage` but cannot run arbitrary page-context code, or a stolen device where the attacker pulls the profile directory. These are realistic exposures for a wallet-bearing app, and plaintext makes all of them a total loss.

The reference implementation in PR #1118 / branch `security/wallet-encryption` is sound: AES-256-GCM authenticated encryption, HKDF-SHA256 key derivation, a versioned envelope (`v1:<base64(iv)>:<base64(ciphertext)>`), and automatic migration of legacy plaintext on the next authenticated write. The open question is not whether the crypto is correct — it is — but **what key material the encryption is derived from**, especially for users who authenticate via a NIP-07 browser extension and never expose a private key to the page.

## Proposed Approach

Adopt AES-256-GCM encryption with HKDF-SHA256 key derivation for sensitive `localStorage` entries, starting with NWC wallet connection URIs. The encryption key is derived from the user's private key hex via `walletActions.setEncryptionSecret(privateKeyHex)`. Storage uses a versioned envelope so legacy plaintext can be detected and upgraded transparently:

```
v1:<base64(iv)>:<base64(ciphertext)>
```

The implementation lives in `src/lib/wallet/secureStorage.ts` (163 lines) and is wired into `wallet.ts` and `auth.ts`. Legacy plaintext entries are auto-migrated to encrypted form on the next authenticated write — no manual migration step, no data loss for existing users. When no encryption secret is available (pre-auth, or NIP-07 extension users — see decision points), the store falls back to plaintext with a migration flag so the data is not silently dropped.

Initially, encryption covers only NWC wallet connection URIs. Other `localStorage` entries (cart contents, notification preferences, auth state, cached NIP-46 bunker URLs) remain plaintext until a sensitivity classification is agreed — see decision points. NIP-46 bunker URLs are a strong candidate for the next round, since they also confer spending or signing capability.

## Decision Points

- **Key derivation source for NIP-07 extension users**: This is the central gap. Extension login never exposes the raw private key, so the current HKDF-from-nsec approach cannot derive an encryption key. Options:
  - **A** — Generate a random encryption key, store it in `localStorage`. Defeats the purpose: key and ciphertext sit in the same place.
  - **B** — Ask the extension to sign a deterministic message (e.g. a fixed challenge string) and derive the key from the signature. Requires an extension round-trip on every session, but the key never touches `localStorage`.
  - **C** — Accept plaintext for extension users, encrypt only for key-based users. Current behavior. Simple, but leaves the highest-risk auth path unprotected.
  - **D** — Use the pubkey itself as the key source. Rejected: the pubkey is public.
    The ADR needs to pick one and justify it. Option B is the strongest but adds UX friction; Option C is the status quo and may be acceptable as an explicit decision.
- **Key derivation input for key-based users**: HKDF from the raw `nsec` hex (current), or HKDF from a signature over a fixed challenge (consistent with whatever is chosen for extension users)? Using the raw hex ties encryption to key possession; using a signature decouples it and works uniformly across auth paths.
- **Migration path from existing plaintext**: auto-upgrade on next authenticated write (current), or an explicit one-time migration prompt? Auto-upgrade is seamless but means the plaintext copy is overwritten in place — if the browser crashes mid-write the wallet could be in an inconsistent state. Should the migration be atomic (write-then-swap with a backup key)?
- **Behavior when key is unavailable**: plaintext fallback with migration flag (current), or refuse to write sensitive data at all? Refusing is safer but breaks the pre-auth and extension-user paths entirely.
- **Sensitivity classification boundary**: what else gets encrypted beyond NWC URIs? NIP-46 bunker URLs are high-sensitivity (signing/spending capability). Cart contents and notification preferences are low. Auth/session tokens are medium. Define the rule.
- **Key lifecycle vs session lifecycle**: encryption secret is cleared on logout (`setEncryptionSecret(undefined)`). After logout, encrypted data is unreadable until next login. Is this correct for background tabs, multi-user shared devices, and "remember me" session restore?
- **Relationship to CSP**: encrypted-at-rest without a CSP is defense-in-depth but does not close the primary XSS vector. A CSP without encryption does not protect data at rest. Should this ADR bundle a CSP decision, or treat them as complementary but separate?
- **Tor / non-HTTPS environments**: Web Crypto (`globalThis.crypto.subtle`) requires a secure context (HTTPS or localhost). Tor onion services serve over HTTP. Does Plebeian support Tor access, and if so, does encryption silently degrade to plaintext there?
- **Key rotation / recoverability**: if a user rotates their nostr key, encrypted wallets are unrecoverable — there is no backup or escrow. Acceptable, or do we need a recovery flow?

## Dependencies

- PR #1118 — contains `secureStorage.ts`, `secureStorage.test.ts` (14 tests), and the `wallet.ts` / `auth.ts` integration. The crypto is merge-ready; this ADR gates the key-management policy (especially the NIP-07 question) before it lands.
- Reference branch: `security/wallet-encryption` in the `felixfelix-bot/market` fork.
- A decision on the NIP-07 key-derivation question is the hard blocker — the rest of the implementation follows from it.

## Related

- PR #1074 (finding H8) — original audit finding
- PR #1118 — reference implementation (`src/lib/wallet/secureStorage.ts`)
- Issue #996 — security audit findings
- [Security Remediation Strategy](./security-remediation-strategy.md) — categorizes this as a Track A (ADR-gated) item
- Reference implementation preserved at `https://github.com/felixfelix-bot/market/tree/security/wallet-encryption`
