from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from schemas import *
from database import get_db2, get_db4
from datetime import date, datetime, timedelta
from typing import List, Dict, Any


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
        """)
        tag_params = {"cid": req.company_id}

    total_tagged = db_main.execute(tag_sql, tag_params).scalar() or 0

    # 5) Total Abandon Call Back
    if vt == "Custom":
        cb_sql = text("""
            SELECT COUNT(Id) AS total_abandon_cb
            FROM aband_call_master
            WHERE ClientId = :cid
              AND DATE(Callbackdate) BETWEEN :from_date AND :to_date
              AND (TagStatus='yes' OR TagStatus='1')
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
              AND (acm.TagStatus='yes' OR acm.TagStatus='1')
        """)
        cb_params = {"cid": req.company_id}

    total_abandon_cb = db_main.execute(cb_sql, cb_params).scalar() or 0

    return DashboardFullResp(
        days=days,
        total_tagged=total_tagged,
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

    # 3) Build and return the response
    return ActiveService(
        plan_name=pm["PlanName"],
        period_type=pm["PeriodType"],
        credit_value=pm["CreditValue"],
        subscription_value=pm["CreditValue"],       # or compute per your logic
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