#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-quick}"

if [[ "$MODE" != "quick" && "$MODE" != "full" ]]; then
	echo "Usage: scripts/ci-preflight.sh [quick|full]"
	exit 1
fi

echo "[preflight] Stage 1: Parse/syntax gate"
bun run test:e2e-new -- --list

echo "[preflight] Stage 2: Unit gate"
bun run test:unit

echo "[preflight] Stage 3: Integration gate"
bash scripts/integration-local.sh

echo "[preflight] Stage 4: Targeted checkout/payment gate"
bash scripts/e2e-ci-parity.sh \
	e2e-new/tests/checkout.spec.ts \
	e2e-new/tests/payments.spec.ts \
	e2e-new/tests/order-lifecycle.spec.ts \
	e2e-new/tests/order-messaging.spec.ts \
	e2e-new/tests/shipping-special.spec.ts \
	e2e-new/tests/zaps.spec.ts

if [[ "$MODE" == "full" ]]; then
	echo "[preflight] Stage 5: Full CI-parity E2E run"
	bash scripts/e2e-ci-parity.sh
fi

echo "[preflight] All checks passed ($MODE mode)."
