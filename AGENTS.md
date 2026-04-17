# AGENTS.md

Bu fayl AI kodlash agentlari (Claude Code, Cursor, Aider, va boshqalar) uchun loyiha kontekstini beradi. **Har bir agent ishni boshlashdan oldin bu faylni o'qishi shart.**

---

## Loyiha haqida

**PrimeScore** — IELTS Academic mock test platformasi (faqat Reading + Listening). Self-study studentlar uchun.

**Asosiy hujjat:** [`PLAN.md`](./PLAN.md) — to'liq PRD, database schema, API, UI, admin flow.

**Scope qoidasi:** Bu loyiha **to'liq scope** — MVP emas. Agent hech qachon "faqat 1-fazani qilaylik" yoki "bu keyinroq" deb taklif qilmasligi kerak. Scope ning 40% ini qisqartirmang.

---

## Til qoidalari

- **UI, test kontenti, email, notifications:** faqat **inglizcha**
- **Code comments, commit messages, PR descriptions:** inglizcha
- **Foydalanuvchi bilan muloqot (user-facing docs, chat):** **o'zbekcha** + inglizcha texnik atamalar (user Uzbek-speaking)
- **Database field names, API endpoints, variable names:** inglizcha

---

## Tech Stack (o'zgartirilmaydi, bekor aniqlangan)

### Backend
- **FastAPI** (Python 3.11+) — async
- **PostgreSQL 16+** — asosiy DB
- **Redis 7+** — cache, session, rate-limit, Celery broker
- **Celery** — background tasks (scoring, notifications, analytics)
- **SQLAlchemy 2.0** (async) + **Alembic** (migrations)
- **Pydantic v2** — validation
- **aiogram 3.x** — Telegram bot

### Frontend
- **Next.js 14+** (App Router) — SSR for landing, SPA for app
- **Tailwind CSS** + **shadcn/ui** — styling
- **Zustand** — client state
- **TanStack Query** — server state
- **Recharts** — charts (dashboard, heatmap)
- **Howler.js** — audio player (listening + segment seek)
- **Tiptap** — rich text editor (admin)
- **dnd-kit** — drag-drop (matching questions, admin editor)
- **React Hook Form + Zod** — forms

### Storage / Infra
- **S3-compatible** (MinIO or cloud) — audio, images
- **Docker Compose** (dev) / Kubernetes or Swarm (prod)
- **Nginx/Traefik** — reverse proxy
- **Sentry + PostHog + Prometheus/Grafana** — observability

**Agent shulardan boshqa stack ishlatmasligi kerak.** Agar kerak bo'lsa, oldin user bilan muhokama qilsin.

---

## Asosiy biznes qoidalari (CRITICAL — buzilmaydi)

