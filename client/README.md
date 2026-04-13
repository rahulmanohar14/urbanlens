# UrbanLens

**[Live Demo](https://urbanlens-app.vercel.app)** · **[API Docs](https://urbanlens-api.onrender.com/docs)**

**Live geospatial analytics platform for Boston city data — 104,000+ incidents and crime reports, updated daily.**

Built with FastAPI, PostgreSQL/PostGIS, Next.js, Leaflet.js, Recharts, and Holt-Winters forecasting.

---

## Overview

UrbanLens ingests 104,000+ records from two Boston open data sources — 311 service requests and crime incident reports — into a PostGIS-enabled PostgreSQL database with spatial indexing. Data is refreshed nightly via a Celery beat scheduler pulling from the [Boston Analyze Data Portal](https://data.boston.gov) live API. A FastAPI backend serves 20+ RESTful endpoints including geospatial radius search, time-series analytics, and ML-powered forecasting. The Next.js frontend features an interactive choropleth map with dual-source toggling, crime temporal heatmaps, street-level rankings, and a Holt-Winters prediction engine with confidence intervals.

---

## Features

**Geospatial Intelligence**
- Interactive choropleth map color-coded by incident/crime density per neighborhood
- Dual-source toggle: view 311 incidents, crimes, or both simultaneously
- Click-to-search: find all incidents and crimes within 500m using PostGIS ST_DWithin
- 26 Boston neighborhood polygons with full PostGIS geometry
- Dynamic choropleth recoloring based on active data source
- Category dropdown filter with type-aware filtering (311 vs crime) synced to sidebar in real time

**Analytics Engine**
- Crime temporal heatmap: hour-by-day grid revealing when crimes occur (Friday nights, Monday mornings)
- Top dangerous streets: ranked by incident and crime count — street-level detail the map cannot show
- Time-series trend analysis with 7-day rolling averages (SQL window functions)
- Category breakdown for both 311 incidents and crime offense types
- Resolution time analysis with median and average hours per category
- Pre-computed aggregations via PostgreSQL materialized views

**Forecasting**
- City-wide and per-neighborhood forecast modes
- Holt-Winters Exponential Smoothing with damped trend capturing weekly seasonality
- 30-day incident volume predictions with 80% confidence intervals
- Automatic trailing-zero trimming for clean training data
- Served via async prediction endpoints

**Live Data Pipeline**
- Nightly Celery beat ingestion from Boston Open Data API (311 2026 + Crime datasets)
- Upsert-based ETL keyed on `case_enquiry_id` / `incident_number` — no duplicates
- Automatic materialized view refresh after each ingestion run
- Redis keepalive task every 10 minutes to maintain free-tier uptime
- Ingestion logs stored in database with record counts and timestamps

**Production Infrastructure**
- JWT authentication with bcrypt password hashing
- Redis caching with TTL on all analytics endpoints (15–30 min)
- Celery workers for scheduled data ingestion and materialized view refresh
- Database audit trail with PostgreSQL triggers
- Alembic migrations for schema versioning
- Dual data source ETL pipeline (311 + crime reports)
- Splash screen with live backend health polling for cold-start UX

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                FRONTEND (Next.js 16 + TypeScript)            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Dashboard   │  │  Analytics  │  │  Forecast   │         │
│  │  Leaflet Map │  │  Heatmap    │  │  Holt-      │         │
│  │  + GeoJSON   │  │  Recharts   │  │  Winters    │         │
│  │  Dual Toggle │  │  Top Streets│  │  City/Hood  │         │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼─────────────────┼────────────────┼────────────────┘
          │                 │                │
          ▼                 ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Python FastAPI)                     │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Incidents │ │ Crimes   │ │Analytics │ │Predictions│       │
│  │Router    │ │ Router   │ │Router    │ │Router     │       │
│  │(CRUD+Geo)│ │(CRUD+Geo)│ │(SQL Agg) │ │(ML)       │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬──────┘       │
│       │             │            │             │              │
│  ┌────▼─────────────▼────────────▼─────────────▼──────┐      │
│  │               Service Layer                         │      │
│  │  GeoService · AnalyticsService · PredictionService  │      │
│  └───────────────────────┬─────────────────────────────┘      │
└──────────────────────────┼───────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼───────┐ ┌─────▼──────┐  ┌──────▼──────┐
   │ PostgreSQL   │ │ Redis      │  │ Celery      │
   │ + PostGIS    │ │            │  │ Workers     │
   │              │ │ Query cache│  │             │
   │ 8 tables     │ │ TTL-based  │  │ Nightly ETL │
   │ 2 mat views  │ │ Keepalive  │  │ View refresh│
   │ GiST indexes │ │            │  │ Redis ping  │
   │ Audit trigger│ │            │  │             │
   └──────────────┘ └────────────┘  └─────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, TypeScript | App framework, SSR, routing |
| Maps | Leaflet.js, react-leaflet | Interactive geospatial map |
| Charts | Recharts | Line, bar, area charts |
| Backend | FastAPI (Python) | Async REST API |
| Database | PostgreSQL 16 + PostGIS 3.4 | Spatial data storage and queries |
| Spatial | GeoAlchemy2, PostGIS | ST_DWithin, ST_Contains, GiST indexes |
| ORM | SQLAlchemy (async) | Database models and migrations |
| Migrations | Alembic | Schema versioning |
| Auth | JWT (python-jose), bcrypt | Authentication |
| Cache | Redis (Upstash) | TTL-based query caching + keepalive |
| Queue | Celery | Nightly ETL, view refresh, keepalive |
| ML | statsmodels (Holt-Winters) | Time-series forecasting |
| HTTP | httpx | Async API client for data ingestion |
| Hosting | Vercel + Render + Neon | Frontend, backend, database |
| Containers | Docker Compose | Local PostgreSQL + Redis |

---

## Data Sources

| Dataset | Source | Records |
|---------|--------|---------|
| 311 Service Requests 2026 | [Boston Analyze Data Portal](https://data.boston.gov) | 94,179 (live, updated daily) |
| Crime Incident Reports | [Boston Analyze Data Portal](https://data.boston.gov) | 20,852 (live, updated daily) |
| Neighborhood Boundaries | [Boston GeoJSON](https://github.com/blackmad/neighborhoods) | 26 polygons |

---

## Database Schema

**8 tables, 2 materialized views, 1 audit trigger**

| Table | Purpose |
|-------|---------|
| `neighborhoods` | 26 Boston neighborhoods with PostGIS MultiPolygon geometry |
| `incidents` | 311 service requests with PostGIS Point locations and GiST spatial index |
| `crimes` | Crime reports with hour, day_of_week, shooting flag, and spatial index |
| `users` | JWT-authenticated user accounts |
| `predictions` | Stored forecast results with confidence intervals |
| `anomaly_events` | Detected anomalous incident spikes |
| `ingestion_logs` | ETL pipeline run tracking with record counts and timestamps |
| `audit_trail` | Trigger-based change logging |

**Materialized Views:**
- `mv_daily_incident_counts` — Pre-computed daily aggregations by neighborhood and category
- `mv_neighborhood_stats` — Summary statistics per neighborhood with resolution times

**Key SQL Features:**
- PostGIS spatial queries: ST_DWithin, ST_Contains, ST_Distance, ST_AsGeoJSON
- GiST spatial indexes on geometry columns
- Window functions for rolling 7-day averages
- CTEs for period-over-period comparison
- PERCENTILE_CONT for median resolution times
- PostgreSQL triggers for audit trail
- Materialized views with scheduled refresh

---

## API Endpoints (20+)

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/incidents/` | List with filtering and pagination |
| GET | `/api/v1/incidents/nearby` | PostGIS radius search |
| GET | `/api/v1/incidents/categories` | Category counts |
| GET | `/api/v1/incidents/heatmap` | Heatmap point data |
| GET | `/api/v1/incidents/{id}` | Single incident |

### Crimes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/crimes/` | List with filtering |
| GET | `/api/v1/crimes/nearby` | PostGIS radius search |
| GET | `/api/v1/crimes/by-offense` | Offense type breakdown |

### Neighborhoods
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/neighborhoods/` | All with summary stats |
| GET | `/api/v1/neighborhoods/geojson` | GeoJSON FeatureCollection |
| GET | `/api/v1/neighborhoods/{id}` | Single neighborhood |
| GET | `/api/v1/neighborhoods/{id}/incidents` | Incidents in neighborhood |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/summary` | Dashboard stats (cached) |
| GET | `/api/v1/analytics/trends` | Time-series with rolling avg (cached) |
| GET | `/api/v1/analytics/comparison` | Period-over-period CTE |
| GET | `/api/v1/analytics/resolution-time` | Resolution by category (cached) |
| GET | `/api/v1/analytics/categories` | Category breakdown (cached) |
| GET | `/api/v1/analytics/time-patterns` | Crime hour/day heatmap data |
| GET | `/api/v1/analytics/top-streets` | Top streets by incident/crime count |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/predictions/forecast` | Holt-Winters forecast (city-wide or per-neighborhood) |
| POST | `/api/v1/predictions/ingest` | Trigger Celery ingestion |
| POST | `/api/v1/predictions/refresh-views` | Trigger view refresh |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | JWT token |
| GET | `/api/v1/auth/me` | Current user |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend + Redis status check |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker Desktop

### 1. Clone the repository
```bash
git clone https://github.com/rahulmanohar14/urbanlens.git
cd urbanlens
```

### 2. Start infrastructure
```bash
docker compose up -d
```

### 3. Set up the backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: source venv/Scripts/activate
pip install -r requirements.txt
```

Create a `.env` file in the backend directory:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/urbanlens
SYNC_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/urbanlens
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
RESOURCE_311_2026=1a0b420d-99f1-4887-9851-990b2a5a6e17
RESOURCE_CRIME=b973d8cb-eeb2-4e7e-99da-c92938efc9c0
```

Run migrations and load data:
```bash
docker exec -it urbanlens-db psql -U postgres -d urbanlens -c "CREATE EXTENSION IF NOT EXISTS postgis;"
alembic upgrade head
python -m scripts.load_neighborhoods
python -m scripts.ingest_311
python -m scripts.ingest_crimes
```

Start the API:
```bash
uvicorn app.main:app --reload --reload-dir app --port 8000
```

API docs: http://localhost:8000/docs

### 4. Set up the frontend
```bash
cd ../client
npm install
npm run dev
```

Open http://localhost:3000

### 5. Optional: Start Celery worker + beat scheduler
```bash
cd backend
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info
```

---

## Project Structure

```
urbanlens/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point + health endpoint
│   │   ├── config.py                  # Settings + resource IDs
│   │   ├── database.py                # PostgreSQL + PostGIS connection
│   │   ├── models/                    # SQLAlchemy ORM (8 tables)
│   │   ├── schemas/                   # Pydantic validation
│   │   ├── routers/
│   │   │   ├── incidents.py           # 311 incident endpoints
│   │   │   ├── crimes.py              # Crime endpoints
│   │   │   ├── neighborhoods.py       # Neighborhood + GeoJSON
│   │   │   ├── analytics.py           # Trends, heatmap, top streets
│   │   │   ├── predictions.py         # Holt-Winters forecast
│   │   │   └── auth.py                # JWT authentication
│   │   ├── services/
│   │   │   ├── geo_service.py         # PostGIS spatial queries
│   │   │   ├── analytics_service.py   # Window functions, CTEs
│   │   │   ├── prediction_service.py  # Holt-Winters forecasting
│   │   │   └── auth_service.py        # JWT + bcrypt
│   │   ├── tasks/
│   │   │   ├── celery_app.py          # Celery config + nightly beat schedule
│   │   │   └── ingest_tasks.py        # ETL tasks + Redis keepalive
│   │   └── utils/
│   │       ├── cache.py               # Redis caching helpers
│   │       └── pagination.py          # Cursor-based pagination
│   ├── scripts/
│   │   ├── load_neighborhoods.py      # Load GeoJSON boundaries
│   │   ├── ingest_311.py              # 311 data ETL (historical)
│   │   ├── ingest_crimes.py           # Crime data ETL (historical)
│   │   └── backfill_2026.py           # One-time 2026 data backfill
│   ├── alembic/                       # Database migrations
│   └── requirements.txt
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Dashboard (map + toggle + filters)
│   │   │   ├── trends/page.tsx        # Analytics (heatmap + streets + charts)
│   │   │   └── forecast/page.tsx      # Forecast (city-wide + neighborhood)
│   │   ├── components/
│   │   │   ├── Map.tsx                # Leaflet + PostGIS + dual source
│   │   │   ├── TopBar.tsx             # Glass navbar
│   │   │   ├── StatsCards.tsx         # Summary metrics with skeleton loaders
│   │   │   ├── Filters.tsx            # Dropdown category filter
│   │   │   ├── IncidentList.tsx       # Nearby results with type tags
│   │   │   ├── SplashScreen.tsx       # Cold-start UX with backend health poll
│   │   │   └── MapLegend.tsx          # Density legend
│   │   └── lib/
│   │       └── api.ts                 # Axios API client
│   └── package.json
└── docs/
```

---

## Author

**Rahul Manohar Durshinapally**

Master of Science in Information Systems — Northeastern University, Boston
