# PrimeScore

PrimeScore — IELTS Reading va Listening practice platformasi. Repo hozir uchta asosiy qismdan iborat:

- `backend/` — FastAPI API, SQLAlchemy models, Alembic migrations, Telegram bot, Celery setup
- `frontend/` — user-facing Next.js app
- `admin/` — alohida Next.js admin app

## Hozirgi holat

- User frontend hybrid ishlaydi: imkon bo'lsa backenddan o'qiydi, bo'lmasa ayrim sahifalarda mock/fallback data ishlatadi.
- User auth flow Telegram code bilan boshlanadi, lekin user-protected backend route'lar hozir ham `X-Debug-*` headerlar orqali himoyalangan. Ya'ni user auth end-to-end hali to'liq bearer-token flow emas.
- Admin auth alohida va ancha realroq: `admin/` app bearer cookie orqali `/api/admin/*` endpointlarga ulanadi.
- Attempt flow, snapshot, scoring va test publish logikasi backendda realroq ishlaydi.
- Celery configure qilingan, lekin tasklarning ko'pi hali stub return bilan turibdi.
- Frontend/admin automated tests deyarli yo'q; asosiy testlar `backend/tests/` ichida.

## Muhim navigatsiya nuqtalari

- Backend active routerlar: `backend/app/api/routes/*`
- Legacy duplicate routerlar: `backend/app/api/routers/*`
- User layout/auth/loading:
  - `frontend/store/auth-store.ts`
  - `frontend/components/layout/site-shell.tsx`
  - `frontend/components/layout/app-shell.tsx`
  - `frontend/components/layout/navigation-transition-overlay.tsx`
- User data layer:
  - `frontend/lib/server-data.ts`
  - `frontend/lib/server-me.ts`
  - `frontend/lib/server-attempts.ts`
  - `frontend/lib/api/client.ts`
- Admin builder/data layer:
  - `admin/components/test-editor-wizard.tsx`
  - `admin/lib/api.ts`
  - `admin/lib/server-data.ts`

## Local run

### Docker Compose

Eng tez yo'l:

```bash
docker compose up --build
```

Default portlar:

- frontend: `http://localhost:3000`
- admin: `http://localhost:3001`
- backend API: `http://localhost:8000`

### Qo'lda ishga tushirish

Backend:

```bash
cd backend
python -m venv .venv
./.venv/bin/pip install -e .
cp .env.example .env
./.venv/bin/python -m app.db.seed
./.venv/bin/python -m uvicorn app.main:app --reload
```

Telegram bot:

```bash
cd backend
./.venv/bin/python -m app.bot.main
```

Payment detector:

```bash
cd backend
./.venv/bin/primescore-payment-detector
```

Detector `admin` ichidagi `Payments` sahifasida saqlanadigan `Telegram API ID/hash`, `phone`, `active bot`, va active payment card bilan ishlaydi.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Admin:

```bash
cd admin
npm install
npm run dev
```

## Seeded local accounts

`backend/app/db/seed.py` local debug ma'lumotlarni yaratadi. Admin loginlar:

- `admin / admin`
- `test_admin / TestAdmin123!`
- `test_super_admin / TestSuperAdmin123!`

## Hujjatlar

- `AGENTS.md` — AI agentlar uchun qisqa repo guide
- `docs/context/README.md` — faqat qisqa pointer

Bu repo intentionally kichik docs bilan yuradi. Agar docs o'zgarsa, katta PRD yozish o'rniga `README.md` va `AGENTS.md` ni yangilang.
