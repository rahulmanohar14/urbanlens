# backend/app/routers/analytics.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def get_analytics():
    return {"message": "analytics endpoint — coming soon"}