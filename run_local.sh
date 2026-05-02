#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==================================================="
echo " PrimeScore Local Run (Hot-reload)"
echo " Backend : http://localhost:8000"
echo " Frontend: http://localhost:3100"
echo " Admin   : http://localhost:3101"
echo "==================================================="

# --- venv ---
if [ ! -f backend/.venv/bin/activate ]; then
  echo "[setup] Creating Python venv..."
  uv venv backend/.venv --python 3.11
  uv pip install --python backend/.venv/bin/python -e "./backend[dev]"
fi

# --- env files ---
[ ! -f backend/.env ]  && cp backend/.env.example backend/.env
[ ! -f frontend/.env ] && cp frontend/.env.example frontend/.env
[ ! -f admin/.env ]    && cp admin/.env.example admin/.env

# --- migrations ---
echo "[db] Running migrations..."
(cd backend && .venv/bin/alembic upgrade head)

echo "[start] Launching services..."

(cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) \
  > backend/backend_log.txt 2>&1 &
PID_API=$!

(cd backend && .venv/bin/watchfiles --filter python '.venv/bin/python -m app.bot.main' app) \
  > backend/bot_log.txt 2>&1 &
PID_BOT=$!

(cd frontend && npm run dev -- -H 0.0.0.0 -p 3100) \
  > frontend/frontend_log.txt 2>&1 &
PID_FE=$!

(cd admin && npm run dev -- -H 0.0.0.0 -p 3101) \
  > admin/admin_log.txt 2>&1 &
PID_ADM=$!

echo "[ok] PIDs: api=$PID_API  bot=$PID_BOT  frontend=$PID_FE  admin=$PID_ADM"
echo "     Logs: backend/backend_log.txt  backend/bot_log.txt"
echo "           frontend/frontend_log.txt  admin/admin_log.txt"
echo "     Stop: Ctrl+C"

trap "echo; echo 'Stopping...'; kill $PID_API $PID_BOT $PID_FE $PID_ADM 2>/dev/null; wait" EXIT INT TERM

wait
