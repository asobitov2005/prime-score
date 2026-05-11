# PrimeScore

PrimeScore — IELTS Reading va Listening practice platformasi. Repo hozir uchta asosiy qismdan iborat:

- `backend/` — FastAPI API, SQLAlchemy models, Alembic migrations, Telegram bot, Celery setup
- `frontend/` — user-facing Next.js app
- `admin/` — alohida Next.js admin app

## Hozirgi holat

- User frontend hybrid ishlaydi: imkon bo'lsa backenddan o'qiydi, bo'lmasa ayrim sahifalarda mock/fallback data ishlatadi.
- User auth flow Telegram code bilan boshlanadi, lekin user-protected backend route'lar hozir ham `X-Debug-*` headerlar orqali himoyalangan. Ya'ni user auth end-to-end hali to'liq bearer-token flow emas.
- Admin auth alohida va ancha realroq: `admin/` app phone/password + Telegram OTPdan keyin bearer cookie orqali `/api/admin/*` endpointlarga ulanadi.
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

Dev hot-reload va terminal yopilgandan keyin ham ishlashi uchun:

```bash
docker compose down --remove-orphans
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Bu override bilan `api`, `worker`, `beat`, `bot`, `frontend`, `admin` fon rejimida turadi; kod o'zgarsa app servislar avtomatik restart/reload qiladi.

Foydali buyruqlar:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api frontend admin
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
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

Detector `admin` ichidagi `Payments` sahifasida saqlanadigan `Telegram API ID/hash`, `phone`, `active bot`, va active payment card bilan ishlaydi. Docker compose orqali ishga tushirilsa Telegram session fayli `telegram_session_data` volume ichida, login/contact kabi Redis holati esa `redis_data` volume ichida saqlanadi.

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

`backend/app/db/seed.py` local debug ma'lumotlarni yaratadi. Admin login identifier endi phone number, OTP esa bog'langan Telegram accountga yuboriladi. Seeded adminlar:

- `+998900000001 / admin` (`admin`, telegram_id `900000001`)
- `+998900000002 / TestAdmin123!` (`test_admin`, telegram_id `900000002`)
- `+998900000003 / TestSuperAdmin123!` (`test_super_admin`, telegram_id `900000003`)

Real local login uchun admin recorddagi `phone_number` va `telegram_id` bot orqali ulangan haqiqiy Telegram accountga mos bo'lishi kerak.

## Hujjatlar

- `AGENTS.md` — AI agentlar uchun qisqa repo guide
- `docs/context/README.md` — faqat qisqa pointer

Bu repo intentionally kichik docs bilan yuradi. Agar docs o'zgarsa, katta PRD yozish o'rniga `README.md` va `AGENTS.md` ni yangilang.
