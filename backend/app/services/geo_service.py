# backend/app/services/geo_service.py

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional


class GeoService:
    """PostGIS-powered geospatial query service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_incidents_nearby(
        self,
        lat: float,
        lng: float,
        radius_m: int = 500,
        category: Optional[str] = None,
        limit: int = 50,
    ) -> list:
        """Find incidents within a radius using ST_DWithin."""
        category_filter = "AND i.category = :category" if category else ""
        params = {"lat": lat, "lng": lng, "radius": radius_m, "limit": limit}
        if category:
            params["category"] = category

        query = text(f"""
            SELECT
                i.id, i.case_id, i.category, i.subcategory, i.description,
                i.status, i.open_dt, i.closed_dt, i.source,
                i.latitude, i.longitude, i.street_address, i.ward,
                n.name AS neighborhood_name,
                ROUND(ST_Distance(
                    i.location::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                )::numeric, 1) AS distance_meters
            FROM incidents i
            LEFT JOIN neighborhoods n ON i.neighborhood_id = n.id
            WHERE ST_DWithin(
                i.location::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius
            )
            {category_filter}
            ORDER BY distance_meters ASC
            LIMIT :limit
        """)

        result = await self.db.execute(query, params)
        rows = result.fetchall()
        return [
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
                "distance_meters": float(r[14]) if r[14] else None,
            }
            for r in rows
        ]

    async def find_crimes_nearby(
        self,
        lat: float,
        lng: float,
        radius_m: int = 500,
        limit: int = 50,
    ) -> list:
        """Find crimes within radius using ST_DWithin."""
        query = text("""
            SELECT
                c.id, c.incident_number, c.offense_description,
                c.occurred_on, c.shooting, c.district,
                c.latitude, c.longitude, c.street,
                n.name AS neighborhood_name,
                ROUND(ST_Distance(
                    c.location::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                )::numeric, 1) AS distance_meters
            FROM crimes c
            LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
            WHERE ST_DWithin(
                c.location::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius
            )
            ORDER BY distance_meters ASC
            LIMIT :limit
        """)

        result = await self.db.execute(
            query, {"lat": lat, "lng": lng, "radius": radius_m, "limit": limit}
        )
        rows = result.fetchall()
        return [
            {
                "id": r[0], "incident_number": r[1],
                "offense_description": r[2],
                "occurred_on": r[3].isoformat() if r[3] else None,
                "shooting": r[4], "district": r[5],
                "latitude": float(r[6]) if r[6] else None,
                "longitude": float(r[7]) if r[7] else None,
                "street": r[8], "neighborhood_name": r[9],
                "distance_meters": float(r[10]) if r[10] else None,
            }
            for r in rows
        ]

    async def get_neighborhood_geojson(self) -> dict:
        """Return all neighborhoods as GeoJSON FeatureCollection for choropleth."""
        query = text("""
            SELECT
                n.id, n.name, n.district, n.population,
                ST_AsGeoJSON(n.geometry)::json AS geometry,
                COALESCE(stats.total_incidents, 0) AS total_incidents,
                COALESCE(stats.incidents_last_30d, 0) AS incidents_last_30d,
                COALESCE(stats.total_crimes, 0) AS total_crimes,
                COALESCE(stats.crimes_last_30d, 0) AS crimes_last_30d,
                COALESCE(stats.avg_resolution_hours, 0) AS avg_resolution_hours
            FROM neighborhoods n
            LEFT JOIN mv_neighborhood_stats stats ON n.id = stats.neighborhood_id
            ORDER BY n.name
        """)

        result = await self.db.execute(query)
        rows = result.fetchall()

        features = []
        for r in rows:
            features.append({
                "type": "Feature",
                "geometry": r[4],
                "properties": {
                    "id": r[0],
                    "name": r[1],
                    "district": r[2],
                    "population": r[3],
                    "total_incidents": int(r[5]),
                    "incidents_last_30d": int(r[6]),
                    "total_crimes": int(r[7]),
                    "crimes_last_30d": int(r[8]),
                    "avg_resolution_hours": float(r[9]) if r[9] else 0,
                },
            })

        return {"type": "FeatureCollection", "features": features}

    async def get_heatmap_data(
        self, category: Optional[str] = None, days: int = 365
    ) -> list:
        """Return lat/lng points for heatmap rendering."""
        category_filter = "AND i.category = :category" if category else ""
        params = {"days": days}
        if category:
            params["category"] = category

        query = text(f"""
            SELECT i.latitude, i.longitude, i.category
            FROM incidents i
            WHERE i.open_dt > NOW() - MAKE_INTERVAL(days => :days)
            AND i.latitude IS NOT NULL
            {category_filter}
            LIMIT 5000
        """)

        result = await self.db.execute(query, params)
        return [
            {"latitude": float(r[0]), "longitude": float(r[1]), "category": r[2]}
            for r in result.fetchall()
        ]