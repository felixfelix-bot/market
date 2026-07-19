# ADR: Payment Lifecycle State Machine (Phase Enums over Parallel Booleans)

## Status

Proposed

## Date

2026-07-17

## Related

- `AGENTS.md` §41–54 — payment lifecycle constraints (team's own documented standard)
- Fork issue #14 — full re-verified bug analysis with line numbers
- `src/lib/payments/proof.ts` — `PaymentProof` type, already a clean discriminated union
- `src/components/lightning/LightningPaymentProcessor.tsx` — the component being migrated
- Supersedes / refines: `ADR-003-phase-enums-over-parallel-boolean-flags.md` (2026-07-13)
- Upstream issues: #1064 (Architecture Audit), #1103 (pending state UX symptom), #1155

---

## 1. Context

`LightningPaymentProcessor.tsx` is **869 lines** of documented technical debt, not
an unknown issue. The team identified the anti-pattern independently and wrote it
down in **3 AGENTS.md files** before this analysis:

- Root `AGENTS.md` §41–44: _"Do not collapse payment lifecycles into booleans."_
- `src/AGENTS.md`: same constraint inherited.
- `src/queries/AGENTS.md`: same constraint inherited.

### Current state encoding (verified at upstream/master `8706d74a`)

The component tracks its payment lifecycle with **3 parallel `useState<boolean>`
flags** (L115–117) plus **5 refs**:

```typescript
const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false) // L115
const [isPaymentInProgress, setIsPaymentInProgress] = useState(false) // L116
const [isCheckingForReceipt, setIsCheckingForReceipt] = useState(false) // L117
const [manualPreimage, setManualPreimage] = useState('') // L118
const hasCompletedRef = useRef(false) // L122
// + hasRequestedInvoiceRef, monitoring refs, etc.
```

With N independent booleans, the type system permits `2^N` states, but only
`N + 1` are valid. For 3 flags that is 8 reachable states vs. 4 meaningful —
the remaining 4 are bugs waiting to happen, and the component already exhibits
6 of them.

### The constraint the code violates

`AGENTS.md` §41 lists ten distinct payment lifecycle states that must be kept
distinct: _requested, attempted, wallet acknowledged, settled/proven, receipt
published, merchant confirmed, expired, failed, refunded, fulfilled_. §45 adds:
_"Do not equate wallet acknowledgement, receipt publication, zap presence, or an
external payment marker with settlement."_ Three booleans cannot represent ten
ordered states — they conflate them by construction.

### Bugs found in the current code

All 6 bugs below were **re-verified present** at `8706d74a` (fork issue #14):

| #   | Severity                      | Bug                                                                                                                                                                                                  | Lines                     |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | MEDIUM (real Bitcoin at risk) | `requireZapReceipt` limbo / double-pay race. Sets `isPaymentInProgress(false)` and returns while zap monitor still pending — pay button re-enables on a live invoice.                                | 387–391, 458–462, 523–527 |
| 2   | LOW                           | Stale-flag window. `setIsCheckingForReceipt` flips independently of `isPaymentInProgress` from different callbacks; a frame exists where both are false but payment is live.                         | —                         |
| 3   | LOW                           | Settlement conflation (wallet_ack = settled). 3 call sites equate wallet acknowledgement with settlement, violating §45.                                                                             | 398, 469, 534             |
| 4   | MEDIUM                        | Re-entry after failure. `hasCompletedRef` guards success but not failure; failed NWC path resets `isPaymentInProgress=false` without marking terminal.                                               | L122 + NWC failure path   |
| 5   | LOW                           | Manual-verify blind spot. `manualPreimage` state (L118) exists but no boolean reflects "awaiting manual confirmation." UI gating depends on side checks.                                             | L118                      |
| 6   | LOW                           | `handleSkipPayment` partial cleanup. Resets `isPaymentInProgress` and stops zap monitoring but NOT `isGeneratingInvoice`, `isCheckingForReceipt`, `hasCompletedRef`, or `invoice`.                   | 603–611                   |
| +   | MEDIUM                        | No invoice expiry handling anywhere (`grep -i expir` returns zero). BOLT11 invoices carry a ~600s expiry; QR path accepts attempts against expired invoices and background monitoring waits forever. | —                         |

---

## 2. Decision

Lifecycle phases in `LightningPaymentProcessor` will be modeled as a single
**`PaymentPhase` discriminated union** (10 phases, exact TypeScript). The three
booleans become derived selectors; a single `useReducer` is the only mutation
point.

```typescript
type PaymentPhase =
	| { kind: 'idle' }
	| { kind: 'invoice_requested' }
	| { kind: 'invoice_ready'; bolt11: string }
	| { kind: 'attempting'; method: WalletPaymentMethod | 'webln' | 'manual' }
	| { kind: 'wallet_acked'; method: WalletPaymentMethod; atMs: number }
	| { kind: 'awaiting_receipt' }
	| { kind: 'settled'; proof: PaymentProof }
	| { kind: 'failed'; reason: PaymentFailure }
	| { kind: 'expired' }
	| { kind: 'fulfilled' }

const [phase, dispatch] = useReducer(paymentReducer, { kind: 'idle' })
```

### Why discriminated union (not string enum, not booleans)

- **Impossible states are unrepresentable.** The compiler rejects
  `isGeneratingInvoice && isPaymentInProgress` because no single phase carries
  both — there is no "between flags" frame (Bug 2 structurally impossible).
- **Each phase carries its own payload.** `attempting` carries `method`
  (eliminates a parallel `paymentMethod` variable and the Bug 5 blind spot);
  `settled` carries `proof: PaymentProof` (eliminates Bug 3 conflation —
  reaching `settled` now requires actual proof, not a `wallet_ack` marker);
  `failed` carries `reason`.
- **Exhaustive checking.** `switch (phase.kind)` produces a compile error when
  a new phase is added but a consumer is not updated — adding `expired` is
  forced through every render branch.
- **Aligns with `src/lib/payments/proof.ts`**, which is already a clean
  discriminated union on `type`. `PaymentPhase` reuses `PaymentProof` directly
  in the `settled` variant rather than re-deriving it.

This supersedes the 7-phase sketch in ADR-003 (2026-07-13) by adding
`invoice_requested`, `awaiting_receipt`, `expired`, and `fulfilled` to fully
cover the §41 state list and the gaps that produced Bugs 1, 3, 5, and the
expiry finding.

---

## 3. Rule for future code

> **Any component with 3+ `useState<boolean>` flags that collectively represent
> phases of a single lifecycle MUST use a discriminated union type instead.**

Two flags may be permitted if they are genuinely orthogonal (e.g., `isExpanded`
and `isLoading` on unrelated concerns). Three or more flags that describe a
sequential process must be consolidated.

This makes the existing `AGENTS.md` §41 constraint — _"Do not collapse payment
lifecycles into booleans"_ — **mechanically enforceable**: the type system
rejects impossible states rather than relying on reviewer convention. It applies
to every component touching payment flows, not just
`LightningPaymentProcessor`.

---

## 4. Bug Prevention Table

Every confirmed bug maps to a structural prevention mechanism in the new state
machine — the fix is in the types, not in discipline.

| Bug                                                  | Severity | Prevention mechanism                                                                                                                                                             |
| ---------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** double-pay race (L387–391, 458–462, 523–527)   | MEDIUM   | Reducer only allows `attempting` from `invoice_ready`. While in `awaiting_receipt`, dispatch is a no-op. Pay button cannot re-arm on a live invoice.                             |
| **2** stale-flag window                              | LOW      | Single phase value — no "between flags" frame is representable.                                                                                                                  |
| **3** settlement conflation (L398, 469, 534)         | LOW      | `wallet_acked` is distinct from `settled`. Reaching `settled` requires a `PaymentProof` (preimage / zap receipt), not a `wallet_ack` marker. Directly satisfies `AGENTS.md` §45. |
| **4** re-entry after failure                         | MEDIUM   | `failed` is terminal. Recovery requires an explicit `reset` action — no boolean to flip back. `hasCompletedRef`'s failure-side gap is eliminated.                                |
| **5** manual-verify blind spot (L118)                | LOW      | `attempting` with `method: 'manual'` covers it. Button gated on `phase.kind === 'invoice_ready'`, so "awaiting manual confirmation" is a real phase, not a side check.           |
| **6** `handleSkipPayment` partial cleanup (L603–611) | LOW      | Terminal states no-op. Skip dispatches a terminal phase (`fulfilled` or `failed`); there is no partial boolean set to forget.                                                    |
| **+** no invoice expiry handling                     | MEDIUM   | `expired` is terminal. An invoice-expiry timer dispatches it; background monitoring keys off `phase.kind` and stops cleanly.                                                     |

---

## 5. Scope Clarification

`AGENTS.md` §41 enumerates **10** lifecycle states. Not all of them belong in
`LightningPaymentProcessor` — that component tracks the **client-payment**
layer, not the merchant/server-side order consensus layer. Splitting them
correctly is what keeps the `PaymentPhase` union at 10 variants without
overreaching into order-state that this component cannot authoritatively set.

| Layer                   | §41 states                                                                 | Owner                                                        |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Client-payment** (6)  | requested, attempted, wallet acknowledged, settled/proven, expired, failed | `LightningPaymentProcessor` — what this ADR covers           |
| **Order consensus** (4) | receipt published, merchant confirmed, refunded, fulfilled                 | server / order reducer — _not_ client UI to set unilaterally |

The `fulfilled` variant appears in `PaymentPhase` because the client may
_observe_ it (skip / merchant-confirmed), but it is driven by order-layer
events, not by a local boolean. Conflating the two layers is itself a §45
violation — this split prevents it.

---

## 6. Test Coverage Gap

**This is the dominant risk factor for any refactor.** Only the **WebLN happy
path** is covered by e2e (`e2e/tests/order-lifecycle.spec.ts`). The following
are completely untested:

- NWC payment path
- NIP-60 payment path
- Manual preimage entry
- All failure paths
- Invoice expiry
- Double-pay / re-entry guards

No unit tests exist for `LightningPaymentProcessor`. Before the booleans are
removed (PR 3 below), each phase transition must have at least one test —
otherwise the refactor substitutes one set of unverified behaviors for another.

---

## 7. Recommended Approach

**Option B — incremental, ~120 lines of change.** Add the `PaymentPhase`
reducer alongside the existing booleans, drive **one** method path (NWC) end to
end through it, verify tests, then remove the booleans. No public API surface
change.

**Explicitly NOT Option C (full rewrite).** A full rewrite is not safe until
test coverage exists for each phase transition (see §6). Rewriting 869 lines
behind a single happy-path e2e test would trade known bugs for unknown ones.

Rationale: the bug set is severe but bounded (6 bugs + expiry), the type
contract is local to one component, and the AGENTS.md constraint is already
documented — so the migration is about _enforcing_ the rule, not deciding it.

---

## 8. PR Sequence

Five incremental PRs, each independently mergeable and reviewable. The order is
load-bearing: **types first, reads second, writes last, audit at the end.**

### PR 1 — Define `PaymentPhase` type and reducer (no behavior change)

Introduce the `PaymentPhase` union and `paymentReducer` alongside the existing
booleans. Add a transitional `dispatch` wrapper that also sets the legacy
booleans as a mirror. Zero behavior change; CI must stay green.

### PR 2 — Migrate read sites

Replace every `isGeneratingInvoice` / `isPaymentInProgress` /
`isCheckingForReceipt` read in JSX and effects with `phase.kind === ...`
checks. Booleans become write-only mirrors during this PR. Add unit tests for
the NWC path through the reducer.

### PR 3 — Migrate write sites and remove booleans

Replace all `setIsGeneratingInvoice(true)` etc. with `dispatch(...)`. Remove
the three boolean state variables and the transitional bridge. Evaluate
whether `hasCompletedRef` (L122) can be replaced by `phase.kind === 'settled'`.

### PR 4 — Enrich phase payloads and add expiry handling

Move `paymentMethod` into the `attempting` variant. Wire the invoice-expiry
timer to dispatch `expired` (closes the "+ expiry" finding). This PR is where
Bugs 1, 3, 5, and expiry are structurally closed.

### PR 5 — Audit other components for the 3-flag anti-pattern

Search the codebase for components with 3+ `useState<boolean>` flags and
evaluate whether they represent lifecycle phases. File issues for any that
should be migrated under the §3 rule. Extends the constraint beyond
`LightningPaymentProcessor`.

---

## Notes

- `AGENTS.md` §41 itself states: _"Do not use AGENTS text as proof that
  behavior already exists."_ The code does not yet comply with the constraint
  it documents. This ADR is the implementation plan to close that gap.
- This ADR refines ADR-003 (2026-07-13): it adopts ADR-003's 7-phase sketch,
  extends it to 10 phases using the re-verified bug findings from fork issue
  #14, and adds the bug-prevention and scope-clarification sections ADR-003
  lacked.
- `src/lib/payments/proof.ts` is referenced because `PaymentProof` is the
  existing discriminated-union precedent in this repo — `PaymentPhase` follows
  the same shape rather than inventing a new pattern.
