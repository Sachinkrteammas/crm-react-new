import json
import os
# from http.client import HTTPException
import hmac
import requests
from fastapi import APIRouter, Depends,Request, Header, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, date
import hashlib
import base64

from database import get_db4,get_db2
SECRET_KEY = "dialdesk"

router = APIRouter(prefix="/bot", tags=["Bot Integration"])


# ✅ GET FIELDS + EXISTING MAPPING
@router.get("/fields")
def get_fields(client_id: int, db: Session = Depends(get_db4)):

    # 🔹 Field master
    fields = db.execute(text("""
        SELECT fieldNumber, FieldName
        FROM field_master
        WHERE ClientId = :client_id
        AND FieldStatus IS NULL
        ORDER BY Priority
    """), {"client_id": client_id}).mappings().all()

    # 🔹 Mapping
    mapping = db.execute(text("""
        SELECT field
        FROM bot_integration_fields
        WHERE client_id = :client_id
        ORDER BY priority
    """), {"client_id": client_id}).mappings().all()

    exist_field = {}

    for m in mapping:
        field_key = m["field"]
        field_num = int(field_key.replace("Field", ""))

        row = db.execute(text("""
            SELECT FieldName
            FROM field_master
            WHERE ClientId = :client_id
            AND fieldNumber = :field_num
            LIMIT 1
        """), {"client_id": client_id, "field_num": field_num}).mappings().first()

        if row:
            exist_field[field_key] = row["FieldName"]

    return {
        "fields": [
            {
                "field_number": f["fieldNumber"],
                "field_name": f["FieldName"]
            } for f in fields
        ],
        "mapped": exist_field
    }


# ✅ SAVE MAPPING
@router.post("/save")
def save_mapping(payload: dict, db: Session = Depends(get_db4)):

    client_id = payload["client_id"]
    selected_fields = payload["selected_fields"]
    user_id = payload.get("user_id", 1)

    # 🔴 DELETE OLD
    db.execute(text("""
        DELETE FROM bot_integration_fields
        WHERE client_id = :client_id
    """), {"client_id": client_id})

    # 🟢 INSERT NEW
    for i, field in enumerate(selected_fields, start=1):
        db.execute(text("""
            INSERT INTO bot_integration_fields
            (client_id, field, priority, created_by, created_at)
            VALUES (:client_id, :field, :priority, :created_by, :created_at)
        """), {
            "client_id": client_id,
            "field": field,
            "priority": i,
            "created_by": user_id,
            "created_at": datetime.now()
        })

    # ✅ 🔐 PHP SAME TOKEN GENERATION
    token_data = str(client_id)

    token = hmac.new(
        SECRET_KEY.encode(),        # key
        token_data.encode(),        # message
        hashlib.sha256
    ).hexdigest()

    auth_token = base64.b64encode(
        f"{token_data}|{token}".encode()
    ).decode()

    # 🔍 UPSERT TOKEN
    exists = db.execute(text("""
        SELECT id FROM bot_integration_token
        WHERE client_id = :client_id
    """), {"client_id": client_id}).fetchone()

    if not exists:
        db.execute(text("""
            INSERT INTO bot_integration_token
            (client_id, token, created_at, created_by)
            VALUES (:client_id, :token, :created_at, :created_by)
        """), {
            "client_id": client_id,
            "token": auth_token,
            "created_at": datetime.now(),
            "created_by": user_id
        })
    else:
        db.execute(text("""
            UPDATE bot_integration_token
            SET token = :token,
                updated_at = :updated_at,
                updated_by = :updated_by
            WHERE client_id = :client_id
        """), {
            "token": auth_token,
            "updated_at": datetime.now(),
            "updated_by": user_id,
            "client_id": client_id
        })

    db.commit()

    return {
        "message": "Saved successfully",
        "auth_token": auth_token   # ✅ RETURN TOKEN LIKE PHP EXPECTATION
    }


