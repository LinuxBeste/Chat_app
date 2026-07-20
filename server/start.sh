#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-3000}"
USE_REDIS=false
COMPOSE_PROFILES=()

usage() {
  cat <<EOF
Usage: $0 [--native | -n] [--rebuild | -r] [--redis] [--port <num>] [--help | -h]

Start the chat server.

Options:
  --native, -n        Run natively (pnpm dev) instead of Docker
  --rebuild, -r       Force full rebuild
  --redis             Enable Redis
  --port <num>        Local port (default: $PORT)
  --help, -h          Show this help

Examples:
  $0                         # Docker on port $PORT
  $0 --redis                 # Docker with Redis
  $0 --native                # pnpm dev
  $0 --native --redis        # pnpm dev with Redis
EOF
  exit 0
}

REBUILD=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --native|-n) MODE="native"; shift ;;
    --rebuild|-r) REBUILD=true; shift ;;
    --redis) USE_REDIS=true; shift ;;
    --port) PORT="${2:-}"; shift 2 ;;
    --help|-h) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

export PORT

cleanup() {
  echo
  echo "Shutting down ..."
  docker compose "${COMPOSE_PROFILES[@]}" down 2>/dev/null || true
}

trap cleanup EXIT INT TERM

if [[ "${MODE:-docker}" == "native" ]]; then
  echo "Starting server natively on port $PORT ..."

  if "$REBUILD"; then
    echo "Rebuilding (clean) ..."
    rm -rf dist
    pnpm run build
  fi

  if [ ! -d node_modules ]; then
    pnpm install
  fi

  pnpm dev
else
  echo "Starting server in Docker on http://localhost:$PORT ..."

  if "$USE_REDIS"; then
    export REDIS_URL=redis://redis:6379
    COMPOSE_PROFILES+=(--profile redis)
  fi

  if "$REBUILD"; then
    docker compose "${COMPOSE_PROFILES[@]}" build --no-cache
  fi

  docker compose "${COMPOSE_PROFILES[@]}" up --build -d

  echo
  echo "Press q to stop and remove containers"
  while true; do
    read -rsn 1 key
    if [[ "$key" == "q" ]]; then
      echo
      docker compose "${COMPOSE_PROFILES[@]}" down
      exit 0
    fi
  done
fi
