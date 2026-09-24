"""Versioned, opt-in updates for known Writing defaults, preserving custom text.

Preview: python -m app.services.writing_prompt_defaults --profile-id UUID
Publish: add --publish --expected-version N. No credentials are printed.
The caller owns the transaction when using publish_default_prompt_revision.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import WritingConfigEntityType, WritingConfigStatus, WritingPromptKey
from app.models.writing import WritingPromptEntry, WritingPromptProfile
from app.services.writing_config import DEFAULT_PROMPT_ENTRIES, log_writing_config_action, publish_prompt_profile

PREVIOUS_DEFAULT_HASHES = {
    WritingPromptKey.GRADER_SYSTEM: "dd76eab417b6999c0fd9892767fcf54a95248268d335d3c8395e6c928149983b",
    WritingPromptKey.GRADER_USER_TEMPLATE: "848205147976844c13662c22055282d1c516a95e05d90e9474e2d2b5e5bf23a9",
}


def plan_default_prompt_update(entries: dict) -> tuple[dict, list[str], list[str]]:
    """Return merged entries, changed keys and retained custom keys; no writes."""
    merged = dict(entries)
    changed, custom = [], []
    for key, default in DEFAULT_PROMPT_ENTRIES.items():
        current = entries.get(key)
        if current == default:
            continue
        if current is None or hashlib.sha256(current.encode()).hexdigest() == PREVIOUS_DEFAULT_HASHES.get(key):
            merged[key] = default
            changed.append(key.value)
        else:
            custom.append(key.value)
    return merged, changed, custom


async def publish_default_prompt_revision(
    session: AsyncSession, *, profile_id: UUID, expected_version: int,
    actor_admin_id: UUID | None = None,
) -> dict:
    # Serialize this publisher; the optimistic version/active check rejects stale callers.
    await session.execute(text("SELECT pg_advisory_xact_lock(71925305)"))
    old = await session.scalar(select(WritingPromptProfile).where(WritingPromptProfile.id == profile_id).with_for_update())
    if old is None or old.version != expected_version or not old.is_active or old.status != WritingConfigStatus.PUBLISHED:
        raise ValueError("Expected an active published Writing profile at the requested version")
    rows = (await session.scalars(select(WritingPromptEntry).where(WritingPromptEntry.profile_id == profile_id))).all()
    merged, changed, custom = plan_default_prompt_update({row.key: row.body for row in rows})
    if not changed:
        return {"status": "unchanged", "profile_id": str(old.id), "custom_preserved": custom}
    latest = await session.scalar(select(func.max(WritingPromptProfile.version)).where(WritingPromptProfile.task_type_scope == old.task_type_scope))
    new = WritingPromptProfile(
        slug=old.slug, title=old.title, description=old.description,
        task_type_scope=old.task_type_scope, version=int(latest or 0) + 1,
        status=WritingConfigStatus.DRAFT, is_active=False, created_by=actor_admin_id,
    )
    session.add(new)
    await session.flush()
    formats = {row.key: row.format for row in rows}
    for key, body in merged.items():
        values = {"profile_id": new.id, "key": key, "body": body}
        if key in formats:
            values["format"] = formats[key]
        session.add(WritingPromptEntry(**values))
    await session.flush()
    await publish_prompt_profile(session, profile=new, actor_admin_id=actor_admin_id)
    await log_writing_config_action(
        session, actor_admin_id=actor_admin_id, entity_type=WritingConfigEntityType.PROFILE,
        entity_id=new.id, action="upgrade_known_defaults", previous_version=old.version,
        new_version=new.version, metadata_json={
            "source_profile_id": str(old.id), "changed_keys": changed,
            "custom_preserved": custom, "official_descriptor_revision": "May 2023",
        },
    )
    await session.flush()
    return {"status": "published", "profile_id": str(new.id), "version": new.version,
            "previous_profile_id": str(old.id), "changed_keys": changed, "custom_preserved": custom}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile-id", type=UUID, required=True)
    parser.add_argument("--expected-version", type=int)
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    if args.publish and args.expected_version is None:
        parser.error("--publish requires --expected-version")

    async def run() -> None:
        from app.db.session import get_engine, get_session_maker

        try:
            async with get_session_maker()() as session, session.begin():
                if args.publish:
                    result = await publish_default_prompt_revision(session, profile_id=args.profile_id, expected_version=args.expected_version)
                else:
                    profile = await session.get(WritingPromptProfile, args.profile_id)
                    if profile is None:
                        raise ValueError("Writing prompt profile not found")
                    rows = (await session.scalars(select(WritingPromptEntry).where(WritingPromptEntry.profile_id == args.profile_id))).all()
                    _, changed, custom = plan_default_prompt_update({row.key: row.body for row in rows})
                    result = {"status": "preview", "profile_id": str(profile.id), "version": profile.version,
                              "changed_keys": changed, "custom_preserved": custom}
            print(json.dumps(result))
        finally:
            await get_engine().dispose()

    asyncio.run(run())


if __name__ == "__main__":
    main()
