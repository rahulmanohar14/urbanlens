# backend/app/routers/incidents.py

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.services.geo_service import GeoService

router = APIRouter()


@router.get("/")
async def list_incidents(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    neighborhood_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List incidents with filtering and pagination."""
    # Build query dynamically to avoid asyncpg NULL parameter issues
    where_clauses = []
    params = {"limit": limit, "offset": offset}

    if category:
        where_clauses.append("i.category = :category")
        params["category"] = category
    if status:
        where_clauses.append("i.status = :status")
        params["status"] = status
    if neighborhood_id is not None:
        where_clauses.append("i.neighborhood_id = :neighborhood_id")
        params["neighborhood_id"] = neighborhood_id

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    query = text(f"""
        SELECT
            i.id, i.case_id, i.category, i.subcategory, i.description,
            i.status, i.open_dt, i.closed_dt, i.source,
            i.latitude, i.longitude, i.street_address, i.ward,
            n.name AS neighborhood_name
        FROM incidents i
        LEFT JOIN neighborhoods n ON i.neighborhood_id = n.id
        {where_sql}
        ORDER BY i.open_dt DESC
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(query, params)
    rows = result.fetchall()

    data = [
        {
            "id": r[0], "case_id": r[1], "category": r[2],
            "subcategory": r[3], "description": r[4], "status": r[5],
            "open_dt": r[6].isoformat() if r[6] else None,
            "closed_dt": r[7].isoformat() if r[7] else None,
            "source": r[8],
            "latitude": float(r[9]) if r[9] else None,
            "longitude": float(r[10]) if r[10] else None,
            "street_address": r[11], "ward": r[12],
            "neighborhood_name": r[13],
        }
        for r in rows
    ]

    # Count query
    count_query = text(f"""
        SELECT COUNT(*) FROM incidents i {where_sql}
    """)
    count_result = await db.execute(count_query, params)
    total = count_result.scalar()

    return {"data": data, "total": total}


@router.get("/nearby")
async def find_nearby(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: int = Query(500, ge=50, le=5000),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Find incidents within a radius — PostGIS ST_DWithin."""
    geo = GeoService(db)
    results = await geo.find_incidents_nearby(lat, lng, radius, category, limit)
    return {
        "data": results,
        "center": {"lat": lat, "lng": lng},
        "radius_meters": radius,
        "total_found": len(results),
    }


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all incident categories with counts."""
    query = text("""
        SELECT category, COUNT(*)::int AS count
        FROM incidents
        GROUP BY category
        ORDER BY count DESC
    """)
    result = await db.execute(query)
    return [dict(r._mapping) for r in result.fetchall()]


@router.get("/heatmap")
async def get_heatmap(
    category: Optional[str] = Query(None),
    days: int = Query(365, ge=1, le=730),
    db: AsyncSession = Depends(get_db),
):
    """Get lat/lng points for heatmap rendering."""
    geo = GeoService(db)
    return await geo.get_heatmap_data(category, days)


@router.get("/{incident_id}")
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single incident by ID."""
    query = text("""
        SELECT
            i.id, i.case_id, i.category, i.subcategory, i.description,
            i.status, i.open_dt, i.closed_dt, i.source,
            i.latitude, i.longitude, i.street_address, i.ward,
            n.name AS neighborhood_name
        FROM incidents i
        LEFT JOIN neighborhoods n ON i.neighborhood_id = n.id
        WHERE i.id = :id
    """)
    result = await db.execute(query, {"id": incident_id})
    r = result.fetchone()

    if not r:
        raise HTTPException(404, "Incident not found")

    return {
        "id": r[0], "case_id": r[1], "category": r[2],
        "subcategory": r[3], "description": r[4], "status": r[5],
        "open_dt": r[6].isoformat() if r[6] else None,
        "closed_dt": r[7].isoformat() if r[7] else None,
        "source": r[8],
        "latitude": float(r[9]) if r[9] else None,
        "longitude": float(r[10]) if r[10] else None,
        "street_address": r[11], "ward": r[12],
        "neighborhood_name": r[13],
    }