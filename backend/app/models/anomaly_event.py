# backend/app/models/anomaly_event.py

from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey, func
from app.database import Base


class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.id"))
    category = Column(String(100), nullable=True)
    detected_date = Column(Date, nullable=False)
    actual_count = Column(Integer)
    expected_count = Column(Numeric(10, 2))
    anomaly_score = Column(Numeric(6, 4))
    severity = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())