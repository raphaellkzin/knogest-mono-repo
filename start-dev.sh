#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${ROOT_DIR}/main-api"
WEB_DIR="${ROOT_DIR}/main-web-app"
COMPOSE_FILE="${API_DIR}/docker-compose.dev.yml"

declare -a COMPOSE_CMD=()

API_PID=""
WEB_PID=""
STARTED_PID=""
COMPOSE_STARTED=0
CLEANUP_STARTED=0
USE_SETSID=0

log() {
  printf '[dev] %s\n' "$*"
}

fail() {
  printf '[dev] Erro: %s\n' "$*" >&2
  exit 1
}

require_command() {
  local command_name="$1"
  command -v "${command_name}" >/dev/null 2>&1 || fail "comando '${command_name}' não encontrado."
}

is_job_running() {
  local pid="$1"
  jobs -pr | grep -Fxq "${pid}"
}

start_process_group() {
  local dir="$1"

  STARTED_PID=""

  if (( USE_SETSID )); then
    setsid pnpm --dir "${dir}" dev &
  else
    # macOS não tem setsid por padrão.
    # Com job control ativado, o processo em background ganha seu próprio process group.
    pnpm --dir "${dir}" dev &
  fi

  STARTED_PID=$!
}

stop_process_group() {
  local pid="${1:-}"

  [[ -z "${pid}" ]] && return

  # Tenta matar o grupo inteiro primeiro.
  if kill -0 -- "-${pid}" 2>/dev/null; then
    kill -TERM -- "-${pid}" 2>/dev/null || true

    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
      if ! kill -0 -- "-${pid}" 2>/dev/null; then
        wait "${pid}" 2>/dev/null || true
        return
      fi

      sleep 0.1
    done

    kill -KILL -- "-${pid}" 2>/dev/null || true
    wait "${pid}" 2>/dev/null || true
    return
  fi

  # Fallback: mata só o PID caso o process group não exista.
  if kill -0 "${pid}" 2>/dev/null; then
    kill -TERM "${pid}" 2>/dev/null || true

    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if ! kill -0 "${pid}" 2>/dev/null; then
        wait "${pid}" 2>/dev/null || true
        return
      fi

      sleep 0.1
    done

    kill -KILL "${pid}" 2>/dev/null || true
    wait "${pid}" 2>/dev/null || true
  fi
}

cleanup() {
  local exit_code=$?

  if (( CLEANUP_STARTED )); then
    return
  fi

  CLEANUP_STARTED=1

  trap - EXIT INT TERM

  if [[ -n "${API_PID}" || -n "${WEB_PID}" ]]; then
    log "Encerrando API e web app..."
    stop_process_group "${API_PID}"
    stop_process_group "${WEB_PID}"
  fi

  if (( COMPOSE_STARTED )); then
    log "Encerrando serviços do Docker Compose..."
    "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" down || true
  fi

  exit "${exit_code}"
}

wait_for_any_server() {
  while true; do
    if [[ -n "${API_PID}" ]] && ! is_job_running "${API_PID}"; then
      wait "${API_PID}" 2>/dev/null
      return $?
    fi

    if [[ -n "${WEB_PID}" ]] && ! is_job_running "${WEB_PID}"; then
      wait "${WEB_PID}" 2>/dev/null
      return $?
    fi

    sleep 1
  done
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

require_command pnpm
require_command docker
require_command grep

if command -v setsid >/dev/null 2>&1; then
  USE_SETSID=1
else
  # Necessário no macOS para conseguir encerrar o grupo dos processos filhos.
  set -m
fi

[[ -f "${API_DIR}/.env" ]] || fail "arquivo main-api/.env não encontrado. Copie main-api/.env.example e configure-o."
[[ -f "${WEB_DIR}/.env" ]] || fail "arquivo main-web-app/.env não encontrado. Copie main-web-app/.env.example e configure-o."
[[ -f "${COMPOSE_FILE}" ]] || fail "arquivo main-api/docker-compose.dev.yml não encontrado."

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  fail "Docker Compose não encontrado. Instale o plugin 'docker compose'."
fi

docker info >/dev/null 2>&1 || fail "Docker não está disponível. Abra o Docker Desktop e tente novamente."

log "Iniciando PostgreSQL..."
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" up -d
COMPOSE_STARTED=1

log "Aguardando PostgreSQL aceitar conexões..."

postgres_ready=0

for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" exec -T postgres_main \
    pg_isready -U dev -d app >/dev/null 2>&1; then
    postgres_ready=1
    break
  fi

  sleep 1
done

(( postgres_ready )) || fail "PostgreSQL não ficou disponível dentro de 30 segundos."

log "Gerando Prisma Client..."
pnpm --dir "${API_DIR}" db:generate

log "Iniciando API em modo de desenvolvimento..."
start_process_group "${API_DIR}"
API_PID="${STARTED_PID}"

log "Iniciando web app em modo de desenvolvimento..."
start_process_group "${WEB_DIR}"
WEB_PID="${STARTED_PID}"

log "Ambiente iniciado. Pressione Ctrl+C para encerrar tudo."

set +e
wait_for_any_server
server_exit_code=$?
set -e

if (( server_exit_code != 0 )); then
  log "Um dos servidores encerrou com erro (${server_exit_code})."
else
  log "Um dos servidores foi encerrado."
fi

exit "${server_exit_code}"
