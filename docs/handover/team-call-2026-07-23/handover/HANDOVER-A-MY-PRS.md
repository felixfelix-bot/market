# HANDOVER A — PR #1171 Architecture Changes Brief

**Date:** 2026-07-24
**Author:** Felix
**PR:** [#1171](https://github.com/PlebeianApp/market/pull/1171) — feat(nip53): status resolver with hard time boundaries + CVM identity enforcement
**Status:** Open, awaiting review. Two decision-level changes from operator (below).

---

## Decision-Level Changes Required

### CHANGE 1: Client-side status resolution must defer to CVM status entirely

**Current implementation (WRONG):**
`resolveLiveActivityStatus()` in `src/lib/nip53.ts:47-66` treats auction `start_at` and `biddingCutoffAt` as hard boundaries. If the current time is outside those bounds, the client overrides the relay status:

```
t < start_at          → always "planned" (even if relay says "live")
t >= biddingCutoffAt  → always "ended"   (even if relay says "live")
within bounds         → trust relay status
```

**Operator's directive:**
The client must NOT derive start/end of the live event from auction timestamps. The live event only works when the CVM hosts and updates data. The correct logic:

1. **If no CVM live activity event detected** → there is no live event. Do not show chat. Do not derive status from timestamps.
2. **If CVM live activity detected** → use its `status` tag as authoritative. Period. No client-side timestamp overrides.
3. **If CVM stops publishing at expected frequency** → show a network/live availability error (e.g., "Chat may be unavailable — CVM connection issue"). This is a health concern, not a status override.

**Why:**
The CVM worker (`contextvm/tools/live-activity-worker.ts`) already computes status from `start_at` / `max_end_at` and publishes it. The client duplicating that logic introduces two sources of truth. If the CVM says "live" but the client's clock or tag parsing says "ended", the chat disappears while the CVM is still actively hosting. The CVM's status tag is the authority because only the CVM knows whether it can actually serve the chat.

**Code changes needed:**

| File                                     | Current                                                                            | Required                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/lib/nip53.ts:47-66`                 | `resolveLiveActivityStatus()` overrides relay status with timestamp boundaries     | **Remove timestamp override logic.** Return CVM status as-is if present. If absent, return null or a health error.    |
| `src/components/LiveChatPanel.tsx:50-54` | Calls `resolveLiveActivityStatus(liveActivity?.status, startsAt, biddingCutoffAt)` | Use `liveActivity?.status` directly. If `liveActivity` is null, chat is unavailable. Add staleness check (see below). |
| `src/queries/liveChat.tsx`               | Returns `LiveActivity \| null`                                                     | Add last-updated timestamp tracking for staleness detection.                                                          |
| `src/queries/__tests__/liveChat.test.ts` | 8 tests for boundary logic                                                         | Replace with: no-CVM → null test, CVM-present → trust-status tests, stale-CVM → health-error test                     |

**Staleness detection (new):**
Add a check in `useLiveActivity` or `LiveChatPanel`:

- Track `liveActivity.updatedAt` (from event `created_at` or a `updated` tag).
- If `now - updatedAt > staleThreshold` (e.g., 2× poll interval), show a health warning: "Chat may be experiencing connectivity issues."
- This is a UI warning, NOT a status override. The CVM status tag stays as-is.

**`deriveLiveActivityStatus` stays in `nip53.ts`** — it's still used by the CVM worker server-side. Only the client-side `resolveLiveActivityStatus` wrapper is removed/simplified.

---

### CHANGE 2: CVM pubkey must use existing derivation chain

**Operator's priority chain:**

```
CVM server live activity pubkey  (service-specific)
  → CVM server pubkey            (general)
    → CVM server private key     (derive via getPublicKey)
      → app private key          (fallback)
```

**Existing implementation found — `resolveCvmServerPubkey()`:**

Defined in **two places** (duplicate code):

1. **`src/server/runtime.ts:52-65`** — CANONICAL, used at runtime by `/api/config`
2. **`src/lib/cvm-identity.ts:22-35`** — duplicate, re-exported from `src/lib/constants.ts:135`

```ts
export function resolveCvmServerPubkey(): string {
	// TIER 1: service-specific pubkey
	const servicePubkey = process.env.CVM_CURRENCY_SERVER_PUBLIC_KEY || process.env.CURRENCY_SERVER_PUBKEY
	if (servicePubkey && isValidHexPubkey(servicePubkey)) return servicePubkey

	// TIER 2: general CVM server pubkey
	const generalPubkey = process.env.CVM_SERVER_PUBLIC_KEY || process.env.CVM_SERVER_PUBKEY
	if (generalPubkey && isValidHexPubkey(generalPubkey)) return generalPubkey

	// TIER 3: derive from private key
	const privateKey = process.env.CVM_SERVER_KEY
	if (privateKey && isValidHexPubkey(privateKey)) {
		return getPublicKey(hexToBytes(privateKey))
	}

	// TIER 4: THROW (no app-key fallback)
	throw new Error('No CVM server pubkey available...')
}
```

**Critical discrepancy:**
The operator's 4th tier ("→ app private key") **does not exist**. Current code throws when no CVM key material is found. The old app-key comparison was deliberately removed — documented in `src/lib/__tests__/cvm-server-key.test.ts:69-71`:

> "The old code rejected keys matching APP_PRIVATE_KEY. The new code allows it — there's no comparison anymore."

**Decision needed from operator:** Should we reintroduce the app-private-key fallback tier? If yes:

- Import `getAppPrivateKey()` or `APP_PRIVATE_KEY` from `src/lib/constants.ts`
- Add tier 4 before the throw
- This would allow dev/test environments without dedicated CVM keys

**Our PR #1171 already uses the existing chain correctly:**
`src/queries/liveChat.tsx:32-40` reads `configStore.state.config.cvmServerPubkey`, which is hydrated from `/api/config` → `resolveCvmServerPubkey()`. This is the right path. No change needed to the fetch logic itself.

**Recommended action:**

1. Consolidate duplicate `resolveCvmServerPubkey` — delete `src/lib/cvm-identity.ts`, keep `src/server/runtime.ts` as single source.
2. If operator confirms app-key fallback: add tier 4.
3. If operator says no fallback: leave as-is (throws), which is our current behavior.
4. Document tier 1+2 env vars in `.env.local.example` (currently undocumented).

---

## Quick Wins (can be done immediately)

### 1. Prettier fix on NIP-53 stack (#1171, #1172, #1173)

CI is failing on prettier check. Files needing format:

- `src/components/LiveChatPanel.tsx`
- `src/queries/__tests__/liveChat.test.ts`

Fix: `prettier --write` on affected files, amend or new commit, force-push all 3 branches.

### 2. Prettier fix on ADR PRs (#1164, #1165)

Same issue — prettier formatting on `.md` files. Run `prettier --write docs/adr/*.md` on each branch.

### 3. Close #1150

`perf/auction-query-parallelize-v2` has **0 files changed, 0 additions, 0 deletions**. The entire implementation was reverted after maximotodev's review. CI is green but validates the base branch, not our changes. maximotodev confirmed: "PR now has no net changes... title and description no longer describe the live diff."

Action: Close with comment explaining the revert. If performance work is still wanted, start fresh with maximotodev's guidance: settlement-specific concurrency tests, not route-level composite.

---

## Infrastructure PR Status

### #1115 — Aggregator relay consolidated → master

- **22 files, +2996/-3.** CI fully green (all 5 checks pass).
- **20 days old.** No reviews, no inline comments.
- **Content:** Khatru + scraper + app wiring for consolidated aggregator relay.
- **Recommendation:** Ping maximotodev/Franchovy for review. PR is large but self-contained and CI-green. No action needed on our side — this is waiting on maintainer bandwidth.

### #1116 — e2e+test reliability → master

- **209 files, +34944/-1037.** CI fully green.
- **19 days old.** No reviews.
- **Content:** CI prettier fix, bun test isolation, networkidle elimination, auth/cart/WebLN reliability.
- **Recommendation:** This is the largest PR in the queue. 209 files is a heavy review burden. Consider:
  - Option A: Ask for a focused review on the highest-impact subset (test isolation + prettier).
  - Option B: Split into 2-3 smaller PRs (CI fixes, e2e reliability, test infrastructure).
  - Option C: If maintainer is OK with the scope, request bulk review with a summary of what changed by category.
- **No conflicts.** Mergeable.

### #1118 — SHA-pin workflows → master

- **23 files, +1005/-106.** CI green on last run.
- **17 days old.** mergeStateStatus: **DIRTY** (conflicts with master).
- **Content:** SHA-pins all remaining GitHub Actions across deploy + release workflows.
- **Recommendation:** Needs rebase to resolve conflicts. Small, mechanical PR — once rebased, should be quick to merge. The SHA-pinning is a security best practice that maintainers typically accept quickly.

---

## Summary Table

| PR    | Branch                     | Target   | CI            | Review            | Size      | Action                             |
| ----- | -------------------------- | -------- | ------------- | ----------------- | --------- | ---------------------------------- |
| #1171 | nip53-status-resolver      | auctions | prettier FAIL | none yet          | 4 files   | Implement CHANGE 1+2, fix prettier |
| #1172 | nip53-reactions            | auctions | no checks     | none              | 6 files   | Fix prettier after #1171 rebases   |
| #1173 | nip53-cvm-commentator      | auctions | no checks     | none              | 8 files   | Fix prettier after #1172 rebases   |
| #1164 | adr-phase-enums            | master   | prettier FAIL | none              | 1 file    | Fix prettier                       |
| #1165 | adr-store-layer            | master   | prettier FAIL | none              | 1 file    | Fix prettier                       |
| #1175 | adr-e2e-test-stabilization | master   | no checks     | none              | 1 file    | Fix prettier                       |
| #1176 | adr-relay-data-validation  | master   | no checks     | none              | 1 file    | Fix prettier                       |
| #1177 | adr-error-boundary         | master   | no checks     | none              | 1 file    | Fix prettier                       |
| #1150 | auction-query-parallelize  | auctions | green         | CHANGES_REQUESTED | 0 files   | Close                              |
| #1115 | aggregator-relay           | master   | green         | none              | 22 files  | Ping for review                    |
| #1116 | test-infra-e2e             | master   | green         | none              | 209 files | Consider splitting                 |
| #1118 | sha-pin-workflows          | master   | green         | none              | 23 files  | Rebase to fix conflicts            |

---

## Next Steps (Priority Order)

1. **Implement CHANGE 1** — rewrite `resolveLiveActivityStatus` to defer to CVM status. Remove timestamp overrides. Add staleness health check. Update tests.
2. **Resolve CHANGE 2** — get operator decision on app-key fallback tier. Consolidate duplicate `resolveCvmServerPubkey`.
3. **Fix prettier** on all affected branches — one `prettier --write` pass per branch.
4. **Close #1150** — empty diff, dead PR.
5. **Rebase #1118** — resolve conflicts, unblock merge.
6. **Ping for reviews** on #1115 and #1116.
