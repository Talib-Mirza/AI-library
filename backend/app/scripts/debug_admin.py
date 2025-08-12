import asyncio
from sqlalchemy import text
from app.core.config import settings
from app.db.session import async_session_factory

async def main() -> None:
    print("INIT_ADMIN_EMAIL:", settings.INIT_ADMIN_EMAIL)
    admins = []
    async with async_session_factory() as session:
        res = await session.execute(text("SELECT id, email, is_admin, is_verified FROM users ORDER BY id ASC"))
        rows = res.fetchall()
        for row in rows:
            admins.append({"id": row[0], "email": row[1], "is_admin": row[2], "is_verified": row[3]})
    print("Users:")
    for u in admins:
        print(u)
    print("Admin count:", sum(1 for u in admins if u["is_admin"]))

if __name__ == "__main__":
    asyncio.run(main()) 