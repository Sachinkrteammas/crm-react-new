# manage_out_call_mis_report.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import get_db4

router = APIRouter(prefix="/outcall/mis", tags=["OutCall MIS Report"])


# -------- Pydantic --------
class MISCreate(BaseModel):
    client_id: int
    campaign_id: int
    user_name: str
    user_designation: str
    user_mobile: str
    user_email: str
    report: str
    report_type: str
    report_value: str
    send_type: str


# -------- GET All MIS Reports --------

@router.get("/reports")
def get_reports(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT id, client_id, campaign_id, user_name, user_designation,
               user_mobile, user_email, report, report_type, report_value, send_type
        FROM obreportmatrix_master
        ORDER BY id DESC
    """)).fetchall()

    return [dict(row._mapping) for row in rows]


# -------- INSERT (POST) --------
@router.post("/create")
def create_mis(report: MISCreate, db: Session = Depends(get_db4)):
    try:
        query = """
            INSERT INTO obreportmatrix_master 
            (client_id, campaign_id, user_name, user_designation, user_mobile, 
             user_email, report, report_type, report_value, send_type)
            VALUES (:client_id, :campaign_id, :user_name, :user_designation, :user_mobile,
                    :user_email, :report, :report_type, :report_value, :send_type)
        """
        db.execute(query, report.dict())
        db.commit()
        return {"status": "success", "message": "MIS Report saved"}
    except Exception as e:
        return {"status": "error", "details": str(e)}
