import json
import hmac
import hashlib
import base64
from fastapi import APIRouter, Depends, Request, Header, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from database import get_db4, get_db2
from pydantic import BaseModel
from typing import Optional, List

SECRET_KEY = "dialdesk"

router = APIRouter(prefix="/ob-sync", tags=["OB Campaign Sync"])


# -------------------- Pydantic Models --------------------
class SyncConfigSave(BaseModel):
    client_id: int
    campaign_id: int
    campaign_name: str
    list_id: int
    column_mapping: dict


# -------------------- Helpers --------------------
def generate_allocation_name(campaign_name: str) -> str:
    now = datetime.now()
    day = now.day
    month = now.strftime("%b")
    return f"{campaign_name}_{day}{month}"


# -------------------- Token Helpers --------------------
def generate_token(client_id: int, campaign_id: int, list_id: int) -> str:
    message = f"{client_id}|{campaign_id}|{list_id}"
    hmac_hash = hmac.new(
        SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    auth_token = base64.b64encode(f"{message}|{hmac_hash}".encode()).decode()
    return auth_token


def verify_token_token(auth_token: str):
    try:
        decoded = base64.b64decode(auth_token).decode()
        parts = decoded.split("|")
        if len(parts) != 4:
            return None

        client_id, campaign_id, list_id, received_hmac = parts

        message = f"{client_id}|{campaign_id}|{list_id}"
        expected_hmac = hmac.new(
            SECRET_KEY.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        if hmac.compare_digest(expected_hmac, received_hmac):
            return {"client_id": int(client_id), "campaign_id": int(campaign_id), "list_id": int(list_id)}

    except Exception:
        return None

    return None


# -------------------- 1. Save Config --------------------
@router.post("/save")
def save_sync_config(payload: SyncConfigSave, db: Session = Depends(get_db4)):
    try:
        # Check duplicate
        existing = db.execute(text("""
            SELECT id FROM ob_campaign_sync_config
            WHERE client_id = :client_id
            AND campaign_id = :campaign_id
            AND list_id = :list_id
            AND status = 'A'
            LIMIT 1
        """), {
            "client_id": payload.client_id,
            "campaign_id": payload.campaign_id,
            "list_id": payload.list_id
        }).fetchone()

        token = generate_token(payload.client_id, payload.campaign_id, payload.list_id)

        if existing:
            # Update existing
            db.execute(text("""
                UPDATE ob_campaign_sync_config
                SET column_mapping = :column_mapping,
                    campaign_name = :campaign_name,
                    token = :token,
                    updated_at = NOW()
                WHERE id = :id
            """), {
                "id": existing[0],
                "column_mapping": json.dumps(payload.column_mapping),
                "campaign_name": payload.campaign_name,
                "token": token
            })
        else:
            # Insert new
            db.execute(text("""
                INSERT INTO ob_campaign_sync_config
                (client_id, campaign_id, campaign_name, list_id,
                 column_mapping, token, status, created_at)
                VALUES
                (:client_id, :campaign_id, :campaign_name, :list_id,
                 :column_mapping, :token, 'A', NOW())
            """), {
                "client_id": payload.client_id,
                "campaign_id": payload.campaign_id,
                "campaign_name": payload.campaign_name,
                "list_id": payload.list_id,
                "column_mapping": json.dumps(payload.column_mapping),
                "token": token
            })

        db.commit()

        return {
            "status": "success",
            "message": "Sync config saved successfully",
            "token": token
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 2. List Configs --------------------
@router.get("/configs")
def list_configs(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db4)
):
    try:
        query = """
            SELECT id, client_id, campaign_id, campaign_name, list_id,
                   column_mapping, token, status,
                   created_at, updated_at
            FROM ob_campaign_sync_config
            WHERE status = 'A'
        """
        params = {}

        if client_id:
            query += " AND client_id = :client_id"
            params["client_id"] = client_id

        query += " ORDER BY created_at DESC"

        rows = db.execute(text(query), params).mappings().all()

        configs = []
        for row in rows:
            configs.append({
                "id": row["id"],
                "client_id": row["client_id"],
                "campaign_id": row["campaign_id"],
                "campaign_name": row["campaign_name"],
                "list_id": row["list_id"],
                "column_mapping": json.loads(row["column_mapping"]) if row["column_mapping"] else {},
                "token": row["token"],
                "status": row["status"],
                "created_at": str(row["created_at"]),
                "updated_at": str(row["updated_at"])
            })

        return configs

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 3. Get Single Config --------------------
@router.get("/config/{config_id}")
def get_config(config_id: int, db: Session = Depends(get_db4)):
    try:
        row = db.execute(text("""
            SELECT id, client_id, campaign_id, campaign_name, list_id,
                   column_mapping, token, status,
                   created_at, updated_at
            FROM ob_campaign_sync_config
            WHERE id = :id AND status = 'A'
        """), {"id": config_id}).mappings().first()

        if not row:
            raise HTTPException(status_code=404, detail="Config not found")

        return {
            "id": row["id"],
            "client_id": row["client_id"],
            "campaign_id": row["campaign_id"],
            "campaign_name": row["campaign_name"],
            "list_id": row["list_id"],
            "column_mapping": json.loads(row["column_mapping"]) if row["column_mapping"] else {},
            "token": row["token"],
            "status": row["status"],
            "created_at": str(row["created_at"]),
            "updated_at": str(row["updated_at"])
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 4. Delete Config (Soft) --------------------
@router.put("/config/{config_id}")
def delete_config(config_id: int, db: Session = Depends(get_db4)):
    try:
        existing = db.execute(text("""
            SELECT id FROM ob_campaign_sync_config
            WHERE id = :id AND status = 'A'
        """), {"id": config_id}).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Config not found")

        db.execute(text("""
            UPDATE ob_campaign_sync_config
            SET status = 'D', updated_at = NOW()
            WHERE id = :id
        """), {"id": config_id})

        db.commit()

        return {"status": "success", "message": "Config deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 4b. List IDs mapped to a campaign --------------------
@router.get("/campaign-list-ids")
def campaign_list_ids(
    client_id: int = Query(...),
    campaign_id: Optional[int] = Query(None),
    db: Session = Depends(get_db4)
):
    try:
        query = """
            SELECT id, list_id
            FROM list_master
            WHERE client_id = :client_id
        """
        params = {"client_id": client_id}

        if campaign_id:
            query += " AND campaign_id = :campaign_id"
            params["campaign_id"] = campaign_id

        query += " ORDER BY id DESC"

        rows = db.execute(text(query), params).mappings().all()

        return [
            {"id": row["id"], "list_id": str(row["list_id"])}
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- 5. Webhook: Create Allocation + ob_campaign_data + vicidial_list --------------------
@router.post("/webhook")
async def sync_webhook(
    request: Request,
    auth_token: str = Header(None, alias="Auth-Token"),
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    # Auth check
    if not auth_token:
        raise HTTPException(status_code=403, detail="Missing Auth-Token")

    token_data = verify_token_token(auth_token)
    if not token_data:
        raise HTTPException(status_code=403, detail="Invalid Auth-Token")

    client_id = token_data["client_id"]
    campaign_id = token_data["campaign_id"]
    list_id = token_data["list_id"]

    # Fetch config
    config = db.execute(text("""
        SELECT id, column_mapping, campaign_name
        FROM ob_campaign_sync_config
        WHERE client_id = :client_id
        AND campaign_id = :campaign_id
        AND list_id = :list_id
        AND status = 'A'
        LIMIT 1
    """), {
        "client_id": client_id,
        "campaign_id": campaign_id,
        "list_id": list_id
    }).mappings().first()

    if not config:
        raise HTTPException(status_code=404, detail="Sync config not found")

    column_mapping = json.loads(config["column_mapping"]) if isinstance(config["column_mapping"], str) else config["column_mapping"]

    # Allocation name auto-generated each webhook hit: CampaignName_DayMon
    allocation_name = generate_allocation_name(config["campaign_name"] or f"Campaign{campaign_id}")

    # Parse request body → list of records
    data = await request.json()

    if isinstance(data, dict):
        records = [data]
    elif isinstance(data, list):
        records = data
    else:
        raise HTTPException(status_code=400, detail="Request body must be an object or array")

    create_date = datetime.now()

    # Reverse mapping: vicidial column → Field (e.g., phone_number → Field1)
    reverse_mapping = {v: k for k, v in column_mapping.items()}

    # 1️⃣ Create allocation in ob_allocation_name if it doesn't exist
    allocation_row = db.execute(text("""
        SELECT id FROM ob_allocation_name
        WHERE ClientId = :client_id
        AND CampaignId = :campaign_id
        AND AllocationName = :allocation_name
        AND AllocationStatus = 'A'
        LIMIT 1
    """), {
        "client_id": client_id,
        "campaign_id": campaign_id,
        "allocation_name": allocation_name
    }).fetchone()

    if not allocation_row:
        result = db.execute(text("""
            INSERT INTO ob_allocation_name
            (ClientId, CampaignId, AllocationName, CreateDate, TotalCount, list_id, upload_type, AllocationStatus)
            VALUES (:ClientId, :CampaignId, :AllocationName, :CreateDate, :TotalCount, :list_id, 'pd', 'A')
        """), {
            "ClientId": client_id,
            "CampaignId": campaign_id,
            "AllocationName": allocation_name,
            "CreateDate": create_date,
            "TotalCount": len(column_mapping),
            "list_id": list_id
        })
        allocation_id = result.lastrowid
    else:
        allocation_id = allocation_row[0]

    inserted = 0
    errors = 0

    # 2️⃣ Insert into ob_campaign_data + vicidial_list
    for record in records:
        try:
            # Build Field1..Field25 values from the incoming record keys
            field_values = {f"Field{i}": None for i in range(1, 26)}
            for key, value in record.items():
                field_key = reverse_mapping.get(key)
                if field_key:
                    field_values[field_key] = value

            # phone_number is required (comes via Field1)
            phone = field_values.get("Field1", "")
            if not phone:
                errors += 1
                continue

            # Insert into ob_campaign_data (db4)
            db.execute(text("""
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
                "CreationDate": create_date,
                **field_values
            })

            # Build vicidial_list values
            vicidial_data = {
                "list_id": list_id,
                "status": "NEW",
                "called_since_last_reset": "N",
                "phone_code": "1",
                "gmt_offset_now": "5.50",
                # "source_id": str(allocation_id),
                "entry_date": create_date
            }

            for field_key, vicidial_col in column_mapping.items():
                # Extra columns (extra_col_*) are stored only in ob_campaign_data,
                # never written into vicidial_list
                if vicidial_col and not str(vicidial_col).startswith("extra_col_"):
                    vicidial_data[vicidial_col] = field_values.get(field_key) or ""

            # Insert into vicidial_list (db2)
            insert_cols = list(vicidial_data.keys())
            placeholders = ", ".join([f":{k}" for k in insert_cols])
            col_names = ", ".join(insert_cols)

            db2.execute(text(f"""
                INSERT INTO vicidial_list ({col_names})
                VALUES ({placeholders})
            """), vicidial_data)

            inserted += 1

        except Exception as e:
            errors += 1
            continue

    db.commit()
    db2.commit()

    return {
        "status": "success",
        "message": f"Sync completed. Inserted: {inserted}, Errors: {errors}",
        "inserted": inserted,
        "errors": errors,
        "total": len(records),
        "allocation_id": allocation_id,
        "allocation_name": allocation_name
    }


# -------------------- 6. Get Webhook Info --------------------
@router.get("/webhook-info/{config_id}")
def get_webhook_info(config_id: int, db: Session = Depends(get_db4)):
    try:
        row = db.execute(text("""
            SELECT id, client_id, campaign_id, list_id, token, column_mapping
            FROM ob_campaign_sync_config
            WHERE id = :id AND status = 'A'
        """), {"id": config_id}).mappings().first()

        if not row:
            raise HTTPException(status_code=404, detail="Config not found")

        column_mapping = json.loads(row["column_mapping"]) if isinstance(row["column_mapping"], str) else row["column_mapping"]

        # Build sample request body from column_mapping
        request_sample = {}
        for field_key, vicidial_col in column_mapping.items():
            if vicidial_col:
                request_sample[vicidial_col] = ""

        return {
            "token": row["token"],
            # "endpoint": "http://127.0.0.1:8000/ob-sync/webhook",
            "endpoint": "https://crmapi.dialdesk.in/ob-sync/webhook",
            "headers": {
                "Content-Type": "application/json",
                "Auth-Token": row["token"]
            },
            "request_body": request_sample,
            "sample_response": {
                "status": "success",
                "message": "Sync completed. Inserted: 0, Errors: 0",
                "inserted": 0,
                "errors": 0,
                "total": 0
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
