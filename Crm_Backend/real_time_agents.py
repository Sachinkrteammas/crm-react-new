from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from auth import get_current_user
from database import get_db2

router = APIRouter()


# @router.get("/realtime-agents")
# def get_realtime_agents(campaign_id: str = "Dialdesk", db: Session = Depends(get_db2)):
#     query = text("""
#         SELECT 
#             vu.full_name,
#             vu.user,
#             va.closer_campaigns,
#             va.campaign_id,
#             va.calls_today,
#             va.last_call_time,
#             va.status,
#             va.pause_code
#         FROM vicidial_live_agents va
#         JOIN vicidial_users vu 
#             ON va.user = vu.user
#         WHERE va.campaign_id = :campaign_id
#     """)

#     result = db.execute(query, {"campaign_id": campaign_id}).mappings().all()
#     return {"agents": [dict(row) for row in result]}




# @router.get("/realtime-agents")
# def get_realtime_agents(
#     company_id: int = None,
#     campaign_id: str = None,
#     db: Session = Depends(get_db2),
#     current_user: dict = Depends(get_current_user)
# ):
#     base_query = """
#         SELECT 
#             vu.full_name,
#             vu.user,
#             vu.company_id,
#             va.closer_campaigns,
#             va.campaign_id,
#             va.calls_today,
#             va.last_call_time,
#             va.status,
#             va.pause_code
#         FROM vicidial_live_agents va
#         JOIN vicidial_users vu 
#             ON va.user = vu.user
#         WHERE 1=1
#     """
#     params = {}

#     if current_user["user_type"] != "Super-Admin":
#         base_query += " AND vu.company_id = :company_id"
#         params["company_id"] = current_user["company_id"]
#     elif company_id:
#         base_query += " AND vu.company_id = :company_id"
#         params["company_id"] = company_id

#     if campaign_id:
#         base_query += " AND va.campaign_id = :campaign_id"
#         params["campaign_id"] = campaign_id

#     query = text(base_query)
#     result = db.execute(query, params).mappings().all()

#     return {"agents": [dict(row) for row in result] if result else []}



@router.get("/realtime-agents")
def get_realtime_agents(
    company_id: str = "TESTING",  # default if not provided
    db: Session = Depends(get_db2)
):
    query = text("""
        SELECT 
            vu.full_name,
            vu.user,
            va.closer_campaigns,
            va.campaign_id,
            va.calls_today,
            va.last_call_time,
            va.status,
            va.pause_code
        FROM vicidial_live_agents va
        JOIN vicidial_users vu 
            ON va.user = vu.user
        WHERE va.campaign_id = :company_id
    """)
# print("company_id")
    result = db.execute(query, {"company_id": company_id}).mappings().all()
    return {"agents": [dict(row) for row in result]}

