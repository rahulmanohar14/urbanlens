# UrbanLens

**Real-time geospatial analytics platform for Boston 311 service requests.**

Built with FastAPI, PostgreSQL/PostGIS, Next.js, Leaflet.js, and Recharts.

---

## Overview

UrbanLens ingests 9,800+ Boston 311 service requests from the city's open data portal, stores them in a PostGIS-enabled PostgreSQL database with spatial indexing, and serves them through a FastAPI backend with 15+ RESTful endpoints. The Next.js frontend features an interactive choropleth map with radius-based incident search, time-series analytics with rolling averages, and a Holt-Winters forecasting engine with confidence intervals.

---

## Features

**Geospatial Intelligence**
- Interactive choropleth map color-coded by incident density per neighborhood
- Click-to-search: find all incidents within a 500m radius of any point using PostGIS ST_DWithin
- 26 Boston neighborhood polygons loaded with full geometry data
- GeoJSON API endpoint powering real-time map rendering

**Analytics Engine**
- Time-series trend analysis with 7-day rolling averages (SQL window functions)
- Neighborhood comparison with period-over-period percentage change (CTEs)
- Category breakdown and resolution time analysis
- Pre-computed aggregations via PostgreSQL materialized views

**Forecasting**
- Holt-Winters Exponential Smoothing capturing trend and weekly seasonality
- 30-day incident volume predictions per neighborhood
- 80% confidence intervals derived from residual standard deviation
- Served via async prediction endpoints

**Production Patterns**
- JWT authentication with bcrypt password hashing
- Redis caching for expensive geospatial aggregations
- Celery workers for scheduled data ingestion (ETL pipeline)
- Database audit trail with PostgreSQL triggers
- Alembic migrations for schema versioning

---

## Architecture
```
┌────────────────────────────────────────────────────────────┐
│               FRONTEND (Next.js 16 + TypeScript)           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Dashboard  │  │  Analytics │  │  Forecast  │           │
│  │  Leaflet    │  │  Recharts  │  │  Recharts  │           │
│  │  Map +      │  │  Line/Bar  │  │  Area      │           │
│  │  GeoJSON    │  │  Charts    │  │  Charts    │           │
│  └──────┬──────┘  └──────┬─────┘  └──────┬─────┘           │
└─────────┼────────────────┼───────────────┼─────────────────┘
          │                │               │
          ▼                ▼               ▼
┌────────────────────────────────────────────────────────────┐
│                 BACKEND (Python FastAPI)                    │
│                                                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Incidents   │  │  Analytics   │  │  Predictions │      │
│  │  Router      │  │  Router      │  │  Router      │      │
│  │  (CRUD+Geo)  │  │  (SQL Agg)   │  │  (ML)        │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│  ┌──────▼─────────────────▼──────────────────▼──────┐      │
│  │              Service Layer                        │      │
│  │  GeoService · AnalyticsService · PredictionSvc    │      │
│  └──────────────────────┬────────────────────────────┘      │
└─────────────────────────┼──────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
  ┌──────▼───────┐ ┌──────▼──────┐  ┌─────▼───────┐
  │ PostgreSQL   │ │ Redis       │  │ Celery      │
  │ + PostGIS    │ │ Cache       │  │ Workers     │
  │              │ │             │  │             │
  │ 8 tables     │ │ Query cache │  │ Scheduled   │
  │ 2 mat views  │ │ Rate limit  │  │ ETL jobs    │
  │ GiST indexes │ │             │  │             │
  │ Audit trigger│ │             │  │             │
  └──────────────┘ └─────────────┘  └─────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, TypeScript | App framework, SSR, routing |
| Maps | Leaflet.js, react-leaflet | Interactive geospatial map |
| Charts | Recharts | Time-series and bar charts |
| Backend | FastAPI (Python) | Async REST API |
| Database | PostgreSQL 16 + PostGIS 3.4 | Spatial data storage and queries |
| Spatial | GeoAlchemy2, PostGIS | ST_DWithin, ST_Contains, GiST indexes |
| ORM | SQLAlchemy (async) | Database models and migrations |
| Migrations | Alembic | Schema versioning |
| Auth | JWT (python-jose), bcrypt | Authentication |
| Cache | Redis | Query caching, rate limiting |
| Queue | Celery | Async task processing, scheduled ETL |
| ML | statsmodels (Holt-Winters) | Time-series forecasting |
| Data | scikit-learn (Isolation Forest) | Anomaly detection |
| HTTP | httpx | Async API client for data ingestion |
| Containerization | Docker Compose | PostgreSQL and Redis infrastructure |

---

## Database Schema

**8 tables, 2 materialized views, 1 audit trigger**

| Table | Purpose |
|-------|---------|
| `neighborhoods` | 26 Boston neighborhoods with PostGIS MultiPolygon geometry |
| `incidents` | 311 service requests with PostGIS Point locations and GiST spatial index |
| `crimes` | Crime reports with spatial indexing |
| `users` | JWT-authenticated user accounts |
| `predictions` | Stored forecast results with confidence intervals |
| `anomaly_events` | Detected anomalous incident spikes |
| `ingestion_logs` | ETL pipeline run tracking |
| `audit_trail` | Trigger-based change logging |

**Materialized Views:**
- `mv_daily_incident_counts` — Pre-computed daily aggregations by neighborhood and category
- `mv_neighborhood_stats` — Summary statistics per neighborhood with resolution times

**Key SQL Features:**
- PostGIS spatial queries: `ST_DWithin`, `ST_Contains`, `ST_Distance`, `ST_AsGeoJSON`
- GiST spatial indexes on geometry columns
- Window functions for rolling 7-day averages
- CTEs for period-over-period neighborhood comparison
- `PERCENTILE_CONT` for median resolution time calculation
- PostgreSQL triggers for audit trail logging

---

## API Endpoints

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/incidents/` | List with filtering and pagination |
| GET | `/api/v1/incidents/nearby` | PostGIS radius search |
| GET | `/api/v1/incidents/categories` | Category counts |
| GET | `/api/v1/incidents/heatmap` | Heatmap point data |
| GET | `/api/v1/incidents/{id}` | Single incident |

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
| GET | `/api/v1/analytics/summary` | City-wide dashboard stats |
| GET | `/api/v1/analytics/trends` | Time-series with rolling average |
| GET | `/api/v1/analytics/comparison` | Period-over-period CTE |
| GET | `/api/v1/analytics/resolution-time` | Resolution by category |
| GET | `/api/v1/analytics/categories` | Category breakdown |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/predictions/forecast` | Holt-Winters forecast |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | JWT token |
| GET | `/api/v1/auth/me` | Current user |

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
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/urbanlens
SYNC_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/urbanlens
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
```

