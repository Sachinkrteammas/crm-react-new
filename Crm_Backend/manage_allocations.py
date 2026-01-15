# manage_allocations.py
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, Query
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





##########################   scenario-automate call summary ##################

from sqlalchemy import text

def get_client_name(db, client_id):
    sql = text("""
        SELECT company_name
        FROM registration_master
        WHERE company_id = :client_id
    """)

    result = db.execute(sql, {"client_id": client_id}).fetchone()
    return result[0] if result else None




@router.post("/scenario")
def save_scenario(
    payload: dict,
    db: Session = Depends(get_db4)
):


    client = payload.get("client")
    to = payload.get("to")
    cc = payload.get("cc")
    remarks = payload.get("remarks")

    if not client or not to:
        raise HTTPException(status_code=400, detail="Client and To are required")

    client_name = get_client_name(db, client)

    sql = """
        INSERT INTO scenario_automate
        (report_type, client, client_name, `to`, cc, remarks, created_at, created_by)
        VALUES
        ('scenario', :client, :client_name, :to, :cc, :remarks, :created_at, :created_by)
    """

    db.execute(sql, {
        "client": client,
        "client_name": client_name,
        "to": to,
        "cc": cc,
        "remarks": remarks,
        "created_at": datetime.now(),
        "created_by": payload.get("created_by", "ADMIN")
    })
    db.commit()

    return {"status": "success", "message": "Scenario added successfully"}


@router.post("/call-summary-out")
def save_call_summary_out(
    payload: dict,
    db: Session = Depends(get_db4)
):
    client = payload.get("client")
    email_to = payload.get("to")
    created_by = payload.get("created_by")  # MUST be int

    if not client or not email_to:
        raise HTTPException(status_code=400, detail="Client and To are required")

    if not created_by:
        raise HTTPException(status_code=400, detail="created_by is required")

    client_id = int(client)
    created_by_id = int(created_by)

    client_name = get_client_name(db, client_id)

    sql = text("""
        INSERT INTO scenario_automate
        (
            report_type,
            client,
            client_name,
            `to`,
            cc,
            remarks,
            created_at,
            created_by
        )
        VALUES
        (
            'call_summary',
            :client,
            :client_name,
            :email_to,
            :cc,
            :remarks,
            :created_at,
            :created_by
        )
    """)

    try:
        db.execute(sql, {
            "client": client_id,
            "client_name": client_name,
            "email_to": email_to,
            "cc": payload.get("cc"),
            "remarks": payload.get("remarks"),
            "created_at": datetime.now(),
            "created_by": created_by_id
        })
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "success",
        "message": "Call summary OUT added successfully"
    }


@router.post("/call-summary-in")
def save_call_summary_in(
    payload: dict,
    db: Session = Depends(get_db4)
):
    client = payload.get("client")
    to = payload.get("to")

    if not client or not to:
        raise HTTPException(status_code=400, detail="Client and To are required")

    client_name = get_client_name(db, client)

    sql = """
        INSERT INTO scenario_automate
        (report_type, client, client_name, `to`, cc, remarks, created_at, created_by)
        VALUES
        ('call_summary_in', :client, :client_name, :to, :cc, :remarks, :created_at, :created_by)
    """

    db.execute(sql, {
        "client": client,
        "client_name": client_name,
        "to": payload.get("to"),
        "cc": payload.get("cc"),
        "remarks": payload.get("remarks"),
        "created_at": datetime.now(),
        "created_by": payload.get("created_by", "ADMIN")
    })
    db.commit()

    return {"status": "success", "message": "Call summary IN added"}


@router.get("/")
def list_allocations(
    report_type: str = Query(...),
    client: int | None = Query(None),
    db: Session = Depends(get_db4)
):
    sql = """
        SELECT
            id,
            report_type,
            client,
            client_name,
            `to`,
            cc,
            remarks,
            created_at
        FROM scenario_automate
        WHERE report_type = :report_type
    """

    params = {"report_type": report_type}

    if client:
        sql += " AND client = :client"
        params["client"] = client

    sql += " ORDER BY created_at DESC"

    rows = db.execute(
        text(sql),   # ✅ THIS WAS MISSING
        params
    ).mappings().all()

    return rows



