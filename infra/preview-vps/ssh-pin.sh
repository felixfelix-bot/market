#!/usr/bin/env bash
#
# ssh-pin.sh — ONE implementation of "materialise the deploy key and pin the
# preview VPS host key", shared by infra/preview-vps/provision.sh and every
# remote step of .github/workflows/preview-deploy.yml.
#
# Why this exists
# ---------------
# The deploy used to hand PREVIEW_VPS_HOST_FINGERPRINT to the appleboy
# ssh-action / scp-action `fingerprint:` input. Those actions run
# drone-ssh → easyssh-proxy, whose check is a bare string equality against
# `ssh.FingerprintSHA256()` of the host key that the *Go* ssh client
# negotiated:
#
#     hostKeyCallback = func(...) error {
#         if ssh.FingerprintSHA256(publicKey) != config.Fingerprint {
#             return ErrFingerprintMismatch   // "ssh: host key fingerprint
#                                              //  mismatch"
#         }
#     }
#
# A Go ssh client chooses the host key type by its OWN preference order, not by
# the secret's. This VPS offers ssh-ed25519, ecdsa-sha2-nistp256 and ssh-rsa;
# an x/crypto/ssh client negotiates the *ECDSA* key, while the secret (and
# provision.sh, which pins `ssh-keyscan -t ed25519` +
# `HostKeyAlgorithms=ssh-ed25519`) holds the ED25519 fingerprint. The two can
# never agree, so every deploy died in "Ensure remote preview directory
# exists" with:
#
#     ssh: handshake failed: ssh: host key fingerprint mismatch
#     (run 34599181010, 2026-09-11 — the secret guard, the key materialisation
#      and provision.sh's host-key verification had all already passed)
#
# Reproduced locally against the VPS: pinning the ECDSA fingerprint gets past
# the handshake, pinning the ED25519 one returns ErrFingerprintMismatch.
#
# The fix is to stop delegating the pin to a third-party client's preference
# order and pin with OpenSSH instead — exactly what provision.sh already did.
# Scan the offered host keys ONCE, require one of them to match the pinned
# fingerprint, then connect with StrictHostKeyChecking=yes against a private
# known_hosts holding that single key, with HostKeyAlgorithms restricted to its
# type. Bootstrap, deploy and teardown therefore share one pinning model, and
# the pinned key type may be any type the host offers (ed25519, ECDSA or RSA) —
# the secret decides, not the client.
#
# Usage (the caller keeps its own `set -euo pipefail`):
#
#   source infra/preview-vps/ssh-pin.sh
#   ssh_pin_init
#   ssh_pin_ssh 'remote command'          # pinned ssh
#   ssh_pin_ssh bash -s <<'REMOTE'        # pinned ssh, remote script on stdin
#   ssh_pin_scp local-file remote:path    # pinned scp
#
# Requires env: PREVIEW_VPS_HOST, PREVIEW_VPS_USER, PREVIEW_VPS_SSH_KEY,
#               PREVIEW_VPS_HOST_FINGERPRINT
#
# Sets globals: SSH_PIN_HOST, SSH_PIN_USER, SSH_PIN_KEY, SSH_PIN_KNOWN_HOSTS,
#               SSH_PIN_ALGO, SSH_PIN_ARGS (array)
#
# Temp files are removed by an EXIT trap installed by ssh_pin_init.
# See docs/ops/preview-deploy.md.

# shellcheck shell=bash

SSH_PIN_DOC="docs/ops/preview-deploy.md"

# _ssh_pin_die <summary> [detail...] — actionable failure, never the key bytes.
_ssh_pin_die() {
  local summary="$1"
  shift
  {
    echo "FATAL: ${summary}"
    local line
    for line in "$@"; do
      echo "  ${line}"
    done
    echo "  See ${SSH_PIN_DOC} for the secret list and how to re-set them."
  } >&2
  exit 1
}

