import uuid
from sqlalchemy import Column, String, Numeric, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID, ARRAY
from app.core.database import Base

class Signal(Base):
    __tablename__ = "signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), nullable=False)
    signal_type = Column(String(20), nullable=False)
    pattern_id = Column(UUID(as_uuid=True), ForeignKey("detected_patterns.id"), nullable=True)
    event_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True) # Array of FK references
    win_rate_5d = Column(Numeric(5, 2))
    win_rate_15d = Column(Numeric(5, 2))
    confluence_score = Column(Integer)
    high_confluence = Column(Boolean, default=False)
    signal_rank = Column(Numeric(8, 4))
    one_liner = Column(String)
    paragraph_explanation = Column(String)
    deep_dive = Column(String)
    source_reference = Column(String)
    low_confidence = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)
