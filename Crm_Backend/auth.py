from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas import LoginRequest, LoginResponse, CallMasterRecord
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from auth_utils import get_current_user
from sqlalchemy import text


router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    query = text("SELECT * FROM registration_master WHERE email = :email")
    result = db.execute(query, {"email": request.email}).mappings().fetchone()

    if not result or not verify_password(request.password, result["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": result["email"]})

    response_data = {
        "message": "Login successful",
        "access_token": token,
        "company_id": result["company_id"],
        "auth_person": result["auth_person"]
    }
    return response_data


@router.get("/call-master/", response_model=List[CallMasterRecord])
def get_calls_by_client(client_id: int = Query(...), db: Session = Depends(get_db)):
    try:
        query = text("SELECT * FROM call_master WHERE client_id = :client_id LIMIT 3")
        result = db.execute(query, {"client_id": client_id}).mappings().fetchall()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
def get_profile(current_user: str = Depends(get_current_user)):
    return {"message": f"Authenticated as {current_user}"}
