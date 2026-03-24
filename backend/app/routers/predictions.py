from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.services.prediction_service import PredictionService

router = APIRouter()


class ForecastRequest(BaseModel):
    neighborhood_id: Optional[int] = None
    days_ahead: int = Field(default=30, ge=7, le=90)
    category: Optional[str] = None
    aggregation: str = Field(default="daily")


@router.post("/forecast")
async def run_forecast(
    req: ForecastRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = PredictionService(db)
    result = await svc.forecast_incidents(
        req.neighborhood_id, req.days_ahead, req.category, req.aggregation
    )
    if "error" in result:
        raise HTTPException(400, detail=result["error"])
    return result


@router.get("/")
async def predictions_status():
    return {"status": "Predictions endpoint ready"}


@router.post("/ingest")
async def trigger_ingestion():
    try:
        from app.tasks.ingest_tasks import ingest_311_task
        task = ingest_311_task.delay(2000)
        return {"status": "queued", "task_id": str(task.id)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/refresh-views")
async def trigger_refresh():
    try:
        from app.tasks.ingest_tasks import refresh_views_task
        task = refresh_views_task.delay()
        return {"status": "queued", "task_id": str(task.id)}
    except Exception as e:
        return {"status": "error", "message": str(e)}