#!/usr/bin/env bash
# Regression tests for preview-request.sh — the metadata contract between
# the unprivileged Preview Collect workflow (pull_request, no secrets) and
# the privileged Preview Deploy workflow (workflow_run, repo secrets).
#
# Why this exists
# ---------------
# `pull_request` events never receive repository secrets when the PR head
# lives on a fork, so the old single-workflow preview deploy could never
# bootstrap the VPS for fork PRs (t_fa71dc15 root cause). The fix splits
# the pipeline: the collector writes a JSON request (PR number, action,
# head SHA, labels) into an artifact, and the deploy workflow consumes it.
# The JSON travels inside a PR-built artifact, i.e. it is PR-controlled
# data reaching a secrets-holding runner — so every field must be
# validated before it touches a shell string there. These tests pin that
# contract.
#
# Contract under test
# -------------------
#   write <dir>
#     * emits <dir>/preview-request.json from PR_* / HEAD_* env vars
#     * labels default to [] when PR_LABELS_JSON is unset
#     * rejects a non-numeric PR_NUMBER loudly (::error + nonzero exit)
#   route <file>
#     * action opened|synchronize → kind=deploy
#     * action closed             → kind=teardown
#     * outputs: kind, pr_number, head_sha, subdomain, pr_offset, app_port,
#       relay_port, labels (comma-joined)
#     * subdomain/ports are COMPUTED from the validated pr_number — never
#       read from the file (no injection path)
#     * binds head_sha to EXPECTED_HEAD_SHA when provided (mismatch fails)
#     * rejects: missing file, invalid JSON, wrong schema_version, unknown
#       action, non-integer/zero/negative pr_number, non-hex head_sha,
#       empty head_repo on deploy — each with ::error + nonzero exit
#
# Usage: bash infra/preview-vps/test_preview_request.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQ="${SCRIPT_DIR}/preview-request.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

PASS=0
FAIL=0
ok() { printf 'ok   %s\n' "$1"; PASS=$((PASS + 1)); }
no() { printf 'FAIL %s\n' "$1"; FAIL=$((FAIL + 1)); }

if [ ! -f "${REQ}" ]; then
  echo "FATAL: ${REQ} not found — run these tests with the script in place" >&2
  exit 1
fi

# A syntactically valid 40-char hex object id (stand-in for a head SHA).
SHA40="abcdabcdabcdabcdabcdabcdabcdabcdabcdabcd"

# write_request <dir> <action> <pr_number> [pr_labels_json] — invoke `write`
# with a controlled environment.
write_request() {
  local dir="$1" action="$2" number="$3" labels="${4:-}"
  (
    export PR_ACTION="${action}" PR_NUMBER="${number}" \
      HEAD_SHA="${SHA40}" HEAD_REF="feat/some-branch" \
      HEAD_REPO="someone/market"
    if [ -n "${labels}" ]; then
      export PR_LABELS_JSON="${labels}"
    else
      unset PR_LABELS_JSON 2>/dev/null || true
    fi
    bash "${REQ}" write "${dir}"
  )
}

# route_into <out-file> <json-file> [expected_head_sha] — invoke `route`,
# capturing GITHUB_OUTPUT into <out-file>; combined output on stdout.
route_into() {
  local out="$1" file="$2" expected="${3:-}"
  (
    export GITHUB_OUTPUT="${out}"
    if [ -n "${expected}" ]; then
      export EXPECTED_HEAD_SHA="${expected}"
    else
      unset EXPECTED_HEAD_SHA 2>/dev/null || true
    fi
    bash "${REQ}" route "${file}"
  ) 2>&1
}

# out_get <file> <key> — read one key=value line written to GITHUB_OUTPUT.
out_get() { sed -n "s/^$2=//p" "$1" | head -1; }

# ── write ─────────────────────────────────────────────────────────────

W1="${TMP}/w1"; mkdir -p "${W1}"
if write_request "${W1}" synchronize 4 '["ui","preview"]' >/dev/null; then
  ok "write: exits 0"
else
  no "write: exits 0"
fi
JSON="${W1}/preview-request.json"
if [ -f "${JSON}" ] && jq -e . "${JSON}" >/dev/null 2>&1; then
  ok "write: emits valid preview-request.json"
else
  no "write: emits valid preview-request.json"
