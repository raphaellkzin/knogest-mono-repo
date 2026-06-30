#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

node "${ROOT_DIR}/scripts/verify-foundation.mjs"

if [[ "$(node --version)" != "v22.22.3" ]]; then
  printf 'CI requires Node v22.22.3 (found %s)\n' "$(node --version)" >&2
  exit 1
fi

for app in main-api main-web-app; do
  pnpm --dir "${ROOT_DIR}/${app}" install --frozen-lockfile
done

docker compose -f "${ROOT_DIR}/main-api/docker-compose.dev.yml" up -d --wait postgres_test
trap 'docker compose -f "${ROOT_DIR}/main-api/docker-compose.dev.yml" stop postgres_test >/dev/null 2>&1 || true' EXIT

pnpm --dir "${ROOT_DIR}/main-api" format:check
pnpm --dir "${ROOT_DIR}/main-api" lint
pnpm --dir "${ROOT_DIR}/main-api" typecheck
pnpm --dir "${ROOT_DIR}/main-api" test
pnpm --dir "${ROOT_DIR}/main-api" test:integration
pnpm --dir "${ROOT_DIR}/main-api" check:openapi
pnpm --dir "${ROOT_DIR}/main-api" build

pnpm --dir "${ROOT_DIR}/main-web-app" format:check
pnpm --dir "${ROOT_DIR}/main-web-app" lint
pnpm --dir "${ROOT_DIR}/main-web-app" typecheck
pnpm --dir "${ROOT_DIR}/main-web-app" test
pnpm --dir "${ROOT_DIR}/main-web-app" validate:api
pnpm --dir "${ROOT_DIR}/main-web-app" check:api
pnpm --dir "${ROOT_DIR}/main-web-app" build
pnpm --dir "${ROOT_DIR}/main-web-app" test:e2e
