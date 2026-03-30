# backend/scripts/ingest_311.py
# Run this to pull 311 data from Boston's API into your PostGIS database

import asyncio
import httpx
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = NEON_URL = "postgresql+asyncpg://neondb_owner:npg_3IxyaQplgf8K@ep-flat-lake-any6dleb-pooler.c-6.us-east-1.aws.neon.tech/neondb?ssl=require"
BOSTON_API = "https://data.boston.gov/api/3/action/datastore_search"
RESOURCE_311 = "9d7c2214-4709-478a-a2e8-fb2020a5bb94"

engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession)


def parse_dt(value):
    """Parse a date string from the API into a Python datetime object."""
    if not value or value.strip() == "":
        return None
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            return datetime.strptime(value.strip(), "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            return None


async def ingest_batch(offset: int = 0, limit: int = 1000) -> dict:
    """Pull a batch of 311 records from Boston's CKAN API."""
    stats = {"fetched": 0, "inserted": 0, "skipped": 0}

    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"   Fetching records {offset} to {offset + limit}...")
        response = await client.get(
            BOSTON_API,
            params={
                "resource_id": RESOURCE_311,
                "limit": limit,
                "offset": offset,
            },
        )
        data = response.json()

        if not data.get("success"):
            print("   ❌ API returned error")
            print(f"   Response: {data}")
            return stats

        records = data["result"]["records"]
        stats["fetched"] = len(records)

        if not records:
            return stats

    async with async_session() as db:
        for record in records:
            try:
                lat = record.get("latitude")
                lng = record.get("longitude")

                # Skip records without coordinates
                if not lat or not lng:
                    stats["skipped"] += 1
                    continue

                lat, lng = float(lat), float(lng)

                # Skip invalid coordinates
                if lat == 0 or lng == 0 or abs(lat) < 1 or abs(lng) < 1:
                    stats["skipped"] += 1
                    continue

                # Parse datetime strings into Python datetime objects
                open_dt = parse_dt(record.get("open_dt"))
                closed_dt = parse_dt(record.get("closed_dt"))

                # Skip if we can't parse the open date
                if open_dt is None:
                    stats["skipped"] += 1
                    continue

                # Upsert incident with spatial point creation
                query = text("""
                    INSERT INTO incidents (
                        case_id, open_dt, closed_dt, category,
                        subcategory, description, status, source,
                        location, latitude, longitude,
                        street_address, ward, neighborhood_id
                    ) VALUES (
                        :case_id, :open_dt, :closed_dt, :category,
                        :subcategory, :description, :status, :source,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                        :lat, :lng,
                        :address, :ward,
                        (SELECT id FROM neighborhoods
                         WHERE ST_Contains(geometry,
                            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
                         LIMIT 1)
                    )
                    ON CONFLICT (case_id) DO NOTHING
                """)

                await db.execute(query, {
                    "case_id": str(record.get("case_enquiry_id", "")),
                    "open_dt": open_dt,
                    "closed_dt": closed_dt,
                    "category": record.get("reason", "Unknown"),
                    "subcategory": record.get("type"),
                    "description": record.get("closure_reason"),
                    "status": record.get("case_status", "Open"),
                    "source": record.get("source"),
                    "lat": lat,
                    "lng": lng,
                    "address": record.get("location_street_name"),
                    "ward": record.get("ward"),
                })
                stats["inserted"] += 1

            except Exception as e:
                if stats["skipped"] < 3:
                    print(f"\n🚨 ERROR: {e}")
                stats["skipped"] += 1
                continue

        await db.commit()

    return stats


async def main():
    print("🏙️  Starting Boston 311 data ingestion...")
    total_inserted = 0
    offset = 0
    batch_size = 1000
    max_records = 10000  # Start with 10k, increase later

    while offset < max_records:
        stats = await ingest_batch(offset=offset, limit=batch_size)
        total_inserted += stats["inserted"]
        print(f"   Batch: fetched={stats['fetched']}, "
              f"inserted={stats['inserted']}, skipped={stats['skipped']}")

        if stats["fetched"] < batch_size:
            break  # No more records

        offset += batch_size

    print(f"\n🎉 Ingestion complete! Total inserted: {total_inserted}")

    # Refresh materialized views
    async with async_session() as db:
        print("📊 Refreshing materialized views...")
        await db.execute(text("REFRESH MATERIALIZED VIEW mv_daily_incident_counts;"))
        await db.execute(text("REFRESH MATERIALIZED VIEW mv_neighborhood_stats;"))
        await db.commit()
        print("   ✅ Views refreshed")

    # Quick verification
    async with async_session() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM incidents;"))
        count = result.scalar()
        print(f"\n📍 Total incidents in database: {count}")

        result = await db.execute(text("""
            SELECT n.name, COUNT(i.id) AS incidents
            FROM neighborhoods n
            LEFT JOIN incidents i ON i.neighborhood_id = n.id
            GROUP BY n.name
            ORDER BY incidents DESC
            LIMIT 5;
        """))
        print("\n🏘️  Top 5 neighborhoods by incidents:")
        for row in result.fetchall():
            print(f"   {row[0]}: {row[1]}")


if __name__ == "__main__":
    asyncio.run(main())