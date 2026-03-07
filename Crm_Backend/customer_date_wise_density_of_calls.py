from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from database import get_db2, get_db4
from datetime import date
from typing import Any, Union, List, Optional
from pydantic import BaseModel
from collections import defaultdict


router = APIRouter()





class DashboardReq(BaseModel):
    company_id: Union[int, str]
    from_date: date
    to_date: date
    sd_type: str
    category: str = "All"



class HourlyCampaignRow(BaseModel):
    Total: int
    Answered: int
    Abandon: int
    gdate: Optional[str] = None
    ghour: int
    campaign: Optional[str] = None
    SLA : Optional[int] = None

class HourlyCampaignALRow(BaseModel):
    Total: int
    Answered: int
    Abandon: int
    gdate: Optional[str] = None
    campaign: Optional[str] = None
    AL: float


class HourlyCampaignResp(BaseModel):
    rows: List[HourlyCampaignRow]
    al_rows: List[HourlyCampaignALRow]


class Companies(BaseModel):
    company_id: int
    company_name: str



# Fetches client_category from Registration Master
@router.get("/client-categories")
def get_client_categories(db: Session = Depends(get_db4)):
    query = text("""
        SELECT client_category
        FROM registration_master
        WHERE client_category IS NOT NULL
        GROUP BY client_category
    """)
    
    result = db.execute(query).fetchall()
    
    return {
        "data": [row.client_category for row in result]
    }




# fetches Company Name using filter is_shared
@router.get("/companies", response_model=List[Companies])
def get_companies(
    is_shared: Optional[str] = Query(
        default=None,
        description="Allowed values: 0, 1 or empty"
    ),
    db: Session = Depends(get_db4)
):
    base_query = """
        SELECT company_name, company_id
        FROM registration_master
        WHERE status = 'A'
          AND is_dd_client = '1'
    """

    params = {}

    if is_shared in ("0", "1"):
        base_query += " AND is_shared = :is_shared"
        params["is_shared"] = is_shared

    base_query += " ORDER BY company_name ASC"

    result = db.execute(text(base_query), params).fetchall()

    return [{"company_id": row.company_id, "company_name": row.company_name} for row in result]



# Return Customer daily data client wise
@router.post("/hourly_campaign_report", response_model=HourlyCampaignResp)
def get_hourly_campaign_report(
    req: DashboardReq,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
) -> Any:

    params = {
        "from_date": req.from_date,
        "to_date": req.to_date,
    }

    # -------------------- Shared / Dedicated Logic --------------------
    shared_clause = ""
    params_shared = {}

    if str(req.sd_type) in ("0", "1"):
        shared_clause = "AND is_shared = :is_shared"
        params_shared["is_shared"] = req.sd_type



    # -------------------- Category Filter --------------------
    category_clause = ""
    if str(req.category) and str(req.category).upper() != "ALL":
        category_clause = "AND client_category = :category"
        params["category"] = req.category


    # 1) Fetch campaigns
    # -------------------- Fetch Campaigns --------------------
    if str(req.company_id).upper() == "ALL":
        rows = db_main.execute(
            text(f"""
                SELECT campaignid
                FROM registration_master
                WHERE status='A'
                  AND is_dd_client='1'
                  {shared_clause}
                  {category_clause}
                ORDER BY campaignid ASC
            """),
            {**params, **params_shared}
        ).fetchall()
        print(rows)

        if not rows:
            raise HTTPException(404, "No campaigns found")

        campaign_list = []
        for r in rows:
            if r[0]:  # skip None
                campaign_list.extend([c.strip().strip("'") for c in r[0].split(",")])

    else:
        # Single Company
        rows = db_main.execute(
            text(f"""
                SELECT campaignid
                FROM registration_master
                WHERE company_id = :cid
                  AND status='A'
                  AND is_dd_client='1'
                  {shared_clause}
                  {category_clause}
                ORDER BY campaignid ASC
            """),
            {**params, **params_shared, "cid": req.company_id}
        ).fetchall()

        if not rows:
            raise HTTPException(404, "Company ID not found")

        campaign_list = []
        for r in rows:
            if r[0]:  # skip None
                campaign_list.extend([c.strip().strip("'") for c in r[0].split(",")])

    campaign_list = list(set(campaign_list))  # remove duplicates

    params["cids"] = tuple(campaign_list)
    camp_clause = "AND t2.campaign_id IN :cids"

    # 2) SQL
    sql = f"""
        SELECT
            COUNT(*)                         AS Total,
            SUM(IF(t2.user <> 'VDCL',1,0))   AS Answered,
            SUM(IF(t2.user = 'VDCL',1,0))    AS Abandon,
            HOUR(t2.call_date)               AS ghour,
            t2.campaign_id                   AS campaign,
            SUM(IF(t2.`user` !='VDCL' AND t2.queue_seconds<=20,1,0)) `SLA`
        FROM asterisk.vicidial_closer_log t2
        LEFT JOIN asterisk.vicidial_agent_log t3
               ON t2.uniqueid = t3.uniqueid
              AND t2.user     = t3.user
              AND t2.lead_id = t3.lead_id
        WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date
          {camp_clause}
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
        GROUP BY
            t2.campaign_id,
            HOUR(t2.call_date)
        ORDER BY
            t2.campaign_id,
            ghour
            
    """

    rows = db.execute(text(sql), params).mappings().fetchall()

    result = [
        HourlyCampaignRow(
            Total=r["Total"] or 0,
            Answered=r["Answered"] or 0,
            Abandon=r["Abandon"] or 0,
            gdate=None,
            ghour=r["ghour"],
            campaign=r["campaign"],
            SLA=r["SLA"]
        )
        for r in rows
    ]

    # Calculate AL (total) per campaign per date
    al_summary = defaultdict(lambda: {"Total": 0, "Answered": 0, "Abandon": 0})

    for r in result:
        key = r.campaign # group by campaign and date
        al_summary[key]["Total"] += r.Total
        al_summary[key]["Answered"] += r.Answered
        al_summary[key]["Abandon"] += r.Abandon

    # Convert summary dict to list of AL rows
    al_rows = []
    for k, v in al_summary.items():
        AL = (v["Answered"] / v["Total"] * 100) if v["Total"] > 0 else 0
        al_rows.append(
            HourlyCampaignALRow(
                Total=v["Total"],
                Answered=v["Answered"],
                Abandon=v["Abandon"],
                AL=round(AL, 0),  # round to 2 decimals
                gdate=None,
                campaign=k,
            )
        )


    return HourlyCampaignResp(al_rows=al_rows, rows=result)







