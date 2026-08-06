# docs(adr): propose e2e test stabilization strategy

> **Note:** This replaces #1175, which was accidentally closed when our fork was deleted and re-created. The branch and commits are identical. Conversation history is on #1175. Apologies to the team for the mix-up.

---

## Motivation

The e2e test suite has 20 spec files with unpredictable failures. Root causes identified: `networkidle` never resolves (NDK WebSocket), auth hydration races, relay propagation timing, NWC wallet state seeding. This ADR codifies the strategy to stabilize and maintain the suite going forward.

## What this ADR covers

- **networkidle migration policy** — all `waitForLoadState("networkidle")` replaced with `domcontentloaded` + element visibility assertion
- **Test unskip protocol** — 3 consecutive passing runs + cold restart before unskipping any test
- **Skip comment policy** — every `.skip` must have a comment explaining why and what needs to change
- **5-phase implementation** — prioritize by unblock potential (auth → cart → marketplace → payments → relay-dependent)
- **PR review readiness rule** — behavior-changing PRs must include a Playwright happy-path video before requesting review
- **PR #1116 history** — documents why the consolidated mega-PR exists (stacked chain was unwieldy to rebase) and proposes shaving off focused PRs as the path forward

## Numbering

Using ADR-XXX (unnumbered) to avoid collision. Maximotodev has an ADR-015 proposal in PR #1174. Number will be assigned when ready to merge.

## LLM context note

This ADR includes detailed analysis (root cause breakdowns, pass-rate tables, file references). This context is useful for LLM coding agents implementing the strategy in future PRs — they have the file layout, known issues, and rationale inline rather than rediscovering from the codebase.

@Franchovy @maximotodev — would appreciate your input on:
1. Whether the happy-path video requirement is practical for the team
2. Whether the 5-phase prioritization matches your view
3. Where ADR numbering should go (we have a gap: 0001, 0002, then 013, 014)
