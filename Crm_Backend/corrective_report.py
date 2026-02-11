from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any
from database import get_db4  # your existing DB dependency
from sqlalchemy import text

router = APIRouter()

# --- Request Schema ---
class CorrectiveReportRequest(BaseModel):
    start_date: str  # format YYYY-MM-DD
    end_date: str    # format YYYY-MM-DD
    client_id: int

# --- Helper function to fetch calls from DB ---
def fetch_calls(client_id: int, start: datetime, end: datetime, db: Session):
    query = text("""
        SELECT *
        FROM call_master
        WHERE ClientId = :client_id
          AND DATE(CallDate) BETWEEN :start AND :end
        ORDER BY Category3 ASC
    """)
    result = db.execute(query, {"client_id": client_id, "start": start, "end": end}).fetchall()
    return [dict(row._mapping) for row in result]





# --- POST endpoint ---
@router.post("/corrective_report")
def corrective_report(
    request: CorrectiveReportRequest,
    db: Session = Depends(get_db4)
):
    # 1. Validate dates
    try:
        start = datetime.strptime(request.start_date, "%Y-%m-%d").date()
        end = datetime.strptime(request.end_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    if end < start:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    # 2. Fetch calls from DB
    try:
        calls = fetch_calls(request.client_id, start, end, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB query failed: {str(e)}")

    # 3. Process and group data
    data_arr: Dict[str, Dict[str, Dict[str, Any]]] = {}

    for call in calls:
        c3 = call.get("Category3") or "Undefined"
        c2 = call.get("Category2") or "Undefined"
        status = call.get("CloseLoopCate1")

        if c3 not in data_arr:
            data_arr[c3] = {}
        if c2 not in data_arr[c3]:
            data_arr[c3][c2] = {"open": 0, "close": 0, "data": []}                

        if status == "Open":
            data_arr[c3][c2]["open"] += 1
        else:  # closed
            data_arr[c3][c2]["close"] += 1

        data_arr[c3][c2]["data"].append(call)

    # 4. Compute totals per site/category (optional, similar to PHP export)
    grand_total_open = sum(d["open"] for c in data_arr.values() for d in c.values())
    grand_total_close = sum(d["close"] for c in data_arr.values() for d in c.values())
    grand_total_corr = grand_total_open + grand_total_close

    return {
        "client_id": request.client_id,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "grand_total": {
            "total_corrections": grand_total_corr,
            "open": grand_total_open,
            "close": grand_total_close,
            "phase_total": round(grand_total_close / grand_total_corr, 2) if grand_total_corr else 0
        },
        "data": data_arr
    }
