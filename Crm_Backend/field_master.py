from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict
from pydantic import BaseModel
from database import get_db4


router = APIRouter(prefix="/field_master", tags=["Field Master"])


class FieldBase(BaseModel):
    FieldName: str
    FieldType: str
    FieldValidation: Optional[str] = None
    RequiredCheck: bool = False
    Priority: Optional[int] = None
    fieldNumber: Optional[int] = None


class FieldValueBase(BaseModel):
    FieldId: int
    FieldValueName: str



# Helper function to execute queries and return results as dictionaries
def execute_query(query: str, params: dict, db: Session):
    result = db.execute(text(query), params)
    db.commit()
    # Convert result to a list of dictionaries
    return [dict(row._mapping) for row in result]


# Execute a query and return rows (for SELECT)
def fetch_rows(query: str, params: dict, db: Session):
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]


# Execute a query that modifies data (INSERT/UPDATE/DELETE)
def execute_write(query: str, params: dict, db: Session):
    db.execute(text(query), params)
    db.commit()
    return True




# Endpoint to view fields in field_master for a given ClientId
@router.get("/fields/{client_id}", response_model=List[dict])
def get_fields(client_id: int, db: Session = Depends(get_db4)):
    query = """
    SELECT id, FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber 
    FROM field_master 
    WHERE ClientId = :client_id
    ORDER BY fieldNumber
    """
    params = {"client_id": client_id}
    fields = fetch_rows(query, params, db)
    if not fields:
        raise HTTPException(status_code=404, detail="No fields found for the given client ID")
    return fields



# Endpoint to add a new field to field_master
@router.post("/fields/{client_id}")
def add_field(client_id: int, field: FieldBase, db: Session = Depends(get_db4)):
    query = """
    INSERT INTO field_master (FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber, ClientId)
    VALUES (:FieldName, :FieldType, :FieldValidation, :RequiredCheck, :Priority, :fieldNumber, :ClientId)
    """
    params = field.dict()
    params["ClientId"] = client_id
    result = db.execute(text(query), params)
    db.commit()
    field_id = result.lastrowid
    return {"message": "Field added successfully", "field_id": field_id}



# Endpoint to update a field in field_master
@router.put("/fields/{client_id}/{field_id}")
def update_field(client_id: int, field_id: int, field: FieldBase, db: Session = Depends(get_db4)):
    query = """
    UPDATE field_master
    SET FieldName = :FieldName, FieldType = :FieldType, FieldValidation = :FieldValidation, 
        RequiredCheck = :RequiredCheck, Priority = :Priority, fieldNumber = :fieldNumber
    WHERE id = :field_id AND ClientId = :client_id
    """
    params = field.dict()
    params["field_id"] = field_id
    params["client_id"] = client_id
    result = execute_write(query, params, db)
    if not result:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"message": "Field updated successfully"}


# Endpoint to delete a field in field_master
@router.delete("/fields/{client_id}/{field_id}")
def delete_field(client_id: int, field_id: int, db: Session = Depends(get_db4)):
    query = """
    DELETE FROM field_master WHERE id = :field_id AND ClientId = :client_id
    """
    params = {"field_id": field_id, "client_id": client_id}
    result = execute_write(query, params, db)
    if not result:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"message": "Field deleted successfully"}



# Endpoint to get field values in field_master_value for a given ClientId
@router.get("/field_values/{client_id}/{field_id}", response_model=List[dict])
def get_field_values_by_field(client_id: int, field_id: int, db: Session = Depends(get_db4)):
    query = """
    SELECT id, FieldValueName
    FROM field_master_value
    WHERE ClientId = :client_id AND FieldId = :field_id
    """
    params = {"client_id": client_id, "field_id": field_id}
    rows = fetch_rows(query, params, db)
    if not rows:
        # return empty list instead of 404 to avoid frontend breaking
        return []
    return rows



# Endpoint to add a field value to field_master_value
@router.post("/field_values/{client_id}")
def add_field_value(client_id: int, field_value: FieldValueBase, db: Session = Depends(get_db4)):
    query = """
    INSERT INTO field_master_value (FieldId, FieldValueName, ClientId)
    VALUES (:FieldId, :FieldValueName, :ClientId)
    """
    params = field_value.dict()
    params["ClientId"] = client_id
    execute_write(query, params, db)
    return {"message": "Field value added successfully"}



# Endpoint to update a field value in field_master_value
@router.put("/field_values/{client_id}/{field_value_id}")
def update_field_value(client_id: int, field_value_id: int, field_value: FieldValueBase, db: Session = Depends(get_db4)):
    query = """
    UPDATE field_master_value
    SET FieldValueName = :FieldValueName
    WHERE id = :field_value_id AND ClientId = :client_id
    """
    params = {
        "FieldValueName": field_value.FieldValueName,
        "field_value_id": field_value_id,
        "client_id": client_id
    }
    result = execute_write(query, params, db)
    if not result:
        raise HTTPException(status_code=404, detail="Field value not found")
    return {"message": "Field value updated successfully"}



# Endpoint to delete a field value in field_master_value
@router.delete("/field_values/{client_id}/{field_id}/{field_value_id}")
def delete_field_value(client_id: int, field_id: int, field_value_id: int, db: Session = Depends(get_db4)):
    query = """
    DELETE FROM field_master_value
    WHERE id = :field_value_id AND FieldId = :field_id AND ClientId = :client_id
    """
    params = {"field_value_id": field_value_id, "field_id": field_id, "client_id": client_id}
    result = execute_write(query, params, db)
    if not result:
        raise HTTPException(status_code=404, detail="Field value not found")
    return {"message": "Field value deleted successfully"}
