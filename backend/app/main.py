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
print(f"Current working directory: {os.getcwd()}")
print(f"Settings UPLOAD_DIR: {settings.UPLOAD_DIR}")
uploads_path = settings.UPLOAD_DIR
if not os.path.isabs(uploads_path):
    # If relative path, make it relative to the backend directory
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    uploads_path = os.path.join(backend_dir, uploads_path)
print(f"Final uploads path: {uploads_path}")
os.makedirs(uploads_path, exist_ok=True)
# Mount static file directories
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")
# Mount static files for parsed PDFs
@app.get("/")
async def health_check():
    return {"status": "ok", "version": "0.1.0"} 
