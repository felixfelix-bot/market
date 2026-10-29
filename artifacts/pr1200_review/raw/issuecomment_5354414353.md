Thanks for the readiness gate — bounded polling replacing the fixed `sleep 5` and the three-state rollback classification are well-designed. Reviewing the current commit (`6b8aeb6e`) against the prior review history:

1. **BLOCK — `observe()` remains untested and un-testable.** This was raised by maxime-tt (#1) on Aug 4 and is still unaddressed. `observe()` was refactored in this PR (journal extraction to `check_journal_window`, fresh storage baseline, context labels) but uses bare `sleep "$SAMPLE_SECONDS"` and bash `SECONDS` — not the `readiness_sleep`/`readiness_now` seams. No `observe_case` exists among the 33 tests. Since testability is this PR's headline deliverable, the refactored steady-state function should be covered too. Route `observe()`'s clock through the same seams and add behavioral tests, or document why it's deliberately excluded.

2. **RISK — Workflow public-endpoint `sleep 5` not addressed.** Raised by maxime-tt (#2), still present. The deploy-relay.yml "Verify staging relay" step retains a fixed 5s sleep before curling the public endpoint. The PR argues against fixed sleeps for local readiness but leaves the same pattern for the public check. If Caddy/TLS routing lags >5s, the verify step flakes even though the local gate passed. Either bound this with a retry loop or add a note explaining the local-vs-public distinction.

3. **RISK — No upper bound on `RELAY_READINESS_SECONDS`.** `validate_config` only checks `> 0`. A typo like `60000` silently blocks the activation gate until the Actions job timeout. Consider a sanity max (e.g. 600s) with a clear error.

4. **RISK — `observe()` uses bash `SECONDS` (global mutable), not `readiness_now`.** `SECONDS` is a bash global reset at shell startup, not function entry. If any called function touches it, the observe deadline shifts. `wait_for_readiness` correctly uses `readiness_now` (`/proc/uptime`), but `observe()` doesn't follow the same pattern — two time bases in the same script. Resolving #1 unifies this too.

5. **NIT — `check_journal_window` uses `-n 1000` tail.** A chatty relay over the ~120s activation+observe window could push restart/OOM evidence beyond the 1000-line tail, yielding a false "clean." Consider `--since` alone or a larger `-n`.

6. **NIT — `elapsed` in `wait_for_readiness` timeout path uses stale `now`.** After the deadline structural check, `elapsed=$((now - start))` uses the last in-loop `now` value, not a fresh read — slightly understates elapsed in the diagnostic printf. Cosmetic.

7. **NIT — No `shellcheck` CI step.** The script now does non-trivial arithmetic, env parsing, and trap logic. A shellcheck step in the workflow would catch regressions the unit tests don't.

8. **NIT — `test_readiness_wiring` is grep-based with line-number assertions.** Fragile — any reformatting changes line numbers and breaks the test without a functional regression. Consider asserting on behavior rather than source line positions.

Note: the commit hasn't changed since Jul 30 — the should-fix items from maxime-tt and the additional points from felixfelix-bot (2nd review) are still open. The core readiness/rollback state-machine design remains sound and well-tested for the paths it covers; the main gap is `observe()` testability and the workflow public-endpoint sleep.

Not approving — #1 and #2 from the prior reviews are still unaddressed.
