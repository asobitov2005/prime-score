# Server project map

Last verified: 2026-09-18. Host: `vmi2815613` (`84.247.183.218`).

## PrimeScore

- Git checkout: `/root/projects/prime-score` (backend-only sparse checkout)
- Active release: `/opt/primescore/current/backend`
- Environment and credentials: `/etc/primescore/`
- Runtime data: `/var/lib/primescore/`
- Backups: `/root/projects/prime-score-backups/`
- Public API: `api.primescore.uz` -> nginx -> `127.0.0.1:8000`
- Vercel apps: `primescore.uz`, `www.primescore.uz`, `admin.primescore.uz`
- Services: `primescore-api`, `primescore-worker`, `primescore-beat`,
  `primescore-bot`, `primescore-redis`, `primescore-minio`, PostgreSQL
- Daily backup: `primescore-backup.timer`

Docker, containerd, and the Docker socket are disabled. The old PrimeScore Docker
volumes are retained only as a rollback source and are not mounted by production.

## Other active projects

| Project | Location | systemd services | Public endpoint |
| --- | --- | --- | --- |
| Cloud Bot | `/root/projects/cloud-bot` | `cloud-bot.service` | `prime.testnest.uz` -> `:8055` |
| Chingiz Bot | `/root/projects/chingizbot` | `chingiz-bot.service`, `chingizbot.service`, `celery-worker.service`, `celery-beat.service` | `azizjon.testnest.uz` -> `127.0.0.1:8585` |
| Trend Bot | `/root/projects/trend-bot` | `trend-bot.service`, `trend-bot-polling.service`, `trend-celery-worker.service`, `trend-celery-beat.service` | `trend.testnest.uz` -> `127.0.0.1:8586` |
| UserBot | `/root/projects/userbot` | `userbot.service` | No nginx site |
| StarBot | `/var/www/starbot` | `payment-daemon.service`, PHP-FPM | `starbot.testnest.uz` |

MySQL and the shared host Redis are native OS services used by non-PrimeScore
projects. Do not stop them while maintaining PrimeScore.

## Configured but inactive upstreams

These nginx sites were enabled during the verification, but no process was
listening on their configured upstream port:

- `api.status.aisha-ai.uz` -> `127.0.0.1:8005`
- `api.ustamax.uz` -> `127.0.0.1:5556`
- `auth.testnest.uz` -> `127.0.0.1:8008`
- `stars.sodops.uz` -> `127.0.0.1:8080`
- `status.aisha-ai.uz` -> `127.0.0.1:8089`

## Operations

```bash
systemctl status primescore.target
journalctl -u primescore-api.service -f
systemctl list-timers primescore-backup.timer
nginx -t
```

PrimeScore deployments are performed by GitHub Actions after the backend test
suite succeeds. The deploy script creates an atomic release and restores the
previous release symlink if the API health check fails.
