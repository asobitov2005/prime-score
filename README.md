# PrimeScore

PrimeScore is an IELTS Academic mock test platform focused on Reading and Listening.

This repository is organized as a three-app workspace:
- `backend/` - FastAPI API, Celery tasks, domain models, and tests
- `frontend/` - Next.js user-facing application
- `admin/` - Next.js admin panel

The source of truth for product scope and business rules remains:
- `PLAN.md`
- `AGENTS.md`
- `docs/context/*`

Current product decisions already applied in the scaffold:
- full Reading and Listening scope
- Telegram-only authentication
- payment module marked as paused
- no reusable question bank
- Listening exam timing computed as `audio duration + 2 minutes`
