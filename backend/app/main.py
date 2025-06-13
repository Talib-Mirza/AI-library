from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request
import sentry_sdk
import os
from pathlib import Path

from app.api.router import api_router
from app.core.config import settings

# Initialize Sentry for error monitoring (if configured)
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=settings.APP_ENV,
    )

# Initialize rate limiter
limiter = Limiter(key_func=lambda request: request.client.host)

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="AI-powered eLibrary SaaS platform",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Include API router
app.include_router(api_router, prefix="/api")

# Create uploads directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount static file directories
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Mount static files for parsed PDFs
parsed_pdfs_dir = Path("parsed_pdfs")
parsed_pdfs_dir.mkdir(exist_ok=True)
app.mount("/api/pdf/parsed", StaticFiles(directory="parsed_pdfs"), name="parsed_pdfs")

@app.get("/")
async def health_check():
    return {"status": "ok", "version": "0.1.0"} 