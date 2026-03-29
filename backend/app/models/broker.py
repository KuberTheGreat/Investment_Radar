"""
Broker Session Model — Stores Angel One SmartAPI session tokens per user.
Tokens are refreshed daily by the APScheduler job in main.py.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class BrokerSession(Base):
    """Persists Angel One JWT tokens vaulted after successful authentication."""

    __tablename__ = "broker_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Angel One client code (login username)
    client_code = Column(String(50), unique=True, nullable=False, index=True)
    # Live access token (JWT) — expires after 24h, refreshed daily by scheduler
    access_token = Column(Text, nullable=True)
    # Refresh token for extending sessions without re-login
    refresh_token = Column(Text, nullable=True)
    # Feed token for Angel One WebSocket market data stream
    feed_token = Column(Text, nullable=True)
    # Whether this session is currently valid
    is_active = Column(Boolean, default=False, nullable=False)
    # Timestamps
    authenticated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<BrokerSession client={self.client_code} active={self.is_active}>"
