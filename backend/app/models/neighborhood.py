# backend/app/models/neighborhood.py

from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.database import Base


class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    district = Column(String(100), nullable=True)
    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)
    population = Column(Integer, nullable=True)
    area_sq_km = Column(Numeric(10, 4), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    incidents = relationship("Incident", back_populates="neighborhood")
    crimes = relationship("Crime", back_populates="neighborhood")