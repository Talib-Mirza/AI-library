from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, JSONResponse
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


class GoogleOAuthSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        frontend_origin = settings.EFFECTIVE_FRONTEND_URL

        def _apply_headers(resp: Response) -> Response:
            connect_sources = ["'self'", "blob:", "data:", "https://accounts.google.com/gsi/"]
            if settings.DEBUG:
                connect_sources.append("http://localhost:5173")
            else:
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
                "worker-src 'self' blob:",
            ]
            resp.headers["Content-Security-Policy"] = "; ".join(csp_policy)

            if frontend_origin:
                resp.headers.setdefault("Access-Control-Allow-Origin", frontend_origin)
                resp.headers.setdefault("Vary", "Origin")
                resp.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
                resp.headers.setdefault(
                    "Access-Control-Allow-Headers",
                    "Authorization, Content-Type, Accept, X-Requested-With",
                )
                resp.headers.setdefault("Access-Control-Allow-Credentials", "true")

            if settings.DEBUG:
                resp.headers["Access-Control-Allow-Origin"] = "*"
                resp.headers["Access-Control-Allow-Methods"] = "*"
                resp.headers["Access-Control-Allow-Headers"] = "*"

            return resp

        # Preflight
        if request.method == "OPTIONS":
            preflight = Response(status_code=204)
            return _apply_headers(preflight)

        try:
            response = await call_next(request)
        except Exception:
            response = JSONResponse({"detail": "Internal Server Error"}, status_code=500)
            return _apply_headers(response)

        return _apply_headers(response)


if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=settings.APP_ENV,
    )

limiter = Limiter(key_func=lambda request: request.client.host)

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="AI-powered eLibrary SaaS platform",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

app.add_middleware(GoogleOAuthSecurityMiddleware)

allowed_origins = ["*"] if settings.DEBUG else []
if not settings.DEBUG and settings.EFFECTIVE_FRONTEND_URL:
    allowed_origins.append(settings.EFFECTIVE_FRONTEND_URL)

cors_kwargs = dict(
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Cross-Origin-Opener-Policy",
        "Content-Security-Policy",
        "Access-Control-Allow-Origin",
    ],
)
if allowed_origins:
    cors_kwargs["allow_origins"] = allowed_origins
else:
    cors_kwargs["allow_origin_regex"] = r"https://.*vercel\\.app"

app.add_middleware(CORSMiddleware, **cors_kwargs)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    from app.services.faiss_rag_service import faiss_rag_service

    success = faiss_rag_service.initialize()
    if success:
        print("FAISS RAG service initialized successfully")
    else:
        print("FAISS RAG service initialization failed")


uploads_path = settings.UPLOAD_DIR
if not os.path.isabs(uploads_path):
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    uploads_path = os.path.join(backend_dir, uploads_path)
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")


@app.get("/")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
