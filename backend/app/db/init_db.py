import asyncio
import sys
import os
from pathlib import Path
from sqlalchemy import text

# Add parent directory to path so we can import the app modules
sys.path.append(str(Path(__file__).resolve().parents[2]))

print("Path added to sys.path")

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import engine, Base, async_session_factory
from app.models.user import User
from app.models.book import Book, Bookmark, Highlight, Annotation
from app.core.config import settings
from app.services.user import UserService
    

async def create_initial_admin() -> None:
    """Create initial admin user if no admin exists."""
    try:
        async with async_session_factory() as session:
            # Check if any admin users exist
            result = await session.execute(text("SELECT COUNT(*) FROM users WHERE is_admin = :flag"), {"flag": True})
            admin_count = result.scalar() or 0
            
            if admin_count == 0:
                print("Creating initial admin user...")
                user_service = UserService()
                email = settings.INIT_ADMIN_EMAIL or "admin@thesyx.com"
                password = settings.INIT_ADMIN_PASSWORD or "Dragonborn420!!"
                admin_user = User(
                    email=email,
                    full_name="Admin User",
                    hashed_password=user_service.get_password_hash(password),  # Change this password!
                    is_active=True,
                    is_admin=True,
                    is_verified=True,
                    subscription_status="active",
                    subscription_tier="pro"
                )
                
                session.add(admin_user)
                await session.commit()
                print("Initial admin user created successfully!")
                print(f"Email: {email}")
                print(f"Password: {password}")
                print("Please change these credentials after first login and set secure values in .env (INIT_ADMIN_EMAIL/INIT_ADMIN_PASSWORD)!")
            else:
                print("Admin user already exists. Skipping admin creation.")
    
    except Exception as e:
        print(f"Failed to create initial admin: {str(e)}")
        raise e

async def init_db() -> None:
    """Initialize the database with required initial data."""
    print("Initializing database...")
    
    try:
        # Create all tables
        print("Creating database tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully!")

        # Ensure an admin account exists
        await create_initial_admin()
    
    except Exception as e:
        print(f"Failed to initialize database: {str(e)}")
        raise e

if __name__ == "__main__":
    """Run the database initialization script."""
    print("Starting database initialization...")
    asyncio.run(init_db())
    print("Database initialization completed!") 