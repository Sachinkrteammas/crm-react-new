from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date, datetime
from database import get_db4

router = APIRouter()




@router.post("/track-activity")
async def track_activity(request: Request, payload: dict, db: Session = Depends(get_db4)):
    try:
        # ✅ Get IP Address
        ip_address = request.client.host

        # If behind proxy (production)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip_address = forwarded.split(",")[0]

        # ✅ Extract data from payload
        user_type = payload.get("user_type")
        name = payload.get("name")
        page_name = payload.get("page_name")
        page_url = payload.get("page_url")

        # ✅ Insert query
        query = text("""
            INSERT INTO login_log_new 
            (user_name, type, ip_address, page_name, page_url, hit_time)
            VALUES 
            (:user_name, :type, :ip_address, :page_name, :page_url, :hit_time)
        """)

        db.execute(query, {
            "user_name": name,
            "type": user_type,
            "ip_address": ip_address,
            "page_name": page_name,
            "page_url": page_url,
            "hit_time": datetime.now()
        })

        db.commit()

        return {"message": "Activity logged successfully"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}




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
            login_log_new lg
        WHERE 
            DATE(lg.hit_time) BETWEEN :start_date AND :end_date
        ORDER BY lg.hit_time DESC
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
