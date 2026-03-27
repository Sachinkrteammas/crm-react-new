from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4
from passlib.context import CryptContext

router = APIRouter()


# ----------------------------
# Request Body Schema
# ----------------------------
class CreateLoginBody(BaseModel):
    name: str
    email: EmailStr
    phone: int
    designation: str
    password: str
    confirm_password: str
    user_rights_new: str  # comma-separated like "1,2,3"


class UpdateLoginBody(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: int | None = None
    designation: str | None = None
    user_rights_new: str | None = None
    password: str | None = None
    confirm_password: str | None = None
    user_active: Optional[int] = None


# To encrypt password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# ----------------------------
# API Endpoint
# ----------------------------
@router.post("/create_admin_user")
def create_login_user(
        body: CreateLoginBody = None,  # <-- ALL OTHER FIELDS IN BODY
        db: Session = Depends(get_db4)
):
    # 1. Validate passwords
    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # 2. Validate user_rights_new format
    if not all(x.isdigit() for x in body.user_rights_new.split(",")):
        raise HTTPException(status_code=400, detail="Select proper User Rights")

    # 3. Check if email already exists
    check_query = text("""
        SELECT id FROM tbl_user WHERE username = :email
    """)
    existing = db.execute(check_query, {"email": body.email}).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    # 🔐 4. HASH ONLY password, keep confirm password as plain text
    hashed_password = hash_password(body.password)

    # 5. Insert new user
    insert_query = text("""
        INSERT INTO tbl_user 
        (name, phone, username,email, designation, user_type, user_right_new, password, hash_password) 
        VALUES 
        (:name, :phone, :username, :email, :designation, :user_type, :user_right_new, :password, :hash_password)
    """)

    db.execute(insert_query, {
        "name": body.name,
        "phone": body.phone,
        "username": body.email,
        "email": body.email,
        "designation": body.designation,
        "user_type": "admin",
        "user_right_new": body.user_rights_new,
        "password": body.confirm_password,
        "hash_password": hashed_password
    })

    db.commit()

    return {
        "status": "success",
        "message": "User created successfully",
        "data": {
            "name": body.name,
            "email": body.email,
            "phone": body.phone,
            "designation": body.designation,
            "user_rights_new": body.user_rights_new
        }
    }


@router.get("/login_users_admin")
def get_login_user_client(db: Session = Depends(get_db4)):
    query = text("""
        SELECT 
            id,
            name,
            username,
            phone,
            designation,
            user_right_new,
            password,
            user_active
        FROM tbl_user
        ORDER BY id DESC
    """)

    rows = db.execute(query).fetchall()

    result = []
    for r in rows:
        row = dict(r._mapping)
        row["status"] = "Active" if row["user_active"] == 1 else "De-Active"
        result.append(row)

    return result


@router.put("/login_admin_user/{user_id}")
def update_login_user(
    user_id: int,
    body: UpdateLoginBody,
    db: Session = Depends(get_db4)
):
    # Check if user exists
    check = text("SELECT id FROM tbl_user WHERE id = :id")
    existing = db.execute(check, {"id": user_id}).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    # Password validation
    if body.password or body.confirm_password:
        if body.password != body.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")

    # Validate rights
    if body.user_rights_new:
        if not all(x.isdigit() for x in body.user_rights_new.split(",")):
            raise HTTPException(status_code=400, detail="Invalid User Rights")

    updates = []
    params = {"id": user_id}

    # Dynamic fields
    if body.name:
        updates.append("name = :name")
        params["name"] = body.name

    if body.email:
        updates.append("username = :username")
        updates.append("email = :email")
        params["username"] = body.email
        params["email"] = body.email

    if body.phone:
        updates.append("phone = :phone")
        params["phone"] = body.phone

    if body.designation:
        updates.append("designation = :designation")
        params["designation"] = body.designation

    if body.user_rights_new:
        updates.append("user_right_new = :user_right_new")
        params["user_right_new"] = body.user_rights_new


    if body.password:
        if body.password != body.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")

        hashed_password = hash_password(body.password)

        updates.append("Password = :Password")
        updates.append("hash_password = :hash_password")

        params["Password"] = body.password
        params["hash_password"] = hashed_password

    if body.user_active is not None:
        updates.append("user_active = :user_active")
        params["user_active"] = body.user_active

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_query = text(f"""
        UPDATE tbl_user
        SET {", ".join(updates)}
        WHERE id = :id
    """)

    db.execute(update_query, params)
    db.commit()

    return {"status": "success", "message": "User updated successfully"}



@router.delete("/login_users_admin/{id}")
def delete_user(id: int, db: Session = Depends(get_db4)):
    try:
        query = text("""
            UPDATE tbl_user
            SET user_active = 0
            WHERE id = :id
        """)

        db.execute(query, {"id": id})
        db.commit()

        return {"status": "success", "message": "User deactivated successfully"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}