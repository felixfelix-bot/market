#!/usr/bin/env bash
# Regression tests for ssh-pin.sh (the shared deploy-key + host-key pinning).
#
# Why this exists
# ---------------
# The preview deploy handed PREVIEW_VPS_HOST_FINGERPRINT to the appleboy
# ssh-action/scp-action `fingerprint:` input. drone-ssh → easyssh-proxy compares
# that secret against `ssh.FingerprintSHA256()` of the host key the *Go* client
# negotiated, and a Go client picks the key type by its own preference order.
# This VPS offers ed25519, ECDSA and RSA; the client negotiates ECDSA while the
# secret holds the ED25519 fingerprint, so every deploy died in
# "Ensure remote preview directory exists" with:
#
#   ssh: handshake failed: ssh: host key fingerprint mismatch
#   (run 34599181010, 2026-09-11)
#
# Contract under test (ssh-pin.sh)
# --------------------------------
#   * ONE ssh-keyscan call; comment lines ignored
#   * the pinned fingerprint may match ANY offered key type; the handshake is
#     then restricted to exactly that type
#   * unreachable host → loud "UNREACHABLE … NOT a secret problem" (the
#     provider outage in 23.182.128.0/24 mimics a secret failure)
#   * pin mismatch → loud failure printing pinned + every offered fingerprint
#   * malformed pin (e.g. the whole `ssh-keygen -lf` line) → loud failure
#   * unusable key material is delegated to write-ssh-key.sh
#   * ssh/scp always run with StrictHostKeyChecking=yes against a private
#     known_hosts holding only the verified key
#   * no private-key bytes ever reach the log
#   * the workflow + provision.sh delegate to this script (no appleboy
#     `fingerprint:` pinning left anywhere)
#
# Usage: bash infra/preview-vps/test_ssh_pin.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIN="${SCRIPT_DIR}/ssh-pin.sh"
PROVISION="${SCRIPT_DIR}/provision.sh"
WORKFLOW="${SCRIPT_DIR}/../../.github/workflows/preview-deploy.yml"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

PASS=0
FAIL=0
ok() { printf 'ok   %s\n' "$1"; PASS=$((PASS + 1)); }
no() { printf 'FAIL %s\n' "$1"; FAIL=$((FAIL + 1)); }

HOST="23.182.128.51"

# ── Fixtures: a throwaway deploy key, real host keys, a stub PATH ───────────
DEPLOY_KEY="${TMP}/deploy_key"
ssh-keygen -q -t ed25519 -N '' -C 'test@ssh-pin' -f "${DEPLOY_KEY}" >/dev/null 2>&1 || {
  echo "FATAL: ssh-keygen could not generate the test deploy key" >&2
  exit 2
}

ssh-keygen -q -t ed25519 -N '' -C 'host@ed25519' -f "${TMP}/host_ed25519" >/dev/null 2>&1
ssh-keygen -q -t ecdsa -b 256 -N '' -C 'host@ecdsa' -f "${TMP}/host_ecdsa" >/dev/null 2>&1

scan_line() { # scan_line <pubfile> → "host type base64" (no comment)
  awk -v h="${HOST}" '{ printf "%s %s %s\n", h, $1, $2 }' "$1"
}
fp_of() { ssh-keygen -lf "$1" | awk '{print $2}'; }

ED25519_LINE="$(scan_line "${TMP}/host_ed25519.pub")"
ECDSA_LINE="$(scan_line "${TMP}/host_ecdsa.pub")"
ED25519_FP="$(fp_of "${TMP}/host_ed25519.pub")"
ECDSA_FP="$(fp_of "${TMP}/host_ecdsa.pub")"

SCAN_FILE="${TMP}/scan.txt"
{
  printf '# %s:22 SSH-2.0-OpenSSH_10.0p2 Debian-7+deb13u4\n' "${HOST}"
  printf '%s\n' "${ED25519_LINE}"
  printf '# %s:22 SSH-2.0-OpenSSH_10.0p2 Debian-7+deb13u4\n' "${HOST}"
  printf '%s\n' "${ECDSA_LINE}"
} > "${SCAN_FILE}"

