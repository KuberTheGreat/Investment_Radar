import uuid
from sqlalchemy import Column, String, Numeric, BigInteger, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

class CorporateEvent(Base):
    __tablename__ = "corporate_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), nullable=False)
    event_type = Column(String(30), nullable=False)
    event_date = Column(Date, nullable=False)
    party_name = Column(String(200))
    quantity = Column(BigInteger)
    price_per_share = Column(Numeric(12, 4))
    total_value_cr = Column(Numeric(12, 4))
    is_anomaly = Column(Boolean, default=False)
    source_reference = Column(String)
    raw_data = Column(JSONB)
