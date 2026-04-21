from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy import text
from datetime import date, datetime
from database import get_db2, get_db4
from math import ceil
import math
from decimal import Decimal



router = APIRouter()



@router.get("/month-wise-statement-summary")
def month_wise_statement_summary(
        client_id: int,
        from_date: date = Query(...),
        to_date: date = Query(...),
        db=Depends(get_db4),
        db2=Depends(get_db2)
):
    # Step 1: Client Info

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



    # first minute logic (match PHP 'Enable' exactly)
    first_minute_enabled = (str(plan_result.get("first_minute", "")).lower() == "enable")
    ifmp = ceil(60.0 / ib_pulse_sec) if ib_pulse_sec > 0 else 1
    ifmp_n = ceil(60.0 / ibn_pulse_sec) if ibn_pulse_sec > 0 else 1
    ofmp = ceil(60.0 / ob_pulse_sec) if ob_pulse_sec > 0 else 1
    ob_first_min = first_minute_enabled  # same as PHP's $ob_first_min

  

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

    rx_data = db.execute(rx_query, {
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




    for sms in sms_data:
        smsChar = int(sms.get("Duration") or 0)
        sms_unit = int(sms.get("Unit") or 0)

        sms_pulse += sms_unit
        sms_secs += smsChar
        sms_total += Decimal(sms_charge) * Decimal(sms_unit)



    for email_row in email_data:
        EmailUnit = int(email_row.get("Unit") or 0)
        email_rate = Decimal(EmailUnit) * email_charge

        email_pulse += EmailUnit
        email_total += email_rate



    for row in rx_data:
        pulse = 1
        rate = pulse * ivr_charge

        total_pulse7 += pulse
        total_rate7 += rate





    amount_rx = total_pulse7 * ivr_charge



    # build summary month that to be saved in db
    # summary_month = from_date.strftime("%b-%Y")  # Apr-2023
    summary_month = from_date.strftime("%Y-%m-%d")  # Apr-2023


    summary_rows = [
        ("ICB", ib_pulse, f"{ib_pulse_rate} Rs./{ib_pulse_sec} Sec", ib_total),
        ("ICB Night", ibn_pulse, f"{ibn_pulse_rate} Rs./{ibn_pulse_sec} Sec", ibn_total),
        ("ABCB", ob_pulse, f"{ob_pulse_rate} Rs./{ob_pulse_sec} Sec", ob_total),
        ("OCB", ab_pulse, f"{ob_pulse_rate} Rs./{ob_pulse_sec} Sec", ab_total),
        ("SMS", sms_pulse, f"{sms_charge} Rs./Min", sms_total),
        ("Email", email_pulse, f"{email_charge} Rs./Min", email_total),
        ("IVR", total_pulse7, f"{ivr_charge} Rs./Min", amount_rx),
    ]

    insert_sql = text("""
        INSERT INTO billing_statement_data
        (client_id, description, pulse_unit, rate, amount, summary_month)
        VALUES
        (:client_id, :description, :pulse_unit, :rate, :amount, :summary_month)
    """)
    # insert_sql = text("""
    #     INSERT INTO statement_summary
    #     (client_id, description, pulse_unit, rate, amount, summary_month)
    #     VALUES
    #     (:client_id, :description, :pulse_unit, :rate, :amount, :summary_month)
    # """)

    for desc, pulse, rate, amt in summary_rows:
        db.execute(insert_sql, {
            "client_id": client_id,
            "description": desc,
            "pulse_unit": pulse,
            "rate": rate,
            "amount": float(amt),
            "summary_month": summary_month
        })

    db.commit()


    return {"status": "success", "summary_month": summary_month}


