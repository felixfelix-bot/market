#!/usr/bin/env bash

set -euo pipefail

RELAY_LOG="${RELAY_LOG:-/tmp/relay.log}"
DEV_LOG="${DEV_LOG:-/tmp/devserver.log}"
CURRENCY_LOG="${CURRENCY_LOG:-/tmp/currency-server.log}"

TEST_PORT="${TEST_PORT:-34567}"
RELAY_URL="${RELAY_URL:-ws://localhost:10547}"
APP_PRIVATE_KEY="${APP_PRIVATE_KEY:-e2e0000000000000000000000000000000000000000000000000000000000001}"
CVM_SERVER_KEY="${CVM_SERVER_KEY:-2300f5fff5642341946758cad8214f2c54f3c40fba5ba51b616452b197fd3e71}"

cleanup() {
	kill "${DEV_PID:-}" "${SERVER_PID:-}" "${RELAY_PID:-}" 2>/dev/null || true
}

on_error() {
	local exit_code=$?
	echo ""
	echo "=== Relay logs ==="
	cat "$RELAY_LOG" 2>/dev/null || echo "(no relay log)"
	echo ""
	echo "=== Dev server logs ==="
	cat "$DEV_LOG" 2>/dev/null || echo "(no dev server log)"
	echo ""
	echo "=== Currency server logs ==="
	cat "$CURRENCY_LOG" 2>/dev/null || echo "(no currency server log)"
	exit "$exit_code"
}

trap cleanup EXIT
trap on_error ERR

if ! command -v nak >/dev/null 2>&1; then
	echo "nak is required. Install it before running this script."
	exit 1
fi

pkill -f "nak serve --hostname 0.0.0.0" 2>/dev/null || true
pkill -f "contextvm/server.ts" 2>/dev/null || true
pkill -f "PORT=${TEST_PORT}" 2>/dev/null || true

echo "Starting local relay..."
nohup nak serve --hostname 0.0.0.0 > "$RELAY_LOG" 2>&1 &
RELAY_PID=$!

echo "Waiting for relay on port 10547..."
for i in $(seq 1 20); do
	if (echo > /dev/tcp/localhost/10547) 2>/dev/null; then
		break
	fi
	sleep 1
done

echo "Seeding relay..."
NODE_ENV=test APP_RELAY_URL="$RELAY_URL" APP_PRIVATE_KEY="$APP_PRIVATE_KEY" LOCAL_RELAY_ONLY=true bun e2e-new/seed-relay.ts

echo "Starting currency server..."
nohup env NODE_ENV=test APP_RELAY_URL="$RELAY_URL" CVM_SERVER_KEY="$CVM_SERVER_KEY" bun run dev:currency-server > "$CURRENCY_LOG" 2>&1 &
SERVER_PID=$!

echo "Starting app server..."
nohup env NODE_ENV=test PORT="$TEST_PORT" APP_RELAY_URL="$RELAY_URL" APP_PRIVATE_KEY="$APP_PRIVATE_KEY" LOCAL_RELAY_ONLY=true bun dev > "$DEV_LOG" 2>&1 &
DEV_PID=$!

echo "Waiting for app server on port $TEST_PORT..."
for i in $(seq 1 45); do
	if curl -sf "http://localhost:${TEST_PORT}/api/config" > /dev/null 2>&1; then
		break
	fi
	sleep 1
done

echo "Running Playwright with CI parity services..."
CI=1 bun run test:e2e-new -- "$@"
