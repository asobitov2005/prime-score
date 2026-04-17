# PrimeScore — IELTS Mock Test Platform

**To'liq Product Requirements Document (PRD) & Technical Plan**

---

## 1. Executive Summary

**PrimeScore** — IELTS Academic (Reading va Listening) mock testlarini o'tkazuvchi sayt-platforma. Self-study qilayotgan studentlar uchun mo'ljallangan, real IELTS atmosferasini yaratib beruvchi professional tizim.

**Asosiy maqsad:** Studentga real IELTS imtihon sharoitini imkon qadar aniq simulyatsiya qilib berish + progressni kuzatish + kuchli va kuchsiz tomonlarini aniqlash.

**Hozirgi scope:**
- Reading mock testlar (IELTS Academic)
- Listening mock testlar
- Speaking — rejada yo'q (AI kelajakda)
- Writing — rejada yo'q (keyinroq)

**Target user:** Self-study IELTS studentlar.

**Til:** Faqat inglizcha (UI, testlar, hamma matn).

---

## 2. Product Decisions (yakuniy qarorlar)

### 2.1 Test tuzilishi
- Reading test = 3 passage + 40 savol + 60 min (exam mode)
- Listening test = 4 part + 40 savol + exam timer = `audio duration + 2 min`
- Reading va Listening — **alohida testlar** (combined full mock yo'q hozircha)
- Har bir test ichida user **full** yoki **part-level** (bitta passage / part) tanlashi mumkin

### 2.2 Test modelari

| Parameter | Practice Mode | Exam Condition Mode |
|---|---|---|
| Timer | Count-up (cheksiz) | Strict countdown (Reading = 60 min, Listening = audio + 2 min) |
| Pause | Ha | Yo'q |
| Orqaga qaytish | Ha | Ha (IELTS da mumkin) |
| Section skip | Ha | Ha |
| Part-level test | Faqat Practice | Mumkin emas — faqat full test |
| Natija ko'rinishi | Darhol + per-question | Faqat test tugagandan keyin |
| Tab switch warning | Yo'q | Ha, log qilinadi |
| Auto-submit | Yo'q | Ha, vaqt tugasa |

**Qoida:** Part-level test (bitta passage/part) = har doim Practice. Full test = Practice yoki Exam tanlash mumkin.

### 2.3 Tarif va access
- **Free:** Public testlar (admin "Public" deb belgilagan)
- **Premium:** Premium testlar + Explanations (izoh ko'rish) + kelajakdagi premium featurelar
- Test `access_type` admin tomonidan belgilanadi: `public` yoki `premium`
- Premium userlar barcha testlarni ko'radi

### 2.4 Premium rejalari (admin paneldan konfiguratsiya)
- 30 kun
- 90 kun
- 180 kun
- 365 kun
- Har biri uchun: narx + % chegirma (admin kiritadi)
- **Auto-renew YO'Q** — user qayta manual sotib oladi
- Active premium ustiga yana olsa → muddat oxiriga qo'shiladi (stacking)

### 2.5 To'lov
- Payme, Click (va keyinroq boshqalari) — admin konfiguratsiya
- Webhook-based, idempotent
- Refund admin paneldan manual

### 2.6 Promo kodlar
- `%` chegirma
- `max_uses` (admin kiritadi)
- `valid_until` (amal qilish muddati)
- Registration paytida yoki tarif sotib olayotganda kiritiladi
- **Gift code:** user kimgadir tarif sovg'a qilishi mumkin — boshqa user activate qiladi

### 2.7 Session boshqaruvi
- Maksimum **2 ta active session** per user
- 3-chi login → eng eski session invalidate bo'ladi
- Device type aniqlash (telefon/kompyuter) YO'Q — oddiy 2 session limit (professional approach)
- Admin paneldan user sessionlarni ko'rish va force logout qilish mumkin

### 2.8 Auth
- Faqat Telegram bot orqali (SMS/email yo'q)
- 6 xonali kod (4 emas — security)
- Kod 3 daqiqa amal qiladi
- 3 ta noto'g'ri urinish → 5 daqiqa block

### 2.9 Review/Explanation
- Test tugagandan keyin user xato/to'g'ri javoblarni ko'radi
- **"Show correct answer"** tugmasi — user xohlasa bosadi
- **Explanation** — faqat **Premium** userlarga ko'rinadi
- Explanation admin tomonidan har savolga kiritiladi

### 2.10 Leaderboard
- Global, hammaga ochiq
- Free + Premium hamma qatnashadi
- User profilda privacy toggle — leaderboarddan yashirish mumkin

### 2.11 Admin rollar
- **Super Admin** — hammasi (users, plans, promo, settings)
- **Admin** — faqat test CRU (Create, Read, Update) + analytics ko'rish

### 2.12 Test source (metadata)
- `source`: Cambridge / Real Exam / Custom
- `source_detail`: text (masalan: "Cambridge 18, Test 2" yoki "Real Exam — March 2024")
- Bu metadata user dashboardda ham ko'rinadi (qayerdan olingan bilinadi)

---

## 3. Tech Stack

### 3.1 Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 16+
- **Cache / Session / Rate-limit:** Redis 7+
- **Task queue:** Celery + Redis broker
- **ORM:** SQLAlchemy 2.0 (async)
- **Migration:** Alembic
- **Telegram bot:** aiogram 3.x
- **Storage:** S3-compatible (MinIO self-hosted yoki cloud S3) — audio, images
- **Validation:** Pydantic v2

### 3.2 Frontend
- **Framework:** Next.js 14+ (App Router)
  - Landing + marketing pages = SSR (SEO)
  - Dashboard + test taking = CSR/SPA (tez, interactive)
- **UI library:** shadcn/ui + Tailwind CSS (premium feel, light bundle)
- **State management:** Zustand (oddiy, yengil) + TanStack Query (server state)
- **Charts:** Recharts (dashboard chart/heatmap uchun)
- **Audio:** Howler.js (listening player + segment seek)
- **Rich text editor (admin):** Tiptap (based on ProseMirror)
- **Drag-drop:** dnd-kit (matching savollari + admin test editor)
- **Forms:** React Hook Form + Zod

### 3.3 Admin Panel
- Alohida Next.js app (yoki shu app ichida `/admin` route)
- Same stack + role-based guard

### 3.4 Infrastructure
- **Deployment:** Docker Compose (dev) + Kubernetes yoki Docker Swarm (prod)
- **Reverse proxy:** Nginx / Traefik
- **HTTPS:** Let's Encrypt
- **Monitoring:** Sentry (errors), Prometheus + Grafana (metrics)
- **Analytics:** PostHog yoki Mixpanel (product analytics)

---

## 4. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │   Landing    │  │  User App     │  │   Admin Panel    │  │
│  │  (Next SSR)  │  │ (Next SPA)    │  │   (Next SPA)     │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │ HTTPS (REST + WS)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  FastAPI Backend                              │
│  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌──────────────┐   │
│  │   Auth   │ │  Test API  │ │ Payment │ │  Admin API   │   │
│  └──────────┘ └────────────┘ └─────────┘ └──────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          WebSocket (timer sync, notifications)        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
        │            │             │             │
        ▼            ▼             ▼             ▼
   ┌────────┐  ┌──────────┐  ┌────────┐  ┌─────────────┐
   │  PG    │  │  Redis   │  │  S3    │  │  Celery     │
   │  DB    │  │ (cache/  │  │(audio/ │  │  Workers    │
   │        │  │  session)│  │ images)│  │             │
   └────────┘  └──────────┘  └────────┘  └─────────────┘
                                                │
                              ┌─────────────────┴────────────┐
                              ▼                              ▼
                      ┌──────────────┐              ┌───────────────┐
                      │ Telegram Bot │              │ Payment Gate  │
                      │  (aiogram)   │              │ (Payme/Click) │
                      └──────────────┘              └───────────────┘
```

---

## 5. Database Schema

### 5.1 Users & Auth

**`users`**
```
id               UUID PK
telegram_id      BIGINT UNIQUE NOT NULL
phone            VARCHAR(20) UNIQUE NOT NULL
first_name       VARCHAR(100) NOT NULL
last_name        VARCHAR(100)
username         VARCHAR(50)
avatar_url       TEXT
is_premium       BOOLEAN DEFAULT FALSE
premium_until    TIMESTAMP NULL
show_on_leaderboard BOOLEAN DEFAULT TRUE
created_at       TIMESTAMP
updated_at       TIMESTAMP
last_active_at   TIMESTAMP
```

**`sessions`**
```
id               UUID PK
user_id          UUID FK → users.id
refresh_token    VARCHAR(255) UNIQUE (hashed)
device_info      JSONB  -- user_agent, browser, os, ip
ip_address       INET
is_active        BOOLEAN DEFAULT TRUE
created_at       TIMESTAMP
last_used_at     TIMESTAMP
expires_at       TIMESTAMP
```

**`telegram_login_codes`**
```
id               UUID PK
telegram_id      BIGINT
code             VARCHAR(6)
expires_at       TIMESTAMP
used             BOOLEAN DEFAULT FALSE
failed_attempts  INT DEFAULT 0
created_at       TIMESTAMP
```

**`admins`**
```
id               UUID PK
username         VARCHAR(50) UNIQUE
email            VARCHAR(255) UNIQUE
password_hash    VARCHAR(255)
role             ENUM('super_admin', 'admin')
is_active        BOOLEAN
created_at       TIMESTAMP
last_login_at    TIMESTAMP
```

### 5.2 Tests & Content

**`tests`**
```
id               UUID PK
title            VARCHAR(255) NOT NULL
type             ENUM('reading', 'listening') NOT NULL
access_type      ENUM('public', 'premium') NOT NULL
status           ENUM('draft', 'published', 'archived') DEFAULT 'draft'
source           ENUM('cambridge', 'real_exam', 'custom')
source_detail    VARCHAR(255)  -- "Cambridge 18 Test 2"
exam_date        DATE NULL      -- real exam bo'lsa sanasi
description      TEXT
exam_time_limit_min INT  -- reading=60, listening=30
total_questions  INT DEFAULT 40
version          INT DEFAULT 1
created_by       UUID FK → admins.id
created_at       TIMESTAMP
updated_at       TIMESTAMP
published_at     TIMESTAMP
```

**`test_sections`** — Reading: 3 sections (passages), Listening: 4 sections (parts)
```
id               UUID PK
test_id          UUID FK → tests.id (CASCADE)
section_number   INT    -- 1, 2, 3 (reading) yoki 1, 2, 3, 4 (listening)
title            VARCHAR(255)  -- optional section title
order_index      INT
created_at       TIMESTAMP
```

**`reading_passages`** — section bilan 1:1
```
id               UUID PK
section_id       UUID FK → test_sections.id (CASCADE)
title            VARCHAR(255)
intro            TEXT   -- "You should spend about 20 minutes on..."
has_paragraph_labels BOOLEAN DEFAULT FALSE
created_at       TIMESTAMP
```

**`reading_paragraphs`**
```
id               UUID PK
passage_id       UUID FK → reading_passages.id (CASCADE)
label            VARCHAR(5)  -- 'A', 'B', 'C' ... (nullable)
content          TEXT        -- HTML, `{{N}}` markers for gap-fill
order_index      INT
```

**`reading_passage_images`**
```
id               UUID PK
passage_id       UUID FK → reading_passages.id (CASCADE)
image_url        TEXT
caption          VARCHAR(255)
position_after_paragraph_id UUID NULL  -- qaysi paragraphdan keyin ko'rinadi
order_index      INT
```

**`listening_audios`** — section bilan 1:1
```
id               UUID PK
section_id       UUID FK → test_sections.id (CASCADE)
audio_url        TEXT NOT NULL
duration_ms      INT
intro            TEXT
created_at       TIMESTAMP
```

**`transcript_segments`** — audio ichidagi vaqt segmentlari
```
id               UUID PK
audio_id         UUID FK → listening_audios.id (CASCADE)
text             TEXT
start_ms         INT
end_ms           INT
speaker          VARCHAR(50)   -- optional: "Man", "Woman", "Narrator"
order_index      INT
```

### 5.3 Question System

**`question_groups`** — savol guruhi (bir xil turdagi savollar + umumiy instruction)
```
id               UUID PK
section_id       UUID FK → test_sections.id (CASCADE)
title            VARCHAR(255)   -- "Questions 1-5"
instructions     TEXT           -- "Do the following statements agree with..."
question_type    ENUM(...)      -- list below
word_limit       INT NULL       -- completion types: 1, 2, 3
word_limit_text  VARCHAR(100)   -- "NO MORE THAN TWO WORDS AND/OR A NUMBER"
shared_content   TEXT NULL      -- summary/notes/table HTML with {{N}} markers
shared_image_url TEXT NULL      -- diagram/map image
order_index      INT
```

**`question_type` ENUM (Reading va Listening hammasi):**

Reading:
- `reading_mc_single`
- `reading_mc_multiple`
- `reading_true_false_not_given`
- `reading_yes_no_not_given`
- `reading_matching_information`
- `reading_matching_headings`
- `reading_matching_features`
- `reading_matching_sentence_endings`
- `reading_sentence_completion`
- `reading_summary_completion_wordbank`
- `reading_summary_completion_freetext`
- `reading_note_completion`
- `reading_table_completion`
- `reading_flowchart_completion`
- `reading_diagram_labeling`
- `reading_short_answer`

Listening:
- `listening_mc_single`
- `listening_mc_multiple`
- `listening_matching`
- `listening_plan_map_labeling`
- `listening_form_completion`
- `listening_note_completion`
- `listening_table_completion`
- `listening_flowchart_completion`
- `listening_summary_completion`
- `listening_sentence_completion`
- `listening_short_answer`

**`question_group_options`** — Matching Features, Headings, Word Bank, MC options shared
```
id               UUID PK
group_id         UUID FK → question_groups.id (CASCADE)
label            VARCHAR(5)   -- 'A', 'B', 'i', 'ii'
text             TEXT
order_index      INT
```

**`questions`** — individual savollar (1-40)
```
id               UUID PK
group_id         UUID FK → question_groups.id (CASCADE)
question_number  INT          -- 1..40 (global unique per test)
content          TEXT         -- savol matni yoki statement
order_index      INT
```

**`question_options`** — MC savollar uchun per-question options
```
id               UUID PK
question_id      UUID FK → questions.id (CASCADE)
label            VARCHAR(5)   -- 'A', 'B', 'C', 'D'
text             TEXT
order_index      INT
```

**`answers`** — to'g'ri javoblar (bitta savol uchun bir nechta variant bo'lishi mumkin)
```
id               UUID PK
question_id      UUID FK → questions.id (CASCADE)
value            TEXT NOT NULL   -- "A" yoki "capital" yoki "7"
is_primary       BOOLEAN DEFAULT FALSE  -- display uchun asosiy variant
order_index      INT
```

**`explanations`** — savol tushuntirishi (Premium only)
```
id               UUID PK
question_id      UUID FK → questions.id (CASCADE) UNIQUE
content          TEXT         -- HTML
passage_reference VARCHAR(100) -- "Paragraph B, sentence 2" (optional)
transcript_reference_segment_id UUID NULL FK → transcript_segments.id
```

### 5.4 Attempts (test ishlash tarixi)

**`test_attempts`**
```
id               UUID PK
user_id          UUID FK → users.id
test_id          UUID FK → tests.id
test_version     INT            -- snapshot version (for consistency)
scope            ENUM('full', 'section')
section_id       UUID NULL      -- part-level bo'lsa qaysi section
mode             ENUM('practice', 'exam')
status           ENUM('in_progress', 'completed', 'abandoned', 'auto_submitted')
started_at       TIMESTAMP
completed_at     TIMESTAMP NULL
time_spent_sec   INT
raw_score        INT NULL       -- correct answers count
total_questions  INT            -- 40 (full) yoki 13-14 (section)
band_score       DECIMAL(2,1) NULL  -- 0.0 - 9.0
test_snapshot    JSONB          -- full test data at attempt time (versioning)
metadata         JSONB          -- tab_switches_count, etc.
created_at       TIMESTAMP
```

**`user_answers`**
```
id               UUID PK
attempt_id       UUID FK → test_attempts.id (CASCADE)
question_id      UUID FK → questions.id
question_number  INT
answer_value     TEXT            -- user's input (can be empty)
is_correct       BOOLEAN NULL    -- null until submitted
time_spent_sec   INT             -- per-question time (optional)
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

### 5.5 Subscriptions & Payments

**`subscription_plans`**
```
id               UUID PK
name             VARCHAR(100)   -- "Premium 30 days"
duration_days    INT            -- 30, 90, 180, 365
price           DECIMAL(10,2)
discount_percent INT DEFAULT 0
currency         VARCHAR(3) DEFAULT 'UZS'
is_active        BOOLEAN DEFAULT TRUE
display_order    INT
created_at       TIMESTAMP
```

**`payments`**
```
id               UUID PK
user_id          UUID FK → users.id
plan_id          UUID FK → subscription_plans.id
amount           DECIMAL(10,2)
discount_amount  DECIMAL(10,2)
final_amount     DECIMAL(10,2)
promo_code_id    UUID NULL FK → promo_codes.id
gift_code_id     UUID NULL FK → gift_codes.id
payment_method   ENUM('payme', 'click', 'uzum', 'manual')
payment_status   ENUM('pending', 'completed', 'failed', 'refunded')
external_payment_id VARCHAR(255)  -- Payme/Click ID
is_gift          BOOLEAN DEFAULT FALSE
gift_recipient_user_id UUID NULL FK → users.id
created_at       TIMESTAMP
completed_at     TIMESTAMP NULL
```

**`promo_codes`**
```
id               UUID PK
code             VARCHAR(50) UNIQUE
discount_percent INT
max_uses         INT NULL       -- null = unlimited
current_uses     INT DEFAULT 0
valid_from       TIMESTAMP
valid_until      TIMESTAMP NULL
applicable_plans JSONB          -- array of plan_ids yoki null (all)
is_active        BOOLEAN
created_by       UUID FK → admins.id
created_at       TIMESTAMP
```

**`gift_codes`**
```
id               UUID PK
code             VARCHAR(50) UNIQUE
plan_id          UUID FK → subscription_plans.id
purchased_by     UUID FK → users.id   -- kim sotib oldi
redeemed_by      UUID NULL FK → users.id  -- kim ishlatdi
redeemed_at      TIMESTAMP NULL
expires_at       TIMESTAMP
payment_id       UUID FK → payments.id
created_at       TIMESTAMP
```

### 5.6 Other

**`favorites`** — user testlarni "yurakcha" qiladi
```
id               UUID PK
user_id          UUID FK → users.id
test_id          UUID FK → tests.id
created_at       TIMESTAMP
UNIQUE(user_id, test_id)
```

**`user_activity`** — heatmap uchun
```
id               UUID PK
user_id          UUID FK → users.id
activity_date    DATE
attempts_count   INT DEFAULT 0
time_spent_sec   INT DEFAULT 0
UNIQUE(user_id, activity_date)
```

**`notifications`**
```
id               UUID PK
user_id          UUID FK → users.id
type             ENUM('payment_success', 'premium_expiring', 'premium_expired', 'new_test', 'gift_received')
title            VARCHAR(255)
body             TEXT
is_read          BOOLEAN DEFAULT FALSE
sent_telegram    BOOLEAN DEFAULT FALSE
created_at       TIMESTAMP
```

**`audit_log`** — admin actions
```
id               UUID PK
admin_id         UUID FK → admins.id
action           VARCHAR(100)  -- 'test.published', 'user.banned', etc.
entity_type      VARCHAR(50)
entity_id        UUID
changes          JSONB
ip_address       INET
created_at       TIMESTAMP
```

### 5.7 Indexes (muhimlari)
- `tests (type, access_type, status)`
- `test_attempts (user_id, created_at DESC)`
- `test_attempts (test_id, status)`
- `user_answers (attempt_id)`
- `user_activity (user_id, activity_date)`
- `favorites (user_id, created_at DESC)`
- `sessions (user_id, is_active)`
- `leaderboard materialized view` — refresh each hour

---

## 6. Authentication Flow (Telegram Bot)

### 6.1 Registration / Login flow

```
Step 1: User opens site → clicks "Login with Telegram"
Step 2: Site shows: "Open @PrimeScoreBot and press /login"
Step 3: User opens Telegram bot:
        - First time: /start → bot sends "Share your phone" button
        - User shares phone → bot saves telegram_id + phone + name → DB
        - User presses /login button in bot
Step 4: Bot generates 6-digit code → saves in DB (3 min expiry) → sends to user
Step 5: User copies code → enters in site
Step 6: Site: POST /api/auth/verify-code { code, telegram_id? }
Step 7: Backend validates:
        - Code exists, not expired, not used
        - Failed attempts < 3
        - If invalid: increment failed_attempts; if >= 3, block 5 min
Step 8: Backend returns:
        - access_token (JWT, 15 min)
        - refresh_token (30 kun)
        - user data
Step 9: Creates `sessions` row (device_info from user_agent + IP)
Step 10: If > 2 active sessions for user → invalidate oldest
```

### 6.2 Security rules
- 6-digit code, cryptographically random
- Code 3 minutes expiry
- Code 1-time use
- Rate limit: 1 code per 60 sec per telegram_id
- 3 failed attempts → 5 min block
- Phone number unique (1 Telegram = 1 PrimeScore account)
- Refresh token rotation (every use → new token)
- Access token: JWT with jti (stored in Redis for revocation)

### 6.3 Session management
- Max 2 active sessions per user
- New session → oldest session's refresh_token invalidated
- User can see all active sessions in profile → force logout any
- Admin can force logout user sessions

---

## 7. Test Engine (yurak)

### 7.1 Reading Test Structure
```
Test (Reading)
├── Section 1 (Passage 1)
│   ├── ReadingPassage (title, intro, paragraphs, images)
│   │   ├── Paragraph A: "..."
│   │   ├── Paragraph B: "..."
│   │   └── ...
│   └── QuestionGroups (e.g., 3 groups)
│       ├── Group: "Questions 1-5" (T/F/NG)
│       ├── Group: "Questions 6-9" (Matching Headings)
│       └── Group: "Questions 10-13" (Sentence Completion)
├── Section 2 (Passage 2) ... Questions 14-26
└── Section 3 (Passage 3) ... Questions 27-40
```

### 7.2 Listening Test Structure
```
Test (Listening)
├── Section 1 (Part 1) — Questions 1-10
│   ├── Audio (with TranscriptSegments)
│   └── QuestionGroups
├── Section 2 (Part 2) — Questions 11-20
├── Section 3 (Part 3) — Questions 21-30
└── Section 4 (Part 4) — Questions 31-40
```

### 7.3 Question Types — to'liq specs

#### Reading Question Types

**1. Multiple Choice — Single Answer (`reading_mc_single`)**
- Question: text
- Per-question options (A/B/C/D)
- Answer: single option label
- UI: Radio buttons
- Check: `user_answer == correct_option_label`

**2. Multiple Choice — Multiple Answers (`reading_mc_multiple`)**
- Question: text ("Choose TWO letters")
- Per-question options (5-7 options)
- Answer: set of option labels
- UI: Checkboxes with max-select warning
- Check: each correct selection = 1 mark (IELTS rule — NOT all-or-nothing)

**3. True / False / Not Given (`reading_true_false_not_given`)**
- Question: statement
- Fixed options: `TRUE`, `FALSE`, `NOT GIVEN`
- Answer: one of the 3
- UI: Radio / dropdown
- Check: exact match

**4. Yes / No / Not Given (`reading_yes_no_not_given`)**
- Same as T/F/NG, but labels: `YES`, `NO`, `NOT GIVEN`
- Different from T/F/NG — UI must clearly differentiate

**5. Matching Information (`reading_matching_information`)**
- Question: statement
- Options: paragraph labels (A, B, C...) from passage
- Answer: paragraph label
- UI: Dropdown
- Paragraphs CAN be reused
- Check: exact match

**6. Matching Headings (`reading_matching_headings`)**
- Group has shared `question_group_options` (headings i-x)
- Each question references a paragraph
- Answer: heading Roman numeral
- UI: Dropdown per paragraph (labels in Roman: i, ii, iii...)
- Each heading used ONCE only (enforce in UI warning)

**7. Matching Features (`reading_matching_features`)**
- Group has shared options (e.g., names of scientists)
- Questions are statements
- Answer: option label
- Options CAN be reused
- UI: Dropdown

**8. Matching Sentence Endings (`reading_matching_sentence_endings`)**
- Group has shared endings (more than beginnings)
- Questions are sentence beginnings
- Answer: ending label
- UI: Dropdown or drag-drop
- Each ending used ONCE only

**9. Sentence Completion (`reading_sentence_completion`)**
- Question has gap(s) — marker `{{N}}`
- Answer: text (from passage)
- UI: Text input inline in the sentence
- Word limit enforced (e.g., NO MORE THAN TWO WORDS)
- Check: normalized match against `answers` list

**10. Summary Completion with Word Bank (`reading_summary_completion_wordbank`)**
- Group has `shared_content` (summary text with `{{N}}` markers)
- Group has `question_group_options` (word bank)
- Questions don't have individual content (part of shared_content)
- Answer: option label
- UI: Dropdown at each gap + word bank displayed

**11. Summary Completion without Word Bank (`reading_summary_completion_freetext`)**
- Group has `shared_content` with `{{N}}` markers
- Answer: text from passage
- UI: Text input at each gap
- Word limit enforced

**12. Note/Table/Flowchart Completion (`reading_note_completion`, `reading_table_completion`, `reading_flowchart_completion`)**
- Group's `shared_content` is a structured HTML (notes / table / flowchart)
- Gaps = `{{N}}` markers within structure
- Answer: text from passage
- UI: Render structure as-is, replace `{{N}}` with `<input>`
- Word limit enforced

**13. Diagram Labeling (`reading_diagram_labeling`)**
- Group has `shared_image_url` + `shared_content` (labels description)
- Numbered positions on image (with `{{N}}` tags or separate coordinates)
- Answer: text or word bank option
- UI: Image + inputs at positions

**14. Short Answer Questions (`reading_short_answer`)**
- Question: direct question
- Answer: text (from passage)
- UI: Text input
- Word limit enforced

#### Listening Question Types

**1. MC Single Answer (`listening_mc_single`)** — same as reading
**2. MC Multiple Answers (`listening_mc_multiple`)** — same as reading
**3. Matching (`listening_matching`)** — shared options, dropdowns, may reuse
**4. Plan/Map/Diagram Labeling (`listening_plan_map_labeling`)** — image + word bank
**5. Form Completion (`listening_form_completion`)** — form with gaps
**6. Note Completion (`listening_note_completion`)** — notes with gaps
**7. Table Completion (`listening_table_completion`)** — table with gaps
**8. Flowchart Completion (`listening_flowchart_completion`)** — flowchart with gaps
**9. Summary Completion (`listening_summary_completion`)** — summary with gaps
**10. Sentence Completion (`listening_sentence_completion`)** — sentences with gaps
**11. Short Answer (`listening_short_answer`)** — direct questions

**Listening rules:**
- Audio plays once in exam mode (no rewind in exam, but seek allowed in practice)
- Questions shown during audio playback (IELTS standard)
- Transcript hidden during attempt, available in review
- In review: clicking transcript segment → audio seeks to that time

### 7.4 Answer Normalization Rules

**Text inputs (completion, short answer):**
```python
def normalize(text: str) -> str:
    # Lowercase
    # Strip whitespace
    # Replace multiple spaces with single
    # Remove trailing punctuation
    return text.strip().lower()
```

**Qabul qilinadigan qoidalar:**
- Case-insensitive (YES)
- Trim whitespace (YES)
- Multiple spaces → single (YES)
- Trailing period/comma ignore (YES)
- **Article (a/an/the):** admin qo'lda variant sifatida qo'shishi kerak (strict IELTS)
- **Plural/singular:** admin qo'lda variant sifatida qo'shishi kerak
- **British/American spelling:** admin qo'lda ikkala variant
- **Hyphen vs space:** admin qo'lda variant
- **Numbers:** admin qo'lda raqam va yozuv ikkalasi ("7" va "seven")
- **Typo tolerance:** YO'Q — real IELTS ham tolerate qilmaydi

**Word limit check:**
```python
def check_word_limit(text: str, limit: int) -> bool:
    # Hyphenated words count as 1 (per IELTS)
    # Numbers count as 1 word
    words = text.strip().split()
    return len(words) <= limit
```

**Selection types (MC, T/F/NG, Matching):**
- Exact match of option label
- No normalization needed

### 7.5 Gap-Fill Marker System

**Standard marker:** `{{N}}` where N = question_number

**Example passage content:**
```
Paris is the capital of {{12}} and has a population of {{13}} million.
```

**Rendering on frontend:**
```jsx
function renderContent(text, questionNumber) {
  return text.replace(/\{\{(\d+)\}\}/g, (_, num) =>
    `<input data-q="${num}" ... />`
  );
}
```

**Admin editor:**
- Toolbar button: "Insert blank" → inserts `{{N}}` at cursor, auto-increments N
- Visual highlight of `{{N}}` in editor preview

### 7.6 Scoring & Band Conversion

**Raw score calculation:**
- Each question = 1 mark (except MC multiple where each correct selection = 1 mark)
- Full test: max 40 marks
- Part-level test: max = question count in that section

**Band score tables (admin-configurable):**

Reading (Academic):
```
39-40 → 9.0    23-26 → 6.0    10-12 → 4.0
37-38 → 8.5    19-22 → 5.5    8-9   → 3.5
35-36 → 8.0    15-18 → 5.0    6-7   → 3.0
33-34 → 7.5    13-14 → 4.5    4-5   → 2.5
30-32 → 7.0                    3     → 2.0
27-29 → 6.5                    2     → 1.0
```

Listening:
```
39-40 → 9.0    26-29 → 6.5    11-12 → 4.0
37-38 → 8.5    23-25 → 6.0    8-10  → 3.5
35-36 → 8.0    18-22 → 5.5    6-7   → 3.0
32-34 → 7.5    16-17 → 5.0    4-5   → 2.5
30-31 → 7.0    13-15 → 4.5    3     → 2.0
```

**For part-level tests:**
- Show raw score (e.g., "11/13 correct")
- Don't show band score (band requires full test)
- Optionally show estimated band (with disclaimer)

**Scoring engine:**
- Celery task triggered on `attempt.submit()`
- Normalizes each answer
- Compares against `answers` list (any match = correct)
- Updates `user_answer.is_correct`
- Updates `attempt.raw_score`, `attempt.band_score`
- Sends Telegram notification if enabled

---

## 8. Test Taking Flow & UI

### 8.1 Test catalog (`/tests`)

```
┌─────────────────────────────────────────────────────────┐
│ Filters: [Reading ▼] [All sources ▼] [Free + Premium]   │
│         [Search: ______________]  ♡ Favorites only      │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ Test 1   │ │ Test 2🔒 │ │ Test 3   │ │ Test 4   │   │
│ │ Reading  │ │ Reading  │ │ Listening│ │ Reading  │   │
│ │ CAM 18 T1│ │ Real Exam│ │ CAM 17 T2│ │ Custom   │   │
│ │ ♡ 2 users│ │ ♡ Premium│ │ ♡ Free   │ │ ♡ Free   │   │
│ │ [Start]  │ │ [Upgrade]│ │ [Start]  │ │ [Start]  │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Test start modal

User `[Start]` bosganda:
```
┌─────────────────────────────────────────────┐
│ Cambridge 18 — Test 1 Reading               │
│                                             │
│ Choose what to take:                        │
│  ○ Full Test (40 questions, ~60 min)        │
│  ○ Passage 1 only (13 questions)            │
│  ○ Passage 2 only (13 questions)            │
│  ○ Passage 3 only (14 questions)            │
│                                             │
│ Mode (full test only):                      │
│  ○ Practice (no timer, pause anytime)       │
│  ○ Exam Condition (60 min strict)           │
│                                             │
│ Part-level tests = always Practice          │
│                                             │
│              [Cancel]  [Start]              │
└─────────────────────────────────────────────┘
```

### 8.3 Reading Test UI (desktop)

```
┌───────────────────────────────────────────────────────────────┐
│ ⏱ 58:42  |  Section 1/3  |  Q 5/40  |  [Pause] [Submit Test] │
├──────────────────────────┬────────────────────────────────────┤
│                          │                                    │
│   [Passage 1]            │  Questions 1-5                     │
│                          │                                    │
│  Paragraph A             │  Do the following statements       │
│  ─────────────           │  agree with the info in Passage 1? │
│  Lorem ipsum dolor sit   │                                    │
│  amet, consectetur...    │  1. Statement one                  │
│                          │     ○ True  ○ False  ○ Not Given  │
│  Paragraph B             │                                    │
│  ─────────────           │  2. Statement two                  │
│  Duis aute irure...      │     ○ True  ○ False  ○ Not Given  │
│                          │                                    │
│  Paragraph C             │  [...]                             │
│                          │                                    │
│                          │  Questions 6-9                     │
│                          │  ─────────────                     │
│                          │  Matching Headings...              │
│                          │                                    │
├──────────────────────────┴────────────────────────────────────┤
│  [‹ Prev Passage]   [1][2][3][4][5]...[40]   [Next Passage ›] │
└───────────────────────────────────────────────────────────────┘
```

**Question nav panel:**
- Number buttons 1-40
- Visual states: answered (filled), unanswered (outline), current (highlighted), flagged (bookmark icon)
- Flag for review button on each question

### 8.4 Reading Test UI (mobile)

```
┌────────────────────────────┐
│ ⏱ 58:42  |  Q 5/40  | ☰   │
├────────────────────────────┤
│ [Passage] [Questions] ← tab│
├────────────────────────────┤
│                            │
│   (content switches)       │
│                            │
├────────────────────────────┤
│  [‹]  Q 5/40  [›]  [⚑]    │
└────────────────────────────┘
```

- Tab toggle between Passage and Questions
- Sticky bottom nav
- Swipe between questions

### 8.5 Listening Test UI

```
┌───────────────────────────────────────────────────────────────┐
│ ⏱ 28:42  |  Part 1/4  |  Q 5/40              [Submit Test]   │
├───────────────────────────────────────────────────────────────┤
│  ▶ ━━━━━●──────────────────  2:15 / 5:30   🔊 [━━━●──]       │
│  Part 1 Audio (no seek in exam mode)                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Questions 1-5 (Form Completion)                              │
│  ─────────────────────────────                                │
│  Complete the form below. Write NO MORE THAN TWO WORDS...    │
│                                                               │
│    Name:      [_______________] (1)                           │
│    Address:   [_______________] (2)                           │
│    Phone:     [_______________] (3)                           │
│    ...                                                         │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  [‹ Prev Part]  [1][2][3][4][5]...[40]  [Next Part ›]         │
└───────────────────────────────────────────────────────────────┘
```

**Mobile:** Audio player sticky at top, questions scroll below.

### 8.6 Exam Condition — extra rules
- Warning dialog: "This will start exam with strict 60-min timer. No pause. Continue?"
- Full-screen recommended (not forced)
- Tab switch detection → logged in `attempt.metadata.tab_switches`
- At 10 min remaining: warning
- At 0: auto-submit
- Network disconnect: local storage backup, restore on reconnect

### 8.7 Auto-save
- User answers saved to backend every 10 seconds (batched)
- Also saved on question change
- Also saved to localStorage for network failure recovery

---

## 9. Review & Results

### 9.1 Results page (immediately after submit)

```
┌─────────────────────────────────────────────────────┐
│         🎉 Test Submitted!                          │
│                                                     │
│    Cambridge 18 Test 1 — Reading (Full)             │
│    Mode: Exam Condition                             │
│    Time: 56:34 / 60:00                              │
│                                                     │
│         ┌─────────────────┐                         │
│         │   Band: 7.5     │                         │
│         │   32/40 correct │                         │
│         └─────────────────┘                         │
│                                                     │
│    Passage 1: 12/13  ████████████░ 92%              │
│    Passage 2: 11/13  █████████░░░░ 85%              │
│    Passage 3:  9/14  ██████░░░░░░░ 64%              │
│                                                     │
│    By question type:                                │
│    • T/F/NG:         8/10                           │
│    • Matching Head.: 4/6                            │
│    • Sentence Comp.: 7/8                            │
│    • ...                                            │
│                                                     │
│    [Review Answers]  [Back to Dashboard]            │
└─────────────────────────────────────────────────────┘
```

### 9.2 Review mode

Same UI as test, but with:
- ✓ / ✗ marks next to each question
- User's answer shown
- "Show correct answer" button → reveals correct answer
- For Premium: "Explanation" button → shows admin's explanation + paragraph reference
- For Listening: click any transcript segment → audio seeks there
- No timer, no restrictions

### 9.3 Mistake tracking (dashboard widget)
- Most common question types missed
- Most common passages missed
- "Practice these question types" quick-start

---

## 10. User Dashboard

### 10.1 Main dashboard

```
┌───────────────────────────────────────────────────────────────┐
│ Welcome back, Azizbek! 👋                    [Premium ✓]      │
├───────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ Tests    │ │ Avg Band │ │ Best     │ │ Total    │         │
│ │  23      │ │  6.5     │ │ Band     │ │ Time     │         │
│ │  taken   │ │ (last 10)│ │  7.5     │ │ 14h 32m  │         │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   Band Score Progress (line chart)                            │
│   ┌─────────────────────────────────────────────┐            │
│   │         Reading ━━━   Listening ━━━          │            │
│   │                                      /\      │            │
│   │                              /\____/   \    │            │
│   │                    _____/   /                │            │
│   │    ___/\____/                                │            │
│   └─────────────────────────────────────────────┘            │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│   Activity Heatmap (last 365 days — GitHub style)            │
│   Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec             │
│   ░░░░ ░░░▓ ▓▓░░ ░░▓▓ ▓▓▓▓ ▓▓░░ ░░░░ ▓▓▓░ ...              │
├───────────────────────────────────────────────────────────────┤
│  Skill Breakdown (radar chart)     │  Recent Attempts         │
│  ┌─────────┐                       │  ─────────────           │
│  │  T/F/NG │                       │  CAM18 T1 Reading  7.5   │
│  │   /\    │                       │  CAM17 T3 Listen.  6.5   │
│  │  /  \   │                       │  Real Exam Reading 7.0   │
│  │ /    \  │                       │  ...                     │
│  │/______\ │                       │                          │
│  └─────────┘                       │  [View all]              │
├───────────────────────────────────────────────────────────────┤
│   Leaderboard Position: #42 (top 5%)       [View Full]        │
└───────────────────────────────────────────────────────────────┘
```

### 10.2 Test history page
- Filterable by type (Reading/Listening), mode, date range
- Columns: Test name, Source, Mode, Date, Score, Band, Time, Actions
- Click → go to review page
- Export to CSV (optional)

### 10.3 Favorites (♡)
- All favorited tests
- Quick start buttons

### 10.4 Profile page
- Edit first/last name, username
- Change avatar
- Privacy: show on leaderboard toggle
- Active sessions list with force-logout
- Premium status + expiry date
- Notification preferences (Telegram on/off per type)

---

## 11. Leaderboard

### 11.1 Global leaderboard

```
Tabs: [All-time] [This Month] [This Week]
Filter: [Reading] [Listening] [Combined Avg]

#1  Ali T.           Band 8.5    45 tests
#2  Maria K.         Band 8.0    38 tests
#3  John D.          Band 8.0    52 tests
...
#42 You (Azizbek)    Band 6.5    23 tests
```

**Scoring logic for leaderboard:**
- Best 10 attempts average (prevents gaming with 1 lucky test)
- Minimum 5 attempts to qualify
- Separate tables for Reading, Listening
- Privacy toggle: users who opted-out are hidden

**Implementation:**
- Materialized view refreshed hourly (Celery Beat)
- Top 100 cached in Redis

---

## 12. Admin Panel — TO'LIQ CHUQUR

Bu eng muhim qism. User testlarini yaratish flow ini batafsil ko'rib chiqamiz.

### 12.1 Admin main dashboard

```
┌───────────────────────────────────────────────────────────────┐
│ Super Admin Dashboard                           [Logout]      │
├───────────────────────────────────────────────────────────────┤
│  KPIs (this month)                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ Users   │ │Premium  │ │Revenue  │ │ Tests   │             │
│  │ 1,234   │ │  +142   │ │$2,450   │ │ 47      │             │
│  │ +15 new │ │ active  │ │         │ │ active  │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                               │
│  Charts: DAU/WAU/MAU, Conversion rate, Revenue               │
│  Recent activity log                                          │
├───────────────────────────────────────────────────────────────┤
│ Sidebar:                                                      │
│  • Dashboard                                                  │
│  • Tests  ← main focus                                        │
│  • Users                                                      │
│  • Subscriptions (plans)                                      │
│  • Promo Codes                                                │
│  • Payments                                                   │
│  • Analytics                                                  │
│  • Notifications                                              │
│  • Admins (super admin only)                                  │
│  • Settings                                                   │
│  • Audit Log                                                  │
└───────────────────────────────────────────────────────────────┘
```

### 12.2 Tests List page

```
┌───────────────────────────────────────────────────────────────┐
│ Tests                      [+ New Test] [Import] [Bulk]       │
├───────────────────────────────────────────────────────────────┤
│ Filters: [Reading ▼] [All ▼] [Draft/Published/Archived ▼]     │
│ Search: [__________]                                          │
├───────────────────────────────────────────────────────────────┤
│ Title          │ Type    │ Source      │ Access  │ Status│ A  │
│────────────────┼─────────┼─────────────┼─────────┼───────┼───│
│ CAM 18 Test 1  │ Reading │ Cambridge   │ Public  │ Pub   │ ⋯ │
│ CAM 17 Test 2  │ Listen. │ Cambridge   │ Premium │ Pub   │ ⋯ │
│ Real Mar 2024  │ Reading │ Real Exam   │ Premium │ Draft │ ⋯ │
│ ...                                                           │
├───────────────────────────────────────────────────────────────┤
│ Actions: [Edit] [Preview] [Publish] [Duplicate] [Archive]     │
└───────────────────────────────────────────────────────────────┘
```

### 12.3 Create/Edit Test — TO'LIQ FLOW

**Asosiy prinsip:** Split-screen — chap tomonda edit formasi, o'ng tomonda live preview. User bilan bir xil UI da preview (pixel-perfect).

#### Step 1: Test metadata (wizard step 1)

```
┌───────────────────────────────────────────────────────────────┐
│ New Test — Step 1 of 4: Basic Info                            │
├───────────────────────────────────────────────────────────────┤
│ Title *                                                       │
│ [Cambridge 18 Test 1 — Reading                     ]          │
│                                                               │
│ Type *                                                        │
│ ○ Reading   ● Listening                                       │
│                                                               │
│ Source *                                                      │
│ ○ Cambridge  ○ Real Exam  ○ Custom                            │
│                                                               │
│ Source Detail                                                 │
│ [Cambridge 18, Test 1                              ]          │
│                                                               │
│ Real Exam Date (optional)                                     │
│ [___________]                                                 │
│                                                               │
│ Access *                                                      │
│ ○ Public (free)   ● Premium                                   │
│                                                               │
│ Exam Time Limit (min)                                         │
│ [60] (reading default 60, listening default 30)               │
│                                                               │
│ Description (optional)                                        │
│ [___________________________________________]                 │
│                                                               │
│                    [Cancel]  [Save Draft]  [Next →]           │
└───────────────────────────────────────────────────────────────┘
```

#### Step 2: Sections/Passages content

**Reading test → 3 passages setup:**

```
┌───────────────────────────────────────────────────────────────┐
│ Step 2 of 4: Passages                                         │
├──────────────────────────┬────────────────────────────────────┤
│ Passage 1 ━━━━━━━━━━━━━━ │  [Live Preview]                    │
│ Passage 2                │                                    │
│ Passage 3                │  (shows exactly what user sees)    │
├──────────────────────────┤                                    │
│                          │                                    │
│ Title                    │                                    │
│ [The History of Flight]  │                                    │
│                          │                                    │
│ Intro                    │                                    │
│ [You should spend about  │                                    │
│  20 min on Questions...] │                                    │
│                          │                                    │
│ ☐ Use paragraph labels   │                                    │
│   (A, B, C...)           │                                    │
│                          │                                    │
│ Paragraphs               │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ [A] (label)          │ │                                    │
│ │ [Rich text editor]   │ │                                    │
│ │ Lorem ipsum...       │ │                                    │
│ │ [+ Image] [+ Blank]  │ │                                    │
│ │ [↑] [↓] [Delete]     │ │                                    │
│ └──────────────────────┘ │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ [B] (label)          │ │                                    │
│ │ ...                  │ │                                    │
│ └──────────────────────┘ │                                    │
│                          │                                    │
│ [+ Add Paragraph]        │                                    │
│                          │                                    │
├──────────────────────────┴────────────────────────────────────┤
│          [← Back]  [Save Draft]  [Next → Questions]           │
└───────────────────────────────────────────────────────────────┘
```

**Paragraph Rich Text Editor features:**
- Bold, italic, underline
- **"Insert Blank" button** → inserts `{{N}}` at cursor (N auto-increments)
  - Visual: `{{12}}` shown as a styled badge in editor
- **"Insert Image" button** → drag-drop or file picker → uploads to S3 → inserts `<img>` with caption
- Paragraph reordering (drag handle)
- Delete paragraph
- Label toggle (A, B, C, ... auto-assigned)

**Listening test → 4 parts setup:**

```
┌───────────────────────────────────────────────────────────────┐
│ Step 2 of 4: Parts                                            │
├──────────────────────────┬────────────────────────────────────┤
│ Part 1 ━━━━━━━━━━━━━━━   │  [Live Preview]                    │
│ Part 2                   │                                    │
│ Part 3                   │                                    │
│ Part 4                   │                                    │
├──────────────────────────┤                                    │
│                          │                                    │
│ Intro                    │                                    │
│ [You will hear a         │                                    │
│  conversation between...]│                                    │
│                          │                                    │
│ Audio File *             │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ 📁 Drop audio here   │ │                                    │
│ │    or click to upload│ │                                    │
│ │  (MP3/WAV, max 30MB) │ │                                    │
│ └──────────────────────┘ │                                    │
│ ✓ part1.mp3 (5:42)       │                                    │
│ [▶ Play] [Replace]       │                                    │
│                          │                                    │
│ Transcript + Segments    │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ [Segment editor]     │ │                                    │
│ │ ▶ 0:00-0:15 "Hello   │ │                                    │
│ │   this is John..."   │ │                                    │
│ │ ▶ 0:15-0:30 "Nice to │ │                                    │
│ │   meet you..."       │ │                                    │
│ │                      │ │                                    │
│ │ [+ Add Segment]      │ │                                    │
│ │ [Auto-segment] (ML)  │ │                                    │
│ └──────────────────────┘ │                                    │
│                          │                                    │
├──────────────────────────┴────────────────────────────────────┤
│          [← Back]  [Save Draft]  [Next → Questions]           │
└───────────────────────────────────────────────────────────────┘
```

**Transcript Segment Editor:**
- Admin plays audio
- Clicks at a point → "Start segment here"
- Clicks later → "End segment here"
- Types text for that segment
- Or: paste full transcript → auto-split by timestamp ranges
- Each segment: start_ms, end_ms, text, speaker (optional)

#### Step 3: Questions (per section)

Bu eng murakkab qism. Admin har bir section uchun **question groups** yaratadi, har group o'z typi bilan.

```
┌───────────────────────────────────────────────────────────────┐
│ Step 3 of 4: Questions — Passage 1 (Qs 1-13)                  │
├──────────────────────────┬────────────────────────────────────┤
│ Section: [Passage 1 ▼]   │  [Live Preview]                    │
├──────────────────────────┤                                    │
│                          │  [User view of questions rendered] │
│ Question Groups          │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ Group 1: Qs 1-5      │ │                                    │
│ │ Type: T/F/NG         │ │                                    │
│ │ [Edit] [Delete]      │ │                                    │
│ └──────────────────────┘ │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ Group 2: Qs 6-8      │ │                                    │
│ │ Type: Matching Head. │ │                                    │
│ │ [Edit] [Delete]      │ │                                    │
│ └──────────────────────┘ │                                    │
│                          │                                    │
│ [+ Add Question Group]   │                                    │
│                          │                                    │
│ Assigned: 8/13 questions │                                    │
│ Missing: Qs 9-13         │                                    │
│                          │                                    │
├──────────────────────────┴────────────────────────────────────┤
│          [← Back]  [Save Draft]  [Next → Review]              │
└───────────────────────────────────────────────────────────────┘
```

#### Step 3.a: Add Question Group — Type Picker

Admin `[+ Add Question Group]` bosganda:

```
┌───────────────────────────────────────────────────────────────┐
│ Choose Question Type                                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Selection types:                                             │
│  ○ Multiple Choice (single)                                   │
│  ○ Multiple Choice (multiple)                                 │
│  ○ True / False / Not Given                                   │
│  ○ Yes / No / Not Given                                       │
│                                                               │
│  Matching types:                                              │
│  ○ Matching Information (to paragraphs)                       │
│  ○ Matching Headings                                          │
│  ○ Matching Features                                          │
│  ○ Matching Sentence Endings                                  │
│                                                               │
│  Completion types:                                            │
│  ○ Sentence Completion                                        │
│  ○ Summary Completion (with word bank)                        │
│  ○ Summary Completion (free text)                             │
│  ○ Note Completion                                            │
│  ○ Table Completion                                           │
│  ○ Flow-chart Completion                                      │
│  ○ Diagram/Map Labeling                                       │
│                                                               │
│  Other:                                                       │
│  ○ Short Answer                                               │
│                                                               │
│                        [Cancel] [Continue →]                  │
└───────────────────────────────────────────────────────────────┘
```

#### Step 3.b: Question Group Builder — har tur uchun

Bu polymorphic form — tanlangan typega qarab o'zgaradi.

**Example: T/F/NG Group Builder**

```
┌───────────────────────────────────────────────────────────────┐
│ Question Group — True / False / Not Given                     │
├──────────────────────────┬────────────────────────────────────┤
│ Group Title              │  [Live Preview]                    │
│ [Questions 1-5]          │                                    │
│                          │  Questions 1-5                     │
│ Instructions             │  ─────────────                     │
│ [Do the following        │  Do the following statements       │
│  statements agree with...│  agree with the info in Passage 1? │
│                          │                                    │
│ Starting question #      │  1. Statements should...           │
│ [1]                      │     ○ True  ○ False  ○ Not Given   │
│                          │                                    │
│ Statements (questions)   │  2. The writer claims...           │
│ ┌──────────────────────┐ │     ○ True  ○ False  ○ Not Given   │
│ │ Q1                   │ │                                    │
│ │ [Statement text...]  │ │                                    │
│ │ Correct: ● T ○F ○NG  │ │                                    │
│ │ [Explanation +]      │ │                                    │
│ └──────────────────────┘ │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ Q2                   │ │                                    │
│ │ ...                  │ │                                    │
│ └──────────────────────┘ │                                    │
│ [+ Add Statement]        │                                    │
│                          │                                    │
├──────────────────────────┴────────────────────────────────────┤
│                    [Cancel]  [Save Group]                     │
└───────────────────────────────────────────────────────────────┘
```

**Example: Matching Headings Builder**

```
┌───────────────────────────────────────────────────────────────┐
│ Question Group — Matching Headings                            │
├──────────────────────────┬────────────────────────────────────┤
│ Group Title              │  [Live Preview]                    │
│ [Questions 6-9]          │                                    │
│                          │  Questions 6-9                     │
│ Instructions             │  ─────────────                     │
│ [The reading passage has │  Headings:                         │
│  7 paragraphs, A-G...]   │  i.   The rise of aviation         │
│                          │  ii.  Problems with early flight   │
│ Headings (shared list)   │  iii. Modern airplane design       │
│ ┌──────────────────────┐ │  iv.  ...                          │
│ │ i. [Heading 1]     ✕ │ │                                    │
│ │ ii.[Heading 2]     ✕ │ │  6. Paragraph A                    │
│ │ iii[Heading 3]     ✕ │ │     [Select heading ▼]             │
│ └──────────────────────┘ │                                    │
│ [+ Add Heading]          │  7. Paragraph B                    │
│                          │     [Select heading ▼]             │
│ Paragraph mappings       │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ Q6 — Paragraph A     │ │                                    │
│ │ Correct: [iii ▼]     │ │                                    │
│ │ [Explanation +]      │ │                                    │
│ └──────────────────────┘ │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ Q7 — Paragraph B     │ │                                    │
│ │ Correct: [i ▼]       │ │                                    │
│ └──────────────────────┘ │                                    │
│                          │                                    │
├──────────────────────────┴────────────────────────────────────┤
│                    [Cancel]  [Save Group]                     │
└───────────────────────────────────────────────────────────────┘
```

**Example: Sentence Completion Builder**

```
┌───────────────────────────────────────────────────────────────┐
│ Question Group — Sentence Completion                          │
├──────────────────────────┬────────────────────────────────────┤
│ Group Title              │  [Live Preview]                    │
│ [Questions 10-13]        │                                    │
│                          │  Questions 10-13                   │
│ Instructions             │  Complete the sentences below.     │
│ [Complete sentences...]  │  Write NO MORE THAN TWO WORDS      │
│                          │  from the passage.                 │
│ Word Limit               │                                    │
│ [2 ▼] words              │  10. The first flight was in       │
│ + [and/or a number ☐]    │      the year [_________]          │
│                          │                                    │
│ Starting Q #             │  11. Wright brothers worked with   │
│ [10]                     │      [_________] material          │
│                          │                                    │
│ Questions (sentences)    │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ Q10                  │ │                                    │
│ │ Sentence with blank: │ │                                    │
│ │ [The first flight    │ │                                    │
│ │  was in the year {{10}}] │                                │
│ │ [Insert blank]       │ │                                    │
│ │                      │ │                                    │
│ │ Accepted answers:    │ │                                    │
│ │  • 1903              │ │                                    │
│ │  • nineteen-o-three  │ │                                    │
│ │  [+ Add variant]     │ │                                    │
│ │                      │ │                                    │
│ │ [Explanation +]      │ │                                    │
│ └──────────────────────┘ │                                    │
│ [+ Add Sentence]         │                                    │
├──────────────────────────┴────────────────────────────────────┤
│                    [Cancel]  [Save Group]                     │
└───────────────────────────────────────────────────────────────┘
```

**Example: Summary Completion (free text) Builder**

```
┌───────────────────────────────────────────────────────────────┐
│ Question Group — Summary Completion                           │
├──────────────────────────┬────────────────────────────────────┤
│ Group Title [Qs 10-14]   │  [Live Preview]                    │
│ Word Limit [2] words     │                                    │
│ Starting Q # [10]        │                                    │
│                          │  Complete the summary below.       │
│ Summary Text             │  Write NO MORE THAN TWO WORDS      │
│ (with {{N}} markers)     │                                    │
│ ┌──────────────────────┐ │  The Wright brothers started       │
│ │ [Rich editor]        │ │  their work in {{10}} with early   │
│ │ The Wright brothers  │ │  experiments. They studied the     │
│ │ started their work   │ │  flight patterns of {{11}} to      │
│ │ in {{10}} with early │ │  understand aerodynamics...        │
│ │ experiments...       │ │                                    │
│ │ [Insert blank]       │ │                                    │
│ └──────────────────────┘ │                                    │
│                          │                                    │
│ Auto-detected blanks: 5  │                                    │
│ Questions: 10, 11, 12,   │                                    │
│           13, 14         │                                    │
│                          │                                    │
│ Answers per blank        │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ Q10: [1900]          │ │                                    │
│ │    Variants: 1900,   │ │                                    │
│ │    nineteen-hundred  │ │                                    │
│ │ [+ variant]          │ │                                    │
│ └──────────────────────┘ │                                    │
│ ┌──────────────────────┐ │                                    │
│ │ Q11: [birds]         │ │                                    │
│ │    Variants: birds   │ │                                    │
│ │ [+ variant]          │ │                                    │
│ └──────────────────────┘ │                                    │
│                          │                                    │
├──────────────────────────┴────────────────────────────────────┤
│                    [Cancel]  [Save Group]                     │
└───────────────────────────────────────────────────────────────┘
```

**Example: Diagram/Map Labeling**

```
┌───────────────────────────────────────────────────────────────┐
│ Question Group — Map Labeling                                 │
├──────────────────────────┬────────────────────────────────────┤
│ Instructions             │  [Live Preview]                    │
│ [Label the map below...] │                                    │
│                          │  Label the map. Choose from A-F    │
│ Image Upload *           │                                    │
│ [📁 Map image]           │  [Image of a park with numbered    │
│ ✓ park-map.png           │   pins at various locations]       │
│                          │                                    │
│ Word Bank (options)      │  Word bank:                        │
│ A. Cafe                  │   A. Cafe                          │
│ B. Playground            │   B. Playground                    │
│ C. Parking               │   C. Parking                       │
│ D. Restroom              │   D. Restroom                      │
│ E. Pond                  │   E. Pond                          │
│ F. Monument              │   F. Monument                      │
│ [+ Option]               │                                    │
│                          │  Questions:                        │
│ Question positions       │   1. [Select ▼]                    │
│ Q1: Position (x=120,y=80)│   2. [Select ▼]                    │
│     Correct: [B ▼]       │   3. [Select ▼]                    │
│ Q2: Position (x=200,y=150│                                    │
│     Correct: [D ▼]       │                                    │
│ [+ Add Position]         │                                    │
│                          │                                    │
│ (Click image to add pin) │                                    │
├──────────────────────────┴────────────────────────────────────┤
│                    [Cancel]  [Save Group]                     │
└───────────────────────────────────────────────────────────────┘
```

#### Step 3.c: Answer variants per question

Har bir completion/short-answer savol uchun, admin **bir nechta qabul qilinadigan variant** kiritadi:

```
Q: The first flight was in the year {{10}}
Accepted answers:
  ✓ 1903 (primary)
  ✓ nineteen-hundred-and-three
  ✓ 1,903
  [+ Add variant]
```

Backend checking:
```python
def check_answer(user_input: str, accepted: list[str]) -> bool:
    normalized_input = normalize(user_input)
    return any(normalize(a) == normalized_input for a in accepted)
```

#### Step 3.d: Explanations

Har savol uchun optional explanation (Premium only display):

```
Explanation:
[Rich text editor]
The correct answer is "1903" because paragraph B states
"Their first successful flight occurred in December 1903..."

Passage reference: [Paragraph B ▼] sentence [2]

For listening: transcript segment: [Segment 3 (0:45-1:02) ▼]
```

#### Step 4: Review & Publish

```
┌───────────────────────────────────────────────────────────────┐
│ Step 4 of 4: Review & Publish                                 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ✅ Test Info complete                                        │
│  ✅ 3 Passages added (all have content)                       │
│  ✅ 40 questions assigned (all 1-40 numbered)                 │
│  ✅ All questions have correct answers                        │
│  ⚠  12 questions missing explanations (optional)              │
│  ✅ Preview passed                                            │
│                                                               │
│  Test Summary:                                                │
│   - Cambridge 18 Test 1                                       │
│   - Type: Reading                                             │
│   - Source: Cambridge (Cam 18 T1)                             │
│   - Access: Public                                            │
│   - 3 passages, 40 questions                                  │
│   - Question types: T/F/NG (5), Matching (4), Sentence        │
│     Completion (4), MC Single (10)...                         │
│                                                               │
│  [🔍 Full Preview as User]                                    │
│                                                               │
│  Status after publish: Published (users can see it)           │
│                                                               │
│              [Save as Draft]  [Publish Now]                   │
└───────────────────────────────────────────────────────────────┘
```

### 12.4 Split-screen live preview — texnik implementation
- Edit panel (left) — form/editor
- Preview panel (right) — real-time renders test as user sees it
- Preview uses same components as user-facing test page
- State sync via React context / Zustand store
- Debounced re-render on edit
- Device toggle: Desktop / Tablet / Mobile preview modes

### 12.5 Test versioning
- Published test edit → creates new `version` (increments)
- Old attempts still reference old version via `attempt.test_snapshot` (JSONB)
- Snapshot saved at attempt start → frozen data
- User results never break even if test edited/deleted

### 12.6 Test duplicate
- "Duplicate test" → deep clone with new ID, sets status = Draft
- Useful for variants / test templates

### 12.7 Bulk import
- JSON format (documented schema)
- Optionally: CSV for simple tests
- Validate before import
- Dry-run preview
- Import as Draft by default

### 12.8 Test-level Authoring Only
- Reusable Question Bank yo'q
- Har bir test uchun savollar va content alohida, unikal yaratiladi
- Shared question library, difficulty taxonomy, bank search/filter flow current scope ga kirmaydi
- Test builder faqat test-level authoring va versioning ustida ishlaydi

### 12.9 Audio upload flow
- Drag-drop or file picker
- Client-side validation: mp3/wav, max 30 MB
- Upload via presigned S3 URL (direct from browser → S3)
- Backend receives S3 key, saves to DB
- Duration extracted (backend ffprobe) on Celery task

### 12.10 Admin: Users page

```
Filter: [All ▼] [Premium ▼] [Recently active]
Search: [__________]

User          │ Tests │ Band │ Premium │ Last Active │ Actions
──────────────┼───────┼──────┼─────────┼─────────────┼────────
Ali T.        │  45   │ 8.5  │ Yes     │ 2h ago      │ ⋯
Maria K.      │  38   │ 8.0  │ Expired │ 3d ago      │ ⋯
...

Actions: View profile, View attempts, Grant premium, Ban, Force logout
```

### 12.11 Admin: Subscription Plans

```
┌───────────────────────────────────────────────────────────────┐
│ Plans                              [+ New Plan]               │
├───────────────────────────────────────────────────────────────┤
│ Name          │ Duration │ Price      │ Discount │ Active │   │
│ ──────────────┼──────────┼────────────┼──────────┼────────┼───│
│ Premium 30d   │ 30 days  │ 50,000 UZS │ 0%       │ ✓      │ ⋯ │
│ Premium 90d   │ 90 days  │135,000 UZS │ 10%      │ ✓      │ ⋯ │
│ Premium 180d  │ 180 days │240,000 UZS │ 20%      │ ✓      │ ⋯ │
│ Premium 365d  │ 365 days │420,000 UZS │ 30%      │ ✓      │ ⋯ │
└───────────────────────────────────────────────────────────────┘
```

### 12.12 Admin: Promo Codes

```
┌───────────────────────────────────────────────────────────────┐
│ Promo Codes                       [+ New Code]                │
├───────────────────────────────────────────────────────────────┤
│ Code       │ Discount │ Uses  │ Valid Until │ Status │ Action│
│ ───────────┼──────────┼───────┼─────────────┼────────┼───────│
│ WELCOME20  │ 20%      │ 42/100│ 2026-06-01  │ Active │ ⋯     │
│ SUMMER50   │ 50%      │ 5/50  │ 2026-07-31  │ Active │ ⋯     │
│ EXPIRED10  │ 10%      │ 100/100│2025-12-31  │ Expired│ ⋯     │
└───────────────────────────────────────────────────────────────┘

New Code:
  Code [WELCOME20]
  Discount % [20]
  Max Uses [100]
  Valid from [2026-04-15] to [2026-06-01]
  Applicable plans: [ ] All  [✓] Premium 30d  [✓] Premium 90d
  [Save]
```

### 12.13 Admin Analytics — KPIs

**Dashboard KPIs:**
- DAU / WAU / MAU
- New user signups (daily, weekly, monthly)
- Conversion: Free → Premium (%)
- Active premium users count
- Revenue (daily, weekly, monthly)
- Churn rate (premium users not renewing)
- Average tests per user
- Most popular tests (by attempts)
- Most abandoned tests (started but not completed)
- Average completion time per test
- Hardest questions (lowest correct rate globally)
- Most common mistakes by question type
- Promo code usage stats
- Payment method distribution
- Reading vs Listening engagement

**Implementation:**
- Aggregated daily into `analytics_daily` table (Celery nightly job)
- Dashboard queries aggregates (fast)
- On-demand detailed queries with caching

### 12.14 Audit log
- All admin actions logged
- Who did what, when, from which IP
- Filterable, exportable

---

## 13. Payment Flow

**Current status:** payment subsystem hozircha `paused`.
- Core product payment bo'lmasdan ishlashi shart
- Plans, promo, gift, va payment schema/service boundary tayyor turadi
- Live checkout, webhook, provider activation keyingi yaqin modul sifatida ulanadi

### 13.1 User flow
```
1. User → /subscription page → select plan
2. Optional: enter promo code → validate → show discounted price
3. User sees payment module as "Coming soon"
4. Backend may create a placeholder `payment` row with status=`paused` for future continuity
5. No live provider redirect/webhook in the current implementation pass
```

### 13.2 Gift flow
```
1. User → /subscription → "Gift to someone" toggle
2. Selects plan, optional promo code
3. Payment activation hozircha paused bo'lgani uchun gift checkout ham paused holatda qoladi
4. Gift code lifecycle contracts saqlanadi, lekin live redemption faqat payment module yoqilgandan keyin aktiv bo'ladi
```

### 13.3 Webhook security
- Provider activation paytida signature verification, idempotency, va retry logic majburiy qoladi

---

## 14. Telegram Bot

### 14.1 Commands
- `/start` — welcome + request phone number
- `/login` — generate login code
- `/me` — show user info, premium status
- `/help` — help message
- `/stop` — unsubscribe from notifications

### 14.2 Notifications via bot
- Payment success
- Premium expiring in 3 days
- Premium expired
- Gift code received (for recipient)
- New test published (opt-in)
- Weekly progress summary (opt-in)

### 14.3 Rate limits
- Login code: 1 per 60 sec per user
- Max 10 codes per day per user

---

## 15. API Endpoints (high-level)

### Auth
```
POST   /api/auth/request-code      — generates code via bot
POST   /api/auth/verify-code       — returns tokens
POST   /api/auth/refresh           — refresh access token
POST   /api/auth/logout            — invalidate session
GET    /api/auth/sessions          — list active sessions
DELETE /api/auth/sessions/:id      — force logout session
```

### User
```
GET    /api/me                     — profile
PATCH  /api/me                     — update profile
GET    /api/me/stats               — dashboard stats
GET    /api/me/activity            — heatmap data
GET    /api/me/attempts            — attempt history
GET    /api/me/favorites           — favorites
POST   /api/me/favorites/:test_id  — add favorite
DELETE /api/me/favorites/:test_id  — remove favorite
```

### Tests
```
GET    /api/tests                  — list tests (filter by type, access)
GET    /api/tests/:id              — test metadata
POST   /api/tests/:id/start        — start attempt
  Body: { scope: 'full'|'section', section_id?, mode: 'practice'|'exam' }
  Returns: { attempt_id, test_snapshot (without answers) }
```

### Attempts
```
GET    /api/attempts/:id           — get attempt (no answers)
PATCH  /api/attempts/:id/answer    — save answer (auto-save)
  Body: { question_id, value }
POST   /api/attempts/:id/submit    — submit test
GET    /api/attempts/:id/result    — results + band score
GET    /api/attempts/:id/review    — full review with correct answers + explanations (premium)
```

### Leaderboard
```
GET    /api/leaderboard             — query: ?type=reading&period=month
```

### Subscription
```
GET    /api/plans                   — list plans
POST   /api/subscribe               — initiate payment
  Body: { plan_id, promo_code?, is_gift?, payment_method }
POST   /api/payments/callback/:method — webhooks
POST   /api/redeem                  — redeem gift code
  Body: { code }
```

### Admin (all protected with admin role)
```
GET    /api/admin/dashboard         — KPIs
GET    /api/admin/tests             — list (paginated, filtered)
POST   /api/admin/tests             — create test
GET    /api/admin/tests/:id         — full test data incl. answers
PATCH  /api/admin/tests/:id         — update
DELETE /api/admin/tests/:id         — soft delete
POST   /api/admin/tests/:id/publish — publish
POST   /api/admin/tests/:id/archive — archive
POST   /api/admin/tests/:id/duplicate — duplicate

POST   /api/admin/sections, passages, paragraphs, question_groups, questions, answers
       — full CRUD for building tests

POST   /api/admin/audio/upload-url  — presigned S3 URL
POST   /api/admin/images/upload-url — presigned S3 URL

GET    /api/admin/users             — list
GET    /api/admin/users/:id         — detail
PATCH  /api/admin/users/:id         — update (grant premium, ban)

CRUD   /api/admin/plans
CRUD   /api/admin/promo-codes
CRUD   /api/admin/admins            — super admin only

GET    /api/admin/analytics/...     — detailed analytics
GET    /api/admin/audit-log         — audit entries
```

---

## 16. Background Jobs (Celery)

### Jobs
- `score_attempt(attempt_id)` — on submit, calculates score + band
- `refresh_leaderboard()` — hourly materialized view refresh
- `compute_user_stats(user_id)` — nightly user analytics
- `aggregate_analytics_daily()` — nightly admin KPIs
- `check_premium_expiring()` — daily, sends notification 3 days before
- `expire_premium()` — daily, sets is_premium=false for expired
- `send_telegram_notification(user_id, type, payload)` — async notification
- `process_audio_upload(audio_id)` — extracts duration, generates waveform
- `backup_database()` — daily backup
- `cleanup_abandoned_attempts()` — nightly, marks stale attempts

### Queues
- `default` — most tasks
- `notifications` — telegram messages (rate-limited)
- `heavy` — reports, backups, analytics

---

## 17. Caching Strategy (Redis)

- **Session data:** refresh tokens, access token revocation (jti blacklist)
- **Rate limiting:** login code requests, API rate limits per user
- **Leaderboard:** top 100 cached 1 hour
- **Test listing:** cached 5 min, invalidated on admin changes
- **User stats:** cached 10 min
- **Public test content:** cached 1 hour (doesn't include answers)
- **Celery broker + result backend**

---

## 18. Security

### 18.1 Authentication
- JWT access tokens (15 min expiry)
- Refresh tokens (30 days, rotated on use)
- All tokens stored hashed in DB
- Token revocation via jti blacklist in Redis

### 18.2 Authorization
- Role-based: user / admin / super_admin
- Test access check on every attempt (premium)
- Admin endpoints protected by role middleware

### 18.3 Data protection
- Passwords (admins) hashed with bcrypt
- Phone numbers stored as-is (needed for identification)
- HTTPS everywhere
- CORS strict whitelist

### 18.4 Rate limiting
- Login: 5 attempts per 15 min per IP
- API: 100 requests/min per user
- Code request: 1 per 60 sec per telegram_id

### 18.5 Exam integrity (best-effort)
- Tab switch detection (logged, not blocked)
- Full-screen recommended
- Copy-paste detection (logged)
- Disable inspect element via JS (deterrent, not enforcement)
- Suspicious activity log visible to admin

### 18.6 Content security
- S3 signed URLs for audio/images (expire in 1 hour)
- XSS prevention: sanitize rich text content (DOMPurify on frontend, bleach on backend)
- SQL injection: SQLAlchemy parameterized queries
- CSRF: not needed for API (JWT)

---

## 19. Responsive Design

### Breakpoints (Tailwind defaults)
- `sm`: 640px (mobile portrait)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

### Key responsive patterns
- **Test taking — Reading:** split screen desktop, tab toggle mobile
- **Test taking — Listening:** audio always sticky top (all devices)
- **Dashboard:** 4-col grid desktop, 2-col tablet, 1-col mobile
- **Admin panel:** desktop-first (admins use desktop primarily), but still usable on tablet
- **Fonts:** fluid scale with `clamp()`
- **Touch targets:** min 44px tap area
- **No horizontal scroll** ever

### Performance targets
- Lighthouse score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Bundle size: < 200KB initial JS (gzipped)

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation for entire test UI (important!)
- Screen reader compatible
- Color contrast WCAG AA
- Focus indicators visible

---

## 20. Deployment

### Services (Docker Compose / K8s)
- `web-frontend` (Next.js)
- `admin-frontend` (Next.js, separate)
- `api` (FastAPI — multiple replicas)
- `celery-worker` (x3 replicas)
- `celery-beat` (scheduled tasks, x1)
- `telegram-bot` (x1)
- `postgres` (primary + replica)
- `redis` (master + sentinel)
- `minio` or `s3` (storage)
- `nginx` / `traefik` (reverse proxy, SSL)

### Environments
- **Development:** local Docker Compose
- **Staging:** pre-prod environment, mirror of prod
- **Production:** VPS or managed service

### CI/CD
- GitHub Actions (or Gitea)
- On PR: run tests, lint, typecheck
- On merge to main: deploy to staging
- Manual promote to prod

### Monitoring
- Sentry for errors
- Prometheus + Grafana for metrics
- PostHog for product analytics
- Uptime monitoring (UptimeRobot)

### Backups
- Daily PostgreSQL dump → S3
- Point-in-time recovery via WAL archiving
- 30-day retention

---

## 21. Development Phases / Milestones

> Loyiha to'liq scope, lekin implementatsiya tartibli bo'ladi.

### Sprint 1: Foundation (2 hafta)
- Infrastructure (Docker, DB, Redis, CI/CD)
- FastAPI skeleton + auth
- Telegram bot (login flow)
- Basic Next.js frontend skeleton
- Admin panel login

### Sprint 2: Test data model (2 hafta)
- DB schema complete
- Admin: create test metadata + passages + paragraphs
- Rich text editor with {{N}} markers
- Image upload
- Audio upload + transcript segments

### Sprint 3: Question builder (3 hafta)
- All question types implemented (14 reading + 8 listening)
- Polymorphic question group builder
- Answer variants
- Live preview
- Validation before publish

### Sprint 4: Test taking — Reading (2 hafta)
- User test catalog
- Start test flow (full / part / mode)
- Reading test UI (desktop + mobile)
- Auto-save answers
- Timer (practice + exam)
- Submit flow

### Sprint 5: Test taking — Listening (2 hafta)
- Listening test UI
- Audio player with segment seek
- All listening question types rendered
- Exam mode rules

### Sprint 6: Scoring & Review (1.5 hafta)
- Scoring engine (Celery)
- Band score conversion
- Results page
- Review mode (with explanations for premium)
- Transcript segment click-to-seek in review

### Sprint 7: Dashboard & Stats (2 hafta)
- User dashboard
- All stats cards
- Charts (band progression, radar, heatmap)
- Test history
- Favorites
- Leaderboard

### Sprint 8: Subscription & Payment (2 hafta)
- Plans, promo codes, gift codes
- Payme integration
- Click integration
- Webhooks
- Gift redemption flow

### Sprint 9: Admin Analytics (1.5 hafta)
- Admin dashboard KPIs
- Detailed analytics pages
- User management
- Audit log
- Notifications system

### Sprint 10: Polish & Launch (2 hafta)
- Landing page (marketing)
- Telegram bot notifications (all types)
- Performance optimization
- Security audit
- Load testing
- Bug fixes
- Documentation

**Total estimate: ~20 weeks / 5 months** for a team of 2-3 full-stack developers.

---

## 22. Open Questions / Assumptions

Quyidagi nuqtalar keyingi konfirmatsiyani talab qiladi, default assumption bilan ishlatiladi:

1. **Landing page content:** marketing copy kim yozadi? Placeholder ishlatamiz.
2. **Exam integrity** — screenshot prevention kerakmi? Hozir skip (brauzer blok qila olmaydi).
3. **Question bank (reusable):** implementation 2-bosqichga qoldirilsa? Default: test-level only.
4. **Refund policy** — admin manual refund. Auto-refund YO'Q.
5. **Multiple admin management** — super admin boshqa adminlar yaratadi.
6. **Backup audio storage** — agar audio S3 da yo'q bo'lsa? Retry + fallback.
7. **Writing/Speaking** — rejada yo'q, kelajakda extensible (schema ready).
8. **Mobile app** — hozircha PWA (installable), native kelajakda.
9. **Notifications preference UI** — profile sahifada toggle.

---

## 23. Success Metrics

Loyiha muvaffaqiyati qanday o'lchanadi:

**Product metrics:**
- 100+ active users in first month
- 20%+ free → premium conversion
- 70%+ user retention (week-over-week)
- < 5% test abandonment rate
- Avg 5+ tests per user per month

**Technical metrics:**
- 99.5% uptime
- API p95 latency < 200ms
- Frontend Lighthouse score > 90
- Zero critical security incidents

**Business metrics:**
- Monthly revenue targets (admin-defined)
- Positive unit economics (CAC < LTV)

---

## 24. Xulosa

Bu plan **to'liq scope** ni qamrab oladi:
- Reading + Listening barcha question turlari (14+8)
- To'liq admin panel test yaratish flow (polymorphic builder + live preview)
- Real IELTS atmosfera (exam mode + strict timer + integrity features)
- Professional user dashboard (charts, heatmap, leaderboard)
- To'liq subscription system (plans, promo, gift)
- Telegram auth + notifications
- Responsive va accessible UI
- Versioning + snapshot (testlar edit bo'lsa ham user history buzilmaydi)

**Keyingi qadam:** bu PLAN.md ni ko'rib chiqing, qaysi qismlarda o'zgartirish yoki qo'shimcha kerak bo'lsa, aniqlang. Keyin sprint-sprint implementatsiyani boshlaymiz.
