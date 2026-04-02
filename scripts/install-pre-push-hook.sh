#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_SOURCE="$ROOT_DIR/.githooks/pre-push"
HOOK_TARGET="$ROOT_DIR/.git/hooks/pre-push"

if [[ ! -f "$HOOK_SOURCE" ]]; then
	echo "Hook template not found: $HOOK_SOURCE"
	exit 1
fi

mkdir -p "$(dirname "$HOOK_TARGET")"
cp "$HOOK_SOURCE" "$HOOK_TARGET"
chmod +x "$HOOK_TARGET"

echo "Installed pre-push hook at $HOOK_TARGET"
echo "Use SKIP_LOCAL_PREFLIGHT=1 git push to bypass once if needed."
