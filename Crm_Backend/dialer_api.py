import json
import time
import requests
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

# DB dependencies
from database import get_db4, get_db2

router = APIRouter()


# ============================================
# CONFIG
# ============================================

ASTERISK_API = "http://192.168.10.5/agc/api.php"
API_USER = "6666"
API_PASS = "vicidialnow1"


# ============================================
# HELPER → TIME TO MINUTES
# ============================================

def time_to_minutes(time_str: str):
    h, m = map(int, time_str.split(":"))
    return h * 60 + m


# ============================================
# MAIN API
# ============================================

@router.get("/trigger-callback")
def trigger_callback(
    db4: Session = Depends(get_db4),  # localhost / db_dialdesk
    db2: Session = Depends(get_db2)   # 192.168.10.5 / asterisk
):
    """
    PHP callback dial logic → FastAPI version
    db4 = Dialdesk DB
    db2 = Asterisk DB
    """

    try:
        # ============================================
        # STEP 1 → GET LIVE AGENTS (ASTERISK DB)
        # ============================================
        agents = db2.execute(text("""
            SELECT user, status
            FROM vicidial_live_agents
            WHERE status='CLOSER'
            AND campaign_id IN ('Dialdesk','Cryst002','Ajmal000','Superher')
            LIMIT 8
        """)).fetchall()

        if not agents:
            return {"message": "No live agents"}

        for agent in agents:
            flag = True
            user = agent.user

            # ============================================
            # STEP 2 → USER ALLOWED CAMPAIGNS (ASTERISK DB)
            # ============================================
            user_allowed = db2.execute(text("""
                SELECT closer_campaigns
                FROM vicidial_users
                WHERE user=:user
                LIMIT 1
            """), {"user": user}).fetchone()

            if not user_allowed:
                continue

            campaigns = user_allowed.closer_campaigns.replace(" ", ",").split(",")

            # ============================================
            # LOOP CAMPAIGNS
            # ============================================
            for campaignid in campaigns:
                campaignid = campaignid.strip()

                # ============================================
                # STEP 3 → GET CLIENT ID (DIALDESK DB)
                # ============================================
                client = db4.execute(text("""
                    SELECT client_id
                    FROM ingroup_campaign_master
                    WHERE campaign_name=:campaign
                    LIMIT 1
                """), {"campaign": campaignid}).fetchone()

                if not client:
                    continue

                client_id = client.client_id

                # ============================================
                # STEP 4 → GET ABANDONED CALLS (DIALDESK DB)
                # ============================================
                calls = db4.execute(text("""
                    SELECT id, ClientId,
                           RIGHT(PhoneNo,10) AS CallNo,
                           CompanyName,
                           DATE_FORMAT(EntryDate,'%H:%i') entry_hour,
                           EntryDate
                    FROM aband_call_master
                    WHERE ClientId=:client_id
                    AND DATE(CallDate)=CURDATE()
                    AND call_status IS NULL
                    AND call_attempt < 3
                    ORDER BY EntryDate DESC
                    LIMIT 8
                """), {"client_id": client_id}).fetchall()

                for call in calls:

                    # ================= INVALID NUMBER
                    if not call.CallNo:
                        db4.execute(text("""
                            UPDATE aband_call_master
                            SET call_attempt=3,
                                user='NaN',
                                Callbackdate=NOW(),
                                TagStatus='0'
                            WHERE id=:id
                        """), {"id": call.id})

                        db4.commit()
                        flag = False
                        continue

                    # ============================================
                    # STEP 5 → CALLBACK TIME CHECK (DIALDESK DB)
                    # ============================================
                    entry_time_min = time_to_minutes(call.entry_hour)
                    do_callback = True

                    timers = db4.execute(text("""
                        SELECT start_time,end_time,aband_status
                        FROM aband_call_time
                        WHERE client_id=:client_id
                        AND active='1'
                    """), {"client_id": client_id}).fetchall()

                    for timer in timers:
                        min_time = time_to_minutes(timer.start_time)
                        max_time = time_to_minutes(timer.end_time)

                        if min_time <= entry_time_min <= max_time:
                            diff_min = (
                                datetime.now() - call.EntryDate
                            ).total_seconds() / 60

                            if diff_min > timer.aband_status:
                                do_callback = False
                            break

                    if not do_callback:
                        continue

                    # ============================================
                    # STEP 6 → PAUSE AGENT (ASTERISK API)
                    # ============================================
                    # pause_url = (
                    #     f"{ASTERISK_API}"
                    #     f"?source=test&user={API_USER}&pass={API_PASS}"
                    #     f"&agent_user={user}"
                    #     f"&function=external_pause&value=PAUSE"
                    # )
                    #
                    # requests.get(pause_url)
                    time.sleep(2)

                    # ============================================
                    # STEP 7 → DIAL CALL
                    # ============================================

                    # dial_url = (
                    #     f"{ASTERISK_API}"
                    #     f"?source=test&user={API_USER}&pass={API_PASS}"
                    #     f"&agent_user={user}"
                    #     f"&function=external_dial"
                    #     f"&value={call.CallNo}"
                    #     f"&phone_code=1&search=no&preview=NO"
                    #     f"&focus=no&vendor_id={client_id}"
                    # )
                    #
                    # requests.get(dial_url)

                    # ============================================
                    # STEP 8 → UPDATE CALL (DIALDESK DB)
                    # ============================================
                    db4.execute(text("""
                        UPDATE aband_call_master
                        SET user=:user,
                            call_attempt=call_attempt+1,
                            Callbackdate=NOW(),
                            TagStatus='1'
                        WHERE id=:id
                    """), {"user": user, "id": call.id})

                    db4.commit()

                    flag = False
                    time.sleep(10)
                    break

                if not flag:
                    break

        return {"status": "callback process completed"}

    except Exception as e:
        return {"error": str(e)}



