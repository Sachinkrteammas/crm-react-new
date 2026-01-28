from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime
from database import get_db4  # Your DB dependency

router = APIRouter()

# ----------------------------
# Request Body
# ----------------------------
class ProcessUpdateBody(BaseModel):
    Datetime: datetime        # date_time field
    clientID: int             # ClientId
    processdate: str          # process_update
    type: str                 # type
    validfrom: date           # valid_from
    validtill: date           # valid_till

# ----------------------------
# API Endpoint
# ----------------------------
@router.post("/save_process_update")
def save_process_update(
    body: ProcessUpdateBody,
    db: Session = Depends(get_db4)
):
    # 1️⃣ Check if client exists
    client_query = text("""
        SELECT company_name 
        FROM registration_master 
        WHERE company_id = :client_id AND status = 'A'
    """)
    client_row = db.execute(client_query, {"client_id": body.clientID}).mappings().first()
    
    if not client_row:
        raise HTTPException(status_code=404, detail="Client not found or inactive")
    
    company_name = client_row["company_name"]

    # 2️⃣ Insert data into process_update
    insert_query = text("""
        INSERT INTO process_update
        (date_time, ClientId, company_name, process_update, type, valid_from, valid_till)
        VALUES
        (:date_time, :ClientId, :company_name, :process_update, :type, :valid_from, :valid_till)
    """)

    db.execute(insert_query, {
        "date_time": body.Datetime,
        "ClientId": body.clientID,
        "company_name": company_name,
        "process_update": body.processdate,
        "type": body.type,
        "valid_from": body.validfrom,
        "valid_till": body.validtill
    })

    db.commit()

    return {
        "status": "success",
        "message": "Process update saved successfully",
        "data": {
            "date_time": body.Datetime,
            "clientID": body.clientID,
            "company_name": company_name,
            "process_update": body.processdate,
            "type": body.type,
            "valid_from": body.validfrom,
            "valid_till": body.validtill
        }
    }



@router.get("/view_process_update")
def get_process_update(
    db: Session = Depends(get_db4)
):

    query = text("""SELECT pu.id,pu.date_time,pu.process_update,pu.id,pu.company_name,pu.type,pu.valid_from,pu.valid_till,COUNT(pr.id) AS `Total` FROM process_update pu
        LEFT JOIN process_read pr ON pu.id = pr.process_id GROUP BY pu.id""")
    rows = db.execute(query).fetchall()


    return [dict(r._mapping) for r in rows]



@router.delete("/delete_process_update")
def delete_process_update(
    process_id: int = Query(..., description="ID of the process update to delete"),
    db: Session = Depends(get_db4)
):
    # 1️⃣ Check if record exists
    check_query = text("SELECT * FROM process_update WHERE id = :id")
    existing = db.execute(check_query, {"id": process_id}).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Process update not found")

    # 2️⃣ Delete the record
    delete_query = text("DELETE FROM process_update WHERE id = :id")
    db.execute(delete_query, {"id": process_id})
    db.commit()

    return {
        "status": "success",
        "message": f"Process update with ID {process_id} deleted successfully"
    }