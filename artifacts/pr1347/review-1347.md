Cross-family review at head `94129b495c9f738c13f79326bfdd2d0f97268306` (reviewer worker-reviewer-kimi, family ci/e2e ≠ author's family). Gate 2.5 cold-audit verdict: APPROVED.

**TL;DR** — the PR closes a real, evidenced coverage gap and pins it with a unit-test invariant so it cannot silently reopen.

Verified directly at head:

- At base `c9ec53b1`, the per-PR gate grep did NOT contain `Collection Management`, while the `e2e-full` job's `--grep-invert` DID — the family was indeed skipped in both jobs. Head adds `|Collection Management` to the gate at `.github/workflows/e2e.yml:178` while leaving the invert untouched at line 326, which restores coverage.
- The new `invert ⊆ gate` describe at `src/lib/__tests__/e2e-workflow-gate-membership.test.ts:96-109` correctly pins the regression class. All 4 tests in this file pass at head under `bun test` (4 pass / 0 fail).
- `e2e/tests/collections.spec.ts:116` has exactly `test.describe('Collection Management', () => {` — substring-matches the new alternation term. YAML parses cleanly; the grep regexes have no anchoring or ReDoS defects.

Two INFO-level notes (not blocking):

1. [INFO] `src/lib/__tests__/e2e-workflow-gate-membership.test.ts` — the new invariant pins alternation-term subset (`invert ⊆ gate`), but does not extend describe-membership coverage to `e2e/tests/collections.spec.ts` itself. If a future PR renames the `Collection Management` describe title, the membership guard will not catch the rename. The first two membership describes already do this for `og-meta-tags.spec.ts` and `test-labels-auctions.spec.ts`; consider adding a third describe pinning `collections.spec.ts` titles in a follow-up.
2. [INFO] `.github/workflows/e2e.yml:326` — `e2e-full`'s invert list omits `Lightning Mock`, `OG Meta Tags`, and `Test listing labels — auctions` even though all three are in the gate. Per the documented intent ("a family in the gate and not in the invert list simply runs in both jobs"), all three currently run in BOTH jobs. Calling it out in case the asymmetry is unintended — no demonstrated fault.

No `[BLOCK]` / `[RISK]` findings.

**APPROVED**
