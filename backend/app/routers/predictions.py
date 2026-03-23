
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def predictions_status():
    return {"status": "Predictions endpoint ready — Prophet integration coming Day 5"}