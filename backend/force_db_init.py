import asyncio
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.core.security import hash_password

DB_URL = "postgresql+asyncpg://postgres:1112@127.0.0.1:5433/primescore"

async def force_seed():
    print(f"Connecting to database at {DB_URL}...")
    engine = create_async_engine(DB_URL, future=True)
    session_maker = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
    
    async with session_maker() as session:
        admin_username = "admin"
        try:
            result = await session.execute(select(Admin).where(Admin.username == admin_username))
            existing_admin = result.scalar_one_or_none()
            
            if not existing_admin:
                print(f"Creating super admin: {admin_username}")
                new_admin = Admin(
                    id=uuid4(),
                    username=admin_username,
                    email="admin@primescore.local",
                    password_hash=hash_password("admin"),
                    role=AdminRole.SUPER_ADMIN,
                    is_active=True
                )
                session.add(new_admin)
                print("Admin added to session.")
            else:
                print(f"Admin '{admin_username}' already exists. Updating password...")
                existing_admin.password_hash = hash_password("admin")
            
            await session.commit()
            print("Successfully committed to database!")
            
        except Exception as e:
            print(f"Error: {e}")
            await session.rollback()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(force_seed())