Run migrations and load data:
```bash
docker exec -it urbanlens-db psql -U postgres -d urbanlens -c "CREATE EXTENSION IF NOT EXISTS postgis;"
alembic upgrade head
python -m scripts.load_neighborhoods
python -m scripts.ingest_311
```

Start the API:
```bash
uvicorn app.main:app --reload --reload-dir app --port 8000
```

API docs: `http://localhost:8000/docs`

### 4. Set up the frontend
```bash
cd ../client
npm install
npm run dev
```

Open `http://localhost:3000`

---

## Project Structure
```
urbanlens/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── config.py               # Settings
│   │   ├── database.py             # PostgreSQL + PostGIS connection
│   │   ├── models/                 # SQLAlchemy ORM models (8 tables)
│   │   ├── schemas/                # Pydantic validation schemas
│   │   ├── routers/                # API endpoint handlers
│   │   ├── services/               # Business logic layer
│   │   │   ├── geo_service.py      # PostGIS spatial queries
│   │   │   ├── analytics_service.py # Window functions, CTEs
│   │   │   ├── prediction_service.py # Holt-Winters forecasting
│   │   │   └── auth_service.py     # JWT authentication
│   │   └── utils/                  # Pagination, caching
│   ├── scripts/                    # Data ingestion ETL
│   ├── alembic/                    # Database migrations
│   └── requirements.txt
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Dashboard with map
│   │   │   ├── trends/page.tsx     # Analytics charts
│   │   │   └── forecast/page.tsx   # Predictions
│   │   ├── components/
│   │   │   ├── Map.tsx             # Leaflet + PostGIS integration
│   │   │   ├── TopBar.tsx          # Navigation
│   │   │   ├── StatsCards.tsx      # Summary metrics
│   │   │   ├── Filters.tsx         # Category filter pills
│   │   │   ├── IncidentList.tsx    # Nearby search results
│   │   │   └── MapLegend.tsx       # Density legend
│   │   └── lib/
│   │       └── api.ts              # Axios API client
│   └── package.json
└── docs/
```

---

## Data Sources

| Dataset | Source | Records |
|---------|--------|---------|
| 311 Service Requests | [Boston Analyze Data Portal](https://data.boston.gov) | 9,800+ |
| Neighborhood Boundaries | [Boston GeoJSON](https://github.com/blackmad/neighborhoods) | 26 polygons |

---

## Author

**Rahul Manohar Durshinapally**

Master of Science in Information Systems — Northeastern University, Boston

[LinkedIn](https://www.linkedin.com/in/rahul-manohar-durshinapally/) · [GitHub](https://github.com/rahulmanohar14)