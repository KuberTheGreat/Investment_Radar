import uuid
from sqlalchemy import Column, String, Numeric, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from app.core.database import Base


class DetectedPattern(Base):
    __tablename__ = "detected_patterns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), nullable=False)
    pattern_name = Column(String(50), nullable=False)
    signal_direction = Column(String(10), nullable=False)
    timeframe = Column(String(5), nullable=False)
    detected_at = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    symbol = Column(String(20), primary_key=True)
    pattern_name = Column(String(50), primary_key=True)
    win_rate_5d = Column(Numeric(5, 2))
    win_rate_15d = Column(Numeric(5, 2))
    avg_gain_5d = Column(Numeric(7, 4))
    avg_gain_15d = Column(Numeric(7, 4))
    sample_count = Column(Integer)
    low_confidence = Column(Boolean, default=False)
    last_computed_at = Column(TIMESTAMP(timezone=True))
