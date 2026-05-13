from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
import json
from mimetypes import guess_extension
import os
from pathlib import Path, PurePosixPath
import tempfile
from urllib.parse import quote
from uuid import uuid4

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings

LOCAL_STORAGE_PREFIX = "_local"
LOCAL_STORAGE_ROOT = Path(
    os.environ.get("PRIMESCORE_LOCAL_STORAGE_ROOT")
    or str(Path(tempfile.gettempdir()) / "primescore-storage")
)


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


def _local_storage_paths(bucket_name: str, object_name: str) -> tuple[Path, Path]:
    payload_path = (LOCAL_STORAGE_ROOT / bucket_name / object_name).resolve()
    metadata_path = payload_path.with_suffix(payload_path.suffix + ".meta.json")
    bucket_root = (LOCAL_STORAGE_ROOT / bucket_name).resolve()
    if bucket_root not in payload_path.parents and payload_path != bucket_root:
        raise RuntimeError("Invalid local storage path.")
    return payload_path, metadata_path


def _write_local_storage_asset(*, bucket_name: str, object_name: str, content: bytes, content_type: str) -> str:
    local_object_name = f"{LOCAL_STORAGE_PREFIX}/{object_name.lstrip('/')}"
    payload_path, metadata_path = _local_storage_paths(bucket_name, local_object_name)
    payload_path.parent.mkdir(parents=True, exist_ok=True)
    payload_path.write_bytes(content)
    metadata_path.write_text(json.dumps({"content_type": content_type}), encoding="utf-8")
    return build_storage_asset_path(bucket_name, local_object_name)


def _read_local_storage_asset(*, bucket_name: str, object_name: str) -> tuple[bytes, str]:
    payload_path, metadata_path = _local_storage_paths(bucket_name, object_name)
    if not payload_path.exists():
        raise FileNotFoundError(object_name)
    payload = payload_path.read_bytes()
    content_type = "application/octet-stream"
    if metadata_path.exists():
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            content_type = str(metadata.get("content_type") or content_type)
        except Exception:
            content_type = "application/octet-stream"
    return payload, content_type


def _upload_with_fallback(*, bucket_name: str, object_name: str, content: bytes, content_type: str) -> str:
    client = _build_client()
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
        client.put_object(
            bucket_name,
            object_name,
            BytesIO(content),
            length=len(content),
            content_type=content_type,
        )
        return build_storage_asset_path(bucket_name, object_name)
    except Exception:
        return _write_local_storage_asset(
            bucket_name=bucket_name,
            object_name=object_name,
            content=content,
            content_type=content_type,
        )


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
    now = datetime.now(UTC)
    suffix = _guess_suffix(content_type, filename)
    object_name = (
        f"diagram-images/{now:%Y/%m/%d}/"
        f"{uuid4().hex}{suffix}"
    )
    return _upload_with_fallback(
        bucket_name=bucket_name,
        object_name=object_name,
        content=content,
        content_type=content_type,
    )


def upload_user_avatar_image(*, content: bytes, filename: str, content_type: str) -> str:
    settings = get_settings()
    bucket_name = settings.minio_bucket_test_assets
    now = datetime.now(UTC)
    suffix = _guess_suffix(content_type, filename)
    object_name = (
        f"user-avatars/{now:%Y/%m/%d}/"
        f"{uuid4().hex}{suffix}"
    )
    return _upload_with_fallback(
        bucket_name=bucket_name,
        object_name=object_name,
        content=content,
        content_type=content_type,
    )


def upload_test_audio_asset(*, content: bytes, filename: str, content_type: str) -> str:
    settings = get_settings()
    bucket_name = settings.minio_bucket_test_assets
    now = datetime.now(UTC)
    suffix = _guess_suffix(content_type, filename)
    object_name = (
        f"audio-assets/{now:%Y/%m/%d}/"
        f"{uuid4().hex}{suffix}"
    )
    return _upload_with_fallback(
        bucket_name=bucket_name,
        object_name=object_name,
        content=content,
        content_type=content_type,
    )


def fetch_storage_object(*, bucket_name: str, object_name: str) -> tuple[bytes, str]:
    if PurePosixPath(object_name).parts[:1] == (LOCAL_STORAGE_PREFIX,):
        return _read_local_storage_asset(bucket_name=bucket_name, object_name=object_name)

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
