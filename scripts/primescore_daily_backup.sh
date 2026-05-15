#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/projects/prime-score}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/projects/prime-score-backups/daily}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
RETENTION_COUNT="${RETENTION_COUNT:-3}"
LOCK_FILE="${LOCK_FILE:-/run/primescore-daily-backup.lock}"
LOG_PREFIX="[primescore-backup]"
TELEGRAM_MAX_BYTES=$((45 * 1024 * 1024))

mkdir -p "$BACKUP_ROOT"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$LOG_PREFIX another backup is already running"
  exit 0
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "$LOG_PREFIX env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

TS="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="$BACKUP_ROOT/work-$TS"
FINAL_DIR="$BACKUP_ROOT/$TS"
DB_WORK_DIR="$WORK_DIR/db"
MINIO_WORK_DIR="$WORK_DIR/minio"
DB_FINAL_DIR="$FINAL_DIR/db"
MINIO_FINAL_DIR="$FINAL_DIR/minio"
mkdir -p "$DB_WORK_DIR" "$MINIO_WORK_DIR" "$DB_FINAL_DIR" "$MINIO_FINAL_DIR"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

cd "$PROJECT_DIR"

zip_dir() {
  local source_dir="$1"
  local output_file="$2"
  python3 - "$source_dir" "$output_file" <<'PY'
import os
import sys
import zipfile

root, output = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for current, _, files in os.walk(root):
        for name in files:
            path = os.path.join(current, name)
            archive.write(path, os.path.relpath(path, root))
PY
}

create_db_backup() {
  echo "$LOG_PREFIX creating database dump $TS"
  docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-primescore}" -Fc > "$DB_WORK_DIR/primescore-db-$TS.dump"
  docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dumpall -U "${POSTGRES_USER:-postgres}" --globals-only > "$DB_WORK_DIR/postgres-globals-$TS.sql"
  sha256sum "$DB_WORK_DIR/primescore-db-$TS.dump" "$DB_WORK_DIR/postgres-globals-$TS.sql" > "$DB_WORK_DIR/SHA256SUMS"
  cat > "$DB_WORK_DIR/README.txt" <<README
PrimeScore database backup: $TS

Contents:
- primescore-db-$TS.dump: PostgreSQL custom-format dump
- postgres-globals-$TS.sql: PostgreSQL globals/roles dump
- SHA256SUMS: file checksums

Restore example:
  createdb primescore_restore
  pg_restore -d primescore_restore primescore-db-$TS.dump
README

  tar -C "$DB_WORK_DIR" -czf "$DB_FINAL_DIR/primescore-db-$TS.tar.gz" .
  zip_dir "$DB_WORK_DIR" "$DB_FINAL_DIR/primescore-db-$TS.zip"
  sha256sum "$DB_FINAL_DIR/primescore-db-$TS.tar.gz" "$DB_FINAL_DIR/primescore-db-$TS.zip" > "$DB_FINAL_DIR/SHA256SUMS"
}

minio_data_source() {
  local container_id
  container_id="$(docker-compose -f "$COMPOSE_FILE" ps -q minio)"
  if [ -z "$container_id" ]; then
    echo "$LOG_PREFIX minio container not found" >&2
    return 1
  fi
  docker inspect --format '{{ range .Mounts }}{{ if eq .Destination "/data" }}{{ .Source }}{{ end }}{{ end }}' "$container_id"
}

create_minio_backup() {
  echo "$LOG_PREFIX creating MinIO backup $TS"
  local data_source
  data_source="$(minio_data_source)"
  if [ -z "$data_source" ] || [ ! -d "$data_source" ]; then
    echo "$LOG_PREFIX MinIO data source not found: $data_source" >&2
    return 1
  fi

  tar -C "$data_source" -czf "$MINIO_WORK_DIR/minio-data-$TS.tar.gz" .
  sha256sum "$MINIO_WORK_DIR/minio-data-$TS.tar.gz" > "$MINIO_WORK_DIR/SHA256SUMS"
  cat > "$MINIO_WORK_DIR/README.txt" <<README
PrimeScore MinIO backup: $TS

Contents:
- minio-data-$TS.tar.gz: MinIO /data volume snapshot, including buckets and object metadata
- SHA256SUMS: file checksums

Restore outline:
  stop MinIO
  extract minio-data-$TS.tar.gz into the MinIO /data volume
  start MinIO
README

  tar -C "$MINIO_WORK_DIR" -czf "$MINIO_FINAL_DIR/primescore-minio-$TS.tar.gz" .
  zip_dir "$MINIO_WORK_DIR" "$MINIO_FINAL_DIR/primescore-minio-$TS.zip"
  sha256sum "$MINIO_FINAL_DIR/primescore-minio-$TS.tar.gz" "$MINIO_FINAL_DIR/primescore-minio-$TS.zip" > "$MINIO_FINAL_DIR/SHA256SUMS"
}

