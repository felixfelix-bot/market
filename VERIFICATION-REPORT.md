# Verification report — t_ceca3484 encrypt-at-rest & logout wipe

Branch: chore/cashu-seed-encryption @ de311eb5 (fork/chore/cashu-seed-encryption)
Env:  unit/build/E2E + runtime sim run on DQ05 (ssh dq05) per offload instruction
Date: 2026-09-10

## Summary

All four original audit findings are CLOSED **at the code level** — no wallet
secret is written to localStorage as plaintext anymore, and logout wipes
everything. The full unit suite is green and the build passes.

HOWEVER, verification surfaced a **BLOCKER**: the at-rest encryption vault is
never unlocked in production. `unlock()` has no production call site, so every
`setSecret`/`getSecret`/`migrateLegacy` throws `VaultError('Vault is locked')`
at runtime. This both (a) breaks wallet persistence/login-remember and (b)
leaves the *migration* path dead — legacy plaintext secrets are never
re-encrypted (see NEW FINDING below).

Acceptance criteria are NOT met: the suites are green but a residual
plaintext-secret path (legacy migration) is non-functional at runtime, and the
NIP-46 persist path fails. Per the task instruction, this is reported as a new
finding, not silently patched.

## Finding closure (code-level, at merged HEAD)

1. Cashu seed (was src/lib/stores/cashu.ts:53-72)
   CLOSED at code level. src/lib/stores/cashu.ts:78/82/93 route all
   reads/writes through the vault (`migrateLegacy` → `getSecret` → `setSecret`).
   `cashu_wallet_seed_*` holds only the AES-GCM envelope.
   Test: src/lib/__tests__/cashu.test.ts.
   RUNTIME CAVEAT: `getSecret`/`setSecret` throw when vault locked → wallet
   init fails in production.

2. NWC URI incl. spending secret (was src/lib/stores/wallet.ts:195)
   CLOSED at code level. src/lib/stores/wallet.ts:183 `migrateLegacy`,
   :187 `getSecret`, :214 `setSecret(NWC_WALLETS_KEY, ...)`. `nwc_wallets`
   holds only the envelope.
   Test: wallet.test.ts.
   RUNTIME CAVEAT: `setSecret` (fire-and-forget `.catch`) throws → wallets
   never persisted in production; `migrateLegacy` throws → legacy plaintext
   stays plaintext.

3. NIP-46 local signer key (was src/lib/auth.ts:68 + :466)
   CLOSED at code level. src/lib/stores/auth.ts:74-75 `migrateLegacy` +
   `getSecret` on load; :284 `setSecret` on save. No plaintext write path.
   RUNTIME CAVEAT: auth.ts:284 `void setSecret(...)` fires-and-forgets and
   catches errors → signer key never persisted when vault locked (confirmed by
   existing E2E truthy assertion expectation + runtime sim).

4. Logout wipe (was src/lib/auth.ts:488-500)
   CLOSED. src/lib/crypto/vault.ts:285 `wipeWalletSecrets()` removes the
   registered keys (signer key, bunker URL, ncryptsec key, nwc_wallets, every
   cashu_wallet_seed_*) + vault envelope, and locks the in-memory key.
   Registered in auth.ts:23-25, wallet.ts:14, cashu.ts:23. Called from
   auth.ts:318 logout. Test: wipe.test.ts (incl. multi-pubkey).
   NOTE: wipe works INDEPENDENTLY of unlock (raw localStorage.removeItem), so
   logout still functions.

5. Migration path (legacy plaintext → envelope → plaintext removed)
   Covered and green by unit tests — but those tests call `unlock()` in
   beforeEach. In production (vault never unlocked) `migrateLegacy` throws,
   so legacy plaintext is NEVER migrated. See NEW FINDING.

## Suite results (DQ05, at de311eb5)

- Full unit suite: 396 pass / 0 fail (33 files, 1184 expect calls). ✔
- Build: green (exit 0). ✔
- Targeted encryption tests: 26 pass / 0 fail. ✔
- git diff --check: clean on changed files. ✔
- E2E NIP-46 auth test: FAILS before reaching the localStorage assertion
  (relay `mute: no one was listening` publish race — documented pre-existing
  family), so cannot empirically pass the signer-key-persisted assertion.

## NEW FINDING (BLOCKER) — vault never unlocked in production; migration dead

Severity: BLOCKER. The at-rest encryption breaks the running app.

- `unlock()` (vault.ts:193) has NO production call site. Repo-wide grep for
  `unlock(` returns only the vault definition and `__tests__/*.test.ts`.
  There is no unlock dialog, boot gate, or SessionUnlock wiring anywhere in
  `src/` on this branch.
- `setSecret`/`getSecret`/`migrateLegacy` (vault.ts:216/226/245) all call
  `requireSessionKey()` (vault.ts:205) which throws when not unlocked.
- Runtime simulation (vault locked, the production state) empirically:
  - `setSecret` → throws `Vault is locked — unlock with a passphrase first`
  - `getSecret` → throws (same)
  - `migrateLegacy('nwc_wallets')` on a plaintext wallet with a spending
    secret → throws AND the plaintext persists with the spending secret
    intact (`nwc_wallets persists PLAINTEXT with spending secret: true`).
- Because unit tests `await unlock()` in beforeEach, the green suite never
  exercises the real (locked) runtime — a test-harness blind spot.

Impact per secret path (production):
- Cashu seed: `getOrCreateSeed` → `migrateLegacy`/`getSecret` throw → wallet
  never initializes (status stuck in `error`).
- NWC: wallets load → `getSecret` throws → `loadWalletsFromLocalStorage`
  returns `[]`; save → `setSecret` throws (caught) → nothing persisted.
- NIP-46 signer key: `setSecret` throws inside fire-and-forget → signer key,
  and therefore auto-login persistence, never persists.
- Legacy migration: NEVER runs → existing plaintext secrets remain plaintext
  at rest (the original vulnerability is not actually remediated for current
  users until the vault is unlocked).

Recommended fix (follow-up task): wire a passphrase unlock flow in production
that calls `vault.unlock()` before any wallet/auth operation — e.g. port the
SessionUnlockDialog approach from the `adr0008/b3-vault` branch, or unlock
synchronously at app boot before the auth/wallet/cashu stores read/write.
The fix belongs in a new child task, not a silent patch here (per the task
instruction to report new findings).

## Verdict

NOT READY / needs follow-up. The encryption implementation is correct in
isolation and the original findings are code-closed, but the missing unlock
wiring is a BLOCKER that breaks runtime wallet persistence and leaves legacy
plaintext unmigrated. Reported as a new finding; no code was silently patched
in this verification task.
