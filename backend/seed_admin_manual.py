import asyncio
from uuid import uuid4
from sqlalchemy import select
from app.db.session import get_db_session
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.core.security import hash_password

async def seed_admin():
    print("Seeding admin...")
    async for session in get_db_session():
        admin_username = "admin"
        result = await session.execute(select(Admin).where(Admin.username == admin_username))
        existing_admin = result.scalar_one_or_none()
        
        if not existing_admin:
            print(f"Creating user: {admin_username}")
            new_admin = Admin(
                id=uuid4(),
                username=admin_username,
                email="admin@primescore.local",
                password_hash=hash_password("admin"),
                role=AdminRole.SUPER_ADMIN,
                is_active=True
            )
            session.add(new_admin)
            await session.commit()
            print("Admin created successfully.")
        else:
            print(f"User {admin_username} already exists. Updating password...")
            existing_admin.password_hash = hash_password("admin")
            await session.commit()
            print("Password updated successfully.")
        break

if __name__ == "__main__":
    asyncio.run(seed_admin())
