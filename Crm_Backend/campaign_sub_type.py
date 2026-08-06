# campaign_sub_type.py
# Python port of AdminDetailsController addcampaignsubtype/addcampaignsubtype1/addcampaignsubtype_save (PHP)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from database import get_db4

router = APIRouter(prefix="/campaign-sub-type", tags=["Campaign Sub Type"])


class CampaignSubTypeRequest(BaseModel):
    client_id: int          # PHP: clientID
    campaign_type: str      # PHP: campaign_type


# -------------------- Clients list (PHP: addcampaignsubtype) --------------------
@router.get("/clients")
def get_clients(
    db: Session = Depends(get_db4),
):
    """List all active clients for the dropdown (like RegistrationMaster->find('list'))."""
    query = text("""
        SELECT company_id, company_name
        FROM registration_master
        WHERE status = 'A'
        ORDER BY company_name ASC
    """)
    rows = db.execute(query).mappings().all()
    return [
        {"company_id": row["company_id"], "company_name": row["company_name"]}
        for row in rows
    ]


# -------------------- Single client (PHP: addcampaignsubtype1) --------------------
@router.get("/clients/{client_id}")
def get_client(
    client_id: int,
    db: Session = Depends(get_db4),
):
    """Return a single client (like RegistrationMaster->find('list', conditions company_id))."""
    query = text("""
        SELECT company_id, company_name
        FROM registration_master
        WHERE company_id = :client_id
    """)
    row = db.execute(query, {"client_id": client_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"company_id": row["company_id"], "company_name": row["company_name"]}


# -------------------- Campaign type record (PHP: addcampaignsubtype/addcampaignsubtype1) --------------------
@router.get("/list")
def list_campaign_types(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db4),
):
    """
    Return campaign types joined with client name
    (like ObCampaignDataTypeMaster->find('all', joins registration_master)).
    If client_id given, filter by that client.
    """
    clauses = []
    params = {}
    if client_id is not None:
        clauses.append("oct.ClientId = :client_id")
        params["client_id"] = client_id

    where_sql = (" WHERE " + " AND ".join(clauses)) if clauses else ""

    query = text(f"""
        SELECT
            oct.Id,
            oct.CampaignType,
            oct.ClientId,
            oct.CreateDate,
            oct.CreateBy,
            rm.company_name
        FROM ob_campaign_type oct
        LEFT JOIN registration_master rm
            ON oct.ClientId = rm.company_id
        {where_sql}
    """)

    rows = db.execute(query, params).mappings().all()
    return [
        {
            "Id": row["Id"],
            "CampaignType": row["CampaignType"],
            "ClientId": row["ClientId"],
            "company_name": row["company_name"],
            "CreateDate": row["CreateDate"],
            "CreateBy": row["CreateBy"],
        }
        for row in rows
    ]


# -------------------- Save campaign sub type (PHP: addcampaignsubtype_save) --------------------
@router.post("/save")
def save_campaign_sub_type(
    payload: CampaignSubTypeRequest,
    db: Session = Depends(get_db4),
):
    """Insert a campaign type for a client (like ObCampaignDataTypeMaster->save)."""
    if not payload.campaign_type or not payload.campaign_type.strip():
        raise HTTPException(status_code=400, detail="Campaign type is required")

    # Verify client exists
    client = db.execute(
        text("SELECT company_id FROM registration_master WHERE company_id = :client_id"),
        {"client_id": payload.client_id},
    ).fetchone()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    query = text("""
        INSERT INTO ob_campaign_type
        (CampaignType, ClientId, CreateDate)
        VALUES
        (:campaign_type, :client_id, :create_date)
    """)

    try:
        result = db.execute(query, {
            "campaign_type": payload.campaign_type.strip(),
            "client_id": payload.client_id,
            "create_date": datetime.now(),
        })
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")

    return {
        "status": "success",
        "message": "Add Campaign Sub Type Successfully.",
        "id": result.lastrowid,
    }
