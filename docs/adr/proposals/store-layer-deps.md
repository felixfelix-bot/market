Note: Recreated from #1165 (original PR was orphaned due to fork repository recreation).

## Motivation

Five store files under \`src/lib/stores/\` import upward into \`@/queries/*\` and \`@/publish/*\`, creating bidirectional coupling and circular dependencies. The most severe case is \`cart.ts\` (1,892 lines) which imports from 6 query modules, 1 publish module, creates a private \`QueryClient\` (causing double-fetching and invisible cache), and has a type-level circular dependency with \`queries/v4v.tsx\`.

There is no ESLint configuration in the project at all, so nothing prevents new violations. The query-to-store direction (~27 files, ~31 import lines) is architecturally correct and unrestricted. The problem is solely the 5 store files importing back upward.

This ADR establishes three rules to make the dependency graph acyclic:
1. Stores must not import from queries or publish
2. Shared DTOs must live in \`@/lib/types/\` (breaks the type cycle)
3. No private QueryClient in stores (eliminates double-fetching and invisible cache)

## What this ADR covers

- Three layering rules with a clear diagram (UI -> Queries/Stores -> Services -> Core)
- Two remediation patterns: DI (Pattern A, for <=3 upward calls) and Service Layer (Pattern B, for >3 calls or private QueryClient)
- ESLint enforcement plan: no-restricted-imports, no-restricted-syntax, dependency-cruiser
- Interim CI grep check until ESLint is adopted
- 4-phase migration path (ESLint setup -> break type cycle -> kill private QueryClient -> migrate 5 stores)
- Cart service-layer extraction proposal: 1,892 lines -> ~1,330 across 9 focused files
- Additional findings: dead code (useCartTotals), stub returning null (getBuyerPubkey), shipping logic triplicated, product.ts has 2 query imports

## A note on verbosity

This ADR became much more verbose than originally intended. The additional findings section (dead code, stubs, triplicated logic), the cart service-layer file layout with line counts, and the detailed violation table with per-store line counts all grew out of a thorough analysis of the store layer. This additional information could be useful for the future PRs that implement the dependency rules and refactor the stores. However, it may be that some of this detail belongs elsewhere rather than in the ADR itself.

@Franchovy -- do you have an idea where this kind of analysis context belongs? Options:

1. Keep it in the ADR -- the violation table, remediation patterns, and file layout are part of the architectural decision
2. Move to a separate analysis doc -- the ADR stays concise, the detailed analysis lives in a companion document
3. Move to PR comments or issues -- the analysis is implementation guidance, not architecture

One consideration: if we keep this context as part of the ADR or the docs, it persists even if we lose access to GitHub. If we keep it in PR comments or issues, it is less persistent and we end up with context split across two different places.

## Files

- \`docs/adr/ADR-XXX-store-layer-dependency-rules.md\` (new)

The \`XXX\` numbering is a placeholder, happy to assign a final ADR number wherever it fits in the sequence.

## Related

- AGENTS.md sections 37-38 (state-type separation)
- ADR-0002 (Strangler-fig I/O migration -- stores benefit from clean layering during module-by-module migration)
- Related to the phase enums ADR (same \`cart.ts\` file, different concern)
