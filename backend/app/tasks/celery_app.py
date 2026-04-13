from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "urbanlens",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/New_York",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)

# Nightly at 2am ET: ingest new 311 + crime records, then refresh views
celery_app.conf.beat_schedule = {
    "ingest-311-nightly": {
        "task": "app.tasks.ingest_tasks.ingest_311_task",
        "schedule": crontab(hour=2, minute=0),
    },
    "ingest-crimes-nightly": {
        "task": "app.tasks.ingest_tasks.ingest_crimes_task",
        "schedule": crontab(hour=2, minute=15),
    },
    "refresh-views-nightly": {
        "task": "app.tasks.ingest_tasks.refresh_views_task",
        "schedule": crontab(hour=2, minute=45),
    },
    # Keepalive ping every 10 min to prevent Upstash inactivity archiving
    "redis-keepalive": {
        "task": "app.tasks.ingest_tasks.redis_keepalive_task",
        "schedule": crontab(minute="*/10"),
    },
}