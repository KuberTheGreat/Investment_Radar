from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://vedantkulkarni@localhost:5432/investment_radar"
    SYNC_DATABASE_URL: str = "postgresql://vedantkulkarni@localhost:5432/investment_radar"
    REDIS_URL: str = "redis://localhost:6379/0"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = ".env"

settings = Settings()
