# backend/app/routers/neighborhoods.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def list_neighborhoods():
    return {"message": "neighborhoods endpoint — coming soon"}