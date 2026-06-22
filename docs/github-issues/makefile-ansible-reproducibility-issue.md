# Issue Draft: chore: revive reproducible automation layer (Makefile + ansible) for agent/maintainer hand-off

> Pre-authored issue draft. `bd` (beads) CLI is not installed on the authoring machine, so this is
> ready-to-file rather than filed. File via `bd create` (or paste into the team tracker) when ready.
> Originated from the PR #1003 review on the "Reproducibility" suggested addition.

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
