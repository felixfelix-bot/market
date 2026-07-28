# docs(adr): propose relay data validation enforcement

> **Note:** This replaces #1176, which was accidentally closed when our fork was deleted and re-created. The branch and commits are identical. Conversation history is on #1176. Apologies to the team for the mix-up.

---

## Motivation

AGENTS.md states: "Treat relay data as untrusted until validated." This constraint has **no enforcement mechanism**. Audit found:

- **9 query files** doing raw `JSON.parse(event.content)` with zero schema validation
- **3 component files** doing the same in render paths (crashes the SPA on malformed data)
- Only **4 `safeParse()`** calls vs **59 raw `.parse()`** calls (parse throws on invalid)
- Only **9 Zod schema files** for ~25+ Nostr kinds consumed

This is security-relevant: relays accept events from anyone. Malformed or adversarial events can crash queries, poison component state, or cause render-time exceptions.

## What this ADR covers

- **Rule**: All `event.content` parsing MUST go through a Zod `safeParse` gate before entering query results or component state
- **Enforcement**: ESLint custom rule + code review checklist
- **Migration path**: schema files added per Nostr kind, prioritized by criticality (payment kinds first)
- **Connection to ADR-0002**: applesauce validation primitives can replace raw JSON.parse as migration progresses
- **Current violations table**: 12 specific file:line references — entries removed as PRs fix each one

## ADR structure pattern

This ADR follows a two-section pattern:

- **Upper section** (permanent): defines the validation rule and rationale — stays even after all violations are fixed
- **Lower section** (transient): "Current Violations" table with specific file:line refs — entries removed as PRs fix each one

This prevents ADRs from going stale after migration is complete.

@Franchovy @maximotodev — input welcome on:

1. Whether `safeParse` (graceful degradation) vs `parse` (throw on invalid) is the right default
2. Whether strict schema (reject unknown fields) or passthrough (validate known fields, allow extras) fits the project better
3. Whether the ESLint enforcement approach is feasible
