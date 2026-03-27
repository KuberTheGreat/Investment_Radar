from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://vedantkulkarni@localhost:5432/investment_radar"
    SYNC_DATABASE_URL: str = "postgresql://vedantkulkarni@localhost:5432/investment_radar"
    REDIS_URL: str = "redis://localhost:6379/0"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"
    GROQ_API_KEY: str = ""

    # ── Angel One SmartAPI ──────────────────────────────────────────────────
    ANGELONE_API_KEY: str = ""
    ANGELONE_API_SECRET: str = ""
    # Client credentials for direct (non-OAuth) session generation
    ANGELONE_CLIENT_ID: str = ""       # Your Angel One login username
    ANGELONE_PASSWORD: str = ""        # Your Angel One login password
    ANGELONE_TOTP_KEY: str = ""        # Base32 TOTP secret from Angel One 2FA setup

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