# ✅ WEBHOOK
@router.get("/webhook")
def webhook(client_id: int, db: Session = Depends(get_db4)):

    mapping = db.execute(text("""
        SELECT field
        FROM bot_integration_fields
        WHERE client_id = :client_id
        ORDER BY priority
    """), {"client_id": client_id}).mappings().all()

    token_row = db.execute(text("""
        SELECT token
        FROM bot_integration_token
        WHERE client_id = :client_id
    """), {"client_id": client_id}).mappings().first()

    request_data = {}

    for m in mapping:
        field_num = int(m["field"].replace("Field", ""))

        row = db.execute(text("""
            SELECT FieldName
            FROM field_master
            WHERE ClientId = :client_id
            AND fieldNumber = :field_num
            LIMIT 1
        """), {"client_id": client_id, "field_num": field_num}).mappings().first()

        if row:
            request_data[row["FieldName"]] = ""

    return {
        "token": token_row["token"] if token_row else "",
        "request_sample": request_data
    }


def secure_compare(a, b):
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0


# ✅ SUPPORT BOTH TOKENS (PHP + OLD PYTHON)
def verify_auth_token(token):
    try:
        decoded = base64.b64decode(token).decode()
        parts = decoded.split("|")

        if len(parts) != 2:
            return None

        client_id, received_hmac = parts

        # PHP correct
        hmac_hash = hmac.new(
            SECRET_KEY.encode(),
            client_id.encode(),
            hashlib.sha256
        ).hexdigest()

        # Old python
        sha_hash = hashlib.sha256(
            (client_id + SECRET_KEY).encode()
        ).hexdigest()

        if secure_compare(hmac_hash, received_hmac) or secure_compare(sha_hash, received_hmac):
            return client_id

    except Exception:
        return None

    return None


# ✅ ARRAY FLATTEN (same as PHP array_walk_recursive)
def flatten_dict(data):
    result = ""

    def recurse(d):
        nonlocal result
        if isinstance(d, dict):
            for k, v in d.items():
                result += f"{k} "
                recurse(v)
        elif isinstance(d, list):
            for v in d:
                recurse(v)
        else:
            result += f"{d} "

    recurse(data)
    return result.strip()