# Return Customer daily data Date wise
@router.post("/hourly_date_wise_report", response_model=HourlyCampaignResp)
def get_hourly_date_wise_report(
    req: DashboardReq,
    db: Session = Depends(get_db2),
    db_main: Session = Depends(get_db4),
) -> Any:

    params = {
        "from_date": req.from_date,
        "to_date": req.to_date,
    }

    # -------------------- Shared / Dedicated --------------------
    shared_clause = ""
    params_shared = {}

    if str(req.sd_type) in ("0", "1"):
        shared_clause = "AND is_shared = :is_shared"
        params_shared["is_shared"] = req.sd_type

    # -------------------- Category --------------------
    category_clause = ""
    if str(req.category).upper() != "ALL":
        category_clause = "AND client_category = :category"
        params["category"] = req.category

    # -------------------- Fetch Campaigns --------------------
    if str(req.company_id).upper() == "ALL":
        rows = db_main.execute(
            text(f"""
                SELECT campaignid
                FROM registration_master
                WHERE status='A'
                  AND is_dd_client='1'
                  {shared_clause}
                  {category_clause}
            """),
            {**params, **params_shared}
        ).fetchall()
    else:
        rows = db_main.execute(
            text(f"""
                SELECT campaignid
                FROM registration_master
                WHERE company_id = :cid
                  AND status='A'
                  AND is_dd_client='1'
                  {shared_clause}
                  {category_clause}
            """),
            {**params, **params_shared, "cid": req.company_id}
        ).fetchall()

    if not rows:
        raise HTTPException(404, "No campaigns found")

    campaign_list = []
    for r in rows:
        if r[0]:
            campaign_list.extend([c.strip().strip("'") for c in r[0].split(",")])

    campaign_list = list(set(campaign_list))

    if not campaign_list:
        raise HTTPException(404, "No valid campaign IDs")

    params["cids"] = tuple(campaign_list)

    # -------------------- DATE-WISE SQL --------------------
    sql = """
        SELECT
            COUNT(*)                       AS Total,
            SUM(IF(t2.user <> 'VDCL',1,0)) AS Answered,
            SUM(IF(t2.user = 'VDCL',1,0))  AS Abandon,
            DATE(t2.call_date)             AS gdate,
            HOUR(t2.call_date)             AS ghour
        FROM asterisk.vicidial_closer_log t2
        LEFT JOIN asterisk.vicidial_agent_log t3
            ON t2.uniqueid = t3.uniqueid
            AND t2.user     = t3.user
            AND t2.lead_id = t3.lead_id
        WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date
          AND t2.campaign_id IN :cids
          AND t2.term_reason <> 'AFTERHOURS'
          AND t2.lead_id IS NOT NULL
        GROUP BY
            DATE(t2.call_date),
            HOUR(t2.call_date)
        ORDER BY
            gdate,
            ghour
    """

    rows = db.execute(text(sql), params).mappings().fetchall()

    # -------------------- Hourly Rows --------------------
    result = [
        HourlyCampaignRow(
            Total=r["Total"] or 0,
            Answered=r["Answered"] or 0,
            Abandon=r["Abandon"] or 0,
            gdate=r["gdate"].isoformat(),
            ghour=r["ghour"],
            campaign=None,   # NOT campaign-wise
        )
        for r in rows
    ]

    # -------------------- DATE-WISE AL --------------------
    al_summary = defaultdict(lambda: {"Total": 0, "Answered": 0, "Abandon": 0})

    for r in result:
        al_summary[r.gdate]["Total"] += r.Total
        al_summary[r.gdate]["Answered"] += r.Answered
        al_summary[r.gdate]["Abandon"] += r.Abandon

    al_rows = []
    for gdate, v in al_summary.items():
        AL = (v["Answered"] / v["Total"] * 100) if v["Total"] > 0 else 0
        al_rows.append(
            HourlyCampaignALRow(
                Total=v["Total"],
                Answered=v["Answered"],
                Abandon=v["Abandon"],
                AL=round(AL, 0),
                gdate=gdate,
                campaign=None,   # DATE-WISE
            )
        )

    return HourlyCampaignResp(
        rows=result,
        al_rows=al_rows
    )
