# manage_allocations.py
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime
from database import get_db4, get_db2  # make sure this is your SQLAlchemy session dependency
from pydantic import BaseModel
import csv
from io import StringIO

router = APIRouter(prefix="/allocations", tags=["Manage Allocations"])




class AllocationUpdateRequest(BaseModel):
    update_user: str




@router.get("/dialer-connection-page")
def get_dialer_connection_page(
    company_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    try:
        query = text("""
            SELECT DialerConnectionPage
            FROM registration_master
            WHERE company_id = :company_id
        """)

        result = db.execute(query, {"company_id": company_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Company not found")

        return {
            "company_id": company_id,
            "DialerConnectionPage": result[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 1. Get Upload Types Dropdown --------------------
# @router.get("/types")
# def get_allocation_types(db: Session = Depends(get_db4)):
#     """
#     Returns unique upload types from ob_allocation_name table for dropdown
#     """
#     query = "SELECT DISTINCT upload_type FROM ob_allocation_name WHERE upload_type IS NOT NULL"
#     rows = db.execute(text(query)).mappings().all()
#     return [{"name": row["upload_type"]} for row in rows]

# -------------------- 2. Create a New Allocation --------------------

@router.post("/create")
def create_allocation(
    ClientId: int = Form(...),
    CampaignId: int = Form(...),
    AllocationName: str = Form(...),
    upload_type: str = Form(...),
    DialerConnectionPage: int = Form(...),
    list_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    create_date = datetime.now()

    # ✅ 1️⃣ Check duplicate
    check_query = text("""
        SELECT id FROM ob_allocation_name
        WHERE ClientId = :ClientId
        AND CampaignId = :CampaignId
        AND AllocationName = :AllocationName
        AND AllocationStatus = 'A'
        LIMIT 1
    """)

    existing = db.execute(check_query, {
        "ClientId": ClientId,
        "CampaignId": CampaignId,
        "AllocationName": AllocationName
    }).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Allocation already exists")

    # ✅ 2️⃣ Read CSV
    content = file.file.read().decode("utf-8", errors="ignore")
    reader = csv.reader(StringIO(content))
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    headers = [h.strip() for h in rows[0]]

    # ✅ 3️⃣ Validate column COUNT (like PHP count_field)
    # PHP: if (count($filedata) != $cntField) → "Does not Match This Campaign Formate."
    campaign_row = db.execute(text("""
        SELECT TotalCount
        FROM ob_campaign
        WHERE ClientId = :cid AND id = :campaignId
    """), {"cid": ClientId, "campaignId": CampaignId}).fetchone()

    if not campaign_row:
        raise HTTPException(status_code=400, detail="Campaign not found")

    cnt_field = int(campaign_row[0] or 0)

    if len(headers) != cnt_field:
        raise HTTPException(
            status_code=400,
            detail="Does not Match This Campaign Formate."
        )

    # 🔥 Column count (like PHP: TotalCount => count of header row)
    total_count = len(headers)

    # ✅ 3️⃣ Insert allocation
    insert_alloc = text("""
        INSERT INTO ob_allocation_name
        (ClientId, CampaignId, AllocationName, CreateDate, TotalCount, list_id, upload_type, AllocationStatus)
        VALUES (:ClientId, :CampaignId, :AllocationName, :CreateDate, :TotalCount, :list_id, :upload_type, 'A')
    """)

    result = db.execute(insert_alloc, {
        "ClientId": ClientId,
        "CampaignId": CampaignId,
        "AllocationName": AllocationName,
        "CreateDate": create_date,
        "TotalCount": total_count,
        "list_id": list_id,
        "upload_type": upload_type,
    })

    db.commit()
    allocation_id = result.lastrowid

    # ✅ 4️⃣ Insert campaign data
    for row in rows[1:]:
        data_dict = {
            "AllocationId": allocation_id,
            "CreationDate": create_date,
            **{f"Field{i}": None for i in range(1, 21)}
        }

        # 🔥 Map positionally (like PHP): column c → Field{c+1}, header names ignored
        for c, value in enumerate(row):
            if c >= 20:
                break
            data_dict[f"Field{c+1}"] = value

        insert_campaign_data = text("""
            INSERT INTO ob_campaign_data
            (AllocationId, CreationDate,
             Field1, Field2, Field3, Field4, Field5,
             Field6, Field7, Field8, Field9, Field10,
             Field11, Field12, Field13, Field14, Field15,
             Field16, Field17, Field18, Field19, Field20)
            VALUES (:AllocationId, :CreationDate,
                    :Field1, :Field2, :Field3, :Field4, :Field5,
                    :Field6, :Field7, :Field8, :Field9, :Field10,
                    :Field11, :Field12, :Field13, :Field14, :Field15,
                    :Field16, :Field17, :Field18, :Field19, :Field20)
        """)

        db.execute(insert_campaign_data, data_dict)

        # ✅ 5️⃣ Insert into vicidial_list ONLY IF:
        # DialerConnectionPage == 5 AND upload_type == "pd"
        if DialerConnectionPage == 5 and upload_type.lower() == "pd":

            phone_number = data_dict.get("Field1")

            vicidial_insert = text("""
                INSERT INTO vicidial_list
                (entry_date, modify_date, status, list_id, source_id,
                 gmt_offset_now, called_since_last_reset, phone_code, phone_number)
                VALUES
                (:entry_date, :modify_date, 'NEW', :list_id, :source_id,
                 '-4.00', 'N', '1', :phone_number)
            """)

            # 🔥 USE db2 HERE
            db2.execute(vicidial_insert, {
                "entry_date": create_date,
                "modify_date": create_date,
                "list_id": list_id,
                "source_id": allocation_id,
                "phone_number": phone_number
            })

    # Commit both sessions safely
    db.commit()
    db2.commit()

    return {
        "message": "Allocation created successfully",
        "allocation_id": allocation_id,
        "TotalCount (Column Count)": total_count
    }








# @router.post("/create")
# def create_allocation(
#     ClientId: int = Form(...),
#     CampaignId: int = Form(...),
#     AllocationName: str = Form(...),
#     upload_type: str = Form(...),
#     TotalCount: Optional[str] = Form(None),
#     list_id: int = Form(...),
#     file: Optional[UploadFile] = File(None),
#     db: Session = Depends(get_db4),
#     db2: Session = Depends(get_db2)
# ):
#     """
#     Create a new allocation — automatically calculate TotalCount from CSV if uploaded.
#     """
#     create_date = datetime.now()

#     # Check if allocation already exists
#     check_query = text("""
#         SELECT id FROM ob_allocation_name
#         WHERE ClientId = :ClientId
#         AND CampaignId = :CampaignId
#         AND AllocationName = :AllocationName
#         AND AllocationStatus = 'A'
#         LIMIT 1
#     """)

#     existing = db.execute(check_query, {
#         "ClientId": ClientId,
#         "CampaignId": CampaignId,
#         "AllocationName": AllocationName.strip()
#     }).fetchone()

#     if existing:
#         return {
#             "success": False,
#             "message": "Allocation already exists with this name for selected campaign."
#         }

#     # ✅ Step 1: Calculate total rows from uploaded CSV
#     total_count = 0
#     if file:
#         try:
#             import csv
#             from io import StringIO

#             # Read CSV content
#             content = file.file.read().decode("utf-8", errors="ignore")
#             reader = csv.reader(StringIO(content))

#             # Skip header if present (optional)
#             rows = list(reader)
#             if len(rows) > 1 and all(rows[0]):
#                 total_count = len(rows) - 1  # assuming first row is header
#             else:
#                 total_count = len(rows)

#         except Exception as e:
#             print("❌ Error reading CSV:", e)
#             total_count = 0

#     # ✅ Step 2: Fallback if no file uploaded
#     if TotalCount:
#         total_count = int(TotalCount)

#     # ✅ Step 3: Insert record
#     query = text("""
#         INSERT INTO ob_allocation_name
#         (ClientId, CampaignId, AllocationName, CreateDate, TotalCount, list_id, upload_type, AllocationStatus)
#         VALUES (:ClientId, :CampaignId, :AllocationName, :CreateDate, :TotalCount, :list_id, :upload_type, 'A')
#     """)
#     params = {
#         "ClientId": ClientId,
#         "CampaignId": CampaignId,
#         "AllocationName": AllocationName,
#         "CreateDate": create_date,
#         "TotalCount": total_count,
#         "list_id": list_id,
#         "upload_type": upload_type,
#     }

#     db.execute(query, params)
#     db.commit()

#     return {
#         "message": "Allocation created successfully",
#         "TotalCount": total_count,
#     }


# -------------------- 3. List Allocations --------------------
@router.get("/list")
def list_allocations(ClientId: Optional[int] = None, CampaignId: Optional[int] = None, db: Session = Depends(get_db4)):
    """
    List allocations with optional filters
    """
    query = """
        SELECT id, ClientId, CampaignId, AllocationName, CreateDate, TotalCount, upload_type, AllocationStatus
        FROM ob_allocation_name
        WHERE AllocationStatus='A'
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



@router.put("/allocation/{allocation_id}")
def update_allocation(
    allocation_id: int,
    payload: AllocationUpdateRequest,
    db: Session = Depends(get_db4)
):
    """
    Soft delete allocation (like PHP)
    Takes update_user from input
    """

    # 1️⃣ Check if allocation exists
    existing = db.execute(
        text("""
            SELECT id 
            FROM ob_allocation_name 
            WHERE id = :id
        """),
        {"id": allocation_id}
    ).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Allocation not found")

    # 2️⃣ Update record (Soft Delete style like PHP)
    db.execute(
        text("""
            UPDATE ob_allocation_name
            SET AllocationStatus = 'D',
                update_user = :update_user,
                update_date = :update_date
            WHERE id = :id
        """),
        {
            "id": allocation_id,
            "update_user": payload.update_user,
            "update_date": datetime.now()
        }
    )

    db.commit()

    return {
        "message": "Allocation updated successfully",
        "allocation_id": allocation_id,
        "updated_by": payload.update_user
    }



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