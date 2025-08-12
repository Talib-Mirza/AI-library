from typing import AsyncGenerator
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
import sys
import os
from sqlalchemy.engine import make_url
import ssl
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.config import settings

# Create async engine
url_obj = make_url(settings.DATABASE_URL)
host = (url_obj.host or "").lower()
require_ssl = host not in ("localhost", "127.0.0.1") and not host.endswith(".local") and not host.endswith(".internal")

# Build SSL context if needed
ssl_ctx = None
if require_ssl:
    ssl_ctx = ssl.create_default_context()
    if not settings.DB_SSL_VERIFY:
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DEBUG,
    connect_args={"ssl": ssl_ctx if ssl_ctx else None} if require_ssl else {},
)

# Create async session factory
async_session_factory = async_sessionmaker(
    engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Create base model class
Base = declarative_base()



async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Get a database session.
    
    Yields:
        Database session.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise 