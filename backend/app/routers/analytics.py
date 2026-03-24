from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.services.analytics_service import AnalyticsService
from app.utils.cache import get_cached, set_cached, cache_key

router = APIRouter()


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
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
    key = cache_key("categories", neighborhood_id=neighborhood_id, days=days)
    cached = get_cached(key)
    if cached:
        return cached
    svc = AnalyticsService(db)
    result = await svc.get_category_breakdown(neighborhood_id, days)
    set_cached(key, result, ttl=600)
    return result


@router.get("/time-patterns")
async def get_time_patterns(db: AsyncSession = Depends(get_db)):
    query = text("""
        SELECT
            day_of_week,
            hour,
            COUNT(*)::int AS count
        FROM crimes
        WHERE hour IS NOT NULL AND day_of_week IS NOT NULL
        GROUP BY day_of_week, hour
        ORDER BY day_of_week, hour
    """)
    result = await db.execute(query)
    return [dict(r._mapping) for r in result.fetchall()]


@router.get("/top-streets")
async def get_top_streets(
    source: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    results = {}

    if source != "crimes":
        inc_query = text("""
            SELECT street_address AS street, COUNT(*)::int AS count
            FROM incidents
            WHERE street_address IS NOT NULL AND street_address != ''
            GROUP BY street_address
            ORDER BY count DESC
            LIMIT 10
        """)
        inc_result = await db.execute(inc_query)
        results["incidents"] = [dict(r._mapping) for r in inc_result.fetchall()]

    if source != "incidents":
        crime_query = text("""
            SELECT street AS street, COUNT(*)::int AS count
            FROM crimes
            WHERE street IS NOT NULL AND street != ''
            GROUP BY street
            ORDER BY count DESC
            LIMIT 10
        """)
        crime_result = await db.execute(crime_query)
        results["crimes"] = [dict(r._mapping) for r in crime_result.fetchall()]

    return results