from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db, get_db2
from schemas import *
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



@router.post("/ob_cdr_report")
def get_ob_cdr_report(request: OBCDRReportRequest, db: Session = Depends(get_db), db2: Session = Depends(get_db2)):
    # Step 1: Get campaign ID from registration_master
    campaign_query = text("SELECT campaignid FROM registration_master WHERE company_id = :company_id")
    campaign_result = db.execute(campaign_query, {"company_id": request.company_id}).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",")]

    if not campaign_list:
        raise HTTPException(status_code=404, detail="No campaigns found for this company")

    # Step 2: Prepare condition for campaign_id filtering
    campaign_condition = "t2.campaign_id IN :campaign_ids"

    # Step 3: Build query using the provided qry with parameter placeholders
    report_query = text(f"""
        SELECT 
            SEC_TO_TIME(t6.`p`) AS ParkedTime,
            t2.user AS Agent,
            t2.lead_id AS LeadId,
            RIGHT(phone_number,10) AS PhoneNumber,
            DATE(call_date) AS CallDate,
            SEC_TO_TIME(queue_seconds) AS Queuetime,
            IF(queue_seconds='0', FROM_UNIXTIME(t2.start_epoch), FROM_UNIXTIME(t2.start_epoch - queue_seconds)) AS QueueStart,
            FROM_UNIXTIME(t2.start_epoch) AS StartTime,
            FROM_UNIXTIME(t2.end_epoch) AS Endtime,
            SEC_TO_TIME(IF(t3.`talk_sec` IS NULL, t2.length_in_sec, t3.`talk_sec`)) AS CallDuration,
            IF(t3.`talk_sec` IS NULL, t2.length_in_sec, t3.`talk_sec`) AS CallDuration1,
            FROM_UNIXTIME(t2.end_epoch + TIME_TO_SEC(
                IF(t3.dispo_sec IS NULL, SEC_TO_TIME(0),
                    IF(t3.sub_status='LOGIN' OR t3.sub_status='Feed' OR t3.talk_sec=t3.dispo_sec OR t3.talk_sec=0,
                        SEC_TO_TIME(1),
                        IF(t3.dispo_sec>100, SEC_TO_TIME(t3.dispo_sec-(t3.dispo_sec/100)*100), SEC_TO_TIME(t3.dispo_sec))
                    )
                )
            )) AS WrapEndTime,
            IF(t3.dispo_sec IS NULL, SEC_TO_TIME(0),
                IF(t3.sub_status='LOGIN' OR t3.sub_status='Feed' OR t3.talk_sec=t3.dispo_sec OR t3.talk_sec=0,
                    SEC_TO_TIME(1),
                    IF(t3.dispo_sec>100, SEC_TO_TIME(t3.dispo_sec-(t3.dispo_sec/100)*100), SEC_TO_TIME(t3.dispo_sec))
                )
            ) AS WrapTime
        FROM asterisk.vicidial_closer_log t2
        LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid=t3.uniqueid AND t2.user=t3.user
        LEFT JOIN (
            SELECT uniqueid, SUM(parked_sec) p FROM park_log 
            WHERE STATUS='GRABBED' AND DATE(parked_time) BETWEEN :from_date AND :to_date 
            GROUP BY uniqueid
        ) t6 ON t2.uniqueid=t6.uniqueid
        WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date
        AND DATE(t2.call_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND CURDATE()
        AND {campaign_condition}
        AND t2.lead_id IS NOT NULL
    """)

    # Step 4: Execute query and fetch results
    result = db2.execute(report_query, {
        "from_date": request.from_date,
        "to_date": request.to_date,
        "campaign_ids": tuple(campaign_list)
    }).mappings().fetchall()

    # Step 5: Return raw result without response_model
    return [dict(row) for row in result]



