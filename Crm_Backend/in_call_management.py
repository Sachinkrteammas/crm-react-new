from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from database import get_db4
import shutil
import os

router = APIRouter()

UPLOAD_DIR = "uploads/training_docs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------------------
# Upload Training Docs Upload
# ---------------------------

@router.post("/training/upload")
async def upload_training_docs(
    ClientId: str = Form(...),
    files: List[UploadFile] = File(...),
    descriptions: List[str] = Form(...),
    db: Session = Depends(get_db4)
):
    if len(files) != len(descriptions):
        raise HTTPException(status_code=400, detail="Files and descriptions count mismatch")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed")

    field_data = {}
    for idx, file in enumerate(files):
        filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        field_data[f"Field{idx+1}"] = file_path
        field_data[f"Des{idx+1}"] = descriptions[idx]

    # Use correct column 'createdate'
    columns = ", ".join(["ClientId"] + list(field_data.keys()) + ["createdate"])
    values = ", ".join([":ClientId"] + [f":{k}" for k in field_data.keys()] + ["NOW()"])
    query = text(f"INSERT INTO training_master ({columns}) VALUES ({values})")

    params = {"ClientId": ClientId}
    params.update(field_data)

    result = db.execute(query, params)
    db.commit()

    return {"detail": "Files uploaded successfully", "id": result.lastrowid}


# ---------------------------
# Get Training Docs
# ---------------------------
@router.get("/training/list")
def list_training_docs(ClientId: Optional[str] = None, db: Session = Depends(get_db4)):
    query_str = "SELECT * FROM training_master"
    params = {}
    if ClientId:
        query_str += " WHERE ClientId = :ClientId"
        params["ClientId"] = ClientId
    query_str += " ORDER BY createdate DESC"

    rows = db.execute(text(query_str), params).mappings().all()

    result = []
    for row in rows:
        files = []
        for i in range(1, 11):
            file_col = f"Field{i}"
            des_col = f"Des{i}"
            if row.get(file_col):
                files.append({"file_path": row[file_col], "description": row[des_col]})
        result.append({
            "id": row["id"],
            "ClientId": row["ClientId"],
            "createdate": row["createdate"],
            "files": files
        })

    return result


# ---------------------------
# Delete Training Doc
# ---------------------------
@router.delete("/training/delete/{id}")
def delete_training_doc(id: int, db: Session = Depends(get_db4)):
    row = db.execute(
        text("SELECT * FROM training_master WHERE id = :id"),
        {"id": id}
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Training doc not found")

    for i in range(1, 11):
        file_col = f"Field{i}"
        file_path = row.get(file_col)
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

    db.execute(
        text("DELETE FROM training_master WHERE id = :id"),
        {"id": id}
    )
    db.commit()

    return {"detail": "Training doc deleted successfully"}


# ---------------------------
# Pydantic Schemas
# ---------------------------
class AbandCallCreate(BaseModel):
    client_id: str
    start_time: str
    end_time: str
    aband_status: str  # now required as time threshold, e.g., "1", "10", "15"

class AbandCallResponse(BaseModel):
    id: int
    client_id: str
    start_time: str
    end_time: str
    aband_status: str
    created_at: Optional[datetime]
    created_by: Optional[int]
    active: Optional[int]

# ---------------------------
# Add / Create Aband Call Setting
# ---------------------------
@router.post("/aband_call/add", response_model=AbandCallResponse)
def add_aband_call(data: AbandCallCreate, db: Session = Depends(get_db4), user_id: int = 1):
    """
    Add a new aband call setting
    aband_status = time threshold in minutes (1, 10, 15, etc.)
    """
    query = text("""
        INSERT INTO aband_call_time (client_id, start_time, end_time, aband_status, created_at, created_by, active)
        VALUES (:client_id, :start_time, :end_time, :aband_status, NOW(), :created_by, 1)
    """)
    result = db.execute(query, {
        "client_id": data.client_id,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "aband_status": data.aband_status,
        "created_by": user_id
    })
    db.commit()

    # Fetch the newly created row
    new_id = result.lastrowid
    row = db.execute(text("SELECT * FROM aband_call_time WHERE id = :id"), {"id": new_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create setting")
    
    return dict(row)

# ---------------------------
# List / Get Aband Call Settings
# ---------------------------
@router.get("/aband_call/list", response_model=List[AbandCallResponse])
def list_aband_calls(search_client: Optional[str] = None, db: Session = Depends(get_db4)):
    """
    Get all aband call settings, optionally filtered by client_id
    """
    if search_client:
        query = text("SELECT * FROM aband_call_time WHERE client_id LIKE :client ORDER BY created_at DESC")
        rows = db.execute(query, {"client": f"%{search_client}%"}).mappings().all()
    else:
        query = text("SELECT * FROM aband_call_time ORDER BY created_at DESC")
        rows = db.execute(query).mappings().all()
    
    return [dict(row) for row in rows]

# ---------------------------
# Delete Aband Call Setting
# ---------------------------
@router.delete("/aband_call/delete/{id}")
def delete_aband_call(id: int, db: Session = Depends(get_db4)):
    """
    Delete an aband call setting by id
    """
    query = text("DELETE FROM aband_call_time WHERE id = :id")
    result = db.execute(query, {"id": id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Setting not found")
    return {"detail": "Setting deleted successfully"}