@router.delete("/{id}")
def delete_allocation(
    id: int,
    db: Session = Depends(get_db4)
):
    sql = text("""
        DELETE FROM scenario_automate
        WHERE id = :id
    """)

    result = db.execute(sql, {"id": id})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    return {
        "status": "success",
        "message": "Deleted successfully"
    }

##########################   scenario-automate call summary End ##################

##########################   Out Call Report Automation Start ##################
def get_campaign_name(db, client_id: int, campaign_id: int):
    sql = text("""
        SELECT CampaignName
        FROM campaign_name
        WHERE ClientId = :client_id
          AND id = :campaign_id
          AND CampaignStatus = 'A'
    """)
    row = db.execute(sql, {
        "client_id": client_id,
        "campaign_id": campaign_id
    }).fetchone()
    return row[0] if row else None


@router.get("/list_outcall_automation")
def list_outcall_automation(
    client: int = Query(...),
    db: Session = Depends(get_db4)
):
    sql = text("""
        SELECT
            id,
            client,
            client_name,
            campaign_id,
            campaign_name,
            `to`,
            cc,
            remarks,
            created_at
        FROM out_call_detail_automate
        WHERE client = :client
        ORDER BY created_at DESC
    """)

    rows = db.execute(sql, {"client": client}).mappings().all()
    return rows


@router.get("/all-campaigns-with-company")
def get_all_campaigns_with_company(db: Session = Depends(get_db4)):
    sql = text("""
        SELECT company_id, campaignid
        FROM registration_master
        WHERE STATUS = 'A'
          AND campaignid IS NOT NULL
    """)

    rows = db.execute(sql).fetchall()

    result = []

    for company_id, campaignid in rows:
        for c in campaignid.split(","):
            result.append({
                "company_id": company_id,
                "campaign": c.strip().strip("'")
            })

    return result


def get_campaign_id(db: Session, campaign_name: str) -> int | None:
    """
    Returns campaign id for a given campaign_name from ob_campaign table.
    """
    sql = text("""
        SELECT id
        FROM ob_campaign
        WHERE CampaignName = :campaign_name
        LIMIT 1
    """)
    row = db.execute(sql, {"campaign_name": campaign_name}).fetchone()
    return row[0] if row else None



@router.post("/save_outcall_automation")
def save_outcall_automation(
    payload: dict,
    db: Session = Depends(get_db4)
):
    client_id = int(payload.get("company_id"))
    campaign_name = payload.get("campaign_name")
    email_to = payload.get("to")

    if not client_id or not email_to:
        raise HTTPException(
            status_code=400,
            detail="client, campaign_id and to are required"
        )

    client_name = get_client_name(db, client_id)
    campaign_id = get_campaign_id(db, campaign_name)
    print(campaign_id,"campaign_id")

    if not campaign_name:
        raise HTTPException(status_code=404, detail="Campaign not found")

    sql = text("""
        INSERT INTO out_call_detail_automate
        (
            client,
            client_name,
            campaign_id,
            campaign_name,
            `to`,
            cc,
            remarks,
            created_at,
            created_by
        )
        VALUES
        (
            :client,
            :client_name,
            :campaign_id,
            :campaign_name,
            :to,
            :cc,
            :remarks,
            :created_at,
            :created_by
        )
    """)

    try:
        db.execute(sql, {
            "client": client_id,
            "client_name": client_name,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "to": email_to,
            "cc": payload.get("cc"),
            "remarks": payload.get("remarks"),
            "created_at": datetime.now(),
            "created_by": client_id
        })
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "success",
        "message": "Out Call Automation added successfully"
    }


@router.delete("/delete_outcall_automation/{id}")
def delete_outcall_automation(
    id: int,
    db: Session = Depends(get_db4)
):
    sql = text("""
        DELETE FROM out_call_detail_automate
        WHERE id = :id
    """)

    result = db.execute(sql, {"id": id})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    return {
        "status": "success",
        "message": "Deleted successfully"
    }










##########################   Out Call Report Automation End ##################