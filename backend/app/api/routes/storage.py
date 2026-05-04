from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import Response

from app.core.config import get_settings
from app.services.object_storage import fetch_storage_object

router = APIRouter()


def _parse_byte_range(range_header: str | None, payload_size: int) -> tuple[int, int] | None:
    if not range_header:
        return None

    value = range_header.strip()
    if not value.startswith("bytes="):
        return None

    start_text, _, end_text = value.removeprefix("bytes=").partition("-")

    try:
        if not start_text:
            suffix_size = int(end_text)
            if suffix_size <= 0:
                return None
            start = max(payload_size - suffix_size, 0)
            end = payload_size - 1
        else:
            start = int(start_text)
            end = int(end_text) if end_text else payload_size - 1
    except ValueError:
        return None

    if payload_size <= 0 or start < 0 or end < start or start >= payload_size:
        return None

    end = min(end, payload_size - 1)
    return start, end


@router.get("/{bucket_name}/{object_path:path}")
async def get_storage_object(
    bucket_name: str,
    object_path: str,
    range_header: str | None = Header(default=None, alias="Range"),
) -> Response:
    settings = get_settings()
    if bucket_name != settings.minio_bucket_test_assets or not object_path.strip():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")

    try:
        payload, content_type = fetch_storage_object(bucket_name=bucket_name, object_name=object_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    payload_size = len(payload)
    response_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
    }
    byte_range = _parse_byte_range(range_header, payload_size)
    if byte_range is not None:
        start, end = byte_range
        chunk = payload[start : end + 1]
        response_headers["Content-Range"] = f"bytes {start}-{end}/{payload_size}"
        response_headers["Content-Length"] = str(len(chunk))
        return Response(
            content=chunk,
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            media_type=content_type,
            headers=response_headers,
        )

    response_headers["Content-Length"] = str(payload_size)
    return Response(
        content=payload,
        media_type=content_type,
        headers=response_headers,
    )
