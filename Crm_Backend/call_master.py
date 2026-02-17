# Crm_Backend/call_master.py
from http.client import HTTPException
from io import BytesIO

from fastapi import APIRouter, Query, Depends, Body, Form, HTTPException
from sqlalchemy import text
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, EmailStr, create_model
from starlette.responses import StreamingResponse
from datetime import date, time
from schemas import *
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from auth import create_access_token, verify_token
import os
from dotenv import load_dotenv
from database import get_engine4, get_engine2, get_db2, get_db4
from math import ceil
import math
from decimal import Decimal, ROUND_HALF_UP

load_dotenv()

router = APIRouter(tags=["Call Master"])


# ---------------- Helpers ----------------
def fetch_options(db: Session, sql_text: str, params: dict):
    rows = db.execute(text(sql_text), params).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/call-master/{client_id}", response_model=List[Dict])
def get_call_master_data(
    client_id: int,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    call_id: Optional[int] = Query(None),
    in_call_action: Optional[str] = Query(None),
    Category1: Optional[str] = Query(None),
    Category2: Optional[str] = Query(None),
    Category3: Optional[str] = Query(None),
    Category4: Optional[str] = Query(None),
    Category5: Optional[str] = Query(None),
):
    engine = get_engine4()
    with engine.connect() as conn:
        # Step 1: Fetch field mappings
        field_meta_query = """
            SELECT fieldNumber, FieldName 
            FROM field_master 
            WHERE ClientId = :client_id 
              AND (FieldStatus IS NULL OR FieldStatus != 'D')
            ORDER BY fieldNumber
        """
        field_meta = conn.execute(text(field_meta_query), {"client_id": client_id}).mappings().all()

        # Early return if no fields configured
        if not field_meta:
            return []

        # Build column list
        field_map = {f["fieldNumber"]: f["FieldName"] for f in field_meta}
        columns = [f"field{fnum}" for fnum in field_map]
        columns += ["SrNo","CallDate","MSISDN","tat","duedate","callcreated","CloseLoopingDate","CloseLoopCate1","CloseLoopCate2", "Category1", "Category2", "Category3", "Category4", "Category5","closelooping_remarks","FollowupDate","CaseCloseBy","LeadId"]

        # Step 2: WHERE clause setup
        where_clauses = ["ClientId = :client_id"]
        params = {"client_id": client_id}

        if from_date:
            where_clauses.append("DATE(CallDate) >= :from_date")
            params["from_date"] = from_date
        if to_date:
            where_clauses.append("DATE(CallDate) <= :to_date")
            params["to_date"] = to_date
        if call_id:
            where_clauses.append("SrNo = :call_id") 
            params["call_id"]  = call_id 
        if in_call_action:
            where_clauses.append("CloseLoopCate1 = :in_call_action")
            params["in_call_action"] = in_call_action

        # Optional category filters (OR inside group)
        category_conditions = []
        for i, val in enumerate([Category1, Category2, Category3, Category4, Category5], start=1):
            if val:
                category_conditions.append(f"Category{i} = :Category{i}")
                params[f"Category{i}"] = val

        if category_conditions:
            # where_clauses.append(f"({' OR '.join(category_conditions)})")
            where_clauses.extend(category_conditions)

        where_clause = " AND ".join(where_clauses)
        select_cols = ", ".join(columns)

        # Step 3: Execute final query
        query = f"SELECT {select_cols} FROM call_master WHERE {where_clause}"
        result = conn.execute(text(query), params).mappings().all()

        # Step 4: Format response
        response = []
        for row in result:
            record = {}

            # -----------------------------
            # 1️⃣ First: Core fixed fields
            # -----------------------------
            record["callId"] = row.get("SrNo")
            record["CallFrom"] = row.get("MSISDN")
            record["Category1"] = row.get("Category1")
            record["Category2"] = row.get("Category2")
            record["Category3"] = row.get("Category3")
            record["Category4"] = row.get("Category4")
            record["Category5"] = row.get("Category5")

            for fnum, label in field_map.items():
                record[label] = row.get(f"field{fnum}")

            # -----------------------------
            # 3️⃣ Third: Remaining fields
            # -----------------------------
            record["CallDate"] = str(row.get("CallDate")).replace("T", " ")
            record["Call Action"] = row.get("CloseLoopCate1")
            record["Call Sub Action"] = row.get("CloseLoopCate2")
            record["Call Action Remarks"] = row.get("closelooping_remarks") 
            record["Closer Date"] = row.get("CloseLoopingDate")
            record["Follow Up Date"] = row.get("FollowupDate")
            record["Case Closed By"] = row.get("CaseCloseBy")
            record["TAT"] = row.get("tat")
            record["Due Date"] = row.get("duedate")
            record["Call Created"] = row.get("callcreated")                                   
            record["LeadId"] = row.get("LeadId")
            # record.update({
            #     "callId": row.get("SrNo"),
            #     "CallDate": row.get("CallDate"),
            #     "CallFrom": row.get("MSISDN"),
            #     "TAT": row.get("tat"),
            #     "Due Date": row.get("duedate"),
            #     "Call Created": row.get("callcreated"),
            #     "Call Action": row.get("CloseLoopCate1"),
            #     "Call Sub Action": row.get("CloseLoopCate2"),
            #     "Closer Date": row.get("CloseLoopingDate"),
            #     "Category1": row.get("Category1"),
            #     "Category2": row.get("Category2"),
            #     "Category3": row.get("Category3"),
            #     "Category4": row.get("Category4"),
            #     "Category5": row.get("Category5"),
            #     "Call Action Remarks": row.get("closelooping_remarks"),
            #     "Follow Up Date": row.get("FollowupDate"),
            #     "Case Closed By": row.get("CaseCloseBy"),
            #     "LeadId": row.get("LeadId"),
            # })
            response.append(record)

        return response


@router.get("/csat-report/{client_id}", response_model=List[Dict])
def get_csat_report(
    client_id: int,
    from_date: str = Query(...),
    to_date: str = Query(...),
):
    query = text("""
        SELECT vl.*, vcl.user, vu.full_name
        FROM csat_data vl
        INNER JOIN vicidial_closer_log vcl ON vl.uniqueid = vcl.uniqueid
        INNER JOIN vicidial_users vu ON vcl.user = vu.user
        WHERE vl.dtmf < 4
          AND vl.client_id = :client_id
          AND DATE(vl.call_date) BETWEEN :from_date AND :to_date
    """)

    try:
        engine = get_engine2()
        with engine.connect() as conn:
            result = conn.execute(query, {
                "client_id": client_id,
                "from_date": from_date,
                "to_date": to_date,
            }).mappings().all()

        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        print("SQLAlchemy Error:", str(e))  # Good for local debugging
        raise HTTPException(status_code=500, detail="Database query failed.")

from datetime import datetime
@router.get("/priority_calls", response_model=List[Dict[str, Any]])
def get_priority_calls(
    client_id: int = Query(...),
    start_time: str = Query(...),
    end_time: str = Query(...),
    db: Session = Depends(get_db2)
):
    try:
        # Convert to date objects
        start_date = datetime.strptime(start_time, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_time, "%Y-%m-%d").date()

        # Raw SQL query
        sql = text("""
            SELECT *
            FROM vicidial_list
            WHERE vendor_lead_code = :client_id
              AND DATE(entry_date) BETWEEN :start_date AND :end_date
        """)

        result = db.execute(sql, {
            "client_id": client_id,
            "start_date": start_date,
            "end_date": end_date
        })

        # Convert SQLAlchemy Row to dict using .mappings()
        return [dict(row) for row in result.mappings().all()]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")




def safe_query(db: Session, sql: str, params: dict = None) -> list[dict]:
    params = params or {}
    result = db.execute(text(sql), params)
    return [dict(r._mapping) for r in result.fetchall()]


# ----------------- /campaign-types -----------------
@router.get("/campaign-types", response_model=List[dict])
def get_campaign_types(CLIENT_ID: int = Query(...), db: Session = Depends(get_db4)):
    sql = """
        SELECT DISTINCT CampaignParentName AS id,
                        CampaignParentName AS name
        FROM ob_campaign
        WHERE ClientId = :cid AND CampaignStatus = 'A'
        ORDER BY CampaignParentName
    """
    return safe_query(db, sql, {"cid": CLIENT_ID})


# ----------------- /campaigns -----------------
@router.get("/campaigns", response_model=List[dict])
def get_campaigns(
    CLIENT_ID: int = Query(...),
    campaignType: Optional[str] = Query(None),  # <-- Optional now
    db: Session = Depends(get_db4)
):
    sql = """
        SELECT id, CampaignName AS name
        FROM ob_campaign
        WHERE ClientId = :cid
          AND CampaignStatus = 'A'
    """
    params = {"cid": CLIENT_ID}
    if campaignType:
        sql += " AND CampaignParentName = :ctype"
        params["ctype"] = campaignType
    sql += " ORDER BY CampaignName"
    return safe_query(db, sql, params)


# ----------------- /allocations -----------------
@router.get("/allocations", response_model=List[dict])
def get_allocations(
    CLIENT_ID: int = Query(...),
    campaign: Optional[int] = Query(None),  # <-- Optional
    db: Session = Depends(get_db4)
):
    sql = """
        SELECT id, AllocationName AS name
        FROM ob_allocation_name
        WHERE ClientId = :cid
    """
    params = {"cid": CLIENT_ID}
    if campaign:
        sql += " AND CampaignId = :camp"
        params["camp"] = campaign
    sql += " ORDER BY AllocationName"
    return safe_query(db, sql, params)


# ----------------- /scenarios -----------------
@router.get("/scenarios", response_model=List[dict])
def get_scenarios(
    CLIENT_ID: int = Query(...),
    allocation: Optional[int] = None,
    scenario_level: int = Query(1),  # 1=Scenario, 2=Sub1, 3=Sub2, 4=Sub3
    parent_scenario: Optional[str] = None,
    db: Session = Depends(get_db4)
):
    level_map = {1: "Category1", 2: "Category2", 3: "Category3", 4: "Category4"}
    col_name = level_map.get(scenario_level)
    if not col_name:
        return []

    sql = f"""
        SELECT DISTINCT {col_name} AS id, {col_name} AS name
        FROM call_master_out
        WHERE ClientId = :cid
    """
    params = {"cid": CLIENT_ID}

    # Optional filters
    if allocation:
        sql += " AND AllocationId = :alloc"
        params["alloc"] = allocation
    if parent_scenario and scenario_level > 1:
        prev_col = level_map[scenario_level - 1]
        sql += f" AND {prev_col} = :parent"
        params["parent"] = parent_scenario

    sql += f" ORDER BY {col_name}"
    return safe_query(db, sql, params)


