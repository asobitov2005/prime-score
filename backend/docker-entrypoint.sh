#!/bin/sh
set -eu

RUN_APP_BOOTSTRAP="${RUN_APP_BOOTSTRAP:-1}"
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-$RUN_APP_BOOTSTRAP}"
RUN_APP_SEED="${RUN_APP_SEED:-$RUN_APP_BOOTSTRAP}"

python - <<'PY'
import asyncio
import time

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings


async def wait_for_database() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, future=True)
    deadline = time.time() + 60
    while True:
        try:
            async with engine.connect() as connection:
                await connection.execute(text("select 1"))
            break
        except Exception:
            if time.time() >= deadline:
                raise
            time.sleep(2)
    await engine.dispose()


asyncio.run(wait_for_database())
PY

if [ "$RUN_DB_MIGRATIONS" = "1" ]; then
  alembic upgrade head
fi

if [ "$RUN_APP_SEED" = "1" ]; then
  python -m app.db.seed
fi

if [ -n "${TELEGRAM_SESSION_PATH:-}" ]; then
  SESSION_DIR="$(dirname "$TELEGRAM_SESSION_PATH")"
  mkdir -p "$SESSION_DIR"
  chown -R appuser:appuser "$SESSION_DIR"
fi

if [ "$(id -u)" = "0" ] && [ "${RUN_AS_APPUSER:-1}" = "1" ]; then
  exec su -s /bin/sh appuser -c "cd /app && exec $*"
fi

exec "$@"