fi
[ "$(jq -r .schema_version "${JSON}")" = "1" ] &&
  ok "write: schema_version is 1" || no "write: schema_version is 1"
[ "$(jq -r .action "${JSON}")" = "synchronize" ] &&
  ok "write: records the action" || no "write: records the action"
[ "$(jq -r .pr_number "${JSON}")" = "4" ] &&
  ok "write: records the PR number" || no "write: records the PR number"
[ "$(jq -r .head_sha "${JSON}")" = "${SHA40}" ] &&
  ok "write: records the head SHA" || no "write: records the head SHA"
[ "$(jq -r .head_repo "${JSON}")" = "someone/market" ] &&
  ok "write: records the head repo" || no "write: records the head repo"
[ "$(jq -c .labels "${JSON}")" = '["ui","preview"]' ] &&
  ok "write: records labels as a JSON array" || no "write: records labels as a JSON array"

W2="${TMP}/w2"; mkdir -p "${W2}"
write_request "${W2}" opened 7 >/dev/null 2>&1
[ "$(jq -c .labels "${W2}/preview-request.json")" = '[]' ] &&
  ok "write: labels default to [] when unset" || no "write: labels default to [] when unset"

W3="${TMP}/w3"; mkdir -p "${W3}"
W3_OUT="$(write_request "${W3}" synchronize not-a-number 2>&1)" && RC=0 || RC=$?
if [ "${RC}" -ne 0 ] && printf '%s' "${W3_OUT}" | grep -q '::error'; then
  ok "write: rejects a non-numeric PR_NUMBER with ::error + nonzero exit"
else
  no "write: rejects a non-numeric PR_NUMBER with ::error + nonzero exit"
fi

# ── route: classification and computed outputs ────────────────────────

R1="${TMP}/r1.out"
ROUTE1="$(route_into "${R1}" "${JSON}")" && RC=0 || RC=$?
if [ "${RC}" -eq 0 ]; then ok "route: exits 0 on a valid deploy request"; else no "route: exits 0 on a valid deploy request"; fi
[ "$(out_get "${R1}" kind)" = "deploy" ] &&
  ok "route: synchronize → kind=deploy" || no "route: synchronize → kind=deploy"
[ "$(out_get "${R1}" pr_number)" = "4" ] &&
  ok "route: exposes pr_number" || no "route: exposes pr_number"
[ "$(out_get "${R1}" head_sha)" = "${SHA40}" ] &&
  ok "route: exposes head_sha" || no "route: exposes head_sha"
[ "$(out_get "${R1}" subdomain)" = "pr4.test-market.orangesync.tech" ] &&
  ok "route: computes subdomain pr4.test-market.orangesync.tech" ||
  no "route: computes subdomain pr4.test-market.orangesync.tech"
[ "$(out_get "${R1}" pr_offset)" = "40" ] &&
  ok "route: computes pr_offset 40 for PR 4" || no "route: computes pr_offset 40 for PR 4"
[ "$(out_get "${R1}" app_port)" = "3040" ] &&
  ok "route: computes app_port 3040 for PR 4" || no "route: computes app_port 3040 for PR 4"
[ "$(out_get "${R1}" relay_port)" = "10587" ] &&
  ok "route: computes relay_port 10587 for PR 4" || no "route: computes relay_port 10587 for PR 4"
[ "$(out_get "${R1}" labels)" = "ui,preview" ] &&
  ok "route: exposes labels comma-joined" || no "route: exposes labels comma-joined"

R2="${TMP}/r2.out"
route_into "${R2}" "${W2}/preview-request.json" >/dev/null 2>&1
[ "$(out_get "${R2}" kind)" = "deploy" ] &&
  ok "route: opened → kind=deploy" || no "route: opened → kind=deploy"
[ "$(out_get "${R2}" subdomain)" = "pr7.test-market.orangesync.tech" ] &&
  ok "route: computes subdomain for PR 7" || no "route: computes subdomain for PR 7"

# PR 1257: offset (1257 % 100) * 10 = 570 — the mod-100 collision case.
W4="${TMP}/w4"; mkdir -p "${W4}"
write_request "${W4}" synchronize 1257 >/dev/null 2>&1
R4="${TMP}/r4.out"
route_into "${R4}" "${W4}/preview-request.json" >/dev/null 2>&1
[ "$(out_get "${R4}" pr_offset)" = "570" ] &&
  ok "route: computes pr_offset 570 for PR 1257" || no "route: computes pr_offset 570 for PR 1257"
