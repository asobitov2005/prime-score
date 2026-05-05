#!/usr/bin/env bash
set -euo pipefail

# This script is copied to the server and used by GitHub Actions deploys.
# It selectively restarts only the services affected by the current push.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${SERVICES:?SERVICES is required}"

COMPOSE_FILE="docker-compose.prod.yml"
read -r -a SERVICE_LIST <<< "$SERVICES"

echo "[deploy] Using image tag: $IMAGE_TAG"
echo "[deploy] Services: ${SERVICE_LIST[*]}"

docker-compose -f "$COMPOSE_FILE" pull "${SERVICE_LIST[@]}"
docker-compose -f "$COMPOSE_FILE" up -d --no-deps "${SERVICE_LIST[@]}"

has_service() {
  local name="$1"
  for service in "${SERVICE_LIST[@]}"; do
    if [[ "$service" == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

if has_service api || has_service worker || has_service beat || has_service bot; then
  echo "[verify] Waiting for API"
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${BACKEND_PORT:-8000}/health" >/dev/null; then
      break
    fi
    sleep 2
  done
fi

if has_service frontend; then
  echo "[verify] Waiting for frontend"
  for _ in $(seq 1 30); do
    if curl -fsSI "http://127.0.0.1:${FRONTEND_PORT:-3100}" >/dev/null; then
      break
    fi
    sleep 2
  done
fi

if has_service admin; then
  echo "[verify] Waiting for admin"
  for _ in $(seq 1 30); do
    if curl -fsSI "http://127.0.0.1:${ADMIN_PORT:-3101}/login" >/dev/null; then
      break
    fi
    sleep 2
  done
fi

docker-compose -f "$COMPOSE_FILE" ps
