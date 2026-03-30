# backend/scripts/ingest_crimes.py

import asyncio
import httpx
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = NEON_URL = "postgresql+asyncpg://neondb_owner:npg_3IxyaQplgf8K@ep-flat-lake-any6dleb-pooler.c-6.us-east-1.aws.neon.tech/neondb?ssl=require"
BOSTON_API = "https://data.boston.gov/api/3/action/datastore_search"
RESOURCE_CRIME = "b973d8cb-eeb2-4e7e-99da-c92938efc9c0"

engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession)


def parse_dt(value):
    if not value or str(value).strip() == "":
        return None
    val = str(value).strip()
    # Remove timezone offset like +00
    if "+" in val:
        val = val.split("+")[0].strip()
    if val.endswith("Z"):
        val = val[:-1]
    for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %I:%M:%S %p"]:
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    return None


async def ingest_batch(offset: int = 0, limit: int = 1000) -> dict:
    stats = {"fetched": 0, "inserted": 0, "skipped": 0}

    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"   Fetching records {offset} to {offset + limit}...")
        response = await client.get(
            BOSTON_API,
            params={"resource_id": RESOURCE_CRIME, "limit": limit, "offset": offset},
        )
        data = response.json()

        if not data.get("success"):
            print("   ❌ API returned error")
            # Debug: print field names from first record
            if data.get("result", {}).get("records"):
                print(f"   🔍 FIELDS: {list(data['result']['records'][0].keys())}")
                print(f"   📄 SAMPLE: {data['result']['records'][0]}")
            return stats

        records = data["result"]["records"]
        stats["fetched"] = len(records)

        if not records:
            return stats

        # Debug first record
        if offset == 0:
            print(f"\n   🔍 FIELDS: {list(records[0].keys())}")
            print(f"   📄 SAMPLE: {records[0]}\n")

    async with async_session() as db:
        for record in records:
            try:
                lat = record.get("Lat") or record.get("lat") or record.get("LATITUDE")
                lng = record.get("Long") or record.get("long") or record.get("LONGITUDE")

                if not lat or not lng:
                    stats["skipped"] += 1
                    continue

                lat, lng = float(lat), float(lng)
                if lat == 0 or lng == 0 or abs(lat) < 1:
                    stats["skipped"] += 1
                    continue

                occurred_on = parse_dt(
                    record.get("OCCURRED_ON_DATE") or record.get("occurred_on_date")
                )
                if occurred_on is None:
                    stats["skipped"] += 1
                    continue

                incident_number = str(
                    record.get("INCIDENT_NUMBER") or record.get("incident_number") or record.get("_id", "")
                )

                shooting_val = record.get("SHOOTING") or record.get("shooting") or ""
                shooting = str(shooting_val).strip().upper() in ["Y", "1", "TRUE", "YES"]

                hour_val = record.get("HOUR") or record.get("hour")
                hour = int(hour_val) if hour_val is not None and str(hour_val).strip() != "" else None

                query = text("""
                    INSERT INTO crimes (
                        incident_number, occurred_on, offense_code, offense_description,
                        district, shooting, location, latitude, longitude,
                        street, neighborhood_id, ucr_part, day_of_week, hour
                    ) VALUES (
                        :incident_number, :occurred_on, :offense_code, :offense_desc,
                        :district, :shooting,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                        :lat, :lng, :street,
                        (SELECT id FROM neighborhoods
                         WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
                         LIMIT 1),
                        :ucr_part, :day_of_week, :hour
                    )
                    ON CONFLICT (incident_number) DO NOTHING
                """)

                await db.execute(query, {
                    "incident_number": incident_number,
                    "occurred_on": occurred_on,
                    "offense_code": str(record.get("OFFENSE_CODE") or record.get("offense_code") or ""),
                    "offense_desc": record.get("OFFENSE_DESCRIPTION") or record.get("offense_description") or "Unknown",
                    "district": record.get("DISTRICT") or record.get("district"),
                    "shooting": shooting,
                    "lat": lat,
                    "lng": lng,
                    "street": record.get("STREET") or record.get("street"),
                    "ucr_part": record.get("UCR_PART") or record.get("ucr_part"),
                    "day_of_week": record.get("DAY_OF_WEEK") or record.get("day_of_week"),
                    "hour": hour,
                })
                stats["inserted"] += 1

            except Exception as e:
                if stats["skipped"] < 3:
                    print(f"\n   🚨 ERROR: {e}")
                stats["skipped"] += 1
                continue

        await db.commit()

    return stats


async def main():
    print("🚔 Starting Boston crime data ingestion...")
    total_inserted = 0
    offset = 0
    batch_size = 1000
    max_records = 10000

    while offset < max_records:
        stats = await ingest_batch(offset=offset, limit=batch_size)
        total_inserted += stats["inserted"]
        print(f"   Batch: fetched={stats['fetched']}, inserted={stats['inserted']}, skipped={stats['skipped']}")

        if stats["fetched"] < batch_size:
            break

        offset += batch_size

    print(f"\n🎉 Ingestion complete! Total crimes inserted: {total_inserted}")

    # Refresh materialized views
    async with async_session() as db:
        print("📊 Refreshing materialized views...")
        await db.execute(text("REFRESH MATERIALIZED VIEW mv_neighborhood_stats;"))
        await db.commit()
        print("   ✅ Views refreshed")

    # Verification
    async with async_session() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM crimes;"))
        count = result.scalar()
        print(f"\n🚔 Total crimes in database: {count}")

        result = await db.execute(text("""
            SELECT n.name, COUNT(c.id) AS crimes
            FROM neighborhoods n
            LEFT JOIN crimes c ON c.neighborhood_id = n.id
            GROUP BY n.name
            ORDER BY crimes DESC
            LIMIT 5;
        """))
        print("\n🏘️  Top 5 neighborhoods by crimes:")
        for row in result.fetchall():
            print(f"   {row[0]}: {row[1]}")


if __name__ == "__main__":
    asyncio.run(main())