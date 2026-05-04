#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.dev-logs"
PID_DIR="$ROOT_DIR/.dev-pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

start_if_needed() {
  local name="$1"
  local workdir="$2"
  local logfile="$3"
  shift 3
  local pidfile="$PID_DIR/$name.pid"

  if [[ -f "$pidfile" ]]; then
    local existing_pid
    existing_pid="$(cat "$pidfile")"
    if kill -0 "$existing_pid" 2>/dev/null; then
      echo "$name already running with PID $existing_pid"
      return
    fi
    rm -f "$pidfile"
  fi

  (
    cd "$workdir"
    setsid "$@" >"$logfile" 2>&1 < /dev/null &
    echo $! >"$pidfile"
  )

  echo "started $name with PID $(cat "$pidfile")"
}

cd "$ROOT_DIR"
docker compose up -d postgres redis minio bot >/dev/null
docker compose stop api frontend admin worker >/dev/null 2>&1 || true

start_if_needed "backend" "$ROOT_DIR/backend" "$LOG_DIR/backend.log" \
  "$ROOT_DIR/backend/.venv/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  --reload-dir app \
  --reload-dir alembic

start_if_needed "worker" "$ROOT_DIR/backend" "$LOG_DIR/worker.log" \
  "$ROOT_DIR/backend/.venv/bin/python" -m watchfiles \
  --filter python \
  --ignore-paths "$ROOT_DIR/backend/.venv,$ROOT_DIR/backend/__pycache__,$ROOT_DIR/backend/.pytest_cache,$ROOT_DIR/backend/alembic/versions/__pycache__" \
  --target-type command \
  "$ROOT_DIR/backend/.venv/bin/celery -A app.tasks.celery_app worker --loglevel=info -Q default,heavy,notifications,admin_ai --concurrency=4 -Ofair" \
  "$ROOT_DIR/backend/app" "$ROOT_DIR/backend/alembic"

start_if_needed "frontend" "$ROOT_DIR/frontend" "$LOG_DIR/frontend.log" \
  npm run dev -- -p 3100

start_if_needed "admin" "$ROOT_DIR/admin" "$LOG_DIR/admin.log" \
  npm run dev -- -p 3101

echo
echo "Logs:"
echo "  tail -f $LOG_DIR/backend.log"
echo "  tail -f $LOG_DIR/worker.log"
echo "  tail -f $LOG_DIR/frontend.log"
echo "  tail -f $LOG_DIR/admin.log"
