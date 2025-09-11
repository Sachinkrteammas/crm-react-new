from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db, get_db3, get_db4
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



# @router.post("/login", response_model=LoginResponse)
# def login(request: LoginRequest, db: Session = Depends(get_db4)):
#     query = text("SELECT * FROM registration_master WHERE email = :email")
#     result = db.execute(query, {"email": request.email}).mappings().fetchone()

#     if not result or not verify_password(request.password, result["password"]):
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

#     token = create_access_token({"sub": result["email"]})

#     response_data = {
#         "message": "Login successful",
#         "access_token": token,
#         "company_id": result["company_id"],
#         "auth_person": result["auth_person"]
#     }
#     return response_data

#     # 1. Check user from registration_master
#     query = text("SELECT * FROM registration_master WHERE email = :email")
#     result = db.execute(query, {"email": request.email}).mappings().fetchone()

#     if not result or not verify_password(request.password, result["password"]):
#         # 🔴 User not found or invalid password → return blank response
#         return {
#             "message": "",
#             "access_token": "",
#             "company_id": 0,
#             "auth_person": "",
#             "user_type": ""
#         }

#     # 2. Fetch user_type from tbl_user
#     user_query = text("SELECT user_type FROM tbl_user WHERE Email = :email")
#     user_result = db.execute(user_query, {"email": request.email}).mappings().fetchone()

#     if not user_result:
#         # 🔴 If user not found in tbl_user → return blank
#         return {
#             "message": "",
#             "access_token": "",
#             "company_id": 0,
#             "auth_person": "",
#             "user_type": ""
#         }

#     # 3. Create token
#     token = create_access_token({"sub": result["email"]})

#     # 4. Final response
#     return {
#         "message": "Login successful",
#         "access_token": token,
#         "company_id": result["company_id"],
#         "auth_person": result["auth_person"],
#         "user_type": user_result["user_type"]  # admin / superadmin / operation
#     }



# Step 1: Login Api for Used User_type for Verify User type 
@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db4)):
    # Step 1: Superadmin case
    query_user = text("SELECT * FROM tbl_user WHERE Email = :email")
    user = db.execute(query_user, {"email": request.email}).mappings().fetchone()

    if user and verify_password(request.password, user["hash_password"]):
        if user["user_type"] == "Super-Admin":
            token = create_access_token({"sub": user["Email"]})
            return {
                "message": "Login successful (Superadmin)",
                "access_token": token,
                "company_id": None,   # ✅ allowed now
                "auth_person": user["name"],
                "user_type": "Super-Admin"
            }

    # Step 2: Client/Admin case
    query_reg = text("SELECT * FROM registration_master WHERE email = :email")
    reg = db.execute(query_reg, {"email": request.email}).mappings().fetchone()

    if reg and verify_password(request.password, reg["password"]):
        token = create_access_token({"sub": reg["email"]})
        return {
            "message": "Login successful",
            "access_token": token,
            "company_id": reg["company_id"],   # ✅ required for clients/admins
            "auth_person": reg["auth_person"],
            "user_type": "Client"  # or "Admin" if you want to separate
        }

    # Step 3: Invalid credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Invalid credentials"
    )



@router.get("/clients")
def list_clients(
    db: Session = Depends(get_db4),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "Super-Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super-Admin can access this."
        )

    query = text("SELECT company_id, company_name FROM registration_master")
    clients = db.execute(query).mappings().fetchall()
    return {"clients": [dict(client) for client in clients]}



@router.get("/call-master/", response_model=List[CallMasterRecord])
def get_calls_by_client(client_id: int = Query(...), db: Session = Depends(get_db4)):
    try:
        query = text("SELECT * FROM call_master WHERE client_id = :client_id LIMIT 3")
        result = db.execute(query, {"client_id": client_id}).mappings().fetchall()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
def get_profile(current_user: str = Depends(get_current_user)):
    return {"message": f"Authenticated as {current_user}"}
