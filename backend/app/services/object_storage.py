from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from mimetypes import guess_extension
from pathlib import PurePosixPath
from urllib.parse import quote
from uuid import uuid4

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings


def _build_client() -> Minio:
    settings = get_settings()
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def _guess_suffix(content_type: str, filename: str) -> str:
    suffix = PurePosixPath(filename).suffix.strip()
    if suffix:
        return suffix.lower()
    guessed = guess_extension(content_type.split(";")[0].strip())
    return guessed or ".bin"


def build_storage_asset_path(bucket_name: str, object_name: str) -> str:
    return f"/api/storage/{quote(bucket_name)}/{quote(object_name, safe='/')}"


def normalize_storage_asset_path(raw_value: str | None) -> str:
    value = str(raw_value or "").strip()
    if not value:
        return ""
    if value.startswith("/api/storage/"):
        return value

    settings = get_settings()
    bucket_name = settings.minio_bucket_test_assets
    expected_prefixes = [
        f"http://{settings.minio_endpoint}/{bucket_name}/",
        f"https://{settings.minio_endpoint}/{bucket_name}/",
    ]
    if settings.minio_public_base_url:
        public_base = settings.minio_public_base_url.rstrip("/")
        expected_prefixes.extend([
            f"{public_base}/{bucket_name}/",
            f"{public_base}/storage/{bucket_name}/",
        ])

    for prefix in expected_prefixes:
        if value.startswith(prefix):
            object_name = value.removeprefix(prefix).lstrip("/")
            return build_storage_asset_path(bucket_name, object_name)

    return value


def upload_test_diagram_image(*, content: bytes, filename: str, content_type: str) -> str:
    settings = get_settings()
    bucket_name = settings.minio_bucket_test_assets
    client = _build_client()
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
    except S3Error as exc:
        raise RuntimeError(f"MinIO bucket error: {exc.code}") from exc

    now = datetime.now(UTC)
    suffix = _guess_suffix(content_type, filename)
    object_name = (
        f"diagram-images/{now:%Y/%m/%d}/"
        f"{uuid4().hex}{suffix}"
    )
    try:
        client.put_object(
            bucket_name,
            object_name,
            BytesIO(content),
            length=len(content),
            content_type=content_type,
        )
    except S3Error as exc:
        raise RuntimeError(f"MinIO upload error: {exc.code}") from exc

    return build_storage_asset_path(bucket_name, object_name)


def fetch_storage_object(*, bucket_name: str, object_name: str) -> tuple[bytes, str]:
    client = _build_client()
    try:
        response = client.get_object(bucket_name, object_name)
    except S3Error as exc:
        if exc.code in {"NoSuchKey", "NoSuchBucket", "NoSuchObject"}:
            raise FileNotFoundError(object_name) from exc
        raise RuntimeError(f"MinIO fetch error: {exc.code}") from exc

    try:
        payload = response.read()
        content_type = response.headers.get("Content-Type", "application/octet-stream")
    finally:
        response.close()
        response.release_conn()

    return payload, content_type