STUB="${TMP}/stub"
mkdir -p "${STUB}"

cat > "${STUB}/ssh-keyscan" <<'SHIM'
#!/usr/bin/env bash
# stub: emits the canned scan (or nothing, to simulate an unreachable host)
[ -n "${FAKE_SCAN_FILE:-}" ] || exit 0
[ -s "${FAKE_SCAN_FILE}" ] || exit 0
cat "${FAKE_SCAN_FILE}"
SHIM

cat > "${STUB}/ssh" <<'SHIM'
#!/usr/bin/env bash
# stub: records the options/host and how many lines arrived on stdin
{
  printf 'ARGV: %s\n' "$*"
  stdin_lines=0
  while IFS= read -r _; do stdin_lines=$((stdin_lines + 1)); done
  printf 'STDIN_LINES: %s\n' "${stdin_lines}"
} > "${FAKE_SSH_LOG:?}"
exit "${FAKE_SSH_RC:-0}"
SHIM

cat > "${STUB}/scp" <<'SHIM'
#!/usr/bin/env bash
# stub: records the options/args
printf 'ARGV: %s\n' "$*" > "${FAKE_SSH_LOG:?}"
exit "${FAKE_SSH_RC:-0}"
SHIM

chmod +x "${STUB}/ssh-keyscan" "${STUB}/ssh" "${STUB}/scp"
export PATH="${STUB}:${PATH}"
export FAKE_SCAN_FILE="${SCAN_FILE}"

# Case-level env: every ssh_pin_init run below inherits these.
export PREVIEW_VPS_HOST="${HOST}"
export PREVIEW_VPS_USER="debian"
PREVIEW_VPS_SSH_KEY="$(cat "${DEPLOY_KEY}")"
export PREVIEW_VPS_SSH_KEY
export PREVIEW_VPS_HOST_FINGERPRINT="${ED25519_FP}"

# run_pin <pin> [key-material] — sources the helper in a subshell and runs
# ssh_pin_init. stdout+stderr are returned; rc via $?.
run_pin() {
  local pin="$1"
  (
    export PREVIEW_VPS_HOST_FINGERPRINT="${pin}"
    if [ "$#" -ge 2 ]; then export PREVIEW_VPS_SSH_KEY="$2"; fi
    # shellcheck disable=SC1090
    source "${PIN}"
    ssh_pin_init
  ) 2>&1
}

# ── accepted pins ──────────────────────────────────────────────────────────
echo "== pinned fingerprint matches an offered host key =="

out="$(run_pin "${ED25519_FP}")"
rc=$?
if [ "${rc}" -eq 0 ]; then ok "ed25519 pin accepted"; else no "ed25519 pin rejected: ${out//$'\n'/ | }"; fi

# the same run, inspected in-process (known_hosts content + ssh args)
INSPECT="${TMP}/inspect.sh"
cat > "${INSPECT}" <<'INSPECT_SH'
set -uo pipefail
source "${PIN}"
ssh_pin_init >/dev/null
printf 'ALGO=%s\n' "${SSH_PIN_ALGO}"
printf 'KNOWN_HOSTS_COPY=%s\n' "$(cat "${SSH_PIN_KNOWN_HOSTS}")"
printf 'ARGS=%s\n' "${SSH_PIN_ARGS[*]}"
printf 'KEY_TMP=%s\n' "${SSH_PIN_KEY}"
printf 'KH_TMP=%s\n' "${SSH_PIN_KNOWN_HOSTS}"
INSPECT_SH

