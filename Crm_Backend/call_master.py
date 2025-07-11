# Crm_Backend/call_master.py

from fastapi import APIRouter, Query
from sqlalchemy import text
from typing import List, Dict, Optional
from database import get_engine

router = APIRouter(tags=["Call Master"])

@router.get("/call-master/{client_id}", response_model=List[Dict])
def get_call_master_data(
    client_id: int,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    Category1: Optional[str] = Query(None),
    Category2: Optional[str] = Query(None),
    Category3: Optional[str] = Query(None),
    Category4: Optional[str] = Query(None),
    Category5: Optional[str] = Query(None),
):
    engine = get_engine()
    with engine.connect() as conn:
        # Step 1: Fetch active fields
        field_meta_query = """
            SELECT fieldNumber, FieldName 
            FROM field_master 
            WHERE ClientId = :client_id AND (FieldStatus IS NULL OR FieldStatus != 'D')
            ORDER BY fieldNumber
        """
        field_meta = conn.execute(text(field_meta_query), {"client_id": client_id}).mappings().all()
        field_map = {f["fieldNumber"]: f["FieldName"] for f in field_meta}
        columns = [f"field{fnum}" for fnum in field_map.keys()]
        columns += ["CallDate", "Category1", "Category2", "Category3", "Category4", "Category5"]

        # Step 2: Build WHERE clause
        where_clauses = ["ClientId = :client_id"]
        params = {"client_id": client_id}

        if from_date:
            where_clauses.append("CallDate >= :from_date")
            params["from_date"] = from_date
        if to_date:
            where_clauses.append("CallDate <= :to_date")
            params["to_date"] = to_date

        category_conditions = []
        if Category1:
            category_conditions.append("Category1 = :Category1")
            params["Category1"] = Category1
        if Category2:
            category_conditions.append("Category2 = :Category2")
            params["Category2"] = Category2
        if Category3:
            category_conditions.append("Category3 = :Category3")
            params["Category3"] = Category3
        if Category4:
            category_conditions.append("Category4 = :Category4")
            params["Category4"] = Category4
        if Category5:
            category_conditions.append("Category5 = :Category5")
            params["Category5"] = Category5

        if category_conditions:
            where_clauses.append(f"({' OR '.join(category_conditions)})")

        where_clause = " AND ".join(where_clauses)
        select_cols = ", ".join(columns)

        # Step 3: Execute final query
        query = f"SELECT {select_cols} FROM call_master WHERE {where_clause}"
        result = conn.execute(text(query), params).mappings().all()

        # Step 4: Map fieldX to FieldName
        response = []
        for row in result:
            record = {}
            for fnum, label in field_map.items():
                record[label] = row.get(f"field{fnum}")
            record.update({
                "CallDate": row.get("CallDate"),
                "Category1": row.get("Category1"),
                "Category2": row.get("Category2"),
                "Category3": row.get("Category3"),
                "Category4": row.get("Category4"),
                "Category5": row.get("Category5"),
            })
            response.append(record)

        return response
