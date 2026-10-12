#!/usr/bin/env bash
# Regression tests for write-ssh-key.sh.
#
# Why this exists
# ---------------
# The "Bootstrap VPS" step of preview-deploy.yml materialises the
# PREVIEW_VPS_SSH_KEY secret into a file for ssh/scp. The exact byte shape of a
# GitHub secret depends on how it was stored:
#
#   * `gh secret set NAME < keyfile`  → value keeps the file's trailing newline
#   * `gh secret set NAME --body "$(cat keyfile)"` → command substitution
#     strips ALL trailing newlines, so the value has no final newline
#
# An OpenSSH/OpenSSL PEM key whose last line is not newline-terminated is
# rejected when ssh loads it:
#
#   Load key "/tmp/tmp.XXXX": error in libcrypto
#   Permission denied (publickey,password)
#
# That opaque pair of lines is exactly what run 34560831880 hit on 2026-09-11,
# and it looks like a wrong key / wrong host / missing secret even though the
# key material is fine. write-ssh-key.sh owns the normalisation so the deploy
# never depends on the shape of the stored secret.
#
# Contract under test
# -------------------
#   * accept: real newlines, literal "\n" escapes, CRLF, no trailing newline
#   * every accepted shape must yield a file `ssh-keygen -y -f` can read
#   * reject: garbage, empty, public key, passphrase-protected key
#   * reject loudly: non-zero exit + a message naming the secret and the doc
#   * the workflow must delegate to this script (no inline printf/sed copy)
#
# Usage: bash infra/preview-vps/test_write_ssh_key.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WRITER="${SCRIPT_DIR}/write-ssh-key.sh"
WORKFLOW="${SCRIPT_DIR}/../../.github/workflows/preview-deploy.yml"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

PASS=0
FAIL=0
ok() { printf 'ok   %s\n' "$1"; PASS=$((PASS + 1)); }
no() { printf 'FAIL %s\n' "$1"; FAIL=$((FAIL + 1)); }

# A throwaway key pair — never a real deploy key.
REF="${TMP}/ref_ed25519"
ssh-keygen -q -t ed25519 -N '' -C 'test@write-ssh-key' -f "${REF}" >/dev/null 2>&1 || {
  echo "FATAL: ssh-keygen could not generate the test key" >&2
  exit 2
}

# materialise <variant> — write the given byte shape to stdout
materialise() {
  local variant="$1"
  case "${variant}" in
    real-newlines)  cat "${REF}" ;;
    no-trailing-nl) printf '%s' "$(cat "${REF}")" ;;
    escaped-newlines)
      # single line with literal two-char "\n" separators
      awk 'BEGIN { first = 1 } { if (!first) printf "\\n"; printf "%s", $0; first = 0 }' "${REF}"
      printf '\n'
      ;;
    crlf) sed 's/$/\r/' "${REF}" ;;
    public-key) cat "${REF}.pub" ;;
    garbage) printf 'this is not a private key at all\n' ;;
    empty) printf '' ;;
    encrypted)
      ssh-keygen -q -t ed25519 -N 'hunter2hunter2' -C 'enc@test' -f "${TMP}/enc_ed25519" >/dev/null 2>&1
      cat "${TMP}/enc_ed25519" ;;
  esac
}

# assert_loads <variant> — writer must accept and produce a loadable key
assert_loads() {
  local variant="$1"
  local dest="${TMP}/out.${variant}"
  local err
  if ! err="$(materialise "${variant}" | bash "${WRITER}" "${dest}" 2>&1)"; then
    no "${variant}: writer rejected valid material: ${err//$'\n'/ | }"
    return
  fi
  if ssh-keygen -y -f "${dest}" >/dev/null 2>&1; then
    ok "${variant}: accepted, key loads"
  else
    no "${variant}: wrote a key that ssh-keygen cannot load (the libcrypto bug)"
  fi
  # the written file must be private
  local mode
  mode="$(stat -c '%a' "${dest}")"
  [ "${mode}" = "600" ] && ok "${variant}: file mode 600" || no "${variant}: file mode ${mode}, want 600"
}

# assert_rejects <variant> — writer must fail with an actionable message
assert_rejects() {
  local variant="$1"
  local dest="${TMP}/rej.${variant}"
  local out rc
  out="$(materialise "${variant}" | bash "${WRITER}" "${dest}" 2>&1)"
  rc=$?
  if [ "${rc}" -eq 0 ]; then
    no "${variant}: writer accepted unusable material (rc=0)"
    return
  fi
  case "${out}" in
    *PREVIEW_VPS_SSH_KEY*) ok "${variant}: rejected, message names the secret" ;;
    *) no "${variant}: rejected but message is not actionable: ${out//$'\n'/ | }" ;;
  esac
  case "${out}" in
    *preview-deploy.md*) ok "${variant}: rejected, message points at the docs" ;;
    *) no "${variant}: rejected without a docs pointer: ${out//$'\n'/ | }" ;;
  esac
}

echo "== accepted shapes =="
assert_loads real-newlines
assert_loads no-trailing-nl
assert_loads escaped-newlines
assert_loads crlf

echo "== rejected shapes =="
assert_rejects garbage
assert_rejects empty
assert_rejects public-key
assert_rejects encrypted

echo "== workflow wiring =="
if grep -q 'write-ssh-key\.sh' "${WORKFLOW}"; then
  ok "Bootstrap step delegates to write-ssh-key.sh"
else
  no "preview-deploy.yml does not call write-ssh-key.sh"
fi
if grep -qE "printf '%s' \"\\\$\{?PREVIEW_VPS_SSH_KEY" "${WORKFLOW}"; then
  no "preview-deploy.yml still materialises the key inline with printf '%s' (the bug)"
else
  ok "no inline printf '%s' key materialisation left in the workflow"
fi

printf '\n%d passed, %d failed\n' "${PASS}" "${FAIL}"
[ "${FAIL}" -eq 0 ]