inspect() { # inspect <pin> [material]
  (
    export PIN="${PIN}" FAKE_SSH_LOG="${TMP}/inspect.log"
    export PREVIEW_VPS_HOST="${HOST}" PREVIEW_VPS_USER="debian"
    export PREVIEW_VPS_HOST_FINGERPRINT="$1"
    if [ "$#" -ge 2 ]; then
      export PREVIEW_VPS_SSH_KEY="$2"
    else
      PREVIEW_VPS_SSH_KEY="$(cat "${DEPLOY_KEY}")"
      export PREVIEW_VPS_SSH_KEY
    fi
    bash "${INSPECT}"
  ) 2>&1
}

info="$(inspect "${ED25519_FP}")"
case "${info}" in
  *"ALGO=ssh-ed25519"*) ok "ed25519 pin → HostKeyAlgorithms=ssh-ed25519" ;;
  *) no "ed25519 pin produced unexpected algo: ${info//$'\n'/ | }" ;;
esac
case "${info}" in
  *"KNOWN_HOSTS_COPY=${ED25519_LINE}"*) ok "known_hosts holds exactly the pinned key" ;;
  *) no "known_hosts does not hold the pinned key: ${info//$'\n'/ | }" ;;
esac
case "${info}" in
  *"StrictHostKeyChecking=yes"*) ok "ssh pinned with StrictHostKeyChecking=yes" ;;
  *) no "ssh is not pinned (no StrictHostKeyChecking=yes): ${info//$'\n'/ | }" ;;
esac
case "${info}" in
  *"HostKeyAlgorithms=ssh-ed25519"*) ok "handshake restricted to the pinned key type" ;;
  *) no "handshake not restricted to the pinned type" ;;
esac
case "${info}" in
  *"ConnectTimeout=30"*) ok "ConnectTimeout bounds an unreachable host" ;;
  *) no "no ConnectTimeout — an unreachable host can hang the step" ;;
esac

# type-agnostic pin: an ECDSA pin must work too (no client preference involved)
info="$(inspect "${ECDSA_FP}")"
case "${info}" in
  *"ALGO=ecdsa-sha2-nistp256"*) ok "ECDSA pin accepted and restricted to ECDSA" ;;
  *) no "ECDSA pin not honoured: ${info//$'\n'/ | }" ;;
esac
case "${info}" in
  *"KNOWN_HOSTS_COPY=${ECDSA_LINE}"*) ok "known_hosts holds exactly the pinned ECDSA key" ;;
  *) no "known_hosts wrong for ECDSA pin" ;;
esac

# temp files (key + known_hosts) must be gone once the caller exits
key_tmp="$(printf '%s' "${info}" | sed -n 's/^KEY_TMP=//p')"
kh_tmp="$(printf '%s' "${info}" | sed -n 's/^KH_TMP=//p')"
if [ -n "${key_tmp}" ] && [ ! -e "${key_tmp}" ]; then ok "key temp file removed on exit"; else no "key temp file left behind: ${key_tmp}"; fi
if [ -n "${kh_tmp}" ] && [ ! -e "${kh_tmp}" ]; then ok "known_hosts temp file removed on exit"; else no "known_hosts left behind: ${kh_tmp}"; fi

# ── ssh/scp invocation ─────────────────────────────────────────────────────
echo "== ssh / scp wrappers =="
export FAKE_SSH_LOG="${TMP}/ssh.log"
echo "line-one" | (
  # shellcheck disable=SC1090
  source "${PIN}"
  ssh_pin_init >/dev/null
  ssh_pin_ssh bash -s
) 2>&1 | head -2 >/dev/null
if grep -q "ARGV: .*bash -s" "${FAKE_SSH_LOG}" && grep -q 'STDIN_LINES: 1' "${FAKE_SSH_LOG}"; then
  ok "ssh_pin_ssh forwards args and remote script on stdin"
else
  no "ssh_pin_ssh did not forward args/stdin: $(tr '\n' '|' < "${FAKE_SSH_LOG}")"
