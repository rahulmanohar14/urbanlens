# backend/scripts/load_neighborhoods.py
# Run this script ONCE to load Boston neighborhood boundaries

import asyncio
import httpx
import json
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/urbanlens"

engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession)

# Boston neighborhood GeoJSON from city data portal
NEIGHBORHOODS_URL = "https://raw.githubusercontent.com/blackmad/neighborhoods/master/boston.geojson"


async def load_neighborhoods():
    print("📍 Downloading Boston neighborhood boundaries...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(NEIGHBORHOODS_URL)
        geojson = response.json()

    print(f"   Found {len(geojson['features'])} neighborhoods")

    async with async_session() as db:
        for feature in geojson["features"]:
            name = feature["properties"].get("Name") or feature["properties"].get("name") or "Unknown"
            geometry = json.dumps(feature["geometry"])

            query = text("""
                INSERT INTO neighborhoods (name, geometry)
                VALUES (
                    :name,
                    ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)
                )
                ON CONFLICT (name) DO UPDATE SET
                    geometry = ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)
            """)

            await db.execute(query, {"name": name, "geom": geometry})
            print(f"   ✅ Loaded: {name}")

        await db.commit()

    print("🎉 All neighborhoods loaded!")

    # Verify with a spatial query
    async with async_session() as db:
        result = await db.execute(text("""
            SELECT name, ST_AsText(ST_Centroid(geometry)) AS centroid
            FROM neighborhoods
            LIMIT 5
        """))
        print("\n📊 Sample neighborhoods with centroids:")
        for row in result.fetchall():
            print(f"   {row[0]}: {row[1]}")


if __name__ == "__main__":
    asyncio.run(load_neighborhoods())