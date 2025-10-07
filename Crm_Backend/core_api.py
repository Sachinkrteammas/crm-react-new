# Crm_Backend/core_api.py

from fastapi import APIRouter
from sqlalchemy import text
from fastapi import Query
from database import get_engine4

router = APIRouter(tags=["core_api"])  # 👈 SINGLE TAG for all endpoints



def fetch_categories(query: str, params: dict):
    engine = get_engine4()
    with engine.connect() as conn:
        result = conn.execute(text(query), params).mappings()
        return [{"id": row["id"], "ecrName": row["ecrName"]} for row in result]



def fetch_fields(query: str, params: dict):
    engine = get_engine4()
    with engine.connect() as conn:
        result = conn.execute(text(query), params).mappings()
        return [{"fieldNumber": row["fieldNumber"], "FieldName": row["FieldName"]} for row in result]



@router.get("/fields")
def get_fields(client_id: int = Query(..., description="Client ID")):
    query = """
        SELECT fieldNumber, FieldName
        FROM field_master
        WHERE ClientId = :client_id
        ORDER BY fieldNumber
    """
    return fetch_fields(query, {"client_id": client_id})


@router.get("/categories/level1")
def get_level1(client_id: int = Query(..., description="Client ID")):
    query = """
        SELECT id, ecrName 
        FROM ecr_master 
        WHERE Label = 1 AND Client = :client_id 
        ORDER BY ecrName
    """
    return fetch_categories(query, {"client_id": client_id})

@router.get("/categories/level2/{parent_id}")
def get_level2(parent_id: int, client_id: int = Query(..., description="Client ID")):
    query = """
        SELECT id, ecrName 
        FROM ecr_master 
        WHERE Label = 2 AND parent_id = :parent_id AND Client = :client_id 
        ORDER BY ecrName
    """
    return fetch_categories(query, {"parent_id": parent_id, "client_id": client_id})

@router.get("/categories/level3/{parent_id}")
def get_level3(parent_id: int, client_id: int = Query(..., description="Client ID")):
    query = """
        SELECT id, ecrName 
        FROM ecr_master 
        WHERE Label = 3 AND parent_id = :parent_id AND Client = :client_id 
        ORDER BY ecrName
    """
    return fetch_categories(query, {"parent_id": parent_id, "client_id": client_id})

@router.get("/categories/level4/{parent_id}")
def get_level4(parent_id: int, client_id: int = Query(..., description="Client ID")):
    query = """
        SELECT id, ecrName 
        FROM ecr_master 
        WHERE Label = 4 AND parent_id = :parent_id AND Client = :client_id 
        ORDER BY ecrName
    """
    return fetch_categories(query, {"parent_id": parent_id, "client_id": client_id})

@router.get("/categories/level5/{parent_id}")
def get_level5(parent_id: int, client_id: int = Query(..., description="Client ID")):
    query = """
        SELECT id, ecrName 
        FROM ecr_master 
        WHERE Label = 5 AND parent_id = :parent_id AND Client = :client_id 
        ORDER BY ecrName
    """
    return fetch_categories(query, {"parent_id": parent_id, "client_id": client_id})

