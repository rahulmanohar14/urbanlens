# backend/app/models/crime.py

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.database import Base


class Crime(Base):
    __tablename__ = "crimes"

    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String(50), unique=True, nullable=False, index=True)
    occurred_on = Column(DateTime, nullable=False, index=True)
    offense_code = Column(String(10), nullable=True)
    offense_description = Column(String(300), nullable=True)
    district = Column(String(10), nullable=True)
    shooting = Column(Boolean, default=False)
    location = Column(Geometry("POINT", srid=4326), nullable=True, index=True)
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))
    street = Column(String(300), nullable=True)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.id"), index=True)
    ucr_part = Column(String(20), nullable=True)
    day_of_week = Column(String(15), nullable=True)
    hour = Column(Integer, nullable=True)
    ingested_at = Column(DateTime, server_default=func.now())

    neighborhood = relationship("Neighborhood", back_populates="crimes")