@router.post("/webhook-api")
async def bot_webhook(
    request: Request,
    auth_token: str = Header(None, alias="Auth-Token"),
    db: Session = Depends(get_db4)
):
    # 🔐 AUTH
    if not auth_token:
        raise HTTPException(403, "Missing Auth-Token")

    client_id = verify_auth_token(auth_token)

    if not client_id:
        raise HTTPException(403, "Invalid Auth-Token")

    data = await request.json()

    # 🔥 FETCH MAPPING
    mappings = db.execute(text("""
        SELECT field
        FROM bot_integration_fields
        WHERE client_id = :cid
    """), {"cid": client_id}).mappings().all()

    field_numbers = {}

    for m in mappings:
        field_id = m["field"]
        field_number = field_id.replace("Field", "")

        row = db.execute(text("""
            SELECT FieldName
            FROM field_master
            WHERE ClientId = :cid AND fieldNumber = :fnum
            LIMIT 1
        """), {"cid": client_id, "fnum": field_number}).mappings().first()

        if row:
            field_numbers[row["FieldName"].strip()] = field_id

    # 🔥 ALIAS (same as PHP)
    alias = {
        'distributor_code': 'Distributor ID/Name',
        'delivery_issue': 'Delivery Issue Details',
        'quality_issue': 'Quality Issue Details',
        'sales_response_issue': 'Sales Team Response',
        'backend_support_issue': 'Backend Support',
        'material_availability_issue': 'Material Availability',
        'claim_payout_issue': 'Claim Payout',
        'partnership_issue': 'Overall Satisfaction'
    }

    mapped_data = {}

    for field_name, value in data.items():

        key = field_name.lower().strip()

        # alias
        if key in alias:
            field_name = alias[key]

        if field_name in field_numbers:
            field_number = field_numbers[field_name]

            if isinstance(value, (dict, list)):
                value = flatten_dict(value)

            mapped_data[field_number] = str(value).replace("'", "\\'")

        # categories
        if field_name.lower().startswith("category"):
            mapped_data[field_name] = str(value).replace("'", "\\'")

    # 🔥 GET SRNO
    last = db.execute(text("""
        SELECT MAX(SrNo) as srno
        FROM call_master
        WHERE ClientId = :cid
    """), {"cid": client_id}).mappings().first()

    srno = (last["srno"] or 0) + 1
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 🔥 STATIC
    static_columns = [
        "clientid", "TagType", "SrNo", "SrNo2",
        "LeadId", "CallDate", "AgentId",
        "CallType", "escalation_no", "bot_tagging"
    ]

    static_values = [
        client_id, "Bot Integration", srno, srno,
        "0", now, "0", "WhatsApp", "0", "1"
    ]

    columns = static_columns + list(mapped_data.keys())
    values = static_values + list(mapped_data.values())

    # 🔥 RAW INSERT (same style as PHP)
    column_str = ",".join(columns)
    value_str = "'" + "','".join(map(str, values)) + "'"

    insert_sql = f"INSERT INTO call_master ({column_str}) VALUES ({value_str})"

    try:
        db.execute(text(insert_sql))
        db.commit()
    except Exception:
        db.rollback()

        # 🔁 RETRY SAME AS PHP
        last = db.execute(text("""
            SELECT MAX(SrNo) as srno
            FROM call_master
            WHERE ClientId = :cid
        """), {"cid": client_id}).mappings().first()

        srno = (last["srno"] or 0) + 1

        static_values[2] = srno
        static_values[3] = srno

        values = static_values + list(mapped_data.values())
        value_str = "'" + "','".join(map(str, values)) + "'"

        insert_sql = f"INSERT INTO call_master ({column_str}) VALUES ({value_str})"

        db.execute(text(insert_sql))
        db.commit()

    # 🔥 SMS + CRON (same as PHP)
    sms = db.execute(text("""
        SELECT smsText FROM tbl_sms
        WHERE clientId = :cid
        AND sendType='0' AND alertType='Alert'
        AND (category='Whatsapp' OR category='All')
        LIMIT 1
    """), {"cid": client_id}).mappings().first()

    sms_text = sms["smsText"] if sms else ""

    matrix = db.execute(text("""
        SELECT alertType, alertOn, personName, email, mobileno, tat
        FROM tbl_matrix
        WHERE clientId = :cid
        AND (categoryName='Whatsapp' OR categoryName='All')
    """), {"cid": client_id}).mappings().all()

    for m in matrix:
        db.execute(text("""
            INSERT INTO crone_job
            (clientId, bpo, data_id, alertType, alertOn, personName,
             email, mobileNo, tat, msg, createdate)
            VALUES (:cid, '0', :id, :alertType, :alertOn, :personName,
                    :email, :mobileNo, :tat, :msg, NOW())
        """), {
            "cid": client_id,
            "id": srno,
            "alertType": m["alertType"],
            "alertOn": m["alertOn"],
            "personName": m["personName"],
            "email": m["email"],
            "mobileNo": m["mobileno"],
            "tat": m["tat"],
            "msg": sms_text
        })

    db.commit()

    return {
        "status": "success",
        "message": "Data inserted successfully",
        "In Call Id": srno
    }

############################################################   Google Sheet ############################################

GOOGLE_SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")
GOOGLE_SCRIPT_URL1 = os.getenv("GOOGLE_SCRIPT_URL1")

LAST_HASH = None


def serialize_row(row):
    new_row = {}
    for k, v in row.items():
        if v is None:
            new_row[k] = ""
        elif hasattr(v, "isoformat"):
            new_row[k] = v.isoformat()
        else:
            new_row[k] = str(v)
    return new_row


