from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from schemas import *
from database import get_db2, get_db4
from datetime import date, datetime, timedelta
from typing import List, Dict, Any
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter()


@router.post("/dashboard_report", response_model=DashboardFullResp)
def get_dashboard_report(
    req: DashboardReq,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
) -> Any:
    # 1) Fetch campaignids
    camp = db_main.execute(
        text("SELECT campaignid FROM registration_master WHERE company_id=:cid"),
        {"cid": req.company_id}
    ).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Company ID not found")
    campaign_list = [c.strip().strip("'") for c in camp.split(",")]
    camp_clause = "AND t2.campaign_id IN :cids"

    # 2) Build date condition
    vt = req.view_type or "Today"
    if vt == "Today":
        date_cond = "DATE(t2.call_date) = CURDATE()"
    elif vt == "Yesterday":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Weekly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CURDATE()"
    elif vt == "Monthly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CURDATE()"
    elif vt == "Custom":
        if not (req.from_date and req.to_date):
            raise HTTPException(400, "from_date and to_date are required for Custom")
        date_cond = "DATE(t2.call_date) BETWEEN :from_date AND :to_date"
    else:
        raise HTTPException(400, f"Unknown view_type {vt}")

    # 3) Per‑day aggregate SQL
    day_sql = f"""
        SELECT
          COUNT(*)                           AS Total,
          COUNT(DISTINCT(t2.phone_number))   AS `Unique`,
          SUM(IF(t2.user <> 'VDCL',1,0))     AS Answered,
          SUM(IF(t2.user =  'VDCL',1,0))     AS Abandon,
          COUNT(DISTINCT CASE WHEN t2.user = 'VDCL' THEN t2.phone_number END) AS Unique_abandon,
          DATE(t2.call_date)                 AS gdate
        FROM asterisk.vicidial_closer_log t2
        LEFT JOIN asterisk.vicidial_agent_log t3 ON t2.uniqueid=t3.uniqueid  AND t2.user=t3.user
        WHERE {date_cond}
          {camp_clause}
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
        GROUP BY DATE(t2.call_date)
        ORDER BY DATE(t2.call_date)
    """

    params: Dict[str, Any] = {"cids": tuple(campaign_list)}
    if vt == "Custom":
        params["from_date"] = req.from_date
        params["to_date"]   = req.to_date

    rows = db.execute(text(day_sql), params).mappings().fetchall()

    days: List[DashboardDay] = []
    for r in rows:
        g = r["gdate"]
        if isinstance(g, date):
            g = g.isoformat()
        days.append(DashboardDay(
            Total=r["Total"] or 0,
            Unique=r["Unique"] or 0,
            Answered=r["Answered"] or 0,
            Abandon=r["Abandon"] or 0,
            Unique_abandon=r["Unique_abandon"] or 0,
            gdate=g
        ))

    # 4) Total Tagged Calls
    if vt == "Custom":
        tag_sql = text("""
            SELECT COUNT(Id) AS total_tagged
            FROM call_master
            WHERE ClientId = :cid
              AND DATE(calldate) BETWEEN :from_date AND :to_date
              AND CallType <> 'Upload'
              AND (Field40 = 0 OR Field40 IS NULL)
        """)
        tag_params = {
            "cid": req.company_id,
            "from_date": req.from_date,
            "to_date": req.to_date,
        }
    else:
        cond = date_cond.replace("t2.call_date", "cm.calldate")
        tag_sql = text(f"""
            SELECT COUNT(cm.Id) AS total_tagged
            FROM call_master cm
            WHERE cm.ClientId = :cid
              AND {cond}
              AND cm.CallType <> 'Upload'
              AND (cm.Field40 = 0 OR cm.Field40 IS NULL)
        """)
        tag_params = {"cid": req.company_id}

    total_tagged = db_main.execute(tag_sql, tag_params).scalar() or 0

    # 4.1) Total Callback Tagged Calls
    if vt == "Custom":
        callback_tag_sql = text("""
            SELECT COUNT(Id) AS total_tagged
            FROM call_master
            WHERE ClientId = :cid
                AND DATE(calldate) BETWEEN :from_date AND :to_date
                AND CallType <> 'Upload'
                AND Field40 = 1
        """)
        callback_tag_params = {
            "cid": req.company_id,
            "from_date": req.from_date,
            "to_date": req.to_date,
        }
    else:
        cond = date_cond.replace("t2.call_date", "cm.calldate")
        callback_tag_sql = text(f"""
            SELECT COUNT(cm.Id) AS total_tagged
            FROM call_master cm
            WHERE cm.ClientId = :cid
                AND {cond}
                AND cm.CallType <> 'Upload'
                AND cm.Field40 = 1
        """)
        callback_tag_params = {"cid": req.company_id}

    callback_total_tagged = db_main.execute(callback_tag_sql, callback_tag_params).scalar() or 0


    # 5) Total Abandon Call Back
    if vt == "Custom":
        cb_sql = text("""
            SELECT COUNT(Id) AS total_abandon_cb
            FROM aband_call_master
            WHERE ClientId = :cid
              AND DATE(Callbackdate) BETWEEN :from_date AND :to_date
        """)
        cb_params = {
            "cid": req.company_id,
            "from_date": req.from_date,
            "to_date": req.to_date,
        }
    else:
        # reuse your date_cond but on Callbackdate
        cond = date_cond.replace("t2.call_date", "acm.Callbackdate")
        cb_sql = text(f"""
            SELECT COUNT(acm.Id) AS total_abandon_cb
            FROM aband_call_master acm
            WHERE acm.ClientId = :cid
              AND {cond}
        """)
        cb_params = {"cid": req.company_id}

    total_abandon_cb = db_main.execute(cb_sql, cb_params).scalar() or 0

    return DashboardFullResp(
        days=days,
        total_tagged=total_tagged,
        callback_total_tagged=callback_total_tagged,
        total_abandon_cb=total_abandon_cb
    )