# ---------------- /outcalls Endpoint ----------------
@router.get("/outcalls", response_model=dict)
def get_outcalls(
    CLIENT_ID: int = Query(...),
    campaignType: Optional[str] = None,
    campaign: Optional[int] = None,
    allocation: Optional[int] = None,
    scenario: Optional[str] = None,
    subScenario1: Optional[str] = None,
    subScenario2: Optional[str] = None,
    subScenario3: Optional[str] = None,
    msisdn: Optional[str] = None,
    startDate: Optional[str] = None,   # format: YYYY-MM-DD
    endDate: Optional[str] = None,     # format: YYYY-MM-DD
    db: Session = Depends(get_db4)
):
    params = {"cid": CLIENT_ID}

    # Only include filters that are actually provided
    filters = {}
    if campaignType: filters["campaignType"] = campaignType
    if campaign: filters["campaign"] = campaign
    if allocation: filters["allocation"] = allocation
    if scenario: filters["scenario"] = scenario
    if subScenario1: filters["subScenario1"] = subScenario1
    if subScenario2: filters["subScenario2"] = subScenario2
    if subScenario3: filters["subScenario3"] = subScenario3
    if msisdn: filters["msisdn"] = f"%{msisdn}%"

    # Main SQL query
    sql_parts = [
        "SELECT o.id, o.Category1 AS scenario, o.Category2 AS subScenario1,",
        "       o.Category3 AS subScenario2, o.Category4 AS subScenario3,",
        "       o.MSISDN AS contactNumber, c.CampaignParentName AS campaignType,",
        "       c.CampaignName AS campaignName, a.AllocationName AS allocationName, o.CallDate, o.callcreated",
        "FROM call_master_out o",
        "JOIN ob_allocation_name a ON o.AllocationId = a.id",
        "JOIN ob_campaign c ON a.CampaignId = c.id",
        "WHERE o.ClientId = :cid"
    ]

    # Add dynamic filters
    for key, value in filters.items():
        if key == "campaignType":
            sql_parts.append("AND c.CampaignParentName = :campaignType")
            params["campaignType"] = value
        elif key == "campaign":
            sql_parts.append("AND c.id = :campaign")
            params["campaign"] = value
        elif key == "allocation":
            sql_parts.append("AND a.id = :allocation")
            params["allocation"] = value
        elif key == "scenario":
            sql_parts.append("AND o.Category1 = :scenario")
            params["scenario"] = value
        elif key == "subScenario1":
            sql_parts.append("AND o.Category2 = :subScenario1")
            params["subScenario1"] = value
        elif key == "subScenario2":
            sql_parts.append("AND o.Category3 = :subScenario2")
            params["subScenario2"] = value
        elif key == "subScenario3":
            sql_parts.append("AND o.Category4 = :subScenario3")
            params["subScenario3"] = value
        elif key == "msisdn":
            sql_parts.append("AND o.MSISDN LIKE :msisdn")
            params["msisdn"] = value

    # --- FIXED DATE FILTERS (use DATE() instead of datetime) ---
    if startDate:
        sql_parts.append("AND DATE(o.CallDate) >= :start_dt")
        params["start_dt"] = startDate

    if endDate:
        sql_parts.append("AND DATE(o.CallDate) <= :end_dt")
        params["end_dt"] = endDate

    sql_parts.append("ORDER BY o.CallDate DESC")
    rows = safe_query(db, "\n".join(sql_parts), params)

    # --- Counts helper ---
    def build_counts(apply_filters=True):
        scenario_cols = ["Category1", "Category2", "Category3", "Category4"]
        scenario_keys = ["scenario", "subScenario1", "subScenario2", "subScenario3"]

        counts = {}
        for col, key in zip(scenario_cols, scenario_keys):
            count_sql = f"""
                SELECT COALESCE(NULLIF(o.{col}, ''), 'Unknown') AS name, COUNT(*) AS total
                FROM call_master_out o
                JOIN ob_allocation_name a ON o.AllocationId = a.id
                JOIN ob_campaign c ON a.CampaignId = c.id
                WHERE o.ClientId = :cid
            """
            count_params = {"cid": CLIENT_ID}

            if apply_filters:
                for k, v in filters.items():
                    if k == "campaignType":
                        count_sql += " AND c.CampaignParentName = :campaignType"
                        count_params["campaignType"] = v
                    elif k == "campaign":
                        count_sql += " AND c.id = :campaign"
                        count_params["campaign"] = v
                    elif k == "allocation":
                        count_sql += " AND a.id = :allocation"
                        count_params["allocation"] = v
                    elif k == "scenario":
                        count_sql += " AND o.Category1 = :scenario"
                        count_params["scenario"] = v
                    elif k == "subScenario1":
                        count_sql += " AND o.Category2 = :subScenario1"
                        count_params["subScenario1"] = v
                    elif k == "subScenario2":
                        count_sql += " AND o.Category3 = :subScenario2"
                        count_params["subScenario2"] = v
                    elif k == "subScenario3":
                        count_sql += " AND o.Category4 = :subScenario3"
                        count_params["subScenario3"] = v
                    elif k == "msisdn":
                        count_sql += " AND o.MSISDN LIKE :msisdn"
                        count_params["msisdn"] = v

            # Date filters for counts
            if startDate:
                count_sql += " AND DATE(o.CallDate) >= :start_dt"
                count_params["start_dt"] = startDate
            if endDate:
                count_sql += " AND DATE(o.CallDate) <= :end_dt"
                count_params["end_dt"] = endDate

            count_sql += f" GROUP BY o.{col} ORDER BY o.{col}"
            counts[key] = safe_query(db, count_sql, count_params)

        # Total count
        total_sql = """
            SELECT COUNT(*) AS total
            FROM call_master_out o
            JOIN ob_allocation_name a ON o.AllocationId = a.id
            JOIN ob_campaign c ON a.CampaignId = c.id
            WHERE o.ClientId = :cid
        """
        total_params = {"cid": CLIENT_ID}

        if apply_filters:
            for k, v in filters.items():
                if k == "campaignType":
                    total_sql += " AND c.CampaignParentName = :campaignType"
                    total_params["campaignType"] = v
                elif k == "campaign":
                    total_sql += " AND c.id = :campaign"
                    total_params["campaign"] = v
                elif k == "allocation":
                    total_sql += " AND a.id = :allocation"
                    total_params["allocation"] = v
                elif k == "scenario":
                    total_sql += " AND o.Category1 = :scenario"
                    total_params["scenario"] = v
                elif k == "subScenario1":
                    total_sql += " AND o.Category2 = :subScenario1"
                    total_params["subScenario1"] = v
                elif k == "subScenario2":
                    total_sql += " AND o.Category3 = :subScenario2"
                    total_params["subScenario2"] = v
                elif k == "subScenario3":
                    total_sql += " AND o.Category4 = :subScenario3"
                    total_params["subScenario3"] = v
                elif k == "msisdn":
                    total_sql += " AND o.MSISDN LIKE :msisdn"
                    total_params["msisdn"] = v

            if startDate:
                total_sql += " AND DATE(o.CallDate) >= :start_dt"
                total_params["start_dt"] = startDate
            if endDate:
                total_sql += " AND DATE(o.CallDate) <= :end_dt"
                total_params["end_dt"] = endDate

        total_count = safe_query(db, total_sql, total_params)
        counts["total"] = total_count[0]["total"] if total_count else 0
        return counts

    countsFiltered = build_counts(apply_filters=True)
    countsAll = build_counts(apply_filters=False)

    # Breadcrumb
    breadcrumb = []
    for key in ["scenario", "subScenario1", "subScenario2", "subScenario3"]:
        val = locals().get(key)
        if val:
            breadcrumb.append({"level": key, "value": val})

    return {
        "data": rows,
        "countsFiltered": countsFiltered,
        "countsAll": countsAll,
        "breadcrumb": breadcrumb,
    }



def to_decimal(x, places=2):
    d = Decimal(x if x is not None else 0)
    q = Decimal(10) ** -places
    return d.quantize(q, rounding=ROUND_HALF_UP)