def generate_hash(data):
    """Create hash of data to detect changes"""
    data_str = json.dumps(data, sort_keys=True)
    return hashlib.md5(data_str.encode()).hexdigest()

def run_push_to_sheet(from_date=None, to_date=None):
    global LAST_HASH

    db_gen = get_db2()
    db: Session = next(db_gen)

    try:
        # ✅ Default = today
        if not from_date or not to_date:
            from_date = to_date = date.today().strftime("%Y-%m-%d")

        query = """
        SELECT 
            DATE(event_time) AS CallDate,
            u.full_name AS UserName,
            vc.user AS ID,
            SUM(IF(lead_id>0 AND status IS NOT NULL AND LENGTH(status)>0,1,0)) AS Calls,
            SEC_TO_TIME(SUM(IF(wait_sec>5000,0,wait_sec)+talk_sec+dispo_sec+IF(pause_sec>5000,0,pause_sec))) AS LoginTime,
            SEC_TO_TIME(SUM(IF(wait_sec>5000,0,wait_sec))) AS wait_sec,
            SEC_TO_TIME(SUM(talk_sec)) AS talk_sec,
            SEC_TO_TIME(SUM(dispo_sec)) AS dispo_sec,
            SEC_TO_TIME(SUM(IF(pause_sec>5000,0,pause_sec))) AS pause_sec,
            SEC_TO_TIME(SUM(dead_sec)) AS dead_sec,
            vc.campaign_id
        FROM vicidial_agent_log vc
        JOIN vicidial_users u ON vc.user = u.user
        WHERE DATE(event_time) BETWEEN :from_date AND :to_date
        GROUP BY DATE(event_time), vc.campaign_id, vc.user;
        """

        result = db.execute(
            text(query),
            {"from_date": from_date, "to_date": to_date}
        ).mappings().all()

        data = [serialize_row(dict(row)) for row in result]

        # 🔥 STEP 1: Hash check (prevents duplicate push)
        current_hash = generate_hash(data)

        if LAST_HASH == current_hash:
            print("⏭️ No data change, skipping push")
            return {"status": "skipped"}

        LAST_HASH = current_hash

        # 🔥 STEP 2: Send
        response = requests.post(
            GOOGLE_SCRIPT_URL,
            json={"data": data},
            timeout=10
        )

        print(f"✅ Sheet updated | rows={len(data)}")

        return {"rows": len(data), "status": response.text}

    finally:
        db_gen.close()


@router.get("/push-to-sheet")
def push_to_google_sheet(from_date: str = None, to_date: str = None):
    print(f"Manual trigger | from={from_date} to={to_date}")

    result = run_push_to_sheet(from_date, to_date)

    return {
        "message": "Push triggered",
        "result": result
    }

############################################################ SLA Code ##################################################

