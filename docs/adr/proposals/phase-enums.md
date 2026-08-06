Note: Recreated from #1164 (original PR was orphaned due to fork repository recreation).

## Motivation

The root AGENTS.md (lines 41-47) already establishes the constraint: "Do not collapse payment lifecycles into booleans." This constraint appears in 6 of 12 AGENTS.md files across the repository.

However, the guidance does not specify a concrete type-level pattern for how to model these states. The most prominent violation remains in production: LightningPaymentProcessor (869 lines) tracks its payment flow with three independent useState<boolean> flags, permitting 2^3 = 8 reachable states when only 4 are meaningful. The remaining 4 are impossible states that produce bugs, including a MEDIUM-severity double-pay race where the pay button re-enables on a live invoice.

This ADR makes the existing constraint mechanically enforceable by specifying a discriminated union (phase enum) pattern. The type system rejects impossible states rather than relying on reviewer convention.

## What this ADR covers

- The PaymentPhase discriminated union type (7 phases)
- A rule for future code: any component with 3+ boolean useState flags representing lifecycle phases MUST use a discriminated union
- Bug prevention table mapping 6 confirmed bugs + invoice expiry gap to structural prevention mechanisms
- Scope clarification: client-payment layer (6 states) vs order-consensus layer (4 states)
- Test coverage gap analysis
- A 5-PR incremental rollout sequence (types first, reads second, writes last)

## A note on verbosity

This ADR became much more verbose than originally intended. The bug prevention table, scope clarification, and test coverage gap sections grew out of a detailed analysis of LightningPaymentProcessor. This additional context could be useful for the future PRs that implement the phase enum and fix the bugs it prevents. However, it may be that some of this detail belongs elsewhere rather than in the ADR itself.

@Franchovy -- do you have an idea where this kind of analysis context belongs? Options:

1. Keep it in the ADR -- the bug prevention table and scope clarification are part of the architectural decision and belong with it
2. Move to a separate analysis doc -- the ADR stays concise, the detailed analysis lives in a companion document
3. Move to PR comments or issues -- the analysis is implementation guidance, not architecture

One consideration: if we keep this context as part of the ADR or the docs, it persists even if we lose access to GitHub. If we keep it in PR comments or issues, it is less persistent and we end up with context split across two different places.

## Files

- docs/adr/ADR-XXX-phase-enums-over-parallel-boolean-flags.md (new)

The XXX numbering is a placeholder, happy to assign a final ADR number wherever it fits in the sequence.

## Related

- Reinforces AGENTS.md lines 41-47 (payment lifecycle constraint)
- Related to ADR-0002 (NDK-to-Applesauce I/O migration, stores benefit from clean state modeling)
