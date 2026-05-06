#!/usr/bin/env bash
set -euo pipefail

# This script is copied to the server and used by GitHub Actions deploys.
# It selectively restarts only the services affected by the current push.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${IMAGE_TAG:?IMAGE_TAG is required}"
API_HEALTH_URL="${API_HEALTH_URL:-http://172.28.100.10:8000/health}"
FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://172.28.100.11:3000}"
ADMIN_HEALTH_URL="${ADMIN_HEALTH_URL:-http://172.28.100.12:3001/login}"

COMPOSE_FILE="docker-compose.prod.yml"
SERVICES="${SERVICES:-}"
read -r -a SERVICE_LIST <<< "$SERVICES"

echo "[deploy] Using image tag: $IMAGE_TAG"
echo "[deploy] Services: ${SERVICE_LIST[*]}"

if [ "${#SERVICE_LIST[@]}" -eq 0 ]; then
  echo "[deploy] No service restarts requested"
  exit 0
fi

has_service() {
  local name="$1"
  for service in "${SERVICE_LIST[@]}"; do
    if [[ "$service" == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

PULL_LIST=()
INFRA_LIST=()
if has_service api || has_service worker || has_service beat || has_service bot; then
  PULL_LIST+=(api)
fi
if has_service frontend; then
  PULL_LIST+=(frontend)
fi
if has_service admin; then
  PULL_LIST+=(admin)
fi
if has_service postgres; then
  INFRA_LIST+=(postgres)
fi
if has_service redis; then
  INFRA_LIST+=(redis)
fi
if has_service minio; then
  INFRA_LIST+=(minio)
fi

echo "[deploy] Pull targets: ${PULL_LIST[*]}"
if [ "${#PULL_LIST[@]}" -gt 0 ]; then
  docker-compose -f "$COMPOSE_FILE" pull "${PULL_LIST[@]}"
fi

if [ "${#INFRA_LIST[@]}" -gt 0 ]; then
  echo "[deploy] Infra targets: ${INFRA_LIST[*]}"
  docker-compose -f "$COMPOSE_FILE" up -d "${INFRA_LIST[@]}"
fi

APP_LIST=()
for service in "${SERVICE_LIST[@]}"; do
  case "$service" in
    postgres|redis|minio) ;;
    *) APP_LIST+=("$service") ;;
  esac
done

if [ "${#APP_LIST[@]}" -gt 0 ]; then
  docker-compose -f "$COMPOSE_FILE" up -d --no-deps "${APP_LIST[@]}"
fi

if has_service api || has_service worker || has_service beat || has_service bot; then
  echo "[verify] Waiting for API"
  for _ in $(seq 1 30); do
    if curl -fsS "$API_HEALTH_URL" >/dev/null; then
      break
    fi
    sleep 2
  done
fi

if has_service frontend; then
  echo "[verify] Waiting for frontend"
  for _ in $(seq 1 30); do
    if curl -fsSI "$FRONTEND_HEALTH_URL" >/dev/null; then
      break
    fi
    sleep 2
  done
fi

if has_service admin; then
  echo "[verify] Waiting for admin"
  for _ in $(seq 1 30); do
    if curl -fsSI "$ADMIN_HEALTH_URL" >/dev/null; then
      break
    fi
    sleep 2
  done
fi

docker-compose -f "$COMPOSE_FILE" ps