def get_sla_clientwise_data(req, db2: Session, db: Session):

    # ---------------- Fetch campaigns ----------------
    rows = db.execute(text("""
        SELECT campaignid, company_id, company_name
        FROM registration_master
        WHERE status='A' AND is_dd_client='1'
    """)).fetchall()

    client_campaigns = {}
    for r in rows:
        campaigns = []
        if r.campaignid:
            campaigns = [c.strip().strip("'") for c in r.campaignid.split(",") if c.strip()]

        client_campaigns[r.company_id] = {
            "company_name": r.company_name,
            "campaigns": campaigns
        }

    # ---------------- DATA PREP ----------------
    all_data = {}

    for company_id, info in client_campaigns.items():
        company_name = info["company_name"]
        campaigns = info["campaigns"]

        if company_name not in all_data:
            all_data[company_name] = {
                "Client Name": company_name,
                "Offered": 0,
                "Handled": 0,
                "Calls Ans (20 Sec)": 0,
                "Total Calls Abandoned": 0,
                "Abnd Within (20)": 0,
                "Total Talk Time_sec": 0,
                "AHT_total": 0,
                "RL": 0
            }

        for campaign in campaigns:
            sql = """
                SELECT 
                    t2.campaign_id,
                    t2.user,
                    t2.queue_seconds,
                    dispo_sec,
                    talk_sec,
                    pause_sec,
                    wait_sec,
                    t1.length_in_sec
                FROM asterisk.vicidial_closer_log t2
                LEFT JOIN asterisk.vicidial_users vu ON t2.user = vu.user
                LEFT JOIN asterisk.call_log t1 ON t1.uniqueid = t2.uniqueid
                LEFT JOIN asterisk.vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid AND t2.user = t3.user
                WHERE DATE(t2.call_date) BETWEEN :from_date AND :to_date
                  AND t2.term_reason <> 'AFTERHOURS'
                  AND t2.lead_id IS NOT NULL
                  AND t2.campaign_id = :campaign
            """

            rows = db2.execute(text(sql), {
                "from_date": req.from_date,
                "to_date": req.to_date,
                "campaign": campaign
            }).mappings().all()

            for r in rows:
                data = all_data[company_name]

                data["Offered"] += 1

                if r["user"] != "VDCL":
                    data["Handled"] += 1
                    data["AHT_total"] += (r["length_in_sec"] or 0)

                    if (r["queue_seconds"] or 0) <= 20:
                        data["Calls Ans (20 Sec)"] += 1
                else:
                    data["Total Calls Abandoned"] += 1

                    if (r["queue_seconds"] or 0) <= 20:
                        data["Abnd Within (20)"] += 1

                data["Total Talk Time_sec"] += (
                    (r["talk_sec"] or 0) +
                    (r["pause_sec"] or 0) +
                    (r["wait_sec"] or 0) +
                    (r["dispo_sec"] or 0)
                )

    # ---------------- FINAL CALC ----------------
    result = []

    for _, d in all_data.items():
        handled = d["Handled"]
        offered = d["Offered"]

        d["Total Talk Time"] = d["Total Talk Time_sec"]

        d["SL% (20 Sec)"] = round((d["Calls Ans (20 Sec)"] * 100 / handled), 2) if handled else 0
        d["AL"] = round((handled * 100 / offered), 2) if offered else 0
        d["AHT (In Sec)"] = round(d["AHT_total"] / handled) if handled else 0

        result.append(d)

    return result


def run_sla_push_to_sheet():
    global LAST_HASH

    db_gen = get_db4()
    db = next(db_gen)

    db2_gen = get_db2()
    db2 = next(db2_gen)

    try:
        class Req:
            company_id = "ALL"
            from_date = date.today().strftime("%Y-%m-%d")
            to_date = date.today().strftime("%Y-%m-%d")
            sd_type = "0"
            filter_type = "with_0"

        req = Req()

        # 🔥 Get data
        data = get_sla_clientwise_data(req, db2, db)

        # 🔥 HASH CHECK (NO DUPLICATE PUSH)
        current_hash = generate_hash(data)

        if LAST_HASH == current_hash:
            print("⏭️ No change, skipping")
            return

        LAST_HASH = current_hash

        # 🔥 PUSH TO GOOGLE SHEET
        response = requests.post(
            GOOGLE_SCRIPT_URL1,
            json={"data": data},
            timeout=10
        )

        print(f"✅ SLA Sheet updated | rows={len(data)} | status={response.status_code}")

    except Exception as e:
        print("❌ Error:", e)

    finally:
        db_gen.close()
        db2_gen.close()


from pydantic import BaseModel
from typing import List, Optional


class FieldConfig(BaseModel):
    fields: List[str]
    list_id: Optional[int] = None


