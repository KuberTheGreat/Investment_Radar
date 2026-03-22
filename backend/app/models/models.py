from sqlalchemy import Column, String, Numeric, BigInteger, Boolean, Integer, DateTime, ForeignKey, Text, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
import uuid
from .database import Base

class OHLCVCandle(Base):
    __tablename__ = 'ohlcv_candles'

    symbol = Column(String(20), primary_key=True)
    timestamp = Column(DateTime(timezone=True), primary_key=True)
    timeframe = Column(String(5), primary_key=True)
    open = Column(Numeric(12, 4))
    high = Column(Numeric(12, 4))
    low = Column(Numeric(12, 4))
    close = Column(Numeric(12, 4))
    volume = Column(BigInteger)
    is_stale = Column(Boolean, default=False)

class DetectedPattern(Base):
    __tablename__ = 'detected_patterns'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), index=True)
    pattern_name = Column(String(50))
    signal_direction = Column(String(10))
    timeframe = Column(String(5))
    detected_at = Column(DateTime(timezone=True), index=True)
    created_at = Column(DateTime(timezone=True))

class BacktestResult(Base):
    __tablename__ = 'backtest_results'

    symbol = Column(String(20), primary_key=True)
    pattern_name = Column(String(50), primary_key=True)
    win_rate_5d = Column(Numeric(5, 2))
    win_rate_15d = Column(Numeric(5, 2))
    avg_gain_5d = Column(Numeric(7, 4))
    avg_gain_15d = Column(Numeric(7, 4))
    sample_count = Column(Integer)
    low_confidence = Column(Boolean)
    last_computed_at = Column(DateTime(timezone=True))

class CorporateEvent(Base):
    __tablename__ = 'corporate_events'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), index=True)
    event_type = Column(String(30))
    event_date = Column(Date, index=True)
    party_name = Column(String(200))
    quantity = Column(BigInteger)
    price_per_share = Column(Numeric(12, 4))
    total_value_cr = Column(Numeric(12, 4))
    is_anomaly = Column(Boolean, default=False)
    source_reference = Column(Text)
    raw_data = Column(JSONB)

class Signal(Base):
    __tablename__ = 'signals'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), index=True)
    signal_type = Column(String(20))
    pattern_id = Column(UUID(as_uuid=True), ForeignKey('detected_patterns.id'), nullable=True)
    event_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)  # Using array of uuids
    win_rate_5d = Column(Numeric(5, 2))
    win_rate_15d = Column(Numeric(5, 2))
    confluence_score = Column(Integer)
    high_confluence = Column(Boolean, default=False)
    signal_rank = Column(Numeric(8, 4))
    one_liner = Column(Text, nullable=True)
    paragraph_explanation = Column(Text, nullable=True)
    deep_dive = Column(Text, nullable=True)
    source_reference = Column(Text, nullable=True)
    low_confidence = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True))

    pattern = relationship("DetectedPattern")
