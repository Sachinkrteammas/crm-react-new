from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.sql import bindparam
from typing import Optional
from auth import get_current_user
from database import get_db2, get_db4
from openpyxl import Workbook
from io import BytesIO
from datetime import datetime
from fastapi.responses import StreamingResponse

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
    client_id: str = Query(default="0"),
    db: Session = Depends(get_db2),
    db4: Session = Depends(get_db4)
):
    # Step 1: Determine campaign_ids
    if client_id != "0":
        campaigns_query = text("""
            SELECT campaignid
            FROM registration_master
            WHERE company_id = :client_id
        """)
        campaign_rows = db4.execute(campaigns_query, {"client_id": client_id}).fetchall()

        if not campaign_rows:
            campaign_ids = ["DIALDESK"]
        else:
            # Split comma-separated string into individual campaign IDs
            campaign_ids_raw = campaign_rows[0][0]
            campaign_ids = [c.strip().strip("'") for c in campaign_ids_raw.split(",") if c.strip()]
    else:
        campaign_ids = ["DIALDESK"]


    # Step 2: Query agents using IN clause
    query = text("""
        SELECT 
            vu.full_name,
            vu.user,
            va.closer_campaigns,
            va.campaign_id,
            va.calls_today,
            va.last_call_time,
            va.status,
            va.pause_code,
            va.closer_campaigns
        FROM vicidial_live_agents va
        JOIN vicidial_users vu 
            ON va.user = vu.user
        WHERE va.campaign_id IN :campaign_ids
    """).bindparams(bindparam("campaign_ids", expanding=True))

    result = db.execute(query, {"campaign_ids": campaign_ids}).mappings().all()

    return {"agents": [dict(row) for row in result]}




@router.get("/skills/download")
def skills_download(
    user: str = Query(...),
    skills: str = Query(...),
    db: Session = Depends(get_db4)
):
    # Split skills like PHP explode(" ", $skills)
    skill_list = [s.strip() for s in skills.split(" ") if s.strip()]
    user_skill_map = {}

    # ---- Build data first (PHP foreach loop equivalent) ----
    for skill in skill_list:
        query = text("""
            SELECT company_name
            FROM registration_master
            WHERE campaignid LIKE :skill
            LIMIT 1
        """)

        result = db.execute(
            query,
            {"skill": f"%{skill}%"}
        ).fetchone()


        company = result.company_name if result else " "

        user_skill_map.setdefault(user, {})
        user_skill_map[user].setdefault(company, [])
        user_skill_map[user][company].append(skill)

    # ---- Create Excel AFTER loop ----
    wb = Workbook()
    ws = wb.active
    ws.title = "Agent Skills"

    ws.append(["Sr.No.", "Agent", "Company", "Skills"])

    row_no = 1
    for agent, companies in user_skill_map.items():
        for company, skill_values in companies.items():
            ws.append([
                row_no,
                agent,
                company,
                ",".join(skill_values)
            ])
            row_no += 1

    # ---- Stream file ----
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"agent_skills_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


