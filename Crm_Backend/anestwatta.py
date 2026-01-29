
# anestwatta.py for calls have only Inbounds have..
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam
from datetime import date, timedelta
from database import get_db2, get_db4

router = APIRouter(
    prefix="/anest-dashboard",
    tags=["Anest Dashboard"]
)


@router.get("/dashboard-summary")
def get_dashboard_summary(
    client_id: int = Query(...),
    startdate: date = Query(...),
    enddate: date = Query(...),
    db_vici: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    try:
        # Add 1 day for < enddate filter
        enddate_plus_one = enddate + timedelta(days=1)

        # =====================================================
        # 1) FETCH CAMPAIGN IDS
        # =====================================================
        camp_sql = """
            SELECT campaignid
            FROM registration_master
            WHERE company_id = :cid
        """
        camp = db_main.execute(text(camp_sql), {"cid": client_id}).scalar_one_or_none()
        if not camp:
            raise HTTPException(404, "Company ID not found")

        campaign_ids = [c.strip().strip("'") for c in camp.split(",") if c.strip()]
        if not campaign_ids:
            raise HTTPException(404, "No campaigns found for this client")

        # =====================================================
        # 2) COMPLAINT SUMMARY
        # =====================================================
        complaint_sql = """
            SELECT
                COUNT(*) AS total_complaints,
                SUM(CASE WHEN CloseLoopCate1 = 'Open' THEN 1 ELSE 0 END) AS open_count,
                SUM(CASE WHEN CloseLoopCate1 = 'In Process' THEN 1 ELSE 0 END) AS inprocess_count,
                SUM(CASE WHEN CloseLoopStatus = 'CLOSE' THEN 1 ELSE 0 END) AS closed_count,
                SUM(CASE WHEN Escalation IS NOT NULL AND Escalation <> '' THEN 1 ELSE 0 END) AS esc1,
                SUM(CASE WHEN Escalation1 IS NOT NULL AND Escalation1 <> '' THEN 1 ELSE 0 END) AS esc2,
                SUM(CASE WHEN Escalation2 IS NOT NULL AND Escalation2 <> '' THEN 1 ELSE 0 END) AS esc3
            FROM call_master
            WHERE ClientId = :client_id
              AND TagType = 'Offline Tagging'
              AND CallDate >= :startdate
              AND CallDate < :enddate_plus_one
        """
        print("Complaint SQL:", complaint_sql)
        complaint = db_main.execute(
            text(complaint_sql),
            {
                "client_id": client_id,
                "startdate": startdate,
                "enddate_plus_one": enddate_plus_one
            }
        ).fetchone()

        # =====================================================
        # 3) INBOUND CALL STATS (Vicidial)
        # =====================================================
        # Use expanding=True for campaign_ids
        call_sql = text("""
            SELECT
                SUM(IF(t2.user <> 'VDCL', 1, 0)) AS answered,
                SUM(IF(t2.user = 'VDCL', 1, 0)) AS abandon,
                COUNT(DISTINCT CASE WHEN t2.user = 'VDCL' THEN t2.phone_number END) AS unique_abandon
            FROM vicidial_closer_log t2
            LEFT JOIN vicidial_agent_log t3
                ON t2.uniqueid = t3.uniqueid
                AND t2.user = t3.user
            WHERE DATE(t2.call_date) >= :startdate
              AND DATE(t2.call_date) <= :enddate
              AND t2.campaign_id IN :campaign_ids
              AND t2.term_reason <> 'AFTERHOURS'
              AND t2.lead_id IS NOT NULL
        """).bindparams(bindparam("campaign_ids", expanding=True))
        print("Call SQL:", call_sql)
        call_stats = db_vici.execute(
            call_sql,
            {"startdate": startdate, "enddate": enddate, "campaign_ids": campaign_ids}
        ).fetchone()

        # =====================================================
        # 4) TOTAL TAGGED CALLS
        # =====================================================
        tagged_sql = """
            SELECT COUNT(Id)
            FROM call_master
            WHERE ClientId = :cid
              AND TagType = 'Offline Tagging'
              AND CallDate >= :startdate
              AND CallDate < :enddate_plus_one
        """
        print("Tagged SQL:", tagged_sql)
        total_tagged = db_main.execute(
            text(tagged_sql),
            {"cid": client_id, "startdate": startdate, "enddate_plus_one": enddate_plus_one}
        ).scalar() or 0

        # =====================================================
        # 5) ABANDON CALLBACKS
        # =====================================================
        cb_sql = """
            SELECT COUNT(Id)
            FROM aband_call_master
            WHERE ClientId = :cid
              AND Callbackdate >= :startdate
              AND Callbackdate < :enddate_plus_one
              AND (TagStatus='yes' OR TagStatus='1')
        """
        print("Callback SQL:", cb_sql)
        abandon_cb = db_main.execute(
            text(cb_sql),
            {"cid": client_id, "startdate": startdate, "enddate_plus_one": enddate_plus_one}
        ).scalar() or 0

        # =====================================================
        # 6) RETURN DASHBOARD SUMMARY
        # =====================================================
        return {
            "total_complaints": complaint.total_complaints or 0,
            "open": complaint.open_count or 0,
            "in_process": complaint.inprocess_count or 0,
            "closed": complaint.closed_count or 0,
            "escalation_1": complaint.esc1 or 0,
            "escalation_2": complaint.esc2 or 0,
            "escalation_3": complaint.esc3 or 0,
            "total_answered_calls": call_stats.answered or 0,
            "total_not_connected_calls": call_stats.abandon or 0,
            "unique_abandon_calls": call_stats.unique_abandon or 0,
            "total_tagged_calls": total_tagged,
            "total_abandon_call_back": abandon_cb
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
