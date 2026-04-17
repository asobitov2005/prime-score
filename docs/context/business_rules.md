# PrimeScore — Biznes Qoidalar

> AI agentlar uchun non-code product rules. Kod o'qish orqali aniqlab bo'lmaydigan qoidalar. **Buzish taqiqlangan.**

---

## 1. Test Modalari

| Parameter | Practice Mode | Exam Condition Mode |
|---|---|---|
| Timer | Count-up (cheksiz) | Strict countdown (60 min Reading / Listening = audio duration + 2 min) |
| Pause | Ha | YO'Q |
| Orqaga qaytish | Ha | Ha (IELTS da mumkin) |
| Review per-question | Har doim mumkin | Faqat submit dan keyin |
| Auto-submit | YO'Q | HA, vaqt tugasa |
| Tab-switch log | YO'Q | HA |

**Qoida:**
- **Part-level test** (bitta passage/part) = **doim Practice** (exam MUMKIN EMAS)
- **Full test** = user tanlaydi Practice yoki Exam

---

## 2. Access Tiers (Free / Premium)

- `access_type = public` → free userlar ko'radi
- `access_type = premium` → faqat premium userlar
- Admin har test uchun access ni belgilaydi

**Explanations (savol tushuntirishi):** faqat **Premium** userlar ko'radi, hatto public testlarda ham.

---

## 3. Subscription

### Plans (admin paneldan konfiguratsiya)
- 30 kun
- 90 kun
- 180 kun
- 365 kun

Har bir reja uchun admin kiritadi:
- Narxi
- Chegirma %

### Qoidalar
- **Auto-renew YO'Q** — har safar manual qayta sotib oladi
- **Stacking:** active premium ustiga olsa → muddat oxiriga qo'shiladi
- **To'lov moduli:** architecture tayyor, lekin live provider activation hozircha paused
- **One-time payment** — subscription emas

---

## 4. Promo Codes & Gift Codes

### Promo
- `%` chegirma
- `max_uses` (admin kiritadi)
- `valid_until` (expiration)
- Registration paytida yoki tarif sotib olayotganda kiritish mumkin

### Gift
- User boshqa kishiga premium sovg'a qilishi mumkin
- Unique code generatsiya qilinadi → recipient activate qiladi
- Gift code expiration bor

---

## 5. Authentication (Telegram-only)

### Login flow
1. User saytda "Login with Telegram" bosadi
2. Bot ga `/start` → phone number share qiladi
3. Bot ga `/login` → **6 xonali kod** keladi
4. User kodni saytga kiritadi → login bo'ladi

### Security qoidalari
- **6 xonali kod** (4 EMAS — security uchun)
- Kod **3 min** amal qiladi
- Kod **1 martalik** (ishlatilgandan keyin yaroqsiz)
- **3 ta failed attempt** → **5 min block**
- **1 Telegram = 1 PrimeScore account** (phone number unique)
- Rate limit: **1 kod / 60 sec** per telegram_id
- Maksimum **10 kod / kun** per user

---

## 6. Session Management

- **Max 2 ta active session** per user
- 3-chi login → eng eski session **avtomatik invalidate** bo'ladi
- **Device type aniqlash YO'Q** (telefon/kompyuter classification — ishonchsiz)
- Oddiy 2-session cap, nuqta
- Admin paneldan user sessionlarni ko'rish va force-logout qilish mumkin

---

## 7. Admin Rollar

### Super Admin
- Hammasiga access: users, tests, plans, promo codes, admins, settings, analytics

### Admin
- Faqat **test CRU** (Create, Read, Update)
- Analytics ko'rish (read-only)
- User delete, plan create, admin create — YO'Q

---

## 8. Leaderboard

- **Global, hammaga ochiq**
- Free + Premium hamma qatnashadi
- **Privacy toggle:** user profilda leaderboarddan yashirish mumkin
- **Scoring logic:** eng yaxshi 10 ta attempt o'rtachasi (gaming ni oldini oladi)
- Minimum **5 ta attempt** — qatnashish uchun
- Reading, Listening — alohida leaderboardlar
- Material view Redis da cache — har soatda refresh

---

## 9. Answer Checking

### Normalization
```python
def normalize(text: str) -> str:
    # lowercase, trim, collapse whitespace, strip trailing punct
    return text.strip().lower()
```

### Auto-qabul qilinadi
- Case differences (THE = the)
- Leading/trailing whitespace
- Multiple spaces

