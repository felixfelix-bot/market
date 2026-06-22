# PR #1003 Review + Reproducibility Follow-up — Plan

Branch: `chore/pr1003-review-plan` (worktree: `/home/c03rad0r/worktrees/pr1003-review-plan`)
Base: `master` @ `c4b9b159`
Owner session: c03rad0r
Created: 2026-06-22

## Context

Maxime (Franchovy) asked for a review of **PlebeianApp/market PR #1003** (`docs: add maintainer
audit and LLM contribution guidance`, author Diego / maximotodev, branch
`docs/maintainer-audit-llm-guidance` -> `master`). Goal: a consolidated base for LLM workflows.

The PR is docs-only, 8 files, +1105/-38. It rewrites `AGENTS.md`, edits `README.md`, adds a PR
template, and adds 5 new docs under `docs/{llm,maintainer,security}/`.

The review was iterated across the session. In addition to verification of the PR's claims, two
**new policy directions** emerged that we want to propose upstream (rather than keep as personal
local rules) so the whole team adopts them:

1. **Anti-DDoS / reviewer-cost rules** — agents must not request reviews, @-mention humans, trigger
   review bots, or push to upstream. PR creation against upstream is a manual human action.
2. **Reproducibility rule** — encode any mutating run as a script/target/playbook/spec before
   running it (goal: reproducibility + minimizing token burn). Revive the Makefile + ansible
   scaffolding (prior art: `chore/deployment-makefile`, `feature/ansible-workflow`) as a follow-up.

## What this session delivers

1. A formal review on PR #1003 (8 verification/policy findings + 1 "Suggested addition" for the
   reproducibility rule).
2. A pre-authored bd issue draft for the Makefile + ansible follow-up (bd CLI is not installed on
   this machine, so the draft lives in `docs/github-issues/` ready for manual filing).

## Tooling notes / constraints

- `gh` is authenticated as `c03rad0r`.
- `bd` (beads) is **not installed** -> bd issue is authored as a ready-to-file draft, not filed.
- c03rad0r is a fork owner, likely **not** a collaborator on `PlebeianApp/market`. If
  `gh pr review --request-changes` is rejected for permissions, fall back to a regular
  `gh pr comment` (same body) and record the fallback in the checklist.
- Per the anti-DDoS rule being proposed, the worktree branch is pushed only to the `fork` remote
  (c03rad0r/market), never to `plebian` (upstream). No upstream PR is opened automatically.

## Verification performed against current `master`

- Repo map (`src/publish`, `src/lib/{nostr,wallet,payments,orders,checkout,stores,schemas}`) ✓
- Gamma kinds 30402 / 30405 / 30406 / 31555 match `SPEC.md`, `.claude/API_EVENTS.md`,
  `scripts/gen_review.ts` ✓
- `bun run test:unit` is the CI unit baseline (`.github/workflows/ci-unit.yml`) ✓
- `.env.dev` tracked with `APP_PRIVATE_KEY` (name only; no value printed) ✓
- PR scope clean: no source/lockfile/route-tree changes ✓
- Both referenced "prior audit" commits exist but differ:
  - `docs/llm/launch-pad.md` -> `32d5c941799f573a13b57a44d7e132883a140d8c`
  - `docs/maintainer/security-ai-ops-brief.md` -> `c4b9b15995f128d5e61f9175c3fbd59a6356fa27`
  (current master HEAD)
- No Makefile or ansible on `master`; prior art only on divergent branches.

---

## Checklist

- [x] Create git worktree `chore/pr1003-review-plan` from `master`
- [x] Write this planning doc (plan + exact text + checklist)
- [ ] Write bd issue draft `docs/github-issues/makefile-ansible-reproducibility-issue.md`
- [ ] Update `AGENTS.md` with local session-rules block
- [ ] Commit changes on the worktree branch
- [ ] Push branch to `fork` remote (c03rad0r/market)
- [ ] Post the review to PR #1003 (request-changes; fall back to comment if no perms)
- [ ] File bd issue (bd not installed -> pending manual filing; draft ready)
- [ ] Final verification (`git status --short`) + voice-notify

---

## EXACT REVIEW TEXT TO POST ON PR #1003

Disposition: **Request changes** (fall back to **Comment** if c03rad0r lacks collaborator rights).

```markdown
Thanks Diego — strong base. The review-guidelines and threat-model sections are genuinely reusable. Docs-only, so no app tests requested; below are polish items verified against current `master` (c4b9b15). Leading with the higher-signal ones.

