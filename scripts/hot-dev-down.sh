#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.dev-pids"

stop_if_running() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"

  if [[ ! -f "$pidfile" ]]; then
    echo "$name is not running"
    return
  fi

  local pid
  pid="$(cat "$pidfile")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "stopped $name ($pid)"
  else
    echo "$name pid file was stale ($pid)"
  fi
  rm -f "$pidfile"
}

stop_if_running "backend"
stop_if_running "worker"
stop_if_running "frontend"
stop_if_running "admin"
