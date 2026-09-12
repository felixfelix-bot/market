#!/usr/bin/env bash
# Regression tests for the workflow_run trigger pattern of the preview
# pipeline (fork-PR secret isolation — t_fa71dc15 root cause fix).
#
# Why this exists
# ---------------
# `pull_request` events never receive repository secrets for fork PR
# heads, so a single pull_request-triggered deploy workflow can NEVER
# bootstrap the VPS for fork PRs. The fix is a two-workflow pipeline:
#
#   Preview Collect (pull_request) — unprivileged, executes PR code,
#                                   seals bundle + preview-request.json
#   Preview Deploy (workflow_run)  — privileged, repo secrets present,
#                                   executes ONLY default-branch code
#
# Any drift back toward the unsafe shapes (secrets in the collector, PR
# head checkout in the privileged workflow, job-level continue-on-error
# masking failures) reintroduces either the fork-PR bug or a
# privilege-escalation vector. These tests pin the structural contract.
#
# Contract under test
# -------------------
#   preview-collect.yml
#     * exists and triggers on pull_request
#     * references ZERO secrets (`secrets.` must not appear) — it runs
#       arbitrary fork code, so it must never hold a secret
#   preview-deploy.yml
#     * triggers on workflow_run of "Preview Collect" (fork PRs get
#       secrets on the privileged side)
#     * has NO job-level continue-on-error (step-level ones on
#       best-effort comment steps are allowed)
#     * checks out the trusted default branch only — never the PR head
#       (no checkout pinned to the workflow_run head SHA)
#     * downloads the bundle pinned to the triggering run
#       (run-id — not an unscoped artifact lookup)
#     * calls require-secrets.sh (early-fail missing-secret guard) and
#       preview-request.sh route (validated metadata) before any VPS
#       step
#     * binds the request to the triggering run's head SHA
#       (EXPECTED_HEAD_SHA)
#
# Usage: bash infra/preview-vps/test_workflow_pattern.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECT="${SCRIPT_DIR}/../../.github/workflows/preview-collect.yml"
DEPLOY="${SCRIPT_DIR}/../../.github/workflows/preview-deploy.yml"

PASS=0
FAIL=0
ok() { printf 'ok   %s\n' "$1"; PASS=$((PASS + 1)); }
no() { printf 'FAIL %s\n' "$1"; FAIL=$((FAIL + 1)); }

for F in "${COLLECT}" "${DEPLOY}"; do
  if [ ! -f "${F}" ]; then
    echo "FATAL: ${F} not found" >&2
    exit 1
  fi
done

# ── preview-collect.yml (unprivileged collector) ─────────────────────

grep -qE '^on:' -A3 "${COLLECT}" 2>/dev/null || true
sed -n '1,/^jobs:/p' "${COLLECT}" | grep -q 'pull_request' &&
  ok "collector: triggers on pull_request" || no "collector: triggers on pull_request"

if grep -q 'secrets\.' "${COLLECT}"; then
  no "collector: references zero secrets (runs arbitrary fork code)"
else
  ok "collector: references zero secrets (runs arbitrary fork code)"
fi

# ── preview-deploy.yml (privileged workflow_run side) ────────────────

sed -n '1,/^jobs:/p' "${DEPLOY}" | grep -q 'workflow_run' &&
  ok "deploy: triggers on workflow_run" || no "deploy: triggers on workflow_run"

grep -q 'Preview Collect' "${DEPLOY}" &&
  ok "deploy: workflow_run names Preview Collect" || no "deploy: workflow_run names Preview Collect"

# Job-level continue-on-error sits at the same indent as `runs-on:`
# (4 spaces here); step-level ones are indented deeper and are allowed
# (best-effort PR comments).
if grep -Eq '^    continue-on-error:' "${DEPLOY}"; then
  no "deploy: zero job-level continue-on-error"
else
  ok "deploy: zero job-level continue-on-error"
fi

# The privileged runner must never check out the PR head — checkout under
# workflow_run defaults to the default-branch commit (github.sha).
if grep -q 'ref:.*workflow_run.head_sha' "${DEPLOY}"; then
  no "deploy: never checks out the PR head in the secrets-holding runner"
else
  ok "deploy: never checks out the PR head in the secrets-holding runner"
fi

grep -q 'run-id: ${{ github.event.workflow_run.id }}' "${DEPLOY}" &&
  ok "deploy: downloads the bundle pinned to the triggering run" ||
  no "deploy: downloads the bundle pinned to the triggering run"

grep -q 'require-secrets.sh' "${DEPLOY}" &&
  ok "deploy: calls the require-secrets.sh early-fail guard" ||
  no "deploy: calls the require-secrets.sh early-fail guard"

# The guard must run BEFORE any VPS step (bootstrap/mkdir/upload). Match
# the `bash …` invocation lines — the file headers also mention the
# scripts in prose.
GUARD_LINE="$(grep -n 'bash infra/preview-vps/require-secrets.sh' "${DEPLOY}" | head -1 | cut -d: -f1)"
FIRST_VPS_LINE="$(grep -n 'bash infra/preview-vps/provision.sh' "${DEPLOY}" | head -1 | cut -d: -f1)"
if [ -n "${GUARD_LINE}" ] && [ -n "${FIRST_VPS_LINE}" ] &&
  [ "${GUARD_LINE}" -lt "${FIRST_VPS_LINE}" ]; then
  ok "deploy: secret guard runs before any VPS step"
else
  no "deploy: secret guard runs before any VPS step"
fi

grep -q 'preview-request.sh route' "${DEPLOY}" &&
  ok "deploy: routes the request through preview-request.sh" ||
  no "deploy: routes the request through preview-request.sh"

grep -q 'EXPECTED_HEAD_SHA' "${DEPLOY}" &&
  ok "deploy: binds the request to the triggering run's head SHA" ||
  no "deploy: binds the request to the triggering run's head SHA"

# Parity with the ssh-pin audit: no third-party SSH actions ever again
# (the `uses:` line is the danger; prose may still explain the history).
if grep -Eq 'uses:.*appleboy' "${DEPLOY}"; then
  no "deploy: no appleboy ssh/scp actions"
else
  ok "deploy: no appleboy ssh/scp actions"
fi

printf '\n%s passed, %s failed\n' "${PASS}" "${FAIL}"
[ "${FAIL}" -eq 0 ] || exit 1
exit 0
