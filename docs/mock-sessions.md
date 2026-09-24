# Mock sessions

User entry: `/mock?mode=online` or `/mock?mode=offline`.
The Mock catalog is separate from individual practice tests at `/tests`.

## Online

Admin: **Mock > Online Full Mocks** (`/online-full-mocks`).
Create a named Academic bundle from one full Reading test, one full Listening
test, one Writing Task 1 and one Writing Task 2. Select appropriate Academic
content explicitly; titles are not used to infer the exam category.
Confirm the Academic selection before publishing.

All components must be published before learners can access the bundle.
Online mocks do not include Speaking. The component workspaces retain their
existing authentication, access checks, timers, submission and result flows.
Do not treat a component result as a combined IELTS overall band.
The bundle is a four-stage launch hub, not a new combined timer or scoring
engine. Writing feedback continues to use the existing Premium policy.

## Offline

Admin: **Mock > Offline Schedules** (`/mock-schedules`).
Set the session date/time, duration, venue, address, capacity and price, then
publish it. Offline sessions include Reading, Listening, Writing and Speaking.
Times in the user catalog are shown in Asia/Tashkent.

Remaining seats are calculated from stored reservations, not marketing labels.
Booking requires login. The existing Click/Telegram receipt-confirmation flow
is retained; a reservation is not represented as a confirmed payment.

## Verification

- Run backend tests with a dedicated test database and disabled Telegram token.
- Run frontend/admin Node tests and production builds before deployment.
- Exercise both catalogs, pagination, booking, login return and component links
  in a real browser, including mobile and light/dark modes.
- Never publish synthetic test content or fictional session dates in production.
- Back up the production database outside the repository before migrations.

Browser harness: `frontend/tests/e2e/mock-live.cjs`. It requires Chrome and Node
22, Next on `127.0.0.1:3107`, API on `127.0.0.1:8017`, isolated PostgreSQL on
`55435` (`primescore_test`), and Redis on `56380`. Create fixtures using
`backend/.venv/bin/python frontend/tests/e2e/prepare-mock-local.py` with the
isolated API environment and `TELEGRAM_BOT_TOKEN=change-me`. The helper requires
existing isolated 40-question Reading/Listening fixtures; it never copies data
to production. Pass its output directory as `E2E_MOCK_DIR` and the matching
`postgresql://` URL as `E2E_DATABASE_URL` when running the Node harness. Reports
and screenshots stay outside the repository.