@router.get("/download_excel_raw")
def download_excel_raw(
        client_id: int,
        from_date: date = Query(...),
        to_date: date = Query(...),
        db=Depends(get_db4),
        db2=Depends(get_db2),
        db3=Depends(get_db4),
):
    # Step 1: Client Info
    client_result = db.execute(text("""
        SELECT company_name, reg_office_address1, phone_no, email, auth_person
        FROM registration_master
        WHERE company_id = :client_id
    """), {"client_id": client_id}).fetchone()

    campaign_q = text("SELECT campaignid FROM registration_master WHERE company_id = :company_id LIMIT 1")
    campaign_row = db.execute(campaign_q, {"company_id": client_id}).mappings().fetchone()
    if not campaign_row or not campaign_row.get("campaignid"):
        raise HTTPException(status_code=404, detail="Company / campaign not found")

    # --- CLEAN CAMPAIGN LIST ---
    raw_campaign = campaign_row["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]

    balance_result = db.execute(text("""
        SELECT * FROM balance_master
        WHERE clientId = :client_id
        LIMIT 1
    """), {"client_id": client_id}).mappings().fetchone()

    plan_result = None
    if balance_result and balance_result.PlanId:
        plan_result = db.execute(text("""
            SELECT * FROM plan_master
            WHERE Id = :plan_id
            LIMIT 1
        """), {"plan_id": balance_result.PlanId}).mappings().fetchone()
        

    # parse plan values (with sensible defaults)
    try:
        ib_pulse_sec = float(plan_result.get("pulse_day_shift") or 60)
    except:
        ib_pulse_sec = 60.0
    try:
        ibn_pulse_sec = float(plan_result.get("pulse_night_shift") or ib_pulse_sec)
    except:
        ibn_pulse_sec = ib_pulse_sec

    try:
        ob_pulse_sec = float(plan_result.get("pulse_outbound_call_shift") or 60)
    except:
        ob_pulse_sec = 60.0

    try:
        ib_pulse_rate = Decimal(plan_result.get("rate_per_pulse_day_shift") or 0)
    except:
        ib_pulse_rate = Decimal(0)
    try:
        ibn_pulse_rate = Decimal(plan_result.get("rate_per_pulse_night_shift") or 0)
    except:
        ibn_pulse_rate = Decimal(0)
    try:
        ob_pulse_rate = Decimal(plan_result.get("rate_per_pulse_outbound_call_shift") or 0)
    except:
        ob_pulse_rate = Decimal(0)

    # plan-level flat/charge fields (kept same names as PHP)
    ib_charge_plan = Decimal(plan_result.get("InboundCallCharge") or 0)
    ibn_charge_plan = Decimal(plan_result.get("InboundCallChargeNight") or 0)
    ob_charge_plan = Decimal(plan_result.get("OutboundCallCharge") or 0)

    # first minute logic (match PHP 'Enable' exactly)
    first_minute_enabled = (str(plan_result.get("first_minute", "")).lower() == "enable")
    ifmp = ceil(60.0 / ib_pulse_sec) if ib_pulse_sec > 0 else 1
    ifmp_n = ceil(60.0 / ibn_pulse_sec) if ibn_pulse_sec > 0 else 1
    ofmp = ceil(60.0 / ob_pulse_sec) if ob_pulse_sec > 0 else 1
    ob_first_min = first_minute_enabled  # same as PHP's $ob_first_min

    # used_amount = sum([
    #     balance_result[key] if key in balance_result and balance_result[key] else 0
    #     for key in [
    #         "ib_total", "ibn_total", "ob_total", "TMinAmount",
    #         "TMouAmount", "TvfAmount", "sms_total", "email_total",
    #         "TivAmount", "TWhatsAppAmount", "TBoatAmount"
    #     ]
    # ]) if balance_result else 0

    Used_Amount = Decimal(0)

    

    # Step 2: Call log data from vicidial DB
    call_data = db2.execute(text(f"""
        SELECT 
            IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec) AS length_in_sec,
            t2.phone_number,
            t2.call_date,
            t2.user
        FROM vicidial_closer_log t2
        LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
        WHERE t2.user != 'VDCL'
          AND t2.campaign_id IN :campaigns
          AND DATE(t2.call_date) BETWEEN :from_date AND :to_date
    """), {"campaigns": tuple(campaign_list),"from_date": from_date, "to_date": to_date}).mappings().fetchall()

    html_day_rows = ""
    html_night_rows = ""

    ib_pulse = 0
    ib_secs = 0
    ib_total = Decimal(0)

    ibn_pulse = 0
    ibn_secs = 0
    ibn_total = Decimal(0)

    ab_pulse = 0
    ab_secs = 0
    ab_total = Decimal(0)

    ob_pulse = 0
    ob_secs = 0
    ob_total = Decimal(0)

    

    # multilang_call_data = db2.execute(text(f"""
    #     SELECT 
    #         IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec) AS length_in_sec,
    #         t2.phone_number,
    #         t2.call_date,
    #         t2.user
    #     FROM vicidial_closer_log t2
    #     LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
    #     WHERE t2.user != 'VDCL'
    #       AND t2.campaign_id IN ('ML01', 'ML02', 'ML03')  -- replace with your actual multi-language campaign_ids
    #       AND DATE(t2.call_date) BETWEEN :from_date AND :to_date
    # """), {"from_date": from_date, "to_date": to_date}).fetchall()

    # --- OUTBOUND (Vicidial Log) Section ---
    aband_data = db2.execute(text("""
            SELECT
                (va.talk_sec-va.dead_sec) length_in_sec,
                LEFT(v.phone_number, 10) AS phone_number,
                v.call_date,
                v.user
            FROM vicidial_log v
            JOIN vicidial_agent_log va ON v.uniqueid = va.uniqueid
            WHERE length_in_sec != 0
                AND v.user != 'VDAD'
                AND v.campaign_id IN :campaigns
              AND DATE(v.call_date) BETWEEN :from_date AND :to_date
        """), {"campaigns": tuple(campaign_list),"client_id": client_id, "from_date": from_date, "to_date": to_date}).mappings().fetchall()

    sql_get_ob = text("""
        SELECT LEFT(PhoneNo,10) AS PhoneNumber, DATE(Callbackdate) AS CallbackDate
        FROM aband_call_master
        WHERE clientid = :client_id
        AND DATE(Callbackdate) BETWEEN :from_date AND :to_date
        GROUP BY 1,2
    """)
    ob_rows = db.execute(sql_get_ob, {"client_id": client_id, "from_date": from_date, "to_date": to_date}).fetchall()

    # Prepare the direct IN string just like working API
    phone_date_pairs = [(r.PhoneNumber, r.CallbackDate) for r in ob_rows]
    if phone_date_pairs:
        in_values = ", ".join(f"('{pn}','{dt}')" for pn, dt in phone_date_pairs)
    else:
        in_values = "('','0000-00-00')"  # guaranteed no match
    
    query = text(f"""
                SELECT t2.list_id,
                t2.call_date AS CallDate,
                TIME(FROM_UNIXTIME(t2.start_epoch)) AS StartTime,
                LEFT(t2.phone_number,10) AS PhoneNumber,
                t2.`user` AS Agent,
                t3.talk_sec AS TalkSec
            FROM asterisk.vicidial_log t2
            LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid
            WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date
            AND t2.campaign_id = 'dialdesk'
            AND t2.lead_id IS NOT NULL
            AND (LEFT(t2.phone_number,10), DATE(t2.call_date)) IN ({in_values})
            """)

    ab_data = db2.execute(query, {"from_date": from_date, "to_date": to_date}).mappings().fetchall()

    # --- Initialize SMS variables
    sms_pulse = 0
    sms_secs = 0
    sms_charge = Decimal(0)
    sms_flat = 0
    sms_total = Decimal(0)

    # Get plan SMS charge
    sms_charge = Decimal(plan_result.get("SMSCharge", 0) or 0)

    sms_query = text("""
        SELECT 
            DATE_FORMAT(CallDate,'%d %b %y') AS CallDate1,
            CallDate,
            CallTime,
            CallFrom,
            Unit,
            AlertTo
        FROM billing_master
        WHERE clientId = :client_id
          AND DedType = 'SMS'
          AND DATE(CallDate) BETWEEN :from_date AND :to_date
    """)

    sms_data = db.execute(sms_query, {
        "client_id": client_id,
        "from_date": from_date,
        "to_date": to_date
    }).mappings().fetchall()


    # --- Initialize EMAIL variables (same as PHP) ---
    email_pulse = 0
    email_secs = 0
    email_charge = Decimal(0)
    email_flat = 0
    email_total = Decimal(0)

    # Plan charge for Email
    email_charge = Decimal(plan_result.get("EmailCharge", 0) or 0)
    email_flat = 0

    email_query = text("""
        SELECT 
            DATE_FORMAT(CallDate,'%d %b %y') AS CallDate1,
            CallDate,
            CallTime,
            CallFrom,
            Unit
        FROM billing_master
        WHERE clientId = :client_id
          AND DedType = 'Email'
          AND DATE(CallDate) BETWEEN :from_date AND :to_date
    """)

    email_data = db.execute(email_query, {
        "client_id": client_id,
        "from_date": from_date,
        "to_date": to_date
    }).mappings().fetchall()


    ivr_charge = Decimal(plan_result.get("IVR_Charge"))

    rx_query = text("""
        SELECT 
            DATE_FORMAT(call_time,'%d %b %y') AS CallDate1,
            call_time AS CallDate,
            TIME(call_time) AS CallTime,
            1 AS Unit,
            source_number AS CallFrom
        FROM rx_log
        WHERE clientId = :client_id
          AND DATE(call_time) BETWEEN :from_date AND :to_date
    """)

    rx_data = db3.execute(rx_query, {
        "client_id": client_id,
        "from_date": from_date,
        "to_date": to_date
    }).mappings().fetchall()

    total_talk_time = 0
    total_pulse = 0
    total_rate = 0.0

    total_talk_time2 = 0
    total_pulse2 = 0
    total_rate2 = 0.0

    total_talk_time3 = 0
    total_pulse3 = 0
    total_rate3 = 0.0

    total_talk_time4 = 0
    total_pulse4 = 0
    total_rate4 = 0.0

    total_pulse5 = 0
    total_rate5 = 0.0

    total_pulse6 = 0
    total_rate6 = 0.0

    total_pulse7 = 0
    total_rate7 = Decimal(0)

    # Step 3: Build HTML for Excel
    html = f"""
    <html><head><meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=utf-8" /></head><body>
    <table border='0' width='600' cellpadding='2' cellspacing='2'>
        <tr><td colspan='6' align='center'>
            <img src='http://dialdesk.co.in/dialdesk/app/webroot/billing_statement/logo.jpg' height='80'><br>
            <strong style='font-size:16pt;'>A UNIT OF ISPARK DATA CONNECT PVT LTD</strong>
        </td></tr>
    </table>

    <table border='1' width='600' cellpadding='2' cellspacing='2' style="font-size:11pt;">
        <tr><td colspan='7' style='font-size:15pt;background-color:#607d8b;color:#fff;'>Client Details</td></tr>
        <tr><th>Company</th><th colspan='3'>Address</th><th>Mobile No</th><th>Email</th><th>Authorised Person</th></tr>
        <tr>
            <td>{client_result.company_name if client_result else ''}</td>
            <td colspan='3'>{client_result.reg_office_address1 if client_result else ''}</td>
            <td>{client_result.phone_no if client_result else ''}</td>
            <td>{client_result.email if client_result else ''}</td>
            <td>{client_result.auth_person if client_result else ''}</td>
        </tr>
    </table>

    <table><tr><td>&nbsp;</td></tr></table>
  

    <!-- SUMMARY_PLACEHOLDER -->
    {{SUMMARY_TABLE}}


    <table><tr><td>&nbsp;</td></tr></table>

    """

    # for row in call_data:
    #     dt = row.call_date
    #     talk_time = int(row.length_in_sec or 0)
    #     pulse = (talk_time // 60) + (1 if talk_time % 60 else 0)
    #     rate = pulse * 0.5  # Replace with actual rate

    #     total_talk_time += talk_time
    #     total_pulse += pulse
    #     total_rate += rate  # Example rate, replace with actual



    for r in call_data:
        length = r.get("length_in_sec")
        call_date = r.get("call_date")
        # skip empty durations
        if not length:
            continue
        try:
            duration = float(length)
        except:
            continue

        # normalize call_date to datetime
        if isinstance(call_date, str):
            try:
                call_dt = datetime.fromisoformat(call_date)
            except:
                try:
                    call_dt = datetime.strptime(call_date, "%Y-%m-%d %H:%M:%S")
                except:
                    call_dt = None
        else:
            call_dt = call_date

        call_time_str = call_dt.strftime("%H:%M:%S") if call_dt else "00:00:00"
        # match PHP night logic: night if >=20:00 or <=08:00 (note: PHP used <= '08:00:00')
        is_night = (call_time_str >= "20:00:00") or (call_time_str <= "08:00:00")

        # PHP keeps a call_pulsesec variable equal to 0 and then adds it to *_secs.
        call_pulsesec = 0

        if is_night:
            ibn_secs += duration
            convrt_pulse = duration / ibn_pulse_sec if ibn_pulse_sec > 0 else duration
            if first_minute_enabled:
                if convrt_pulse > ifmp_n:
                    subsequent = convrt_pulse - ifmp_n
                    call_pulse = int(ifmp_n + ceil(subsequent))
                else:
                    call_pulse = int(ifmp_n)
            else:
                call_pulse = int(ceil(duration / ibn_pulse_sec)) if ibn_pulse_sec > 0 else int(ceil(duration))
            call_rate = (Decimal(call_pulse) * ibn_pulse_rate).quantize(Decimal("0.0001"))
            ibn_pulse += call_pulse
            ibn_secs += call_pulsesec    # PHP increments by call_pulsesec which is 0
            ibn_total += call_rate

            # Add row to night table
            html_night_rows += f"<tr><td>{call_dt.date()}</td><td>{call_dt.time()}</td><td>{r.phone_number}</td><td>{r.user}</td><td>{length}</td><td>{call_pulse}</td><td>{call_rate:.2f}</td></tr>"

        else:
            ib_secs += duration
            convrt_pulse = duration / ib_pulse_sec if ib_pulse_sec > 0 else duration
            if first_minute_enabled:
                if convrt_pulse > ifmp:
                    subsequent = convrt_pulse - ifmp
                    call_pulse = int(ifmp + ceil(subsequent))
                else:
                    call_pulse = int(ifmp)
            else:
                call_pulse = int(ceil(duration / ib_pulse_sec)) if ib_pulse_sec > 0 else int(ceil(duration))
            call_rate = (Decimal(call_pulse) * ib_pulse_rate).quantize(Decimal("0.0001"))
            ib_pulse += call_pulse
            ib_secs += call_pulsesec    # PHP increments by call_pulsesec which is 0
            ib_total += call_rate

            # Add row to day table
            html_day_rows += f"<tr><td>{call_dt.date()}</td><td>{call_dt.time()}</td><td>{r.phone_number}</td><td>{r.user}</td><td>{length}</td><td>{call_pulse}</td><td>{call_rate:.2f}</td></tr>"

    # html += f"""
    #     <tr style='font-weight:bold; background-color:#e0e0e0;'>
    #         <td colspan='4' align='right'>Total</td>
    #         <td>{ib_secs}</td>
    #         <td>{ib_pulse}</td>
    #         <td>{ib_total:.2f}</td>
    #     </tr>
    # """


    # --- Create DAY table ---
    html += f"""
    <table border='1' width='600' cellpadding='2' cellspacing='2' style="font-size:11pt;">
    <tr><td colspan='7' style='font-size:15pt;background-color:#607d8b;color:#fff;'>{client_result.company_name if client_result else ''} (INBOUND DAY)</td></tr>
    <tr><th>Date</th><th>Time</th><th>Call From</th><th>Agent</th><th>Talk Time</th><th>Pulse</th><th>Rate</th></tr>
    {html_day_rows}
    <tr style='font-weight:bold; background-color:#e0e0e0;'>
        <td colspan='4' align='right'>Total</td>
        <td>{ib_secs}</td>
        <td>{ib_pulse}</td>
        <td>{ib_total:.2f}</td>
    </tr>
    </table>
    """

    # --- Create NIGHT table ---
    html += f"""
    <table><tr><td>&nbsp;</td></tr></table>
    <table border='1' width='600' cellpadding='2' cellspacing='2' style="font-size:11pt;">
    <tr><td colspan='7' style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (INBOUND NIGHT)</td></tr>
    <tr><th>Date</th><th>Time</th><th>Call From</th><th>Agent</th><th>Talk Time</th><th>Pulse</th><th>Rate</th></tr>
    {html_night_rows}
    <tr style='font-weight:bold; background-color:#e0e0e0;'>
        <td colspan='4' align='right'>Total</td>
        <td>{ibn_secs}</td>
        <td>{ibn_pulse}</td>
        <td>{ibn_total:.2f}</td>
    </tr>
    </table>
    """



    # html += """
    #     <table><tr><td>&nbsp;</td></tr></table>

    #     <table border='1' width='600' cellpadding='2' cellspacing='2'>
    #         <tr><td colspan='7' style='font-size:15pt;background-color:#607d8b;color:#fff;'>""" + \
    #         f"""{client_result.company_name if client_result else ''} (Multi Language INBOUND)</td></tr>
    #         <tr><th>Date</th><th>Time</th><th>Call From</th><th>Agent</th><th>Talk Time</th><th>Pulse</th><th>Rate</th></tr>
    #     """

    # for row in multilang_call_data:
    #     dt = row.call_date
    #     talk_time = int(row.length_in_sec or 0)
    #     pulse = (talk_time // 60) + (1 if talk_time % 60 else 0)
    #     rate = pulse * 0.5  # Adjust if multi-lang rate is different

    #     total_talk_time2 += talk_time
    #     total_pulse2 += pulse
    #     total_rate2 += rate

    #     html += f"<tr><td>{dt.date()}</td><td>{dt.time()}</td><td>{row.phone_number}</td><td>{row.user}</td><td>{talk_time}</td><td>{pulse}</td><td>{rate:.2f}</td></tr>"

    # html += f"""
    #         <tr style='font-weight:bold; background-color:#e0e0e0;'>
    #             <td colspan='4' align='right'>Total</td>
    #             <td>{total_talk_time2}</td>
    #             <td>{total_pulse2}</td>
    #             <td>{total_rate2:.2f}</td>
    #         </tr>
    #     """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="7" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (OUTBOUND)</td></tr>
            <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Call From</th>
                <th>Agent</th>
                <th>Talk Time</th>
                <th>Pulse</th>
                <th>Rate</th>
            </tr>
        """

    
    for ob in aband_data:
        raw_len = ob.get("length_in_sec")
        dt = ob.get("call_date")
        if not raw_len:
            continue

        callLength = round(float(raw_len))  # PHP round()
        if callLength <= 0:
            continue
        ab_secs += callLength

        # pulse conversion
        convrt_pulse = callLength / ob_pulse_sec if ob_pulse_sec > 0 else callLength

        # ---- First-minute logic (PHP exact replica) ----
        if ob_first_min:
            if convrt_pulse > ofmp:
                subsequent = math.ceil(convrt_pulse - ofmp)
                total_pulse = ofmp + subsequent
            elif callLength == 0:
                total_pulse = 0
            else:
                total_pulse = ofmp
        else:
            total_pulse = math.ceil(callLength / ob_pulse_sec)

        # bill amount
        amount = Decimal(total_pulse) * Decimal(ob_pulse_rate)

        # aggregate
        ab_pulse += total_pulse
        ab_total += amount
        ab_secs += 0


    # for row in outbound_data:
    #     dt = row.call_date
    #     talk_time = int(row.length_in_sec or 0)
    #     pulse = (talk_time // 60) + (1 if talk_time % 60 else 0)
    #     rate = pulse * 0.5  # You can replace with actual per-minute rate

    #     total_talk_time3 += talk_time
    #     total_pulse3 += pulse
    #     total_rate3 += rate

        html += f"<tr><td>{dt.date()}</td><td>{dt.time()}</td><td>{ob.phone_number}</td><td>{ob.user}</td><td>{callLength}</td><td>{total_pulse}</td><td>{amount:.2f}</td></tr>"

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='4' align='right'>Total</td>
                <td>{ab_secs}</td>
                <td>{ab_pulse}</td>
                <td>{ab_total:.2f}</td>
            </tr>
        """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="7" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (ABAND CALLBACK)</td></tr>
            <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Call From</th>
                <th>Agent</th>
                <th>Talk Time</th>
                <th>Pulse</th>
                <th>Rate</th>
            </tr>
    """

    for call in ab_data:
        talk_sec = float(call.get("TalkSec") or 0)
        call_date = call.get("CallDate")
        if talk_sec <= 0:
            continue

        ob_secs += talk_sec

        # Calculate pulses using plan logic
        if ob_first_min:
            convrt_pulse = talk_sec / ob_pulse_sec
            if convrt_pulse > ofmp:
                subsequent = math.ceil(convrt_pulse - ofmp)
                total_pulse = ofmp + subsequent
            elif talk_sec == 0:
                total_pulse = 0
            else:
                total_pulse = ofmp
        else:
            total_pulse = math.ceil(talk_sec / ob_pulse_sec)

        ob_pulse += total_pulse
        ob_total += Decimal(total_pulse) * Decimal(ob_pulse_rate)



        html += f"""
            <tr>
                <td>{call_date.date()}</td>
                <td>{call_date.time()}</td>
                <td>{call.PhoneNumber}</td>
                <td>{call.Agent}</td>
                <td>{talk_sec}</td>
                <td>{total_pulse}</td>
                <td>{Decimal(total_pulse) * Decimal(ob_pulse_rate):.2f}</td>
            </tr>
        """

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='4' align='right'>Total</td>
                <td>{ob_secs}</td>
                <td>{ob_pulse}</td>
                <td>{ob_total:.2f}</td>
            </tr>
        """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="6" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (SMS)</td></tr>
            <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Call From</th>
                <th>Alert To</th>
                <th>Pulse</th>
                <th>Rate</th>
            </tr>
    """


    for sms in sms_data:
        smsChar = int(sms.get("Duration") or 0)
        sms_unit = int(sms.get("Unit") or 0)

        sms_pulse += sms_unit
        sms_secs += smsChar
        sms_total += Decimal(sms_charge) * Decimal(sms_unit)


    # for row in sms_data:
    #     pulse = int(row.Unit) if row.Unit else 0
    #     rate = pulse * 0.2  # Set your actual rate here

    #     total_pulse5 += pulse
    #     total_rate5 += rate

        html += f"""
            <tr>
                <td>{sms.CallDate1}</td>
                <td>{sms.CallTime}</td>
                <td>{sms.CallFrom}</td>
                <td>{sms.AlertTo}</td>
                <td>{sms_unit}</td>
                <td>{sms_charge:.2f}</td>
            </tr>
        """

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='4' align='right'>Total</td>
                <td>{sms_pulse}</td>
                <td>{sms_total:.2f}</td>
            </tr>
        """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="5" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (EMAIL)</td></tr>
            <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Call From</th>
                <th>Pulse</th>
                <th>Rate</th>
            </tr>
    """

    for email_row in email_data:
        EmailUnit = int(email_row.get("Unit") or 0)
        email_rate = Decimal(EmailUnit) * email_charge

        email_pulse += EmailUnit
        email_total += email_rate

    # for row in email_data:
    #     pulse = int(row.Unit) if row.Unit else 0
    #     rate = pulse * 0.25  # Replace with actual per-email rate

    #     total_pulse6 += pulse
    #     total_rate6 += rate

        html += f"""
            <tr>
                <td>{email_row.CallDate1}</td>
                <td>{email_row.CallTime}</td>
                <td>{email_row.CallFrom}</td>
                <td>{EmailUnit}</td>
                <td>{email_rate:.2f}</td>
            </tr>
        """

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='3' align='right'>Total</td>
                <td>{email_pulse}</td>
                <td>{email_total:.2f}</td>
            </tr>
        """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="5" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (IVR)</td></tr>
            <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Call From</th>
                <th>Pulse</th>
                <th>Rate</th>
            </tr>
    """

    for row in rx_data:
        pulse = 1
        rate = pulse * ivr_charge

        total_pulse7 += pulse
        total_rate7 += rate

        html += f"""
            <tr>
                <td>{row.CallDate1}</td>
                <td>{row.CallTime}</td>
                <td>{row.CallFrom}</td>
                <td>{pulse}</td>
                <td>{rate:.2f}</td>
            </tr>
        """

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='3' align='right'>Total</td>
                <td>{total_pulse7}</td>
                <td>{total_rate7:.2f}</td>
            </tr>
        """

    # === 1️⃣ Get dynamic rates with fallback ===
    rate_icb = plan_result.InboundRate if plan_result and hasattr(plan_result, "InboundRate") else 0.5
    rate_multilang = plan_result.MultiLangInboundRate if plan_result and hasattr(plan_result,
                                                                                 "MultiLangInboundRate") else 0.5
    rate_ocb = plan_result.OutboundRate if plan_result and hasattr(plan_result, "OutboundRate") else 0.5
    rate_abcb = plan_result.AbandCallRate if plan_result and hasattr(plan_result, "AbandCallRate") else 0.5
    rate_sms = plan_result.SMSRate if plan_result and hasattr(plan_result, "SMSRate") else 0.2
    rate_email = plan_result.EmailRate if plan_result and hasattr(plan_result, "EmailRate") else 0.25
    rate_rx = plan_result.IVR_Charge if plan_result and hasattr(plan_result, "IVR_Charge") else 0.2

    # === 2️⃣ Recalculate final amounts ===
    amount_icb = total_pulse * rate_icb
    amount_multilang = total_pulse2 * rate_multilang
    amount_ocb = total_pulse3 * rate_ocb
    amount_abcb = total_pulse4 * rate_abcb
    amount_sms = total_pulse5 * rate_sms
    amount_email = total_pulse6 * rate_email
    amount_rx = total_pulse7 * ivr_charge

    # grand_total = ib_total + ibn_total + ob_total + ab_total + amount_sms + amount_email + amount_rx
    grand_total = (
        Decimal(ib_total) +
        Decimal(ibn_total) +
        Decimal(ob_total) +
        Decimal(ab_total) +
        Decimal(sms_total) +
        Decimal(email_total) +
        Decimal(amount_rx)
    )

    # used_amount = (
    #     Decimal(ib_total) +
    #     Decimal(ibn_total) +
    #     Decimal(ob_total) +
    #     Decimal(ab_total) +
    #     Decimal(sms_total) +
    #     Decimal(email_total) +
    #     Decimal(amount_rx)
    # )
    # print("#######",used_amount)
    # html = html.replace("{Used_Amount}", f"{used_amount:.2f}")


    # === 3️⃣ Append Summary Table ===
    summary_html  = f"""
    <table><tr><td>&nbsp;</td></tr></table>
    <table border='1' width='600' cellpadding='2' cellspacing='2' style='font-size:11pt;'>
        <tr>
            <td colspan='4' style='font-size:15pt;background-color:#607d8b;color:#fff;'>Summary</td>
        </tr>
        <tr>
            <th>Description</th>
            <th>Pulse/Unit</th>
            <th>Rate</th>
            <th>Amount</th>
        </tr>
        <tr><td>ICB</td><td>{ib_pulse}</td><td>{ib_pulse_rate} Rs./{ib_pulse_sec} Sec</td><td>{ib_total:.2f}</td></tr>
        <tr><td>ICB Night</td><td>{ibn_pulse}</td><td>{ibn_pulse_rate} Rs./{ibn_pulse_sec} Sec</td><td>{ibn_total:.2f}</td></tr>
        <tr><td>ABCB</td><td>{ob_pulse}</td><td>{ob_pulse_rate}Rs./{ob_pulse_sec} Sec</td><td>{ob_total:.2f}</td></tr>
        <tr><td>OCB</td><td>{ab_pulse}</td><td>{ob_pulse_rate}Rs./{ob_pulse_sec} Sec</td><td>{ab_total:.2f}</td></tr>
        <tr><td>SMS</td><td>{sms_pulse}</td><td>{sms_charge} Rs./Min</td><td>{sms_total:.2f}</td></tr>
        <tr><td>Email</td><td>{email_pulse}</td><td>{email_charge} Rs./Min</td><td>{email_total:.2f}</td></tr>
        <tr><td>IVR</td><td>{total_pulse7}</td><td>{ivr_charge} Rs./Min</td><td>{amount_rx:.2f}</td></tr>
        <tr style='font-weight:bold; background-color:#e0e0e0;'>
            <td colspan='3' align='right'>Grand Total ({from_date}/{to_date})</td>
            <td>{grand_total:.2f}</td>
        </tr>
    </table>
    """

    html = html.replace("{SUMMARY_TABLE}", summary_html)



    html += "</table></body></html>"

    # Step 4: Return as Excel
    buffer = BytesIO(html.encode('utf-8'))
    filename = f"statement_{datetime.now().strftime('%d_%m_%y_%H_%M_%S')}.xls"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Pragma": "no-cache",
        "Expires": "0"
    }

    return StreamingResponse(buffer, media_type="application/vnd.ms-excel", headers=headers)



