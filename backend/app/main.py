# backend/app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response time header
@app.middleware("http")
async def add_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Response-Time"] = f"{time.perf_counter() - start:.4f}s"
    return response


# Global error handler
@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# Register routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["Incidents"])
app.include_router(crimes.router, prefix="/api/v1/crimes", tags=["Crimes"])
app.include_router(neighborhoods.router, prefix="/api/v1/neighborhoods", tags=["Neighborhoods"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["Predictions"])


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "urbanlens-api", "version": "1.0.0"}