@router.post("/dashboard_report_previous", response_model=DashboardFullResp)
def get_dashboard_report_previous(
    req: DashboardReq,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
) -> Any:
    # 1) Fetch campaignids
    camp = db_main.execute(
        text("SELECT campaignid FROM registration_master WHERE company_id=:cid"),
        {"cid": req.company_id}
    ).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Company ID not found")
    campaign_list = [c.strip().strip("'") for c in camp.split(",")]
    camp_clause = "AND t2.campaign_id IN :cids"

    # 2) Build date condition
    vt = req.view_type or "Today"
    if vt == "Today":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Yesterday":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 2 DAY)"
    elif vt == "Weekly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 7 DAY) AND CURDATE()"
    elif vt == "Monthly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 31 DAY) AND CURDATE()"
    elif vt == "Custom":
        if not (req.from_date and req.to_date):
            raise HTTPException(400, "from_date and to_date are required for Custom")
        date_cond = "DATE(t2.call_date) BETWEEN :from_date AND :to_date"
    else:
        raise HTTPException(400, f"Unknown view_type {vt}")

    # 3) Per‑day aggregate SQL
    day_sql = f"""
        SELECT
          COUNT(*)                           AS Total,
          COUNT(DISTINCT(t2.phone_number))   AS `Unique`,
          SUM(IF(t2.user <> 'VDCL',1,0))     AS Answered,
          SUM(IF(t2.user =  'VDCL',1,0))     AS Abandon,
          COUNT(DISTINCT CASE WHEN t2.user = 'VDCL' THEN t2.phone_number END) AS Unique_abandon,
          DATE(t2.call_date)                 AS gdate
        FROM asterisk.vicidial_closer_log t2
        LEFT JOIN asterisk.vicidial_agent_log t3 ON t2.uniqueid=t3.uniqueid  AND t2.user=t3.user
        WHERE {date_cond}
          {camp_clause}
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
        GROUP BY DATE(t2.call_date)
        ORDER BY DATE(t2.call_date)
    """

    params: Dict[str, Any] = {"cids": tuple(campaign_list)}
    if vt == "Custom":
        params["from_date"] = req.from_date
        params["to_date"]   = req.to_date

    rows = db.execute(text(day_sql), params).mappings().fetchall()

    days: List[DashboardDay] = []
    for r in rows:
        g = r["gdate"]
        if isinstance(g, date):
            g = g.isoformat()
        days.append(DashboardDay(
            Total=r["Total"] or 0,
            Unique=r["Unique"] or 0,
            Answered=r["Answered"] or 0,
            Abandon=r["Abandon"] or 0,
            Unique_abandon=r["Unique_abandon"] or 0,
            gdate=g
        ))

    # 4) Total Tagged Calls
    if vt == "Custom":
        tag_sql = text("""
            SELECT COUNT(Id) AS total_tagged
            FROM call_master
            WHERE ClientId = :cid
              AND DATE(calldate) BETWEEN :from_date AND :to_date
              AND CallType <> 'Upload'
              AND (Field40 = 0 OR Field40 IS NULL)
        """)
        tag_params = {
            "cid": req.company_id,
            "from_date": req.from_date,
            "to_date": req.to_date,
        }
    else:
        cond = date_cond.replace("t2.call_date", "cm.calldate")
        tag_sql = text(f"""
            SELECT COUNT(cm.Id) AS total_tagged
            FROM call_master cm
            WHERE cm.ClientId = :cid
              AND {cond}
              AND cm.CallType <> 'Upload'
              AND (cm.Field40 = 0 OR cm.Field40 IS NULL)
        """)
        tag_params = {"cid": req.company_id}

    total_tagged = db_main.execute(tag_sql, tag_params).scalar() or 0

    # 4.1) Total Callback Tagged Calls
    if vt == "Custom":
        callback_tag_sql = text("""
            SELECT COUNT(Id) AS total_tagged
            FROM call_master
            WHERE ClientId = :cid
                AND DATE(calldate) BETWEEN :from_date AND :to_date
                AND CallType <> 'Upload'
                AND Field40 = 1
        """)
        callback_tag_params = {
            "cid": req.company_id,
            "from_date": req.from_date,
            "to_date": req.to_date,
        }
    else:
        cond = date_cond.replace("t2.call_date", "cm.calldate")
        callback_tag_sql = text(f"""
            SELECT COUNT(cm.Id) AS total_tagged
            FROM call_master cm
            WHERE cm.ClientId = :cid
                AND {cond}
                AND cm.CallType <> 'Upload'
                AND cm.Field40 = 1
        """)
        callback_tag_params = {"cid": req.company_id}

    callback_total_tagged = db_main.execute(callback_tag_sql, callback_tag_params).scalar() or 0


    # 5) Total Abandon Call Back
    if vt == "Custom":
        cb_sql = text("""
            SELECT COUNT(Id) AS total_abandon_cb
            FROM aband_call_master
            WHERE ClientId = :cid
              AND DATE(Callbackdate) BETWEEN :from_date AND :to_date
        """)
        cb_params = {
            "cid": req.company_id,
            "from_date": req.from_date,
            "to_date": req.to_date,
        }
    else:
        # reuse your date_cond but on Callbackdate
        cond = date_cond.replace("t2.call_date", "acm.Callbackdate")
        cb_sql = text(f"""
            SELECT COUNT(acm.Id) AS total_abandon_cb
            FROM aband_call_master acm
            WHERE acm.ClientId = :cid
              AND {cond}
        """)
        cb_params = {"cid": req.company_id}

    total_abandon_cb = db_main.execute(cb_sql, cb_params).scalar() or 0

    return DashboardFullResp(
        days=days,
        total_tagged=total_tagged,
        callback_total_tagged=callback_total_tagged,
        total_abandon_cb=total_abandon_cb
    )


@router.post("/active_services", response_model=ActiveService)
def get_active_services(
    req: ActiveServicesRequest,
    db: Session = Depends(get_db4),
):
    # 1) Look up the balance_master entry for this client
    bm = db.execute(
        text("SELECT PlanId FROM balance_master WHERE clientId = :cid LIMIT 1"),
        {"cid": req.company_id}
    ).mappings().first()
    if not bm:
        raise HTTPException(status_code=404, detail="No active plan found for this client")

    plan_id = bm["PlanId"]

    # 2) Fetch the plan_master row
    pm = db.execute(
        text("""
            SELECT
              PlanName,
              PeriodType,
              CreditValue,
              RentalAmount, 
              InboundCallCharge      AS inbound_day,
              InboundCallChargeNight AS inbound_night,
              OutboundCallCharge     AS outbound,
              SMSCharge              AS sms,
              EmailCharge            AS email
            FROM plan_master
            WHERE Id = :pid
            LIMIT 1
        """),
        {"pid": plan_id}
    ).mappings().first()
    if not pm:
        raise HTTPException(status_code=404, detail="Plan details not found")
    
    # 3) Normalize PeriodType
    period_type_raw = pm["PeriodType"] or ""
    period_type = period_type_raw.strip().lower()

    rental_amount = pm["RentalAmount"]

    # 4) Adjust RentalAmount based on PeriodType
    if period_type == "quater":
        rental_amount /= 4
    elif period_type == "half":
        rental_amount /= 2
    elif period_type == "month":
        rental_amount /= 12

    # 5) Build and return the response
    return ActiveService(
        plan_name=pm["PlanName"],
        period_type=(pm["PeriodType"] + "ly").upper(),
        credit_value=pm["CreditValue"],
        subscription_value=rental_amount,       # or compute per your logic
        inbound_call_day_charge=pm["inbound_day"],
        inbound_call_night_charge=pm["inbound_night"],
        outbound_call_charge=pm["outbound"],
        sms_charge=pm["sms"],
        email_charge=pm["email"],
    )


