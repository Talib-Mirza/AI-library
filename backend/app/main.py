from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import sentry_sdk
import os
from pathlib import Path
from app.api.router import api_router
from app.core.config import settings

# Custom middleware for Google OAuth security headers
class GoogleOAuthSecurityMiddleware(BaseHTTPMiddleware):
	async def dispatch(self, request: Request, call_next):
		response = await call_next(request)
		
		# Build CSP with environment-aware connect-src
		connect_sources = ["'self'", "blob:", "data:", "https://accounts.google.com/gsi/"]
		if settings.DEBUG:
			connect_sources.append("http://localhost:5173")
		else:
			# Add the configured frontend origin if present
			if settings.EFFECTIVE_FRONTEND_URL:
				connect_sources.append(settings.EFFECTIVE_FRONTEND_URL)
		
		csp_policy = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com/gsi/client",
			"style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
			"frame-src 'self' https://accounts.google.com/gsi/",
			f"connect-src {' '.join(connect_sources)}",
			"img-src 'self' data: blob:",
			"font-src 'self' data:",
			"media-src 'self' blob: data:",
			"worker-src 'self' blob:"
		]
		response.headers["Content-Security-Policy"] = "; ".join(csp_policy)
		
		# Additional CORS headers for development
		if settings.DEBUG:
			response.headers["Access-Control-Allow-Origin"] = "*"
			response.headers["Access-Control-Allow-Methods"] = "*"
			response.headers["Access-Control-Allow-Headers"] = "*"
		
		return response

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

# Add Google OAuth security middleware first
app.add_middleware(GoogleOAuthSecurityMiddleware)

# Compute allowed origins for CORS
allowed_origins = ["*"] if settings.DEBUG else []
if not settings.DEBUG:
	if settings.EFFECTIVE_FRONTEND_URL:
		allowed_origins.append(settings.EFFECTIVE_FRONTEND_URL)

# Prepare CORS kwargs
cors_kwargs = dict(
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
	# Additional headers for Google OAuth
	expose_headers=["Cross-Origin-Opener-Policy", "Content-Security-Policy", "Access-Control-Allow-Origin"],
)
if allowed_origins:
	cors_kwargs["allow_origins"] = allowed_origins
else:
	# Fallback: allow all Vercel preview domains in production
	cors_kwargs["allow_origin_regex"] = r"https://.*vercel\.app"

# Add CORS middleware with Google OAuth support
app.add_middleware(CORSMiddleware, **cors_kwargs)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Include API router
app.include_router(api_router, prefix="/api")

# Initialize RAG service on startup
@app.on_event("startup")
async def startup_event():
	from app.services.faiss_rag_service import faiss_rag_service
	success = faiss_rag_service.initialize()
	if success:
		print("FAISS RAG service initialized successfully")
	else:
		print("FAISS RAG service initialization failed")

# Create uploads directory if it doesn't exist
uploads_path = settings.UPLOAD_DIR
if not os.path.isabs(uploads_path):
	# If relative path, make it relative to the backend directory
	backend_dir = os.path.dirname(os.path.dirname(__file__))
	uploads_path = os.path.join(backend_dir, uploads_path)
os.makedirs(uploads_path, exist_ok=True)
# Mount static file directories
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")
# Mount static files for parsed PDFs
@app.get("/")
async def health_check():
	return {"status": "ok", "version": "0.1.0"}
