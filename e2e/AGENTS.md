# AGENTS.md — e2e

This directory follows the repository-level AGENTS.md.

## Context

`e2e/` contains Playwright tests, helpers, scenarios, and local test
configuration. The tests exercise browser workflows against app and relay test
infrastructure.

## Constraints

- E2E tests may start services, seed scenario data, and interact with local
  relays. Do not run full e2e, startup, or seed commands without explicit
  approval.
- Keep scenario data cumulative unless the seed scripts and affected tests are
  updated together.
- Treat test keys, wallet material, NWC URIs, and payment fixtures as sensitive
  even when they are only for tests. Do not print or duplicate them in docs.
- Do not treat browser UI state, relay presence, or wallet acknowledgement as
  proof of canonical payment or order state.

## Instructions

- Prefer user-visible Playwright locators where existing tests support them.
- When changing e2e behavior, document required local services and any data
  seeding assumptions.
- Keep protocol assertions explicit: validate event kind, tags, author, and
  expected relay behavior where tests inspect Nostr events.

### Visual proof — `@happy-path` video routing

`e2e/playwright.config.ts` splits the suite into two chromium projects so that
only the spec tagged in its title records a full video (visual proof for the PR
trust pipeline, see `docs/plans/pr-trust-pipeline.md` Layer 2):

| Project               | Match                                                              | `video`             | `screenshot`      |
| --------------------- | ------------------------------------------------------------------ | ------------------- | ----------------- |
| `chromium`            | title does NOT contain `@happy-path` (`grepInvert: /@happy-path/`) | `retain-on-failure` | `only-on-failure` |
| `chromium-happy-path` | title contains `@happy-path` (`grep: /@happy-path/`)               | `on`                | `on`              |

The two projects partition the suite: every spec runs exactly once. To promote
a spec to visual proof, append the tag to its title, e.g.
`test('should display correct product details @happy-path', ...)`.

The worker count (`workers: 1`), parallelism (`fullyParallel: false`), and retry
count are intentionally unchanged and are asserted by
`e2e/playwright.config.test.ts` (`bun test e2e/playwright.config.test.ts`).

Artifacts: because the e2e page fixtures (`merchantPage`, `buyerPage`,
`newUserPage`, `unauthenticatedPage` in `e2e/fixtures/index.ts`) create their own
browser contexts for per-user isolation, Playwright's project-level `video` does
NOT auto-apply to them. The fixtures read the project's video mode via
`testInfo.project.use.video` and forward `recordVideo` for the `@happy-path`
project (see `e2e/fixtures/video.ts`), then attach the recording to the test
result. Each happy-path spec therefore produces
`test-results/<test>/attachments/video-*.webm` (plus a `test-finished-*.png`
screenshot). Non-happy-path specs record nothing — the `retain-on-failure` mode
cannot be replicated on a manually-created context, so failures there still
produce only a screenshot, identical to the pre-existing behaviour. Wire the CI
artifact upload to the glob `test-results/**/attachments/*.webm`.

Note: the comprehensive plan lists screenshots as `'on'` for _all_ specs; this
config scopes both `video` and `screenshot` to `@happy-path` specs only, matching
the Layer 2a task scope. Revisit if the dashboard needs screenshots from every
run.

## Safe Checks

- `git diff --check`
- `bun run format:check`
- Full e2e execution requires explicit approval.
