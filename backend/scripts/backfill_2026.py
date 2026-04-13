"""
One-time backfill script — run this ONCE to load all 2026 data so far.
After this, the nightly Celery beat task keeps everything fresh.

Usage:
    cd backend
    python -m scripts.backfill_2026
"""

import asyncio
import httpx
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
BOSTON_API = "https://data.boston.gov/api/3/action/datastore_search"
RESOURCE_311_2026 = "1a0b420d-99f1-4887-9851-990b2a5a6e17"
RESOURCE_CRIME = "b973d8cb-eeb2-4e7e-99da-c92938efc9c0"

engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession)


def parse_dt(value):
    if not value or str(value).strip() == "":
        return None
    val = str(value).strip()
    if "+" in val:
        val = val.split("+")[0].strip()
    if val.endswith("Z"):
        val = val[:-1]
    for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%m/%d/%Y %H:%M:%S"]:
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    return None


# ─── 311 Backfill ─────────────────────────────────────────────────────────────

async def backfill_311():
    print("\n📋 Starting 2026 311 backfill...")
    total_inserted = total_skipped = offset = 0
    batch_size = 1000

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            print(f"   Fetching records {offset}–{offset + batch_size}...")
            resp = await client.get(BOSTON_API, params={
                "resource_id": RESOURCE_311_2026,
                "limit": batch_size,
                "offset": offset,
            })
            data = resp.json()

            if not data.get("success"):
                print(f"   ❌ API error at offset {offset}")
                break

            records = data["result"]["records"]
            if not records:
                break

            async with async_session() as db:
                for record in records:
                    try:
                        lat = record.get("latitude")
                        lng = record.get("longitude")
                        if not lat or not lng:
                            total_skipped += 1
                            continue
                        lat, lng = float(lat), float(lng)
                        if lat == 0 or lng == 0 or abs(lat) < 1:
                            total_skipped += 1
                            continue

                        open_dt = parse_dt(record.get("open_dt"))
                        if open_dt is None:
                            total_skipped += 1
                            continue

                        await db.execute(text("""
                            INSERT INTO incidents (
                                case_id, open_dt, closed_dt, category, subcategory,
                                description, status, source, location, latitude, longitude,
                                street_address, ward, neighborhood_id
                            ) VALUES (
                                :case_id, :open_dt, :closed_dt, :category, :subcategory,
                                :description, :status, :source,
                                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                                :lat, :lng, :address, :ward,
                                (SELECT id FROM neighborhoods
                                 WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
                                 LIMIT 1)
                            )
                            ON CONFLICT (case_id) DO NOTHING
                        """), {
                            "case_id": str(record.get("case_enquiry_id", "")),
                            "open_dt": open_dt,
                            "closed_dt": parse_dt(record.get("closed_dt")),
                            "category": record.get("reason", "Unknown"),
                            "subcategory": record.get("type"),
                            "description": record.get("closure_reason"),
                            "status": record.get("case_status", "Open"),
                            "source": record.get("source"),
                            "lat": lat, "lng": lng,
                            "address": record.get("location_street_name"),
                            "ward": record.get("ward"),
                        })
                        total_inserted += 1
                    except Exception as e:
                        total_skipped += 1

                await db.commit()

            print(f"   ✅ Batch done — inserted so far: {total_inserted}")
            if len(records) < batch_size:
                break
            offset += batch_size

    print(f"\n🎉 311 backfill complete: {total_inserted} inserted, {total_skipped} skipped")


# ─── Crime Backfill ───────────────────────────────────────────────────────────

async def backfill_crimes():
    print("\n🚔 Starting 2026 crime backfill...")
    total_inserted = total_skipped = offset = 0
    batch_size = 1000

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            print(f"   Fetching records {offset}–{offset + batch_size}...")
            resp = await client.get(BOSTON_API, params={
                "resource_id": RESOURCE_CRIME,
                "limit": batch_size,
                "offset": offset,
                "filters": '{"YEAR":"2026"}',
            })
            data = resp.json()

            if not data.get("success"):
                print(f"   ❌ API error at offset {offset}")
                break

            records = data["result"]["records"]
            if not records:
                break

            async with async_session() as db:
                for record in records:
                    try:
                        lat = record.get("Lat") or record.get("lat")
                        lng = record.get("Long") or record.get("long")
                        if not lat or not lng:
                            total_skipped += 1
                            continue
                        lat, lng = float(lat), float(lng)
                        if lat == 0 or lng == 0 or abs(lat) < 1:
                            total_skipped += 1
                            continue

                        occurred_on = parse_dt(
                            record.get("OCCURRED_ON_DATE") or record.get("occurred_on_date")
                        )
                        if occurred_on is None:
                            total_skipped += 1
                            continue

                        incident_number = str(
                            record.get("INCIDENT_NUMBER") or record.get("incident_number") or record.get("_id", "")
                        )
                        shooting_val = record.get("SHOOTING") or ""
                        shooting = str(shooting_val).strip().upper() in ["Y", "1", "TRUE", "YES"]
                        hour_val = record.get("HOUR")
                        hour = int(hour_val) if hour_val is not None and str(hour_val).strip() != "" else None

                        await db.execute(text("""
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
                        """), {
                            "incident_number": incident_number,
                            "occurred_on": occurred_on,
                            "offense_code": str(record.get("OFFENSE_CODE") or ""),
                            "offense_desc": record.get("OFFENSE_DESCRIPTION") or "Unknown",
                            "district": record.get("DISTRICT"),
                            "shooting": shooting,
                            "lat": lat, "lng": lng,
                            "street": record.get("STREET"),
                            "ucr_part": record.get("UCR_PART"),
                            "day_of_week": record.get("DAY_OF_WEEK"),
                            "hour": hour,
                        })
                        total_inserted += 1
                    except Exception:
                        total_skipped += 1

                await db.commit()

            print(f"   ✅ Batch done — inserted so far: {total_inserted}")
            if len(records) < batch_size:
                break
            offset += batch_size

    print(f"\n🎉 Crime backfill complete: {total_inserted} inserted, {total_skipped} skipped")


# ─── Refresh Views ────────────────────────────────────────────────────────────

async def refresh_views():
    print("\n📊 Refreshing materialized views...")
    async with async_session() as db:
        await db.execute(text("REFRESH MATERIALIZED VIEW mv_daily_incident_counts;"))
        await db.execute(text("REFRESH MATERIALIZED VIEW mv_neighborhood_stats;"))
        await db.commit()
    print("   ✅ Views refreshed")


async def main():
    await backfill_311()
    await backfill_crimes()
    await refresh_views()

    async with async_session() as db:
        r1 = await db.execute(text("SELECT COUNT(*) FROM incidents;"))
        r2 = await db.execute(text("SELECT COUNT(*) FROM crimes;"))
        print(f"\n📍 Total incidents: {r1.scalar()}")
        print(f"🚔 Total crimes:    {r2.scalar()}")


if __name__ == "__main__":
    asyncio.run(main())