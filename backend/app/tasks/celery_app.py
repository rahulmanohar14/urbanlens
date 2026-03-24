from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "urbanlens",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/New_York",
    enable_utc=True,
)

# Scheduled tasks — run ingestion every 6 hours, refresh views every hour
celery_app.conf.beat_schedule = {
    "ingest-311-every-6-hours": {
        "task": "app.tasks.ingest_tasks.ingest_311_task",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "refresh-views-every-hour": {
        "task": "app.tasks.ingest_tasks.refresh_views_task",
        "schedule": crontab(minute=0),
    },
}