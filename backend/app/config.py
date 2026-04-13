from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    FRONTEND_URL: str = "http://localhost:3000"

    # Boston Open Data API
    BOSTON_API_BASE: str = "https://data.boston.gov/api/3/action/datastore_search"
    RESOURCE_311_2026: str = "1a0b420d-99f1-4887-9851-990b2a5a6e17"   # live 2026 dataset
    RESOURCE_311_2025: str = "9d7c2214-4709-478a-a2e8-fb2020a5bb94"   # kept for backfill reference
    RESOURCE_CRIME: str = "b973d8cb-eeb2-4e7e-99da-c92938efc9c0"      # continuously updated

    class Config:
        env_file = ".env"


settings = Settings()