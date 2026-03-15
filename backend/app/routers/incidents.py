# backend/app/routers/incidents.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def list_incidents():
    return {"message": "incidents endpoint — coming soon"}