fi
(
  # shellcheck disable=SC1090
  source "${PIN}"
  ssh_pin_init >/dev/null
  ssh_pin_scp deploy-package "${HOST}:target"
) >/dev/null 2>&1
if grep -q "deploy-package ${HOST}:target" "${FAKE_SSH_LOG}"; then
  ok "ssh_pin_scp forwards its arguments"
else
  no "ssh_pin_scp did not forward args"
fi

# ── rejected states ────────────────────────────────────────────────────────
echo "== rejected states =="

out="$(run_pin "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")"
rc=$?
if [ "${rc}" -ne 0 ]; then ok "unknown pin rejected (rc=${rc})"; else no "unknown pin accepted"; fi
case "${out}" in
  *"host key fingerprint mismatch"*) ok "mismatch reported as a fingerprint mismatch" ;;
  *) no "mismatch message unclear: ${out//$'\n'/ | }" ;;
esac
case "${out}" in
  *"${ED25519_FP}"*"${ECDSA_FP}"*|*"${ECDSA_FP}"*"${ED25519_FP}"*) ok "mismatch lists every offered fingerprint" ;;
  *) no "mismatch does not list the offered fingerprints: ${out//$'\n'/ | }" ;;
esac
case "${out}" in
  *"preview-deploy.md"*) ok "mismatch points at the docs" ;;
  *) no "mismatch without a docs pointer" ;;
esac
case "${out}" in
  *"PRIVATE KEY"*) no "the failure log leaked private-key material" ;;
  *) ok "no private-key material in the failure log" ;;
esac

# malformed pin: the whole `ssh-keygen -lf` line, a real operator mistake
out="$(run_pin "256 ${ED25519_FP} ${HOST} (ED25519)")"
rc=$?
if [ "${rc}" -ne 0 ]; then ok "whole ssh-keygen -lf line rejected (rc=${rc})"; else no "malformed pin accepted"; fi
case "${out}" in
  *"host key fingerprint mismatch"*) ok "malformed pin reported as a mismatch" ;;
  *) no "malformed pin message unclear: ${out//$'\n'/ | }" ;;
esac

# unreachable host: empty scan = target problem, NOT a secret problem
export FAKE_SCAN_FILE="${TMP}/empty-scan.txt"
: > "${FAKE_SCAN_FILE}"
out="$(run_pin "${ED25519_FP}")"
rc=$?
if [ "${rc}" -ne 0 ]; then ok "unreachable host fails the deploy (rc=${rc})"; else no "unreachable host was not detected"; fi
case "${out}" in
  *UNREACHABLE*) ok "unreachable host is reported as UNREACHABLE" ;;
  *) no "unreachable message unclear: ${out//$'\n'/ | }" ;;
esac
case "${out}" in
  *"NOT a"*"secret problem"*) ok "unreachable host is explicitly not a secret failure" ;;
  *) no "unreachable message does not separate target from secret" ;;
esac
case "${out}" in
  *"23.182.128.0/24"*) ok "unreachable message names the outage-prone subnet" ;;
  *) no "unreachable message does not mention the provider outage" ;;
esac
export FAKE_SCAN_FILE="${SCAN_FILE}"

# unusable key material is still write-ssh-key.sh's call
out="$(run_pin "${ED25519_FP}" "$(cat "${DEPLOY_KEY}.pub")")"
rc=$?
if [ "${rc}" -ne 0 ]; then ok "public key as secret rejected (rc=${rc})"; else no "public key accepted as a secret"; fi
case "${out}" in
  *PREVIEW_VPS_SSH_KEY*) ok "bad key material names the offending secret" ;;
  *) no "bad key material message not actionable: ${out//$'\n'/ | }" ;;
esac

# ── wiring ─────────────────────────────────────────────────────────────────
echo "== wiring =="
if grep -q 'ssh-pin\.sh' "${WORKFLOW}"; then
  ok "preview-deploy.yml delegates to ssh-pin.sh"
else
  no "preview-deploy.yml does not use ssh-pin.sh"
