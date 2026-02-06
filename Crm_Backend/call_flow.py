from fastapi import APIRouter, Depends, Query, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4   # adjust import if needed
from pydantic import BaseModel
from typing import Optional
from datetime import datetime



router = APIRouter()




@router.get("/callflow")
def get_callflow(
    client_id: int = Query(..., description="Client ID"),
    db: Session = Depends(get_db4)
):
    sql = text("""
        SELECT *
        FROM call_flow
        WHERE client_id = :client_id
    """)

    result = db.execute(sql, {"client_id": client_id}).mappings().all()

    return {
        "client_id": client_id,
        "count": len(result),
        "data": result
    }





@router.post("/call-flow/create")
def create_call_flow(
    client_id: int = Query(..., description="Client ID"),

    language: str = Form(None),
    category: str = Form(None),
    type: str = Form(None),
    subtype: str = Form(None),
    subtype1: str = Form(None),
    subtype2: str = Form(None),

    resolution: str = Form(...),      # 👈 RAW HTML (stored as-is)
    createby: int = Form(...),

    db: Session = Depends(get_db4)
):
    now = datetime.now()

    insert_query = text("""
        INSERT INTO call_flow
        (
            client_id,
            language,
            category,
            type,
            subtype,
            subtype1,
            subtype2,
            resolution,
            createdate,
            createby
        )
        VALUES
        (
            :client_id,
            :language,
            :category,
            :type,
            :subtype,
            :subtype1,
            :subtype2,
            :resolution,
            :createdate,
            :createby
        )
    """)

    db.execute(insert_query, {
        "client_id": client_id,
        "language": language,
        "category": category,
        "type": type,
        "subtype": subtype,
        "subtype1": subtype1,
        "subtype2": subtype2,
        "resolution": resolution,   # ✅ EXACT CONTENT
        "createdate": now,
        "createby": createby,
    })

    db.commit()

    return {
        "status": "success",
        "message": "Call flow created successfully"
    }




@router.delete("/call-flow/delete")
def delete_call_flow(
    id: int = Query(..., description="Call Flow ID"),
    db: Session = Depends(get_db4)
):
    delete_query = text("""
        DELETE FROM call_flow
        WHERE id = :id
    """)

    result = db.execute(delete_query, {"id": id})
    db.commit()

    if result.rowcount == 0:
        return {
            "status": "error",
            "message": "Call flow not found"
        }

    return {
        "status": "success",
        "message": "Call flow deleted successfully"
    }