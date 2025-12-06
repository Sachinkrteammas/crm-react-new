from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from math import ceil
from datetime import datetime,timedelta
from decimal import Decimal, ROUND_HALF_UP
from database import get_db2, get_db4   # adjust if your import path differs

router = APIRouter()





def process_single_date(company_id: int, billing_date: str, db, db2):
    """Runs your complete existing daily billing logic for ONE DATE."""
    request = BillingDailyRequest(company_id=company_id, billing_date=billing_date)
    return compute_ib_consumption(request, db=db, db2=db2)


class BillingRangeRequest(BaseModel):
    company_id: int
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD


@router.post("/compute_ib_consumption_range")
def compute_ib_consumption_range(
    request: BillingRangeRequest,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    # Convert to date objects
    try:
        start = datetime.strptime(request.start_date, "%Y-%m-%d").date()
        end = datetime.strptime(request.end_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    if end < start:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    # Loop through dates
    results = []
    current = start
    while current <= end:
        date_str = current.strftime("%Y-%m-%d")

        try:
            response = process_single_date(
                company_id=request.company_id,
                billing_date=date_str,
                db=db,
                db2=db2
            )
            results.append(response)
        except Exception as e:
            # log error but continue other days
            results.append({
                "date": date_str,
                "status": "failed",
                "error": str(e)
            })

        current += timedelta(days=1)

    return {
        "client_id": request.company_id,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "processed_days": len(results),
        "details": results
    }









class BillingDailyRequest(BaseModel):
    company_id: int
    billing_date: str  # YYYY-MM-DD

def to_decimal(x, places=2):
    d = Decimal(x if x is not None else 0)
    q = Decimal(10) ** -places
    return d.quantize(q, rounding=ROUND_HALF_UP)


@router.post("/compute_ib_consumption")
def compute_ib_consumption(
    request: BillingDailyRequest,
    db: Session = Depends(get_db4),    # main DB
    db2: Session = Depends(get_db2)    # vicidial DB
):
    # 1) get campaigns for company
    campaign_q = text("SELECT campaignid FROM registration_master WHERE company_id = :company_id LIMIT 1")
    campaign_row = db.execute(campaign_q, {"company_id": request.company_id}).mappings().fetchone()
    if not campaign_row or not campaign_row.get("campaignid"):
        raise HTTPException(status_code=404, detail="Company / campaign not found")

    # --- CLEAN CAMPAIGN LIST ---
    raw_campaign = campaign_row["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]
    print("RAW campaign_list =", campaign_list)

    # # --- VALIDATE CAMPAIGNS ONLY FOR OUTBOUND ---
    # valid_campaigns_sql = text("""
    #     SELECT DISTINCT campaign_id
    #     FROM vicidial_log
    #     WHERE campaign_id IN :camps
    # """)

    # valid_rows = db2.execute(valid_campaigns_sql, {"camps": tuple(campaign_list)}).fetchall()
    # out_campaign_list = [row[0] for row in valid_rows]

    # print("VALID OUTBOUND CAMPAIGNS =", out_campaign_list)

    # if not out_campaign_list:
    #     print("⚠ No outbound campaign matched. Outbound will be zero.")

    # 2) fetch balance_master and plan_master
    bal_q = text("SELECT * FROM balance_master WHERE clientId = :client_id LIMIT 1")
    bal_row = db.execute(bal_q, {"client_id": request.company_id}).mappings().fetchone()
    if not bal_row or not bal_row.get("PlanId"):
        raise HTTPException(status_code=404, detail="No balance/plan found for this client")

    plan_q = text("SELECT * FROM plan_master WHERE Id = :plan_id LIMIT 1")
    plan_row = db.execute(plan_q, {"plan_id": bal_row["PlanId"]}).mappings().fetchone()
    if not plan_row:
        raise HTTPException(status_code=404, detail="Plan master entry not found")

    # parse plan values (with sensible defaults)
    try:
        ib_pulse_sec = float(plan_row.get("pulse_day_shift") or 60)
    except:
        ib_pulse_sec = 60.0
    try:
        ibn_pulse_sec = float(plan_row.get("pulse_night_shift") or ib_pulse_sec)
    except:
        ibn_pulse_sec = ib_pulse_sec

    try:
        ob_pulse_sec = float(plan_row.get("pulse_outbound_call_shift") or 60)
    except:
        ob_pulse_sec = 60.0

    try:
        ib_pulse_rate = Decimal(plan_row.get("rate_per_pulse_day_shift") or 0)
    except:
        ib_pulse_rate = Decimal(0)
    try:
        ibn_pulse_rate = Decimal(plan_row.get("rate_per_pulse_night_shift") or 0)
    except:
        ibn_pulse_rate = Decimal(0)
    try:
        ob_pulse_rate = Decimal(plan_row.get("rate_per_pulse_outbound_call_shift") or 0)
    except:
        ob_pulse_rate = Decimal(0)

    # plan-level flat/charge fields (kept same names as PHP)
    ib_charge_plan = Decimal(plan_row.get("InboundCallCharge") or 0)
    ibn_charge_plan = Decimal(plan_row.get("InboundCallChargeNight") or 0)
    ob_charge_plan = Decimal(plan_row.get("OutboundCallCharge") or 0)

    # first minute logic (match PHP 'Enable' exactly)
    first_minute_enabled = (str(plan_row.get("first_minute", "")).lower() == "enable")
    ifmp = ceil(60.0 / ib_pulse_sec) if ib_pulse_sec > 0 else 1
    ifmp_n = ceil(60.0 / ibn_pulse_sec) if ibn_pulse_sec > 0 else 1
    ofmp = ceil(60.0 / ob_pulse_sec) if ob_pulse_sec > 0 else 1
    ob_first_min = first_minute_enabled  # same as PHP's $ob_first_min

    billing_date = request.billing_date

    # 3) inbound query (vicidial_closer_log left join vicidial_agent_log)
    inbound_sql = text("""
        SELECT
            IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec) AS length_in_sec,
            t2.phone_number,
            t2.call_date
        FROM vicidial_closer_log t2
        LEFT JOIN vicidial_agent_log t3
          ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
        WHERE t2.user != 'VDCL'
          AND t2.campaign_id IN :campaigns
          AND DATE(t2.call_date) = :last_date
    """)
    vic_rows = db2.execute(inbound_sql, {"campaigns": tuple(campaign_list), "last_date": billing_date}).mappings().fetchall()

    debug_sql = text("""
        SELECT DISTINCT campaign_id 
        FROM vicidial_log
        WHERE DATE(call_date) = :last_date
    """)

    debug_rows = db2.execute(debug_sql, {"last_date": billing_date}).mappings().fetchall()
    print("DEBUG OUTBOUND CAMPAIGNS =", debug_rows)

    ib_pulse = 0
    ib_secs = 0
    ib_total = Decimal(0)

    ibn_pulse = 0
    ibn_secs = 0
    ibn_total = Decimal(0)

    ob_pulse = 0
    ob_secs = 0
    ob_total = Decimal(0)

    for r in vic_rows:
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
            convrt_pulse = duration / ibn_pulse_sec if ibn_pulse_sec > 0 else duration
            if first_minute_enabled:
                if convrt_pulse > ifmp_n:
                    subsequent = convrt_pulse - ifmp_n
                    call_pulse = int(ifmp_n + ceil(subsequent))
                else:
                    call_pulse = int(ifmp_n)
            else:
                call_pulse = int(ceil(duration / ibn_pulse_sec)) if ibn_pulse_sec > 0 else int(ceil(duration))
            call_rate = Decimal(call_pulse) * ibn_pulse_rate
            # call_rate = (Decimal(call_pulse) * ibn_pulse_rate).quantize(Decimal("0.0001"))
            ibn_pulse += call_pulse
            ibn_secs += call_pulsesec    # PHP increments by call_pulsesec which is 0
            ibn_total += call_rate
        else:
            convrt_pulse = duration / ib_pulse_sec if ib_pulse_sec > 0 else duration
            if first_minute_enabled:
                if convrt_pulse > ifmp:
                    subsequent = convrt_pulse - ifmp
                    call_pulse = int(ifmp + ceil(subsequent))
                else:
                    call_pulse = int(ifmp)
            else:
                call_pulse = int(ceil(duration / ib_pulse_sec)) if ib_pulse_sec > 0 else int(ceil(duration))
            call_rate = Decimal(call_pulse) * ib_pulse_rate
            ib_pulse += call_pulse
            ib_secs += call_pulsesec    # PHP increments by call_pulsesec which is 0
            ib_total += call_rate

    # -----------------------------
    # STEP 2: Compute abandoned outbound (fixed)
    # -----------------------------
    sql_get_aband = text("""
        SELECT LEFT(PhoneNo,10) AS PhoneNumber, DATE(Callbackdate) AS CallbackDate
        FROM aband_call_master
        WHERE clientid = :client_id
        AND DATE(Callbackdate) = :billing_date
        GROUP BY 1,2
    """)
    aband_rows = db.execute(sql_get_aband, {"client_id": request.company_id, "billing_date": billing_date}).fetchall()
    print("####",aband_rows)
    print("company_id =", request.company_id)
    print("billing_date =", billing_date)


    # Prepare the direct IN string just like working API
    phone_date_pairs = [(r.PhoneNumber, r.CallbackDate) for r in aband_rows]
    print("@@@@",phone_date_pairs)
    if phone_date_pairs:
        in_values = ", ".join(f"('{pn}','{dt}')" for pn, dt in phone_date_pairs)

        sql_vicidial = text(f"""
            SELECT t2.list_id,
                DATE(t2.call_date) AS CallDate,
                TIME(FROM_UNIXTIME(t2.start_epoch)) AS StartTime,
                LEFT(t2.phone_number,10) AS PhoneNumber,
                t2.`user` AS Agent,
                t3.talk_sec AS TalkSec
            FROM asterisk.vicidial_log t2
            LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid
            WHERE DATE(t2.call_date) = :billing_date
            AND t2.campaign_id = 'dialdesk'
            AND t2.lead_id IS NOT NULL
            AND (LEFT(t2.phone_number,10), DATE(t2.call_date)) IN ({in_values})
        """)

        vicidial_rows = db2.execute(sql_vicidial, {"billing_date": billing_date}).mappings().fetchall()
        for call in vicidial_rows:
            talk_sec = float(call.get("TalkSec") or 0)
            if talk_sec <= 0:
                continue

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

    ob_total = to_decimal(ob_total, places=2)



    # -----------------------------------------------------------
    # STEP 1.5 — NORMAL OUTBOUND BILLING (1-day only)
    # -----------------------------------------------------------
    outbound_sql = text("""
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
        AND DATE(v.call_date) = :billing_date
    """)
    # outbound_sql = text("""
    #     SELECT
    #         GREATEST(CAST(va.talk_sec AS SIGNED) - CAST(va.dead_sec AS SIGNED), 0) AS length_in_sec,
    #         LEFT(v.phone_number, 10) AS phone_number,
    #         v.call_date,
    #         v.user
    #     FROM vicidial_log v
    #     JOIN vicidial_agent_log va ON v.uniqueid = va.uniqueid
    #     WHERE GREATEST(CAST(va.talk_sec AS SIGNED) - CAST(va.dead_sec AS SIGNED), 0) != 0
    #     AND v.user != 'VDAD'
    #     AND v.campaign_id IN :campaigns
    #     AND DATE(v.call_date) = :billing_date
    # """)

    outbound_rows = db2.execute(
        outbound_sql,
        {
            "campaigns": tuple(campaign_list),
            "billing_date": billing_date
        }
    ).mappings().fetchall()
    print("****",outbound_rows)

    for ob in outbound_rows:
        raw_len = ob.get("length_in_sec")
        if not raw_len:
            continue

        callLength = round(float(raw_len))  # PHP round()
        if callLength <= 0:
            continue

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
        ob_pulse += total_pulse
        ob_total += amount
        ob_secs += 0   # matches PHP: call_pulsesec = 0




    # --------------------------
    # 6) IVR BILLING (matches PHP logic)
    # --------------------------
    ivr_query = text("""
        SELECT 
            DATE_FORMAT(call_time, '%d %b %y') AS CallDate1,
            call_time AS CallDate,
            source_number AS CallFrom,
            uniqueid
        FROM rx_log
        WHERE clientId = :client_id
          AND DATE(call_time) = :billing_date
    """)

    ivr_rows = db.execute(ivr_query, {
        "client_id": request.company_id,
        "billing_date": billing_date
    }).fetchall()

    # build unique uniqueid set
    ivr_uniqueids = {row.uniqueid for row in ivr_rows}

    # units same as PHP: count of uniqueid
    ivr_unit = len(ivr_uniqueids)

    # get IVR charge from plan (same as PHP: ivr_charge)
    ivr_charge = Decimal(plan_row.get("IVR_Charge"))

    ivr_rate = ivr_unit * ivr_charge
    ivr_total = ivr_rate
    ivr_pulse = ivr_unit

    print("IVR → Units:", ivr_unit, "Rate:", float(ivr_rate))


    # --- Initialize SMS variables (same as PHP) ---
    sms_pulse = 0
    sms_secs = 0
    sms_charge = Decimal(0)          # plan rate (if any)
    sms_flat = 0
    sms_total = Decimal(0)

    # Get plan SMS charge
    sms_charge = Decimal(plan_row.get("SMSCharge", 0) or 0)

    # --- Fetch SMS rows (same as PHP query) ---
    sms_sql = text("""
        SELECT CallDate, CallTime, CallFrom, Unit, Duration
        FROM billing_master
        WHERE clientId = :client_id
        AND DedType = 'SMS'
        AND DATE(CallDate) = :billing_date
    """)

    sms_rows = db.execute(
        sms_sql,
        {"client_id": request.company_id, "billing_date": billing_date}
    ).mappings().fetchall()


    # --- Loop through SMS details ---
    for sms in sms_rows:
        smsChar = int(sms.get("Duration") or 0)
        sms_unit = int(sms.get("Unit") or 0)

        sms_pulse += sms_unit
        sms_secs += smsChar
        sms_total += Decimal(sms_charge) * Decimal(sms_unit)



    # --- Initialize EMAIL variables (same as PHP) ---
    email_pulse = 0
    email_secs = 0
    email_charge = Decimal(0)
    email_flat = 0
    email_total = Decimal(0)

    # Plan charge for Email
    email_charge = Decimal(plan_row.get("EmailCharge", 0) or 0)
    email_flat = 0

    email_sql = text("""
        SELECT CallDate, CallTime, CallFrom, Unit
        FROM billing_master
        WHERE clientId = :client_id
        AND DedType = 'Email'
        AND DATE(CallDate) = :billing_date
    """)

    email_rows = db.execute(
        email_sql,
        {"client_id": request.company_id, "billing_date": billing_date}
    ).mappings().fetchall()

    for email_row in email_rows:
        EmailUnit = int(email_row.get("Unit") or 0)
        email_rate = Decimal(EmailUnit) * email_charge

        email_pulse += EmailUnit
        email_total += email_rate


    # Plan charge for Miss
    miss_charge = Decimal(plan_row.get("MissCallCharge", 0) or 0)
    miss_pulse = 0
    miss_secs = 0
    miss_flat = 0
    miss_total = 0

    # MISSCALL query (same as PHP)
    miss_qry = text("""
        SELECT DATE_FORMAT(CallTime, '%d %b %y') AS CallDate1,
            CallTime AS CallDate,
            CallFrom,
            Unit
        FROM billing_master
        WHERE clientId = :client_id
        AND DedType = 'MISSCALL'
        AND DATE(CallDate) = :billing_date
    """)

    miss_rows = db.execute(miss_qry, {"client_id": request.company_id, "billing_date": billing_date}).fetchall()

    # loop same as PHP
    for row in miss_rows:
        MissUnit = row.Unit if row.Unit is not None else 0
        email_rate = ceil(MissUnit * miss_charge)

        miss_pulse += MissUnit
        miss_total += email_rate


    
    # --- Initialize WHATSAPP SMS variables (same as PHP) ---
    wasms_pulse = 0
    wasms_secs = 0
    wasms_charge = Decimal(0)
    wasms_flat = 0
    wasms_total = Decimal(0)

    # Plan charge for WhatsApp Alerts
    wasms_charge = Decimal(plan_row.get("whatsapp_message_charge", 0) or 0)


    wa_sms_sql = text("""
        SELECT CallDate, CallTime, CallFrom, Unit
        FROM billing_master
        WHERE clientId = :client_id
        AND DedType = 'WhatsappAlert'
        AND DATE(CallDate) = :billing_date
    """)

    wa_sms_rows = db.execute(
        wa_sms_sql,
        {"client_id": request.company_id, "billing_date": billing_date}
    ).mappings().fetchall()

    for wasms_row in wa_sms_rows:
        wasms_unit = int(wasms_row.get("Unit") or 0)

        wasms_pulse += wasms_unit
        wasms_total += wasms_charge * Decimal(wasms_unit)




    # 7) round totals suitable for DB (same as your earlier code)
    ib_total = to_decimal(ib_total, places=2)
    ibn_total = to_decimal(ibn_total, places=2)
    ob_total = to_decimal(ob_total, places=2)
    ivr_total = to_decimal(ivr_total, places=2)
    sms_total = to_decimal(sms_total, places=2)
    email_total = to_decimal(email_total, places=2)
    miss_total = to_decimal(miss_total, places=2)
    wasms_total = to_decimal(wasms_total, places=2)

    # cm_total = float(ib_total + ibn_total + ivr_total + sms_total + email_total + miss_total + wasms_total)
    cm_total = float(ib_total + ibn_total + ob_total + ivr_total + sms_total + email_total + miss_total + wasms_total)

    # prepare insert (same as before)
    insert_sql = text("""
        INSERT INTO billing_consume_daily_new
        (client_id, cm_date, cm_total,
        ib_pulse, ib_secs, ib_charge, ib_flat, ib_total,
        ibn_pulse, ibn_secs, ibn_charge, ibn_flat, ibn_total,
        ob_pulse, ob_secs, ob_charge, ob_flat, ob_total,
        ivr_pulse, ivr_charge, ivr_flat, ivr_total,
        sms_pulse, sms_charge, sms_flat, sms_total,
        email_pulse, email_charge, email_flat, email_total,              
        miss_pulse, miss_charge, miss_flat, miss_total,    
        whatsapp_sms_pulse, whatsapp_sms_charge, whatsapp_sms_flat, whatsapp_sms_total,          
        created_at, plan_id)
        VALUES
        (:client_id, :cm_date, :cm_total,
        :ib_pulse, :ib_secs, :ib_charge, :ib_flat, :ib_total,
        :ibn_pulse, :ibn_secs, :ibn_charge, :ibn_flat, :ibn_total,
        :ob_pulse, :ob_secs, :ob_charge, :ob_flat, :ob_total,
        :ivr_pulse, :ivr_charge, :ivr_flat, :ivr_total,
        :sms_pulse, :sms_charge, :sms_flat, :sms_total,
        :email_pulse, :email_charge, :email_flat, :email_total,
        :miss_pulse, :miss_charge, :miss_flat, :miss_total,
        :whatsapp_sms_pulse, :whatsapp_sms_charge, :whatsapp_sms_flat, :whatsapp_sms_total,
        NOW(), :plan_id)
    """)

    params = {
        "client_id": request.company_id,
        "cm_date": billing_date,
        "cm_total": cm_total,

        "ib_pulse": ib_pulse,
        "ib_secs": ib_secs,
        "ib_charge": float(ib_charge_plan),
        "ib_flat": 0,
        "ib_total": float(ib_total),

        "ibn_pulse": ibn_pulse,
        "ibn_secs": ibn_secs,
        "ibn_charge": float(ibn_charge_plan),
        "ibn_flat": 0,
        "ibn_total": float(ibn_total),

        "ob_pulse": ob_pulse,
        "ob_secs": ob_secs,
        "ob_charge": float(ob_charge_plan),   # plan rate value (matches PHP field)
        "ob_flat": 0,
        "ob_total": float(ob_total),

        "ivr_pulse": ivr_pulse,
        "ivr_charge": float(ivr_total),  
        "ivr_flat": 0,    
        "ivr_total": float(ivr_total),

        "sms_pulse": sms_pulse,
        "sms_charge": sms_charge,
        "sms_flat": sms_flat,
        "sms_total": sms_total,

        "email_pulse": email_pulse,
        "email_charge": email_charge,
        "email_flat": email_flat,
        "email_total": email_total,

        "miss_pulse": miss_pulse,
        "miss_charge": miss_total,
        "miss_flat": miss_flat,
        "miss_total": miss_total,

        "whatsapp_sms_pulse": wasms_pulse,
        "whatsapp_sms_charge": float(wasms_charge),
        "whatsapp_sms_flat": wasms_flat,
        "whatsapp_sms_total": float(wasms_total),

        "plan_id": bal_row["PlanId"]
    }

    # insert into DB (no explicit db.begin())
    try:
        db.execute(insert_sql, params)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB insert failed: {str(e)}")

    return {
        "client_id": request.company_id,
        "cm_date": billing_date,
        "ib_pulse": ib_pulse,
        "ib_secs": ib_secs,
        "ib_total": float(ib_total),
        "ibn_pulse": ibn_pulse,
        "ibn_secs": ibn_secs,
        "ibn_total": float(ibn_total),
        "ob_pulse": ob_pulse,
        "ob_secs": ob_secs,
        "ob_charge": float(ob_charge_plan),
        "ob_total": float(ob_total),
        "ivr_pulse": ivr_pulse,
        "ivr_charge": float(ivr_total),      
        "ivr_total": float(ivr_total),
        "sms_pulse": sms_pulse,
        "sms_charge": sms_charge,
        "sms_flat": sms_flat,
        "sms_total": sms_total,
        "cm_total": cm_total,
        "inserted_plan_id": bal_row["PlanId"]
    }











from datetime import date


from typing import List, Dict
# from datetime import date
import math

# router = APIRouter()

class AbandCallbackRequest(BaseModel):
    client_id: int
    billing_date: date   # single date

# # example constants for billing calculation
# OB_PULSE_SEC = 60      # seconds per pulse
# OB_PULSE_RATE = 3    # rate per pulse
# OB_FIRST_MIN = 1       # whether first minute special applies
# OFMP = 1               # first minute pulse count

@router.post("/aband_outbound_details")
def get_aband_outbound_details(
    request: AbandCallbackRequest,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2),
):
    client_id = request.client_id
    billing_date = request.billing_date

    campaign_q = text("SELECT campaignid FROM registration_master WHERE company_id = :company_id LIMIT 1")
    campaign_row = db.execute(campaign_q, {"company_id": request.client_id}).mappings().fetchone()
    if not campaign_row or not campaign_row.get("campaignid"):
        raise HTTPException(status_code=404, detail="Company / campaign not found")

    # --- CLEAN CAMPAIGN LIST ---
    raw_campaign = campaign_row["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]
    print("RAW campaign_list =", campaign_list)

    # -----------------------------
    # STEP 0: Fetch balance_master & plan_master for outbound pulse info
    # -----------------------------
    bal_q = text("SELECT * FROM balance_master WHERE clientId = :client_id LIMIT 1")
    bal_row = db.execute(bal_q, {"client_id": client_id}).mappings().fetchone()
    if not bal_row or not bal_row.get("PlanId"):
        raise HTTPException(status_code=404, detail="No balance/plan found for this client")

    plan_q = text("SELECT * FROM plan_master WHERE Id = :plan_id LIMIT 1")
    plan_row = db.execute(plan_q, {"plan_id": bal_row["PlanId"]}).mappings().fetchone()
    if not plan_row:
        raise HTTPException(status_code=404, detail="Plan master entry not found")

    # --- parse outbound plan values ---
    ob_pulse_sec = float(plan_row.get("pulse_outbound_call_shift") or 60)
    ob_pulse_rate = float(plan_row.get("rate_per_pulse_outbound_call_shift") or 0)
    ob_first_min = int(plan_row.get("first_minute_flag") or 1)
    ofmp = int(plan_row.get("first_minute_pulse") or 1)

    vicidial_data=[]

    # -----------------------------
    # STEP 1: Fetch aband_call_master numbers
    # -----------------------------
    sql_get_aband = text("""
        SELECT 
            LEFT(PhoneNo, 10) AS PhoneNumber,
            DATE(Callbackdate) AS CallbackDate
        FROM 
            aband_call_master
        WHERE 
            clientid = :client_id
            AND DATE(Callbackdate) = :billing_date
        GROUP BY 1,2
    """)
    rows = db.execute(sql_get_aband, {
        "client_id": client_id,
        "billing_date": billing_date
    }).fetchall()

    # if not rows:
    #     return {"status": "success", "data": [], "msg": "No abandoned callbacks found"}

    if rows:
        phone_date_pairs = [(r.PhoneNumber, r.CallbackDate) for r in rows]
        in_values = ", ".join(f"('{pn}','{dt}')" for pn, dt in phone_date_pairs)

        # -----------------------------
        # STEP 2: Fetch Vicidial records for those numbers
        # -----------------------------
        sql_vicidial = text(f"""
            SELECT 
                t2.list_id,
                DATE(t2.call_date) AS CallDate,
                TIME(FROM_UNIXTIME(t2.start_epoch)) AS StartTime,
                LEFT(t2.phone_number, 10) AS PhoneNumber,
                t2.`user` AS Agent,
                t3.talk_sec AS TalkSec
            FROM 
                asterisk.vicidial_log t2
            LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid
            WHERE 
                DATE(t2.call_date) = :billing_date
                AND t2.campaign_id = 'dialdesk'
                AND t2.lead_id IS NOT NULL
                AND (LEFT(t2.phone_number,10), DATE(t2.call_date)) IN ({in_values})
        """)

        vicidial_rows = db2.execute(sql_vicidial, {"billing_date": billing_date}).fetchall()
        vicidial_data = [dict(r._mapping) for r in vicidial_rows]

    
    # ---------------------------------------------------
    # STEP 2A: ADD NORMAL OUTBOUND LIKE YOUR PHP CODE
    # ---------------------------------------------------
    # sql_normal_outbound = text(f"""
    #     SELECT 
    #         GREATEST(
    #         CAST(va.talk_sec AS SIGNED) - CAST(va.dead_sec AS SIGNED),
    #         0
    #     ) AS length_in_sec,
    #         LEFT(v.phone_number,10) AS phone_number,
    #         v.call_date as CallDate,
    #         v.user
    #     FROM asterisk.vicidial_log v
    #     JOIN vicidial_agent_log va ON v.uniqueid = va.uniqueid
    #     WHERE 
    #          GREATEST(
    #         CAST(va.talk_sec AS SIGNED) - CAST(va.dead_sec AS SIGNED),
    #         0
    #     ) != 0
    #         AND v.user != 'VDAD'
    #         AND v.campaign_id IN :campaigns
    #         AND DATE(v.call_date) = :billing_date
    # """)

    sql_normal_outbound = text("""
        SELECT
            (va.talk_sec-va.dead_sec) length_in_sec,
            LEFT(v.phone_number, 10) AS phone_number,
            v.call_date as CallDate,
            v.user
        FROM vicidial_log v
        JOIN vicidial_agent_log va ON v.uniqueid = va.uniqueid
        WHERE length_in_sec != 0
        AND v.user != 'VDAD'
        AND v.campaign_id IN :campaigns
        AND DATE(v.call_date) = :billing_date
    """)


    normal_rows = db2.execute(sql_normal_outbound, {
        "campaigns": tuple(campaign_list),
        "billing_date": billing_date
    }).fetchall()
    print("****", normal_rows)

    normal_outbound = [dict(r._mapping) for r in normal_rows]

    # Append to main list
    for r in normal_outbound:
        r["list_id"] = None
        r["StartTime"] = None
        r["TalkSec"] = float(r["length_in_sec"] or 0)  # match format
        vicidial_data.append(r)

    # -----------------------------
    # STEP 3: Loop through Vicidial records, calculate pulses & amount dynamically
    # -----------------------------
    grouped_data: Dict[str, Dict] = {}  # key = date

    for call in vicidial_data:
        talk_sec = float(call.get("TalkSec") or 0)

        # calculate pulses using plan values
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

        # calculate amount
        amount = total_pulse * ob_pulse_rate

        call['unit'] = total_pulse
        call['amount'] = round(amount, 2)

        call_date_str = str(call['CallDate'])
        if call_date_str not in grouped_data:
            grouped_data[call_date_str] = {
                "calls": [],
                "total_talk_sec": 0,
                "total_pulse": 0,
                "total_amount": 0
            }

        grouped_data[call_date_str]["calls"].append(call)
        grouped_data[call_date_str]["total_talk_sec"] += talk_sec
        grouped_data[call_date_str]["total_pulse"] += total_pulse
        grouped_data[call_date_str]["total_amount"] += amount

    # -----------------------------
    # STEP 4: Return grouped data with totals
    # -----------------------------
    response = []
    for date_str, data in grouped_data.items():
        response.append({
            "date": date_str,
            "total_talk_sec": data["total_talk_sec"],
            "total_pulse": data["total_pulse"],
            "total_amount": round(data["total_amount"], 2),
            "calls": data["calls"]
        })

    # -----------------------------
    # STEP 4A: Compute grand totals
    # -----------------------------
    grand_total_talk_sec = sum(d["total_talk_sec"] for d in grouped_data.values())
    grand_total_pulse = sum(d["total_pulse"] for d in grouped_data.values())
    grand_total_amount = sum(d["total_amount"] for d in grouped_data.values())

    return {
        "status": "success",
        "count": len(vicidial_data),
        "grand_total_talk_sec": grand_total_talk_sec,
        "grand_total_pulse": grand_total_pulse,
        "grand_total_amount": round(grand_total_amount, 2),
        "data": response
    }













        # ob_pulse, ob_secs, ob_charge, ob_flat, ob_total,
        # :ob_pulse, :ob_secs, :ob_charge, :ob_flat, :ob_total,














# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel
# from sqlalchemy import text
# from sqlalchemy.orm import Session
# from math import ceil
# from datetime import datetime
# from decimal import Decimal, ROUND_HALF_UP
# from database import get_db2, get_db4

# router = APIRouter()

# # Request model
# class BillingDailyRequest(BaseModel):
#     company_id: int
#     billing_date: str  # YYYY-MM-DD


# def to_decimal(x, places=2):
#     d = Decimal(x if x is not None else 0)
#     q = Decimal(10) ** -places
#     return d.quantize(q, rounding=ROUND_HALF_UP)

# @router.post("/compute_ib_consumption")
# def compute_ib_consumption(
#     request: BillingDailyRequest,
#     db: Session = Depends(get_db4),    # main DB (registration_master, plan_master, balance_master, billing_consume_daily_new)
#     db2: Session = Depends(get_db2)   # vicidial DB (vicidial_closer_log, vicidial_agent_log)
# ):
#     # 1) Get registration / campaign string for this company
#     campaign_q = text("SELECT campaignid FROM registration_master WHERE company_id = :company_id LIMIT 1")
#     campaign_row = db.execute(campaign_q, {"company_id": request.company_id}).mappings().fetchone()
#     if not campaign_row or not campaign_row.get("campaignid"):
#         raise HTTPException(status_code=404, detail="Company / campaign not found")

#     raw_campaign = campaign_row["campaignid"]
#     # normalize into a tuple for SQL IN
#     campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]
#     if not campaign_list:
#         raise HTTPException(status_code=404, detail="No campaigns configured for this company")

#     # 2) Get balance_master and plan_master for this client
#     bal_q = text("SELECT * FROM balance_master WHERE clientId = :client_id LIMIT 1")
#     bal_row = db.execute(bal_q, {"client_id": request.company_id}).mappings().fetchone()
#     if not bal_row or not bal_row.get("PlanId"):
#         raise HTTPException(status_code=404, detail="No balance/plan found for this client")

#     plan_q = text("SELECT * FROM plan_master WHERE Id = :plan_id LIMIT 1")
#     plan_row = db.execute(plan_q, {"plan_id": bal_row["PlanId"]}).mappings().fetchone()
#     if not plan_row:
#         raise HTTPException(status_code=404, detail="Plan master entry not found")

#     # parse plan values (fall back to sensible defaults)
#     try:
#         ib_pulse_sec = float(plan_row.get("pulse_day_shift") or 60)
#     except:
#         ib_pulse_sec = 60.0
#     try:
#         ibn_pulse_sec = float(plan_row.get("pulse_night_shift") or ib_pulse_sec)
#     except:
#         ibn_pulse_sec = ib_pulse_sec

#     try:
#         ib_pulse_rate = Decimal(plan_row.get("rate_per_pulse_day_shift") or 0)
#     except:
#         ib_pulse_rate = Decimal(0)
#     try:
#         ibn_pulse_rate = Decimal(plan_row.get("rate_per_pulse_night_shift") or 0)
#     except:
#         ibn_pulse_rate = Decimal(0)

#     ib_charge = Decimal(plan_row.get("InboundCallCharge") or 0)
#     ibn_charge = Decimal(plan_row.get("InboundCallChargeNight") or 0)

#     # first minute enabled?
#     first_minute_enabled = (str(plan_row.get("first_minute", "")).lower() == "enable")
#     ifmp = ceil(60.0 / ib_pulse_sec) if ib_pulse_sec > 0 else 1
#     ifmp_n = ceil(60.0 / ibn_pulse_sec) if ibn_pulse_sec > 0 else 1

#     # 3) Query vicidial_closer_log (left join vicidial_agent_log as in PHP)
#     billing_date = request.billing_date
#     inbound_sql = text(f"""
#         SELECT
#             IF(t3.talk_sec IS NULL, t2.length_in_sec, t3.talk_sec) AS length_in_sec,
#             t2.phone_number,
#             t2.call_date
#         FROM vicidial_closer_log t2
#         LEFT JOIN vicidial_agent_log t3
#           ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
#         WHERE t2.user != 'VDCL'
#           AND t2.campaign_id IN :campaigns
#           AND DATE(t2.call_date) = :last_date
#     """)

#     vic_rows = db2.execute(inbound_sql, {"campaigns": tuple(campaign_list), "last_date": billing_date}).mappings().fetchall()

#     # ---------------- OUTBOUND CDR (vicidial_log) ----------------
#     outbound_sql = text("""
#         SELECT 
#             t2.length_in_sec AS length_in_sec,
#             t2.call_date
#         FROM vicidial_log t2
#         WHERE t2.campaign_id IN :campaigns
#         AND DATE(t2.call_date) = :last_date
#     """)

#     obd_rows = db2.execute(
#         outbound_sql,
#         {"campaigns": tuple(campaign_list), "last_date": billing_date}
#     ).mappings().fetchall()


#     # 4) Compute totals (mirror PHP)
#     ib_pulse = 0
#     ib_secs = 0
#     ib_total = Decimal(0)

#     ibn_pulse = 0
#     ibn_secs = 0
#     ibn_total = Decimal(0)

#     for r in vic_rows:
#         length = r.get("length_in_sec")
#         call_date = r.get("call_date")
#         # skip empty durations
#         if length in (None, "", 0):
#             continue
#         try:
#             duration = float(length)
#         except:
#             continue

#         # determine time of day (day: 08:00:00 - 19:59:59, night: >=20:00 or <=08:00)
#         # call_date could be string or datetime, normalize
#         if isinstance(call_date, str):
#             try:
#                 call_dt = datetime.fromisoformat(call_date)
#             except:
#                 call_dt = datetime.strptime(call_date, "%Y-%m-%d %H:%M:%S")
#         else:
#             call_dt = call_date

#         call_time_str = call_dt.strftime("%H:%M:%S")
#         is_night = (call_time_str >= "20:00:00") or (call_time_str <= "08:00:00")

#         if is_night:
#             # night logic
#             convrt_pulse = duration / ibn_pulse_sec if ibn_pulse_sec > 0 else duration
#             if first_minute_enabled:
#                 if convrt_pulse > ifmp_n:
#                     subsequent = convrt_pulse - ifmp_n
#                     call_pulse = int(ifmp_n + ceil(subsequent))
#                 else:
#                     call_pulse = int(ifmp_n)
#             else:
#                 call_pulse = int(ceil(duration / ibn_pulse_sec)) if ibn_pulse_sec > 0 else int(ceil(duration))
#             call_rate = (Decimal(call_pulse) * ibn_pulse_rate).quantize(Decimal("0.0001"))
#             ibn_pulse += call_pulse
#             ibn_secs += int(duration)
#             ibn_total += call_rate
#         else:
#             # day logic
#             convrt_pulse = duration / ib_pulse_sec if ib_pulse_sec > 0 else duration
#             if first_minute_enabled:
#                 if convrt_pulse > ifmp:
#                     subsequent = convrt_pulse - ifmp
#                     call_pulse = int(ifmp + ceil(subsequent))
#                 else:
#                     call_pulse = int(ifmp)
#             else:
#                 call_pulse = int(ceil(duration / ib_pulse_sec)) if ib_pulse_sec > 0 else int(ceil(duration))
#             call_rate = (Decimal(call_pulse) * ib_pulse_rate).quantize(Decimal("0.0001"))
#             ib_pulse += call_pulse
#             ib_secs += int(duration)
#             ib_total += call_rate

#     # ----- OBD COMPUTATION -----
#     ob_secs = 0
#     ob_pulse = 0
#     ob_charge = Decimal(0)

#     # Fetch OBD pulse/sec & rate from plan (same keys you use in PHP)
#     ob_pulse_sec = float(plan_row.get("pulse") or 60)
#     ob_pulse_rate = Decimal(plan_row.get("OutboundCallCharge") or 0)

#     for r in obd_rows:
#         duration = float(r.get("length_in_sec") or 0)
#         if duration <= 0:
#             continue

#         ob_secs += int(duration)
#         ob_pulse += ceil(duration / ob_pulse_sec)

#     # money calculation
#     ob_charge = (Decimal(ob_pulse) * ob_pulse_rate).quantize(Decimal("0.01"))     
       


#     # Round totals to 2 decimal places for DB (use same rounding as other money fields)
#     ib_total = to_decimal(ib_total, places=2)
#     ibn_total = to_decimal(ibn_total, places=2)
#     ob_charge = to_decimal(ob_charge)

#     # ib_charge / ibn_charge keep as plan's per-call/flat field (the PHP sets them from PlanDetails)
#     # Prepare insert (mirrors your PHP insert fields; add other fields as needed)
#     insert_sql = text("""
#         INSERT INTO billing_consume_daily_new
#         (client_id, cm_date, cm_total,
#          ib_pulse, ib_secs, ib_charge, ib_flat, ib_total,
#          ibn_pulse, ibn_secs, ibn_charge, ibn_flat, ibn_total,
#          ob_pulse, ob_secs, ob_charge,             
#          created_at, plan_id)
#         VALUES
#         (:client_id, :cm_date, :cm_total,
#          :ib_pulse, :ib_secs, :ib_charge, :ib_flat, :ib_total,
#          :ibn_pulse, :ibn_secs, :ibn_charge, :ibn_flat, :ibn_total,
#          :ob_pulse, :ob_secs, :ob_charge,
#          NOW(), :plan_id)
#     """)

#     cm_total = float(ib_total + ibn_total)  # other components not included in this endpoint

#     params = {
#         "client_id": request.company_id,
#         "cm_date": billing_date,
#         "cm_total": cm_total,
#         "ib_pulse": ib_pulse,
#         "ib_secs": ib_secs,
#         "ib_charge": float(ib_charge),   # raw charge value from plan_master
#         "ib_flat": 0,
#         "ib_total": float(ib_total),
#         "ibn_pulse": ibn_pulse,
#         "ibn_secs": ibn_secs,
#         "ibn_charge": float(ibn_charge),
#         "ibn_flat": 0,
#         "ibn_total": float(ibn_total),
#         "ob_pulse": ob_pulse,
#         "ob_secs": ob_secs,
#         "ob_charge": float(ob_charge),
#         "plan_id": bal_row["PlanId"]
#     }

#     # run insert inside transaction
#     try:
#         db.execute(insert_sql, params)
#         db.commit()
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"DB insert failed: {str(e)}")

#     return {
#         "client_id": request.company_id,
#         "cm_date": billing_date,
#         "ib_pulse": ib_pulse,
#         "ib_secs": ib_secs,
#         "ib_total": float(ib_total),
#         "ibn_pulse": ibn_pulse,
#         "ibn_secs": ibn_secs,
#         "ibn_total": float(ibn_total),
#         "ob_pulse": ob_pulse,
#         "ob_secs": ob_secs,
#         "ob_charge": float(ob_charge),  
#         "cm_total": cm_total,
#         "inserted_plan_id": bal_row["PlanId"]
#     }