### Test structure
- Reading test = **3 passage + 40 savol** (60 min exam)
- Listening test = **4 part + 40 savol** (30 min exam)
- Reading va Listening — **alohida testlar** (combined mock YO'Q)
- Test ichida: **full** yoki **part-level** (bitta passage/part)

### Test modalari
- **Practice mode:** count-up timer, cheksiz vaqt, pause mumkin, review per-question
- **Exam mode:** strict countdown timer, pause yo'q, auto-submit, tab-switch log
- **Part-level = doim Practice** (exam YO'Q)
- **Full test = Practice yoki Exam** tanlash mumkin

### Access
- `access_type = public` → free userlar ko'radi
- `access_type = premium` → faqat premium
- **Explanations** (savol tushuntirishi) — faqat Premium
- Admin har test uchun access belgilaydi

### Auth (Telegram only)
- **6 xonali kod** (4 EMAS — security)
- 3 min expiry, 1-time use
- 3 failed attempts → 5 min block
- **Max 2 active session** per user (3-chi login eng eskisini chiqaradi)
- Device type aniqlash YO'Q — oddiy 2-session cap

### Subscription
- Plans: 30/90/180/365 kun — admin paneldan konfiguratsiya
- **Auto-renew YO'Q** — faqat one-time payment
- Stacking: premium ustiga olsa, muddat oxiriga qo'shiladi
- Promo codes, gift codes — admin yaratadi

### Roles
- **Super Admin:** hammasi
- **Admin:** faqat test CRU + analytics view

### Versioning
- Published test edit → yangi version yaratiladi
- Eski attemptlar `test_snapshot` JSONB orqali saqlanadi
- **User history hech qachon buzilmaydi**

---

## Question Types — TO'LIQ IMPLEMENT

Agent **barcha 14 Reading + 8 Listening question turlarini** qo'llab-quvvatlashi kerak. Shorten qilmang.

### Reading (14 turi)
1. Multiple Choice (single answer)
2. Multiple Choice (multiple answers)
3. True / False / Not Given
4. Yes / No / Not Given
5. Matching Information (to paragraphs)
6. Matching Headings
7. Matching Features
8. Matching Sentence Endings
9. Sentence Completion
10. Summary Completion (with word bank)
11. Summary Completion (free text)
12. Note / Table / Flow-chart Completion
13. Diagram / Map Labeling
14. Short Answer Questions

### Listening (8 turi, completion birlashtirilgan)
1. MC Single
2. MC Multiple
3. Matching
4. Plan / Map / Diagram Labeling
5. Form / Note / Table / Flow-chart / Summary Completion
6. Sentence Completion
7. Short Answer
8. (rare: Map Labeling — free text)

**Batafsil spec uchun PLAN.md § 7.3 ga qarang.**

---

## Answer normalization (IMPORTANT)

```python
def normalize(text: str) -> str:
    return text.strip().lower()  # + spaces collapsed, trailing punct removed
```

**Qabul qilinadi:**
- Case-insensitive
- Whitespace trim

**Qabul qilinmaydi (admin variant sifatida qo'shadi):**
- Article (a/an/the) ignore — YO'Q
- Plural/singular auto — YO'Q
- British/American spelling auto — YO'Q
- Typo tolerance — YO'Q (real IELTS ham tolerate qilmaydi)

**Admin har bir savol uchun `answers` jadvalida barcha qabul qilinadigan variantlarni kiritadi.**

---

## Gap-fill marker standart

**Format:** `{{N}}` — N = question_number (1-40)

```
The first flight was in {{12}} by {{13}}.
```

Frontend regex bilan parse qiladi, `<input data-q="N">` ga aylantiradi. Boshqa format ishlatilmaydi.

---

## File va kod tashkilotchiligi

```
/home/azizbek/projects/mate/PrimeScore/
├── PLAN.md              # asosiy PRD
├── AGENTS.md            # bu fayl
├── backend/             # FastAPI
│   ├── app/
│   │   ├── api/         # endpoints (auth, tests, attempts, admin, ...)
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # business logic
│   │   ├── core/        # config, security, deps
│   │   ├── tasks/       # Celery tasks
│   │   └── bot/         # aiogram handlers
│   ├── alembic/         # migrations
│   └── tests/           # pytest
├── frontend/            # Next.js (user-facing + landing)
│   ├── app/             # App Router pages
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── store/           # Zustand stores
├── admin/               # Next.js admin panel (alohida)
└── docker-compose.yml
```

---

## Kod yozish qoidalari

### Umumiy
- **Default: NO comments** — comment faqat *why* uchun (nega, nimaga), *what* emas
- **No backwards-compat hacks** — agar kerak emas bo'lsa, olib tashlanadi
- **No premature abstraction** — 3 ta o'xshash satr abstraction dan yaxshi
- **No error handling for impossible cases** — boundary da validatsiya qiling, ichkarida trust

### Backend (Python)
- Type hints hamma joyda
- `async def` har API endpoint uchun
- Pydantic schemalar Request/Response har ikkalasi uchun alohida
- Dependency injection (FastAPI `Depends`) — DB session, current user, admin guard
- Alembic migrations — **har DB o'zgarishda**

### Frontend (TypeScript)
- Strict TS — `any` taqiqlangan
- Server components default, `"use client"` faqat kerak bo'lsa
- Form validation: Zod schemalar
- API calls: TanStack Query (never direct fetch in components)

### Database
- UUID primary keys (gen_random_uuid())
- Created_at / updated_at har tableda
- Soft delete faqat Users uchun; boshqa entitylar hard delete
- Indexes: har foreign key + query-hot columns
- Cascading deletes: admin explicit belgilagan joylarda

---

## Test qoidalari

- Backend: `pytest` + `pytest-asyncio` + `httpx` (API tests)
- Frontend: Playwright (E2E) + Vitest (unit)
- **Har yangi feature uchun test yozish majburiy**
- Integration tests — real DB (mock EMAS)

---

## Security checklist

- [ ] JWT access token 15 min, refresh 30 kun
- [ ] Refresh token rotation on use
- [ ] Token blacklist Redis da (jti)
- [ ] Rate limiting hamma sensitive endpointlarda
- [ ] S3 signed URLs (1 soat expiry)
- [ ] Rich text sanitized (bleach backend, DOMPurify frontend)
- [ ] SQL injection — faqat parameterized queries
- [ ] HTTPS hamma joyda
- [ ] CORS strict whitelist
- [ ] Admin endpoints role guard bilan

---

## Exam integrity (listening/reading test)

- Tab switch detection → `attempt.metadata.tab_switches` ga log
- Copy-paste detection → log (blocking emas — deterrent)
- Inspect element blocking — YO'Q (realistic emas)
- Full-screen recommendation — ha, lekin force EMAS
- Network disconnect → localStorage backup + reconnect recovery
- Auto-save har 10 sekund batched

---

## Keng tarqalgan xatolar — agentlar QILMASIN

1. ❌ "MVP uchun buni skip qilamiz" — hammasi to'liq
2. ❌ `any` type in TypeScript
3. ❌ Commentlarni "bu nima qiladi" deb yozish
4. ❌ Hardcoded strings — i18n tayyor bo'lmasa ham, constants ishlating
5. ❌ Device-type session logic (telefon vs kompyuter) — faqat 2 session cap
6. ❌ 4-digit login code (6 bo'lishi kerak)
7. ❌ Partial question type support — 14/14 Reading va 8/8 Listening kerak
8. ❌ AI-based fuzzy answer matching — strict normalize + admin variants
9. ❌ Auto-renew subscription — manual one-time payment
10. ❌ Question bank yaratish 1-fazada — test-level questions yetarli (2-fazada ko'rib chiqiladi)

---

## Kelajakdagi kengaytmalar (hozir EMAS)

Bu featurelar hozirgi scope da yo'q, lekin arxitektura tayyor bo'lishi kerak:
- Writing module (keyinroq)
- Speaking module (AI bilan, kelajakda)
- Combined full mock test (Reading + Listening birga)
- Mobile native app (hozircha PWA)
- Multi-language UI (hozircha faqat inglizcha)

---

## Yordam kerak bo'lsa

1. `PLAN.md` — birinchi manba
2. Memory files: `~/.claude/projects/-home-azizbek-projects-mate-PrimeScore/memory/`
3. Agar kontekst yetmasa — **user bilan aniqlashtiring**, taxmin qilmang

---

## Agent uchun oddiy qoida

**Agar siz biror qarorda ikkilanayotgan bo'lsangiz:**
1. `PLAN.md` va `AGENTS.md` ni qayta o'qing
2. Agar javob yo'q bo'lsa — user bilan aniqlashtiring
3. **Hech qachon sukut bilan scope ni qisqartirmang**