@router.post("/ob_shared_cdr_report")
def get_ob_shared_cdr_report(request: OBCDRReportRequest, db: Session = Depends(get_db), db2: Session = Depends(get_db2)):
    # Step 1: Get campaign ID from registration_master
    campaign_query = text("SELECT campaignid FROM registration_master WHERE company_id = :company_id")
    campaign_result = db.execute(campaign_query, {"company_id": request.company_id}).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",")]

    if not campaign_list:
        raise HTTPException(status_code=404, detail="No campaigns found for this company")

    # Step 2: Prepare campaign filter condition
    campaign_condition = "t2.campaign_id IN :campaign_ids"

    # Step 3: Build and parameterize query
    report_query = text(f"""
        SELECT 
            DATE(t2.call_date) AS CallDate,
            FROM_UNIXTIME(t2.start_epoch) AS StartTime,
            FROM_UNIXTIME(t2.end_epoch) AS Endtime,
            LEFT(t2.phone_number, 10) AS PhoneNumber,
            t2.user AS Agent,
            vu.full_name AS FullName,
            IF(t2.user = 'VDAD', 'Not Connected', 'Connected') AS CallType,
            t2.status AS Status,
            IF(t2.list_id = '998', 'Manual', 'Auto') AS DialMode,
            t2.campaign_id AS CampaignID,
            t2.lead_id AS LeadID,
            t2.length_in_sec AS LengthInSec,
            SEC_TO_TIME(t2.length_in_sec) AS LengthInMin,
            t2.term_reason AS TermReason,
            t2.length_in_sec AS CallDuration,
            t2.status AS CallStatus,
            t3.pause_sec AS PauseSec,
            t3.wait_sec AS WaitSec,
            t3.talk_sec AS TalkSec,
            t3.dispo_sec AS DispoSec
        FROM asterisk.vicidial_log t2
        LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid
        LEFT JOIN vicidial_users vu ON t2.user = vu.user
        WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date
        AND {campaign_condition}
        AND t2.lead_id IS NOT NULL
    """)

    # Step 4: Execute and fetch
    result = db2.execute(report_query, {
        "from_date": request.from_date,
        "to_date": request.to_date,
        "campaign_ids": tuple(campaign_list)
    }).mappings().fetchall()

    # Step 5: Return raw list of dicts
    return [dict(row) for row in result]



@router.post("/ivr_report")
def get_ivr_report(
    request: OBCDRReportRequest,  # reuse your schema expecting from_date, to_date, company_id
    db: Session = Depends(get_db)
):
    """
    Returns IVR report for the requested company_id and date range.
    """

    # Step 1: Build the query with clear field mapping
    report_query = text("""
        SELECT 
            il.*,
            DATE_FORMAT(start_time, '%d-%b-%y') AS Dater,
            DATE_FORMAT(start_time, '%d-%b-%y %H:%i:%s') AS StartDate,
            DATE_FORMAT(end_time, '%d-%b-%y %H:%i:%s') AS EndDate
        FROM ivr_log il
        WHERE client_id = :client_id
        AND DATE(start_time) BETWEEN :from_date AND :to_date
    """)

    # Step 2: Execute and fetch
    result = db.execute(report_query, {
        "client_id": request.company_id,
        "from_date": request.from_date,
        "to_date": request.to_date
    }).mappings().fetchall()

    # Step 3: Return raw list of dicts
    return [dict(row) for row in result]



@router.post("/ivr_funnel_report")
def get_ivr_funnel_report(
    request: IVRFunnelReportRequest,
    db: Session = Depends(get_db2)  
):
    try:
        # Core Query
        report_query = text("""
            SELECT 
                uniqueid,
                user,
                status,
                xfercallid,
                DATE_FORMAT(call_date, '%Y-%m-%d') as call_date
            FROM vicidial_closer_log vcl
            WHERE DATE(call_date) BETWEEN :from_date AND :to_date
        """)

        results = db.execute(report_query, {
            "from_date": request.from_date,
            "to_date": request.to_date,
        }).mappings().fetchall()

        return [dict(row) for row in results]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))