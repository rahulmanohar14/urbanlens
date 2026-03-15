# backend/app/routers/predictions.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def get_predictions():
    return {"message": "predictions endpoint — coming soon"}