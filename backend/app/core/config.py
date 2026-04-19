from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "PrimeScore"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://postgres:1112@127.0.0.1:5433/primescore"
    redis_url: str = "redis://127.0.0.1:6379/0"
    timezone: str = "Asia/Tashkent"
    telegram_bot_token: str = "change-me"
    jwt_secret: str = "change-me"
    jwt_refresh_secret: str = "change-me-too"
    access_token_expire_minutes: int = 21600
    refresh_token_expire_days: int = 30
    cors_origins: list[str] = Field(
        default_factory=lambda: ["*"]
    )
    payment_paused: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def celery_broker_url(self) -> str:
        return self.redis_url

    @property
    def celery_result_backend(self) -> str:
        return self.redis_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