[ "$(out_get "${R4}" app_port)" = "3570" ] &&
  ok "route: computes app_port 3570 for PR 1257" || no "route: computes app_port 3570 for PR 1257"
[ "$(out_get "${R4}" relay_port)" = "11117" ] &&
  ok "route: computes relay_port 11117 for PR 1257" || no "route: computes relay_port 11117 for PR 1257"

W5="${TMP}/w5"; mkdir -p "${W5}"
write_request "${W5}" closed 4 >/dev/null 2>&1
R5="${TMP}/r5.out"
route_into "${R5}" "${W5}/preview-request.json" >/dev/null 2>&1
[ "$(out_get "${R5}" kind)" = "teardown" ] &&
  ok "route: closed → kind=teardown" || no "route: closed → kind=teardown"
[ "$(out_get "${R5}" subdomain)" = "pr4.test-market.orangesync.tech" ] &&
  ok "route: teardown also gets the subdomain" || no "route: teardown also gets the subdomain"

# ── route: head_sha binding to the triggering run ─────────────────────

R6="${TMP}/r6.out"
route_into "${R6}" "${JSON}" "${SHA40}" >/dev/null 2>&1 &&
  ok "route: EXPECTED_HEAD_SHA match passes" || no "route: EXPECTED_HEAD_SHA match passes"
R7="${TMP}/r7.out"
ROUTE7="$(route_into "${R7}" "${JSON}" "0000000000000000000000000000000000000000")" && RC=0 || RC=$?
if [ "${RC}" -ne 0 ] && printf '%s' "${ROUTE7}" | grep -q '::error'; then
  ok "route: EXPECTED_HEAD_SHA mismatch fails with ::error"
else
  no "route: EXPECTED_HEAD_SHA mismatch fails with ::error"
fi

# ── route: rejection of malformed / hostile metadata ──────────────────

reject_case() { # <name> <file>
  local name="$1" file="$2" out rc
  out="$(route_into "${TMP}/reject.out" "${file}" 2>&1)" && rc=0 || rc=$?
  if [ "${rc}" -ne 0 ] && printf '%s' "${out}" | grep -q '::error'; then
    ok "route rejects: ${name}"
  else
    no "route rejects: ${name}"
  fi
}

BAD="${TMP}/bad"; mkdir -p "${BAD}"
reject_case "missing file" "${BAD}/does-not-exist.json"

printf 'this is not json\n' > "${BAD}/garbage.json"
reject_case "invalid JSON" "${BAD}/garbage.json"

jq '.schema_version = 2' "${JSON}" > "${BAD}/schema.json"
reject_case "unknown schema_version" "${BAD}/schema.json"

jq '.action = "reopened"' "${JSON}" > "${BAD}/action.json"
reject_case "unknown action" "${BAD}/action.json"

jq '.pr_number = "four"' "${JSON}" > "${BAD}/strnum.json"
reject_case "non-integer pr_number" "${BAD}/strnum.json"

jq '.pr_number = 0' "${JSON}" > "${BAD}/zero.json"
reject_case "zero pr_number" "${BAD}/zero.json"

jq '.pr_number = -3' "${JSON}" > "${BAD}/neg.json"
reject_case "negative pr_number" "${BAD}/neg.json"

jq '.head_sha = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"' "${JSON}" > "${BAD}/sha.json"
reject_case "non-hex head_sha" "${BAD}/sha.json"

jq '.head_repo = ""' "${JSON}" > "${BAD}/repo.json"
reject_case "empty head_repo on deploy" "${BAD}/repo.json"

# Teardown does not require head_repo (it is not used for tearing down).
jq '.action = "closed" | .head_repo = ""' "${JSON}" > "${BAD}/repo-ok.json"
R8="${TMP}/r8.out"
route_into "${R8}" "${BAD}/repo-ok.json" >/dev/null 2>&1 &&
  ok "route: teardown tolerates empty head_repo" || no "route: teardown tolerates empty head_repo"

# ── summary ───────────────────────────────────────────────────────────

printf '\n%s passed, %s failed\n' "${PASS}" "${FAIL}"
[ "${FAIL}" -eq 0 ] || exit 1
exit 0
