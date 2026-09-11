#!/usr/bin/env bash
# Regression tests for require-secrets.sh — the early-fail guard of the
# privileged Preview Deploy workflow.
#
# Why this exists
# ---------------
# The preview deploy used to skip (or crash deep inside provision.sh with
# `PREVIEW_VPS_HOST is required`) when secrets were absent, which was hard
# to diagnose. Under the workflow_run trigger secrets ARE available even
# for fork PRs — so a missing secret there means "not configured in the
# repository", and the job must FAIL FAST with a message that names each
# missing secret (never its value) and points at the docs.
#
# Contract under test
# -------------------
#   * every named variable set and non-empty → exit 0, no error output
#   * a missing (unset) or empty variable → exit 1 with, per secret:
#     `missing secret <NAME>` + `fork PR secret isolation` context and a
#     docs/ops/preview-deploy.md pointer, as a ::error annotation
#   * several missing secrets → every one is named, single nonzero exit
#   * secret VALUES are never echoed (only names)
#   * no arguments → usage error, nonzero exit
#
# Usage: bash infra/preview-vps/test_require_secrets.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARD="${SCRIPT_DIR}/require-secrets.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

PASS=0
FAIL=0
ok() { printf 'ok   %s\n' "$1"; PASS=$((PASS + 1)); }
no() { printf 'FAIL %s\n' "$1"; FAIL=$((FAIL + 1)); }

if [ ! -f "${GUARD}" ]; then
  echo "FATAL: ${GUARD} not found — run these tests with the script in place" >&2
  exit 1
fi

# All four present and non-empty → success, silent about secrets.
OUT="$((
  export PREVIEW_VPS_HOST='vps.example' PREVIEW_VPS_USER='debian' \
    PREVIEW_VPS_SSH_KEY='key-material' PREVIEW_VPS_HOST_FINGERPRINT='SHA256:abc'
  bash "${GUARD}" PREVIEW_VPS_HOST PREVIEW_VPS_USER PREVIEW_VPS_SSH_KEY PREVIEW_VPS_HOST_FINGERPRINT
) 2>&1)" && RC=0 || RC=$?
[ "${RC}" -eq 0 ] && ok "all present → exit 0" || no "all present → exit 0"
printf '%s' "${OUT}" | grep -q 'missing secret' &&
  no "all present → no missing-secret output" || ok "all present → no missing-secret output"

# One empty → exit 1, explicit "missing secret <NAME> — fork PR secret
# isolation" message with a docs pointer.
OUT="$((
  export PREVIEW_VPS_HOST='' PREVIEW_VPS_USER='debian' \
    PREVIEW_VPS_SSH_KEY='key-material' PREVIEW_VPS_HOST_FINGERPRINT='SHA256:abc'
  bash "${GUARD}" PREVIEW_VPS_HOST PREVIEW_VPS_USER PREVIEW_VPS_SSH_KEY PREVIEW_VPS_HOST_FINGERPRINT
) 2>&1)" && RC=0 || RC=$?
[ "${RC}" -eq 1 ] && ok "one empty → exit 1" || no "one empty → exit 1"
printf '%s' "${OUT}" | grep -q 'missing secret PREVIEW_VPS_HOST' &&
  ok "one empty → names the missing secret (PREVIEW_VPS_HOST)" ||
  no "one empty → names the missing secret (PREVIEW_VPS_HOST)"
printf '%s' "${OUT}" | grep -q 'fork PR secret isolation' &&
  ok "one empty → carries the fork-PR-secret-isolation context" ||
  no "one empty → carries the fork-PR-secret-isolation context"
printf '%s' "${OUT}" | grep -q 'docs/ops/preview-deploy.md' &&
  ok "one empty → points at docs/ops/preview-deploy.md" ||
  no "one empty → points at docs/ops/preview-deploy.md"
printf '%s' "${OUT}" | grep -q '::error' &&
  ok "one empty → emits a ::error annotation" ||
  no "one empty → emits a ::error annotation"

# Several missing (one unset, one empty) → every one named.
OUT="$((
  unset PREVIEW_VPS_HOST || true
  export PREVIEW_VPS_USER='' PREVIEW_VPS_SSH_KEY='key-material' \
    PREVIEW_VPS_HOST_FINGERPRINT='SHA256:abc'
  bash "${GUARD}" PREVIEW_VPS_HOST PREVIEW_VPS_USER PREVIEW_VPS_SSH_KEY PREVIEW_VPS_HOST_FINGERPRINT
) 2>&1)" && RC=0 || RC=$?
[ "${RC}" -eq 1 ] && ok "several missing → exit 1" || no "several missing → exit 1"
printf '%s' "${OUT}" | grep -q 'missing secret PREVIEW_VPS_HOST' &&
  printf '%s' "${OUT}" | grep -q 'missing secret PREVIEW_VPS_USER' &&
  ok "several missing → names every missing secret" ||
  no "several missing → names every missing secret"

# A missing secret must never leak the VALUE of a present one.
OUT="$((
  export PREVIEW_VPS_HOST='' PREVIEW_VPS_SSH_KEY='SUPER-SECRET-VALUE-NEVER-PRINT-ME'
  unset PREVIEW_VPS_USER || true
  unset PREVIEW_VPS_HOST_FINGERPRINT || true
  bash "${GUARD}" PREVIEW_VPS_HOST PREVIEW_VPS_USER PREVIEW_VPS_SSH_KEY PREVIEW_VPS_HOST_FINGERPRINT
) 2>&1)" && RC=0 || RC=$?
[ "${RC}" -eq 1 ] &&
  ok "mixed presence → exit 1" || no "mixed presence → exit 1"
printf '%s' "${OUT}" | grep -q 'SUPER-SECRET-VALUE-NEVER-PRINT-ME' &&
  no "secret values are never echoed" || ok "secret values are never echoed"

# Whitespace-only counts as missing (a QR of spaces is not a secret).
OUT="$((
  export PREVIEW_VPS_HOST='   ' PREVIEW_VPS_SSH_KEY='k'
  unset PREVIEW_VPS_USER || true
  unset PREVIEW_VPS_HOST_FINGERPRINT || true
  bash "${GUARD}" PREVIEW_VPS_HOST PREVIEW_VPS_SSH_KEY
) 2>&1)" && RC=0 || RC=$?
[ "${RC}" -eq 1 ] && printf '%s' "${OUT}" | grep -q 'missing secret PREVIEW_VPS_HOST' &&
  ok "whitespace-only value counts as missing" ||
  no "whitespace-only value counts as missing"

# No arguments → usage error.
OUT="$(bash "${GUARD}" 2>&1)" && RC=0 || RC=$?
[ "${RC}" -ne 0 ] &&
  ok "no arguments → nonzero exit" || no "no arguments → nonzero exit"

printf '\n%s passed, %s failed\n' "${PASS}" "${FAIL}"
[ "${FAIL}" -eq 0 ] || exit 1
exit 0
