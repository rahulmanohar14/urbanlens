from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.services.geo_service import GeoService

router = APIRouter()


@router.get("/")
async def list_neighborhoods(db: AsyncSession = Depends(get_db)):
    """All neighborhoods with summary stats."""
    query = text("""
        SELECT
            n.id, n.name, n.district, n.population,
            COALESCE(s.total_incidents, 0)::int AS total_incidents,
            COALESCE(s.total_crimes, 0)::int AS total_crimes,
            COALESCE(s.incidents_last_30d, 0)::int AS incidents_last_30d,
            COALESCE(s.avg_resolution_hours, 0)::float AS avg_resolution_hours
        FROM neighborhoods n
        LEFT JOIN mv_neighborhood_stats s ON n.id = s.neighborhood_id
        ORDER BY total_incidents DESC
    """)
    result = await db.execute(query)
    return [dict(r._mapping) for r in result.fetchall()]


@router.get("/geojson")
async def get_geojson(db: AsyncSession = Depends(get_db)):
    """GeoJSON FeatureCollection for choropleth map rendering. ⭐"""
    geo = GeoService(db)
    return await geo.get_neighborhood_geojson()


@router.get("/{neighborhood_id}")
async def get_neighborhood(
    neighborhood_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Single neighborhood with stats."""
    query = text("""
        SELECT
            n.id, n.name, n.district, n.population,
            COALESCE(s.total_incidents, 0)::int AS total_incidents,
            COALESCE(s.total_crimes, 0)::int AS total_crimes,
            COALESCE(s.avg_resolution_hours, 0)::float AS avg_resolution_hours
        FROM neighborhoods n
        LEFT JOIN mv_neighborhood_stats s ON n.id = s.neighborhood_id
        WHERE n.id = :id
    """)
    result = await db.execute(query, {"id": neighborhood_id})
    r = result.fetchone()
    if not r:
        raise HTTPException(404, "Neighborhood not found")
    return dict(r._mapping)


@router.get("/{neighborhood_id}/incidents")
async def neighborhood_incidents(
    neighborhood_id: int,
    category: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Get incidents in a specific neighborhood."""
    query = text("""
        SELECT
            i.id, i.case_id, i.category, i.status,
            i.open_dt, i.latitude, i.longitude, i.street_address
        FROM incidents i
        WHERE i.neighborhood_id = :nid
        AND (:category IS NULL OR i.category = :category)
        ORDER BY i.open_dt DESC
        LIMIT :limit
    """)
    result = await db.execute(query, {
        "nid": neighborhood_id, "category": category, "limit": limit
    })
    return [
        {
            "id": r[0], "case_id": r[1], "category": r[2], "status": r[3],
            "open_dt": r[4].isoformat() if r[4] else None,
            "latitude": float(r[5]) if r[5] else None,
            "longitude": float(r[6]) if r[6] else None,
            "street_address": r[7],
        }
        for r in result.fetchall()
    ]