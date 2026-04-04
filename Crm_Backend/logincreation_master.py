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
    user_rights_new: str   # comma-separated like "1,2,3"


class UpdateLoginBody(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: int | None = None
    designation: str | None = None
    user_rights_new: str | None = None
    password: str | None = None
    confirm_password: str | None = None



# To encrypt password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)



# ----------------------------
# API Endpoint
# ----------------------------
@router.post("/create_login_user")
def create_login_user(
    create_id: int = Query(...),              # <-- ONLY IN QUERY PARAM
    body: CreateLoginBody = None,             # <-- ALL OTHER FIELDS IN BODY
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
        SELECT id FROM logincreation_master WHERE username = :email
    """)
    existing = db.execute(check_query, {"email": body.email}).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    check_name = text("""
        SELECT id FROM logincreation_master WHERE name = :name AND create_id = :create_id
    """)
    existing_name = db.execute(check_name, {"name": body.name, "create_id": create_id}).fetchone()

    if existing_name:
        raise HTTPException(status_code=400, detail="Name already exists")
    
    # 🔐 4. HASH ONLY password, keep confirm password as plain text
    hashed_password = hash_password(body.password)

    # 5. Insert new user
    insert_query = text("""
        INSERT INTO logincreation_master 
        (create_id, name, phone, username, designation, user_right_new, password, password2) 
        VALUES 
        (:create_id, :name, :phone, :username, :designation, :user_right_new, :password, :password2)
    """)

    db.execute(insert_query, {
        "create_id": create_id,
        "name": body.name,
        "phone": body.phone,
        "username": body.email,
        "designation": body.designation,
        "user_right_new": body.user_rights_new,
        "password": hashed_password,             # ← hashed
        "password2": body.confirm_password       # ← plain (entered text)
    })

    db.commit()

    return {
        "status": "success",
        "message": "User created successfully",
        "data": {
            "create_id": create_id,
            "name": body.name,
            "email": body.email,
            "phone": body.phone,
            "designation": body.designation,
            "user_rights_new": body.user_rights_new
        }
    }




@router.get("/login_users/{user_id}")
def get_login_user(user_id: int, db: Session = Depends(get_db4)):
    query = text("SELECT * FROM logincreation_master WHERE id = :id")
    row = db.execute(query, {"id": user_id}).fetchone()

    data = dict(row._mapping)

    # ❌ Do not send hashed password
    if "password" in data:
        del data["password"]

    # ✔ Send plain password (password2)
    data["password"] = data.get("password2")  # rename for frontend


    return data


    return dict(row._mapping)


@router.get("/login_users_client/{create_id}")
def get_login_user_client(create_id: int, db: Session = Depends(get_db4)):
    query = text("SELECT * FROM logincreation_master WHERE create_id = :create_id")
    rows = db.execute(query, {"create_id": create_id}).fetchall()


    # Convert each Row to dict
    return [dict(r._mapping) for r in rows]




@router.put("/login_users/{user_id}")
def update_login_user(
    user_id: int,
    body: UpdateLoginBody,
    db: Session = Depends(get_db4)
):
    # Check if exists
    check = text("SELECT * FROM logincreation_master WHERE id = :id")
    existing = db.execute(check, {"id": user_id}).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    create_id = existing.create_id
    
    # Check if name already exists (excluding current user)
    if body.name:
        name_check_query = text("""
            SELECT id FROM logincreation_master
            WHERE name = :name AND create_id = :create_id AND id != :id
        """)
        
        name_exists = db.execute(name_check_query, {
            "name": body.name,
            "create_id": create_id,
            "id": user_id
        }).fetchone()

        if name_exists:
            raise HTTPException(status_code=400, detail="Name already exists")
        
    # Check if email already exists (excluding current user)        
    if body.email:
        email_check_query = text("""
            SELECT id FROM logincreation_master
            WHERE username = :email AND id != :id
        """)
        
        email_exists = db.execute(email_check_query, {
            "email": body.email,
            "id": user_id
        }).fetchone()

        if email_exists:
            raise HTTPException(status_code=400, detail="Email already exists")

    # Password validation
    if body.password or body.confirm_password:
        if body.password != body.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")

    # Validate user rights
    if body.user_rights_new:
        if not all(x.isdigit() for x in body.user_rights_new.split(",")):
            raise HTTPException(status_code=400, detail="Select proper User Rights")

    # Build dynamic update query
    updates = []
    params = {"id": user_id}

    for field in ["name", "email", "phone", "designation", "user_rights_new"]:
        value = getattr(body, field)
        if value is not None:
            column = "username" if field == "email" else ("user_right_new" if field == "user_rights_new" else field)
            updates.append(f"{column} = :{column}")
            params[column] = value

    # Add password if provided
    if body.password:
        hashed_password = hash_password(body.password)  # hash here

        updates.append("password = :password")      # hashed
        updates.append("password2 = :password2")    # plain text

        params["password"] = hashed_password
        params["password2"] = body.confirm_password

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_query = text(f"""
        UPDATE logincreation_master
        SET {", ".join(updates)}
        WHERE id = :id
    """)

    db.execute(update_query, params)
    db.commit()

    return {"status": "success", "message": "User updated successfully"}




@router.delete("/login_users/{user_id}")
def delete_login_user(user_id: int, db: Session = Depends(get_db4)):
    check = text("SELECT id FROM logincreation_master WHERE id = :id")
    existing = db.execute(check, {"id": user_id}).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    delete_query = text("DELETE FROM logincreation_master WHERE id = :id")
    db.execute(delete_query, {"id": user_id})
    db.commit()

    return {"status": "success", "message": "User deleted successfully"}







def build_menu_tree(rows):
    tree = []
    lookup = {row["id"]: {**row, "children": []} for row in rows}

    for row in rows:
        if row["parent_id"]:
            parent = lookup.get(row["parent_id"])
            if parent:
                parent["children"].append(lookup[row["id"]])
        else:
            tree.append(lookup[row["id"]])

    # sort by priority safely
    def sort_children(node):
        node["children"] = sorted(
            node["children"], 
            key=lambda x: x.get("priority") if x.get("priority") is not None else 0
        )
        for child in node["children"]:
            sort_children(child)

    for item in tree:
        sort_children(item)

    return tree



# Its Working For Super Admin with (companyId = 0) and Working For client with Company_id
@router.get("/dynamic-menu")
def get_dynamic_menu(db: Session = Depends(get_db4)):

    query = text("""
        SELECT id, page_name, page_url, parent_id, priority
        FROM pages_master2
        ORDER BY priority ASC
    """)
    rows = db.execute(query).mappings().all()

    if not rows:
        raise HTTPException(status_code=404, detail="No pages found")

    return build_menu_tree(rows)

