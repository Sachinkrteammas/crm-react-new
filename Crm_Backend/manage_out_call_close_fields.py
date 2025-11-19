
# src/backend/outcall_close_fields.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import Query
from typing import List, Dict, Any, Optional
from datetime import datetime
from database import get_db4

router = APIRouter(
    prefix="/outcall",
    tags=["OutCall Close Fields"]
)

# -----------------------------
# Helpers
# -----------------------------
def fetch_rows(query: str, params: dict, db: Session) -> List[Dict[str, Any]]:
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

def execute_write(query: str, params: dict, db: Session) -> bool:
    result = db.execute(text(query), params)
    db.commit()
    return result.rowcount > 0

# -----------------------------
# GET ALL FIELDS
# -----------------------------
@router.get("/close_fields/{client_id}")
def get_close_fields(
    client_id: int,
    campaign_id: int = Query(..., alias="campaign_id"),
    db: Session = Depends(get_db4)
):
    sql = text("""
        SELECT * FROM ob_close_master 
        WHERE ClientId = :client_id AND CampaignId = :campaign_id
        ORDER BY Priority ASC, id ASC
    """)

    rows = db.execute(sql, {"client_id": client_id, "campaign_id": campaign_id}).mappings().all()

    fields = []

    for row in rows:
        field = dict(row)

        field["RequiredCheck"] = field["RequiredCheck"] in (1, "1")
        field["CampaignId"] = int(field["CampaignId"]) if field["CampaignId"] else None
        field["Priority"] = int(field["Priority"]) if field["Priority"] else 0
        field["fieldNumber"] = int(field["fieldNumber"]) if field["fieldNumber"] else 0

        if field["FieldType"] == "DropDown":
            vsql = text("""
                SELECT id, FieldValueName
                FROM ob_close_master_value
                WHERE FieldId = :fid AND ClientId = :client_id
                ORDER BY id ASC
            """)
            values = db.execute(vsql, {"fid": field["id"], "client_id": client_id}).mappings().all()
            field["DropDownValues"] = [dict(v) for v in values]
        else:
            field["DropDownValues"] = []

        fields.append(field)

    return fields


# -----------------------------
# CREATE FIELD
# -----------------------------
@router.post("/close_fields/{client_id}")
def create_close_field(client_id: int, data: Dict[str, Any], db: Session = Depends(get_db4)):
    insert_sql = """
        INSERT INTO ob_close_master
        (FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber, ClientId, CreateDate, CampaignId)
        VALUES (:FieldName, :FieldType, :FieldValidation, :RequiredCheck, :Priority, :fieldNumber, :ClientId, :CreateDate, :CampaignId)
    """
    params = {
        "FieldName": data.get("FieldName"),
        "FieldType": data.get("FieldType"),
        "FieldValidation": data.get("FieldValidation"),
        "RequiredCheck": data.get("RequiredCheck", 0),
        "Priority": data.get("Priority"),
        "fieldNumber": data.get("fieldNumber"),
        "ClientId": client_id,
        "CreateDate": datetime.utcnow(),
        "CampaignId": data.get("CampaignId")
    }

    result = db.execute(text(insert_sql), params)
    db.commit()
    field_id = result.lastrowid

    # Insert dropdown values
    if data.get("FieldType") == "DropDown":
        for val in data.get("DropDownValues", []):
            val = val.strip()
            if val:
                db.execute(
                    text("INSERT INTO ob_close_master_value (FieldId, FieldValueName, ClientId) VALUES (:fid, :val, :cid)"),
                    {"fid": field_id, "val": val, "cid": client_id}
                )
        db.commit()

    return {"message": "Close field created successfully", "field_id": field_id}

