#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────
# preview-request.sh — the metadata contract between the two halves of
# the fork-PR-safe preview pipeline:
#
#   Preview Collect  (pull_request, NO secrets, executes PR code)
#          │  artifact `preview-bundle` = deploy-package/ + preview-request.json
#          ▼
#   Preview Deploy   (workflow_run, repo secrets, executes ONLY
#                     default-branch code + artifact bytes)
#
# Commands
# --------
#   write <dir>
#       Emit <dir>/preview-request.json from the environment. The caller
#       (the collector workflow) supplies:
#         PR_NUMBER       pull-request number (positive integer)
#         PR_ACTION       opened | synchronize | closed
#         HEAD_SHA        40-hex head commit of the PR
#         HEAD_REF        head branch name
#         HEAD_REPO       head repository full_name (owner/repo)
#         PR_LABELS_JSON  optional JSON array of label names
#
#   route <file>
#       Validate a preview-request.json and write GitHub step outputs to
#       $GITHUB_OUTPUT (stdout when unset):
#         kind        deploy (opened/synchronize) | teardown (closed)
#         pr_number   the validated PR number
#         head_sha    the validated head commit id
#         subdomain   pr{N}.test-market.orangesync.tech  (COMPUTED)
#         pr_offset   (N % 100) * 10                   (COMPUTED)
#         app_port    3000 + offset                    (COMPUTED)
#         relay_port  10547 + offset                   (COMPUTED)
#         labels      label names, comma-joined
#       If EXPECTED_HEAD_SHA is set, the file's head_sha must equal it —
#       this binds the artifact to the exact run that produced it (the
#       workflow_run event's head SHA), so one PR cannot deploy under
#       another PR's identity.
#
# Security model
# --------------
# The JSON is PR-controlled data (a fork can write anything into its own
# artifact) that is consumed by a secrets-holding runner. Every field is
# therefore validated BEFORE it can reach a shell string: pr_number must
# be a positive integer, head_sha a 40-char hex object id, head_repo a
# non-empty owner/name; the subdomain and the port math are COMPUTED from
# the validated pr_number and never read from the file. Anything invalid
# is a hard error (::error annotation + nonzero exit) — never a silent
# skip.
#
# Regression coverage: bash infra/preview-vps/test_preview_request.sh
# (hermetic; wired into ci-unit.yml).
# ─────────────────────────────────────────────────────────────────────

fail() { # <message> — hard error with an annotation; never a silent skip
  echo "::error title=preview request rejected::${1}" >&2
  echo "FATAL: ${1}" >&2
  exit 1
}

usage() {
  echo "usage: preview-request.sh write <dir> | route <file>" >&2
  exit 2
}

[ $# -ge 2 ] || usage
CMD="$1"
ARG="$2"

case "${CMD}" in
  # ── collector side ────────────────────────────────────────────────
  write)
    DIR="${ARG}"
    [ -d "${DIR}" ] || fail "write: target directory does not exist: ${DIR}"
    [[ "${PR_NUMBER:-}" =~ ^[0-9]+$ ]] ||
      fail "write: PR_NUMBER must be a positive integer (got '${PR_NUMBER:-<unset>}')"
    [ -n "${PR_ACTION:-}" ] || fail "write: PR_ACTION is required"
    [ -n "${HEAD_SHA:-}" ] || fail "write: HEAD_SHA is required"
    [ -n "${HEAD_REF:-}" ] || fail "write: HEAD_REF is required"
    [ -n "${HEAD_REPO:-}" ] || fail "write: HEAD_REPO is required"
    jq -n \
      --arg action "${PR_ACTION}" \
      --argjson number "${PR_NUMBER}" \
      --arg sha "${HEAD_SHA}" \
      --arg ref "${HEAD_REF}" \
      --arg repo "${HEAD_REPO}" \
      --argjson labels "${PR_LABELS_JSON:-[]}" \
      '{
        schema_version: 1,
        action: $action,
        pr_number: $number,
        head_sha: $sha,
        head_ref: $ref,
        head_repo: $repo,
        labels: $labels
      }' > "${DIR}/preview-request.json"
    echo "wrote ${DIR}/preview-request.json (pr ${PR_NUMBER}, action ${PR_ACTION})"
    ;;

  # ── deploy side ───────────────────────────────────────────────────
  route)
    FILE="${ARG}"
    [ -r "${FILE}" ] || fail "route: preview request file is missing or unreadable: ${FILE}"
    jq -e . "${FILE}" >/dev/null 2>&1 ||
      fail "route: ${FILE} is not valid JSON — the collector artifact is corrupt"

    SCHEMA="$(jq -r '.schema_version // 0' "${FILE}")"
    [ "${SCHEMA}" = "1" ] ||
      fail "route: unsupported schema_version '${SCHEMA}' (expected 1) — collector and deploy workflow are out of sync"

    ACTION="$(jq -r '.action // ""' "${FILE}")"
    case "${ACTION}" in
      opened | synchronize) KIND="deploy" ;;
      closed) KIND="teardown" ;;
      *) fail "route: unknown action '${ACTION:-<missing>}' (expected opened|synchronize|closed)" ;;
    esac

    PR_NUMBER="$(jq -r '.pr_number // ""' "${FILE}")"
    [[ "${PR_NUMBER}" =~ ^[0-9]+$ ]] || fail "route: pr_number must be an integer (got '${PR_NUMBER:-<missing>}')"
    [ "${PR_NUMBER}" -gt 0 ] || fail "route: pr_number must be positive (got ${PR_NUMBER})"

    HEAD_SHA="$(jq -r '.head_sha // ""' "${FILE}")"
    if [ "${KIND}" = "deploy" ]; then
      [[ "${HEAD_SHA}" =~ ^[0-9a-f]{40}$ ]] ||
        fail "route: head_sha must be a 40-char hex commit id (got '${HEAD_SHA:-<missing>}')"
      HEAD_REPO="$(jq -r '.head_repo // ""' "${FILE}")"
      [ -n "${HEAD_REPO}" ] || fail "route: head_repo is required for a deploy request"
    else
      # Teardown never checks out the PR head; a short/absent sha is fine.
      [ -n "${HEAD_SHA}" ] || HEAD_SHA=""
    fi

    # Bind the request to the exact triggering run when the caller
    # provides the workflow_run head SHA.
    if [ -n "${EXPECTED_HEAD_SHA:-}" ]; then
      [ "${HEAD_SHA}" = "${EXPECTED_HEAD_SHA}" ] ||
        fail "route: head_sha ${HEAD_SHA:-<empty>} does not match the triggering run's head ${EXPECTED_HEAD_SHA} — refusing to act on a mismatched artifact"
    fi

    PR_OFFSET=$(( (PR_NUMBER % 100) * 10 ))
    SUBDOMAIN="pr${PR_NUMBER}.test-market.orangesync.tech"
    APP_PORT=$(( 3000 + PR_OFFSET ))
    RELAY_PORT=$(( 10547 + PR_OFFSET ))
    LABELS="$(jq -r '.labels // [] | join(",")' "${FILE}")"

    OUT="${GITHUB_OUTPUT:-/dev/stdout}"
    {
      echo "kind=${KIND}"
      echo "pr_number=${PR_NUMBER}"
      echo "head_sha=${HEAD_SHA}"
      echo "subdomain=${SUBDOMAIN}"
      echo "pr_offset=${PR_OFFSET}"
      echo "app_port=${APP_PORT}"
      echo "relay_port=${RELAY_PORT}"
      echo "labels=${LABELS}"
    } >> "${OUT}"
    ;;

  *) usage ;;
esac
