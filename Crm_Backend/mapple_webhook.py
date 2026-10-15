import hmac
import hashlib
import base64
import secrets
from fastapi import APIRouter, Depends, Request, Header, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import Optional
from database import get_db2, get_db4

SECRET_KEY = "dialdesk"

router = APIRouter(prefix="/mapple", tags=["Mapple Data Webhook"])

# The 25 lead columns of mapple_data
LEAD_COLUMNS = [
    "phone_number", "title", "first_name", "middle_initial", "last_name",
    "email", "address1", "address2", "address3", "city", "state", "province",
    "postal_code", "country_code", "gender", "date_of_birth", "alt_phone",
    "security_phrase", "comments",
    "extra_column1", "extra_column2", "extra_column3",
    "extra_column4", "extra_column5", "extra_column6",
]

# Accept the frontend's extra_col_N spelling as an alias for extra_columnN
ALIASES = {f"extra_col_{i}": f"extra_column{i}" for i in range(1, 7)}


def build_token(client_id: int, campaign_id: int, list_id: int) -> str:
    message = f"{client_id}|{campaign_id}|{list_id}"
    sig = hmac.new(SECRET_KEY.encode(), message.encode(), hashlib.sha256).hexdigest()
    return base64.b64encode(f"{message}|{sig}|{secrets.token_hex(8)}".encode()).decode()


def clean_record(record: dict) -> dict:
    """Keep only known lead columns, applying extra_col_N aliases."""
    clean = {}
    for key, value in record.items():
        col = ALIASES.get(key, key)
        if col in LEAD_COLUMNS:
            clean[col] = value if value is not None else ""
    return clean


