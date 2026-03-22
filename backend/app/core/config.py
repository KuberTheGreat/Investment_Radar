from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/investment_radar"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/investment_radar"
    REDIS_URL: str = "redis://localhost:6379/0"
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"

    class Config:
        env_file = ".env"

settings = Settings()
