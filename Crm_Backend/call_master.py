# Crm_Backend/call_master.py
from http.client import HTTPException
from io import BytesIO

from fastapi import APIRouter, Query, Depends
from sqlalchemy import text
from typing import List, Dict, Optional, Any

from starlette.responses import StreamingResponse

from schemas import *
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


from database import get_engine, get_engine2, SessionLocal2, get_db, get_db2, get_db3

router = APIRouter(tags=["Call Master"])

@router.get("/call-master/{client_id}", response_model=List[Dict])
def get_call_master_data(
    client_id: int,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    Category1: Optional[str] = Query(None),
    Category2: Optional[str] = Query(None),
    Category3: Optional[str] = Query(None),
    Category4: Optional[str] = Query(None),
    Category5: Optional[str] = Query(None),
):
    engine = get_engine()
    with engine.connect() as conn:
        # Step 1: Fetch field mappings
        field_meta_query = """
            SELECT fieldNumber, FieldName 
            FROM field_master 
            WHERE client_id = :client_id 
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
        columns += ["CallDate", "Category1", "Category2", "Category3", "Category4", "Category5"]

        # Step 2: WHERE clause setup
        where_clauses = ["client_id = :client_id"]
        params = {"client_id": client_id}

        if from_date:
            where_clauses.append("CallDate >= :from_date")
            params["from_date"] = from_date
        if to_date:
            where_clauses.append("CallDate <= :to_date")
            params["to_date"] = to_date

        # Optional category filters (OR inside group)
        category_conditions = []
        for i, val in enumerate([Category1, Category2, Category3, Category4, Category5], start=1):
            if val:
                category_conditions.append(f"Category{i} = :Category{i}")
                params[f"Category{i}"] = val

        if category_conditions:
            where_clauses.append(f"({' OR '.join(category_conditions)})")

        where_clause = " AND ".join(where_clauses)
        select_cols = ", ".join(columns)

        # Step 3: Execute final query
        query = f"SELECT {select_cols} FROM call_master WHERE {where_clause}"
        result = conn.execute(text(query), params).mappings().all()

        # Step 4: Format response
        response = []
        for row in result:
            record = {}
            for fnum, label in field_map.items():
                record[label] = row.get(f"field{fnum}")
            record.update({
                "CallDate": row.get("CallDate"),
                "Category1": row.get("Category1"),
                "Category2": row.get("Category2"),
                "Category3": row.get("Category3"),
                "Category4": row.get("Category4"),
                "Category5": row.get("Category5"),
            })
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



# CLIENT_ID = 301  # replace with real auth-based value

@router.get("/types", response_model=List[TypeItem])
def get_types(
        CLIENT_ID: int = Query(...), db: Session = Depends(get_db3)):
    sql = text("""
        SELECT DISTINCT CampaignParentName AS id,
               CampaignParentName AS name
        FROM ob_campaign
        WHERE ClientId = :cid AND CampaignStatus = 'A'
        ORDER BY CampaignParentName
    """)
    rows = db.execute(sql, {"cid": CLIENT_ID}).fetchall()
    return [dict(r) for r in rows]

@router.get("/campaigns", response_model=List[CampaignItem])
def get_campaigns(
        CLIENT_ID: int = Query(...), type: str = Query(...), db: Session = Depends(get_db3)):
    sql = text("""
        SELECT id, CampaignName
        FROM ob_campaign
        WHERE ClientId = :cid
          AND CampaignParentName = :type
          AND CampaignStatus = 'A'
    """)
    rows = db.execute(sql, {"cid": CLIENT_ID, "type": type}).fetchall()
    return [dict(r) for r in rows]

@router.get("/allocations", response_model=List[AllocationItem])
def get_allocations(
        CLIENT_ID: int = Query(...), campaign: int = Query(...), db: Session = Depends(get_db3)):
    sql = text("""
        SELECT id, AllocationName
        FROM ob_allocation_name
        WHERE ClientId = :cid
          AND CampaignId = :camp
    """)
    rows = db.execute(sql, {"cid": CLIENT_ID, "camp": campaign}).fetchall()
    return [dict(r) for r in rows]

@router.get("/outcalls", response_model=List[OutcallItem])
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
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    db: Session = Depends(get_db3)
):
    base_sql = [
        "SELECT o.id, o.Category1 AS scenario, o.Category2 AS subScenario1,",
        "       o.MSISDN AS contactNumber, c.CampaignParentName AS campaignType, c.CampaignName AS campaignName",
        "FROM call_master_out o",
        "JOIN ob_campaign c ON o.AllocationId = c.id",
        "WHERE o.ClientId = :cid"
    ]
    params = {"cid": CLIENT_ID}
    if campaignType:
        base_sql.append("AND c.CampaignParentName = :ctype")
        params["ctype"] = campaignType
    if campaign:
        base_sql.append("AND o.campaign_id = :camp")
        params["camp"] = campaign
    if allocation:
        base_sql.append("AND o.AllocationId = :alloc")
        params["alloc"] = allocation
    if scenario:
        base_sql.append("AND o.Category1 = :scn")
        params["scn"] = scenario
    if subScenario1:
        base_sql.append("AND o.Category2 = :sub1")
        params["sub1"] = subScenario1
    if subScenario2:
        base_sql.append("AND o.Category3 = :sub2")
        params["sub2"] = subScenario2

    if subScenario3:
        base_sql.append("AND o.Category4 = :sub3")
        params["sub3"] = subScenario3
    if msisdn:
        base_sql.append("AND o.MSISDN LIKE :msisdn")
        params["msisdn"] = f"%{msisdn}%"
    if startDate:
        base_sql.append("AND DATE(o.CallDate) >= :sd")
        params["sd"] = startDate
    if endDate:
        base_sql.append("AND DATE(o.CallDate) <= :ed")
        params["ed"] = endDate
    base_sql.append("ORDER BY o.CallDate DESC LIMIT 100")

    sql = text("\n".join(base_sql))
    rows = db.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/download_excel_raw")
def download_excel_raw(
        client_id: int,
        from_date: date = Query(...),
        to_date: date = Query(...),
        db=Depends(get_db),
        db2=Depends(get_db2),
        db3=Depends(get_db3),
):
    # Step 1: Client Info
    client_result = db.execute(text("""
        SELECT company_name, reg_office_address1, phone_no, email, auth_person
        FROM registration_master
        WHERE company_id = :client_id
    """), {"client_id": client_id}).fetchone()

    balance_result = db.execute(text("""
        SELECT * FROM balance_master
        WHERE client_id = :client_id
        LIMIT 1
    """), {"client_id": client_id}).fetchone()

    plan_result = None
    if balance_result and balance_result.PlanId:
        plan_result = db.execute(text("""
            SELECT * FROM plan_master
            WHERE Id = :plan_id
            LIMIT 1
        """), {"plan_id": balance_result.PlanId}).fetchone()

    used_amount = sum([
        balance_result[key] if key in balance_result and balance_result[key] else 0
        for key in [
            "TinAmount", "TinAmountNight", "TouAmount", "TMinAmount",
            "TMouAmount", "TvfAmount", "TsmAmount", "TemAmount",
            "TivAmount", "TWhatsAppAmount", "TBoatAmount"
        ]
    ]) if balance_result else 0

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
          AND DATE(t2.call_date) BETWEEN :from_date AND :to_date
    """), {"from_date": from_date, "to_date": to_date}).fetchall()

    multilang_call_data = db2.execute(text(f"""
        SELECT 
            IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec) AS length_in_sec,
            t2.phone_number,
            t2.call_date,
            t2.user
        FROM vicidial_closer_log t2
        LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
        WHERE t2.user != 'VDCL'
          AND t2.campaign_id IN ('ML01', 'ML02', 'ML03')  -- replace with your actual multi-language campaign_ids
          AND DATE(t2.call_date) BETWEEN :from_date AND :to_date
    """), {"from_date": from_date, "to_date": to_date}).fetchall()

    # --- OUTBOUND (Vicidial Log) Section ---
    outbound_data = db2.execute(text(f"""
            SELECT 
                (va.talk_sec - va.dead_sec) AS length_in_sec,
                v.phone_number,
                v.call_date,
                v.user
            FROM vicidial_log v
            JOIN vicidial_agent_log va ON v.uniqueid = va.uniqueid
            WHERE (va.talk_sec - va.dead_sec) != 0
              AND v.user != 'VDAD'
              AND DATE(v.call_date) BETWEEN :from_date AND :to_date
        """), {"client_id": client_id, "from_date": from_date, "to_date": to_date}).fetchall()

    query = text("""
                SELECT 
                    t2.list_id,
                    t2.call_date AS CallDate,
                    FROM_UNIXTIME(t2.start_epoch) AS StartTime,
                    FROM_UNIXTIME(t2.end_epoch) AS Endtime,
                    LEFT(t2.phone_number,10) AS PhoneNumber,
                    t2.user AS Agent,
                    vu.full_name as full_name,
                    IF(t2.user='VDAD','Not Connected','Connected') calltype,
                    t2.status as status,
                    IF(t2.list_id='998','Mannual','Auto') dialmode,
                    t2.campaign_id as campaign_id,
                    t2.lead_id as lead_id,
                    t2.length_in_sec AS LengthInSec,
                    SEC_TO_TIME(t2.length_in_sec) AS LengthInMin,
                    t2.length_in_sec AS CallDuration,
                    t2.status AS CallStatus,
                    t3.pause_sec AS PauseSec,
                    t3.wait_sec AS WaitSec,
                    t3.talk_sec AS TalkSec,
                    t3.dispo_sec AS DispoSec
                FROM vicidial_log t2
                LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid
                LEFT JOIN vicidial_users vu ON t2.user = vu.user
                WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date
                  AND t2.campaign_id = 'dialdesk'
                  AND t2.lead_id IS NOT NULL
            """)

    ab_data = db2.execute(query, {"from_date": from_date, "to_date": to_date}).fetchall()

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
    }).fetchall()

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
    }).fetchall()

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
    }).fetchall()

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
    total_rate7 = 0.0

    # Step 3: Build HTML for Excel
    html = f"""
    <html><head><meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=utf-8" /></head><body>
    <table border='0' width='600' cellpadding='2' cellspacing='2'>
        <tr><td colspan='6' align='center'>
            <img src='http://dialdesk.co.in/dialdesk/app/webroot/billing_statement/logo.jpg' height='80'><br>
            <strong style='font-size:16pt;'>A UNIT OF ISPARK DATA CONNECT PVT LTD</strong>
        </td></tr>
    </table>

    <table border='1' width='600' cellpadding='2' cellspacing='2'>
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

    <table border='1' width='600' cellpadding='2' cellspacing='2'>
        <tr><td colspan='5' style='font-size:15pt;background-color:#607d8b;color:#fff;'>Plan Details</td></tr>
        <tr><th>Plan Name</th><th>Start Date</th><th>End Date</th><th>Validity</th><th>Used</th></tr>
        <tr>
            <td>{plan_result.PlanName if plan_result else ''}</td>
            <td>{balance_result.start_date if balance_result else ''}</td>
            <td>{balance_result.end_date if balance_result else ''}</td>
            <td>{f"{plan_result.RentalPeriod} {plan_result.PeriodType}" if plan_result else ''}</td>
            <td>{used_amount}</td>
        </tr>
    </table>

    <table><tr><td>&nbsp;</td></tr></table>



    <table border='1' width='600' cellpadding='2' cellspacing='2'>
        <tr><td colspan='7' style='font-size:15pt;background-color:#607d8b;color:#fff;'>{client_result.company_name if client_result else ''} (INBOUND)</td></tr>
        <tr><th>Date</th><th>Time</th><th>Call From</th><th>Agent</th><th>Talk Time</th><th>Pulse</th><th>Rate</th></tr>
    """

    for row in call_data:
        dt = row.call_date
        talk_time = int(row.length_in_sec)
        pulse = (talk_time // 60) + (1 if talk_time % 60 else 0)
        rate = pulse * 0.5  # Replace with actual rate

        total_talk_time += talk_time
        total_pulse += pulse
        total_rate += rate  # Example rate, replace with actual
        html += f"<tr><td>{dt.date()}</td><td>{dt.time()}</td><td>{row.phone_number}</td><td>{row.user}</td><td>{talk_time}</td><td>{pulse}</td><td>{rate:.2f}</td></tr>"

    html += f"""
        <tr style='font-weight:bold; background-color:#e0e0e0;'>
            <td colspan='4' align='right'>Total</td>
            <td>{total_talk_time}</td>
            <td>{total_pulse}</td>
            <td>{total_rate:.2f}</td>
        </tr>
    """

    html += """
        <table><tr><td>&nbsp;</td></tr></table>

        <table border='1' width='600' cellpadding='2' cellspacing='2'>
            <tr><td colspan='7' style='font-size:15pt;background-color:#607d8b;color:#fff;'>""" + \
            f"""{client_result.company_name if client_result else ''} (Multi Language INBOUND)</td></tr>
            <tr><th>Date</th><th>Time</th><th>Call From</th><th>Agent</th><th>Talk Time</th><th>Pulse</th><th>Rate</th></tr>
        """

    for row in multilang_call_data:
        dt = row.call_date
        talk_time = int(row.length_in_sec)
        pulse = (talk_time // 60) + (1 if talk_time % 60 else 0)
        rate = pulse * 0.5  # Adjust if multi-lang rate is different

        total_talk_time2 += talk_time
        total_pulse2 += pulse
        total_rate2 += rate

        html += f"<tr><td>{dt.date()}</td><td>{dt.time()}</td><td>{row.phone_number}</td><td>{row.user}</td><td>{talk_time}</td><td>{pulse}</td><td>{rate:.2f}</td></tr>"

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='4' align='right'>Total</td>
                <td>{total_talk_time2}</td>
                <td>{total_pulse2}</td>
                <td>{total_rate2:.2f}</td>
            </tr>
        """

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

    for row in outbound_data:
        dt = row.call_date
        talk_time = int(row.length_in_sec)
        pulse = (talk_time // 60) + (1 if talk_time % 60 else 0)
        rate = pulse * 0.5  # You can replace with actual per-minute rate

        total_talk_time3 += talk_time
        total_pulse3 += pulse
        total_rate3 += rate

        html += f"<tr><td>{dt.date()}</td><td>{dt.time()}</td><td>{row.phone_number}</td><td>{row.user}</td><td>{talk_time}</td><td>{pulse}</td><td>{rate:.2f}</td></tr>"

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='4' align='right'>Total</td>
                <td>{total_talk_time3}</td>
                <td>{total_pulse3}</td>
                <td>{total_rate3:.2f}</td>
            </tr>
        """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="7" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (OUTBOUND ABANDCALL)</td></tr>
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

    for row in ab_data:
        call_date = row.CallDate
        talk_time = int(row.TalkSec) if row.TalkSec else 0
        pulse = (talk_time // 60) + (1 if talk_time % 60 else 0)
        rate = pulse * 0.5  # You can replace this with actual billing logic

        total_talk_time4 += talk_time
        total_pulse4 += pulse
        total_rate4 += rate

        html += f"""
            <tr>
                <td>{call_date.date()}</td>
                <td>{call_date.time()}</td>
                <td>{row.PhoneNumber}</td>
                <td>{row.Agent}</td>
                <td>{talk_time}</td>
                <td>{pulse}</td>
                <td>{rate:.2f}</td>
            </tr>
        """

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='4' align='right'>Total</td>
                <td>{total_talk_time4}</td>
                <td>{total_pulse4}</td>
                <td>{total_rate4:.2f}</td>
            </tr>
        """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="7" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (SMS)</td></tr>
            <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Call From</th>
                <th>Alert To</th>
                <th>Pulse</th>
                <th>Rate</th>
            </tr>
    """

    for row in sms_data:
        pulse = int(row.Unit) if row.Unit else 0
        rate = pulse * 0.2  # Set your actual rate here

        total_pulse5 += pulse
        total_rate5 += rate

        html += f"""
            <tr>
                <td>{row.CallDate1}</td>
                <td>{row.CallTime}</td>
                <td>{row.CallFrom}</td>
                <td>{row.AlertTo}</td>
                <td>{pulse}</td>
                <td>{rate:.2f}</td>
            </tr>
        """

    html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='4' align='right'>Total</td>
                <td>{total_pulse5}</td>
                <td>{total_rate5:.2f}</td>
            </tr>
        """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="6" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (EMAIL)</td></tr>
            <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Call From</th>
                <th>Pulse</th>
                <th>Rate</th>
            </tr>
    """

    for row in email_data:
        pulse = int(row.Unit) if row.Unit else 0
        rate = pulse * 0.25  # Replace with actual per-email rate

        total_pulse6 += pulse
        total_rate6 += rate

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
                <td colspan='4' align='right'>Total</td>
                <td>{total_pulse6}</td>
                <td>{total_rate6:.2f}</td>
            </tr>
        """

    html += f"""
        <table><tr><td>&nbsp;</td></tr></table>
        <table border="1" width="600" cellpadding="2" cellspacing="2" style="font-size:11pt;">
            <tr><td colspan="6" style="font-size:15pt;background-color:#607d8b;color:#fff;">{client_result.company_name if client_result else ''} (RX LOG)</td></tr>
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
        rate = pulse * 0.20  # Adjust this rate as per your business logic

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
                <td colspan='4' align='right'>Total</td>
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
    rate_rx = plan_result.RXRate if plan_result and hasattr(plan_result, "RXRate") else 0.2

    # === 2️⃣ Recalculate final amounts ===
    amount_icb = total_pulse * rate_icb
    amount_multilang = total_pulse2 * rate_multilang
    amount_ocb = total_pulse3 * rate_ocb
    amount_abcb = total_pulse4 * rate_abcb
    amount_sms = total_pulse5 * rate_sms
    amount_email = total_pulse6 * rate_email
    amount_rx = total_pulse7 * rate_rx

    grand_total = amount_icb + amount_multilang + amount_ocb + amount_abcb + amount_sms + amount_email + amount_rx

    # === 3️⃣ Append Summary Table ===
    html += f"""
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
        <tr><td>ICB</td><td>{total_pulse}</td><td>{rate_icb:.2f}</td><td>{amount_icb:.2f}</td></tr>
        <tr><td>ICB Multi Language</td><td>{total_pulse2}</td><td>{rate_multilang:.2f}</td><td>{amount_multilang:.2f}</td></tr>
        <tr><td>OCB</td><td>{total_pulse3}</td><td>{rate_ocb:.2f}</td><td>{amount_ocb:.2f}</td></tr>
        <tr><td>ABCB</td><td>{total_pulse4}</td><td>{rate_abcb:.2f}</td><td>{amount_abcb:.2f}</td></tr>
        <tr><td>SMS</td><td>{total_pulse5}</td><td>{rate_sms:.2f}</td><td>{amount_sms:.2f}</td></tr>
        <tr><td>Email</td><td>{total_pulse6}</td><td>{rate_email:.2f}</td><td>{amount_email:.2f}</td></tr>
        <tr><td>RX/IVR</td><td>{total_pulse7}</td><td>{rate_rx:.2f}</td><td>{amount_rx:.2f}</td></tr>
        <tr style='font-weight:bold; background-color:#e0e0e0;'>
            <td colspan='3' align='right'>Grand Total</td>
            <td>{grand_total:.2f}</td>
        </tr>
    </table>
    """


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