@router.post("/call_analysis_report", response_model=CallAnalysisResponse)
def get_call_analysis_report(
    req: CallAnalysisRequest,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    # Fetch campaign ids
    camp = db_main.execute(
        text("SELECT campaignid FROM registration_master WHERE company_id=:cid"),
        {"cid": req.company_id}
    ).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Company ID not found")

    campaign_list = [c.strip().strip("'") for c in camp.split(",")]

    camp_clause = "AND t2.campaign_id IN :cids"

    # Date filter
    vt = req.view_type
    if vt == "Today":
        date_cond = "DATE(t2.call_date) = CURDATE()"
    elif vt == "Yesterday":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Weekly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CURDATE()"
    elif vt == "Monthly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CURDATE()"
    elif vt == "Custom":
        if not (req.from_date and req.to_date):
            raise HTTPException(400, "from_date and to_date required for Custom")
        date_cond = "DATE(t2.call_date) BETWEEN :from_date AND :to_date"
    else:
        raise HTTPException(400, f"Unknown view_type {vt}")

    sql = f"""
        SELECT
            SUM(IF(t2.user <> 'VDCL',1,0)) AS answered,
            SUM(IF(t2.user =  'VDCL',1,0)) AS abandon
        FROM asterisk.vicidial_closer_log t2
        LEFT JOIN asterisk.vicidial_agent_log t3 ON t2.uniqueid=t3.uniqueid  AND t2.user=t3.user
        WHERE {date_cond}
          {camp_clause}
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
    """

    params = {"cids": tuple(campaign_list)}
    if vt == "Custom":
        params["from_date"] = req.from_date
        params["to_date"] = req.to_date

    row = db.execute(text(sql), params).mappings().first()
    return CallAnalysisResponse(
        answered=row["answered"] or 0,
        abandon=row["abandon"] or 0
    )



@router.post("/call_distribution_report", response_model=List[CallDistributionResponse])
def get_call_distribution_report(
    req: DashboardReq,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    camp = db_main.execute(
        text("SELECT campaignid FROM registration_master WHERE company_id=:cid"),
        {"cid": req.company_id}
    ).scalar_one_or_none()

    if not camp:
        raise HTTPException(404, "Company ID not found")
    campaign_list = [c.strip().strip("'") for c in camp.split(",")]

    if req.view_type == "Today":
        date_cond = "DATE(t2.call_date) = CURDATE()"
    elif req.view_type == "Yesterday":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif req.view_type == "Weekly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CURDATE()"
    elif req.view_type == "Monthly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CURDATE()"
    elif req.view_type == "Custom":
        if not (req.from_date and req.to_date):
            raise HTTPException(400, "from_date and to_date are required for Custom")
        date_cond = "DATE(t2.call_date) BETWEEN :from_date AND :to_date"
    else:
        raise HTTPException(400, f"Unknown view_type {req.view_type}")

    sql = f"""
        SELECT
            DATE(t2.call_date) AS call_date,
            COUNT(*) AS total_calls,
            SUM(IF(t2.user <> 'VDCL', 1, 0)) AS answered_calls,
            SUM(IF(t2.user = 'VDCL', 1, 0)) AS abandon_calls
        FROM asterisk.vicidial_closer_log t2
        LEFT JOIN asterisk.call_log t1 ON t1.uniqueid=t2.uniqueid LEFT JOIN asterisk.vicidial_agent_log t3 ON t1.uniqueid=t3.uniqueid 
        WHERE {date_cond}
          AND t2.campaign_id IN :campaign_ids
          AND t2.term_reason != 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
        GROUP BY DATE(t2.call_date)
        ORDER BY DATE(t2.call_date)
    """

    params = {"campaign_ids": tuple(campaign_list)}
    if req.view_type == "Custom":
        params["from_date"] = req.from_date
        params["to_date"] = req.to_date

    rows = db.execute(text(sql), params).mappings().fetchall()

    result = []
    for row in rows:
        total = row["total_calls"] or 1
        answered_pct = round((row["answered_calls"] / total) * 100, 2)
        abandon_pct = round((row["abandon_calls"] / total) * 100, 2)
        result.append({
            "date": row["call_date"].isoformat() if isinstance(row["call_date"], date) else row["call_date"],
            "Answered": answered_pct,
            "Abandon": abandon_pct,
        })

    return result



# @router.post("/ticket_case_analysis", response_model=TicketCaseAnalysisResponse)
# def get_ticket_case_analysis(
#     company_id: int,
#     req: DashboardReq,
#     db: Session = Depends(get_db4),
# ):
#     # Build date condition exactly as in PHP
#     vt = req.view_type or "Today"
#     if vt == "Today":
#         cond = "DATE(CallDate) = CURDATE()"
#     elif vt == "Yesterday":
#         cond = "DATE(CallDate) = SUBDATE(CURDATE(),INTERVAL 1 DAY)"
#     elif vt == "Weekly":
#         cond = "DATE(CallDate) BETWEEN SUBDATE(CURDATE(),INTERVAL 6 DAY) AND CURDATE()"
#     elif vt == "Monthly":
#         cond = "DATE(CallDate) BETWEEN SUBDATE(CURDATE(),INTERVAL 30 DAY) AND CURDATE()"
#     else: # Custom
#         cond = "DATE(CallDate) BETWEEN :from_date AND :to_date"

#     params = {"cid": company_id}
#     if vt == "Custom":
#         params["from_date"] = req.from_date
#         params["to_date"]   = req.to_date

#     # --- 1) Case distribution by Category1 ---
#     sql_cases = text(f"""
#         SELECT 
#           SUM(CASE WHEN Category1 = 'Enquiry' THEN 1 ELSE 0 END)    AS Enquiry,
#           SUM(CASE WHEN Category1 = 'Complaint' THEN 1 ELSE 0 END)  AS Complaint,
#           SUM(CASE WHEN Category1 = 'Escalation' THEN 1 ELSE 0 END)  AS BulkOrder,
#           SUM(CASE WHEN Category1 = 'Request' THEN 1 ELSE 0 END)    AS Request,
#           SUM(CASE WHEN Category1 NOT IN 
#               ('Enquiry','Complaint','Escalation','Request') 
#             THEN 1 ELSE 0 END)                                    AS Other
#         FROM call_master 
#         WHERE ClientId = :cid AND {cond}
#     """)
#     row = db.execute(sql_cases, params).mappings().first()

#     case_data = [TicketCaseBreakdown(
#         name="Cases",
#         Enquiry=row["Enquiry"] or 0,
#         Complaint=row["Complaint"] or 0,
#         BulkOrder=row["BulkOrder"] or 0,
#         Request=row["Request"] or 0,
#         Other=row["Other"] or 0,
#     )]

#     # --- 2) Open ticket TAT ---
#     # PHP uses tbl_time table to define TAT per category, but for simplicity
#     # we’ll count “In TAT” vs “OutOfTAT” by comparing CloseLoopingDate vs CallDate hours
#     sql_open = text(f"""
#         SELECT
#           SUM(CASE 
#                 WHEN CloseLoopingDate IS NOT NULL 
#                      AND TIMESTAMPDIFF(HOUR, CallDate, CloseLoopingDate) 
#                          <= tt.time_Hours
#                 THEN 1 ELSE 0 END) AS InTAT,
#           SUM(CASE 
#                 WHEN (CloseLoopingDate IS NULL 
#                         AND TIMESTAMPDIFF(HOUR, CallDate, NOW()) > tt.time_Hours)
#                      OR (CloseLoopingDate IS NOT NULL
#                         AND TIMESTAMPDIFF(HOUR, CallDate, CloseLoopingDate) > tt.time_Hours)
#                 THEN 1 ELSE 0 END) AS OutOfTAT
#         FROM call_master cm
#         JOIN tbl_time tt 
#           ON cm.ClientId = tt.clientId 
#          AND CONCAT_WS('',cm.Category1,cm.Category2,cm.Category3,
#                        cm.Category4,cm.Category5) = 
#              CONCAT_WS('',tt.Category1,tt.Category2,tt.Category3,
#                        tt.Category4,tt.Category5)
#         WHERE cm.ClientId = :cid 
#           AND {cond}
#           AND cm.CloseLoopingDate IS NULL  -- Open tickets only
#     """)
#     open_row = db.execute(sql_open, params).mappings().first()
#     open_tat = [TicketTATBreakdown(
#         name="Open",
#         InTAT=open_row["InTAT"] or 0,
#         OutOfTAT=open_row["OutOfTAT"] or 0,
#     )]

#     # --- 3) Close ticket TAT ---
#     sql_close = text(f"""
#         SELECT
#           SUM(CASE 
#                 WHEN TIMESTAMPDIFF(HOUR, CallDate, CloseLoopingDate) 
#                          <= tt.time_Hours
#                 THEN 1 ELSE 0 END) AS InTAT,
#           SUM(CASE 
#                 WHEN TIMESTAMPDIFF(HOUR, CallDate, CloseLoopingDate) 
#                          > tt.time_Hours
#                 THEN 1 ELSE 0 END) AS OutOfTAT
#         FROM call_master cm
#         JOIN tbl_time tt 
#           ON cm.ClientId = tt.clientId 
#          AND CONCAT_WS('',cm.Category1,cm.Category2,cm.Category3,
#                        cm.Category4,cm.Category5) = 
#              CONCAT_WS('',tt.Category1,tt.Category2,tt.Category3,
#                        tt.Category4,tt.Category5)
#         WHERE cm.ClientId = :cid 
#           AND {cond}
#           AND cm.CloseLoopingDate IS NOT NULL  -- Closed tickets only
#     """)
#     close_row = db.execute(sql_close, params).mappings().first()
#     close_tat = [TicketTATBreakdown(
#         name="Close",
#         InTAT=close_row["InTAT"] or 0,
#         OutOfTAT=close_row["OutOfTAT"] or 0,
#     )]

#     return TicketCaseAnalysisResponse(
#         cases=case_data,
#         open_tat=open_tat,
#         close_tat=close_tat
#     )



@router.post("/ticket_case_analysis", response_model=TicketCaseAnalysisResponse)
def get_ticket_case_analysis(
    company_id: int,
    req: DashboardReq,
    db: Session = Depends(get_db4),
):
    # --- 1) Compute date range instead of using DATE() ---
    today = datetime.now().date()
    if req.view_type == "Today" or req.view_type is None:
        start = datetime.combine(today, datetime.min.time())
        end   = datetime.combine(today + timedelta(days=1), datetime.min.time())
    elif req.view_type == "Yesterday":
        start = datetime.combine(today - timedelta(days=1), datetime.min.time())
        end   = datetime.combine(today, datetime.min.time())
    elif req.view_type == "Weekly":
        start = datetime.combine(today - timedelta(days=6), datetime.min.time())
        end   = datetime.combine(today + timedelta(days=1), datetime.min.time())
    elif req.view_type == "Monthly":
        start = datetime.combine(today - timedelta(days=30), datetime.min.time())
        end   = datetime.combine(today + timedelta(days=1), datetime.min.time())
    else:  # Custom
        start = datetime.combine(req.from_date, datetime.min.time())
        end   = datetime.combine(req.to_date + timedelta(days=1), datetime.min.time())

    params = {"cid": company_id, "start": start, "end": end}

    cond = "CallDate >= :start AND CallDate < :end"

    # # --- 2) Case distribution by Category1 ---
    # sql_cases = text(f"""
    #     SELECT 
    #       SUM(CASE WHEN Category1 = 'Enquiry' THEN 1 ELSE 0 END)    AS Enquiry,
    #       SUM(CASE WHEN Category1 = 'Complaint' THEN 1 ELSE 0 END)  AS Complaint,
    #       SUM(CASE WHEN Category1 = 'Escalation' THEN 1 ELSE 0 END)  AS BulkOrder,
    #       SUM(CASE WHEN Category1 = 'Request' THEN 1 ELSE 0 END)   AS Request,
    #       SUM(CASE WHEN Category1 NOT IN ('Enquiry','Complaint','Escalation','Request') THEN 1 ELSE 0 END) AS Other
    #     FROM call_master 
    #     WHERE ClientId = :cid AND {cond}
    # """)
    # row = db.execute(sql_cases, params).mappings().first()
    # case_data = [TicketCaseBreakdown(
    #     name="Cases",
    #     Enquiry=row["Enquiry"] or 0,
    #     Complaint=row["Complaint"] or 0,
    #     BulkOrder=row["BulkOrder"] or 0,
    #     Request=row["Request"] or 0,
    #     Other=row["Other"] or 0,
    # )]


    # Below is for dynamic scenarios:

    # 2️⃣ Fetch dynamic categories
    sql_categories = text("""
        SELECT ecrName
        FROM ecr_master
        WHERE Client = :cid
          AND Label = 1
        ORDER BY id
    """)
    categories = [r["ecrName"] for r in db.execute(sql_categories, {"cid": company_id}).mappings().all()]

    # Detect if "Other" already exists as a real category
    has_other_category = any(cat.strip().lower() == "other" for cat in categories)

    # 3️⃣ Build dynamic CASE SQL
    case_parts = []
    for cat in categories:
        col = cat.replace(" ", "_")
        case_parts.append(f"SUM(CASE WHEN Category1 = '{cat}' THEN 1 ELSE 0 END) AS `{col}`")
    dynamic_case_sql = ",\n".join(case_parts) if case_parts else "0"

    # ------------------------------------------------------------------
    # 4️⃣ Add fallback "Other" ONLY if taxonomy doesn't define it
    # ------------------------------------------------------------------
    if not has_other_category and categories:
        other_sql = ", SUM(CASE WHEN Category1 NOT IN :cats THEN 1 ELSE 0 END) AS Other"
        params["cats"] = tuple(categories)
    else:
        other_sql = ""  # ❌ do not compute fallback Other

    # 4️⃣ Case distribution query
    sql_cases = text(f"""
        SELECT
            {dynamic_case_sql}
            {other_sql}
        FROM call_master
        WHERE ClientId = :cid
          AND CallDate >= :start
          AND CallDate < :end
    """)
    row = db.execute(sql_cases, params).mappings().first() or {}

    # ------------------------------------------------------------------
    # 6️⃣ Build API response
    # ------------------------------------------------------------------
    case_counts: Dict[str, int] = {}

    for cat in categories:
        sql_key = cat.replace(" ", "_")
        case_counts[cat] = row.get(sql_key, 0) or 0

    # Add fallback Other only if it was calculated
    if not has_other_category:
        case_counts["Other"] = row.get("Other", 0) or 0

    case_data = [TicketCaseBreakdownDynamic(name="Cases", data=case_counts)]
    print("##########", case_data)

    # --- 3) Open ticket TAT ---
    sql_open = text(f"""
        SELECT
          SUM(CASE 
                WHEN CloseLoopingDate IS NOT NULL 
                     AND TIMESTAMPDIFF(HOUR, CallDate, CloseLoopingDate) <= tt.time_Hours
                THEN 1 ELSE 0 END) AS InTAT,
          SUM(CASE 
                WHEN (CloseLoopingDate IS NULL AND TIMESTAMPDIFF(HOUR, CallDate, NOW()) > tt.time_Hours)
                     OR (CloseLoopingDate IS NOT NULL AND TIMESTAMPDIFF(HOUR, CallDate, CloseLoopingDate) > tt.time_Hours)
                THEN 1 ELSE 0 END) AS OutOfTAT
        FROM call_master cm
        JOIN (SELECT * FROM tbl_time WHERE clientId = :cid) tt
          ON cm.ClientId = tt.clientId
         AND (cm.Category1 <=> tt.Category1)
         AND (cm.Category2 <=> tt.Category2)
         AND (cm.Category3 <=> tt.Category3)
         AND (cm.Category4 <=> tt.Category4)
         AND (cm.Category5 <=> tt.Category5)
        WHERE cm.ClientId = :cid 
          AND {cond}
          AND cm.CloseLoopingDate IS NULL
    """)
    open_row = db.execute(sql_open, params).mappings().first()
    open_tat = [TicketTATBreakdown(
        name="Open",
        InTAT=open_row["InTAT"] or 0,
        OutOfTAT=open_row["OutOfTAT"] or 0,
    )]

    # --- 4) Close ticket TAT ---
    sql_close = text(f"""
        SELECT
          SUM(CASE WHEN TIMESTAMPDIFF(HOUR, CallDate, CloseLoopingDate) <= tt.time_Hours THEN 1 ELSE 0 END) AS InTAT,
          SUM(CASE WHEN TIMESTAMPDIFF(HOUR, CallDate, CloseLoopingDate) > tt.time_Hours THEN 1 ELSE 0 END) AS OutOfTAT
        FROM call_master cm
        JOIN (SELECT * FROM tbl_time WHERE clientId = :cid) tt
          ON cm.ClientId = tt.clientId
         AND (cm.Category1 <=> tt.Category1)
         AND (cm.Category2 <=> tt.Category2)
         AND (cm.Category3 <=> tt.Category3)
         AND (cm.Category4 <=> tt.Category4)
         AND (cm.Category5 <=> tt.Category5)
        WHERE cm.ClientId = :cid 
          AND {cond}
          AND cm.CloseLoopingDate IS NOT NULL
    """)
    close_row = db.execute(sql_close, params).mappings().first()
    close_tat = [TicketTATBreakdown(
        name="Close",
        InTAT=close_row["InTAT"] or 0,
        OutOfTAT=close_row["OutOfTAT"] or 0,
    )]

    return TicketCaseAnalysisResponse(
        cases=case_data,
        open_tat=open_tat,
        close_tat=close_tat
    )



@router.post("/ticket_by_source", response_model=List[TicketSourceResponse])
def get_ticket_by_source(
    req: DashboardReq,
    db: Session = Depends(get_db4),
):
    today = datetime.now().date()

    # Determine start and end
    if req.view_type == "Today" or req.view_type is None:
        start = today
        end = today
    elif req.view_type == "Yesterday":
        start = today - timedelta(days=1)
        end = today - timedelta(days=1)
    elif req.view_type == "Weekly":
        start = today - timedelta(days=6)
        end = today
    elif req.view_type == "Monthly":
        start = today - timedelta(days=30)
        end = today
    elif req.view_type == "Custom":
        if not req.from_date or not req.to_date:
            raise HTTPException(status_code=400, detail="from_date and to_date required for Custom")
        start = req.from_date
        end = req.to_date
    else:
        raise HTTPException(status_code=400, detail="Invalid view_type")

    cond = "CallDate >= :start AND CallDate < :end_plus_one"
    params = {
        "cid": req.company_id,
        "start": start,
        "end_plus_one": end + timedelta(days=1)  # include end date
    }

    query = text(f"""
        SELECT
            CallType AS source,
            COUNT(*) AS total,
            SUM(CASE WHEN CloseLoopingDate IS NULL THEN 1 ELSE 0 END) AS open,
            SUM(CASE WHEN CloseLoopingDate IS NOT NULL THEN 1 ELSE 0 END) AS close,
            DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS as_on_date
        FROM call_master
        WHERE ClientId = :cid AND {cond}
        GROUP BY CallType
        ORDER BY total DESC
    """)

    rows = db.execute(query, params).mappings().all()

    return [TicketSourceResponse(
        source=row["source"] or "Unknown",
        total=row["total"] or 0,
        open=row["open"] or 0,
        close=row["close"] or 0,
        as_on_date=row["as_on_date"]
    ) for row in rows]


#Schema
class InboundKpiRequest(BaseModel):
    company_id: int
    start_date: str
    end_date: str
    view_type: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None

class InboundKpiResponse(BaseModel):
    totalCallsOffered: int
    answeredCalls: int
    abandonedCalls: int
    alPercent: float
    slPercent: float
    connectedCallbacks: int
    finalAlPercent: float
    finalUniqueAlPercent: float
    uniqueCallsOffered: int
    uniqueAnswered: int
    uniqueAbandoned: int

# ---------- Inbound KPI Summary ----------
@router.post("/inbound/kpi-summary", response_model=InboundKpiResponse)
def get_inbound_kpi_summary(
    req: InboundKpiRequest,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    # Fetch campaign ids
    camp = db_main.execute(
        text("SELECT campaignid FROM registration_master WHERE company_id=:cid"),
        {"cid": req.company_id}
    ).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Company ID not found")
    campaign_list = [c.strip().strip("'") for c in camp.split(",")]

    # Date condition
    vt = req.view_type or "Custom"
    if vt == "Today":
        date_cond = "DATE(t2.call_date) = CURDATE()"
    elif vt == "Yesterday":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Weekly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CURDATE()"
    elif vt == "Monthly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CURDATE()"
    else:
        date_cond = "DATE(t2.call_date) BETWEEN :from_date AND :to_date"

    params = {"cids": tuple(campaign_list)}
    if vt == "Custom":
        params["from_date"] = req.from_date or req.start_date
        params["to_date"] = req.to_date or req.end_date

    # Main KPI query
    sql = f"""
        SELECT
            COUNT(*) AS total_offered,
            SUM(IF(t2.user <> 'VDCL', 1, 0)) AS answered,
            SUM(IF(t2.user = 'VDCL', 1, 0)) AS abandoned,
            COUNT(DISTINCT t2.phone_number) AS unique_offered,
            COUNT(DISTINCT CASE WHEN t2.user <> 'VDCL' THEN t2.phone_number END) AS unique_answered,
            COUNT(DISTINCT CASE WHEN t2.user = 'VDCL' THEN t2.phone_number END) AS unique_abandoned
        FROM asterisk.vicidial_closer_log t2
        WHERE {date_cond}
          AND t2.campaign_id IN :cids
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
    """
    row = db.execute(text(sql), params).mappings().first()

    total_offered = row["total_offered"] or 0
    answered = row["answered"] or 0
    abandoned = row["abandoned"] or 0
    unique_offered = row["unique_offered"] or 0
    unique_answered = row["unique_answered"] or 0
    unique_abandoned = row["unique_abandoned"] or 0

    al_percent = round((answered / total_offered) * 100, 1) if total_offered > 0 else 0

    # SL% - calls answered within 20 seconds
    sl_sql = f"""
        SELECT
            SUM(IF(t2.user <> 'VDCL' AND TIMESTAMPDIFF(SECOND, t2.call_date, 
                (SELECT MIN(event_time) FROM asterisk.vicidial_agent_log 
                 WHERE uniqueid = t2.uniqueid AND user = t2.user)) <= 20, 1, 0)) AS sl_count
        FROM asterisk.vicidial_closer_log t2
        WHERE {date_cond}
          AND t2.campaign_id IN :cids
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
    """
    sl_row = db.execute(text(sl_sql), params).mappings().first()
    sl_count = sl_row["sl_count"] or 0
    sl_percent = round((sl_count / total_offered) * 100, 1) if total_offered > 0 else 0

    # Connected callbacks
    cb_params = {"cid": req.company_id}
    if vt == "Custom":
        cb_date_cond = "DATE(Callbackdate) BETWEEN :from_date AND :to_date"
        cb_params["from_date"] = req.from_date or req.start_date
        cb_params["to_date"] = req.to_date or req.end_date
    else:
        cb_date_cond = date_cond.replace("t2.call_date", "Callbackdate")
    
    cb_sql = text(f"""
        SELECT COUNT(DISTINCT PhoneNumber) AS connected_callbacks
        FROM aband_call_master
        WHERE ClientId = :cid AND {cb_date_cond}
    """)
    cb_row = db_main.execute(cb_sql, cb_params).mappings().first()
    connected_callbacks = cb_row["connected_callbacks"] or 0

    final_al = round(((answered + connected_callbacks) / total_offered) * 100, 1) if total_offered > 0 else 0
    final_unique_al = round(((unique_answered + connected_callbacks) / unique_offered) * 100, 1) if unique_offered > 0 else 0

    return InboundKpiResponse(
        totalCallsOffered=total_offered,
        answeredCalls=answered,
        abandonedCalls=abandoned,
        alPercent=al_percent,
        slPercent=sl_percent,
        connectedCallbacks=connected_callbacks,
        finalAlPercent=final_al,
        finalUniqueAlPercent=final_unique_al,
        uniqueCallsOffered=unique_offered,
        uniqueAnswered=unique_answered,
        uniqueAbandoned=unique_abandoned,
    )


# ---------- Call Funnel ----------
@router.post("/inbound/call-funnel")
def get_call_funnel(
    req: InboundKpiRequest,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    kpi = get_inbound_kpi_summary(req, db, db_main)
    total = kpi.totalCallsOffered
    
    return {
        "totalOffered": total,
        "answeredCalls": kpi.answeredCalls,
        "abandonedCalls": kpi.abandonedCalls,
        "connectedCallbacks": kpi.connectedCallbacks,
        "answerRate": round((kpi.answeredCalls / total) * 100, 1) if total > 0 else 0,
        "abandonRate": round((kpi.abandonedCalls / total) * 100, 1) if total > 0 else 0,
        "callbackRate": round((kpi.connectedCallbacks / total) * 100, 1) if total > 0 else 0,
    }


# ---------- Performance Trend ----------
@router.post("/inbound/performance-trend")
def get_performance_trend(
    req: InboundKpiRequest,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    camp = db_main.execute(
        text("SELECT campaignid FROM registration_master WHERE company_id=:cid"),
        {"cid": req.company_id}
    ).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Company ID not found")
    campaign_list = [c.strip().strip("'") for c in camp.split(",")]

    vt = req.view_type or "Custom"
    if vt == "Today":
        date_cond = "DATE(t2.call_date) = CURDATE()"
    elif vt == "Yesterday":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Weekly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CURDATE()"
    elif vt == "Monthly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CURDATE()"
    else:
        date_cond = "DATE(t2.call_date) BETWEEN :from_date AND :to_date"

    params = {"cids": tuple(campaign_list)}
    if vt == "Custom":
        params["from_date"] = req.from_date or req.start_date
        params["to_date"] = req.to_date or req.end_date

    sql = f"""
        SELECT
            DATE(t2.call_date) AS day,
            COUNT(*) AS offered,
            SUM(IF(t2.user <> 'VDCL', 1, 0)) AS answered,
            SUM(IF(t2.user = 'VDCL', 1, 0)) AS abandoned
        FROM asterisk.vicidial_closer_log t2
        WHERE {date_cond}
          AND t2.campaign_id IN :cids
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
        GROUP BY DATE(t2.call_date)
        ORDER BY DATE(t2.call_date)
    """
    rows = db.execute(text(sql), params).mappings().fetchall()

    trend = []
    for r in rows:
        day = r["day"].isoformat() if hasattr(r["day"], "isoformat") else str(r["day"])
        offered = r["offered"] or 0
        answered = r["answered"] or 0
        abandoned = r["abandoned"] or 0
        trend.append({
            "day": day,
            "offered": offered,
            "answered": answered,
            "abandoned": abandoned,
            "alPercent": round((answered / offered) * 100, 1) if offered > 0 else 0,
            "taggingPercent": 0,  # Will be populated if tagging data exists
        })

    # Averages
    if trend:
        avg_offered = round(sum(t["offered"] for t in trend) / len(trend))
        avg_answered = round(sum(t["answered"] for t in trend) / len(trend))
        avg_al = round(sum(t["alPercent"] for t in trend) / len(trend), 1)
    else:
        avg_offered = avg_answered = avg_al = 0

    return {
        "trend": trend,
        "averages": {
            "avgOffered": avg_offered,
            "avgAnswered": avg_answered,
            "avgAlPercent": avg_al,
        },
    }


# ---------- Tagging ----------
@router.post("/inbound/tagging")
def get_tagging(
    req: InboundKpiRequest,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    kpi = get_inbound_kpi_summary(req, db, db_main)
    
    # Get tagged calls from call_master
    params = {"cid": req.company_id}
    vt = req.view_type or "Custom"
    
    if vt == "Today":
        date_cond = "DATE(calldate) = CURDATE()"
    elif vt == "Yesterday":
        date_cond = "DATE(calldate) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Weekly":
        date_cond = "DATE(calldate) BETWEEN SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CURDATE()"
    elif vt == "Monthly":
        date_cond = "DATE(calldate) BETWEEN SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CURDATE()"
    else:
        date_cond = "DATE(calldate) BETWEEN :from_date AND :to_date"
        params["from_date"] = req.from_date or req.start_date
        params["to_date"] = req.to_date or req.end_date

    tag_sql = text(f"""
        SELECT COUNT(*) AS tagged_count
        FROM call_master
        WHERE ClientId = :cid
          AND {date_cond}
          AND CallType <> 'Upload'
    """)
    tagged_count = db_main.execute(tag_sql, params).scalar() or 0

    # Email tickets
    email_sql = text(f"""
        SELECT COUNT(*) AS email_count
        FROM call_master
        WHERE ClientId = :cid
          AND {date_cond}
          AND CallType = 'Email'
    """)
    email_count = db_main.execute(email_sql, params).scalar() or 0

    # WhatsApp tickets
    wa_sql = text(f"""
        SELECT COUNT(*) AS wa_count
        FROM call_master
        WHERE ClientId = :cid
          AND {date_cond}
          AND CallType = 'WhatsApp'
    """)
    wa_count = db_main.execute(wa_sql, params).scalar() or 0

    total_calls = kpi.answeredCalls + kpi.connectedCallbacks
    tagged_percent = round((tagged_count / total_calls) * 100, 1) if total_calls > 0 else 0

    return {
        "totalCalls": total_calls,
        "answered": kpi.answeredCalls,
        "callbacks": kpi.connectedCallbacks,
        "taggedCount": tagged_count,
        "taggedPercent": tagged_percent,
        "emailTickets": email_count,
        "whatsappTickets": wa_count,
    }


# ---------- Tickets by Source ----------
@router.post("/inbound/tickets-by-source")
def get_tickets_by_source(
    req: InboundKpiRequest,
    db: Session = Depends(get_db4),
):
    params = {"cid": req.company_id}
    vt = req.view_type or "Custom"

    if vt == "Today":
        date_cond = "CallDate >= CURDATE() AND CallDate < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Yesterday":
        date_cond = "CallDate >= SUBDATE(CURDATE(), INTERVAL 1 DAY) AND CallDate < CURDATE()"
    elif vt == "Weekly":
        date_cond = "CallDate >= SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CallDate < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Monthly":
        date_cond = "CallDate >= SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CallDate < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    else:
        date_cond = "CallDate >= :from_date AND CallDate < DATE_ADD(:to_date, INTERVAL 1 DAY)"
        params["from_date"] = req.from_date or req.start_date
        params["to_date"] = req.to_date or req.end_date

    sql = text(f"""
        SELECT
            CallType AS source,
            COUNT(*) AS total,
            SUM(CASE WHEN CloseLoopingDate IS NULL THEN 1 ELSE 0 END) AS open,
            SUM(CASE WHEN CloseLoopingDate IS NOT NULL THEN 1 ELSE 0 END) AS closed,
            ROUND(
                SUM(CASE WHEN CloseLoopingDate IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
                1
            ) AS closedInTat
        FROM call_master
        WHERE ClientId = :cid AND {date_cond}
        GROUP BY CallType
        ORDER BY total DESC
    """)
    rows = db.execute(sql, params).mappings().fetchall()

    return [{
        "source": r["source"] or "Unknown",
        "total": r["total"] or 0,
        "open": r["open"] or 0,
        "closed": r["closed"] or 0,
        "closedInTat": r["closedInTat"] or 0,
    } for r in rows]


# ---------- Tickets by Type ----------
@router.post("/inbound/tickets-by-type")
def get_tickets_by_type(
    req: InboundKpiRequest,
    db: Session = Depends(get_db4),
):
    params = {"cid": req.company_id}
    vt = req.view_type or "Custom"

    if vt == "Today":
        date_cond = "CallDate >= CURDATE() AND CallDate < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Yesterday":
        date_cond = "CallDate >= SUBDATE(CURDATE(), INTERVAL 1 DAY) AND CallDate < CURDATE()"
    elif vt == "Weekly":
        date_cond = "CallDate >= SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CallDate < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Monthly":
        date_cond = "CallDate >= SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CallDate < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    else:
        date_cond = "CallDate >= :from_date AND CallDate < DATE_ADD(:to_date, INTERVAL 1 DAY)"
        params["from_date"] = req.from_date or req.start_date
        params["to_date"] = req.to_date or req.end_date

    # Get top categories
    sql = text(f"""
        SELECT
            Category1 AS type,
            COUNT(*) AS value
        FROM call_master
        WHERE ClientId = :cid AND {date_cond}
        GROUP BY Category1
        ORDER BY value DESC
        LIMIT 5
    """)
    rows = db.execute(sql, params).mappings().fetchall()

    total = sum(r["value"] for r in rows) if rows else 1

    return [{
        "type": r["type"] or "Other",
        "value": r["value"] or 0,
        "percent": round((r["value"] / total) * 100, 1) if total > 0 else 0,
    } for r in rows]


# ---------- Open Tickets by Age ----------
@router.post("/inbound/open-tickets-by-age")
def get_open_tickets_by_age(
    req: InboundKpiRequest,
    db: Session = Depends(get_db4),
):
    sql = text("""
        SELECT
            CASE
                WHEN DATEDIFF(NOW(), CallDate) = 0 THEN 'Today'
                WHEN DATEDIFF(NOW(), CallDate) <= 1 THEN '1 day'
                WHEN DATEDIFF(NOW(), CallDate) <= 3 THEN '2-3 days'
                WHEN DATEDIFF(NOW(), CallDate) <= 7 THEN '4-7 days'
                WHEN DATEDIFF(NOW(), CallDate) <= 15 THEN '8-15 days'
                ELSE '15+ days'
            END AS age_range,
            COUNT(*) AS value
        FROM call_master
        WHERE ClientId = :cid
          AND CloseLoopingDate IS NULL
        GROUP BY age_range
        ORDER BY MIN(CallDate)
    """)
    rows = db.execute(sql, {"cid": req.company_id}).mappings().fetchall()

    return [{
        "range": r["age_range"],
        "value": r["value"] or 0,
    } for r in rows]


# ---------- Calls by Hour ----------
@router.post("/inbound/calls-by-hour")
def get_calls_by_hour(
    req: InboundKpiRequest,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    camp = db_main.execute(
        text("SELECT campaignid FROM registration_master WHERE company_id=:cid"),
        {"cid": req.company_id}
    ).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Company ID not found")
    campaign_list = [c.strip().strip("'") for c in camp.split(",")]

    vt = req.view_type or "Custom"
    if vt == "Today":
        date_cond = "DATE(t2.call_date) = CURDATE()"
    elif vt == "Yesterday":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Weekly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CURDATE()"
    elif vt == "Monthly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CURDATE()"
    else:
        date_cond = "DATE(t2.call_date) BETWEEN :from_date AND :to_date"

    params = {"cids": tuple(campaign_list)}
    if vt == "Custom":
        params["from_date"] = req.from_date or req.start_date
        params["to_date"] = req.to_date or req.end_date

    sql = f"""
        SELECT
            HOUR(t2.call_date) AS hour,
            SUM(IF(t2.user <> 'VDCL', 1, 0)) AS answered,
            SUM(IF(t2.user = 'VDCL', 1, 0)) AS abandoned
        FROM asterisk.vicidial_closer_log t2
        WHERE {date_cond}
          AND t2.campaign_id IN :cids
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
        GROUP BY HOUR(t2.call_date)
        ORDER BY hour
    """
    rows = db.execute(text(sql), params).mappings().fetchall()

    return [{
        "hour": f"{r['hour']:02d}:00",
        "answered": r["answered"] or 0,
        "abandoned": r["abandoned"] or 0,
    } for r in rows]


# ---------- Drop Reasons ----------
@router.post("/inbound/drop-reasons")
def get_drop_reasons(
    req: InboundKpiRequest,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
):
    camp = db_main.execute(
        text("SELECT campaignid FROM registration_master WHERE company_id=:cid"),
        {"cid": req.company_id}
    ).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Company ID not found")
    campaign_list = [c.strip().strip("'") for c in camp.split(",")]

    vt = req.view_type or "Custom"
    if vt == "Today":
        date_cond = "DATE(t2.call_date) = CURDATE()"
    elif vt == "Yesterday":
        date_cond = "DATE(t2.call_date) = SUBDATE(CURDATE(), INTERVAL 1 DAY)"
    elif vt == "Weekly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 6 DAY) AND CURDATE()"
    elif vt == "Monthly":
        date_cond = "DATE(t2.call_date) BETWEEN SUBDATE(CURDATE(), INTERVAL 30 DAY) AND CURDATE()"
    else:
        date_cond = "DATE(t2.call_date) BETWEEN :from_date AND :to_date"

    params = {"cids": tuple(campaign_list)}
    if vt == "Custom":
        params["from_date"] = req.from_date or req.start_date
        params["to_date"] = req.to_date or req.end_date

    sql = f"""
        SELECT
            COALESCE(term_reason, 'Unknown') AS reason,
            COUNT(*) AS value
        FROM asterisk.vicidial_closer_log t2
        WHERE {date_cond}
          AND t2.campaign_id IN :cids
          AND t2.user = 'VDCL'
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
        GROUP BY term_reason
        ORDER BY value DESC
        LIMIT 5
    """
    rows = db.execute(text(sql), params).mappings().fetchall()

    return [{
        "reason": r["reason"],
        "value": r["value"] or 0,
    } for r in rows]