@router.get("/fields/{client_id}")
def get_fields_for_client(client_id: int, db: Session = Depends(get_db4)):
    # Fetch field_master data for the client
    sql_fields = text("""
        SELECT id, FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber
        FROM field_master
        WHERE ClientId = :client_id AND FieldStatus = 1
        ORDER BY Priority ASC
    """)
    fields_result = db.execute(sql_fields, {"client_id": client_id})
    fields = [dict(row) for row in fields_result.mappings().all()]

    if not fields:
        raise HTTPException(status_code=404, detail="No fields found for this client_id")

    # Collect IDs of DropDown fields
    dropdown_field_ids = [field['id'] for field in fields if field['FieldType'].lower() == 'dropdown']

    dropdown_values_map = {}
    if dropdown_field_ids:
        sql_dropdown_values = text("""
            SELECT FieldId, FieldValueName
            FROM field_master_value
            WHERE ClientId = :client_id
              AND FieldId IN :field_ids
            ORDER BY id ASC
        """)
        dropdown_values_result = db.execute(sql_dropdown_values, {
            "client_id": client_id,
            "field_ids": tuple(dropdown_field_ids)
        })

        # Organize values as {FieldId: [value1, value2, ...]}
        for row in dropdown_values_result.mappings().all():
            field_id = row['FieldId']
            value_name = row['FieldValueName']
            dropdown_values_map.setdefault(field_id, []).append(value_name)

    # Attach dropdown options to relevant fields
    for field in fields:
        if field['FieldType'].lower() == 'dropdown':
            field['options'] = dropdown_values_map.get(field['id'], [])

    return fields


