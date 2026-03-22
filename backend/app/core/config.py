from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/investment_radar"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/investment_radar"
    REDIS_URL: str = "redis://localhost:6379/0"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-70b-8192"

    class Config:
        env_file = ".env"

settings = Settings()
