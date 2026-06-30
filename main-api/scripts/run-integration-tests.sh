#!/usr/bin/env bash
set -Eeuo pipefail

export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgres://test:testpass@localhost:5433/knogest_test}"
node scripts/reset-test-database.mjs
vitest run --config vitest.integration.config.ts
