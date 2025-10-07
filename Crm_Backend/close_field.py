from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any, Optional
from datetime import datetime
from database import get_db4

router = APIRouter(tags=["Close Field"])


# -----------------------------
# Helpers
# -----------------------------
def fetch_rows(query: str, params: dict, db: Session):
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]


def execute_write(query: str, params: dict, db: Session):
    result = db.execute(text(query), params)
    db.commit()
    return result.rowcount > 0


# -----------------------------
# CLOSE_FIELD CRUD
# -----------------------------
@router.get("/close_fields/{client_id}", response_model=List[dict])
def get_close_fields(client_id: int, db: Session = Depends(get_db4)):
    query = """
        SELECT * FROM close_field
        WHERE ClientId = :client_id
        ORDER BY Priority ASC
    """
    return fetch_rows(query, {"client_id": client_id}, db)


@router.post("/close_fields/{client_id}")
def create_close_field(client_id: int, data: Dict[str, Any], db: Session = Depends(get_db4)):
    # Insert close_field
    sql = """
        INSERT INTO close_field
        (FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber, ClientId, CreateDate)
        VALUES (:FieldName, :FieldType, :FieldValidation, :RequiredCheck, :Priority, :fieldNumber, :ClientId, :CreateDate)
    """
    params = {
        "FieldName": data.get("FieldName"),
        "FieldType": data.get("FieldType"),
        "FieldValidation": data.get("FieldValidation"),
        "RequiredCheck": data.get("RequiredCheck", False),
        "Priority": data.get("Priority"),
        "fieldNumber": data.get("fieldNumber"),
        "ClientId": client_id,
        "CreateDate": datetime.utcnow()
    }
    result = db.execute(text(sql), params)
    db.commit()
    field_id = result.lastrowid

    # Insert dropdown values if field type is DropDown
    if data.get("FieldType") == "DropDown":
        dropdown_values = data.get("DropDownValues", [])
        for val in dropdown_values:
            if val.strip():
                db.execute(
                    text("INSERT INTO close_field_value (FieldId, FieldValueName, ClientId) VALUES (:FieldId, :FieldValueName, :ClientId)"),
                    {"FieldId": field_id, "FieldValueName": val.strip(), "ClientId": client_id}
                )
        db.commit()

    return {"message": "Close field created successfully", "field_id": field_id}


@router.put("/close_fields/{client_id}/{field_id}")
def update_close_field(client_id: int, field_id: int, data: Dict[str, Any], db: Session = Depends(get_db4)):
    # Update main field
    sql = """
        UPDATE close_field
        SET FieldName = :FieldName,
            FieldType = :FieldType,
            FieldValidation = :FieldValidation,
            RequiredCheck = :RequiredCheck,
            Priority = :Priority,
            fieldNumber = :fieldNumber
        WHERE id = :field_id AND ClientId = :ClientId
    """
    params = {
        "FieldName": data.get("FieldName"),
        "FieldType": data.get("FieldType"),
        "FieldValidation": data.get("FieldValidation"),
        "RequiredCheck": data.get("RequiredCheck", False),
        "Priority": data.get("Priority"),
        "fieldNumber": data.get("fieldNumber"),
        "field_id": field_id,
        "ClientId": client_id
    }
    if not execute_write(sql, params, db):
        raise HTTPException(status_code=404, detail="Close field not found")

    # Replace dropdown values if field type is DropDown
    if data.get("FieldType") == "DropDown":
        db.execute(
            text("DELETE FROM close_field_value WHERE FieldId = :fid AND ClientId = :cid"),
            {"fid": field_id, "cid": client_id}
        )
        for val in data.get("DropDownValues", []):
            if val.strip():
                db.execute(
                    text("INSERT INTO close_field_value (FieldId, FieldValueName, ClientId) VALUES (:FieldId, :FieldValueName, :ClientId)"),
                    {"FieldId": field_id, "FieldValueName": val.strip(), "ClientId": client_id}
                )
        db.commit()

    return {"message": "Close field updated successfully"}


@router.delete("/close_fields/{client_id}/{field_id}")
def delete_close_field(client_id: int, field_id: int, db: Session = Depends(get_db4)):
    db.execute(
        text("DELETE FROM close_field_value WHERE FieldId = :fid AND ClientId = :cid"),
        {"fid": field_id, "cid": client_id}
    )
    db.commit()
    if not execute_write("DELETE FROM close_field WHERE id = :field_id AND ClientId = :cid",
                         {"field_id": field_id, "cid": client_id}, db):
        raise HTTPException(status_code=404, detail="Close field not found")
    return {"message": "Close field deleted successfully"}


# -----------------------------
# CLOSE_FIELD_VALUE CRUD
# -----------------------------
@router.get("/close_field_values/{client_id}/{field_id}", response_model=List[dict])
def get_close_field_values(client_id: int, field_id: int, db: Session = Depends(get_db4)):
    return fetch_rows(
        "SELECT * FROM close_field_value WHERE FieldId = :field_id AND ClientId = :client_id",
        {"field_id": field_id, "client_id": client_id},
        db
    )


@router.post("/close_field_values/{client_id}")
def create_close_field_value(client_id: int, data: Dict[str, Any], db: Session = Depends(get_db4)):
    sql = "INSERT INTO close_field_value (FieldId, FieldValueName, ClientId) VALUES (:FieldId, :FieldValueName, :ClientId)"
    params = {"FieldId": data.get("FieldId"), "FieldValueName": data.get("FieldValueName"), "ClientId": client_id}
    result = db.execute(text(sql), params)
    db.commit()
    value_id = result.lastrowid
    return {"message": "Close field value created successfully", "value_id": value_id}


@router.put("/close_field_values/{client_id}/{value_id}")
def update_close_field_value(client_id: int, value_id: int, data: Dict[str, Any], db: Session = Depends(get_db4)):
    sql = "UPDATE close_field_value SET FieldValueName = :FieldValueName WHERE id = :value_id AND ClientId = :ClientId"
    params = {"FieldValueName": data.get("FieldValueName"), "value_id": value_id, "ClientId": client_id}
    if not execute_write(sql, params, db):
        raise HTTPException(status_code=404, detail="Close field value not found")
    return {"message": "Close field value updated successfully"}


@router.delete("/close_field_values/{client_id}/{field_id}/{value_id}")
def delete_close_field_value(client_id: int, field_id: int, value_id: int, db: Session = Depends(get_db4)):
    if not execute_write(
        "DELETE FROM close_field_value WHERE id = :value_id AND FieldId = :field_id AND ClientId = :cid",
        {"value_id": value_id, "field_id": field_id, "cid": client_id},
        db
    ):
        raise HTTPException(status_code=404, detail="Close field value not found")
    return {"message": "Close field value deleted successfully"}
