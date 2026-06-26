#!/usr/bin/env bash
set -euo pipefail

# This script is copied to the server and used by GitHub Actions deploys.
# It selectively restarts only the services affected by the current push.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${IMAGE_TAG:?IMAGE_TAG is required}"
API_HEALTH_URL="${API_HEALTH_URL:-http://172.28.100.10:8000/health}"
API_BASE_URL="${API_BASE_URL:-http://172.28.100.10:8000}"
FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://172.28.100.11:3000}"
ADMIN_HEALTH_URL="${ADMIN_HEALTH_URL:-http://172.28.100.12:3001/login}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://primescore.uz}"

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
  docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans "${INFRA_LIST[@]}"
fi

APP_LIST=()
for service in "${SERVICE_LIST[@]}"; do
  case "$service" in
    postgres|redis|minio) ;;
    *) APP_LIST+=("$service") ;;
  esac
done

declare -A PREVIOUS_TAGS=()
for service in "${APP_LIST[@]:-}"; do
  container_id="$(docker-compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null || true)"
  if [ -n "$container_id" ]; then
    image_ref="$(docker inspect -f '{{.Config.Image}}' "$container_id" 2>/dev/null || true)"
    if [[ "$image_ref" == *:* ]]; then
      PREVIOUS_TAGS["$service"]="${image_ref##*:}"
    fi
  fi
done

rollback() {
  local exit_code=$?
  if [ "$exit_code" -eq 0 ]; then
    return 0
  fi

  trap - ERR
  echo "[rollback] Deploy failed with exit code $exit_code"
  for service in "${APP_LIST[@]:-}"; do
    local previous_tag="${PREVIOUS_TAGS[$service]:-}"
    if [ -n "$previous_tag" ] && [ "$previous_tag" != "$IMAGE_TAG" ]; then
      echo "[rollback] Restoring $service to image tag $previous_tag"
      IMAGE_TAG="$previous_tag" docker-compose -f "$COMPOSE_FILE" up -d --no-deps --remove-orphans "$service" || true
    else
      echo "[rollback] No previous image tag recorded for $service"
    fi
  done
  docker-compose -f "$COMPOSE_FILE" ps || true
  exit "$exit_code"
}

trap rollback ERR

run_database_migrations() {
  local backend_image="${REGISTRY:-ghcr.io}/${REPO_OWNER:-asobitov2005}/prime-score-backend:${IMAGE_TAG}"
  local postgres_container
  local network_name

  postgres_container="$(docker-compose -f "$COMPOSE_FILE" ps -q postgres)"
  if [ -z "$postgres_container" ]; then
    echo "[deploy] postgres container is required before migrations"
    return 1
  fi

  network_name="$(
    docker inspect -f '{{ range $name, $_ := .NetworkSettings.Networks }}{{ if eq $name "prime-score_prime_score_net" }}{{ $name }}{{ end }}{{ end }}' "$postgres_container"
  )"
  if [ -z "$network_name" ]; then
    network_name="$(
      docker inspect -f '{{ range $name, $_ := .NetworkSettings.Networks }}{{ if eq $name "prime_score_prime_score_net" }}{{ $name }}{{ end }}{{ end }}' "$postgres_container"
    )"
  fi
  if [ -z "$network_name" ]; then
    network_name="$(docker network ls --format '{{.Name}}' | grep -E '(^|_)prime_score_net$' | head -n 1)"
  fi
  if [ -z "$network_name" ]; then
    echo "[deploy] could not resolve compose network for migrations"
    return 1
  fi

  set -a
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    . ./.env
  fi
  set +a

  local postgres_user="${POSTGRES_USER:-postgres}"
  local postgres_db="${POSTGRES_DB:-primescore}"
  : "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}"
  : "${REDIS_PASSWORD:?set REDIS_PASSWORD}"
  : "${JWT_SECRET:?set JWT_SECRET}"
  : "${JWT_REFRESH_SECRET:?set JWT_REFRESH_SECRET}"
  : "${TELEGRAM_BOT_TOKEN:?set TELEGRAM_BOT_TOKEN}"
  : "${MINIO_ROOT_USER:?set MINIO_ROOT_USER}"
  : "${MINIO_ROOT_PASSWORD:?set MINIO_ROOT_PASSWORD}"

  docker run --rm \
    --network "$network_name" \
    --add-host postgres:172.28.100.2 \
    --add-host redis:172.28.100.3 \
    --add-host minio:172.28.100.4 \
    --env-file .env \
    -e DATABASE_URL="postgresql+asyncpg://${postgres_user}:${POSTGRES_PASSWORD}@postgres:5432/${postgres_db}" \
    -e REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379/0" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
    -e TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
    -e MINIO_ENDPOINT="minio:9000" \
    -e MINIO_ACCESS_KEY="$MINIO_ROOT_USER" \
    -e MINIO_SECRET_KEY="$MINIO_ROOT_PASSWORD" \
    -e MINIO_SECURE="false" \
    "$backend_image" \
    alembic upgrade head
}