### P1 — Consistency / correctness

**1. Two different "prior audit" commit hashes across the new docs.**
- `docs/llm/launch-pad.md` → `32d5c941799f…`
- `docs/maintainer/security-ai-ops-brief.md` → `c4b9b15995f1…` (current master HEAD)

Both exist but are different commits. These docs' core message is "snapshots rot, re-check current state," so pinning two divergent hashes undercuts it and drifts on the next merge. **Fix:** drop the hardcoded hashes (or collapse to one "as-of" date) and point readers at `git rev-parse HEAD`.

**2. AGENTS.md rewrite silently removes the `bd` workflow + "Landing the Plane."**
This repo actively uses `bd` (`.beads/`, ~6 live worktrees, sessions reference it). The body frames mandatory-push as "unsafe" and removes it with no pointer to where that workflow goes. **Fix:** keep a one-liner, e.g. *"Issue-tracker (`bd`) commands are opt-in — only run them when explicitly asked."* Don't just vanish it.

**3. No guardrail against requesting reviews / triggering automated reviewers (reviewer-DDoS gap).**
The PR gates `gh pr create` / `gh pr merge` behind "explicitly asked," but nothing restricts *requesting reviews*, *@-mentioning humans*, or *invoking review bots*. An agent that never creates a PR can still fire Codex or ping N maintainers via `gh pr edit --add-reviewer`, `gh pr review --request`, or a comment like `@codex review` — and every push to a watched branch re-runs CI and re-fires auto-review. With multiple concurrent LLM sessions on a shared repo, that's a real human-attention cost. Since the goal is a consolidated base, I'd add an explicit subsection (e.g. "Reviewer cost / anti-DDoS" in `AGENTS.md`, mirrored in the `command-safety.md` "Issue Tracker and GitHub Mutation" block). Suggested rules:
- **Review requests are a manual human action.** Never request/assign reviewers or trigger automated reviewers — including `gh pr edit --add-reviewer`, `gh pr review --request`, and any comment that @-mentions a human or invokes a review bot (e.g. `@codex review`). Requesting review is always manual.
- **Push branches to the developer's fork only, never upstream.** The repo already has the `fork` vs `plebian` remote split — a natural seam. The human decides when a fork branch becomes an upstream PR.
- **Upstream-PR throttle.** If a developer already has an open PR against upstream, batch new work into it rather than opening more; point new fork branches at upstream manually.
- *Framing:* these exist because review requests, @-mentions, CI runs, and auto-review bots consume human attention across a shared repo. Treat reviewer time as a scarce resource.

### P2 — Should address

**4. "Consolidated base" goal is half-met: CLAUDE.md is untouched.** CLAUDE.md still carries its own Git Workflow / Commands / Code Style that overlap but diverge from the new AGENTS.md + launch-pad. Two LLM-facing instruction files with conflicting wording is the exact conflict this PR aims to solve. **Fix:** slim CLAUDE.md to a pointer ("See `AGENTS.md` and `docs/llm/launch-pad.md`") or document the split explicitly.

**5. PR template is uniformly heavy for all PRs.** Threat Model / Payment / Storage / Secret sections render into every PR body; for docs/chore PRs that's all `N/A` (your own PR body here doesn't use this template). **Fix:** add "write `N/A` + one line why if not applicable" at the top, or split into a short default + a linked security checklist for protocol/payment PRs.

**6. `command-safety.md` lists `sed` and `cat` under "Usually safe."** `sed -i` mutates, `cat > file` overwrites — contradicts the doc's own classification care, and an LLM copying the list literally could trip. **Fix:** qualify ("without `-i` or redirection") or swap for `head` / `git show`.

### P3 — Nits

**7.** `command-safety.md`: "`bun test` may pick up Playwright specs" is imprecise — Playwright lives in `e2e/*.spec.ts` (not auto-discovered by `bun test`); the real broad-discovery risk is `*.integration.test.ts` and server/service-dependent tests. Hedge accordingly.

