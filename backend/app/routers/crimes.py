# backend/app/routers/crimes.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def list_crimes():
    return {"message": "crimes endpoint — coming soon"}