# backend/app/routers/predictions.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.services.prediction_service import PredictionService

router = APIRouter()


class ForecastRequest(BaseModel):
    neighborhood_id: int
    days_ahead: int = Field(default=30, ge=7, le=90)
    category: Optional[str] = None


@router.post("/forecast")
async def run_forecast(
    req: ForecastRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run Prophet forecast for a neighborhood."""
    svc = PredictionService(db)
    result = await svc.forecast_incidents(
        req.neighborhood_id, req.days_ahead, req.category
    )
    if "error" in result:
        raise HTTPException(400, detail=result["error"])
    return result


@router.get("/")
async def predictions_status():
    return {"status": "Predictions endpoint ready"}