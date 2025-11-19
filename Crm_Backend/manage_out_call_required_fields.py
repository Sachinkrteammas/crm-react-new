# routes/manage_out_call_required_fields.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from pydantic import BaseModel
from database import get_db4

router = APIRouter(prefix="/manage_out_call_required_fields", tags=["Manage Out Call Required Fields"])


# ===================== Pydantic Models =====================

class OutFieldBase(BaseModel):
    FieldName: str
    FieldType: str
    FieldValidation: Optional[str] = None
    RequiredCheck: bool = False
    Priority: Optional[int] = None
    fieldNumber: Optional[int] = None
    CampaignId: Optional[str] = None


class OutFieldValueBase(BaseModel):
    FieldId: int
    FieldValueName: str


# ===================== Helper Functions =====================

def fetch_rows(query: str, params: dict, db: Session):
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]


def execute_write(query: str, params: dict, db: Session):
    db.execute(text(query), params)
    db.commit()
    return True


# ===================== CRUD FOR FIELDS =====================

@router.get("/fields/{client_id}/{campaign_id}", response_model=List[dict])
def get_fields(client_id: int, campaign_id: str, db: Session = Depends(get_db4)):
    query = """
    SELECT id, FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber, CampaignId
    FROM obfield_master
    WHERE ClientId = :client_id AND CampaignId = :campaign_id
    ORDER BY fieldNumber
    """
    params = {"client_id": client_id, "campaign_id": campaign_id}
    return fetch_rows(query, params, db)


@router.post("/fields/{client_id}/{campaign_id}")
def add_field(client_id: int, campaign_id: str, field: OutFieldBase, db: Session = Depends(get_db4)):
    query = """
    INSERT INTO obfield_master 
    (FieldName, FieldType, FieldValidation, RequiredCheck, Priority, fieldNumber, ClientId, CampaignId, CreateDate, FieldStatus)
    VALUES (:FieldName, :FieldType, :FieldValidation, :RequiredCheck, :Priority, :fieldNumber, :ClientId, :CampaignId, NOW(), 'Active')
    """
    params = field.dict()
    params["ClientId"] = client_id
    params["CampaignId"] = campaign_id
    result = db.execute(text(query), params)
    db.commit()
    field_id = result.lastrowid
    return {"message": "Field added successfully", "field_id": field_id}


@router.put("/fields/{client_id}/{campaign_id}/{field_id}")
def update_field(client_id: int, campaign_id: str, field_id: int, field: OutFieldBase, db: Session = Depends(get_db4)):
    query = """
    UPDATE obfield_master
    SET FieldName = :FieldName, FieldType = :FieldType, FieldValidation = :FieldValidation,
        RequiredCheck = :RequiredCheck, Priority = :Priority, fieldNumber = :fieldNumber
    WHERE id = :field_id AND ClientId = :client_id AND CampaignId = :campaign_id
    """
    params = field.dict()
    params.update({"field_id": field_id, "client_id": client_id, "campaign_id": campaign_id})
    execute_write(query, params, db)
    return {"message": "Field updated successfully"}


@router.delete("/fields/{client_id}/{campaign_id}/{field_id}")
def delete_field(client_id: int, campaign_id: str, field_id: int, db: Session = Depends(get_db4)):
    query = """
    DELETE FROM obfield_master 
    WHERE id = :field_id AND ClientId = :client_id AND CampaignId = :campaign_id
    """
    params = {"field_id": field_id, "client_id": client_id, "campaign_id": campaign_id}
    execute_write(query, params, db)
    return {"message": "Field deleted successfully"}


# ===================== CRUD FOR DROPDOWN VALUES =====================

@router.get("/field_values/{client_id}/{field_id}", response_model=List[dict])
def get_field_values(client_id: int, field_id: int, db: Session = Depends(get_db4)):
    query = """
    SELECT id, FieldValueName 
    FROM obfield_master_value
    WHERE ClientId = :client_id AND FieldId = :field_id
    """
    params = {"client_id": client_id, "field_id": field_id}
    return fetch_rows(query, params, db)


@router.post("/field_values/{client_id}")
def add_field_value(client_id: int, field_value: OutFieldValueBase, db: Session = Depends(get_db4)):
    query = """
    INSERT INTO obfield_master_value (FieldId, FieldValueName, ClientId)
    VALUES (:FieldId, :FieldValueName, :ClientId)
    """
    params = field_value.dict()
    params["ClientId"] = client_id
    execute_write(query, params, db)
    return {"message": "Field value added successfully"}


@router.put("/field_values/{client_id}/{field_value_id}")
def update_field_value(client_id: int, field_value_id: int, field_value: OutFieldValueBase, db: Session = Depends(get_db4)):
    query = """
    UPDATE obfield_master_value
    SET FieldValueName = :FieldValueName
    WHERE id = :field_value_id AND ClientId = :client_id
    """
    params = {"FieldValueName": field_value.FieldValueName, "field_value_id": field_value_id, "client_id": client_id}
    execute_write(query, params, db)
    return {"message": "Field value updated successfully"}


@router.delete("/field_values/{client_id}/{field_id}/{field_value_id}")
def delete_field_value(client_id: int, field_id: int, field_value_id: int, db: Session = Depends(get_db4)):
    query = """
    DELETE FROM obfield_master_value 
    WHERE id = :field_value_id AND FieldId = :field_id AND ClientId = :client_id
    """
    params = {"field_value_id": field_value_id, "field_id": field_id, "client_id": client_id}
    execute_write(query, params, db)
    return {"message": "Field value deleted successfully"}