@router.post("/call_tag/{client_id}")
async def save_call_master(client_id: int, payload: dict = Body(...), db: Session = Depends(get_db4)):
    # 1️⃣ Fetch FieldNames ordered by fieldNumber for this client
    field_query = text("""
            SELECT FieldName, fieldNumber
            FROM field_master
            WHERE ClientId = :client_id AND FieldStatus = 1
            ORDER BY fieldNumber
        """)
    result = db.execute(field_query, {"client_id": client_id})
    fields = result.mappings().all()

    # 2️⃣ Map payload values to Field1, Field2, Field3, ...
    field_column_mapping = {}
    for row in fields:
        field_name = row["FieldName"]
        field_number = row["fieldNumber"]
        value = payload.get(field_name, None)
        field_column_mapping[f"Field{field_number}"] = value

    # 3️⃣ Prepare insert statement
    columns = ', '.join(["`ClientId`"] + [f"`{col}`" for col in field_column_mapping.keys()])
    placeholders = ', '.join([":client_id"] + [f":{col}" for col in field_column_mapping.keys()])

    param_payload = {"client_id": client_id}
    param_payload.update(field_column_mapping)

    sql = text(f"""
            INSERT INTO call_master ({columns})
            VALUES ({placeholders})
        """)

    db.execute(sql, param_payload)
    db.commit()

    return {"message": "Data saved successfully."}













# # Crm_Backend/call_master.py with Dynamic Fields and Safe Queries
# from http.client import HTTPException
# from io import BytesIO
# from datetime import datetime, date
# from datetime import datetime as _dt
# from schemas import *
# from fastapi import APIRouter, Query, Depends, Body, HTTPException as FastAPIHTTPException
# from sqlalchemy import text
# from typing import List, Dict, Optional, Any
# from starlette.responses import StreamingResponse
# from sqlalchemy.exc import SQLAlchemyError
# from sqlalchemy.orm import Session

# from database import get_engine4, get_engine2, get_db2, get_db4

# router = APIRouter(tags=["Call Master"])

# # ------------------ Helpers ------------------ #
# def _exec_engine(engine, sql_text: str, params: dict = None):
#     """Run a text query against an Engine (sync connect) and return list of mappings."""
#     try:
#         with engine.connect() as conn:
#             return conn.execute(text(sql_text), params or {}).mappings().all()
#     except SQLAlchemyError as e:
#         raise FastAPIHTTPException(status_code=500, detail=f"DB engine error: {str(e)}")


# def _exec_session(db: Session, sql_text: str, params: dict = None):
#     """Run a text query against a Session/Connection and return list of mappings."""
#     try:
#         return db.execute(text(sql_text), params or {}).mappings().all()
#     except SQLAlchemyError as e:
#         raise FastAPIHTTPException(status_code=500, detail=f"DB session error: {str(e)}")


# def fetch_field_meta_for_client(conn_engine_or_db, client_id: int, use_engine: bool = True, active_only: bool = False):
#     """
#     Return list of field metadata rows ordered by fieldNumber for a client.
#     conn_engine_or_db: either an Engine (get_engine4()) when use_engine True, or a Session when False.
#     """
#     status_cond = "AND (FieldStatus IS NULL OR FieldStatus != 'D')"
#     if active_only:
#         status_cond = "AND FieldStatus = 1"
#     sql = f"""
#         SELECT id, FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber
#         FROM field_master
#         WHERE ClientId = :client_id {status_cond}
#         ORDER BY fieldNumber
#     """
#     if use_engine:
#         return _exec_engine(conn_engine_or_db, sql, {"client_id": client_id})
#     else:
#         return _exec_session(conn_engine_or_db, sql, {"client_id": client_id})


# def build_field_map(field_meta_rows):
#     """Return dict: fieldNumber -> FieldName"""
#     return {r["fieldNumber"]: r["FieldName"] for r in field_meta_rows} if field_meta_rows else {}


# # ------------------ /call-master (dynamic) ------------------ #
# @router.get("/call-master/{client_id}", response_model=List[Dict])
# def get_call_master_data(
#     client_id: int,
#     from_date: Optional[str] = Query(None),
#     to_date: Optional[str] = Query(None),
#     Category1: Optional[str] = Query(None),
#     Category2: Optional[str] = Query(None),
#     Category3: Optional[str] = Query(None),
#     Category4: Optional[str] = Query(None),
#     Category5: Optional[str] = Query(None),
# ):
#     """
#     Dynamically build select columns from field_master for the client and return mapped records.
#     """
#     engine = get_engine4()
#     # 1) Fetch field mapping
#     field_meta = fetch_field_meta_for_client(engine, client_id, use_engine=True, active_only=False)
#     if not field_meta:
#         return []

#     field_map = build_field_map(field_meta)
#     # select dynamic field columns
#     columns = [f"field{num}" for num in field_map.keys()]
#     # include common columns if needed
#     common_cols = ["CallDate", "Category1", "Category2", "Category3", "Category4", "Category5"]
#     columns += common_cols
#     select_cols = ", ".join(columns)

#     # 2) Build where clause
#     where_clauses = ["ClientId = :client_id"]
#     params = {"client_id": client_id}
#     if from_date:
#         where_clauses.append("CallDate >= :from_date")
#         params["from_date"] = from_date
#     if to_date:
#         where_clauses.append("CallDate <= :to_date")
#         params["to_date"] = to_date

#     category_conditions = []
#     for i, val in enumerate([Category1, Category2, Category3, Category4, Category5], start=1):
#         if val:
#             category_conditions.append(f"Category{i} = :Category{i}")
#             params[f"Category{i}"] = val
#     if category_conditions:
#         where_clauses.append(f"({' OR '.join(category_conditions)})")

#     where_clause = " AND ".join(where_clauses)
#     query = f"SELECT {select_cols} FROM call_master WHERE {where_clause}"

#     rows = _exec_engine(get_engine4(), query, params)

#     # 3) Map response
#     response = []
#     for row in rows:
#         rec = {}
#         for fnum, label in field_map.items():
#             rec[label] = row.get(f"field{fnum}")
#         # attach common columns
#         for c in common_cols:
#             rec[c] = row.get(c)
#         response.append(rec)
#     return response


