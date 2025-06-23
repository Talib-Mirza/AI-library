from pathlib import Path
import os
from typing import List, Optional, Union

from pydantic import AnyHttpUrl, PostgresDsn, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Configuration
    APP_NAME: str = "AI_Library"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Development Features
    ENABLE_DEV_MOCK_AUTH: bool = True  # Enable mock authentication in dev mode
    
    # Security
    SECRET_KEY: str
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ADMIN_SECRET_KEY: str = "your-super-secret-admin-key"  # Change this in production!
    
    # CORS
    CORS_ORIGINS: List[AnyHttpUrl] = []

    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # For development, allow all origins if CORS_ORIGINS is empty
    def get_cors_origins(self, origins: List[AnyHttpUrl] = None) -> List[str]:
        """
        Helper function to get CORS origins for FastAPI setup.
        In development mode, if no origins are provided, allows all origins.
        """
        if origins:
            return origins
        return ["*"] if self.APP_ENV == "development" else []
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis and Celery
    REDIS_URL: str
    
    # AI APIs
    OPENAI_API_KEY: str
    GOOGLE_API_KEY: str 
    
    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_PRICE_ID: str
    
    # Other Services
    SENTRY_DSN: Optional[str] = None
    
    # File Upload Settings
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "epub", "txt"]
    
    # Vector Store Settings
    VECTOR_DB_PATH: str = "vector_db"
    WEAVIATE_URL: Optional[str] = None
    WEAVIATE_API_KEY: Optional[str] = None
    
    # LangChain Settings
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    MAX_CONTEXT_LENGTH: int = 4000
    
    CHROMA_DB_PATH: str = "chroma_db"
    
    class Config:
        env_file = str(Path(__file__).resolve().parents[3] / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create settings instance
settings = Settings() 