from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.test_content_repo_dependencies import *

logger = logging.getLogger(__name__)

def _model_test_type(value: TestType) -> ModelTestType:
    return ModelTestType(value.value)

def _model_access_type(value: AccessType) -> ModelAccessType:
    return ModelAccessType(value.value)

def _model_test_status(value: TestStatus) -> ModelTestStatus:
    return ModelTestStatus(value.value)

_EXAM_PRACTICE_TITLE_RE = re.compile(r"^Exam Practice Test (\d+)$", re.IGNORECASE)

_EXAM_PRACTICE_PLACEHOLDER_RE = re.compile(r"^Exam Practice Test$", re.IGNORECASE)

_CUSTOM_TEST_SUFFIX_RE = re.compile(r"^(?P<base>.+?)\s+-\s+Test\s+(?P<number>\d+)$", re.IGNORECASE)

_TEST_GUARD_TITLE_RE = re.compile(
    r"\b(?:"
    r"new\s+version\s+guard|publish\s+guard|guard\s+test|test\s+guard|"
    r"new\s+version\s+regression|publish\s+regression|regression\s+test|test\s+regression"
    r")\b",
    re.IGNORECASE,
)

_SLUG_SEPARATOR_RE = re.compile(r"[^a-z0-9]+")

def _is_forbidden_test_guard_title(title: str | None) -> bool:
    return _TEST_GUARD_TITLE_RE.search(str(title or "")) is not None

def _slugify_test_title(title: str | None, *, fallback: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(title or ""))
    ascii_title = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = _SLUG_SEPARATOR_RE.sub("-", ascii_title).strip("-")
    return slug or fallback

async def _is_test_slug_available(session: AsyncSession, *, slug: str, test_id: UUID) -> bool:
    existing_test_id = await session.scalar(select(Test.id).where(Test.slug == slug))
    if existing_test_id is not None and existing_test_id != test_id:
        return False

    existing_redirect_test_id = await session.scalar(select(TestSlugRedirect.test_id).where(TestSlugRedirect.slug == slug))
    if existing_redirect_test_id is not None and existing_redirect_test_id != test_id:
        return False

    return True

async def _build_unique_test_slug(
    session: AsyncSession,
    *,
    title: str,
    test_type: ModelTestType | str,
    test_id: UUID,
) -> str:
    raw_type = test_type.value if hasattr(test_type, "value") else str(test_type)
    base = _slugify_test_title(title, fallback=f"{raw_type or 'test'}-test")[:300].strip("-")
    base = base or "test"

    candidate = base
    suffix = 2
    while not await _is_test_slug_available(session, slug=candidate, test_id=test_id):
        suffix_text = f"-{suffix}"
        candidate = f"{base[:320 - len(suffix_text)]}{suffix_text}".strip("-")
        suffix += 1
    return candidate

async def _sync_test_slug(session: AsyncSession, test: Test) -> None:
    next_slug = await _build_unique_test_slug(
        session,
        title=test.title,
        test_type=test.type,
        test_id=test.id,
    )
    current_slug = str(getattr(test, "slug", "") or "").strip()
    if current_slug == next_slug:
        return

    if current_slug:
        existing_redirect = await session.scalar(
            select(TestSlugRedirect).where(TestSlugRedirect.slug == current_slug)
        )
        if existing_redirect is None:
            session.add(TestSlugRedirect(slug=current_slug, test_id=test.id))
        elif existing_redirect.test_id != test.id:
            logger.warning("Slug redirect collision for %s while updating test %s", current_slug, test.id)

    test.slug = next_slug

def _is_exam_practice_auto_title(value: str | None) -> bool:
    if not value:
        return False
    return _EXAM_PRACTICE_TITLE_RE.fullmatch(value.strip()) is not None

def _is_exam_practice_placeholder_title(value: str | None) -> bool:
    if not value:
        return False
    stripped = value.strip()
    return _EXAM_PRACTICE_PLACEHOLDER_RE.fullmatch(stripped) is not None or _is_exam_practice_auto_title(stripped)

def _extract_custom_test_number(value: str | None) -> int | None:
    if not value:
        return None
    stripped = value.strip()
    exam_practice_match = _EXAM_PRACTICE_TITLE_RE.fullmatch(stripped)
    if exam_practice_match:
        return int(exam_practice_match.group(1))
    custom_suffix_match = _CUSTOM_TEST_SUFFIX_RE.fullmatch(stripped)
    if custom_suffix_match:
        return int(custom_suffix_match.group("number"))
    return None

