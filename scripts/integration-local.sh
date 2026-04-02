#!/usr/bin/env bash

set -euo pipefail

RELAY_LOG="${RELAY_LOG:-/tmp/relay-integration.log}"
CURRENCY_LOG="${CURRENCY_LOG:-/tmp/currency-integration.log}"

cleanup() {
	kill "${SERVER_PID:-}" "${RELAY_PID:-}" 2>/dev/null || true
}

trap cleanup EXIT

if ! command -v nak >/dev/null 2>&1; then
	echo "nak is required. Install it before running integration tests."
	exit 1
fi

nohup nak serve --hostname 0.0.0.0 > "$RELAY_LOG" 2>&1 &
RELAY_PID=$!

for i in $(seq 1 20); do
	if (echo > /dev/tcp/localhost/10547) 2>/dev/null; then
		break
	fi
	sleep 1
done

nohup NODE_ENV=development APP_RELAY_URL=ws://localhost:10547 bun run dev:currency-server > "$CURRENCY_LOG" 2>&1 &
SERVER_PID=$!

sleep 3
bun run test:integration
