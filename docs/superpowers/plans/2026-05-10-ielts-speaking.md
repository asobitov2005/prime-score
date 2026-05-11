# IELTS Speaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated IELTS Speaking domain with admin-manageable topic/test bank, seeded category coverage, user session primitives, and foundations for Gemini Live speaking sessions and post-session grading.

**Architecture:** Build a dedicated speaking backend domain instead of extending the existing reading/listening attempt engine. Ship in slices: schema and CRUD first, then user session APIs, then live runtime ingestion, then evaluator/result surfaces, then frontend/admin UX integration.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, Next.js, existing PrimeScore admin/frontend patterns, Gemini API Live.

---

### Task 1: Add Speaking Domain Types And Models

**Files:**
- Modify: `backend/app/core/enums.py`
- Modify: `backend/app/models/enums.py`
- Create: `backend/app/models/speaking.py`
- Modify: `backend/app/models/__init__.py` if needed
- Test: `backend/tests/test_speaking_admin_api.py`

- [ ] Step 1: Write failing tests for basic admin speaking listing and creation expectations.
- [ ] Step 2: Run the targeted test and confirm missing-route or missing-table failure.
- [ ] Step 3: Add speaking enums and SQLAlchemy models for tests, topics, items, sessions, parts, turns, assets, events, and evaluations.
- [ ] Step 4: Re-run the targeted test and confirm the failure moves forward to missing route/schema behavior.

### Task 2: Add Alembic Migration

**Files:**
- Create: `backend/alembic/versions/20260510_000021_create_speaking_tables.py`
- Test: `backend/tests/test_speaking_admin_api.py`

- [ ] Step 1: Add migration creating all dedicated speaking tables and indexes.
- [ ] Step 2: Run the speaking test target and verify schema-level failures are resolved.

### Task 3: Add Pydantic Schemas And Seed Helpers

**Files:**
- Create: `backend/app/schemas/speaking.py`
- Create: `backend/app/services/speaking_seed.py`
- Modify: `backend/app/db/seed.py`
- Test: `backend/tests/test_speaking_seed.py`

- [ ] Step 1: Write failing tests asserting category-backed seed generation with at least two entries per configured category.
- [ ] Step 2: Implement schemas and seed helper output shapes.
- [ ] Step 3: Wire the seed helper into the existing DB seed flow.
- [ ] Step 4: Re-run tests and verify category minimums pass.

### Task 4: Add Admin Speaking CRUD API

**Files:**
- Create: `backend/app/api/routes/admin_speaking.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_speaking_admin_api.py`

- [ ] Step 1: Write failing tests for admin topic CRUD and speaking test CRUD.
- [ ] Step 2: Implement admin routes for topics and tests with category filtering and publish/archive support.
- [ ] Step 3: Register the route in FastAPI.
- [ ] Step 4: Re-run tests and verify CRUD passes.

### Task 5: Add User-Facing Speaking Catalog And Session Bootstrap APIs

**Files:**
- Create: `backend/app/api/routes/speaking.py`
- Test: `backend/tests/test_speaking_user_api.py`

- [ ] Step 1: Write failing tests for listing published speaking tests and creating a session in full or single-part mode.
- [ ] Step 2: Implement published catalog and session bootstrap endpoints.
- [ ] Step 3: Re-run tests and verify session creation payloads pass.

### Task 6: Add Runtime Event And Turn Persistence

**Files:**
- Modify: `backend/app/api/routes/speaking.py`
- Test: `backend/tests/test_speaking_user_api.py`

- [ ] Step 1: Write failing tests for posting turn payloads, warnings, and completion events.
- [ ] Step 2: Implement session turn ingestion and speaking event persistence.
- [ ] Step 3: Re-run tests and verify deterministic diarization and raw transcript storage pass.

### Task 7: Add Evaluation Service Skeleton And Result Endpoint

**Files:**
- Create: `backend/app/services/speaking_evaluator.py`
- Modify: `backend/app/api/routes/speaking.py`
- Test: `backend/tests/test_speaking_user_api.py`

- [ ] Step 1: Write failing tests for storing an evaluation result and returning criterion scores plus deep feedback.
- [ ] Step 2: Implement evaluator service skeleton and result serialization.
- [ ] Step 3: Re-run tests and verify result shape passes.

### Task 8: Add Admin UI Foundations

**Files:**
- Create: `admin/app/(dashboard)/speaking/page.tsx`
- Create: `admin/components/speaking-topic-manager.tsx`
- Modify: `admin/components/sidebar-nav.tsx`
- Modify: `admin/lib/api.ts`

- [ ] Step 1: Add a backend-backed admin speaking page entry and minimal manager shell.
- [ ] Step 2: Implement topic list/create/edit/delete flows using the new API.
- [ ] Step 3: Verify the admin page loads and CRUD actions work manually.

### Task 9: Add Frontend User Speaking Foundations

**Files:**
- Create: `frontend/app/(app)/speaking/page.tsx`
- Create: `frontend/app/(app)/speaking/[testId]/page.tsx`
- Create: `frontend/lib/server-speaking.ts`

- [ ] Step 1: Add speaking catalog page and test entry page.
- [ ] Step 2: Hook them to backend catalog/session bootstrap endpoints.
- [ ] Step 3: Verify the user can create a backend speaking session from the UI.

### Task 10: Add Live Room Skeleton

**Files:**
- Create: `frontend/app/(app)/speaking/sessions/[sessionId]/page.tsx`
- Create: `frontend/components/speaking/live-speaking-room.tsx`
- Create: `frontend/lib/gemini-live-speaking.ts`

- [ ] Step 1: Add live room page and client component shell.
- [ ] Step 2: Add ephemeral-token fetch and Gemini Live session bootstrap logic.
- [ ] Step 3: Add examiner/candidate turn state machine and mic gating shell.
- [ ] Step 4: Verify the room can initialize with mock-safe runtime state even before full live integration is complete.