LOG_FILE = "call_back_status_log.txt"


# ============================================
# LOG WRITER (same as PHP writeToLog)
# ============================================
def write_to_log(message: str):
    with open(LOG_FILE, "a") as f:
        f.write(message + "\n")


# ============================================
# API → UPDATE CALL STATUS
# ============================================
@router.get("/update-call-status")
def update_call_status(
    custno: str = Query(...),
    uni: str | None = Query(None),
    db4: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    """
    PHP callback status API → FastAPI version

    Params:
    - custno → customer number
    - uni → fallback unique id
    """

    try:
        c_no = custno.strip() if custno else ""

        # ==========================
        # SAFETY CHECK
        # ==========================
        if not c_no:
            write_to_log("ERROR: Missing custno parameter")
            return {"error": "Missing custno parameter"}

        # ==========================
        # STEP 1 → UPDATE LOCAL TABLE (db_dialdesk)
        # ==========================
        db4.execute(text("""
            UPDATE aband_call_master
            SET call_status='Answer'
            WHERE PhoneNo=:phone
            AND DATE(EntryDate)=CURDATE()
            AND call_status IS NULL
        """), {"phone": c_no})

        # insert log table
        db4.execute(text("""
            INSERT INTO call_status_log (cust_no, created_at)
            VALUES (:cust_no, NOW())
        """), {"cust_no": c_no})

        db4.commit()

        # ==========================
        # STEP 2 → GET UNIQUEID FROM ASTERISK
        # ==========================
        trimmed_phone = c_no[-10:]

        uid_row = db2.execute(text("""
            SELECT uniqueid
            FROM vicidial_auto_calls
            WHERE RIGHT(phone_number,10)=:phone
            LIMIT 1
        """), {"phone": trimmed_phone}).fetchone()

        actual_uniqueid = (
            uid_row.uniqueid if uid_row and uid_row.uniqueid else uni
        )

        # ==========================
        # STEP 3 → INSERT REMOTE LOG
        # ==========================
        db2.execute(text("""
            INSERT INTO manual_call_log
            (phone_number, uniqueid, call_date)
            VALUES (:phone, :uid, :call_date)
        """), {
            "phone": c_no,
            "uid": actual_uniqueid,
            "call_date": datetime.now()
        })

        db2.commit()

        # ==========================
        # STEP 4 → FILE LOG
        # ==========================
        log_data = {
            "custno": c_no,
            "uniqueid": actual_uniqueid,
            "entry_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        write_to_log(json.dumps(log_data))

        return {
            "status": "OK",
            "message": f"Logged call for {c_no}",
            "uniqueid": actual_uniqueid
        }

    except Exception as e:
        return {"error": str(e)}