# # ------------------ /csat-report (unchanged behavior but safe) ------------------ #
# @router.get("/csat-report/{client_id}", response_model=List[Dict])
# def get_csat_report(
#     client_id: int,
#     from_date: str = Query(...),
#     to_date: str = Query(...),
# ):
#     query = text("""
#         SELECT vl.*, vcl.user, vu.full_name
#         FROM csat_data vl
#         INNER JOIN vicidial_closer_log vcl ON vl.uniqueid = vcl.uniqueid
#         INNER JOIN vicidial_users vu ON vcl.user = vu.user
#         WHERE vl.dtmf < 4
#           AND vl.client_id = :client_id
#           AND DATE(vl.call_date) BETWEEN :from_date AND :to_date
#     """)
#     try:
#         engine = get_engine2()
#         with engine.connect() as conn:
#             result = conn.execute(query, {
#                 "client_id": client_id,
#                 "from_date": from_date,
#                 "to_date": to_date,
#             }).mappings().all()
#         return [dict(row) for row in result]
#     except SQLAlchemyError as e:
#         raise FastAPIHTTPException(status_code=500, detail=f"Database query failed: {str(e)}")


# # ------------------ /priority_calls ------------------ #
# @router.get("/priority_calls", response_model=List[Dict[str, Any]])
# def get_priority_calls(
#     client_id: int = Query(...),
#     start_time: str = Query(...),
#     end_time: str = Query(...),
#     db: Session = Depends(get_db2)
# ):
#     try:
#         start_date = _dt.strptime(start_time, "%Y-%m-%d").date()
#         end_date = _dt.strptime(end_time, "%Y-%m-%d").date()

#         sql = text("""
#             SELECT *
#             FROM vicidial_list
#             WHERE vendor_lead_code = :client_id
#               AND DATE(entry_date) BETWEEN :start_date AND :end_date
#         """)
#         result = db.execute(sql, {
#             "client_id": client_id,
#             "start_date": start_date,
#             "end_date": end_date
#         })
#         return [dict(row) for row in result.mappings().all()]
#     except Exception as e:
#         raise FastAPIHTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# # ------------------ types / campaigns / allocations (unchanged) ------------------ #
# @router.get("/types", response_model=List[Dict])
# def get_types(CLIENT_ID: int = Query(...), db: Session = Depends(get_db4)):
#     sql = text("""
#         SELECT DISTINCT CampaignParentName AS id,
#                CampaignParentName AS name
#         FROM ob_campaign
#         WHERE ClientId = :cid AND CampaignStatus = 'A'
#         ORDER BY CampaignParentName
#     """)
#     rows = db.execute(sql, {"cid": CLIENT_ID}).fetchall()
#     return [dict(r._mapping) for r in rows]


# @router.get("/campaigns", response_model=List[Dict])
# def get_campaigns(CLIENT_ID: int = Query(...), type: str = Query(...), db: Session = Depends(get_db4)):
#     sql = text("""
#         SELECT id, CampaignName
#         FROM ob_campaign
#         WHERE ClientId = :cid
#           AND CampaignParentName = :type
#           AND CampaignStatus = 'A'
#     """)
#     rows = db.execute(sql, {"cid": CLIENT_ID, "type": type}).fetchall()
#     return [dict(r._mapping) for r in rows]


# @router.get("/allocations", response_model=List[Dict])
# def get_allocations(CLIENT_ID: int = Query(...), campaign: int = Query(...), db: Session = Depends(get_db4)):
#     sql = text("""
#         SELECT id, AllocationName
#         FROM ob_allocation_name
#         WHERE ClientId = :cid
#           AND CampaignId = :camp
#     """)
#     rows = db.execute(sql, {"cid": CLIENT_ID, "camp": campaign}).fetchall()
#     return [dict(r._mapping) for r in rows]


# # ------------------ /outcalls (keeps your behavior but safe) ------------------ #
# # @router.get("/outcalls", response_model=List[Dict])
# # def get_outcalls(
# #     CLIENT_ID: int = Query(...),
# #     campaignType: Optional[str] = None,
# #     campaign: Optional[int] = None,
# #     allocation: Optional[int] = None,
# #     scenario: Optional[str] = None,
# #     subScenario1: Optional[str] = None,
# #     subScenario2: Optional[str] = None,
# #     subScenario3: Optional[str] = None,
# #     msisdn: Optional[str] = None,
# #     startDate: Optional[str] = None,
# #     endDate: Optional[str] = None,
# #     db: Session = Depends(get_db4)
# # ):
# #     base_sql = [
# #         "SELECT o.id, o.Category1 AS scenario, o.Category2 AS subScenario1,",
# #         "       o.MSISDN AS contactNumber, c.CampaignParentName AS campaignType, c.CampaignName AS campaignName",
# #         "FROM call_master_out o",
# #         "JOIN ob_campaign c ON o.AllocationId = c.id",
# #         "WHERE o.ClientId = :cid"
# #     ]
# #     params = {"cid": CLIENT_ID}
# #     if campaignType:
# #         base_sql.append("AND c.CampaignParentName = :ctype")
# #         params["ctype"] = campaignType
# #     if campaign:
# #         base_sql.append("AND o.campaign_id = :camp")
# #         params["camp"] = campaign
# #     if allocation:
# #         base_sql.append("AND o.AllocationId = :alloc")
# #         params["alloc"] = allocation
# #     if scenario:
# #         base_sql.append("AND o.Category1 = :scn")
# #         params["scn"] = scenario
# #     if subScenario1:
# #         base_sql.append("AND o.Category2 = :sub1")
# #         params["sub1"] = subScenario1
# #     if subScenario2:
# #         base_sql.append("AND o.Category3 = :sub2")
# #         params["sub2"] = subScenario2
# #     if subScenario3:
# #         base_sql.append("AND o.Category4 = :sub3")
# #         params["sub3"] = subScenario3
# #     if msisdn:
# #         base_sql.append("AND o.MSISDN LIKE :msisdn")
# #         params["msisdn"] = f"%{msisdn}%"
# #     if startDate:
# #         base_sql.append("AND DATE(o.CallDate) >= :sd")
# #         params["sd"] = startDate
# #     if endDate:
# #         base_sql.append("AND DATE(o.CallDate) <= :ed")
# #         params["ed"] = endDate
# #     base_sql.append("ORDER BY o.CallDate DESC LIMIT 100")

# #     sql = text("\n".join(base_sql))
# #     rows = db.execute(sql, params).fetchall()
# #     return [dict(r) for r in rows]


# def normalize_date(date_str: str) -> str:
#     return date_str.strip().split("T")[0] if "T" in date_str else date_str

# def safe_query(db: Session, table_name: str, sql: str, params: dict = None) -> list:
#     """
#     Execute SQL only if table exists. Returns empty list if table is missing.
#     """
#     table_check = db.execute(
#         text("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=:t"),
#         {"t": table_name}
#     ).fetchone()

#     if table_check['cnt'] == 0:
#         return []
#     return db.execute(text(sql), params or {}).fetchall()

# def get_dynamic_fields(db: Session, client_id: int, campaign_id: int):
#     """
#     Fetch dynamic category, capture, and close fields for a client & campaign.
#     """
#     cat_rows = safe_query(db, "ob_cat_masters",
#         "SELECT label FROM ob_cat_masters WHERE Client=:cid AND CampaignId=:camp ORDER BY label ASC",
#         {"cid": client_id, "camp": campaign_id}
#     )
#     cap_rows = safe_query(db, "ob_fields",
#         "SELECT fieldNumber FROM ob_fields WHERE ClientId=:cid AND CampaignId=:camp AND FieldStatus IS NULL ORDER BY Priority ASC",
#         {"cid": client_id, "camp": campaign_id}
#     )
#     close_rows = safe_query(db, "ob_close_field_data",
#         "SELECT fieldNumber FROM ob_close_field_data WHERE ClientId=:cid AND CampaignId=:camp AND FieldStatus IS NULL ORDER BY Priority ASC",
#         {"cid": client_id, "camp": campaign_id}
#     )

#     # Access columns safely
#     category_fields = [f"o.Category{r['label']}" for r in cat_rows]
#     capture_fields = [f"o.Field{r['fieldNumber']}" for r in cap_rows]
#     close_fields = [f"o.CField{r['fieldNumber']}" for r in close_rows]

#     return category_fields, capture_fields, close_fields

# @router.get("/outcalls", response_model=List[Dict])
# def get_outcalls(
#     CLIENT_ID: int = Query(...),
#     campaignType: Optional[str] = None,
#     campaign: Optional[int] = None,
#     allocation: Optional[int] = None,
#     scenario: Optional[str] = None,
#     subScenario1: Optional[str] = None,
#     subScenario2: Optional[str] = None,
#     subScenario3: Optional[str] = None,
#     msisdn: Optional[str] = None,
#     startDate: Optional[str] = None,
#     endDate: Optional[str] = None,
#     db: Session = Depends(get_db4)
# ):
#     """
#     Fully dynamic Outcalls API.
#     - Automatically fetches all fields per client.
#     - Safe: skips missing tables.
#     - Applies all filters dynamically.
#     """

#     # ---------------- STEP 1: Dynamic columns ----------------
#     category_fields, capture_fields, close_fields = get_dynamic_fields(db, CLIENT_ID, campaign or 0)
#     dynamic_columns = ["o.id", "o.SrNo", "o.MSISDN", "o.CallDate"] + category_fields + capture_fields + close_fields

#     # ---------------- STEP 2: Base query ----------------
#     base_sql = [
#         f"SELECT {', '.join(dynamic_columns)},",
#         "       c.CampaignParentName AS campaignType, c.CampaignName AS campaignName",
#         "FROM call_master_out o",
#         "JOIN ob_campaign c ON o.AllocationId = c.id",
#         "WHERE o.ClientId = :cid"
#     ]
#     params = {"cid": CLIENT_ID}

#     # ---------------- STEP 3: Filters ----------------
#     if campaignType:
#         base_sql.append("AND c.CampaignParentName = :ctype"); params["ctype"] = campaignType
#     if campaign:
#         base_sql.append("AND o.CampaignId = :camp"); params["camp"] = campaign
#     if allocation:
#         base_sql.append("AND o.AllocationId = :alloc"); params["alloc"] = allocation
#     if scenario:
#         base_sql.append("AND o.Category1 = :scn"); params["scn"] = scenario
#     if subScenario1:
#         base_sql.append("AND o.Category2 = :sub1"); params["sub1"] = subScenario1
#     if subScenario2:
#         base_sql.append("AND o.Category3 = :sub2"); params["sub2"] = subScenario2
#     if subScenario3:
#         base_sql.append("AND o.Category4 = :sub3"); params["sub3"] = subScenario3
#     if msisdn:
#         base_sql.append("AND o.MSISDN LIKE :msisdn"); params["msisdn"] = f"%{msisdn}%"
#     if startDate:
#         base_sql.append("AND DATE(o.CallDate) >= :sd"); params["sd"] = normalize_date(startDate)
#     if endDate:
#         base_sql.append("AND DATE(o.CallDate) <= :ed"); params["ed"] = normalize_date(endDate)

