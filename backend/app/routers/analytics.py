from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.services.analytics_service import AnalyticsService
from app.utils.cache import get_cached, set_cached, cache_key

router = APIRouter()


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    """City-wide summary dashboard stats. Cached for 15 minutes."""
    key = cache_key("summary")
    cached = get_cached(key)
    if cached:
        return cached

    svc = AnalyticsService(db)
    result = await svc.get_summary()
    set_cached(key, result, ttl=900)
    return result


@router.get("/trends")
async def get_trends(
    neighborhood_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    days: int = Query(365, ge=7, le=730),
    db: AsyncSession = Depends(get_db),
):
    """Time-series trends. Cached for 10 minutes."""
    key = cache_key("trends", neighborhood_id=neighborhood_id, category=category, days=days)
    cached = get_cached(key)
    if cached:
        return cached

    svc = AnalyticsService(db)
    data = await svc.get_trends(neighborhood_id, category, days)
    result = {"neighborhood_id": neighborhood_id, "category": category, "data": data}
    set_cached(key, result, ttl=600)
    return result


@router.get("/comparison")
async def compare_neighborhoods(
    days: int = Query(365, ge=7, le=730),
    db: AsyncSession = Depends(get_db),
):
    """Neighborhood comparison. Cached for 15 minutes."""
    key = cache_key("comparison", days=days)
    cached = get_cached(key)
    if cached:
        return cached

    svc = AnalyticsService(db)
    result = await svc.compare_neighborhoods(days)
    set_cached(key, result, ttl=900)
    return result


@router.get("/resolution-time")
async def get_resolution_times(db: AsyncSession = Depends(get_db)):
    """Resolution times. Cached for 30 minutes."""
    key = cache_key("resolution")
    cached = get_cached(key)
    if cached:
        return cached

    svc = AnalyticsService(db)
    result = await svc.get_resolution_times()
    set_cached(key, result, ttl=1800)
    return result


@router.get("/categories")
async def get_categories(
    neighborhood_id: Optional[int] = Query(None),
    days: int = Query(365, ge=7, le=730),
    db: AsyncSession = Depends(get_db),
):
    """Category breakdown. Cached for 10 minutes."""
    key = cache_key("categories", neighborhood_id=neighborhood_id, days=days)
    cached = get_cached(key)
    if cached:
        return cached

    svc = AnalyticsService(db)
    result = await svc.get_category_breakdown(neighborhood_id, days)
    set_cached(key, result, ttl=600)
    return result