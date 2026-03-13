from fastapi import APIRouter, Depends, Query, HTTPException
from database import get_db4
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from sqlalchemy import text


router = APIRouter()




class ReportMatrixCreate(BaseModel):
    client_id: int
    user_name: str
    user_designation: str
    user_mobile: int
    user_email: str
    cc: str
    report: str
    report_type: str
    report_value: str
    send_type: List[str]



class ReportMatrixUpdate(BaseModel):
    id: int
    user_name: str
    user_designation: str
    user_mobile: int
    user_email: str
    cc: str
    report: str
    report_type: str
    report_value: str
    send_type: List[str]



@router.get("/report-master", response_model=List[dict])
def get_report_master(db: Session = Depends(get_db4)):

    sql = text("""
        SELECT *
        FROM report_master_new
        ORDER BY id
    """)

    result = db.execute(sql)
    rows = result.fetchall()

    return [dict(row._mapping) for row in rows]




@router.post("/save-report-matrix")
def save_report_matrix(data: ReportMatrixCreate, db: Session = Depends(get_db4)):

    report_val = data.report_value

    # Only modify if hourwise
    if data.report_type == "hourwise":
        exp = report_val.split(":")
        h = exp[0].lstrip("0") if exp[0] != "00" else "0"
        m = exp[1].lstrip("0") if exp[1] != "00" else "0"
        report_val = f"{h}:{m}"

    send_type_str = ",".join(data.send_type)

    sql = """
        INSERT INTO reportmatrix_master_new
        (
            client_id,
            user_name,
            user_designation,
            user_mobile,
            user_email,
            cc,
            report,
            report_type,
            report_value,
            send_type
        )
        VALUES
        (
            :client_id,
            :user_name,
            :user_designation,
            :user_mobile,
            :user_email,
            :cc,
            :report,
            :report_type,
            :report_value,
            :send_type
        )
    """

    params = {
        "client_id": data.client_id,
        "user_name": data.user_name,
        "user_designation": data.user_designation,
        "user_mobile": data.user_mobile,
        "user_email": data.user_email,
        "cc": data.cc,
        "report": data.report,
        "report_type": data.report_type,
        "report_value": report_val,
        "send_type": send_type_str
    }

    db.execute(text(sql), params)
    db.commit()

    return {"message": "Report matrix saved successfully"}



@router.get("/report-matrix", response_model=List[dict])
def get_report_matrix(CLIENT_ID: int = Query(...), db: Session = Depends(get_db4)):

    sql = text("""
        SELECT *
        FROM reportmatrix_master_new
        WHERE client_id = :cid
        ORDER BY id DESC
    """)

    result = db.execute(sql, {"cid": CLIENT_ID})
    rows = result.fetchall()

    return [dict(row._mapping) for row in rows]






@router.put("/report-matrix")
def update_report_matrix(data: ReportMatrixUpdate, db: Session = Depends(get_db4)):

    report_val = data.report_value

    # Only modify if hourwise
    if data.report_type == "hourwise":
        exp = report_val.split(":")
        h = exp[0].lstrip("0") if exp[0] != "00" else "0"
        m = exp[1].lstrip("0") if exp[1] != "00" else "0"
        report_val = f"{h}:{m}"

    send_type_str = ",".join(data.send_type)

    sql = """
        UPDATE reportmatrix_master_new
        SET
            user_name = :user_name,
            user_designation = :user_designation,
            user_mobile = :user_mobile,
            user_email = :user_email,
            cc = :cc,
            report = :report,
            report_type = :report_type,
            report_value = :report_value,
            send_type = :send_type
        WHERE id = :id
    """

    params = {
        "id": data.id,
        "user_name": data.user_name,
        "user_designation": data.user_designation,
        "user_mobile": data.user_mobile,
        "user_email": data.user_email,
        "cc": data.cc,
        "report": data.report,
        "report_type": data.report_type,
        "report_value": report_val,
        "send_type": send_type_str
    }

    db.execute(text(sql), params)
    db.commit()

    return {"message": "Report matrix updated successfully"}




@router.delete("/report-matrix")
def delete_report_matrix(id: int = Query(...), db: Session = Depends(get_db4)):

    # check if record exists
    check_sql = text("""
        SELECT id 
        FROM reportmatrix_master_new
        WHERE id = :id
    """)

    result = db.execute(check_sql, {"id": id}).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Record not found")

    # delete record
    delete_sql = text("""
        DELETE FROM reportmatrix_master_new
        WHERE id = :id
    """)

    db.execute(delete_sql, {"id": id})
    db.commit()

    return {"message": "Report matrix deleted successfully"}