def _title_number_parts(value: str | None, *, limit: int = 4) -> tuple[int, ...]:
    parts = [int(match) for match in re.findall(r"\d+", str(value or ""))]
    trimmed = parts[:limit]
    if len(trimmed) < limit:
        trimmed.extend([-1] * (limit - len(trimmed)))
    return tuple(trimmed)

def _is_quick_fix_format_compatible(
    *,
    test_type: str,
    current_format: str,
    requested_format: str,
    section_count: int,
) -> bool:
    if requested_format == current_format:
        return True

    if section_count != 1:
        return False

    allowed_formats = (
        {"full", "passage_1", "passage_2", "passage_3"}
        if test_type == TestType.reading.value
        else {"full", "part_1", "part_2", "part_3", "part_4"}
    )
    return current_format in allowed_formats and requested_format in allowed_formats

async def _refresh_in_progress_attempt_snapshots_for_test(
    session: AsyncSession,
    *,
    test_id: UUID,
) -> None:
    from app.services.test_content_repo_part_06 import build_test_snapshot_from_db

    attempts = list(
        (
            await session.scalars(
                select(Attempt).where(
                    Attempt.test_id == test_id,
                    Attempt.status == ModelAttemptStatus.IN_PROGRESS,
                )
            )
        ).all()
    )
    if not attempts:
        return

    for attempt in attempts:
        snapshot = await build_test_snapshot_from_db(
            session,
            test_id=test_id,
            scope=TestScope(attempt.scope.value),
            mode=TestMode(attempt.mode.value),
            section_id=attempt.section_id,
        )
        if snapshot is None:
            continue

        frozen_snapshot = freeze_test_snapshot(snapshot)
        attempt.test_snapshot = frozen_snapshot
        attempt.max_score = int(frozen_snapshot.get("total_questions", attempt.max_score or 0))
        attempt.time_limit_seconds = int(frozen_snapshot.get("time_limit_seconds", attempt.time_limit_seconds or 0))

def _strip_custom_test_suffix(value: str | None) -> str:
    if not value:
        return ""
    stripped = value.strip()
    custom_suffix_match = _CUSTOM_TEST_SUFFIX_RE.fullmatch(stripped)
    if custom_suffix_match:
        return custom_suffix_match.group("base").strip()
    return stripped

async def _build_next_exam_practice_title(session: AsyncSession, *, test_type: ModelTestType) -> str:
    titles = list(
        (
            await session.scalars(
                select(Test.title).where(
                    Test.source == ModelTestSource.CUSTOM,
                    Test.type == test_type,
                )
            )
        ).all()
    )
    max_number = 0
    for title in titles:
        number = _extract_custom_test_number(str(title or "").strip())
        if number is not None:
            max_number = max(max_number, number)
    return f"Exam Practice Test {max_number + 1}"

async def _resolve_admin_test_title(
    session: AsyncSession,
    *,
    metadata: dict[str, object],
    existing_test: Test | None = None,
) -> str:
    explicit_title = str(metadata.get("title") or "").strip()
    source = ModelTestSource(str(metadata["source"]))
    test_type = ModelTestType(str(metadata["type"]))
    if source != ModelTestSource.CUSTOM:
        return explicit_title

    if explicit_title and not _is_exam_practice_placeholder_title(explicit_title):
        explicit_base_title = _strip_custom_test_suffix(explicit_title)
        if existing_test is not None and existing_test.source == ModelTestSource.CUSTOM:
            existing_number = _extract_custom_test_number(existing_test.title)
            if existing_number is not None:
                return f"{explicit_base_title} - Test {existing_number}"
        next_number = _extract_custom_test_number(await _build_next_exam_practice_title(session, test_type=test_type))
        if next_number is not None:
            return f"{explicit_base_title} - Test {next_number}"
        return explicit_base_title

    existing_title = ""
    if existing_test is not None and existing_test.source == ModelTestSource.CUSTOM:
        existing_title = str(existing_test.title or "").strip()

    if existing_title:
        return existing_title

    return await _build_next_exam_practice_title(session, test_type=test_type)
