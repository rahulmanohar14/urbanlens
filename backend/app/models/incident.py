# backend/app/models/incident.py

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Numeric, func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), unique=True, nullable=False, index=True)
    open_dt = Column(DateTime, nullable=False, index=True)
    closed_dt = Column(DateTime, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="Open", index=True)
    source = Column(String(50), nullable=True)
    location = Column(Geometry("POINT", srid=4326), nullable=True, index=True)
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))
    street_address = Column(String(300), nullable=True)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.id"), index=True)
    ward = Column(String(10), nullable=True)
    ingested_at = Column(DateTime, server_default=func.now())

    neighborhood = relationship("Neighborhood", back_populates="incidents")