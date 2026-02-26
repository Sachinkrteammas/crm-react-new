from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db, get_db3, get_db4
from schemas import LoginRequest, LoginResponse, CallMasterRecord
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from auth_utils import get_current_user
from sqlalchemy import text
from fastapi.security import OAuth2PasswordBearer


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

    # ✅ Admin case (same flow as Superadmin)
        elif user["user_type"] in ["Admin", "admin"]:
            print("Admin user logged in",user["user_type"] )
            token = create_access_token({"sub": user["Email"]})
            return {
                "message": "Login successful (Admin)",
                "access_token": token,
                "company_id": None,   
                "auth_person": user["name"],
                "user_type": "Admin"
            }
        

    # Step 2: Client/Admin case
    # 🔹 1. Try from logincreation_master first
    query_login = text("SELECT * FROM logincreation_master WHERE username = :username")
    login_user = db.execute(query_login, {"username": request.email}).mappings().fetchone()

    if login_user and (request.password == login_user["password2"]):
        token = create_access_token({"sub": login_user["username"]})
        return {
            "message": "Login successful (Client - logincreation_master)",
            "access_token": token,
            "company_id": login_user["create_id"],
            "auth_person": login_user["name"],
            "user_type": "Client",
            "name": login_user["name"],
            "outbound_access": login_user["outbound_access"] 
        }
    
    # 🔹 2. If not found, try registration_master
    query_reg = text("SELECT * FROM registration_master WHERE email = :email")
    reg = db.execute(query_reg, {"email": request.email}).mappings().fetchone()

    if reg and verify_password(request.password, reg["password"]):
        token = create_access_token({"sub": reg["email"]})
        return {
            "message": "Login successful",
            "access_token": token,
            "company_id": reg["company_id"],   # ✅ required for clients/admins
            "auth_person": reg["company_name"],
            "user_type": "Client"  # or "Admin" if you want to separate
        }

    # Step 3: Invalid credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Invalid credentials"
    )



# @router.get("/clients")
# def list_clients(
#     db: Session = Depends(get_db4),
#     current_user: dict = Depends(get_current_user)
# ):
#     if current_user.get("role") != "Super-Admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only Super-Admin can access this."
#         )

#     query = text("SELECT company_id, company_name FROM registration_master")
#     clients = db.execute(query).mappings().fetchall()
#     return {"clients": [dict(client) for client in clients]}



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



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/call/oauth2/token")

def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        client_id: str = payload.get("sub")
        if client_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return client_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )