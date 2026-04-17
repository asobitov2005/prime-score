from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID


def _serialize_json_like(value: object) -> object:
    if isinstance(value, dict):
        return {str(key): _serialize_json_like(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize_json_like(item) for item in value]
    if isinstance(value, tuple):
        return [_serialize_json_like(item) for item in value]
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, Enum):
        return value.value
    return value


def freeze_test_snapshot(payload: dict) -> dict:
    return _serialize_json_like(deepcopy(payload))  # type: ignore[return-value]
