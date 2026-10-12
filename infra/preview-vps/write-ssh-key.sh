#!/usr/bin/env bash
#
# write-ssh-key.sh — materialise a deploy SSH private key from stdin into a
# file that ssh/scp can actually load.
#
# Why this exists
# ---------------
# The key arrives as the `PREVIEW_VPS_SSH_KEY` GitHub secret, and the exact
# byte shape of a secret depends on how it was stored:
#
#   gh secret set PREVIEW_VPS_SSH_KEY < keyfile                # keeps the LF
#   gh secret set PREVIEW_VPS_SSH_KEY --body "$(cat keyfile)"  # strips it
#
# An OpenSSH/PEM key whose last line is not newline-terminated is rejected by
# ssh with an error that looks like a wrong key or a wrong host:
#
#   Load key "/tmp/tmp.XXXX": error in libcrypto
#   Permission denied, please try again.
#   Received disconnect ... Too many authentication failures
#
# (observed on run 34560831880, 2026-09-11 — the pre-flight guard had passed,
# the host-key fingerprint had verified, and the key material was fine). This
# script owns the normalisation — literal "\n" escapes and CRLF are turned into
# real newlines and a terminating newline is guaranteed — and then validates
# the result with ssh-keygen before any key material is offered to a host.
#
# Usage:
#   bash write-ssh-key.sh <dest-file> < private-key-material
#
# Exit codes:
#   0  dest written, mode 600, readable by ssh-keygen
#   1  unusable material — the message names the secret and the docs
#   2  usage error
set -euo pipefail

DOC="docs/ops/preview-deploy.md"

usage() {
  echo "usage: bash write-ssh-key.sh <dest-file> < private-key-material" >&2
  exit 2
}

die() {
  local detail="$1"
  {
    echo "FATAL: PREVIEW_VPS_SSH_KEY is not a usable SSH private key: ${detail}"
    echo "  Required: the PRIVATE key file (not the .pub), OpenSSH or PEM"
    echo "  format, with no passphrase — the deploy step cannot answer a prompt."
    echo "  Store it byte-for-byte, e.g.:"
    echo "    gh secret set PREVIEW_VPS_SSH_KEY --repo <owner>/<repo> < ~/.ssh/preview_deploy"
    echo "  See ${DOC} for the secret list and how to re-set the key."
  } >&2
  exit 1
}

DEST="${1:-}"
[ -n "${DEST}" ] || usage

RAW="$(mktemp)"
NORM="$(mktemp)"
trap 'rm -f "${RAW}" "${NORM}"' EXIT

cat > "${RAW}"
[ -s "${RAW}" ] || die "the secret value is empty"

# Literal two-character "\n" escapes (a `--body "$(cat key)"` or JSON-flattened
# store can put the whole key on one line) and CRLF line endings are normalised
# to plain LF.
sed -e 's/\\n/\n/g' "${RAW}" | tr -d '\r' > "${NORM}"

# Guarantee a newline-terminated last line — the libcrypto bug above.
printf '\n' >> "${NORM}"

# Shape checks first, so the common mistakes get a targeted message instead of
# ssh-keygen's generic failure.
if ! grep -q -- '-----BEGIN [A-Z ]*PRIVATE KEY-----' "${NORM}"; then
  if grep -qE '^(ssh-(rsa|ed25519|dss)|ecdsa-sha2-|sk-(ssh|ecdsa)-)' "${NORM}"; then
    die "the material is a public key (.pub) — store the private key file instead"
  fi
  die "no '-----BEGIN … PRIVATE KEY-----' header found"
fi

( umask 077; cat "${NORM}" > "${DEST}" )
chmod 600 "${DEST}"

# Validate the exact bytes ssh will read. stdin is /dev/null so a
# passphrase-protected key fails here instead of hanging on a prompt.
if ! ERR="$(ssh-keygen -y -f "${DEST}" </dev/null 2>&1)"; then
  die "ssh-keygen cannot read it: $(printf '%s' "${ERR}" | head -n 1)"
fi

echo "wrote deploy key for PREVIEW_VPS_SSH_KEY to ${DEST}" >&2
