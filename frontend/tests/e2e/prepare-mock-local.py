"""Create browser-test data only in the explicitly isolated local PostgreSQL."""
import asyncio
import json
import os
import sys
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

target = urlparse(os.environ["DATABASE_URL"])
if target.hostname not in ("127.0.0.1", "localhost") or target.port != 55435 or target.path != "/primescore_test":
    raise SystemExit("Only isolated localhost:55435/primescore_test is permitted")
redis = urlparse(os.environ["REDIS_URL"])
if redis.hostname not in ("127.0.0.1", "localhost") or redis.port != 56380:
    raise SystemExit("Only isolated Redis port 56380 is permitted")
if os.environ.get("TELEGRAM_BOT_TOKEN") != "change-me":
    raise SystemExit("Telegram must be disabled")
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "backend"))

from sqlalchemy import select, text
from starlette.requests import Request
from app.api.routes.auth_support import create_login_session_response
from app.db.session import get_session_maker
from app.models.mock import OfflineMockSchedule, OnlineFullMock
from app.models.test import Test
from app.models.user import User
from app.models.writing import WritingTask


async def main():
    output = Path(tempfile.mkdtemp(prefix="primescore-mock-e2e-"))
    async with get_session_maker()() as db:
        identity = (await db.execute(text("SELECT current_database(), inet_server_port()"))).one()
        if identity != ("primescore_test", 55435):
            raise RuntimeError("Connected database is not the isolated test database")
        now = datetime.now(UTC)
        unique = int(now.timestamp() * 1000)
        user = User(telegram_id=-unique, phone="+" + str(unique), first_name="Private Mock E2E", show_on_leaderboard=False, is_premium=True, premium_until=now + timedelta(days=1), first_login_at=now)
        db.add(user)
        reading = await db.scalar(select(Test).where(Test.type == "reading", Test.format == "full", Test.status == "published", Test.total_questions == 40).order_by(Test.created_at))
        listening = await db.scalar(select(Test).where(Test.type == "listening", Test.format == "full", Test.status == "published", Test.total_questions == 40).order_by(Test.created_at))
        assert reading and listening, "Existing isolated 40-question Reading/Listening fixtures required"
        writing = []
        for number, seconds in [(1, 1200), (2, 2400)]:
            task = WritingTask(title=f"Local browser check: Writing Task {number}", task_type=f"task_{number}", prompt_html="<p>Summarise this table: library visits were 120 in January and 180 in February.</p>" if number == 1 else "<p>Should cities invest more in public libraries? Discuss both views and give your opinion.</p>", word_minimum=150 if number == 1 else 250, time_limit_seconds=seconds, status="published", source="isolated_browser_test")
            db.add(task)
            writing.append(task)
        await db.flush()
        schedules = []
        bundles = []
        for index in range(9):
            schedule = OfflineMockSchedule(title=f"Local Academic Session {index + 1}", starts_at=(now + timedelta(days=index + 1)).replace(hour=4, minute=0, second=0, microsecond=0), duration_minutes=180, location="Local Test Centre", address="Isolated test address, room 12", capacity=index + 2, price_amount=100000, is_published=True)
            bundle = OnlineFullMock(title=f"Local Full Mock {index + 1:02}", description="Isolated browser validation bundle. All four components use the real application workspaces.", listening_test_id=listening.id, reading_test_id=reading.id, writing_task_1_id=writing[0].id, writing_task_2_id=writing[1].id, is_published=True, academic_confirmed=True)
            db.add_all([schedule, bundle])
            schedules.append(schedule)
            bundles.append(bundle)
        await db.commit()
        request = Request({"type": "http", "headers": [(b"user-agent", b"Isolated Mock Browser E2E")], "client": ("127.0.0.1", 1)})
        auth = await create_login_session_response(db, user=user, request=request, is_new_user=False, welcome_bonus_days=0)
        manifest = {"user_id": str(user.id), "schedules": [{"id": str(item.id), "capacity": item.capacity, "title": item.title} for item in schedules], "bundle_ids": [str(item.id) for item in bundles], "reading_test_id": str(reading.id), "listening_test_id": str(listening.id), "writing_task_ids": [str(item.id) for item in writing]}
        for name, data in [("auth.json", auth.model_dump(mode="json")), ("manifest.json", manifest)]:
            with os.fdopen(os.open(output / name, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as stream:
                json.dump(data, stream, indent=2)
    print(json.dumps({"output": str(output), "user_id": manifest["user_id"]}))


asyncio.run(main())
