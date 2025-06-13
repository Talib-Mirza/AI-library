from fastapi import APIRouter

from app.api.endpoints import auth, books, config, search, chat, rag#, users, admin, billing

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(books.router, prefix="/books", tags=["books"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(rag.router, prefix="/rag", tags=["rag"])
# api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
# api_router.include_router(users.router, prefix="/users", tags=["users"])
# api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
# api_router.include_router(billing.router, prefix="/billing", tags=["billing"]) 