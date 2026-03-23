from pydantic import BaseModel
from typing import Optional, List

class TrendPoint(BaseModel):
    date: str
    count: int
    rolling_avg_7d: Optional[float] = None


class TrendResponse(BaseModel):
    neighborhood_id: Optional[int] = None
    category: Optional[str] = None
    data: List[TrendPoint]


class NeighborhoodComparison(BaseModel):
    neighborhood_id: int
    name: str
    current_count: int
    previous_count: int
    pct_change: Optional[float] = None


class ResolutionTime(BaseModel):
    category: str
    total: int
    avg_hours: float
    median_hours: float


class SummaryResponse(BaseModel):
    total_incidents: int
    total_crimes: int
    open_incidents: int
    avg_resolution_hours: Optional[float] = None
    top_categories: List[dict]
    top_neighborhoods: List[dict]


class CategoryBreakdown(BaseModel):
    category: str
    count: int
    open_count: int
    closed_count: int