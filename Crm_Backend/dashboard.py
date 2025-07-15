from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from schemas import *
from database import get_db, get_db2
from datetime import date
from typing import List, Dict, Any


router = APIRouter()


@router.post("/dashboard_report", response_model=DashboardFullResp)
def get_dashboard_report(
    req: DashboardReq,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db),
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
          SUM(IF(t2.user <> 'VDCL',1,0))     AS Answered,
          SUM(IF(t2.user =  'VDCL',1,0))     AS Abandon,
          DATE(t2.call_date)                 AS gdate
        FROM asterisk.vicidial_closer_log t2
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
            Answered=r["Answered"] or 0,
            Abandon=r["Abandon"] or 0,
            gdate=g
        ))

    # 4) Total Tagged Calls
    if vt == "Custom":
        tag_sql = text("""
            SELECT COUNT(Id) AS total_tagged
            FROM call_master
            WHERE client_id = :cid
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
            WHERE cm.client_id = :cid
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
    db: Session = Depends(get_db),
):
    # 1) Look up the balance_master entry for this client
    bm = db.execute(
        text("SELECT PlanId FROM balance_master WHERE client_id = :cid LIMIT 1"),
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
        subscription_value=pm["RentalAmount"],       # or compute per your logic
        inbound_call_day_charge=pm["inbound_day"],
        inbound_call_night_charge=pm["inbound_night"],
        outbound_call_charge=pm["outbound"],
        sms_charge=pm["sms"],
        email_charge=pm["email"],
    )

