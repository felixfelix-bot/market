# Security Remediation Strategy: ADR-Gated vs Direct Implementation

## Status
Proposal — not yet surfaced to team

## Problem

A security audit (issue #996) identified eight HIGH-severity findings (H1–H8) across the Plebeian Market codebase. The initial response bundled all eight fixes into a single PR (#1118). That PR was closed because bundling unrelated security concerns into one diff creates excessive cognitive load for reviewers, mixes architectural decisions with mechanical fixes, and forces a single approve/reject vote on changes that have very different risk profiles and dependency chains.

The deeper issue is that not all eight findings are the same *kind* of work. Some involve access-control policy, key-management strategy, or trust-boundary design — decisions where there are real tradeoffs and multiple defensible answers, and where the wrong choice has lasting consequences. Others are standard security hardening with no meaningful alternative: SHA-pinning GitHub Actions, removing password-based SSH, verifying Nostr event signatures. Treating these two categories the same way — either all-gated or all-direct — is inefficient. Gating the mechanical fixes behind an ADR wastes the working group's time; shipping the architectural ones without an ADR locks in decisions that were never actually made.

This proposal defines a two-track remediation process so that each finding lands through the path that fits it, and so that the working group's attention goes to the decisions that actually need discussion.

## Proposed Approach

Split the eight findings into two tracks based on whether they involve an architectural decision.

**Track A — ADR-gated (needs team discussion first).** These findings involve policy or key-management decisions with real tradeoffs. Each gets its own ADR proposal; the corresponding code branch merges only after the ADR is accepted.

- **H1 — WebSocket Origin Header Validation.** The access-control policy (which origins are allowed, how NIP-46 bunkers are handled, localhost policy, same-origin heuristic correctness) needs explicit decisions. See [Relay WebSocket Origin Validation Policy](./websocket-origin-validation.md).
- **H8 — NWC Wallet Secret Encryption at Rest.** The key-derivation strategy — especially for NIP-07 extension users who never expose a private key — is an architectural decision with product-level consequences. See [NWC Wallet Secret Encryption at Rest](./nwc-wallet-encryption.md).
- **Payment-flow signature verification scope.** The fix itself (H2) is mechanical, but the blanket rule — "should *all* server-side event processing require signature verification, not just payments?" — is an architectural decision worth ratifying. See [Untrusted Input Validation in Payment Flows](./payment-input-validation.md).

**Track B — Direct implementation (no architecture decision needed, just fix it).** These are standard security best practices with no real alternatives. They proceed as focused PRs immediately, without ADR sign-off.

- **H2 — Zap Request Signature Verification** (the code change; the *blanket rule* is Track A). Not verifying signatures on payment requests is objectively a bug. Branch: `security/zap-sig-verification`.
- **H3/H4 — SSH Hardening.** Removes `sshpass`/plaintext-password SSH auth and replaces `StrictHostKeyChecking=no` with `accept-new` + real `known_hosts`. Password-based SSH is deprecated industry-wide; disabling MITM protection is a known anti-pattern. Branch: `security/ssh-hardening`. *(Requires infra coordination: `STAGING_SSH_KEY` / `PROD_SSH_KEY` GitHub Secrets must exist before the deploy workflow uses them.)*
- **H5/H6/H7 — CI Supply Chain Hardening.** Pins all GitHub Action references to immutable commit SHAs (with trailing `# v4` readability comments), pins `@nostrBook/mcp` to `0.5.3` instead of `@latest`, pins Bun to `1.3.10`, and switches deploy auth from password to key. SHA-pinning is GitHub's own recommendation. Branch: `security/ci-supply-chain`.
- **Input sanitization, rate limiting, CSP headers** — standard hardening items that fall out of the same audit and need no architectural decision.

The process for each track:
- **Track A**: discuss ADR → accept ADR → open focused PR from the existing branch → merge.
- **Track B**: open focused PR from the existing branch at any time → merge. No ADR blocking.

Reference branches for all items live in the `felixfelix-bot/market` fork and are listed in the related-PRs section below. Each branch contains only the files relevant to its concern, so PRs are narrow and reviewable.

## Decision Points

- **Track assignment**: is the Track A / Track B split above correct? In particular, should H2's blanket-rule question (Track A) block the H2 code fix (Track B), or should the fix merge immediately while the rule is discussed?
- **Bundling within tracks**: should Track B items be merged individually (one PR per finding) or grouped by theme (e.g. one PR for all CI hardening)? Individual PRs are easier to revert; grouped PRs reduce review overhead.
- **Review order**: the Track A ADRs have a dependency chain — the WebSocket origin policy and the payment-validation rule overlap (both touch server-side trust boundaries). Should they be discussed together, or sequenced?
- **CSP placement**: Content Security Policy is listed under Track B here, but it interacts with the wallet-encryption ADR (H8) — encryption at rest without CSP does not close the XSS vector. Should CSP be pulled into Track A and bundled with the wallet-encryption decision?
- **Coordination with infra**: H3/H4 (SSH) and H7 (deploy key auth) require GitHub Secrets to exist before the workflow changes merge. Who owns that coordination, and does it block the Track B timeline?

## Dependencies

- The Track A ADR proposals must be written and surfaced before their corresponding branches can merge. Three are proposed alongside this strategy:
  - [Relay WebSocket Origin Validation Policy](./websocket-origin-validation.md)
  - [NWC Wallet Secret Encryption at Rest](./nwc-wallet-encryption.md)
  - [Untrusted Input Validation in Payment Flows](./payment-input-validation.md)
- Track B items have no ADR dependency. H3/H4 and H7 depend on infra secrets (`STAGING_SSH_KEY`, `PROD_SSH_KEY`) being in place before the deploy workflow changes land.
- Issue #996 tracks the overall audit; this proposal does not close it — each finding closes individually as its PR merges.

## Related

- PR #1074 — security audit implementation (findings H1–H8)
- PR #1118 — earlier bundled version of the same changes; closed in favor of this ADR-driven approach
- Issue #996 — security audit findings
- [Relay WebSocket Origin Validation Policy](./websocket-origin-validation.md) — Track A
- [NWC Wallet Secret Encryption at Rest](./nwc-wallet-encryption.md) — Track A
- [Untrusted Input Validation in Payment Flows](./payment-input-validation.md) — Track A (blanket rule); H2 code fix is Track B
- Reference branches (`felixfelix-bot/market` fork):
  - `security/relay-origin-validation` (H1)
  - `security/wallet-encryption` (H8)
  - `security/zap-sig-verification` (H2)
  - `security/ssh-hardening` (H3/H4)
  - `security/ci-supply-chain` (H5/H6/H7)
