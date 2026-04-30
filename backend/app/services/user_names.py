from __future__ import annotations


def _clean_name_part(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.strip().split())
    return normalized or None


def normalize_user_name_parts(
    first_name: str | None,
    last_name: str | None,
) -> tuple[str, str | None]:
    normalized_first = _clean_name_part(first_name) or "User"
    normalized_last = _clean_name_part(last_name)

    if normalized_last:
        suffix = f" {normalized_last.lower()}"
        lowered_first = normalized_first.lower()
        if lowered_first.endswith(suffix):
            candidate = normalized_first[: -len(suffix)].strip()
            if candidate:
                normalized_first = candidate

    return normalized_first, normalized_last


def split_full_name(full_name: str | None) -> tuple[str, str | None]:
    normalized = _clean_name_part(full_name)
    if not normalized:
        return "User", None

    first_name, _, tail = normalized.partition(" ")
    return normalize_user_name_parts(first_name, tail or None)


def resolve_login_name_parts(payload: dict) -> tuple[str, str | None]:
    if payload.get("first_name") or payload.get("last_name"):
        return normalize_user_name_parts(
            payload.get("first_name"),
            payload.get("last_name"),
        )

    return split_full_name(payload.get("name"))
