from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "PrimeScore"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://postgres:1112@127.0.0.1:5433/primescore"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_timeout: int = 10
    database_pool_recycle: int = 1800
    redis_url: str = "redis://127.0.0.1:6379/0"
    timezone: str = "Asia/Tashkent"
    telegram_bot_token: str = "change-me"
    telegram_webapp_url: str = "https://primescore.uz/telegram"
    telegram_webapp_auth_max_age_seconds: int = 86_400
    admin_public_url: str = "http://localhost:3001"
    jwt_secret: str = "change-me"
    jwt_refresh_secret: str = "change-me-too"
    access_token_expire_minutes: int = 43200
    refresh_token_expire_days: int = 90
    cors_origins: list[str] = Field(
        default_factory=lambda: ["*"]
    )
    payment_paused: bool = True
    gemini_api_key: str | None = None
    # AI Studio key used ONLY for the live speaking roast mode (gemini 3 live is
    # available on AI Studio, not on Vertex). Everything else stays on Vertex.
    gemini_aistudio_api_key: str | None = None
    gemini_model: str = "gemini-3-flash-preview"
    gemini_writing_model: str | None = None
    gemini_speaking_live_model: str = "gemini-live-2.5-flash-native-audio"
    gemini_speaking_roast_model: str = "gemini-3.1-flash-live-preview"
    gemini_speaking_grader_model: str = "gemini-2.5-flash-lite"
    gemini_transcription_model: str = "gemini-2.5-flash"
    gemini_thinking_level: str = "HIGH"
    gemini_max_tool_loops: int = 80
    google_genai_use_vertexai: bool = False
    google_cloud_project: str | None = None
    google_cloud_location: str = "global"
    google_cloud_live_location: str = "us-central1"
    google_application_credentials: str | None = None
    cerebras_api_key: str | None = None
    cerebras_base_url: str | None = None
    minio_endpoint: str = "127.0.0.1:9200"
    minio_access_key: str = "minio"
    minio_secret_key: str = "minio123"
    minio_secure: bool = False
    minio_bucket_test_assets: str = "test-assets"
    minio_public_base_url: str | None = None

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
