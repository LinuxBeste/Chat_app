#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-3000}"
WEB_PORT="${WEB_PORT:-5173}"
USE_REDIS=false
MODE="docker"
REBUILD=false
STOP_ONLY=false
DETACH=false
START_WEB=false
START_MOBILE=false
FOLLOW=false
RUN_MIGRATE=false
RUN_SEED=false
COMPOSE_PROFILES=()

usage() {
  cat <<EOF
Usage: $0 [options]

Start the chat app (server + optional clients).

Options:
  --native, -n        Run natively (pnpm dev) instead of Docker
  --rebuild, -r       Force full rebuild
  --stop              Stop running Docker containers and exit
  --detach            Run Docker in detached mode (no interactive prompt)
  --redis             Enable Redis
  --web, -w           Start web client alongside (Vite dev server)
  --mobile, -m        Start Expo mobile client alongside
  --all, -a           Start server + web + mobile
  --dev, -d           Shortcut for --native --web
  --port <num>        Server port (default: $PORT)
  --web-port <num>    Web dev server port (default: $WEB_PORT)
  --migrate           Run database migrations before starting
  --seed              Run seed data after migrations
  --logs, -l          Follow Docker logs after containers start
  --env <file>        Environment file to load (default: .env)
  --help, -h          Show this help

Examples:
  $0                          # Docker on port $PORT
  $0 --redis                  # Docker with Redis
  $0 --native                 # pnpm dev
  $0 --native --redis         # pnpm dev with Redis
  $0 --dev                    # native server + web client
  $0 --all                    # Docker server + web + mobile
  $0 --native --migrate       # native with migrations
  $0 --stop                   # Stop Docker containers and exit
  $0 --detach                 # Docker detached mode (no interactive prompt)
  $0 --logs                   # Docker with logs attached
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --native|-n) MODE="native"; shift ;;
    --rebuild|-r) REBUILD=true; shift ;;
    --stop) STOP_ONLY=true; shift ;;
    --detach) DETACH=true; shift ;;
    --redis) USE_REDIS=true; shift ;;
    --web|-w) START_WEB=true; shift ;;
    --mobile|-m) START_MOBILE=true; shift ;;
    --all|-a) START_WEB=true; START_MOBILE=true; shift ;;
    --dev|-d) MODE="native"; START_WEB=true; shift ;;
    --port) PORT="${2:-}"; shift 2 ;;
    --web-port) WEB_PORT="${2:-}"; shift 2 ;;
    --migrate) RUN_MIGRATE=true; shift ;;
    --seed) RUN_SEED=true; shift ;;
    --logs|-l) FOLLOW=true; shift ;;
    --env) ENV_FILE="${2:-}"; shift 2 ;;
    --help|-h) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

export PORT

if "$STOP_ONLY"; then
  echo "Stopping Docker containers ..."
  docker compose "${COMPOSE_PROFILES[@]}" down 2>/dev/null || true
  echo "Done."
  exit 0
fi

load_env() {
  local file="${1:-.env}"
  if [[ -f "$file" ]]; then
    echo "Loading environment from $file"
    set -a
    source "$file"
    set +a
  else
    echo "No $file found, using defaults"
  fi
}
load_env "${ENV_FILE:-.env}"

run_migrations() {
  echo "Running database migrations ..."
  if [[ "$MODE" == "native" ]]; then
    pnpm run migrate
  else
    docker compose "${COMPOSE_PROFILES[@]}" exec -T server pnpm run migrate
  fi
}

run_seed() {
  echo "Running seed data ..."
  if [[ "$MODE" == "native" ]]; then
    pnpm run seed
  else
    docker compose "${COMPOSE_PROFILES[@]}" exec -T server pnpm run seed
  fi
}

cleanup() {
  echo
  echo "Shutting down ..."
  docker compose "${COMPOSE_PROFILES[@]}" down 2>/dev/null || true
}

start_web() {
  echo "Starting web client on port $WEB_PORT ..."
  (cd "$SCRIPT_DIR/../client/web" && pnpm dev --port "$WEB_PORT") &
  WEB_PID=$!
}

