from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.services.geo_service import GeoService

router = APIRouter()


@router.get("/")
async def list_crimes(
    offense: Optional[str] = Query(None),
    neighborhood_id: Optional[int] = Query(None),
    shooting: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List crimes with filtering and pagination."""
    where_clauses = []
    params = {"limit": limit, "offset": offset}

    if offense:
        where_clauses.append("c.offense_description ILIKE '%' || :offense || '%'")
        params["offense"] = offense
    if neighborhood_id is not None:
        where_clauses.append("c.neighborhood_id = :neighborhood_id")
        params["neighborhood_id"] = neighborhood_id
    if shooting is not None:
        where_clauses.append("c.shooting = :shooting")
        params["shooting"] = shooting

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    query = text(f"""
        SELECT
            c.id, c.incident_number, c.offense_description,
            c.occurred_on, c.shooting, c.district,
            c.latitude, c.longitude, c.street,
            n.name AS neighborhood_name
        FROM crimes c
        LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
        {where_sql}
        ORDER BY c.occurred_on DESC
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(query, params)
    rows = result.fetchall()

    data = [
        {
            "id": r[0], "incident_number": r[1],
            "offense_description": r[2],
            "occurred_on": r[3].isoformat() if r[3] else None,
            "shooting": r[4], "district": r[5],
            "latitude": float(r[6]) if r[6] else None,
            "longitude": float(r[7]) if r[7] else None,
            "street": r[8], "neighborhood_name": r[9],
        }
        for r in rows
    ]

    count_query = text(f"SELECT COUNT(*) FROM crimes c {where_sql}")
    count_result = await db.execute(count_query, params)
    total = count_result.scalar()

    return {"data": data, "total": total}


@router.get("/nearby")
async def find_crimes_nearby(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: int = Query(500, ge=50, le=5000),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Find crimes within a radius — PostGIS ST_DWithin."""
    geo = GeoService(db)
    results = await geo.find_crimes_nearby(lat, lng, radius, limit)
    return {
        "data": results,
        "center": {"lat": lat, "lng": lng},
        "radius_meters": radius,
        "total_found": len(results),
    }


@router.get("/by-offense")
async def crimes_by_offense(db: AsyncSession = Depends(get_db)):
    """Group crimes by offense type."""
    query = text("""
        SELECT offense_description, COUNT(*)::int AS count
        FROM crimes
        WHERE offense_description IS NOT NULL
        GROUP BY offense_description
        ORDER BY count DESC
        LIMIT 20
    """)
    result = await db.execute(query)
    return [dict(r._mapping) for r in result.fetchall()]