### Auto-qabul QILINMAYDI (admin variant sifatida kiritadi)
- Article ignore (a/an/the) — YO'Q (IELTS strict)
- Plural/singular auto — YO'Q
- British/American spelling auto — YO'Q
- Typo tolerance — **YO'Q** (real IELTS ham tolerate qilmaydi)
- Fuzzy matching / AI-based matching — YO'Q

### Admin yondashuvi
Admin har savol uchun `answers` jadvalida **barcha qabul qilinadigan variantlarni** kiritadi:
```
Question: The first flight was in {{10}}
Accepted answers:
  - 1903 (primary)
  - nineteen-o-three
  - nineteen hundred and three
```

---

## 10. Band Score Conversion

Standard IELTS table (admin-configurable, default hard-coded):

### Reading (Academic)
| Raw | Band |  | Raw | Band |
|---|---|---|---|---|
| 39-40 | 9.0 | | 15-18 | 5.0 |
| 37-38 | 8.5 | | 13-14 | 4.5 |
| 35-36 | 8.0 | | 10-12 | 4.0 |
| 33-34 | 7.5 | | 8-9 | 3.5 |
| 30-32 | 7.0 | | 6-7 | 3.0 |
| 27-29 | 6.5 | | 4-5 | 2.5 |
| 23-26 | 6.0 | | 3 | 2.0 |
| 19-22 | 5.5 | | 2 | 1.0 |

### Listening
| Raw | Band |  | Raw | Band |
|---|---|---|---|---|
| 39-40 | 9.0 | | 16-17 | 5.0 |
| 37-38 | 8.5 | | 13-15 | 4.5 |
| 35-36 | 8.0 | | 11-12 | 4.0 |
| 32-34 | 7.5 | | 8-10 | 3.5 |
| 30-31 | 7.0 | | 6-7 | 3.0 |
| 26-29 | 6.5 | | 4-5 | 2.5 |
| 23-25 | 6.0 | | 3 | 2.0 |
| 18-22 | 5.5 | | 2 | 1.0 |

**Part-level test uchun:** raw score ko'rsatiladi (11/13), band **ko'rsatilmaydi** (band faqat full test da).

---

## 11. Test Versioning

### Qoida
Published test edit qilinsa:
1. Yangi version yaratiladi (`version++`)
2. Eski attempts ishlashida davom etadi
3. Eski attempts `test_snapshot` JSONB orqali o'zining test holati ni saqlaydi
4. **User history hech qachon buzilmaydi**

### Test lifecycle statuslari
- `draft` — admin yaratmoqda, userlar ko'rmaydi
- `published` — active, userlar ko'radi va ishlaydi
- `archived` — yangi attempt yo'q, lekin eski natijalar saqlanadi

---

## 12. Gap-Fill Marker Standart

**Format:** `{{N}}` — N = question_number

**Misol:**
```
The first flight was in {{12}} by {{13}} in North Carolina.
```

Frontend bu markerni parse qilib `<input data-q="12">` ga aylantiradi. **Boshqa format ishlatilmaydi.**

---

## 13. Scoring Rules

- Har savol = **1 ball**
- **Exception:** MC Multiple Answers — har to'g'ri tanlov = 1 ball (IELTS qoidasi)
- **Partial credit YO'Q** boshqa joylarda (sentence completion = 1 yoki 0)
- Full test: max 40 ball
- Part-level: max = o'sha section savollari soni

---

## 14. Exam Integrity (best-effort)

- Tab switch → `attempt.metadata.tab_switches` ga log
- Copy-paste → log (blocking EMAS)
- Inspect element blocking — **YO'Q** (realistik emas)
- Full-screen tavsiya qilinadi, lekin **force YO'Q**
- Network disconnect → localStorage backup, reconnect da restore
- Auto-save har **10 sekund** (batched)

---

## 15. Notifications

### Telegram bot notifications
- Payment success
- Premium 3 kun qoldi
- Premium muddati tugadi
- Gift code olindi (recipient uchun)
- Yangi test chiqdi (opt-in)
- Haftalik progress summary (opt-in)

User profilida har bir notification turi uchun toggle bor.

---

## Agent uchun oddiy qoida

**Bu qoidalarni hech qachon "soddalashtirish" uchun o'zgartirmang.** Agar user aniq aytgan bo'lsa:
- 6-digit code (4 emas)
- 2 session (device type yo'q)
- Strict answer check (fuzzy yo'q)
- No auto-renew
- All 14+8 question types

Agar ikkilanayotgan bo'lsangiz — `PLAN.md` ni qayta o'qing yoki user bilan aniqlashtiring.
