# backend/app/models/audit_trail.py

from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.database import Base


class AuditTrail(Base):
    __tablename__ = "audit_trail"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)
    action = Column(String(10), nullable=False)  # INSERT / UPDATE / DELETE
    old_values = Column(Text, nullable=True)      # JSON string
    new_values = Column(Text, nullable=True)      # JSON string
    performed_by = Column(Integer, nullable=True)  # user_id if available
    performed_at = Column(DateTime, server_default=func.now())