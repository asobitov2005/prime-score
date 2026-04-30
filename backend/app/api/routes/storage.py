from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

from app.core.config import get_settings
from app.services.object_storage import fetch_storage_object

router = APIRouter()


@router.get("/{bucket_name}/{object_path:path}")
async def get_storage_object(bucket_name: str, object_path: str) -> Response:
    settings = get_settings()
    if bucket_name != settings.minio_bucket_test_assets or not object_path.strip():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")

    try:
        payload, content_type = fetch_storage_object(bucket_name=bucket_name, object_name=object_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return Response(
        content=payload,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
