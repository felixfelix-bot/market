# #1171 Architecture Change Brief — CVM Status + Pubkey Derivation
**For:** plebeian-my-prs sub-manager (implementation handover)
**From:** Team call decisions + codebase research
**Status:** Planning — ready for implementation when authorized

---

## TWO DECISION-LEVEL CHANGES FROM OPERATOR

### CHANGE 1: Resolve to CVM Status, Not Client-Side Derivation

**Current (WRONG):** `nip53.ts` derives live activity status from `start_at` and bidding cutoff timestamps on the client side.

**Correct approach:** Always resolve to CVM status.

**Logic:**
- If no CVM detected → there is NO live event (return null/empty)
- If CVM stops publishing/updating at expected frequency → show network error / live availability error
- Client must NOT derive start_at and bidding cutoff as start/end of live event
- The live event can ONLY work when CVM is present to host data and regularly update

**Reasoning:** Resolving status from client side without CVM connection is meaningless — there would be no CVM to serve the live activity data.

### CHANGE 2: Use Correct CVM Pubkey Derivation Chain

The CVM server pubkey used for identity enforcement MUST come from the same derivation path as all other CVM server pubkey derivations in the app.

---

## CODEBASE RESEARCH: THE EXISTING DERIVATION CHAIN

### Canonical Function: `resolveCvmServerPubkey()`

Exists in TWO identical copies (DRY violation — should be consolidated):

**Copy A:** `src/lib/cvm-identity.ts:22-35` (importable by anyone)
**Copy B:** `src/server/runtime.ts:52-64` (embedded in server runtime)

**Re-exported as alias:** `src/lib/constants.ts:135` → `CVM_SERVER_PUBKEY_RESOLVER`

### The Priority Chain (identical in both):

| Tier | Env Vars (OR'd) | Description |
|------|-----------------|-------------|
| **1** | `CVM_CURRENCY_SERVER_PUBLIC_KEY` \|\| `CURRENCY_SERVER_PUBKEY` | Service-specific (currency server) pubkey |
| **2** | `CVM_SERVER_PUBLIC_KEY` \|\| `CVM_SERVER_PUBKEY` | General CVM server pubkey |
| **3** | `CVM_SERVER_KEY` → `getPublicKey()` | Derive from CVM private key |
| **4** | — | **THROWS** — no hardcoded fallback |

Each tier validates with `/^[0-9a-fA-F]{64}$/` and falls through on invalid values.

### How the Pubkey Reaches the Browser:

```
Server: resolveCvmServerPubkey() [runtime.ts]
    ↓
HTTP:  /api/config → { cvmServerPubkey: "..." }  [src/server/http/config.ts:21]
    ↓
Query: fetchConfig() → configActions.setConfig()  [src/queries/config.tsx:18-27]
    ↓
Store: configStore.state.config.cvmServerPubkey    [src/lib/stores/config.ts:10]
    ↓
Consumers read: configStore.state.config.cvmServerPubkey
```

### All Consumers (browser-side):

| File:Line | Usage |
|-----------|-------|
| `src/queries/liveChat.tsx:32-40` | Filters NIP-53 live activity events by `authors: [cvmServerPubkey]`. **Fail-closed: returns null if missing.** |
| `src/queries/external.tsx:44` | Passes as `serverPubkey` to `PlebianCurrencyClient` for BTC price oracle |
| `src/publish/auctions.tsx:189-212` | `getAuctionAuditorsOrThrow()` — fallback auditor pubkey |
| `src/components/.../AuctionFormContent.tsx:76` | Form comment references config default |

### ContextVM Server Process (DIFFERENT path):
- `contextvm/server.ts:19` reads `process.env.CVM_SERVER_KEY` directly (does NOT use `resolveCvmServerPubkey`)
- Creates `PrivateKeySigner(SERVER_PRIVATE_KEY)` → `signer.getPublicKey()`

### Hardcoded Production Oracle:
- `src/lib/ctxcn-clients/PlebeianServerClient.ts:79`: `static readonly SERVER_PUBKEY = '29bd64...'`
- Used as fallback when `options.serverPubkey` not passed to `PlebeianServerClient`

---

## WHAT NEEDS TO CHANGE IN #1171

### Current state of `nip53.ts`:
- Does NOT import or reference `resolveCvmServerPubkey` or `cvmServerPubkey` anywhere
- Contains only pure functions: `deriveLiveActivityStatus()`, `resolveLiveActivityStatus()`, `parseLiveActivity()`, etc.
- The CVM author filtering happens in the CALLER (`liveChat.tsx:40`)

### Required changes:

**1. Status resolution (Change 1):**
- Remove or deprecate `deriveLiveActivityStatus()` (timestamp-based)
- `resolveLiveActivityStatus()` should NOT derive status from start_at/cutoff
- Instead: if no CVM-author event exists → no live activity (return inactive/error)
- If CVM event exists but is stale (not updated within expected frequency) → network/live availability error
- The "expected frequency" needs to be defined (what's the CVM update interval?)

**2. Pubkey derivation (Change 2):**
- The NIP-53 resolver should use the **same browser-side path** that `liveChat.tsx` already uses:
  - Read `configStore.state.config.cvmServerPubkey`
  - This value was resolved server-side by `resolveCvmServerPubkey()` and served via `/api/config`
- Do NOT add a new independent env-var read or hardcoded pubkey in the NIP-53 resolver
- The canonical chain is: env vars → `resolveCvmServerPubkey()` → `/api/config` → `configStore` → consumer

---

## INCONSISTENCIES TO FLAG

1. **DUPLICATE FUNCTION**: `resolveCvmServerPubkey()` copy-pasted in `cvm-identity.ts` and `runtime.ts`. If one diverges, tests won't catch it. Should be consolidated.

2. **NO APP PRIVATE KEY FALLBACK**: Operator mentioned "possibly falls back to app private key" — but the current code does NOT have this. Tier 4 throws instead. Either the operator's memory is slightly off, or this fallback was removed at some point.

3. **HARDCODED PRODUCTION PUBKEY**: `PlebeianServerClient.ts:79` has a hardcoded production oracle pubkey as fallback. This bypasses the env-var chain entirely.

4. **E2E STALE COMMENT**: `e2e/tests/cvm-config.spec.ts:29-32` references a "self-detection guard in `getCvmServerPublicKey()`" that no longer exists.

---

## POTENTIAL ADR: CVM PUBKEY DERIVATION PATTERN

Operator requested documenting this pattern as an ADR alongside CVM + NIP-53 functionality.

**Suggested ADR scope:**
- Document the 4-tier priority chain
- Establish rule: all CVM pubkey resolution MUST go through `resolveCvmServerPubkey()` or the `configStore` browser path
- Flag the DRY violation (two copies) as a transient violation to fix
- Document the `/api/config` → `configStore` browser flow
- Connect to NIP-53 live activities (CVM is source of truth for live event status)

---

## QUICK WINS (same session)

While implementing #1171 changes:
1. Fix prettier on #1171, #1164, #1165 (one `prettier --write` pass)
2. Close #1150 (dead — empty diff, maximotodev says close)
3. Rebase #1118 (security PR with hard merge conflict)

---

*Research verified against codebase at ~/repos/market. No files modified.*
