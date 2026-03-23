from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class IncidentResponse(BaseModel):
    id: int
    case_id: str
    category: str
    subcategory: Optional[str] = None
    description: Optional[str] = None
    status: str
    open_dt: Optional[str] = None
    closed_dt: Optional[str] = None
    source: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    street_address: Optional[str] = None
    neighborhood_name: Optional[str] = None
    ward: Optional[str] = None
    distance_meters: Optional[float] = None


class IncidentListResponse(BaseModel):
    data: List[IncidentResponse]
    total: int
    next_cursor: Optional[str] = None


class NearbyResponse(BaseModel):
    data: List[IncidentResponse]
    center: dict
    radius_meters: int
    total_found: int