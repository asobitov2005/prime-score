# PrimeScore — Loyiha Overview

> AI agentlar uchun loyiha konteksti. Scope, stack, va asosiy product qarorlar.

## Nima qurilayapti

**PrimeScore** — IELTS Academic mock test platformasi.

**Scope:**
- Faqat **Reading** va **Listening** (Writing/Speaking hozir emas)
- Target: **self-study IELTS studentlar**
- UI tili: **faqat inglizcha**

## Test tuzilishi

- **Reading test** = 3 passage, 40 savol, 60 min (exam mode)
- **Listening test** = 4 part, 40 savol, 30 min (exam mode)
- Reading va Listening — **alohida testlar** (combined full mock YO'Q)
- Test ichida user **full** yoki **part-level** (bitta passage/part) ishlashi mumkin

## Full Scope (MVP EMAS)

User bir necha marta aytdi:
> "1-faza emas, to'liq loyiha kerak"

Quyidagilarning **hammasi** boshdan implement qilinishi kerak:
- Barcha 14 IELTS Reading question turlari
- Barcha 8 Listening question turlari
- Full admin panel (polymorphic question builder + live preview)
- Full user dashboard (charts, heatmap, leaderboard)
- Full subscription system (plans, promo codes, gift codes)
- Payment module architecture tayyor, lekin live integration hozircha paused
- Telegram bot auth + notifications
- Responsive UI (mobile, tablet, desktop)
- Test versioning + attempt snapshot

## Tech Stack (aniqlangan, o'zgartirilmaydi)

### Backend
- **FastAPI** (Python 3.11+, async)
- **PostgreSQL 16+**
- **Redis 7+** — cache, session, rate-limit, Celery broker
- **Celery** — background tasks
- **SQLAlchemy 2.0** (async) + **Alembic** (migrations)
- **Pydantic v2**
- **aiogram 3.x** — Telegram bot

### Frontend
- **Next.js 14+** (App Router) — SSR landing, SPA app
- **Tailwind CSS** + **shadcn/ui**
- **Zustand** (client state) + **TanStack Query** (server state)
- **Recharts** (charts)
- **Howler.js** (audio)
- **Tiptap** (admin rich text editor)
- **dnd-kit** (drag-drop)
- **React Hook Form + Zod**

### Infra
- **S3-compatible** (MinIO/cloud) — audio, images
- **Docker Compose** (dev), **Kubernetes/Swarm** (prod)
- **Nginx/Traefik** — reverse proxy
- **Sentry + PostHog + Prometheus/Grafana** — observability

## Asosiy manba

**To'liq PRD va texnik reja:** [`PLAN.md`](../../PLAN.md)

**Agent ishlash qoidalari:** [`AGENTS.md`](../../AGENTS.md)

## Deployment holati

- Domain va hosting server **tayyor** (user aytgan)
- Hech qayerda production ga deploy qilinmagan
- Kod bazasi hali yozilmagan — hozirda PLAN.md + AGENTS.md + context tayyor

## Keyingi qadam

Sprint 1: Infrastructure setup (Docker, DB, FastAPI skeleton, Telegram bot login flow).

Batafsil milestone: PLAN.md § 21.
