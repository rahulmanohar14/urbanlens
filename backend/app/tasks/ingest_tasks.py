import httpx
import redis
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from app.tasks.celery_app import celery_app
from app.config import settings


def get_sync_engine():
    return create_engine(settings.SYNC_DATABASE_URL)


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


# ─── 311 Nightly Ingest ───────────────────────────────────────────────────────

@celery_app.task(name="app.tasks.ingest_tasks.ingest_311_task")
def ingest_311_task(days_back=2, limit=5000):
    """
    Pull recent 311 records from Boston API.
    - Uses 2026 resource ID
    - Filters to last `days_back` days to keep batches small
    - ON CONFLICT DO NOTHING handles duplicates safely
    """
    engine = get_sync_engine()
    since = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%S")
    stats = {"fetched": 0, "inserted": 0, "skipped": 0}

    try:
        response = httpx.get(
            settings.BOSTON_API_BASE,
            params={
                "resource_id": settings.RESOURCE_311_2026,
                "limit": limit,
                "filters": f'{{"open_dt":"{since}"}}',
                "sort": "_id desc",
            },
            timeout=30.0,
        )
        data = response.json()
    except Exception as e:
        return {"error": str(e), **stats}

    if not data.get("success"):
        return {"error": "API failed", **stats}

    records = data["result"]["records"]
    stats["fetched"] = len(records)

    if not records:
        return stats

    with engine.connect() as conn:
        log_result = conn.execute(text(
            "INSERT INTO ingestion_logs (source, status, started_at) VALUES ('311_nightly', 'started', NOW()) RETURNING id"
        ))
        log_id = log_result.fetchone()[0]
        conn.commit()

        for record in records:
            try:
                lat = record.get("latitude")
                lng = record.get("longitude")
                if not lat or not lng:
                    stats["skipped"] += 1
                    continue

                lat, lng = float(lat), float(lng)
                if lat == 0 or lng == 0 or abs(lat) < 1:
                    stats["skipped"] += 1
                    continue

                open_dt = parse_dt(record.get("open_dt"))
                closed_dt = parse_dt(record.get("closed_dt"))
                if open_dt is None:
                    stats["skipped"] += 1
                    continue

                conn.execute(text("""
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
            except Exception:
                stats["skipped"] += 1
                continue

        conn.commit()
        conn.execute(text("""
            UPDATE ingestion_logs
            SET status='completed', records_fetched=:fetched,
                records_inserted=:inserted, records_skipped=:skipped,
                completed_at=NOW()
            WHERE id=:id
        """), {**stats, "id": log_id})
        conn.commit()

    return stats


# ─── Crime Nightly Ingest ─────────────────────────────────────────────────────

@celery_app.task(name="app.tasks.ingest_tasks.ingest_crimes_task")
def ingest_crimes_task(days_back=2, limit=5000):
    """
    Pull recent crime records from Boston API.
    - Filters to last `days_back` days
    - ON CONFLICT (incident_number) DO NOTHING handles duplicates
    """
    engine = get_sync_engine()
    since = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%S")
    stats = {"fetched": 0, "inserted": 0, "skipped": 0}

    try:
        response = httpx.get(
            settings.BOSTON_API_BASE,
            params={
                "resource_id": settings.RESOURCE_CRIME,
                "limit": limit,
                "sort": "_id desc",
            },
            timeout=30.0,
        )
        data = response.json()
    except Exception as e:
        return {"error": str(e), **stats}

    if not data.get("success"):
        return {"error": "API failed", **stats}

    records = data["result"]["records"]
    stats["fetched"] = len(records)

    if not records:
        return stats

    with engine.connect() as conn:
        log_result = conn.execute(text(
            "INSERT INTO ingestion_logs (source, status, started_at) VALUES ('crimes_nightly', 'started', NOW()) RETURNING id"
        ))
        log_id = log_result.fetchone()[0]
        conn.commit()

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
                if occurred_on is None or occurred_on < datetime.now() - timedelta(days=days_back):
                    stats["skipped"] += 1
                    continue

                incident_number = str(
                    record.get("INCIDENT_NUMBER") or record.get("incident_number") or record.get("_id", "")
                )
                shooting_val = record.get("SHOOTING") or record.get("shooting") or ""
                shooting = str(shooting_val).strip().upper() in ["Y", "1", "TRUE", "YES"]
                hour_val = record.get("HOUR") or record.get("hour")
                hour = int(hour_val) if hour_val is not None and str(hour_val).strip() != "" else None

                conn.execute(text("""
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
            except Exception:
                stats["skipped"] += 1
                continue

        conn.commit()
        conn.execute(text("""
            UPDATE ingestion_logs
            SET status='completed', records_fetched=:fetched,
                records_inserted=:inserted, records_skipped=:skipped,
                completed_at=NOW()
            WHERE id=:id
        """), {**stats, "id": log_id})
        conn.commit()

    return stats


# ─── Refresh Views ────────────────────────────────────────────────────────────

@celery_app.task(name="app.tasks.ingest_tasks.refresh_views_task")
def refresh_views_task():
    engine = get_sync_engine()
    with engine.connect() as conn:
        conn.execute(text("REFRESH MATERIALIZED VIEW mv_daily_incident_counts;"))
        conn.execute(text("REFRESH MATERIALIZED VIEW mv_neighborhood_stats;"))
        conn.commit()
    return {"status": "views refreshed"}


# ─── Redis Keepalive ──────────────────────────────────────────────────────────

@celery_app.task(name="app.tasks.ingest_tasks.redis_keepalive_task")
def redis_keepalive_task():
    """Ping Redis every 10 min to prevent Upstash free-tier archiving."""
    r = redis.from_url(settings.REDIS_URL)
    r.ping()
    return {"status": "redis alive"}