import httpx
from datetime import datetime
from sqlalchemy import create_engine, text
from app.tasks.celery_app import celery_app
from app.config import settings


def get_sync_engine():
    return create_engine(settings.SYNC_DATABASE_URL)


def parse_dt(value):
    if not value or str(value).strip() == "":
        return None
    try:
        return datetime.strptime(str(value).strip(), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


@celery_app.task(name="app.tasks.ingest_tasks.ingest_311_task")
def ingest_311_task(limit=2000):
    """Celery task: pull latest 311 data from Boston API."""
    engine = get_sync_engine()
    api_url = "https://data.boston.gov/api/3/action/datastore_search"
    resource_id = "9d7c2214-4709-478a-a2e8-fb2020a5bb94"

    stats = {"fetched": 0, "inserted": 0, "skipped": 0}

    response = httpx.get(api_url, params={"resource_id": resource_id, "limit": limit, "sort": "_id desc"}, timeout=30.0)
    data = response.json()

    if not data.get("success"):
        return {"error": "API failed", **stats}

    records = data["result"]["records"]
    stats["fetched"] = len(records)

    with engine.connect() as conn:
        # Log ingestion start
        log_result = conn.execute(text(
            "INSERT INTO ingestion_logs (source, status, started_at) VALUES ('311_celery', 'started', NOW()) RETURNING id"
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
                    INSERT INTO incidents (case_id, open_dt, closed_dt, category, subcategory, description, status, source, location, latitude, longitude, street_address, ward, neighborhood_id)
                    VALUES (:case_id, :open_dt, :closed_dt, :category, :subcategory, :description, :status, :source, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :lat, :lng, :address, :ward,
                        (SELECT id FROM neighborhoods WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) LIMIT 1))
                    ON CONFLICT (case_id) DO NOTHING
                """), {
                    "case_id": str(record.get("case_enquiry_id", "")),
                    "open_dt": open_dt, "closed_dt": closed_dt,
                    "category": record.get("reason", "Unknown"),
                    "subcategory": record.get("type"),
                    "description": record.get("closure_reason"),
                    "status": record.get("case_status", "Open"),
                    "source": record.get("source"),
                    "lat": lat, "lng": lng,
                    "address": record.get("location_street_name"),
                    "ward": record.get("ward"),
                })
                stats["inserted"] += 1
            except Exception:
                stats["skipped"] += 1
                continue

        conn.commit()

        # Log completion
        conn.execute(text("""
            UPDATE ingestion_logs SET status='completed', records_fetched=:fetched, records_inserted=:inserted, records_skipped=:skipped, completed_at=NOW() WHERE id=:id
        """), {**stats, "id": log_id})
        conn.commit()

    return stats


@celery_app.task(name="app.tasks.ingest_tasks.refresh_views_task")
def refresh_views_task():
    """Celery task: refresh materialized views."""
    engine = get_sync_engine()
    with engine.connect() as conn:
        conn.execute(text("REFRESH MATERIALIZED VIEW mv_daily_incident_counts;"))
        conn.execute(text("REFRESH MATERIALIZED VIEW mv_neighborhood_stats;"))
        conn.commit()
    return {"status": "views refreshed"}