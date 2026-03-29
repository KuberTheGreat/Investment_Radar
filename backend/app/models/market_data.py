from sqlalchemy import Column, String, Numeric, BigInteger, Boolean, DateTime
from sqlalchemy.dialects.postgresql import TIMESTAMP, JSONB
from app.core.database import Base


class OHLCCandle(Base):
    __tablename__ = "ohlcv_candles"

    symbol = Column(String(20), primary_key=True)
    timestamp = Column(TIMESTAMP(timezone=True), primary_key=True)
    timeframe = Column(String(5), primary_key=True)
    open = Column(Numeric(12, 4), nullable=False)
    high = Column(Numeric(12, 4), nullable=False)
    low = Column(Numeric(12, 4), nullable=False)
    close = Column(Numeric(12, 4), nullable=False)
    volume = Column(BigInteger, nullable=False)
    is_stale = Column(Boolean, default=False)
