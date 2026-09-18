#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${SOURCE_DIR:-/root/projects/prime-score}"
INSTALL_ROOT="${INSTALL_ROOT:-/opt/primescore}"
ENV_FILE="${ENV_FILE:-/etc/primescore/primescore.env}"
RELEASE_ID="${RELEASE_ID:-$(git -C "$SOURCE_DIR" rev-parse --short=12 HEAD)}"
RELEASE_DIR="$INSTALL_ROOT/releases/$RELEASE_ID"
CURRENT_LINK="$INSTALL_ROOT/current"
LOCK_FILE="/run/primescore-deploy.lock"

if [ "$(id -u)" -ne 0 ]; then
  echo "deploy-systemd.sh must run as root" >&2
  exit 1
fi

for required in git rsync python3 runuser curl; do
  command -v "$required" >/dev/null || { echo "missing command: $required" >&2; exit 1; }
done

test -f "$ENV_FILE" || { echo "missing environment file: $ENV_FILE" >&2; exit 1; }
id primescore >/dev/null 2>&1 || { echo "missing system user: primescore" >&2; exit 1; }

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "another PrimeScore deploy is running" >&2; exit 1; }

previous_release="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
install -d -o primescore -g primescore "$INSTALL_ROOT/releases" "$RELEASE_DIR/backend"
install -o root -g root -m 0644 "$SOURCE_DIR"/deploy/systemd/* /etc/systemd/system/
install -o root -g root -m 0755 "$SOURCE_DIR/scripts/primescore_daily_backup.sh" /usr/local/sbin/primescore_daily_backup.sh
install -o root -g root -m 0644 "$SOURCE_DIR/docs/server-projects.md" /root/SERVER_PROJECTS.md
systemctl daemon-reload

rsync -a --delete \
  --exclude '.env' \
  --exclude '.secrets/' \
  --exclude '.venv/' \
  --exclude '__pycache__/' \
  --exclude '*.pyc' \
  "$SOURCE_DIR/backend/" "$RELEASE_DIR/backend/"
chown -R primescore:primescore "$RELEASE_DIR"

runuser -u primescore -- python3 -m venv "$RELEASE_DIR/backend/.venv"
runuser -u primescore -- "$RELEASE_DIR/backend/.venv/bin/python" -m pip install --disable-pip-version-check --upgrade pip wheel
runuser -u primescore -- "$RELEASE_DIR/backend/.venv/bin/python" -m pip install --disable-pip-version-check "$RELEASE_DIR/backend"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
(
  cd "$RELEASE_DIR/backend"
  runuser -u primescore --preserve-environment -- env HOME=/var/lib/primescore ./.venv/bin/alembic upgrade head
)

ln -sfn "$RELEASE_DIR" "$INSTALL_ROOT/current.new"
mv -Tf "$INSTALL_ROOT/current.new" "$CURRENT_LINK"
systemctl restart primescore-api.service primescore-worker.service primescore-beat.service primescore-bot.service

healthy=false
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error http://127.0.0.1:8000/api/health >/dev/null; then
    healthy=true
    break
  fi
  sleep 1
done

if [ "$healthy" != true ]; then
  journalctl -u primescore-api.service -n 80 --no-pager >&2 || true
  if [ -n "$previous_release" ] && [ -d "$previous_release" ]; then
    ln -sfn "$previous_release" "$INSTALL_ROOT/current.rollback"
    mv -Tf "$INSTALL_ROOT/current.rollback" "$CURRENT_LINK"
    systemctl restart primescore-api.service primescore-worker.service primescore-beat.service primescore-bot.service
  fi
  echo "PrimeScore health check failed; previous release restored" >&2
  exit 1
fi

mapfile -t old_releases < <(find "$INSTALL_ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk 'NR > 3 {print $2}')
for old_release in "${old_releases[@]}"; do
  [ "$old_release" = "$(readlink -f "$CURRENT_LINK")" ] || rm -rf -- "$old_release"
done

echo "PrimeScore backend deployed: $RELEASE_ID"
