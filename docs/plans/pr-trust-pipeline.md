# PR Trust Pipeline — Comprehensive Plan

**Goal:** Compress the review→merge loop from days to hours by providing automated trust signals on every PR: coverage gates, visual proof (happy-path videos), and live preview environments.

**Branch:** `feat/pr-trust-pipeline` on `felixfelix-bot/market`
**Date:** 2026-07-30

---

## Problem Statement

AI compresses implementation from weeks to hours. But the review loop still takes days because:

1. No coverage enforcement — reviewers can't trust that code is tested
2. No visual proof — reviewers can't see what the feature does without checking out the branch
3. No live preview — reviewers can't click through without local setup
4. Reviewers set AI on review, creating an AI-vs-AI review loop with no human grounding

**Solution:** Three layers of automated trust signals, delivered directly in the PR.

---

## Layer 1: Coverage Gate

**Requirement:** Every modified or introduced piece of logic must have test coverage.

### Phase 1A — Bun Built-in Coverage (validate first)

- **What:** Use `bun test --coverage` to get line-level coverage data
- **Check:** For each `.ts/.tsx` file in `git diff`, verify modified lines have >0% coverage
- **Local:** Pre-push hook runs the check, blocks push if uncovered code detected
- **CI:** GitHub Action runs same check as hard gate, blocks merge if failing
- **Scope:** Only files changed in the diff. Only lines modified (added/changed). Pre-existing untested code is NOT blocked.

**Files to create:**

1. `scripts/check-coverage.ts` — Bun script that:
   - Runs `git diff origin/master...HEAD --name-only` to get changed files
   - Filters to `.ts/.tsx` files in `src/` (not tests, not config, not e2e)
   - Runs `bun test --coverage` against the test suite
   - Parses coverage output (JSON reporter)
   - For each changed file, checks if modified lines are covered
   - Exits 1 with a report of uncovered lines if any found
   - Exits 0 if all modified lines are covered

2. `.githooks/pre-push` — Shell hook that runs `bun run check-coverage`
3. `.github/workflows/coverage-gate.yml` — CI action that runs the same check

**Validation criteria:**

- Hook blocks push when a new function has no test
- Hook passes when all modified code is tested
- Hook does NOT block on pre-existing untested code
- Runs in <30s locally, <2min in CI

### Phase 1B — Custom Diff-Aware Coverage (layer on top, after 1A validated)

- **What:** AST-level diff analysis for function-level coverage enforcement
- **Tool:** TypeScript compiler API (`ts-morph`) to parse changed files, identify which functions/methods were modified, and map them to test coverage
- **Advantage:** "This function was changed but no test calls it" (more precise than line-level)
- **Status:** Design phase. Implement after 1A is validated and merged.

---

## Layer 2: Visual Proof (Happy-Path Videos)

**Requirement:** Record happy-path Playwright videos, post in PR comments so reviewers see the feature working.

### Approach: Extend Existing nsite Dashboard

Build on `c03rad0r/plebeian-testing-nsite-actions` — already 90% done.

**Changes needed:**

1. **Playwright config** (`e2e/playwright.config.ts`):
   - Change `video: 'retain-on-failure'` → `video: 'on'` for happy-path specs
   - Change `screenshot: 'only-on-failure'` → `screenshot: 'on'` for all specs
   - Add CI JSON reporter alongside github reporter

2. **render-dashboard action** (`plebeian-testing-nsite-actions/.github/actions/render-dashboard/render_dashboard.py`):
   - Add `<video>` tag support in test cards
   - Copy video files alongside screenshots into dashboard output
   - Show inline video player in the dashboard HTML

3. **publish-nsite action** (`plebeian-testing-nsite-actions/.github/actions/publish-nsite/publish.sh`):
   - Fix known DNS bug: hex→bech32 npub conversion, subdomain URL format
   - Upload video files to Blossom alongside HTML
   - Post PR comment with dashboard URL

4. **e2e.yml workflow** (`market/.github/workflows/e2e.yml`):
   - Add render-dashboard + publish-nsite steps after test run
   - Set `CI_ANNOUNCE_NSEC` secret (pending from Felix)

