from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
from app.api.routes.admin_user_support import *

router = APIRouter()

@router.get("/telegram-users", response_model=list[AdminTelegramUserRead])
async def list_telegram_users(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminTelegramUserRead]:
    _ = current_admin
    rows = list(
        (
            await session.scalars(
                select(TelegramUser).order_by(
                    TelegramUser.last_started_at.desc().nullslast(),
                    TelegramUser.created_at.desc(),
                )
            )
        ).all()
    )
    result: list[AdminTelegramUserRead] = []
    for row in rows:
        linked_user = None
        if row.linked_user_id is not None:
            linked_user = await session.get(User, row.linked_user_id)
        result.append(
            AdminTelegramUserRead(
                id=row.id,
                telegram_id=row.telegram_id,
                linked_user_id=row.linked_user_id,
                first_name=row.first_name,
                last_name=row.last_name,
                username=row.username,
                phone=row.phone,
                avatar_url=row.avatar_url,
                language_code=row.language_code,
                is_bot=row.is_bot,
                start_count=int(row.start_count or 0),
                first_started_at=row.first_started_at.isoformat() if row.first_started_at else None,
                last_started_at=row.last_started_at.isoformat() if row.last_started_at else None,
                bot_contact_at=row.bot_contact_at.isoformat() if row.bot_contact_at else None,
                first_login_at=row.first_login_at.isoformat() if row.first_login_at else None,
                is_premium=bool(linked_user.is_premium) if linked_user is not None else False,
                created_at=row.created_at.isoformat() if row.created_at else None,
                updated_at=row.updated_at.isoformat() if row.updated_at else None,
            )
        )
    return result

@router.get("/users", response_model=list[AdminUserDetailRead])
async def list_users(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    params: AdminFilterParams = Depends(),
) -> list[AdminUserDetailRead]:
    _ = current_admin
    try:
        users = list((await session.scalars(select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc()))).all())
        result = []
        for user in users:
            result.append(await _build_admin_user_detail(session, user, params))
        return result
    except Exception as exc:
        logger.exception("Failed to list admin users")
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load users.") from exc

@router.get("/reviews", response_model=list[AdminReviewRead])
async def list_reviews(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminReviewRead]:
    _ = current_admin
    try:
        rows = (
            await session.execute(
                select(Review, User)
                .outerjoin(User, Review.user_id == User.id)
                .order_by(Review.created_at.desc())
            )
        ).all()
        return [
            AdminReviewRead(
                id=review.id,
                source=ReviewSource(review.source.value),
                author_name=review.author_name,
                band_label=review.band_label,
                text=review.body,
                is_visible=review.is_visible,
                created_at=review.created_at,
                user_id=review.user_id,
                user_display_name=_resolve_user_display_name(user),
                user_username=user.username if user is not None else None,
                created_by_admin_id=review.created_by_admin_id,
            )
            for review, user in rows
        ]
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load reviews.") from exc

@router.post("/reviews", response_model=AdminReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: AdminReviewCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminReviewRead:
    try:
        linked_user: User | None = None
        if payload.user_id is not None:
            linked_user = await session.get(User, payload.user_id)
            if linked_user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked user not found.")

        author_name = payload.author_name.strip() if payload.author_name else ""
        if linked_user is not None and not author_name:
            author_name = _resolve_user_display_name(linked_user) or linked_user.phone

        review = Review(
            user_id=linked_user.id if linked_user is not None else None,
            created_by_admin_id=current_admin.id,
            source=ModelReviewSource.ADMIN,
            author_name=author_name,
            band_label=payload.band_label.strip(),
            body=payload.text.strip(),
            is_visible=payload.is_visible,
        )
        session.add(review)
        await session.commit()
        await session.refresh(review)
        return AdminReviewRead(
            id=review.id,
            source=ReviewSource(review.source.value),
            author_name=review.author_name,
            band_label=review.band_label,
            text=review.body,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_id=review.user_id,
            user_display_name=_resolve_user_display_name(linked_user),
            user_username=linked_user.username if linked_user is not None else None,
            created_by_admin_id=review.created_by_admin_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create review.") from exc

@router.patch("/reviews/{review_id}/visibility", response_model=AdminReviewRead)
async def update_review_visibility(
    review_id: UUID,
    payload: AdminReviewVisibilityRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminReviewRead:
    _ = current_admin
    try:
        review = await session.get(Review, review_id)
        if review is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
        review.is_visible = payload.is_visible
        await session.commit()
        linked_user = await session.get(User, review.user_id) if review.user_id is not None else None
        return AdminReviewRead(
            id=review.id,
            source=ReviewSource(review.source.value),
            author_name=review.author_name,
            band_label=review.band_label,
            text=review.body,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_id=review.user_id,
            user_display_name=_resolve_user_display_name(linked_user),
            user_username=linked_user.username if linked_user is not None else None,
            created_by_admin_id=review.created_by_admin_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update review.") from exc