#     base_sql.append("ORDER BY o.CallDate DESC LIMIT 200")

#     # ---------------- STEP 4: Execute ----------------
#     sql = text("\n".join(base_sql))
#     rows = db.execute(sql, params).fetchall()
#     return [dict(r) for r in rows]


# # ------------------ /download_excel_raw (dynamic sections & rates) ------------------ #
# @router.get("/download_excel_raw", response_model=None)
# def download_excel_raw(
#         client_id: int,
#         from_date: date = Query(...),
#         to_date: date = Query(...),
#         db=Depends(get_db4),
#         db2=Depends(get_db2),
#         db3=Depends(get_db4),
# ):
#     """
#     Generate Excel-compatible HTML dynamically:
#     - fetch client + plan info
#     - detect which sections have data and render them
#     - compute pulses & amounts using plan rates when available
#     """
#     try:
#         # Client info
#         client_result = db.execute(text("""
#             SELECT company_name, reg_office_address1, phone_no, email, auth_person
#             FROM registration_master
#             WHERE company_id = :client_id
#         """), {"client_id": client_id}).fetchone()

#         balance_result = db.execute(text("""
#             SELECT * FROM balance_master
#             WHERE clientId = :client_id
#             LIMIT 1
#         """), {"client_id": client_id}).fetchone()

#         plan_result = None
#         if balance_result and getattr(balance_result, "PlanId", None):
#             plan_result = db.execute(text("""
#                 SELECT * FROM plan_master
#                 WHERE Id = :plan_id
#                 LIMIT 1
#             """), {"plan_id": balance_result.PlanId}).fetchone()

#         # helper for plan rates with fallback
#         def plan_rate(attr, fallback):
#             try:
#                 return float(getattr(plan_result, attr)) if plan_result and hasattr(plan_result, attr) else fallback
#             except Exception:
#                 return fallback

#         # detect data for standard sections by running the queries and include only if rows exist
#         sections = []

#         # INBOUND (vicidial_closer_log)
#         inbound_q = text("""
#             SELECT IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec) AS length_in_sec,
#                    t2.phone_number, t2.call_date, t2.user
#             FROM vicidial_closer_log t2
#             LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
#             WHERE t2.user != 'VDCL'
#               AND DATE(t2.call_date) BETWEEN :from_date AND :to_date
#         """)
#         call_data = db2.execute(inbound_q, {"from_date": from_date, "to_date": to_date}).fetchall()
#         if call_data:
#             sections.append(("INBOUND", call_data, "icb"))

#         # MULTI-LANG INBOUND - detect via campaign parent or specific campaign ids if present in DB
#         # We'll attempt to detect campaigns with parent name 'Multi Language' or 'ML' prefix
#         ml_campaigns = db.execute(text("""
#             SELECT CampaignName FROM ob_campaign
#             WHERE ClientId = :cid AND (CampaignParentName LIKE 'ML%' OR CampaignParentName LIKE '%Multi%')
#         """), {"cid": client_id}).fetchall()
#         ml_campaign_ids = [r[0] for r in ml_campaigns] if ml_campaigns else []
#         if ml_campaign_ids:
#             multilang_q = text(f"""
#                 SELECT IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec) AS length_in_sec,
#                        t2.phone_number, t2.call_date, t2.user
#                 FROM vicidial_closer_log t2
#                 LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
#                 WHERE t2.user != 'VDCL'
#                   AND t2.campaign_id IN :campaigns
#                   AND DATE(t2.call_date) BETWEEN :from_date AND :to_date
#             """)
#             multilang_call_data = db2.execute(multilang_q, {"campaigns": tuple(ml_campaign_ids),
#                                                             "from_date": from_date, "to_date": to_date}).fetchall()
#             if multilang_call_data:
#                 sections.append(("MULTI_LANGUAGE_INBOUND", multilang_call_data, "multilang"))

#         # OUTBOUND (vicidial_log)
#         outbound_q = text("""
#             SELECT (va.talk_sec - va.dead_sec) AS length_in_sec, v.phone_number, v.call_date, v.user
#             FROM vicidial_log v
#             JOIN vicidial_agent_log va ON v.uniqueid = va.uniqueid
#             WHERE (va.talk_sec - va.dead_sec) != 0
#               AND v.user != 'VDAD'
#               AND DATE(v.call_date) BETWEEN :from_date AND :to_date
#         """)
#         outbound_data = db2.execute(outbound_q, {"from_date": from_date, "to_date": to_date}).fetchall()
#         if outbound_data:
#             sections.append(("OUTBOUND", outbound_data, "ocb"))

#         # OUTBOUND ABANDONED (using your existing dialdesk query as fallback)
#         ab_q = text("""
#             SELECT
#                 t2.call_date AS CallDate,
#                 IFNULL(t3.talk_sec, 0) AS TalkSec,
#                 LEFT(t2.phone_number,10) AS PhoneNumber,
#                 t2.user AS Agent,
#                 t2.length_in_sec AS TalkSecRaw
#             FROM vicidial_log t2
#             LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid
#             WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date
#               AND t2.campaign_id = 'dialdesk'
#               AND t2.lead_id IS NOT NULL
#         """)
#         ab_data = db2.execute(ab_q, {"from_date": from_date, "to_date": to_date}).fetchall()
#         if ab_data:
#             sections.append(("OUTBOUND_ABANDONED", ab_data, "abcb"))

#         # SMS / Email / RX from billing_master or rx_log (detect if any rows)
#         sms_q = text("""
#             SELECT DATE_FORMAT(CallDate,'%d %b %y') AS CallDate1, CallDate, CallTime, CallFrom, Unit, AlertTo
#             FROM billing_master
#             WHERE clientId = :client_id
#               AND DedType = 'SMS'
#               AND DATE(CallDate) BETWEEN :from_date AND :to_date
#         """)
#         sms_data = db.execute(sms_q, {"client_id": client_id, "from_date": from_date, "to_date": to_date}).fetchall()
#         if sms_data:
#             sections.append(("SMS", sms_data, "sms"))

#         email_q = text("""
#             SELECT DATE_FORMAT(CallDate,'%d %b %y') AS CallDate1, CallDate, CallTime, CallFrom, Unit
#             FROM billing_master
#             WHERE clientId = :client_id
#               AND DedType = 'Email'
#               AND DATE(CallDate) BETWEEN :from_date AND :to_date
#         """)
#         email_data = db.execute(email_q, {"client_id": client_id, "from_date": from_date, "to_date": to_date}).fetchall()
#         if email_data:
#             sections.append(("EMAIL", email_data, "email"))

#         rx_q = text("""
#             SELECT DATE_FORMAT(call_time,'%d %b %y') AS CallDate1, call_time AS CallDate, TIME(call_time) AS CallTime, 1 AS Unit, source_number AS CallFrom
#             FROM rx_log
#             WHERE clientId = :client_id
#               AND DATE(call_time) BETWEEN :from_date AND :to_date
#         """)
#         rx_data = db3.execute(rx_q, {"client_id": client_id, "from_date": from_date, "to_date": to_date}).fetchall()
#         if rx_data:
#             sections.append(("RX_LOG", rx_data, "rx"))

#         # Totals structure
#         totals = {}
#         rate_map = {
#             'icb': plan_rate('InboundRate', 0.5),
#             'multilang': plan_rate('MultiLangInboundRate', 0.5),
#             'ocb': plan_rate('OutboundRate', 0.5),
#             'abcb': plan_rate('AbandCallRate', 0.5),
#             'sms': plan_rate('SMSRate', 0.2),
#             'email': plan_rate('EmailRate', 0.25),
#             'rx': plan_rate('RXRate', 0.2),
#         }
#         for k in rate_map:
#             totals[k] = {'pulse': 0, 'amount': 0.0, 'talk_time': 0}

#         # Build HTML report dynamically
#         html_parts = []
#         html_parts.append("<html><head><meta http-equiv='Content-Type' content='application/vnd.ms-excel; charset=utf-8' /></head><body>")
#         # header
#         html_parts.append("<table border='0' width='100%'><tr><td align='center'><h2>Billing Statement</h2></td></tr></table>")

#         # client table
#         html_parts.append("<table border='1' cellpadding='4' cellspacing='0'>")
#         html_parts.append("<tr><td><b>Company</b></td><td>{}</td></tr>".format(client_result.company_name if client_result else ''))
#         html_parts.append("<tr><td><b>Address</b></td><td>{}</td></tr>".format(client_result.reg_office_address1 if client_result else ''))
#         html_parts.append("<tr><td><b>Phone</b></td><td>{}</td></tr>".format(client_result.phone_no if client_result else ''))
#         html_parts.append("</table><br />")

#         # render each detected section
#         for (title, rows, key) in sections:
#             html_parts.append(f"<table border='1' cellpadding='3' cellspacing='0' style='margin-bottom:10px; width:100%'>")
#             html_parts.append(f"<tr style='background:#607d8b;color:#fff;'><th colspan='7'>{title}</th></tr>")
#             html_parts.append("<tr><th>Date</th><th>Time</th><th>Call From</th><th>Agent</th><th>Talk Time</th><th>Pulse</th><th>Rate</th></tr>")
#             for r in rows:
#                 # adapt to variety of row column names from different queries
#                 call_date = r.get('call_date') or r.get('CallDate') or r.get('CallDate1') or r.get('CallDate')
#                 call_time = ''
#                 if isinstance(call_date, datetime):
#                     call_date_str = call_date.date()
#                     call_time = call_date.time()
#                 else:
#                     call_date_str = call_date or ''
#                 talk_time = int(r.get('length_in_sec') or r.get('TalkSec') or r.get('TalkSecRaw') or r.get('LengthInSec') or 0)
#                 pulse = (talk_time // 60) + (1 if talk_time % 60 else 0)
#                 rate = rate_map.get(key, 0.0)
#                 amount = pulse * rate

#                 totals[key]['pulse'] += pulse
#                 totals[key]['amount'] += amount
#                 totals[key]['talk_time'] += talk_time

#                 phone = r.get('phone_number') or r.get('PhoneNumber') or r.get('CallFrom') or r.get('source_number') or ''
#                 agent = r.get('user') or r.get('Agent') or ''

#                 html_parts.append(f"<tr><td>{call_date_str}</td><td>{call_time}</td><td>{phone}</td><td>{agent}</td><td>{talk_time}</td><td>{pulse}</td><td>{rate:.2f}</td></tr>")
#             html_parts.append("</table>")

#         # summary table
#         html_parts.append("<table border='1' cellpadding='4' cellspacing='0' style='width:100%'>")
#         html_parts.append("<tr style='background:#607d8b;color:#fff;'><th>Description</th><th>Pulse/Unit</th><th>Rate</th><th>Amount</th></tr>")
#         grand_total = 0.0
#         for k, v in totals.items():
#             rate = rate_map.get(k, 0.0)
#             amount = v['amount']
#             html_parts.append(f"<tr><td>{k.upper()}</td><td>{v['pulse']}</td><td>{rate:.2f}</td><td>{amount:.2f}</td></tr>")
#             grand_total += amount
#         html_parts.append(f"<tr style='font-weight:bold; background-color:#e0e0e0;'><td colspan='3' align='right'>Grand Total</td><td>{grand_total:.2f}</td></tr>")
#         html_parts.append("</table>")