# _ssh_pin_fp <known_hosts line> — SHA256 fingerprint of one ssh-keyscan line.
_ssh_pin_fp() {
  printf '%s\n' "$1" | ssh-keygen -lf - | awk '{print $2}'
}

# _ssh_pin_type <known_hosts line> — key type name (2nd field of the line).
_ssh_pin_type() {
  printf '%s' "$1" | awk '{print $2}'
}

# ssh_pin_init — materialise the deploy key and pin the host key.
# Aborts before any private-key material is offered to a host.
ssh_pin_init() {
  local script_dir host user material fingerprint
  local scan line ktype key_fp offered matched matched_type algo

  script_dir="${SSH_PIN_SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"

  # ── Trim whitespace: GitHub secrets often carry a trailing newline ──────
  host="$(printf '%s' "${PREVIEW_VPS_HOST:?PREVIEW_VPS_HOST is required}" | tr -d '[:space:]')"
  user="$(printf '%s' "${PREVIEW_VPS_USER:?PREVIEW_VPS_USER is required}" | tr -d '[:space:]')"
  material="${PREVIEW_VPS_SSH_KEY:?PREVIEW_VPS_SSH_KEY is required}"
  fingerprint="$(printf '%s' "${PREVIEW_VPS_HOST_FINGERPRINT:?PREVIEW_VPS_HOST_FINGERPRINT is required}" | tr -d '[:space:]')"

  # ── 1. Deploy key: normalise the stored byte shape and validate it ──────
  # Two accepted shapes:
  #   * the key material itself (the GitHub secret), normalised and validated
  #     by write-ssh-key.sh, which owns the shape normalisation (real
  #     newlines, literal "\n" escapes, CRLF) and fails loudly with an
  #     actionable message instead of the opaque
  #     `Load key "...": error in libcrypto` an unterminated key produces;
  #   * the path to an existing private-key file (provision.sh documents
  #     PREVIEW_VPS_SSH_KEY as a path for manual/local runs).
  if [ -f "${material}" ] && [ -r "${material}" ]; then
    SSH_PIN_KEY="${material}"
    _SSH_PIN_KEY_OWNED=0
    if ! ssh-keygen -y -f "${SSH_PIN_KEY}" </dev/null >/dev/null 2>&1; then
      _ssh_pin_die \
        "PREVIEW_VPS_SSH_KEY is a path, but that file is not a readable private key" \
        "Path: ${material}"
    fi
    echo "==> Using the existing PREVIEW_VPS_SSH_KEY file ${material}"
  else
    _SSH_PIN_KEY_OWNED=1
    SSH_PIN_KEY="$(mktemp)"
    chmod 600 "${SSH_PIN_KEY}"
    if ! printf '%s' "${material}" | bash "${script_dir}/write-ssh-key.sh" "${SSH_PIN_KEY}"; then
      # write-ssh-key.sh already explained what is wrong with the material
      # (public key, empty, encrypted, truncated); never continue with a key ssh
      # cannot load.
      _ssh_pin_die \
        "PREVIEW_VPS_SSH_KEY could not be materialised into a usable private key" \
        "The refusal above names the reason. ssh/scp must never be handed key" \
        "material that ssh-keygen cannot read."
    fi
    [ -s "${SSH_PIN_KEY}" ] || _ssh_pin_die \
      "PREVIEW_VPS_SSH_KEY materialised into an empty key file" \
      "Store the private key file itself, not an empty or placeholder value."
  fi

  # ── 2. Host key: ONE scan for every offered key type, then verify ───────
  # A single ssh-keyscan run (one TCP connection) so a flaky/blocked host is
  # not hammered; comment lines (`# host:22 SSH-2.0-...`) are dropped.
  scan="$(ssh-keyscan -T 10 "${host}" 2>/dev/null | grep -v '^#' || true)"

  if [ -z "${scan}" ]; then
    _ssh_pin_die \
      "ssh-keyscan could not reach ${host}:22" \
      "The preview VPS is UNREACHABLE — this is a network/target problem, NOT a" \
      "secret problem: no host key was offered, so ${SSH_PIN_DOC} secrets are" \
      "irrelevant here. The VPS network (23.182.128.0/24) has had provider" \
      "outages; check the target host first, then re-run." \
      "To confirm from anywhere: ssh-keyscan -T 10 ${host}"
  fi

  offered=""
  matched=""
  matched_type=""
  while IFS= read -r line; do
    [ -n "${line}" ] || continue
    ktype="$(_ssh_pin_type "${line}")"
    # ssh-keygen shims/unknown lines that are not host keys are skipped.
    key_fp="$(_ssh_pin_fp "${line}" 2>/dev/null || true)"
    [ -n "${key_fp}" ] || continue
    offered="${offered}  ${ktype} ${key_fp}"$'\n'
    if [ "${key_fp}" = "${fingerprint}" ]; then
      matched="${line}"
      matched_type="${ktype}"
    fi
  done <<<"${scan}"

  if [ -z "${matched}" ]; then
    _ssh_pin_die \
      "host key fingerprint mismatch for ${host}" \
      "pinned:      ${fingerprint}" \
      "offered by ${host}:" \
      "${offered%$'\n'}" \
      "Refusing to hand the deploy key to an unverified host." \
      "Re-set the secret to the fingerprint of the key you trust, e.g." \
      "  ssh-keyscan -t ed25519 ${host} | ssh-keygen -lf -"
  fi

  # ── 3. Restrict the handshake to exactly the pinned key's algorithm ─────
  case "${matched_type}" in
    ssh-ed25519)          algo="ssh-ed25519" ;;
    ecdsa-sha2-nistp256 | ecdsa-sha2-nistp384 | ecdsa-sha2-nistp521) algo="${matched_type}" ;;
    ssh-rsa)              algo="rsa-sha2-512,rsa-sha2-256" ;;
    ssh-dss)              algo="ssh-dss" ;;
    *)
      _ssh_pin_die \
        "unsupported host key type '${matched_type}' at ${host}" \
        "The pinned fingerprint matches a key type this deploy cannot restrict" \
        "the handshake to. Pin an ed25519/ecdsa/rsa host key instead." ;;
  esac

  SSH_PIN_KNOWN_HOSTS="$(mktemp)"
  chmod 600 "${SSH_PIN_KNOWN_HOSTS}"
  printf '%s\n' "${matched}" > "${SSH_PIN_KNOWN_HOSTS}"

  SSH_PIN_HOST="${host}"
  SSH_PIN_USER="${user}"
  SSH_PIN_ALGO="${algo}"
  # ConnectTimeout bounds an unreachable-but-scanning host instead of letting
  # the step hang until the job timeout.
  SSH_PIN_ARGS=(
    -i "${SSH_PIN_KEY}"
    -o "StrictHostKeyChecking=yes"
    -o "UserKnownHostsFile=${SSH_PIN_KNOWN_HOSTS}"
    -o "HostKeyAlgorithms=${SSH_PIN_ALGO}"
    -o "ConnectTimeout=30"
    -o "LogLevel=ERROR"
  )

  trap '_ssh_pin_cleanup' EXIT

  echo "==> Deploy key ready; VPS host key verified (${matched_type} ${fingerprint})"
}

# _ssh_pin_cleanup — remove the key + known_hosts temp files.
_ssh_pin_cleanup() {
  [ "${_SSH_PIN_KEY_OWNED:-0}" = "1" ] && rm -f "${SSH_PIN_KEY:-}"
  rm -f "${SSH_PIN_KNOWN_HOSTS:-}"
}

# ssh_pin_ssh [args...] — ssh with the pinned host key.
ssh_pin_ssh() {
  ssh "${SSH_PIN_ARGS[@]}" "${SSH_PIN_USER}@${SSH_PIN_HOST}" "$@"
}

# ssh_pin_scp [args...] — scp with the pinned host key.
ssh_pin_scp() {
  scp "${SSH_PIN_ARGS[@]}" "$@"
}
