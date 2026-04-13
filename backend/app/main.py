from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import redis

from app.config import settings
from app.routers import incidents, crimes, neighborhoods, analytics, predictions, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 UrbanLens API starting up...")
    yield
    print("🛑 UrbanLens API shutting down...")


app = FastAPI(
    title="UrbanLens API",
    description="Boston Urban Analytics & Geospatial Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Response-Time"] = f"{time.perf_counter() - start:.4f}s"
    return response


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["Incidents"])
app.include_router(crimes.router, prefix="/api/v1/crimes", tags=["Crimes"])
app.include_router(neighborhoods.router, prefix="/api/v1/neighborhoods", tags=["Neighborhoods"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["Predictions"])


@app.get("/health")
async def health():
    """
    Health check used by UptimeRobot to keep Render + Upstash Redis alive.
    Pings Redis so Upstash never goes inactive.
    """
    redis_status = "ok"
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
    except Exception as e:
        redis_status = f"error: {e}"

    return {
        "status": "healthy",
        "service": "urbanlens-api",
        "version": "1.0.0",
        "redis": redis_status,
    }