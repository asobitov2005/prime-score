#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.dev-pids"

show_status() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"

  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "$name: running ($pid)"
      return
    fi
    echo "$name: stale pid file ($pid)"
    return
  fi

  echo "$name: stopped"
}

show_status "backend"
show_status "worker"
show_status "frontend"
show_status "admin"