# -------------------- 1. Create Webhook (client + campaign + list -> token) --------------------
@router.post("/webhook")
def create_webhook(
    client_id: int = Query(...),
    campaign_id: int = Query(...),
    list_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    try:
        campaign = db.execute(text("""
            SELECT CampaignName FROM ob_campaign
            WHERE id = :campaign_id
            LIMIT 1
        """), {"campaign_id": campaign_id}).fetchone()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        token = build_token(client_id, campaign_id, list_id)

        existing = db.execute(text("""
            SELECT id FROM mapple_webhook_config
            WHERE client_id = :client_id
            AND campaign_id = :campaign_id
            AND list_id = :list_id
            LIMIT 1
        """), {
            "client_id": client_id,
            "campaign_id": campaign_id,
            "list_id": list_id
        }).fetchone()

        if existing:
            # Same client+campaign+list: refresh the token on the existing row
            db.execute(text("""
                UPDATE mapple_webhook_config
                SET token = :token, campaign_name = :campaign_name, updated_at = NOW()
                WHERE id = :id
            """), {
                "id": existing[0],
                "token": token,
                "campaign_name": campaign[0]
            })
            config_id = existing[0]
        else:
            result = db.execute(text("""
                INSERT INTO mapple_webhook_config
                (client_id, campaign_id, campaign_name, list_id, token)
                VALUES (:client_id, :campaign_id, :campaign_name, :list_id, :token)
            """), {
                "client_id": client_id,
                "campaign_id": campaign_id,
                "campaign_name": campaign[0],
                "list_id": list_id,
                "token": token
            })
            config_id = result.lastrowid

        db.commit()

        return {
            "status": "success",
            "message": "Webhook created successfully",
            "id": config_id,
            "client_id": client_id,
            "campaign_id": campaign_id,
            "campaign_name": campaign[0],
            "list_id": list_id,
            "token": token,
            "endpoint": "https://crmapi.dialdesk.in/mapple/data",
            "headers": {
                "Content-Type": "application/json",
                "Auth-Token": token
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 2. List Webhooks --------------------
@router.get("/webhooks")
def list_webhooks(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db4)
):
    try:
        query = """
            SELECT id, client_id, campaign_id, campaign_name, list_id, token, created_at
            FROM mapple_webhook_config
        """
        params = {}
        if client_id:
            query += " WHERE client_id = :client_id"
            params["client_id"] = client_id
        query += " ORDER BY id DESC"

        rows = db.execute(text(query), params).mappings().all()

        return [
            {
                "id": r["id"],
                "client_id": r["client_id"],
                "campaign_id": r["campaign_id"],
                "campaign_name": r["campaign_name"],
                "list_id": r["list_id"],
                "token": r["token"],
                "created_at": str(r["created_at"]),
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 3. View Webhook --------------------
@router.get("/webhook/{config_id}")
def get_webhook(config_id: int, db: Session = Depends(get_db4)):
    try:
        row = db.execute(text("""
            SELECT id, client_id, campaign_id, campaign_name, list_id, token, created_at
            FROM mapple_webhook_config
            WHERE id = :id
        """), {"id": config_id}).mappings().first()

        if not row:
            raise HTTPException(status_code=404, detail="Webhook not found")

        return {
            "id": row["id"],
            "client_id": row["client_id"],
            "campaign_id": row["campaign_id"],
            "campaign_name": row["campaign_name"],
            "list_id": row["list_id"],
            "token": row["token"],
            "created_at": str(row["created_at"]),
            "endpoint": "https://crmapi.dialdesk.in/mapple/data",
            "headers": {
                "Content-Type": "application/json",
                "Auth-Token": row["token"],
            },
            "request_body": {
                "phone_number": "",
                "title": "",
                "first_name": "",
                "middle_initial": "",
                "last_name": "",
                "email": "",
                "address1": "",
                "address2": "",
                "address3": "",
                "city": "",
                "state": "",
                "province": "",
                "postal_code": "",
                "country_code": "",
                "gender": "",
                "date_of_birth": "",
                "alt_phone": "",
                "security_phrase": "",
                "comments": "",
                "extra_column1": "",
                "extra_column2": "",
                "extra_column3": "",
                "extra_column4": "",
                "extra_column5": "",
                "extra_column6": "",
            },
            "sample_response": {
                "status": "success",
                "message": "Sync completed. Inserted: 1, Errors: 0",
                "inserted": 1,
                "errors": 0,
                "total": 1,
                "id": 1,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 4. Delete Webhook --------------------
@router.delete("/webhook/{config_id}")
def delete_webhook(config_id: int, db: Session = Depends(get_db4)):
    try:
        existing = db.execute(
            text("SELECT id FROM mapple_webhook_config WHERE id = :id"),
            {"id": config_id}
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Webhook not found")

        db.execute(text("DELETE FROM mapple_webhook_config WHERE id = :id"), {"id": config_id})
        db.commit()

        return {"status": "success", "message": "Webhook deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 5. Send Data (uses the token) --------------------
@router.post("/data")
async def send_data(
    request: Request,
    auth_token: str = Header(None, alias="Auth-Token"),
    db: Session = Depends(get_db4)
):
    if not auth_token:
        raise HTTPException(status_code=403, detail="Missing Auth-Token")

    config = db.execute(text("""
        SELECT client_id, campaign_id, campaign_name, list_id
        FROM mapple_webhook_config
        WHERE token = :token
        LIMIT 1
    """), {"token": auth_token}).fetchone()

    if not config:
        raise HTTPException(status_code=403, detail="Invalid Auth-Token")

    client_id, campaign_id, campaign_name, list_id = config

    data = await request.json()

    if isinstance(data, dict):
        records = [data]
    elif isinstance(data, list):
        records = data
    else:
        raise HTTPException(status_code=400, detail="Request body must be an object or array")

    create_date = datetime.now()
    inserted = 0
    errors = 0
    row_id = None

    for record in records:
        try:
            values = clean_record(record)
            phone = str(values.get("phone_number") or "").strip()

            if not phone:
                errors += 1
                continue

            values["phone_number"] = phone

            # # Skip if this phone is already saved for the list
            # existing = db.execute(text("""
            #     SELECT id FROM mapple_data
            #     WHERE list_id = :list_id
            #     AND RIGHT(phone_number, 10) = :phone_key
            #     LIMIT 1
            # """), {
            #     "list_id": list_id,
            #     "phone_key": phone[-10:]
            # }).fetchone()

            # if existing:
            #     return {
            #         "status": "duplicate",
            #         "message": f"Phone number {phone} already exists in list {list_id}",
            #         "phone_number": phone,
            #         "id": None,
            #     }

            cols = ["client_id", "campaign_id", "campaign_name", "list_id",
                    "inserted", "created_at"]
            params = {
                "client_id": client_id,
                "campaign_id": campaign_id,
                "campaign_name": campaign_name,
                "list_id": list_id,
                "inserted": 0,
                "created_at": create_date,
            }

            for col in LEAD_COLUMNS:
                if col in values:
                    cols.append(col)
                    params[col] = values[col]

            result = db.execute(text(f"""
                INSERT INTO mapple_data ({", ".join(cols)})
                VALUES ({", ".join(f":{c}" for c in cols)})
            """), params)

            row_id = result.lastrowid
            inserted += 1

        except Exception:
            errors += 1
            continue

    db.commit()

    return {
        "status": "success",
        "message": f"Sync completed. Inserted: {inserted}, Errors: {errors}",
        "inserted": inserted,
        "errors": errors,
        "total": len(records),
        "id": row_id,
    }


# -------------------- 6. Scheduler: push old mapple_data rows --------------------
# Picks mapple_data rows (inserted = 0) whose extra_column6 date is at least
# 299 days older than today, and saves them into ob_allocation_name,
# ob_campaign_data and vicidial_list (same shape as the OB webhook), then
# marks the row inserted = 1.

def _push_mapple_row(db: Session, db2: Session, row: dict) -> bool:
    row = dict(row)

    campaign_name = row.get("campaign_name") or f"Campaign{row.get('campaign_id')}"
    now = datetime.now()
    allocation_name = f"{campaign_name}_{now.day}{now.strftime('%b')}"

    allocation = db.execute(text("""
        SELECT id FROM ob_allocation_name
        WHERE ClientId = :client_id
        AND CampaignId = :campaign_id
        AND AllocationName = :allocation_name
        AND AllocationStatus = 'A'
        LIMIT 1
    """), {
        "client_id": row.get("client_id"),
        "campaign_id": row.get("campaign_id"),
        "allocation_name": allocation_name,
    }).fetchone()

    if allocation:
        allocation_id = allocation[0]
    else:
        result = db.execute(text("""
            INSERT INTO ob_allocation_name
            (ClientId, CampaignId, AllocationName, CreateDate, TotalCount, list_id, upload_type, AllocationStatus)
            VALUES (:ClientId, :CampaignId, :AllocationName, :CreateDate, :TotalCount, :list_id, 'pd', 'A')
        """), {
            "ClientId": row.get("client_id"),
            "CampaignId": row.get("campaign_id"),
            "AllocationName": allocation_name,
            "CreateDate": now,
            "TotalCount": len(LEAD_COLUMNS),
            "list_id": row.get("list_id"),
        })
        allocation_id = result.lastrowid

    field_values = {f"Field{i}": row.get(col) for i, col in enumerate(LEAD_COLUMNS, start=1)}

    phone = str(field_values.get("Field1") or row.get("phone_number") or "").strip()
    if not phone:
        return False

    ob_result = db.execute(text("""
        INSERT INTO ob_campaign_data
        (AllocationId, CreationDate,
         Field1, Field2, Field3, Field4, Field5,
         Field6, Field7, Field8, Field9, Field10,
         Field11, Field12, Field13, Field14, Field15,
         Field16, Field17, Field18, Field19, Field20,
         Field21, Field22, Field23, Field24, Field25)
        VALUES (:AllocationId, :CreationDate,
                :Field1, :Field2, :Field3, :Field4, :Field5,
                :Field6, :Field7, :Field8, :Field9, :Field10,
                :Field11, :Field12, :Field13, :Field14, :Field15,
                :Field16, :Field17, :Field18, :Field19, :Field20,
                :Field21, :Field22, :Field23, :Field24, :Field25)
    """), {
        "AllocationId": allocation_id,
        "CreationDate": now,
        **field_values,
    })
    source_id = ob_result.lastrowid

    vicidial_data = {
        "list_id": row.get("list_id"),
        "status": "NEW",
        "called_since_last_reset": "N",
        "phone_code": "1",
        "gmt_offset_now": "5.50",
        "source_id": str(source_id),
        "entry_date": now,
    }
    for col in LEAD_COLUMNS:
        if not col.startswith("extra_column"):
            vicidial_data[col] = row.get(col) or ""

    insert_cols = list(vicidial_data.keys())
    db2.execute(text(
        f"INSERT INTO vicidial_list ({', '.join(insert_cols)}) "
        f"VALUES ({', '.join(':' + c for c in insert_cols)})"
    ), vicidial_data)

    db.execute(text("""
        UPDATE mapple_data
        SET inserted = 1, updated_at = NOW()
        WHERE id = :id
    """), {"id": row.get("id")})

    return True


def push_old_mapple_data():
    """Scheduler job: forward old mapple_data rows into the OB tables."""
    db_gen = get_db4()
    db = next(db_gen)
    db2_gen = get_db2()
    db2 = next(db2_gen)

    pushed = 0
    try:
        rows = db.execute(text("""
            SELECT * FROM mapple_data
            WHERE inserted = 0
            AND extra_column6 IS NOT NULL
            AND extra_column6 <> ''
            AND STR_TO_DATE(extra_column6, '%Y-%m-%d') <= DATE_SUB(CURDATE(), INTERVAL 299 DAY)
            LIMIT 500
        """)).mappings().all()

        for row in rows:
            try:
                if _push_mapple_row(db, db2, row):
                    db.commit()
                    db2.commit()
                    pushed += 1
                else:
                    db.rollback()
                    db2.rollback()
            except Exception:
                db.rollback()
                db2.rollback()
                continue

        print(f"✅ Mapple push scheduler: pushed {pushed} row(s)")
    except Exception as e:
        print(f"❌ Mapple push scheduler failed: {e}")
    finally:
        db.close()
        db2.close()
