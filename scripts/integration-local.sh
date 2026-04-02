#!/usr/bin/env bash

set -euo pipefail

RELAY_LOG="${RELAY_LOG:-/tmp/relay-integration.log}"
CURRENCY_LOG="${CURRENCY_LOG:-/tmp/currency-integration.log}"
CVM_SERVER_KEY="${CVM_SERVER_KEY:-2300f5fff5642341946758cad8214f2c54f3c40fba5ba51b616452b197fd3e71}"

cleanup() {
	kill "${SERVER_PID:-}" "${RELAY_PID:-}" 2>/dev/null || true
}

trap cleanup EXIT

if ! command -v nak >/dev/null 2>&1; then
	echo "nak is required. Install it before running integration tests."
	exit 1
fi

pkill -f "nak serve --hostname 0.0.0.0" 2>/dev/null || true
pkill -f "contextvm/server.ts" 2>/dev/null || true

nohup nak serve --hostname 0.0.0.0 > "$RELAY_LOG" 2>&1 &
RELAY_PID=$!

for i in $(seq 1 20); do
	if (echo > /dev/tcp/localhost/10547) 2>/dev/null; then
		break
	fi
	sleep 1
done

nohup env NODE_ENV=development APP_RELAY_URL=ws://localhost:10547 CVM_SERVER_KEY="$CVM_SERVER_KEY" bun run dev:currency-server > "$CURRENCY_LOG" 2>&1 &
SERVER_PID=$!

for i in $(seq 1 8); do
	if timeout 10s bun run scripts/fetch-btc-price.ts ws://localhost:10547 > /dev/null 2>&1; then
		break
	fi
	sleep 2
done

bun run test:integration