**8.** `launch-pad.md` "Recommended PR Sequence" + brief "Critical and High Work Queue" bake in a fixed PR 1…PR 8 roadmap with a dedicated playbook. Contributors may read it as binding, and it'll rot as priorities shift. Relabel as "Suggested focus order; maintainer may reprioritize."

### Suggested addition (non-blocking)

**9. Reproducibility — encode before any mutating run.** To make agent work reproducible and hand-off-able (and to cut token burn), consider adding a standing rule:
- **Before** running any mutating, multi-step, or environment-dependent action for the first time, persist it as a reproducible artifact. Read-only inspection is exempt.
- Re-use existing artifacts first (`package.json` scripts, `scripts/`, `deploy-simple/`, Playwright `e2e/`).
- Pick the lightest tool: one-liner → `package.json` script; compose/dev entry point → `Makefile` target; linear shell → `scripts/*.sh`; behavioral verification → Playwright spec; host provisioning/deploy → ansible playbook; per-dir env → `direnv`; clean env → `docker`/`compose`; secrets at rest → `sops`/`age`.
- Anything encoded must run from a clean checkout with only documented env/secrets and must not print secrets.
- Introducing a repo-wide layer (Makefile, `ansible/`) is its own PR — cite prior art (`chore/deployment-makefile`, `feature/ansible-workflow`). Follow-up issue for that revival forthcoming.

### Verified accurate (no change needed)
- Repo map (`src/publish`, `src/lib/{nostr,wallet,payments,orders,checkout,stores,schemas}`) ✓
- Gamma kinds 30402 / 30405 / 30406 / 31555 (match `SPEC.md`, `.claude/API_EVENTS.md`, `scripts/gen_review.ts`) ✓
- `bun run test:unit` is the CI unit baseline (`.github/workflows/ci-unit.yml`) ✓
- `.env.dev` tracked with `APP_PRIVATE_KEY` — no values printed anywhere ✓
- Scope clean: no source/lockfile/route-tree changes ✓

Requesting changes mainly for #1, #2, and #3 before this becomes the standing policy doc; the rest are optional polish. Happy to open a small follow-up if you'd rather keep this PR focused.
```

---

## EXACT BD ISSUE TEXT (draft — file manually; bd CLI not installed)

File to: `PlebeianApp/market` via `bd create` (or paste into the beads/GitHub tracker).

Title: `chore: revive reproducible automation layer (Makefile + ansible) for agent/maintainer hand-off`

```markdown
## Why

The agent instructions propose a "Reproducibility — encode before any mutating run" rule (see PR #1003
review). That rule currently points at automation layers that do not exist on `master`. Revive the
Makefile + ansible scaffolding so the rule has real targets to point at, and so agent/maintainer work
is reproducible and hand-off-able.

## Scope

- Minimal `Makefile` (re-derived from prior art on `chore/deployment-makefile`) wrapping existing
  entry points: `install`, `dev`, `test`, `test:unit`, `format`, `seed`, `startup`, `build`, `e2e`,
  `deploy:staging`. Targets **delegate** to `bun run …` / `scripts/*.sh` — no duplicated shell.
- `ansible/` scaffolding (re-derived from prior art on `feature/ansible-workflow`): `deploy.yml`,
  `inventory.ini.example`, `templates/market.service.j2`. Both source branches are too divergent to
  merge directly — reference only.
- Short `docs/llm/reproducibility.md` mapping task -> tool, with the goal stated as reproducibility +
  minimizing token burn (so agents pick the lightest appropriate tool).

## Non-goals

- No app/CI/secret behavior changes.
- No `.env.dev` tracking changes or key rotation (separate env-hygiene effort).
- Don't migrate every existing script into the Makefile day one — start with the top developer flows.

## Acceptance

- `make <target>` runs from a clean checkout (after `bun install`) with only documented env.
- Makefile delegates to existing scripts/targets (no duplicated shell logic).
- ansible inventory is templated (`inventory.ini.example`); no real hosts or secrets committed.
- `git status --short` shows only the new files; no source changes.

## Prior art

- `chore/deployment-makefile` (has a `Makefile`)
- `feature/ansible-workflow` (has `ansible/deploy.yml`, `ansible/inventory.ini`,
  `ansible/templates/market.service.j2`)

Both branches have diverged far from `master` (230+ / 373 files) — use as reference, do not merge.
```