fi
if grep -q 'appleboy/' "${WORKFLOW}"; then
  no "preview-deploy.yml still uses an appleboy action (fingerprint pinning)"
else
  ok "no appleboy action left in the preview workflow"
fi
if grep -q 'fingerprint: \${{ secrets' "${WORKFLOW}"; then
  no "preview-deploy.yml still pins via the appleboy fingerprint input"
else
  ok "no appleboy fingerprint input left in the preview workflow"
fi
if grep -q 'ssh-pin\.sh' "${PROVISION}"; then
  ok "provision.sh shares the same pinning implementation"
else
  no "provision.sh does not source ssh-pin.sh (two divergent pinning models)"
fi

# A whole-file rewrite from a masked tool read once turned every
# `Bearer $CF_TOKEN` header into the literal masked form, which the Cloudflare
# API rejects (6111 invalid Authorization header) and which only becomes
# visible as an opaque `jq: ... Cannot iterate over null` at the DNS step.
if grep -qE 'Bearer \*\*\*' "${WORKFLOW}"; then
  no "preview-deploy.yml sends a literal masked Authorization header instead of \$CF_TOKEN"
else
  ok "no masked Authorization header in the preview workflow"
fi
cf_headers="$(grep -c 'Bearer \$CF_TOKEN' "${WORKFLOW}" || true)"
if [ "${cf_headers:-0}" -ge 5 ]; then
  ok "all ${cf_headers} Cloudflare headers interpolate \$CF_TOKEN"
else
  no "only ${cf_headers:-0} Cloudflare headers interpolate \$CF_TOKEN (want >= 5)"
fi

# ── health-check status honesty ────────────────────────────────────────────
# A step-level `continue-on-error: true` on the Health check made a FINAL
# health failure (all 12 attempts exhausted, exit 1) report as a green
# "Deploy preview" check — run 34605660792 deployed the preview, failed the
# health check 12/12 and still showed `Deploy preview  pass`. The comment step
# keeps the PR in the loop because it is guarded with `if: ${{ !cancelled() }}`,
# so it runs after a failed health step WITHOUT masking the failure.
echo "== health-check status honesty =="
HEALTH_BLOCK="$(awk '/^      - name: Health check$/,/^      - name: Post \/ update preview URL PR comment$/' "${WORKFLOW}")"
if [ -z "${HEALTH_BLOCK}" ]; then
  no "could not locate the Health check step in the preview workflow"
else
  if grep -q 'continue-on-error: true' <<<"${HEALTH_BLOCK}"; then
    no "the Health check step still masks a final failure with continue-on-error: true"
  else
    ok "the Health check step is not masked (a final failure turns the check red)"
  fi
  if grep -qE '^ *exit 1$' <<<"${HEALTH_BLOCK}"; then
    ok "the Health check step exits nonzero on a final failure"
  else
    no "the Health check step never exits nonzero — a dead preview reports green"
  fi
fi
if grep -q 'if: \${{ !cancelled() }}' "${WORKFLOW}"; then
  ok "reporting steps are guarded with if: \${{ !cancelled() }} (they run after a failed deploy step)"
else
  no "no if: \${{ !cancelled() }} guard — a failed health step would suppress the degraded PR comment"
fi

# GitHub parses workflow expressions even inside a `run:` block's comments, so
# an if-only function hidden in a comment makes the whole FILE invalid and no
# check runs at all — the failure surfaces as "Invalid workflow file: …#L1"
# with the run named after the path (the first attempt at this fix, 5491914e,
# never executed for exactly that reason).
if grep -nE '^[[:space:]]*#.*\$\{\{[^}]*\b(always|success|failure|cancelled)\(\)' "${WORKFLOW}" >/dev/null; then
  no "a workflow comment hides an if-only function expression — the workflow file is invalid"
else
  ok "no if-only function expressions hidden in workflow comments"
fi

printf '\n%d passed, %d failed\n' "${PASS}" "${FAIL}"
[ "${FAIL}" -eq 0 ]
