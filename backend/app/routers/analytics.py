from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    """City-wide summary dashboard stats."""
    svc = AnalyticsService(db)
    return await svc.get_summary()


@router.get("/trends")
async def get_trends(
    neighborhood_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    days: int = Query(365, ge=7, le=730),
    db: AsyncSession = Depends(get_db),
):
    """Time-series incident trends with 7-day rolling average. ⭐"""
    svc = AnalyticsService(db)
    data = await svc.get_trends(neighborhood_id, category, days)
    return {
        "neighborhood_id": neighborhood_id,
        "category": category,
        "data": data,
    }


@router.get("/comparison")
async def compare_neighborhoods(
    days: int = Query(365, ge=7, le=730),
    db: AsyncSession = Depends(get_db),
):
    """Compare neighborhoods: current vs previous period with % change. ⭐"""
    svc = AnalyticsService(db)
    return await svc.compare_neighborhoods(days)


@router.get("/resolution-time")
async def get_resolution_times(db: AsyncSession = Depends(get_db)):
    """Average resolution time by category."""
    svc = AnalyticsService(db)
    return await svc.get_resolution_times()


@router.get("/categories")
async def get_categories(
    neighborhood_id: Optional[int] = Query(None),
    days: int = Query(365, ge=7, le=730),
    db: AsyncSession = Depends(get_db),
):
    """Incident counts by category."""
    svc = AnalyticsService(db)
    return await svc.get_category_breakdown(neighborhood_id, days)