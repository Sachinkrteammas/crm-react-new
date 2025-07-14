# Crm_Backend/call_master.py
from http.client import HTTPException

from fastapi import APIRouter, Query
from sqlalchemy import text
from typing import List, Dict, Optional

from sqlalchemy.exc import SQLAlchemyError

from database import get_engine, get_engine2, SessionLocal2

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
        # Step 1: Fetch field mappings
        field_meta_query = """
            SELECT fieldNumber, FieldName 
            FROM field_master 
            WHERE client_id = :client_id 
              AND (FieldStatus IS NULL OR FieldStatus != 'D')
            ORDER BY fieldNumber
        """
        field_meta = conn.execute(text(field_meta_query), {"client_id": client_id}).mappings().all()

        # Early return if no fields configured
        if not field_meta:
            return []

        # Build column list
        field_map = {f["fieldNumber"]: f["FieldName"] for f in field_meta}
        columns = [f"field{fnum}" for fnum in field_map]
        columns += ["CallDate", "Category1", "Category2", "Category3", "Category4", "Category5"]

        # Step 2: WHERE clause setup
        where_clauses = ["client_id = :client_id"]
        params = {"client_id": client_id}

        if from_date:
            where_clauses.append("CallDate >= :from_date")
            params["from_date"] = from_date
        if to_date:
            where_clauses.append("CallDate <= :to_date")
            params["to_date"] = to_date

        # Optional category filters (OR inside group)
        category_conditions = []
        for i, val in enumerate([Category1, Category2, Category3, Category4, Category5], start=1):
            if val:
                category_conditions.append(f"Category{i} = :Category{i}")
                params[f"Category{i}"] = val

        if category_conditions:
            where_clauses.append(f"({' OR '.join(category_conditions)})")

        where_clause = " AND ".join(where_clauses)
        select_cols = ", ".join(columns)

        # Step 3: Execute final query
        query = f"SELECT {select_cols} FROM call_master WHERE {where_clause}"
        result = conn.execute(text(query), params).mappings().all()

        # Step 4: Format response
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


@router.get("/csat-report/{client_id}", response_model=List[Dict])
def get_csat_report(
    client_id: int,
    from_date: str = Query(...),
    to_date: str = Query(...),
):
    query = text("""
        SELECT vl.*, vcl.user, vu.full_name
        FROM csat_data vl
        INNER JOIN vicidial_closer_log vcl ON vl.uniqueid = vcl.uniqueid
        INNER JOIN vicidial_users vu ON vcl.user = vu.user
        WHERE vl.dtmf < 4
          AND vl.client_id = :client_id
          AND DATE(vl.call_date) BETWEEN :from_date AND :to_date
    """)

    try:
        engine = get_engine2()
        with engine.connect() as conn:
            result = conn.execute(query, {
                "client_id": client_id,
                "from_date": from_date,
                "to_date": to_date,
            }).mappings().all()

        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        print("SQLAlchemy Error:", str(e))  # Good for local debugging
        raise HTTPException(status_code=500, detail="Database query failed.")