# -----------------------------
# UPDATE FIELD
# -----------------------------
@router.put("/close_fields/{client_id}/{field_id}")
def update_close_field(client_id: int, field_id: int, data: Dict[str, Any], db: Session = Depends(get_db4)):
    update_sql = """
        UPDATE ob_close_master
        SET FieldName = :FieldName,
            FieldType = :FieldType,
            FieldValidation = :FieldValidation,
            RequiredCheck = :RequiredCheck,
            Priority = :Priority,
            fieldNumber = :fieldNumber
        WHERE id = :FieldId AND ClientId = :ClientId
    """
    params = {
        "FieldName": data.get("FieldName"),
        "FieldType": data.get("FieldType"),
        "FieldValidation": data.get("FieldValidation"),
        "RequiredCheck": data.get("RequiredCheck", 0),
        "Priority": data.get("Priority"),
        "fieldNumber": data.get("fieldNumber"),
        "FieldId": field_id,
        "ClientId": client_id
    }

    updated = execute_write(update_sql, params, db)
    if not updated:
        raise HTTPException(status_code=404, detail="Close field not found")

    # Handle dropdown values
    if data.get("FieldType") == "DropDown":
        db.execute("DELETE FROM ob_close_master_value WHERE FieldId = :fid AND ClientId = :cid",
                   {"fid": field_id, "cid": client_id})
        db.commit()
        for val in data.get("DropDownValues", []):
            val = val.strip()
            if val:
                db.execute(
                    text("INSERT INTO ob_close_master_value (FieldId, FieldValueName, ClientId) VALUES (:fid, :val, :cid)"),
                    {"fid": field_id, "val": val, "cid": client_id}
                )
        db.commit()

    return {"message": "Close field updated successfully"}

# -----------------------------
# DELETE FIELD
# -----------------------------
@router.delete("/close_fields/{client_id}/{field_id}")
def delete_close_field(client_id: int, field_id: int, db: Session = Depends(get_db4)):
    # Delete dropdown values first
    db.execute("DELETE FROM ob_close_master_value WHERE FieldId = :fid AND ClientId = :cid",
               {"fid": field_id, "cid": client_id})
    db.commit()

    # Delete main field
    result = db.execute("DELETE FROM ob_close_master WHERE id = :fid AND ClientId = :cid",
                        {"fid": field_id, "cid": client_id})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Close field not found")

    return {"message": "Field deleted successfully"}

# -----------------------------
# GET VALUES
# -----------------------------
@router.get("/close_field_values/{client_id}/{field_id}", response_model=List[Dict[str, Any]])
def get_values(client_id: int, field_id: int, db: Session = Depends(get_db4)):
    sql = "SELECT id, FieldValueName FROM ob_close_master_value WHERE ClientId = :cid AND FieldId = :fid ORDER BY id ASC"
    return fetch_rows(sql, {"cid": client_id, "fid": field_id}, db)

# -----------------------------
# CREATE VALUE
# -----------------------------
@router.post("/close_field_values/{client_id}")
def add_value(client_id: int, data: Dict[str, Any], db: Session = Depends(get_db4)):
    sql = "INSERT INTO ob_close_master_value (FieldId, FieldValueName, ClientId) VALUES (:FieldId, :FieldValueName, :ClientId)"
    db.execute(text(sql), {"FieldId": data.get("FieldId"), "FieldValueName": data.get("FieldValueName"), "ClientId": client_id})
    db.commit()
    return {"message": "Value added successfully"}

# -----------------------------
# UPDATE VALUE
# -----------------------------
@router.put("/close_field_values/{client_id}/{value_id}")
def update_value(client_id: int, value_id: int, data: Dict[str, Any], db: Session = Depends(get_db4)):
    sql = "UPDATE ob_close_master_value SET FieldValueName = :FieldValueName WHERE id = :value_id AND ClientId = :ClientId"
    params = {"FieldValueName": data.get("FieldValueName"), "value_id": value_id, "ClientId": client_id}
    updated = execute_write(sql, params, db)
    if not updated:
        raise HTTPException(status_code=404, detail="Value not found")
    return {"message": "Value updated successfully"}

# -----------------------------
# DELETE VALUE
# -----------------------------
@router.delete("/close_field_values/{client_id}/{field_id}/{value_id}")
def delete_value(client_id: int, field_id: int, value_id: int, db: Session = Depends(get_db4)):
    sql = "DELETE FROM ob_close_master_value WHERE id = :vid AND FieldId = :fid AND ClientId = :cid"
    deleted = execute_write(sql, {"vid": value_id, "fid": field_id, "cid": client_id}, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Value not found")
    return {"message": "Value deleted successfully"}
