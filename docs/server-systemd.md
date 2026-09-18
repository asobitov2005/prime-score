# Production server layout

PrimeScore production backend runs as native systemd services. The user and admin
Next.js applications are deployed by Vercel and are not started on the server.

## Paths

- Git checkout: `/root/projects/prime-score`
- Active backend release: `/opt/primescore/current/backend`
- Previous releases: `/opt/primescore/releases`
- Secrets and runtime environment: `/etc/primescore/primescore.env`
- MinIO data: `/var/lib/primescore/minio`
- Redis data: `/var/lib/primescore/redis`
- Backups: `/root/projects/prime-score-backups/daily`

## Services

- `postgresql.service`: PostgreSQL 16 on `127.0.0.1:5432`
- `primescore-redis.service`: dedicated Redis on `127.0.0.1:6380`
- `primescore-minio.service`: MinIO API on `127.0.0.1:9000`
- `primescore-api.service`: FastAPI on `127.0.0.1:8000`
- `primescore-worker.service`: Celery worker
- `primescore-beat.service`: Celery scheduler
- `primescore-bot.service`: Telegram bot
- `primescore-backup.timer`: daily PostgreSQL and MinIO backup

Use `systemctl status primescore.target` for the stack and `journalctl -u
primescore-api.service -f` for API logs. Deployments are atomic releases executed
by `scripts/deploy-systemd.sh`; a failed API health check restores the previous
release symlink.

Nginx exposes only `api.primescore.uz` and proxies it to `127.0.0.1:8000`.
`primescore.uz` and `admin.primescore.uz` resolve to Vercel.
