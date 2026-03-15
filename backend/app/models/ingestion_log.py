# backend/app/models/ingestion_log.py

from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.database import Base


class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    records_fetched = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)