# backend/app/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    FRONTEND_URL: str = "http://localhost:3000"
    BOSTON_API_BASE: str = "https://data.boston.gov/api/3/action/datastore_search"
    RESOURCE_311: str = "8048697b-ad64-4bfc-b090-ee00169f2323"
    RESOURCE_CRIME: str = "12cb3883-56f5-47de-afa5-3b1cf61b257b"

    class Config:
        env_file = ".env"


settings = Settings()