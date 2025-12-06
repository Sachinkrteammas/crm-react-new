# DID Master CRUD Routes
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime
from database import get_db4

router = APIRouter(prefix="/did-master", tags=["DID Master"])


# =========================================================
# ✅ 1. LIST ALL DIDs
# =========================================================
@router.get("/list")
def list_dids(ClientId: Optional[int] = None, db: Session = Depends(get_db4)):
    query = """
        SELECT 
            id,
            did_number,
            customer_care_number,
            client_id,
            create_date,
            update_date
        FROM did_master
    """

    params = {}

    if ClientId:
        query += " WHERE client_id = :ClientId"
        params["ClientId"] = ClientId

    query += " ORDER BY id DESC"

    rows = db.execute(text(query), params).mappings().all()

    return [
        {
            "id": r["id"],
            "did_number": r["did_number"],
            "customer_care_number": r["customer_care_number"],
            "client_id": r["client_id"],
            "create_date": r["create_date"],
            "update_date": r["update_date"],
        }
        for r in rows
    ]


# =========================================================
# ✅ 2. GET SINGLE DID VIEW
# =========================================================
@router.get("/view/{did_id}")
def view_did(did_id: int, db: Session = Depends(get_db4)):
    query = text("SELECT * FROM did_master WHERE id = :id")
    row = db.execute(query, {"id": did_id}).mappings().first()

    if not row:
        return {"error": f"DID ID {did_id} not found."}

    return row


# =========================================================
# ✅ 3. CREATE NEW DID
# =========================================================
@router.post("/create")
def create_did(
    did_number: str = Form(...),
    customer_care_number: str = Form(...),
    client_id: int = Form(...),
    db: Session = Depends(get_db4)
):
    now = datetime.now()

    query = text("""
        INSERT INTO did_master 
            (did_number, customer_care_number, client_id, create_date, update_date)
        VALUES 
            (:did_number, :customer_care_number, :client_id, :create_date, :update_date)
    """)

    db.execute(query, {
        "did_number": did_number,
        "customer_care_number": customer_care_number,
        "client_id": client_id,
        "create_date": now,
        "update_date": now
    })

    db.commit()

    return {"message": "DID created successfully"}


# =========================================================
# ✅ 4. UPDATE DID
# =========================================================
@router.put("/update/{did_id}")
def update_did(
    did_id: int,
    did_number: str = Form(...),
    customer_care_number: str = Form(...),
    client_id: int = Form(...),
    db: Session = Depends(get_db4)
):
    # Check existence
    check = db.execute(
        text("SELECT id FROM did_master WHERE id = :id"),
        {"id": did_id}
    ).fetchone()

    if not check:
        return {"error": f"DID ID {did_id} not found."}

    now = datetime.now()

    query = text("""
        UPDATE did_master 
        SET 
            did_number = :did_number,
            customer_care_number = :customer_care_number,
            client_id = :client_id,
            update_date = :update_date
        WHERE id = :id
    """)

    db.execute(query, {
        "did_number": did_number,
        "customer_care_number": customer_care_number,
        "client_id": client_id,
        "update_date": now,
        "id": did_id
    })

    db.commit()

    return {"message": f"DID ID {did_id} updated successfully."}


# =========================================================
# ✅ 5. DELETE DID
# =========================================================
@router.delete("/delete/{did_id}")
def delete_did(did_id: int, db: Session = Depends(get_db4)):
    # Check if exists
    check = db.execute(
        text("SELECT id FROM did_master WHERE id = :id"),
        {"id": did_id}
    ).fetchone()

    if not check:
        return {"error": f"DID ID {did_id} not found."}

    # Delete
    db.execute(text("DELETE FROM did_master WHERE id = :id"), {"id": did_id})
    db.commit()

    return {"message": f"DID ID {did_id} deleted successfully."}
