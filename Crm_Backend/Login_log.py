from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date
from database import get_db4

router = APIRouter()

@router.get("/login-log-report")
def get_login_log_report(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db4)
):
    # ✅ Step 1: Build query
    query = text("""
        SELECT 
            lg.user_name AS `Name`,
            lg.type AS Role,
            lg.ip_address AS `Ip Address`,
            lg.page_name AS `Page Name`,
            lg.page_url AS `Page Url`,
            lg.hit_time AS `Hit Time`
        FROM 
            login_log lg
        WHERE 
            DATE(lg.hit_time) BETWEEN :start_date AND :end_date
    """)

    # ✅ Step 2: Execute query
    result = db.execute(query, {"start_date": start_date, "end_date": end_date}).mappings().all()

    # ✅ Step 3: Handle empty result
    if not result:
        raise HTTPException(status_code=404, detail="No records found for the given date range")

    # ✅ Step 4: Format response
    logs = [
        {
            "Name": row["Name"],
            "Role": row["Role"],
            "IpAddress": row["Ip Address"],
            "PageName": row["Page Name"],
            "PageUrl": row["Page Url"],
            "HitTime": str(row["Hit Time"]),
        }
        for row in result
    ]

    return {
        "StartDate": str(start_date),
        "EndDate": str(end_date),
        "TotalRecords": len(logs),
        "Data": logs,
    }