5. **Happy-path spec convention:**
   - Specs tagged `@happy-path` in test title (e.g., `"User can browse products @happy-path"`)
   - CI runs happy-path specs with `--video on`
   - Other specs keep existing `retain-on-failure` behavior

**Validation criteria:**

- Video plays in the nsite dashboard
- PR comment contains clickable link to dashboard
- Dashboard shows pass/fail status, screenshots, AND video for each test

### Layer 2c — Wiring Status (complete)

**What landed on `feat/pr-trust-pipeline`:**

1. **Playwright JSON reporter** (`e2e/playwright.config.ts`) — CI now emits a JSON
   report to `test-results/results.json` alongside the `github` reporter. This is
   the structured input the `render-dashboard` action needs (per-test statuses,
   attachments, durations).
2. **`render-dashboard` + `publish-nsite` wired into `e2e-pricing`**
   (`.github/workflows/e2e.yml`) — after the test run and artifact upload, the
   dashboard is rendered from `test-results/` and published to nsite via Blossom
   using the `CI_ANNOUNCE_NSEC` secret. Both steps run with `if: !cancelled()` so
   a failing suite still produces a dashboard showing the failure.
3. **Idempotent PR comment** (`scripts/e2e-pr-comment.ts`) — a pure
   `formatComment()` formatter (15 unit tests) plus a `main()` that finds an
   existing comment by a hidden marker tag and **updates** it rather than posting
   a duplicate. The `publish-nsite` action's built-in one-line comment is
   suppressed (no `pr-number` passed) so the richer comment is the single source.
4. **Buzz notify fix** — the pricing job's Buzz step referenced a non-existent
   `steps.test.outcome`; corrected to `steps.e2e-test.outcome`.

**Remaining for full Layer 2 (separate tasks):**

- Task 2A (Playwright `video: 'on'` / `screenshot: 'on'`) — not yet on this branch.
- Task 2B/2D (`render-dashboard` `<video>` support + nsite DNS hardening) —
  tracked on `c03rad0r/plebeian-testing-nsite-actions`.

---

## Layer 3: Live Preview (Per-PR Subdomain Auto-Deploy)

**Requirement:** Every push auto-deploys to a testable URL, auto-destroyed after TTL.

### Phase 3A — Docker-on-VPS (start here)

Use existing `plebeian-market-e2e-infra` Ansible playbooks.

**Architecture:**

- GitHub Action triggers on PR push
- Action SSHes into test VPS, runs `deploy-pr` Ansible playbook
- Playbook creates Docker containers: market app + relay on per-PR ports
- Caddy auto-configures subdomain: `pr<N>.test-market.orangesync.tech`
- Cloudflare DNS A record created via API
- Action posts live URL in PR comment
- Separate teardown job runs after 30min TTL (or on PR close/merge)

**Files to create:**

1. `.github/workflows/preview-deploy.yml` — triggers on PR, deploys, posts URL
2. `.github/actions/teardown-preview/` — composite action for cleanup
3. Wire to existing `plebeian-market-e2e-infra/ansible/playbooks/deploy-pr.yml`

**Infrastructure (pending from Felix):**

- Fresh VPS on Sovereign Hybrid Compute (Felix provisioning)
- npub-gated access for security
- Domain: `test-market.orangesync.tech` (or new domain for Sovereign VPS)

### Phase 3B — Firecracker VMs (roadmap)

- Self-hosted Firecracker microVMs on Sovereign Hybrid Compute
- Full isolation, ~125ms boot, auto-destroy
- eCash payment integration
- **Status:** Design phase. After 3A is validated.

---

## Implementation Order

| Priority | Task                                   | Depends on           | Estimated effort |
| -------- | -------------------------------------- | -------------------- | ---------------- |
| P0       | 1A: Bun coverage hook + CI             | Nothing              | 1 kanban task    |
| P0       | 2A: Video in playwright config         | Nothing              | 1 kanban task    |
| P0       | 2B: Extend render-dashboard for video  | 2A                   | 1 kanban task    |
| P0       | 2C: Wire e2e.yml for dashboard publish | 2B, CI_ANNOUNCE_NSEC | 1 kanban task    |
| P0       | 2D: Fix nsite DNS bug                  | 2B                   | 1 kanban task    |
| P1       | 3A: Preview deploy GitHub Action       | VPS from Felix       | 2 kanban tasks   |
| P1       | 3A: Preview teardown automation        | 3A deploy working    | 1 kanban task    |
| P2       | 1B: Custom diff-aware coverage         | 1A validated         | 2 kanban tasks   |
| P3       | 3B: Firecracker VMs                    | 3A validated, eCash  | Design phase     |

