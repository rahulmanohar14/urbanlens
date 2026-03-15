# backend/app/models/prediction.py

from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey, func
from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(String(50), nullable=False)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.id"))
    category = Column(String(100), nullable=True)
    prediction_date = Column(Date, nullable=False)
    predicted_value = Column(Numeric(10, 2))
    lower_bound = Column(Numeric(10, 2))
    upper_bound = Column(Numeric(10, 2))
    confidence = Column(Numeric(4, 3))
    created_at = Column(DateTime, server_default=func.now())