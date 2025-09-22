from fastapi import APIRouter

from app.api.endpoints import auth, books, rag, tts, config
from app.api.endpoints import billing as billing_endpoints
from app.api.endpoints import stripe_webhook
from app.api.endpoints import admin as admin_endpoints
from app.core.config import settings
from app.api.endpoints import stt as stt_endpoints

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(books.router, prefix="/books", tags=["books"])
api_router.include_router(rag.router, prefix="/rag", tags=["rag"])
api_router.include_router(tts.router, prefix="/tts", tags=["tts"])
api_router.include_router(stt_endpoints.router, prefix="/stt", tags=["stt"])
# Only expose config routes in DEBUG
if settings.DEBUG:
    api_router.include_router(config.router, prefix="/config", tags=["config"]) 

api_router.include_router(billing_endpoints.router, prefix="/billing", tags=["billing"])
api_router.include_router(stripe_webhook.router, prefix="/stripe", tags=["stripe"])
api_router.include_router(admin_endpoints.router, prefix="/admin", tags=["admin"])