def generate_token(client_id: int):
    token_data = str(client_id)

    token = hmac.new(
        SECRET_KEY.encode(),
        token_data.encode(),
        hashlib.sha256
    ).hexdigest()

    auth_token = base64.b64encode(
        f"{token_data}|{token}".encode()
    ).decode()

    return auth_token



@router.post("/save-client-fields")
async def save_client_fields(
    payload: FieldConfig,
    client_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    fields = payload.fields
    list_id = payload.list_id

    if not client_id:
        raise HTTPException(400, "client_id is required")

    # 🔥 Generate token
    new_token = generate_token(client_id)

    try:
        # 🔁 Clear old fields
        db.execute(text("""
            DELETE FROM shopify_leads
            WHERE client_id = :cid
        """), {"cid": client_id})

        # 🔥 Insert fields
        for field in fields:
            if field:
                db.execute(text("""
                    INSERT INTO shopify_leads (client_id, field_name)
                    VALUES (:cid, :field)
                """), {
                    "cid": client_id,
                    "field": field.strip()
                })

        # 🔥 Save token
        existing = db.execute(text("""
            SELECT 1
            FROM shopify_tokens_new
            WHERE client_id = :cid
            LIMIT 1
        """), {"cid": client_id}).fetchone()

        if existing:
            db.execute(text("""
                UPDATE shopify_tokens_new
                SET token = :token,
                list_id = :list_id
                WHERE client_id = :cid
            """), {
                "cid": client_id,
                "token": new_token,
                "list_id": list_id
            })
        else:
            db.execute(text("""
                INSERT INTO shopify_tokens_new (client_id, token,list_id)
                VALUES (:cid, :token,:list_id)
            """), {
                "cid": client_id,
                "token": new_token,
                "list_id": list_id
            })

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

    return {
        "status": "success",
        "message": "Field names saved successfully",
        "token": new_token
    }




@router.post("/shopify/webhook-api")
async def save_vicidial_lead(
    request: Request,
    auth_token: str = Header(None, alias="Auth-Token"),
    db2: Session = Depends(get_db2),
    db: Session = Depends(get_db4),
):
    # 🔐 AUTH
    if not auth_token:
        raise HTTPException(403, "Missing Auth-Token")

    client_id = verify_auth_token(auth_token)

    if not client_id:
        raise HTTPException(403, "Invalid Auth-Token")

    token_data = db.execute(text("""
        SELECT list_id
        FROM shopify_tokens_new
        WHERE client_id = :cid
        LIMIT 1
    """), {"cid": client_id}).fetchone()

    list_id = token_data.list_id if token_data else ""

    data = await request.json()

    try:
        db2.execute(text("""
            INSERT INTO vicidial_list (
                phone_number, title, first_name, middle_initial, last_name, status,list_id,
                address1, address2, address3, city, state, province, phone_code, called_since_last_reset, gmt_offset_now,
                postal_code, country_code, gender, date_of_birth, entry_date, modify_date,
                alt_phone, email, comments
            ) VALUES (
                :phone_number, :title, :first_name, :middle_initial, :last_name, :status,:list_id,
                :address1, :address2, :address3, :city, :state, :province, :phone_code, :called_since_last_reset, :gmt_offset_now,
                :postal_code, :country_code, :gender, :date_of_birth,  NOW(), NOW(),
                :alt_phone, :email, :comments
            )
        """), {
            "phone_number": data.get("phone_number") or "",

            "title": data.get("title") or "",
            "first_name": data.get("first_name") or "",
            "middle_initial": data.get("middle_initial") or "",
            "last_name": data.get("last_name") or "",
            "status": "NEW",
            "list_id": list_id,

            "address1": data.get("address1") or "",
            "address2": data.get("address2") or "",
            "address3": data.get("address3") or "",

            "city": data.get("city") or "",
            "state": data.get("state") or "",
            "province": data.get("province") or "",
            "phone_code": '1',
            "called_since_last_reset": "N",
            "gmt_offset_now": "5.50",

            "postal_code": data.get("postal_code") or "",
            "country_code": data.get("country_code") or "",

            "gender": data.get("gender") or "",
            "date_of_birth": data.get("date_of_birth") or "",

            "alt_phone": data.get("alt_phone") or "",
            "email": data.get("email") or "",

            "comments": data.get("comments") or ""
        })

        db2.commit()

    except Exception as e:
        db2.rollback()
        raise HTTPException(500, str(e))

    return {
        "status": "success",
        "message": "Webhook triggered successfully"
    }




@router.get("/get-client-fields")
def get_client_fields(
    client_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    if not client_id:
        raise HTTPException(400, "client_id is required")

    try:
        rows = db.execute(text("""
            SELECT field_name
            FROM shopify_leads
            WHERE client_id = :cid
        """), {"cid": client_id}).fetchall()

        fields = [row[0] for row in rows]

        return {
            "status": "success",
            "client_id": client_id,
            "fields": fields
        }

    except Exception as e:
        raise HTTPException(500, str(e))
    




@router.get("/get-shopify-token")
def get_shopify_token(
    client_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    if not client_id:
        raise HTTPException(400, "client_id is required")

    try:
        row = db.execute(text("""
            SELECT token, list_id
            FROM shopify_tokens_new
            WHERE client_id = :cid
            LIMIT 1
        """), {"cid": client_id}).mappings().first()

        if not row:
            return {
                "status": "success",
                "client_id": client_id,
                "token": None,
                "message": "No token found"
            }

        return {
            "status": "success",
            "client_id": client_id,
            "token": row["token"],
            "list_id": row["list_id"]
        }

    except Exception as e:
        raise HTTPException(500, str(e))


########################## Webhook Sokudu #############


@router.post("/webhook/Sokudu")
async def dashboard_webhook(
    request: Request,
    db: Session = Depends(get_db4)
):

    # Receive complete payload
    data = await request.json()

    # Save complete payload
    payload = json.dumps(data)

    # Extract data safely
    feedback = data.get("feedback", {})

    def feedback_value(key):
        value = feedback.get(key)

        if isinstance(value, dict):
            return value.get("value")

        return value

    db.execute(
        text("""
        INSERT INTO dashboard_webhook_sokudu
        (
            phone,
            campaign,
            call_time,
            status,
            call_duration,
            call_status,
            recording_url,
            direction,
            outcome,
            classification,
            disposition,
            reference_id,
            account_id,
            webhook_id,
            call_url,
            terminated_by,
            caller_city,
            issue_description,
            callback_requested,
            issue_category,
            scooter_model,
            whatsapp_number,
            transcript,
            payload
        )
        VALUES
        (
            :phone,
            :campaign,
            :call_time,
            :status,
            :call_duration,
            :call_status,
            :recording_url,
            :direction,
            :outcome,
            :classification,
            :disposition,
            :reference_id,
            :account_id,
            :webhook_id,
            :call_url,
            :terminated_by,
            :caller_city,
            :issue_description,
            :callback_requested,
            :issue_category,
            :scooter_model,
            :whatsapp_number,
            :transcript,
            :payload
        )
        """),
        {
            "phone": data.get("phone"),
            "campaign": data.get("campaign"),
            "call_time": data.get("time"),
            "status": data.get("status"),
            "call_duration": data.get("call_duration"),
            "call_status": data.get("call_status"),
            "recording_url": data.get("call_recording_url"),
            "direction": data.get("direction"),
            "outcome": data.get("outcome"),
            "classification": data.get("classification"),
            "disposition": data.get("disposition"),
            "reference_id": data.get("reference_id"),
            "account_id": data.get("account_id"),
            "webhook_id": data.get("id"),
            "call_url": data.get("call_url"),
            "terminated_by": data.get("call_terminated_by"),

            "caller_city": feedback_value("caller_city"),
            "issue_description": feedback_value("issue_description"),
            "callback_requested": feedback_value("callback_requested"),
            "issue_category": feedback_value("issue_category"),
            "scooter_model": feedback_value("scooter_model"),
            "whatsapp_number": feedback_value("whatsapp_number_shared"),

            "transcript": json.dumps(data.get("transcript", [])),
            "payload": json.dumps(data)
        }
    )

    db.commit()

    return {
        "status": "success",
        "message": "Webhook saved successfully",
        "received_payload": data
    }


##################################  InternetWale Leads Get ###################################

import requests
from sqlalchemy import text

BASE_URL = "https://internetwale.com/api/v1"

EMAIL = "saurabh.singh@dialdesk.net"
PASSWORD = "Solu@8957"





def save_leads(db2, response, list_id):

    if isinstance(response, list):
        leads = response
    else:
        leads = response.get("data", [])
    for lead in leads:

        phone = (lead.get("phone") or "").strip()[-10:]

        if not phone:
            continue

        # Check duplicate
        exists = db2.execute(
            text("""
                SELECT 1
                FROM vicidial_list
                WHERE phone_number = :phone
                  AND list_id = :list_id
                LIMIT 1
            """),
            {
                "phone": phone,
                "list_id": list_id
            }
        ).fetchone()

        print(exists,"exists==")

        if exists:
            continue

        db2.execute(text("""
            INSERT INTO vicidial_list (
                phone_number, title, first_name, middle_initial, last_name,
                status, list_id,
                address1, address2, address3,
                city, state, province,
                phone_code, called_since_last_reset, gmt_offset_now,
                postal_code, country_code,
                gender, date_of_birth,
                entry_date, modify_date,
                alt_phone, email, comments
            )
            VALUES (
                :phone_number, :title, :first_name, :middle_initial, :last_name,
                :status, :list_id,
                :address1, :address2, :address3,
                :city, :state, :province,
                :phone_code, :called_since_last_reset, :gmt_offset_now,
                :postal_code, :country_code,
                :gender, :date_of_birth,
                NOW(), NOW(),
                :alt_phone, :email, :comments
            )
        """), {
            "phone_number": phone,
            "title": "",
            "first_name": lead.get("contact_name") or lead.get("typed_contact_name") or "",
            "middle_initial": "",
            "last_name": "",
            "status": "NEW",
            "list_id": list_id,
            "address1": lead.get("contact_address") or "",
            "address2": "",
            "address3": "",
            "city": lead.get("locality") or "",
            "state": "",
            "province": "",
            "phone_code": "1",
            "called_since_last_reset": "N",
            "gmt_offset_now": "5.50",
            "postal_code": lead.get("pincode") or "",
            "country_code": "",
            "gender": "",
            "date_of_birth": "",
            "alt_phone": "",
            "email": "",
            "comments": lead.get("remarks") or ""
        })

    db2.commit()

def get_token():
    url = f"{BASE_URL}/auth/email/login"

    payload = {
        "email": EMAIL,
        "password": PASSWORD
    }

    response = requests.post(url, json=payload)
    response.raise_for_status()

    data = response.json()

    # Update this key if your API returns a different structure
    return data["token"]



def get_call_followups():
    db_gen = get_db2()
    db: Session = next(db_gen)

    try:
        token = get_token()
        list_id = 4444444

        headers = {
            "Authorization": f"Bearer {token}"
        }

        page = 23

        while True:

            url = f"{BASE_URL}/admin/call-follow-ups?page={page}&limit=20"

            print(f"Fetching Page {page}")

            response = requests.get(url, headers=headers)
            response.raise_for_status()

            result = response.json()

            leads = result.get("data", [])

            if not leads:
                break

            save_leads(db, leads, list_id)

            total_pages = result.get("totalPages", 1)

            if page >= total_pages:
                break

            page += 1

        print("All pages synced successfully.")


    finally:
        db.close()



