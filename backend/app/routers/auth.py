
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, decode_token,
)

router = APIRouter()
security = HTTPBearer()


@router.post("/register")
async def register(
    email: str,
    password: str,
    full_name: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user account."""
    # Check if email exists
    existing = await db.execute(
        text("SELECT id FROM users WHERE email = :email"), {"email": email}
    )
    if existing.fetchone():
        raise HTTPException(400, "Email already registered")

    hashed = hash_password(password)
    result = await db.execute(
        text("""
            INSERT INTO users (email, hashed_password, full_name)
            VALUES (:email, :password, :name)
            RETURNING id, email, full_name, is_active
        """),
        {"email": email, "password": hashed, "name": full_name},
    )
    await db.commit()
    user = result.fetchone()

    token = create_access_token({"sub": str(user[0]), "email": user[1]})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user[0], "email": user[1],
            "full_name": user[2], "is_active": user[3],
        },
    }


@router.post("/login")
async def login(
    email: str,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Login and get JWT token."""
    result = await db.execute(
        text("SELECT id, email, hashed_password, full_name, is_active FROM users WHERE email = :email"),
        {"email": email},
    )
    user = result.fetchone()

    if not user or not verify_password(password, user[2]):
        raise HTTPException(401, "Invalid email or password")

    token = create_access_token({"sub": str(user[0]), "email": user[1]})

    # Update last login
    await db.execute(
        text("UPDATE users SET last_login = NOW() WHERE id = :id"),
        {"id": user[0]},
    )
    await db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user[0], "email": user[1],
            "full_name": user[3], "is_active": user[4],
        },
    }


@router.get("/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user."""
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(401, "Invalid token")

    result = await db.execute(
        text("SELECT id, email, full_name, is_active FROM users WHERE id = :id"),
        {"id": int(payload["sub"])},
    )
    user = result.fetchone()
    if not user:
        raise HTTPException(404, "User not found")

    return {
        "id": user[0], "email": user[1],
        "full_name": user[2], "is_active": user[3],
    }