#         html_parts.append("</body></html>")
#         html = "\n".join(html_parts)

#         buffer = BytesIO(html.encode('utf-8'))
#         filename = f"statement_{datetime.now().strftime('%d_%m_%y_%H_%M_%S')}.xls"
#         headers = {
#             "Content-Disposition": f"attachment; filename={filename}",
#             "Pragma": "no-cache",
#             "Expires": "0"
#         }
#         return StreamingResponse(buffer, media_type="application/vnd.ms-excel", headers=headers)

#     except SQLAlchemyError as e:
#         raise FastAPIHTTPException(status_code=500, detail=f"DB error while generating report: {str(e)}")
#     except Exception as e:
#         raise FastAPIHTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# # ------------------ /fields (dynamic dropdowns) ------------------ #
# @router.get("/fields/{client_id}")
# def get_fields_for_client(client_id: int, db: Session = Depends(get_db4)):
#     sql_fields = text("""
#         SELECT id, FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber
#         FROM field_master
#         WHERE ClientId = :client_id AND (FieldStatus IS NULL OR FieldStatus != 'D')
#         ORDER BY Priority ASC
#     """)
#     fields_result = db.execute(sql_fields, {"client_id": client_id})
#     fields = [dict(row) for row in fields_result.mappings().all()]

#     if not fields:
#         raise FastAPIHTTPException(status_code=404, detail="No fields found for this client_id")

#     # collect dropdown values if needed
#     dropdown_field_ids = [f['id'] for f in fields if str(f.get('FieldType','')).lower() == 'dropdown']
#     dropdown_values_map = {}
#     if dropdown_field_ids:
#         sql_dropdown_values = text("""
#             SELECT FieldId, FieldValueName
#             FROM field_master_value
#             WHERE ClientId = :client_id
#               AND FieldId IN :field_ids
#             ORDER BY id ASC
#         """)
#         dropdown_values_result = db.execute(sql_dropdown_values, {"client_id": client_id, "field_ids": tuple(dropdown_field_ids)})
#         for row in dropdown_values_result.mappings().all():
#             dropdown_values_map.setdefault(row['FieldId'], []).append(row['FieldValueName'])

#     # attach options
#     for fld in fields:
#         if str(fld.get('FieldType','')).lower() == 'dropdown':
#             fld['options'] = dropdown_values_map.get(fld['id'], [])

#     return fields


# # ------------------ /call_tag (dynamic insert) ------------------ #
# @router.post("/call_tag/{client_id}")
# async def save_call_master(client_id: int, payload: dict = Body(...), db: Session = Depends(get_db4)):
#     """
#     Map payload keys that match field_master.FieldName -> Field{N}
#     Allow passthrough of common columns if present (MSISDN, Category1..5, CallDate, etc.)
#     """
#     try:
#         # fetch mapping
#         field_query = text("""
#             SELECT FieldName, fieldNumber
#             FROM field_master
#             WHERE ClientId = :client_id AND (FieldStatus IS NULL OR FieldStatus != 'D')
#             ORDER BY fieldNumber
#         """)
#         result = db.execute(field_query, {"client_id": client_id})
#         fields = result.mappings().all()
#         name_to_number = {r['FieldName']: r['fieldNumber'] for r in fields}

#         # build insert mapping
#         field_column_mapping = {}
#         # allow passthrough columns
#         passthrough = {"CallDate","Category1","Category2","Category3","Category4","Category5","MSISDN","CallTime","CallFrom","user","CampaignId","AllocationId","Duration"}
#         for key, val in payload.items():
#             if key in name_to_number:
#                 field_column_mapping[f"Field{name_to_number[key]}"] = val
#             elif key in passthrough:
#                 field_column_mapping[key] = val
#             # else ignore unknown keys to keep safe

#         if not field_column_mapping:
#             raise FastAPIHTTPException(status_code=400, detail="No valid fields found in payload for this client.")

#         # prepare insert
#         columns = ', '.join(["`ClientId`"] + [f"`{col}`" for col in field_column_mapping.keys()])
#         placeholders = ', '.join([":client_id"] + [f":{col}" for col in field_column_mapping.keys()])
#         param_payload = {"client_id": client_id}
#         param_payload.update(field_column_mapping)

#         sql = text(f"INSERT INTO call_master ({columns}) VALUES ({placeholders})")
#         db.execute(sql, param_payload)
#         db.commit()
#         return {"message": "Data saved successfully."}
#     except SQLAlchemyError as e:
#         db.rollback()
#         raise FastAPIHTTPException(status_code=500, detail=f"DB error on insert: {str(e)}")
#     except Exception as e:
#         db.rollback()
#         raise FastAPIHTTPException(status_code=500, detail=f"Error on insert: {str(e)}")




class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"



CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GRANT_TYPE = os.getenv("GRANT_TYPE")



@router.post("/oauth2/token", response_model=TokenResponse)
def get_access_token(
        client_id: str = Form(...),
        client_secret: str = Form(...),
        grant_type: str = Form(...),
):
    if (
            client_id != CLIENT_ID or
            client_secret != CLIENT_SECRET or
            grant_type != GRANT_TYPE
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": client_id})
    return TokenResponse(access_token=token)




class IvrCreate(BaseModel):
    contactNumber: str
    callingDate: date
    callingTime: time
    lastName: str
    City: str
    Street: str
    State: str
    PostalCode: str
    Email: EmailStr
    Description: Optional[str] = None
    expectedCapacity: Optional[str] = None
    Company: Optional[str] = None
    dispositionItem: Optional[str] = None
    recordingLink: Optional[str] = None


# @router.post("/ivrlead/callCenter/Create")
# def create_user(payload: IvrCreate, db: Session = Depends(get_db4), client_id: str = Depends(verify_token)):
#     insert_query = text("""
#     INSERT INTO call_master (
#         Field1, Field2, Field3, Field4, Field5, Field6, Field7,
#         Field8, Field9, Field10, Field11, Field12, Field13, Field14, Field26
#     ) VALUES (
#         :Field1, :Field2, :Field3, :Field4, :Field5, :Field6, :Field7,
#         :Field8, :Field9, :Field10, :Field11, :Field12, :Field13, :Field14, :Field26
#     )
# """)
#     db.execute(insert_query, {
#         "Field1": payload.contactNumber,
#         "Field2": payload.callingDate,
#         "Field3": payload.callingTime,
#         "Field4": payload.lastName,
#         "Field5": payload.City,
#         "Field6": payload.Street,
#         "Field7": payload.State,
#         "Field8": payload.PostalCode,
#         "Field9": payload.Email,
#         "Field10": payload.Description,
#         "Field11": payload.expectedCapacity,
#         "Field12": payload.Company,
#         "Field13": payload.dispositionItem,
#         "Field14": payload.recordingLink,
#         "Field26": True,
#     })
#     db.commit()
#
#     result = db.execute(text("SELECT LAST_INSERT_ID()"))
#     record_id = result.scalar()
#
#     response = [
#         f"Lead ID: {payload.lastName}",
#         f"Record ID: {record_id}",
#         "Record Successfully Updated."
#     ]
#     return response


# @router.post("/ivrlead/callCenter/Create")
# def create_user(
#     payload: dict,   # accept raw JSON since fields vary
#     db: Session = Depends(get_db4),
#     client_id: str = Depends(verify_token)
# ):
#     # 1. Fetch dynamic field mapping for this client
#     query = text("""
#         SELECT id, FieldName
#         FROM field_master
#         WHERE ClientId = :client_id
#     """)
#     rows = db.execute(query, {"client_id": client_id}).fetchall()
#
#     if not rows:
#         raise HTTPException(status_code=400, detail="No field mapping found for this client")
#
#     # 2. Build insert dict dynamically
#     insert_data = {}
#     for row in rows:
#         id = row.id   # like "Field1"
#         FieldName = row.FieldName  # like "Mobile Number"
#
#         # match with payload key (ensure payload uses same naming convention)
#         if FieldName in payload:
#             insert_data[id] = payload[FieldName]
#         else:
#             insert_data[id] = None  # optional
#
#     # Add any fixed fields (like Field26)
#     insert_data["Field26"] = True
#
#     # 3. Build SQL dynamically
#     columns = ", ".join(insert_data.keys())
#     values = ", ".join([f":{k}" for k in insert_data.keys()])
#     insert_query = text(f"""
#         INSERT INTO call_master ({columns})
#         VALUES ({values})
#     """)
#
#     db.execute(insert_query, insert_data)
#     db.commit()
#
#     # 4. Return record_id
#     result = db.execute(text("SELECT LAST_INSERT_ID()"))
#     record_id = result.scalar()
#
#     return {
#         "RecordID": record_id,
#         "InsertedFields": list(insert_data.keys())
#     }



def generate_dynamic_model(client_id: str, db: Session):
    """
    Fetch field_master for client_id and generate Pydantic model
    """
    query = text("SELECT FieldName FROM field_master WHERE ClientId = :client_id")
    rows = db.execute(query, {"client_id": client_id}).fetchall()

    if not rows:
        raise Exception(f"No fields found for ClientId={client_id}")

    # Build dict for create_model
    fields = {
        row.FieldName.replace(" ", "_"): (Optional[str], None)  # optional string fields
        for row in rows
    }

    # Dynamically create model class
    return create_model(f"IvrCreate_{client_id}", **fields)


# Generate model once at startup for a specific client
# (for multi-client setup, you could generate multiple models)
def get_dynamic_model():
    with next(get_db4()) as db:
        return generate_dynamic_model("293", db)   # replace with actual client_id


# Cache the model so it's not recreated every request
IvrCreate = get_dynamic_model()


def normalize(name: str) -> str:
    return name.strip().replace(" ", "_").replace("/", "_").replace(".", "").lower()


@router.post("/ivrlead/callCenter/Create")
def create_user(
    payload: IvrCreate,  # dynamic model used here
    db: Session = Depends(get_db4),
    client_id: str = Depends(lambda: "293")  # example token decode
):
    query = text("SELECT fieldNumber, FieldName FROM field_master WHERE ClientId = :client_id")
    rows = db.execute(query, {"client_id": client_id}).fetchall()

    if not rows:
        raise HTTPException(status_code=400, detail="No field mapping found for this client")

    insert_data = {}
    payload_dict = {normalize(k): v for k, v in payload.dict().items()}

    for row in rows:
        field_no = f"Field{row.fieldNumber}"   # adjust if id is numeric index
        field_name = normalize(row.FieldName)
        insert_data[field_no] = payload_dict.get(field_name)

    insert_data["Field40"] = True

    columns = ", ".join(insert_data.keys())
    values = ", ".join([f":{k}" for k in insert_data.keys()])
    insert_query = text(f"INSERT INTO call_master ({columns}) VALUES ({values})")

    db.execute(insert_query, insert_data)
    db.commit()

    result = db.execute(text("SELECT LAST_INSERT_ID()"))
    record_id = result.scalar()

    return {
        "RecordID": record_id,
        "InsertedFields": list(insert_data.keys())
    }
