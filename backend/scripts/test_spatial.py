# backend/scripts/test_spatial.py
# Test that PostGIS spatial queries are working

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/urbanlens"
engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession)


async def test_nearby():
    """Find incidents near Northeastern University campus."""
    # Northeastern University coordinates
    NEU_LAT = 42.3398
    NEU_LNG = -71.0892
    RADIUS = 500  # meters

    async with async_session() as db:
        print(f"🔍 Searching for 311 incidents within {RADIUS}m of Northeastern...")
        print(f"   Coordinates: ({NEU_LAT}, {NEU_LNG})\n")

        result = await db.execute(text("""
            SELECT
                i.case_id,
                i.category,
                i.status,
                i.street_address,
                n.name AS neighborhood,
                ROUND(ST_Distance(
                    i.location::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                )::numeric, 1) AS distance_m
            FROM incidents i
            LEFT JOIN neighborhoods n ON i.neighborhood_id = n.id
            WHERE ST_DWithin(
                i.location::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius
            )
            ORDER BY distance_m ASC
            LIMIT 10
        """), {"lat": NEU_LAT, "lng": NEU_LNG, "radius": RADIUS})

        rows = result.fetchall()
        print(f"   Found {len(rows)} incidents:\n")

        for row in rows:
            print(f"   📍 [{row[1]}] {row[3] or 'No address'}")
            print(f"      Status: {row[2]} | Neighborhood: {row[4]} | Distance: {row[5]}m")
            print()

        # Test neighborhood GeoJSON
        print("🗺️  Testing GeoJSON export...")
        result = await db.execute(text("""
            SELECT COUNT(*) FROM neighborhoods WHERE geometry IS NOT NULL
        """))
        count = result.scalar()
        print(f"   {count} neighborhoods with valid geometry\n")

        # Test materialized view
        print("📊 Testing materialized view...")
        result = await db.execute(text("""
            SELECT name, total_incidents, incidents_last_30d, avg_resolution_hours
            FROM mv_neighborhood_stats
            ORDER BY total_incidents DESC
            LIMIT 5
        """))
        print("   Top neighborhoods from materialized view:")
        for row in result.fetchall():
            print(f"   {row[0]}: {row[1]} total, {row[2]} last 30d, {row[3]}h avg resolution")


if __name__ == "__main__":
    asyncio.run(test_nearby())