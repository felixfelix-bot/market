#!/usr/bin/env bash
set -uo pipefail

# ─────────────────────────────────────────────────────────────────────
# require-secrets.sh — early-fail guard for the privileged preview
# workflows.
#
# Usage: require-secrets.sh NAME [NAME...]
#
# Each NAME must be an environment variable holding a non-empty,
# non-whitespace value (GitHub interpolates an unavailable secret as an
# empty string). If any are missing the guard fails IMMEDIATELY — one
# ::error annotation per missing secret naming the secret (never its
# value) with the fork-PR secret-isolation context and a docs pointer —
# so the run is diagnosable at step 1 instead of dying deep inside
# provision.sh with `PREVIEW_VPS_HOST is required`.
#
# Context (t_fa71dc15): `pull_request` jobs never receive repository
# secrets for fork PR heads — that was the root cause of the opaque
# Bootstrap VPS failures. The deploy half now runs under `workflow_run`,
# where secrets ARE available even for fork PRs; a missing secret there
# means the repository simply does not have it configured.
#
# Regression coverage: bash infra/preview-vps/test_require_secrets.sh
# (hermetic; wired into ci-unit.yml).
# ─────────────────────────────────────────────────────────────────────

if [ $# -lt 1 ]; then
  echo "usage: require-secrets.sh NAME [NAME...]" >&2
  exit 2
fi

MISSING=()
for NAME in "$@"; do
  # Trim whitespace: a secret of only spaces is not a secret.
  VALUE="$(printf '%s' "${!NAME:-}" | tr -d '[:space:]')"
  if [ -z "${VALUE}" ]; then
    MISSING+=("${NAME}")
  fi
done

if [ "${#MISSING[@]}" -gt 0 ]; then
  for NAME in "${MISSING[@]}"; do
    echo "::error title=missing secret ${NAME}::missing secret ${NAME} — fork PR secret isolation blanks secrets on pull_request runs, but this workflow_run job DOES see repository secrets, so ${NAME} is not configured in the repository. See docs/ops/preview-deploy.md (Required secrets)."
  done
  echo "FATAL: missing required secrets: ${MISSING[*]} — set them as repository secrets (see docs/ops/preview-deploy.md). Only secret NAMES were checked; values are never printed." >&2
  exit 1
fi

exit 0