start_mobile() {
  echo "Starting Expo mobile client ..."
  (cd "$SCRIPT_DIR/../client/mobile" && npx expo start) &
  MOBILE_PID=$!
}

if [[ "$MODE" == "native" ]]; then
  trap '[[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null; [[ -n "${MOBILE_PID:-}" ]] && kill "$MOBILE_PID" 2>/dev/null' EXIT INT TERM

  if "$RUN_MIGRATE" || "$RUN_SEED"; then
    if [ ! -d node_modules ]; then
      pnpm install
    fi
    "$RUN_MIGRATE" && run_migrations
    "$RUN_SEED" && run_seed
  fi

  echo "Starting server natively on port $PORT ..."

  if "$REBUILD"; then
    echo "Rebuilding ..."
    rm -rf dist
    pnpm run build
  fi

  if [ ! -d node_modules ]; then
    pnpm install
  fi

  "$START_WEB" && start_web
  "$START_MOBILE" && start_mobile

  pnpm dev
else
  trap cleanup INT TERM
  if ! "$DETACH" && ! "$FOLLOW"; then
    trap cleanup EXIT INT TERM
  fi

  echo "Starting server in Docker on http://localhost:$PORT ..."

  if "$USE_REDIS"; then
    export REDIS_URL=redis://redis:6379
    COMPOSE_PROFILES+=(--profile redis)
  fi

  if "$REBUILD"; then
    docker compose "${COMPOSE_PROFILES[@]}" build --no-cache
  fi

  echo >&2 "Press (q/p/e/s) to stop and remove containers"
  docker compose "${COMPOSE_PROFILES[@]}" up --build -d

  echo "Waiting for server to be ready ..."

  # Poll for container failures (restart loops) — 10s max
  for _ in $(seq 1 5); do
    failed=""
    while IFS= read -r cid; do
      [[ -z "$cid" ]] && continue
      restarts="$(docker inspect -f '{{.RestartCount}}' "$cid" 2>/dev/null || echo 0)"
      if [[ "$restarts" -ge 3 ]]; then
        name="$(docker inspect -f '{{.Name}}' "$cid" 2>/dev/null | sed 's|/||')"
        failed+="$name "
      fi
    done < <(docker compose "${COMPOSE_PROFILES[@]}" ps -q 2>/dev/null || true)

    if [[ -n "$failed" ]]; then
      echo >&2 ""
      echo >&2 "WARNING: Container(s) in restart loop: $failed"
      echo >&2 "--- Last logs ---"
      for svc in $failed; do
        echo >&2 "=== $svc ==="
        docker compose "${COMPOSE_PROFILES[@]}" logs --tail=20 "$svc" 2>/dev/null || true
      done
      echo >&2 "---"
      echo >&2 "Aborting due to container failures."
      docker compose "${COMPOSE_PROFILES[@]}" down 2>/dev/null || true
      exit 1
    fi
    sleep 2
  done

  for i in $(seq 1 30); do
    if curl -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
      echo "Server is ready!"
      break
    fi
    sleep 1
  done

  "$RUN_MIGRATE" && run_migrations
  "$RUN_SEED" && run_seed

  "$START_WEB" && start_web
  "$START_MOBILE" && start_mobile

  if "$FOLLOW"; then
    echo "Attaching logs (Ctrl+C to detach, containers keep running) ..."
    docker compose "${COMPOSE_PROFILES[@]}" logs -f
  fi

  if ! "$DETACH" && ! "$FOLLOW"; then
    echo >&2
    echo >&2 "Press (q/p/e/s) to stop and remove containers"
    while true; do
      read -rsn 1 key
      if [[ "$key" == "q" || "$key" == "p" || "$key" == "e" || "$key" == "s" ]]; then
        echo
        docker compose "${COMPOSE_PROFILES[@]}" down
        [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null || true
        [[ -n "${MOBILE_PID:-}" ]] && kill "$MOBILE_PID" 2>/dev/null || true
        exit 0
      fi
    done
  fi
fi
