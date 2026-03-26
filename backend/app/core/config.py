from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://vedantkulkarni@localhost:5432/investment_radar"
    SYNC_DATABASE_URL: str = "postgresql://vedantkulkarni@localhost:5432/investment_radar"
    REDIS_URL: str = "redis://localhost:6379/0"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
