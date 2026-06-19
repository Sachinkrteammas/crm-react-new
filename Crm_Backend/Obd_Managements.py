from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db2,get_db4

from models import ObdList, ObdData
from datetime import datetime
import csv
import io
from pydantic import BaseModel

class AddListRequest(BaseModel):
    list_id: str
    description: str
    created_by: str

router = APIRouter()

@router.post("/obd/add-list")
def add_list(
    request: AddListRequest,
    db2: Session = Depends(get_db4)
):
    new_list = ObdList(
        list_id=request.list_id,
        description=request.description,
        created_by=request.created_by,
        createdate=datetime.now()
    )

    db2.add(new_list)
    db2.commit()

    return {
        "status": True,
        "message": "List Added Successfully"
    }

@router.post("/obd/data-upload")
async def data_upload(
    list_id: str = Form(...),
    file: UploadFile = File(...),
    db2: Session = Depends(get_db4)
):

    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files allowed"
        )

    content = await file.read()

    csv_reader = csv.reader(
        io.StringIO(content.decode("utf-8"))
    )

    next(csv_reader, None)

    records = []

    for row in csv_reader:

        if not row:
            continue

        obd_data = ObdData(
            list_id=list_id,
            msisdn=row[0],
            createdate=datetime.now()
        )

        records.append(obd_data)

    db2.bulk_save_objects(records)
    db2.commit()

    return {
        "status": True,
        "message": f"{len(records)} Records Uploaded Successfully"
    }

@router.get("/report")
def report(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db2),
    db2: Session = Depends(get_db4)
):

    list_ids = db2.execute(
        text("""
            SELECT list_id
            FROM obd_list
        """)
    ).fetchall()

    if not list_ids:
        return []

    list_ids = [str(row[0]) for row in list_ids]

    list_string = ",".join(list_ids)

    query = f"""
        SELECT *
        FROM vicidial_list
        WHERE entry_date >= '{start_date} 00:00:00'
        AND entry_date <= '{end_date} 23:59:59'
        AND list_id IN ({list_string})
    """

    result = db.execute(
        text(query)
    ).mappings().all()

    return {
        "status": True,
        "count": len(result),
        "data": result
    }

@router.get("/obd/list")
def get_lists(db2: Session = Depends(get_db4)):
    data = db2.execute(
        text("""
            SELECT DISTINCT list_id
            FROM obd_list
            ORDER BY list_id
        """)
    ).mappings().all()

    return data

@router.get("/obd/list-master")
def get_list_master(db2: Session = Depends(get_db4)):
    data = db2.execute(text("""
        SELECT *
        FROM obd_list
        ORDER BY id DESC
    """)).mappings().all()

    return data

@router.delete("/obd/list/{id}")
def delete_list(
    id: int,
    db2: Session = Depends(get_db4)
):
    result = db2.execute(
        text("DELETE FROM obd_list WHERE id = :id"),
        {"id": id}
    )

    db2.commit()

    return {
        "status": True,
        "message": "List Deleted Successfully"
    }

############################################### Order Status #####################

@router.get("/order-status")
def order_status(
    db: Session = Depends(get_db2)
):
    qry = """
    SELECT
        modify_date,
        phone_number,
        last_name,
        address3,
        called_count,
        comments
    FROM vicidial_list
    WHERE list_id='202401'
    AND user IS NOT NULL
    AND user!=''
    AND comments!=''
    AND DATE(modify_date) >= '2024-01-30'
    ORDER BY modify_date DESC
    """

    result = db.execute(text(qry)).mappings().all()

    final_data = []

    for row in result:

        order_id = row["address3"]

        tag_qry = """
        SELECT tag_status
        FROM farm_didi
        WHERE order_id = :order_id
        LIMIT 1
        """

        tag_result = db.execute(
            text(tag_qry),
            {"order_id": order_id}
        ).mappings().first()

        tag_status = (
            tag_result["tag_status"]
            if tag_result
            else ""
        )

        if (
            (
                row["called_count"] == 4
                and row["last_name"] == ""
                and row["comments"] == "1"
            )
            or (
                row["last_name"] == "1"
                and row["comments"] == "1"
            )
            or (
                row["last_name"] == "2"
                and row["comments"] == "1"
            )
        ):
            continue

        status = (
            "Yes"
            if str(row["last_name"]) == "1"
            else (
                "No"
                if str(row["last_name"]) == "2"
                else "N/A"
            )
        )

        final_data.append({
            "order_id": row["address3"],
            "phone_number": row["phone_number"],
            "call_date": row["modify_date"],
            "status": status,
            "call_count": row["called_count"],
            "tag_status": tag_status,
            "response": row["comments"]
        })

    return final_data