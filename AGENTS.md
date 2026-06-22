# Agent Instructions

## Local Session Rules (c03rad0r)

Personal rules for this developer's LLM sessions. They persist across sessions and live above any
upstream policy. If upstream `AGENTS.md` policy (PR #1003) merges, these still apply in addition.

- **Work in a git worktree.** Create a worktree under `/home/c03rad0r/worktrees/<name>` on a new
  branch for every session so concurrent LLM sessions don't interfere (`git worktree list`). Never
  work directly on `master`.
- **Maintain this file.** Record any new standing rules/instructions the developer gives into this
  section so they persist across LLM sessions.
- **Push to the fork only, never upstream.** Remotes: `fork` (c03rad0r/market) and `plebian`
  (PlebeianApp/market, upstream). Push session branches only to `fork`. Opening a PR against
  `plebian` is a manual human action. (There is no `origin` remote — the "Landing the Plane"
  `git push` step below means `git push fork <branch>`.)
- **Reviewer-cost / anti-DDoS.** Never request/assign reviewers, @-mention humans, or trigger
  automated review bots (e.g. `@codex review`). Requesting review is a manual human action. If a PR
  against upstream is already open for this developer, batch into it rather than opening more.
- **Reproducibility — encode before any mutating run.** Before running a mutating, multi-step, or
  environment-dependent action for the first time, persist it as a reproducible artifact
  (`package.json` script, `Makefile` target, `scripts/*.sh`, Playwright spec, or ansible playbook).
  Read-only inspection is exempt. Goal: reproducibility + minimizing token burn.
- **Proposed upstream (pending).** The anti-DDoS and reproducibility rules above are proposed
  upstream via PR #1003 so the whole team can adopt them. See
  `docs/plans/pr-1003-llm-docs-review.md`. Until they merge, this section is the canonical source
  for this developer's sessions.

---

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
