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
    """Create initial admin user if no users exist."""
    try:
        async with async_session_factory() as session:
            # Check if any users exist
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            
            if count == 0:
                print("Creating initial admin user...")
                user_service = UserService()
                admin_user = User(
                    email="admin@ailibrary.com",
                    full_name="Admin User",
                    hashed_password=user_service.get_password_hash("admin123"),  # Change this password!
                    is_active=True,
                    is_admin=True,
                    is_verified=True,
                    subscription_status="active",  # Set subscription status for admin
                    subscription_tier="premium"  # Set subscription tier for admin
                )
                
                session.add(admin_user)
                await session.commit()
                print("Initial admin user created successfully!")
                print("Email: admin@ailibrary.com")
                print("Password: admin123")
                print("Please change these credentials after first login!")
            else:
                print("Users already exist, updating subscription status...")
                # Update existing users to have active subscriptions
                await session.execute(
                    text("""
                        UPDATE users 
                        SET subscription_status = 'active', 
                            subscription_tier = 'basic' 
                        WHERE subscription_status IS NULL
                    """)
                )
                await session.commit()
                print("Updated subscription status for existing users")
    
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

        async with async_session_factory() as session:
            # Check if any users exist
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            
            if count == 0:
                print("Creating initial admin user...")
                user_service = UserService()
                admin_user = User(
                    email="admin@ailibrary.com",
                    full_name="Admin User",
                    hashed_password=user_service.get_password_hash("admin123"),  # Change this password!
                    is_active=True,
                    is_admin=True,
                    is_verified=True,
                    subscription_status="active",  # Set subscription status for admin
                    subscription_tier="premium"  # Set subscription tier for admin
                )
                
                session.add(admin_user)
                await session.commit()
                print("Initial admin user created successfully!")
                print("Email: admin@ailibrary.com")
                print("Password: admin123")
                print("Please change these credentials after first login!")
            else:
                print("Users already exist, updating subscription status...")
                # Update existing users to have active subscriptions
                await session.execute(
                    text("""
                        UPDATE users 
                        SET subscription_status = 'active', 
                            subscription_tier = 'basic' 
                        WHERE subscription_status IS NULL
                    """)
                )
                await session.commit()
                print("Updated subscription status for existing users")
    
    except Exception as e:
        print(f"Failed to initialize database: {str(e)}")
        raise e

if __name__ == "__main__":
    """Run the database initialization script."""
    print("Starting database initialization...")
    asyncio.run(init_db())
    print("Database initialization completed!") 