resolve_chat_id() {
  if [ -n "${BACKUP_TELEGRAM_CHAT_ID:-}" ]; then
    printf '%s' "$BACKUP_TELEGRAM_CHAT_ID"
    return 0
  fi
  docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-primescore}" -Atc "select telegram_id from users where lower(username) = 'thebugcreator' and telegram_id is not null order by updated_at desc limit 1;" | tr -d '[:space:]'
}

telegram_api() {
  local method="$1"
  shift
  curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}" "$@"
}

send_telegram_message() {
  local chat_id="$1"
  local text="$2"
  telegram_api sendMessage \
    -d "chat_id=$chat_id" \
    --data-urlencode "text=$text" >/dev/null
}

send_telegram_document() {
  local chat_id="$1"
  local file_path="$2"
  local caption="$3"
  telegram_api sendDocument \
    -F "chat_id=$chat_id" \
    -F "document=@${file_path}" \
    -F "caption=${caption}" >/dev/null
}

validate_telegram_chat() {
  local chat_id="$1"
  telegram_api getChat -d "chat_id=$chat_id" >/dev/null 2>&1
}

send_file_or_parts() {
  local chat_id="$1"
  local file_path="$2"
  local caption="$3"
  local size
  size="$(stat -c%s "$file_path")"
  if [ "$size" -le "$TELEGRAM_MAX_BYTES" ]; then
    send_telegram_document "$chat_id" "$file_path" "$caption"
    return 0
  fi

  local parts_dir="$FINAL_DIR/telegram-parts/$(basename "$file_path")"
  local base_name
  base_name="$(basename "$file_path")"
  mkdir -p "$parts_dir"
  split -b "$TELEGRAM_MAX_BYTES" -d -a 3 "$file_path" "$parts_dir/${base_name}.part-"
  local total
  total="$(find "$parts_dir" -type f -name "${base_name}.part-*" | wc -l | tr -d ' ')"
  local index=0
  for part in "$parts_dir/${base_name}.part-"*; do
    index=$((index + 1))
    send_telegram_document "$chat_id" "$part" "$caption part $index/$total"
  done
}

send_backup_to_telegram() {
  local chat_id="$1"
  echo "$LOG_PREFIX sending DB and MinIO backups to Telegram"
  send_telegram_message "$chat_id" "PrimeScore backup $TS started. DB and MinIO will be sent separately. Local path: $FINAL_DIR" || echo "$LOG_PREFIX warning: Telegram start message failed" >&2

  send_file_or_parts "$chat_id" "$DB_FINAL_DIR/primescore-db-$TS.tar.gz" "PrimeScore DB backup $TS tar.gz" || echo "$LOG_PREFIX warning: DB tar.gz upload failed" >&2
  send_file_or_parts "$chat_id" "$DB_FINAL_DIR/primescore-db-$TS.zip" "PrimeScore DB backup $TS zip" || echo "$LOG_PREFIX warning: DB zip upload failed" >&2

  send_file_or_parts "$chat_id" "$MINIO_FINAL_DIR/primescore-minio-$TS.tar.gz" "PrimeScore MinIO backup $TS tar.gz" || echo "$LOG_PREFIX warning: MinIO tar.gz upload failed" >&2
  send_file_or_parts "$chat_id" "$MINIO_FINAL_DIR/primescore-minio-$TS.zip" "PrimeScore MinIO backup $TS zip" || echo "$LOG_PREFIX warning: MinIO zip upload failed" >&2

  send_telegram_message "$chat_id" "PrimeScore backup $TS completed. Server keeps only latest $RETENTION_COUNT backup sets." || echo "$LOG_PREFIX warning: Telegram completion message failed" >&2
}

prune_old_backups() {
  mapfile -t backup_dirs < <(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d ! -name 'work-*' -printf '%f\n' | sort -r)
  if [ "${#backup_dirs[@]}" -gt "$RETENTION_COUNT" ]; then
    for old_dir in "${backup_dirs[@]:$RETENTION_COUNT}"; do
      rm -rf "$BACKUP_ROOT/$old_dir"
    done
  fi
}

create_db_backup
create_minio_backup

CHAT_ID="$(resolve_chat_id || true)"
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "$CHAT_ID" ]; then
  if validate_telegram_chat "$CHAT_ID"; then
    send_backup_to_telegram "$CHAT_ID"
  else
    echo "$LOG_PREFIX Telegram send skipped: chat id $CHAT_ID is not reachable by this bot. Set BACKUP_TELEGRAM_CHAT_ID in $ENV_FILE after starting the bot from that Telegram account."
  fi
else
  echo "$LOG_PREFIX Telegram send skipped: TELEGRAM_BOT_TOKEN or chat id is missing"
fi

rm -rf "$FINAL_DIR/telegram-parts"
prune_old_backups

echo "$LOG_PREFIX completed: $FINAL_DIR"
