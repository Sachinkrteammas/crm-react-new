from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db4
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import text
from email_utils import send_reset_password_email



router = APIRouter()

SECRET_KEY = "RESET_SECRET_KEY"
ALGORITHM = "HS256"
RESET_TOKEN_EXPIRE_MINUTES = 15

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_reset_token(email: str):
    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_reset_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def hash_password(password: str):
    return pwd_context.hash(password)






@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db4)):

    # 1️⃣ Check tbl_user
    user = db.execute(
        text("SELECT Email FROM tbl_user WHERE Email = :email"),
        {"email": email}
    ).fetchone()

    table = None
    if user:
        table = "tbl_user"
    else:
        # 2️⃣ Check registration_master
        reg = db.execute(
            text("SELECT email FROM registration_master WHERE email = :email"),
            {"email": email}
        ).fetchone()

        if reg:
            table = "registration_master"
        else:
            # 3️⃣ Check logincreation_master
            login = db.execute(
                text("SELECT username FROM logincreation_master WHERE username = :email"),
                {"email": email}
            ).fetchone()

            if login:
                table = "logincreation_master"

    if not table:
        raise HTTPException(status_code=404, detail="Email not registered")

    # 2️⃣ Create reset token
    token = create_reset_token(email)

    reset_link = f"http://ddcrm.dialdesk.in/reset-password?token={token}"
    # reset_link = f"http://localhost:3000/reset-password?token={token}"

    # 3️⃣ Send Email (pseudo – plug your SMTP here)
    send_reset_password_email(email, reset_link)
    print("RESET LINK:", reset_link)

    return {
        "message": "Password reset link sent to your email"
    }





@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db4)):

    email = verify_reset_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )

    hashed = hash_password(new_password)

    # 1️⃣ tbl_user
    result = db.execute(
        text("""
            UPDATE tbl_user
            SET hash_password = :pwd,
                Password = :new_password
            WHERE Email = :email
        """),
        {"pwd": hashed, "new_password": new_password, "email": email}
    )

    if result.rowcount == 0:
        # 2️⃣ registration_master
        result = db.execute(
            text("""
                UPDATE registration_master
                SET password = :pwd
                WHERE email = :email
            """),
            {"pwd": hashed, "email": email}
        )

    if result.rowcount == 0:
        # 3️⃣ logincreation_master (plain password like your login)
        result = db.execute(
            text("""
                UPDATE logincreation_master
                SET password = :pwd,
                    password2 = :new_password
                WHERE username = :email
            """),
            {"pwd": hashed, "new_password": new_password, "email": email}
        )

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")

    db.commit()

    return {"message": "Password updated successfully"}
