#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PRE_PUSH_SOURCE="$ROOT_DIR/.githooks/pre-push"
PRE_PUSH_TARGET="$ROOT_DIR/.git/hooks/pre-push"
PRE_COMMIT_SOURCE="$ROOT_DIR/.githooks/pre-commit"
PRE_COMMIT_TARGET="$ROOT_DIR/.git/hooks/pre-commit"

if [[ ! -f "$PRE_PUSH_SOURCE" ]]; then
	echo "Hook template not found: $PRE_PUSH_SOURCE"
	exit 1
fi

if [[ ! -f "$PRE_COMMIT_SOURCE" ]]; then
	echo "Hook template not found: $PRE_COMMIT_SOURCE"
	exit 1
fi

mkdir -p "$(dirname "$PRE_PUSH_TARGET")"
cp "$PRE_PUSH_SOURCE" "$PRE_PUSH_TARGET"
chmod +x "$PRE_PUSH_TARGET"

cp "$PRE_COMMIT_SOURCE" "$PRE_COMMIT_TARGET"
chmod +x "$PRE_COMMIT_TARGET"

echo "Installed pre-push hook at $PRE_PUSH_TARGET"
echo "Installed pre-commit hook at $PRE_COMMIT_TARGET"
echo "Use SKIP_LOCAL_PREFLIGHT=1 git commit/git push to bypass once if needed."
