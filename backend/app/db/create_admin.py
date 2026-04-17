from __future__ import annotations

import argparse
import asyncio
import sys
from getpass import getpass

from app.db.session import get_session_maker
from app.models.enums import AdminRole
from app.services.admin_auth import create_admin_account


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a PrimeScore admin account.")
    parser.add_argument("--username", required=True, help="Admin username.")
    parser.add_argument("--email", required=True, help="Admin email.")
    parser.add_argument(
        "--role",
        default=AdminRole.ADMIN.value,
        choices=[AdminRole.ADMIN.value, AdminRole.SUPER_ADMIN.value],
        help="Admin role.",
    )
    parser.add_argument("--password", help="Admin password. If omitted, the command will prompt for it.")
    return parser.parse_args()


def _resolve_password(value: str | None) -> str:
    if value:
        return value

    password = getpass("Password: ")
    confirm_password = getpass("Confirm password: ")
    if password != confirm_password:
        raise ValueError("Passwords do not match.")
    return password


async def _create_admin(args: argparse.Namespace) -> None:
    password = _resolve_password(args.password)
    session_maker = get_session_maker()
    async with session_maker() as session:
        admin = await create_admin_account(
            session,
            username=args.username,
            email=args.email,
            password=password,
            role=AdminRole(args.role),
        )
    print(
        f"Created admin '{admin.username}' ({admin.email}) with role '{admin.role.value}'. ID: {admin.id}",
        file=sys.stdout,
    )


def main() -> None:
    args = _parse_args()
    try:
        asyncio.run(_create_admin(args))
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
