from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from datetime import datetime
from database import get_db4
import requests
from typing import List

router = APIRouter()

# ---------------- REQUEST MODEL ---------------- #

class AddCampaignListRequest(BaseModel):
    client_id: int
    campaign_id: int
    list_id: str
    list_name: str
    logged_in_admin: str



# ---------------- API ---------------- #

@router.post("/add-campaign-list")
def add_campaign_list(
    payload: AddCampaignListRequest,
    db: Session = Depends(get_db4)
):
    # 1️⃣ Check if list already exists
    check_query = text("""
        SELECT * FROM list_master
        WHERE client_id = :client_id
        AND campaign_id = :campaign_id
        AND list_id = :list_id
    """)

    existing = db.execute(check_query, {
        "client_id": payload.client_id,
        "campaign_id": payload.campaign_id,
        "list_id": payload.list_id
    }).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="List ID already exists")

    # 2️⃣ Fetch Active Campaign
    campaign_query = text("""
        SELECT id, campaign_id
        FROM ob_campaign
        WHERE id = :campaign_id
        AND CampaignStatus = 'A'
    """)

    campaign = db.execute(campaign_query, {
        "campaign_id": payload.campaign_id
    }).fetchone()

    if not campaign:
        raise HTTPException(status_code=404, detail="Active campaign not found")

    campaign_id_dialer = campaign.campaign_id

    # 3️⃣ Call VICIdial API
    post_url = "http://192.168.10.5/vicidial/non_agent_api.php"

    post_fields = {
        "source": "test",
        "function": "add_list",
        "user": "9999",
        "pass": "Password986",
        "list_id": payload.list_id,
        "list_name": payload.list_name,
        "campaign_id": campaign_id_dialer
    }

    try:
        response = requests.post(post_url, data=post_fields, timeout=10)
        response_text = response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dialer API error: {str(e)}")

    if not response_text.lower().startswith("success"):
        raise HTTPException(
            status_code=400,
            detail=f"Dialer Error: {response_text}"
        )

    # 4️⃣ Save in Database
    insert_query = text("""
        INSERT INTO list_master
        (client_id, campaign_id, list_id, list_desc, create_date, update_user)
        VALUES
        (:client_id, :campaign_id, :list_id, :list_desc, :create_date, :update_user)
    """)

    db.execute(insert_query, {
        "client_id": payload.client_id,
        "campaign_id": payload.campaign_id,
        "list_id": payload.list_id,
        "list_desc": payload.list_name,
        "create_date": datetime.now(),
        "update_user": payload.logged_in_admin
    })

    db.commit()

    return {
        "status": "success",
        "message": "Campaign List ID Added Successfully"
    }







@router.get("/campaign-list")
def get_campaign_list(db: Session = Depends(get_db4)):

    query = text("""
        SELECT 
            lm.id,
            rm.company_name,
            lm.list_id,
            lm.create_date
        FROM list_master lm
        LEFT JOIN registration_master rm
            ON lm.client_id = rm.company_id
        WHERE lm.create_date IS NOT NULL
        AND DATE(lm.create_date) > '2023-12-31'
        ORDER BY lm.id DESC
    """)

    result = db.execute(query).fetchall()

    data = []
    for row in result:
        data.append({
            "id": row.id,
            "company_name": row.company_name,
            "list_id": row.list_id,
            "create_date": row.create_date
        })

    return {
        "status": "success",
        "total_records": len(data),
        "data": data
    }



@router.get("/list-master", response_model=List[dict])
def get_list_master(
    client_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    try:
        query = text("""
            SELECT id, list_id 
            FROM list_master
            WHERE client_id = :client_id
            ORDER BY 1 DESC
        """)

        result = db.execute(query, {
            "client_id": client_id
        }).fetchall()

        data = [
            {
                "id": row.id,
                "list_id": row.list_id
            }
            for row in result
        ]

        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))