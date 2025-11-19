# manage_allocations.py
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime
from database import get_db4  # make sure this is your SQLAlchemy session dependency

router = APIRouter(prefix="/allocations", tags=["Manage Allocations"])

# -------------------- 1. Get Upload Types Dropdown --------------------
@router.get("/types")
def get_allocation_types(db: Session = Depends(get_db4)):
    """
    Returns unique upload types from ob_allocation_name table for dropdown
    """
    query = "SELECT DISTINCT upload_type FROM ob_allocation_name WHERE upload_type IS NOT NULL"
    rows = db.execute(text(query)).mappings().all()
    return [{"name": row["upload_type"]} for row in rows]

# -------------------- 2. Create a New Allocation --------------------
@router.post("/create")
def create_allocation(
    ClientId: int = Form(...),
    CampaignId: int = Form(...),
    AllocationName: str = Form(...),
    upload_type: str = Form(...),
    TotalCount: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db4)
):
    """
    Create a new allocation — automatically calculate TotalCount from CSV if uploaded.
    """
    create_date = datetime.now()

    # ✅ Step 1: Calculate total rows from uploaded CSV
    total_count = 0
    if file:
        try:
            import csv
            from io import StringIO

            # Read CSV content
            content = file.file.read().decode("utf-8", errors="ignore")
            reader = csv.reader(StringIO(content))

            # Skip header if present (optional)
            rows = list(reader)
            if len(rows) > 1 and all(rows[0]):
                total_count = len(rows) - 1  # assuming first row is header
            else:
                total_count = len(rows)

        except Exception as e:
            print("❌ Error reading CSV:", e)
            total_count = 0

    # ✅ Step 2: Fallback if no file uploaded
    if TotalCount:
        total_count = int(TotalCount)

    # ✅ Step 3: Insert record
    query = text("""
        INSERT INTO ob_allocation_name
        (ClientId, CampaignId, AllocationName, CreateDate, TotalCount, upload_type, AllocationStatus)
        VALUES (:ClientId, :CampaignId, :AllocationName, :CreateDate, :TotalCount, :upload_type, 'A')
    """)
    params = {
        "ClientId": ClientId,
        "CampaignId": CampaignId,
        "AllocationName": AllocationName,
        "CreateDate": create_date,
        "TotalCount": total_count,
        "upload_type": upload_type,
    }

    db.execute(query, params)
    db.commit()

    return {
        "message": "Allocation created successfully",
        "TotalCount": total_count,
    }


# -------------------- 3. List Allocations --------------------
@router.get("/list")
def list_allocations(ClientId: Optional[int] = None, CampaignId: Optional[int] = None, db: Session = Depends(get_db4)):
    """
    List allocations with optional filters
    """
    query = """
        SELECT id, ClientId, CampaignId, AllocationName, CreateDate, TotalCount, upload_type, AllocationStatus
        FROM ob_allocation_name
        WHERE 1=1
    """
    params = {}
    if ClientId:
        query += " AND ClientId = :ClientId"
        params["ClientId"] = ClientId
    if CampaignId:
        query += " AND CampaignId = :CampaignId"
        params["CampaignId"] = CampaignId

    query += " ORDER BY CreateDate DESC"
    rows = db.execute(text(query), params).mappings().all()

    return [
        {
            "id": row["id"],
            "ClientId": row["ClientId"],
            "CampaignId": row["CampaignId"],
            "AllocationName": row["AllocationName"],
            "CreateDate": row["CreateDate"],
            "TotalCount": row["TotalCount"],
            "upload_type": row["upload_type"],
            "Status": row["AllocationStatus"]
        }
        for row in rows
    ]

# -------------------- 4. Delete Allocation --------------------
@router.delete("/delete/{allocation_id}")
def delete_allocation(allocation_id: int, db: Session = Depends(get_db4)):
    """
    Delete an allocation by ID
    """
    # Check if allocation exists
    existing = db.execute(text("SELECT id FROM ob_allocation_name WHERE id = :id"), {"id": allocation_id}).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Allocation not found")

    db.execute(text("DELETE FROM ob_allocation_name WHERE id = :id"), {"id": allocation_id})
    db.commit()
    return {"message": "Allocation deleted successfully"}