if has_service api || has_service worker || has_service beat || has_service bot; then
  echo "[deploy] Running database migrations"
  run_database_migrations
fi

if [ "${#APP_LIST[@]}" -gt 0 ]; then
  docker-compose -f "$COMPOSE_FILE" up -d --no-deps --remove-orphans "${APP_LIST[@]}"
fi

wait_for_url() {
  local label="$1"
  local url="$2"
  local method="${3:-GET}"
  echo "[verify] Waiting for $label: $url"
  for _ in $(seq 1 30); do
    if [ "$method" = "HEAD" ]; then
      if curl -fsSLI "$url" >/dev/null; then
        return 0
      fi
    else
      if curl -fsS "$url" >/dev/null; then
        return 0
      fi
    fi
    sleep 2
  done
  echo "[verify] $label did not become healthy"
  return 1
}

if has_service api || has_service worker || has_service beat || has_service bot; then
  wait_for_url "API" "$API_HEALTH_URL"
fi

if has_service frontend; then
  wait_for_url "frontend" "$FRONTEND_HEALTH_URL" HEAD
fi

if has_service admin; then
  wait_for_url "admin" "$ADMIN_HEALTH_URL" HEAD
fi

PYTHON_BIN="$(command -v python3 || command -v python || true)"
FIRST_TEST_SLUG=""

if has_service api || has_service worker || has_service beat || has_service bot; then
  echo "[verify] Checking API migrations"
  migration_output="$(docker-compose -f "$COMPOSE_FILE" exec -T api alembic current)"
  echo "$migration_output"
  echo "$migration_output" | grep -q "(head)"

  echo "[verify] Checking API test catalog slugs"
  if [ -z "$PYTHON_BIN" ]; then
    echo "[verify] python3/python is required for catalog smoke checks"
    exit 1
  fi
  catalog_file="$(mktemp)"
  curl -fsS "$API_BASE_URL/api/tests?status=published" -o "$catalog_file"
  FIRST_TEST_SLUG="$("$PYTHON_BIN" - "$catalog_file" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)

if not isinstance(payload, list) or not payload:
    raise SystemExit("catalog is empty")
if any(not item.get("slug") for item in payload):
    raise SystemExit("catalog contains tests without slug")
if any("Guard" in str(item.get("title", "")) for item in payload):
    raise SystemExit("catalog contains test guard rows")

print(payload[0]["slug"])
PY
)"
  rm -f "$catalog_file"
  echo "[verify] First published test slug: $FIRST_TEST_SLUG"
fi

if has_service frontend || has_service api; then
  echo "[verify] Checking public frontend routes"
  wait_for_url "public home" "$PUBLIC_BASE_URL" HEAD
  wait_for_url "public tests" "$PUBLIC_BASE_URL/tests" HEAD

  if [ -z "$FIRST_TEST_SLUG" ]; then
    catalog_file="$(mktemp)"
    curl -fsS "$API_BASE_URL/api/tests?status=published" -o "$catalog_file"
    FIRST_TEST_SLUG="$("$PYTHON_BIN" - "$catalog_file" <<'PY'
import json
import sys
with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)
if not isinstance(payload, list) or not payload or not payload[0].get("slug"):
    raise SystemExit("cannot resolve first test slug")
print(payload[0]["slug"])
PY
)"
    rm -f "$catalog_file"
  fi

  wait_for_url "public test detail" "$PUBLIC_BASE_URL/tests/$FIRST_TEST_SLUG" HEAD

  sitemap_file="$(mktemp)"
  curl -fsS "$PUBLIC_BASE_URL/sitemap.xml" -o "$sitemap_file"
  grep -q "$PUBLIC_BASE_URL/tests/$FIRST_TEST_SLUG" "$sitemap_file"
  rm -f "$sitemap_file"
  echo "[verify] Public sitemap contains $FIRST_TEST_SLUG"
fi

docker-compose -f "$COMPOSE_FILE" ps

# Reclaim disk from old images and stale build cache. The `until` filters keep
# recent images around so the rollback path above can still restore them.
echo "[cleanup] Pruning dangling images and stale build cache"
docker image prune -f || true
docker image prune -a -f --filter "until=168h" || true
docker builder prune -f --filter "until=168h" || true

trap - ERR
