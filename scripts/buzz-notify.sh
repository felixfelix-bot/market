#!/usr/bin/env bash
# buzz-notify.sh — Send CI notifications to Plebeian Buzz relay (#ci channel)
# Called from GitHub Actions workflows.
#
# Usage:
#   ./scripts/buzz-notify.sh --status pass --pr 1175 --job "E2E Tests" --detail "12/12 pass"
#   ./scripts/buzz-notify.sh --status fail --pr 1175 --job "Coverage Gate" --detail "3 files uncovered" --url "https://..."
#   ./scripts/buzz-notify.sh --status info --pr 1175 --job "Preview Deploy" --detail "https://pr1175.test-market..." --url "https://pr1175.test-market..."
#
# Required env (set in GitHub Actions secrets):
#   BUZZ_RELAY_URL  — relay URL
#   BUZZ_PRIVATE_KEY — nsec or hex key for the CI bot identity
#
# OR pass via env: CI_BUZZ_RELAY_URL / CI_BUZZ_PRIVATE_KEY

set -euo pipefail

CI_CHANNEL="6e655a87-635f-4b4b-84cb-072f287983b6"

# Parse args
STATUS=""
PR=""
JOB=""
DETAIL=""
URL=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --status) STATUS="$2"; shift 2 ;;
        --pr) PR="$2"; shift 2 ;;
        --job) JOB="$2"; shift 2 ;;
        --detail) DETAIL="$2"; shift 2 ;;
        --url) URL="$2"; shift 2 ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

# Resolve credentials
RELAY="${CI_BUZZ_RELAY_URL:-${BUZZ_RELAY_URL:-}}"
KEY="${CI_BUZZ_PRIVATE_KEY:-${BUZZ_PRIVATE_KEY:-}}"

if [ -z "$RELAY" ] || [ -z "$KEY" ]; then
    echo "buzz-notify: missing BUZZ_RELAY_URL or BUZZ_PRIVATE_KEY — skipping" >&2
    exit 0
fi

# Build emoji + prefix from status
case "$STATUS" in
    pass|success|passed) EMOJI="✅" ;;
    fail|failure|failed) EMOJI="🔴" ;;
    warn|warning) EMOJI="🟡" ;;
    info|deploy|ready) EMOJI="🔵" ;;
    merge-ready) EMOJI="🔔" ;;
    *) EMOJI="📋" ;;
esac

# Build message
MSG="[CI] ${EMOJI} ${JOB}"
[ -n "$PR" ] && MSG="${MSG} on #${PR}"
[ -n "$DETAIL" ] && MSG="${MSG} — ${DETAIL}"
[ -n "$URL" ] && MSG="${MSG}\n${URL}"

# Export for buzz CLI
export BUZZ_RELAY_URL="$RELAY"
export BUZZ_PRIVATE_KEY="$KEY"

# Send
RESULT=$(buzz messages send \
    --channel "$CI_CHANNEL" \
    --content "$MSG" 2>&1) || {
    echo "buzz-notify: failed to send — $RESULT" >&2
    exit 0  # Non-blocking: CI notification failure should NOT fail the workflow
}

echo "buzz-notify: sent to #ci"
