# AGENTS.md

PrimeScore uchun minimal agent guide. Eski katta PRD olib tashlangan. Ishni boshlashdan oldin shu fayl va [`README.md`](./README.md) ni o'qing.

## Avval nimani ignore qilish kerak

Quyidagilarni keraksiz context sifatida ochmang:

- `frontend/.next/`
- `admin/.next/`
- `node_modules/`
- `__pycache__/`
- `*.pyc`
- `frontend/tsconfig.tsbuildinfo`
- `admin/tsconfig.tsbuildinfo`

## Repo xaritasi

- `backend/` — FastAPI API, SQLAlchemy models, Alembic migrations, Telegram bot, Celery setup
- `frontend/` — user-facing Next.js app
- `admin/` — alohida Next.js admin app
- `docs/context/README.md` — juda qisqa pointer, boshqa og'ir context fayllar olib tashlangan

## Hozirgi real holat

- Active backend routerlar `backend/app/api/routes/*` ichida. `backend/app/api/routers/*` legacy duplicate, unga yangi kod qo'shmang.
- User-protected backend endpointlar hozir `backend/app/core/deps.py` dagi `X-Debug-*` headerlar bilan auth qiladi.
- Telegram login flow mavjud:
  - bot: `backend/app/bot/main.py`
  - code store: `backend/app/services/code_store.py`
  - verify endpoint: `POST /api/auth/verify-code`
- Shunga qaramay user frontend hali to'liq bearer-token auth bilan ulanmagan. Session asosan `frontend/store/auth-store.ts` ichida client-side saqlanadi.
- Admin auth boshqa holatda: `admin/` app phone/password + Telegram OTP flowdan keyin JWT bearer cookie ishlatadi va `/api/admin/auth/*` bilan gaplashadi.
- User frontend hybrid: backend muvaffaqiyatsiz bo'lsa ko'p joy fallback/mock ma'lumotga qaytadi.
  - `frontend/lib/server-data.ts`
  - `frontend/lib/server-me.ts`
  - `frontend/lib/api/client.ts`
  - `frontend/lib/mock-data.ts`
- Attempt flow uchun live backend ishlatiladi, fallback qatlam ham bor:
  - frontend: `frontend/lib/server-attempts.ts`
  - backend DB/runtime: `backend/app/services/attempt_repo.py`, `backend/app/services/runtime_store.py`
- Route transition loader shu fayllarda:
  - `frontend/components/layout/navigation-transition-overlay.tsx`
  - `frontend/components/layout/app-loading-placeholder.tsx`
  - `frontend/lib/navigation-transition.ts`
- Admin bo'yicha primary app `admin/`. `frontend/app/admin/*` eski/secondary surface, user aniq so'ramasa o'shani emas `admin/` ni o'zgartiring.
- Celery sozlangan, lekin `backend/app/tasks/tasks.py` dagi tasklar hozircha asosan stub.
- Dedicated frontend/admin automated tests deyarli yo'q. Asosiy testlar `backend/tests/` ichida.

## Qayerdan boshlash kerak

Task turiga qarab birinchi shu joylarni tekshiring:

- User auth, loading, route guard:
  - `frontend/store/auth-store.ts`
  - `frontend/components/layout/site-shell.tsx`
  - `frontend/components/layout/app-shell.tsx`
  - `frontend/components/marketing/login-page-client.tsx`
- User catalog, dashboard, history:
  - `frontend/app/(app)/`
  - `frontend/lib/server-data.ts`
  - `frontend/lib/server-me.ts`
- Attempt runtime, scoring, snapshots:
  - `backend/app/services/attempt_repo.py`
  - `backend/app/services/runtime_store.py`
  - `backend/app/services/scoring.py`
  - `backend/app/services/test_content_repo.py`
- Admin test builder:
  - `admin/components/test-editor-wizard.tsx`
  - `admin/lib/api.ts`
  - `admin/lib/server-data.ts`
- Telegram auth bot:
  - `backend/app/bot/main.py`
  - `backend/app/services/code_store.py`
- Admin auth OTP:
  - `backend/app/services/admin_auth.py`
  - `backend/app/api/routes/admin.py`
  - `admin/components/login-flow.tsx`

## Ishlash qoidalari

- Docsni eski reja bo'yicha emas, amaldagi code bo'yicha yangilang.
- Agar backend endpointni haqiqiy live flowga o'tkazsangiz, frontenddagi mos fallbackni ham tozalang. Yana bitta qo'shimcha fallback qo'shib ketmang.
- Auth bilan ishlaganda doim ikki tomonini tekshiring:
  - session persistence/store
  - redirect/guard
- `admin/` va `frontend/app/admin/*` ikkalasini chalkashtirmang.
- Katta planning hujjatlarni qayta yaratmang. Uzun PRD yoki implementation memo bu repo uchun kerak emas.
- Qisqa, navigatsiyaga yordam beradigan docs qoldiring. Asosiy source of truth: kodning o'zi.
