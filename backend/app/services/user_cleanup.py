from __future__ import annotations

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt, AttemptEvent, UserAnswer
from app.models.commerce import GiftCode, GiftCodeRedemption, Payment
from app.models.gamification import LeaderboardEntry, Streak, XPTransaction
from app.models.notification import NotificationPreference
from app.models.ops import Notification as OpsNotification
from app.models.review import Review
from app.models.speaking import (
    SpeakingAudioAsset,
    SpeakingEvaluation,
    SpeakingEvent,
    SpeakingSession,
    SpeakingSessionPart,
    SpeakingTurn,
)
from app.models.user import Session as UserSession
from app.models.user import TelegramLoginCode, User
from app.models.writing import WritingDraft, WritingEvaluation, WritingSubmission
from app.services.code_store import get_code_store
from app.services.runtime_store import delete_user_attempts


async def purge_user_data(session: AsyncSession, *, user: User) -> None:
    user_id = user.id

    attempt_ids = select(Attempt.id).where(Attempt.user_id == user_id)
    writing_submission_ids = select(WritingSubmission.id).where(WritingSubmission.user_id == user_id)
    speaking_session_ids = select(SpeakingSession.id).where(SpeakingSession.user_id == user_id)

    if await _table_exists(session, UserAnswer.__tablename__):
        await session.execute(delete(UserAnswer).where(UserAnswer.attempt_id.in_(attempt_ids)))
    if await _table_exists(session, AttemptEvent.__tablename__):
        await session.execute(delete(AttemptEvent).where(AttemptEvent.attempt_id.in_(attempt_ids)))
    if await _table_exists(session, Attempt.__tablename__):
        await session.execute(delete(Attempt).where(Attempt.user_id == user_id))

    if await _table_exists(session, WritingEvaluation.__tablename__):
        await session.execute(delete(WritingEvaluation).where(WritingEvaluation.submission_id.in_(writing_submission_ids)))
    if await _table_exists(session, WritingSubmission.__tablename__):
        await session.execute(delete(WritingSubmission).where(WritingSubmission.user_id == user_id))
    if await _table_exists(session, WritingDraft.__tablename__):
        await session.execute(delete(WritingDraft).where(WritingDraft.user_id == user_id))

    if await _table_exists(session, SpeakingTurn.__tablename__):
        await session.execute(delete(SpeakingTurn).where(SpeakingTurn.speaking_session_id.in_(speaking_session_ids)))
    if await _table_exists(session, SpeakingEvent.__tablename__):
        await session.execute(delete(SpeakingEvent).where(SpeakingEvent.speaking_session_id.in_(speaking_session_ids)))
    if await _table_exists(session, SpeakingEvaluation.__tablename__):
        await session.execute(delete(SpeakingEvaluation).where(SpeakingEvaluation.speaking_session_id.in_(speaking_session_ids)))
    if await _table_exists(session, SpeakingAudioAsset.__tablename__):
        await session.execute(delete(SpeakingAudioAsset).where(SpeakingAudioAsset.speaking_session_id.in_(speaking_session_ids)))
    if await _table_exists(session, SpeakingSessionPart.__tablename__):
        await session.execute(delete(SpeakingSessionPart).where(SpeakingSessionPart.speaking_session_id.in_(speaking_session_ids)))
    if await _table_exists(session, SpeakingSession.__tablename__):
        await session.execute(delete(SpeakingSession).where(SpeakingSession.user_id == user_id))

    if await _table_exists(session, XPTransaction.__tablename__):
        await session.execute(delete(XPTransaction).where(XPTransaction.user_id == user_id))
    if await _table_exists(session, LeaderboardEntry.__tablename__):
        await session.execute(delete(LeaderboardEntry).where(LeaderboardEntry.user_id == user_id))
    if await _table_exists(session, Streak.__tablename__):
        await session.execute(delete(Streak).where(Streak.user_id == user_id))

    if await _table_exists(session, UserSession.__tablename__):
        await session.execute(delete(UserSession).where(UserSession.user_id == user_id))
    if await _table_exists(session, NotificationPreference.__tablename__):
        await session.execute(delete(NotificationPreference).where(NotificationPreference.user_id == user_id))
    if await _table_exists(session, OpsNotification.__tablename__):
        await session.execute(delete(OpsNotification).where(OpsNotification.user_id == user_id))
    if await _table_exists(session, Review.__tablename__):
        await session.execute(delete(Review).where(Review.user_id == user_id))
    if await _table_exists(session, GiftCodeRedemption.__tablename__):
        await session.execute(delete(GiftCodeRedemption).where(GiftCodeRedemption.user_id == user_id))
    if await _table_exists(session, Payment.__tablename__):
        await session.execute(delete(Payment).where(Payment.user_id == user_id))
    if await _table_exists(session, TelegramLoginCode.__tablename__):
        await session.execute(delete(TelegramLoginCode).where(TelegramLoginCode.telegram_id == user.telegram_id))
    if await _table_exists(session, GiftCode.__tablename__):
        await session.execute(
            update(GiftCode)
            .where(GiftCode.purchaser_user_id == user_id)
            .values(purchaser_user_id=None)
        )
        await session.execute(
            update(GiftCode)
            .where(GiftCode.recipient_user_id == user_id)
            .values(recipient_user_id=None)
        )
    await session.execute(delete(User).where(User.id == user_id))

    delete_user_attempts(user_id)
    try:
        await get_code_store().delete_contact(user.telegram_id)
    except Exception:
        pass


async def _table_exists(session: AsyncSession, table_name: str) -> bool:
    value = await session.scalar(select(func.to_regclass(table_name)))
    return value is not None
