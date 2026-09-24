from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.services.click_payments import process_click_callback

router = APIRouter()


@router.post("/callback")
async def click_callback(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str | int]:
    form = await request.form()
    if any(len(form.getlist(key)) != 1 for key in form.keys()):
        return {"error": -8, "error_note": "Duplicate form fields"}
    fields = {key: str(value) for key, value in form.items()}
    if any(len(value) > 255 for value in fields.values()):
        return {"error": -8, "error_note": "Invalid request"}
    try:
        return await process_click_callback(session, fields)
    except Exception:
        await session.rollback()
        return {
            "click_trans_id": fields.get("click_trans_id", ""),
            "merchant_trans_id": fields.get("merchant_trans_id", ""),
            "error": -8,
            "error_note": "Payment could not be processed",
        }
