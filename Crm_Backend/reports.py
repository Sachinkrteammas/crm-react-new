from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db, get_db2
from schemas import LoginRequest, LoginResponse, CallMasterRecord, CDRReportResponse, CDRReportRequest
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from auth_utils import get_current_user
from sqlalchemy import text


router = APIRouter()




@router.post("/cdr_report", response_model=List[CDRReportResponse])
def get_cdr_report(request: CDRReportRequest, db: Session = Depends(get_db),db2: Session = Depends(get_db2)):
    # Step 1: Get campaign ID from registration_master
    campaign_query = text("SELECT campaignid FROM registration_master WHERE company_id = :company_id")
    campaign_result = db.execute(campaign_query, {"company_id": request.company_id}).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")



    # Step 2: Build report query
    report_query = f"""
        SELECT 
            t2.uniqueid,
            SEC_TO_TIME(t6.p) AS parked_time,
            t2.campaign_id,
            IF(queue_seconds <= 20, 1, 0) AS call20,
            IF(queue_seconds <= 60, 1, 0) AS call60,
            IF(queue_seconds <= 90, 1, 0) AS call90,
            t2.user AS agent,
            vc.full_name,
            t2.lead_id AS leadid,
            RIGHT(phone_number, 10) AS phone_number,
            DATE(call_date) AS call_date,
            SEC_TO_TIME(queue_seconds) AS queuetime,
            IF(queue_seconds = 0, FROM_UNIXTIME(t2.start_epoch), FROM_UNIXTIME(t2.start_epoch - queue_seconds)) AS queue_start,
            FROM_UNIXTIME(t2.start_epoch) AS start_time,
            FROM_UNIXTIME(t2.end_epoch) AS end_time,
            SEC_TO_TIME(IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec)) AS call_duration,
            IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec) AS call_duration1,
            FROM_UNIXTIME(t2.end_epoch + TIME_TO_SEC(
                IF(t3.dispo_sec IS NULL, SEC_TO_TIME(0),
                    IF(t3.sub_status = 'LOGIN' OR t3.sub_status = 'Feed' OR t3.talk_sec = t3.dispo_sec OR t3.talk_sec = 0,
                        SEC_TO_TIME(1),
                        IF(t3.dispo_sec > 100, SEC_TO_TIME(t3.dispo_sec - (t3.dispo_sec / 100) * 100), SEC_TO_TIME(t3.dispo_sec))
                    )
                )
            )) AS wrap_end_time,
            IF(t3.dispo_sec IS NULL, SEC_TO_TIME(0),
                IF(t3.sub_status = 'LOGIN' OR t3.sub_status = 'Feed' OR t3.talk_sec = t3.dispo_sec OR t3.talk_sec = 0,
                    SEC_TO_TIME(1),
                    IF(t3.dispo_sec > 100, SEC_TO_TIME(t3.dispo_sec - (t3.dispo_sec / 100) * 100), SEC_TO_TIME(t3.dispo_sec))
                )
            ) AS wrap_time,
            t3.sub_status,
            t2.status,
            t2.term_reason,
            t2.xfercallid
        FROM asterisk.vicidial_closer_log t2
        LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
        LEFT JOIN (
            SELECT uniqueid, SUM(parked_sec) AS p 
            FROM park_log 
            WHERE STATUS = 'GRABBED' AND DATE(parked_time) BETWEEN :from_date AND :to_date 
            GROUP BY uniqueid
        ) t6 ON t2.uniqueid = t6.uniqueid
        LEFT JOIN vicidial_users vc ON t2.user = vc.user
        WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date 
        AND t2.campaign_id IN :campaign_ids 
        AND t2.lead_id IS NOT NULL
    """

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",")]

    print("Campaigns:", campaign_list)
    print("From:", request.from_date, "To:", request.to_date)

    result = db2.execute(text(report_query), {
        "from_date": request.from_date,
        "to_date": request.to_date,
        "campaign_ids": tuple(campaign_list)
    }).mappings().fetchall()

    return result