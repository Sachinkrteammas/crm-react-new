# Manage Campaign Api routes..
from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime
from database import get_db4
from pydantic import BaseModel



router = APIRouter(prefix="/campaign", tags=["Manage Campaigns"])




class UpdateCampaignStatusRequest(BaseModel):
    id: int
    update_user: str




# ✅ 1. Get Campaign Type Dropdown
@router.get("/types")
def get_campaign_types(ClientId: Optional[int] = None, db: Session = Depends(get_db4)):
    query = "SELECT DISTINCT CampaignType FROM ob_campaign_type"
    params = {}
    if ClientId:
        query += " WHERE ClientId = :ClientId"
        params["ClientId"] = ClientId
    result = db.execute(text(query), params).mappings().all()
    return [{"name": row["CampaignType"]} for row in result]


# ✅ 2. Create a New Campaign
@router.post("/create")
def create_campaign(
    ClientId: int = Form(...),
    CampaignName: str = Form(...),
    campaign_description: Optional[str] = Form(None),
    CampaignTypeId: str = Form(...),
    fields: Optional[List[str]] = Form(None),
    db: Session = Depends(get_db4)
):
    creation_date = datetime.now()

    # # ✅ Fetch CampaignType name from ob_campaign_type
    # type_query = text("SELECT CampaignType FROM ob_campaign_type WHERE Id = :id")
    # type_result = db.execute(type_query, {"id": CampaignTypeId}).fetchone()
    # CampaignParentName = type_result[0] if type_result else None

    # ✅ Prepare dynamic field columns
    field_data = {}
    if fields:
        for i, value in enumerate(fields, start=1):
            if i <= 20 and value.strip():
                field_data[f"Field{i}"] = value.strip()

    total_count = len(field_data)  # ✅ Count total filled fields

    # ✅ Build query dynamically
    columns = [
        "ClientId",
        "CampaignName",
        "campaign_description",
        "campaign_id",
        "CreationDate",
        "CampaignStatus",
        "TotalCount",
        "CampaignParentName"  # ✅ Add here
    ] + list(field_data.keys())

    values = [
        ":ClientId",
        ":CampaignName",
        ":campaign_description",
        ":campaign_id",
        ":CreationDate",
        "'A'",
        ":TotalCount",
        ":CampaignParentName"  # ✅ Add here
    ] + [f":{k}" for k in field_data.keys()]

    query = text(f"""
        INSERT INTO ob_campaign
        ({', '.join(columns)})
        VALUES ({', '.join(values)})
    """)

    params = {
        "ClientId": ClientId,
        "CampaignName": CampaignName,
        "campaign_description": campaign_description,
        "campaign_id": CampaignTypeId,
        "CreationDate": creation_date,
        "TotalCount": total_count,
        "CampaignParentName": CampaignTypeId,  
        **field_data
    }

    db.execute(query, params)
    db.commit()
    return {"message": "Campaign created successfully", "TotalCount": total_count, "CampaignParentName": CampaignTypeId}


# ✅ 3. List All Campaigns (with Type Name)
@router.get("/list")
def list_campaigns(ClientId: Optional[int] = None, db: Session = Depends(get_db4)):
    query = """
        SELECT 
            c.id, 
            c.ClientId, 
            c.campaign_id,
            c.CampaignName, 
            c.CampaignParentName AS Type, 
            c.campaign_description, 
            c.CreationDate, 
            c.CampaignStatus,
            ct.CampaignType AS Type1,
            c.Field1, c.Field2, c.Field3, c.Field4, c.Field5,
            c.Field6, c.Field7, c.Field8, c.Field9, c.Field10,
            c.Field11, c.Field12, c.Field13, c.Field14, c.Field15,
            c.Field16, c.Field17, c.Field18, c.Field19, c.Field20
        FROM ob_campaign c
        LEFT JOIN ob_campaign_type ct 
            ON c.campaign_id = ct.Id
    """

    params = {}
    if ClientId:
        query += " WHERE c.ClientId = :ClientId AND c.CampaignStatus = 'A'"
        params["ClientId"] = ClientId

    query += " ORDER BY c.CreationDate DESC"

    rows = db.execute(text(query), params).mappings().all()

    campaigns = []

    for row in rows:
        # Build dynamic fields array
        fields = []
        for i in range(1, 21):
            value = row.get(f"Field{i}")
            if value and value != "\\N":   # ignore NULL or \N
                fields.append(value)

        campaigns.append({
            "id": row["id"],
            "ClientId": row["ClientId"],
            "campaign_id": row["campaign_id"],          # ✅ Added
            "CampaignName": row["CampaignName"],
            "Description": row["campaign_description"],
            "Type": row["Type"],
            "CreationDate": row["CreationDate"],
            "Fields": fields,
            "Status": row["CampaignStatus"]
        })

    return campaigns


# # ✅ 4. Delete Campaign
# @router.delete("/delete/{campaign_id}")
# def delete_campaign(campaign_id: int, db: Session = Depends(get_db4)):
#     # Check if campaign exists
#     check_query = text("SELECT id FROM ob_campaign WHERE id = :id")
#     exists = db.execute(check_query, {"id": campaign_id}).fetchone()

#     if not exists:
#         return {"error": f"Campaign ID {campaign_id} not found."}

#     # Delete the campaign
#     delete_query = text("DELETE FROM ob_campaign WHERE id = :id")
#     db.execute(delete_query, {"id": campaign_id})
#     db.commit()

#     return {"message": f"Campaign ID {campaign_id} deleted successfully."}



@router.put("/update-status")
def update_campaign_status(
    payload: UpdateCampaignStatusRequest,
    db: Session = Depends(get_db4)
):
    # 1️⃣ Check if campaign exists
    check_query = text("SELECT id FROM ob_campaign WHERE id = :id")
    exists = db.execute(check_query, {"id": payload.id}).fetchone()

    if not exists:
        raise HTTPException(
            status_code=404,
            detail=f"Campaign ID {payload.id} not found."
        )

    # 2️⃣ Update only required fields
    update_query = text("""
        UPDATE ob_campaign
        SET CampaignStatus = 'D',
            update_user = :update_user,
            update_date = :update_date
        WHERE id = :id
    """)

    db.execute(
        update_query,
        {
            "update_user": payload.update_user,
            "update_date": datetime.now(),
            "id": payload.id
        }
    )

    db.commit()

    return {
        "message": f"Campaign ID {payload.id} updated successfully.",
        "updated_by": payload.update_user
    }

