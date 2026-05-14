from __future__ import annotations

from enum import Enum

from sqlalchemy.types import String, TypeDecorator


class EnumValueString(TypeDecorator[str]):
    """Store enum values in VARCHAR while tolerating legacy name-based rows."""

    impl = String
    cache_ok = True

    class Comparator(TypeDecorator.Comparator):
        def _legacy_literals(self, value: object) -> list[str]:
            return self.type._legacy_db_values(value)

        def _string_expr(self):
            return self.expr.cast(String())

        def __eq__(self, other: object):  # type: ignore[override]
            if other is None:
                return super().__eq__(other)
            return self._string_expr().in_(self._legacy_literals(other))

        def __ne__(self, other: object):  # type: ignore[override]
            if other is None:
                return super().__ne__(other)
            return ~self._string_expr().in_(self._legacy_literals(other))

        def in_(self, other: object):  # type: ignore[override]
            if other is None:
                return super().in_(other)
            values: list[str] = []
            for item in other:
                values.extend(self._legacy_literals(item))
            deduped = list(dict.fromkeys(values))
            return self._string_expr().in_(deduped)

    comparator_factory = Comparator

    def __init__(self, enum_cls: type[Enum], *, length: int | None = None) -> None:
        self.enum_cls = enum_cls
        self._length = length or max(
            max(len(member.name), len(str(member.value))) for member in enum_cls
        )
        super().__init__(length=self._length)

    def process_bind_param(self, value: object, dialect: object) -> str | None:
        if value is None:
            return None
        member = self._coerce_member(value)
        return str(member.value)

    def process_result_value(self, value: object, dialect: object) -> Enum | None:
        if value is None:
            return None
        return self._coerce_member(value)

    def copy(self, **kw: object) -> "EnumValueString":
        return EnumValueString(self.enum_cls, length=self._length)

    def _legacy_db_values(self, value: object) -> list[str]:
        member = self._coerce_member(value)
        return list(dict.fromkeys([str(member.value), member.name]))

    def _coerce_member(self, value: object) -> Enum:
        if isinstance(value, self.enum_cls):
            return value

        text = str(value).strip()
        for member in self.enum_cls:
            if (
                text == member.name
                or text == str(member.value)
                or text.upper() == member.name
                or text.lower() == str(member.value).lower()
            ):
                return member

        raise LookupError(
            f"{text!r} is not a valid {self.enum_cls.__name__} value."
        )