---

## Quality Gates

Every task in this plan must pass:

1. **TDD** — Test exists and was observed failing before implementation
2. **Tests pass** — Full suite run, output verified
3. **Docs updated** — In the same commit as code changes
4. **Atomic commits** — One concern per commit, conventional messages
5. **PUSHED** — `git push` succeeded, remote verified
6. **Cold review** — Fresh eyes review the diff

---

## Worker Profile Assignments

| Task                                | Worker profile | Model   | Rationale            |
| ----------------------------------- | -------------- | ------- | -------------------- |
| Coverage hook script (1A)           | worker-balloon | glm-5.2 | Code writing, TS/Bun |
| Playwright config change (2A)       | worker-balloon | glm-5.2 | Config edit          |
| render-dashboard video support (2B) | worker-balloon | glm-5.2 | Python + HTML        |
| nsite DNS fix (2D)                  | worker-balloon | glm-5.2 | Shell script fix     |
| e2e.yml wiring (2C)                 | worker-balloon | glm-5.2 | YAML workflow        |
| Preview deploy Action (3A)          | worker-balloon | glm-5.2 | YAML + Ansible       |
| Custom diff coverage (1B)           | worker-balloon | glm-5.2 | TS compiler API      |

---

## Secrets / Config Needed (from Felix)

| Item                         | Status                                         | Purpose                 |
| ---------------------------- | ---------------------------------------------- | ----------------------- |
| Sovereign Hybrid Compute VPS | PENDING — Felix provisioning in 30min          | Preview deploy target   |
| CI_ANNOUNCE_NSEC             | PENDING — Felix setting up                     | nsite dashboard publish |
| Sovereign npub key           | GENERATED — nsec1c3vtt0s... (see below)        | VPS auth/access         |
| Cloudflare API token         | EXISTING — in tollgate-infrastructure-kit .env | DNS for subdomains      |
| Blossom server               | EXISTING — blossom.orangesync.tech             | Video/upload hosting    |
| Test VPS SSH key             | PENDING — need from Felix                      | GitHub Action → VPS     |

### Generated Sovereign Hybrid Compute Bot Key

Key generated via `nak key generate`. Felix has the nsec — will add to GitHub Actions secrets as `SOVEREIGN_BOT_NSEC` on felixfelix-bot/market.

npub: `npub1nt0gkyl2vah03z9sg07n62fd7cp6q97qhk3mhrmrnxk4xvjqs07q62qfgv`

---

## Repository Strategy

| Repo                                                       | Role                     | Changes                                                 |
| ---------------------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| `felixfelix-bot/market` (branch: `feat/pr-trust-pipeline`) | Main work branch         | Coverage hook, e2e.yml changes, preview-deploy workflow |
| `c03rad0r/plebeian-testing-nsite-actions`                  | Dashboard publishing     | Video support, DNS fix                                  |
| `plebeian-market-e2e-infra`                                | Ansible deploy playbooks | Already built, just needs GitHub Actions wiring         |
| `tollgate-infrastructure-kit`                              | VPS infra reference      | Read-only — reference for Ansible patterns              |

**Workflow:** All changes go to `feat/pr-trust-pipeline` on felixfelix-bot/market. Test CI on the fork. Once validated, PR upstream to PlebeianApp/market.

---

## Testing on felixfelix-bot/market

Per Felix's instruction: do NOT test on c03rad0r/market. All work goes to felixfelix-bot/market fork.

---

## Open Questions (for follow-up)

1. Sovereign Hybrid Compute API — need API endpoint + auth details for provisioning
2. Firecracker VM host — who manages, what CLI/API, eCash payment flow
3. Production VPS — confirm none currently running (Felix says fresh start)
4. Domain for preview subdomains — use existing test-market.orangesync.tech or new domain on Sovereign VPS?
5. Happy-path spec naming convention — `@happy-path` tag in title, or separate spec files?
