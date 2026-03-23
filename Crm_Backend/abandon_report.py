from typing import Dict, Any
from sqlalchemy import bindparam
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db2, get_db4
from schemas import *
from datetime import datetime, timedelta, date
from sqlalchemy import text






router = APIRouter()




@router.get("/categories")
def get_categories(db: Session = Depends(get_db4)):
    result = db.execute(text("""
        SELECT DISTINCT client_category 
        FROM registration_master 
        WHERE client_category IS NOT NULL
        ORDER BY client_category ASC
    """)).fetchall()

    categories = [row[0] for row in result if row[0]]

    return {
        "categories": categories
    }


@router.get("/abandon-trend")
def abandon_trend(
    start_date: date,
    end_date: date,
    client_id: str = Query("All"),
    category: str = Query("All"),
    no_of_count: int = Query(100),
    db: Session = Depends(get_db4),   # registration_master
    db2: Session = Depends(get_db2)   # vicidial
) -> Dict[str, Any]:

    # ---------------- 🔹 STEP 1: GET CAMPAIGN IDs ----------------
    if client_id != "All":
        camp = db.execute(
            text("SELECT campaignid FROM registration_master WHERE company_id = :cid"),
            {"cid": client_id}
        ).scalar_one_or_none()

        if not camp:
            raise HTTPException(404, "Company ID not found")

        campaign_list = [c.strip().strip("'") for c in camp.split(",") if c.strip()]

    else:
        if category == "All":
            rows = db.execute(text("""
                SELECT campaignid 
                FROM registration_master 
                WHERE status='A' AND is_dd_client='1'
            """)).fetchall()
        else:
            rows = db.execute(text("""
                SELECT campaignid 
                FROM registration_master 
                WHERE status='A' 
                AND is_dd_client='1'
                AND client_category = :category
            """), {"category": category}).fetchall()

        campaign_list = []
        for row in rows:
            if row[0]:
                campaign_list.extend([c.strip().strip("'") for c in row[0].split(",")])

    # 🔴 Safety check
    campaign_list = list(set(campaign_list))  # remove duplicates

    if not campaign_list:
        return {"data": {}, "message": "No campaigns found"}

    # ---------------- 🔹 STEP 2: CAMPAIGN CONDITION ----------------
    campaign_condition = "AND t2.campaign_id IN :cids"
    base_params = {"cids": tuple(campaign_list)}

    # ---------------- 🔹 STEP 3: DATE LOOP ----------------
    current_date = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    data = {}
    date_array = []
    campaign_array = set()
    datetime_array = {}

    while current_date < end_datetime:

        start_time = current_date
        next_day = current_date + timedelta(days=1)

        date_label = start_time.strftime("%Y-%m-%d")
        date_array.append(date_label)

        # ---------------- 🔹 STEP 4: MAIN QUERY ----------------
        query = f"""
            SELECT 
                t2.campaign_id,
                COUNT(*) AS total,
                SUM(CASE WHEN t2.user != 'VDCL' THEN 1 ELSE 0 END) AS answered,
                SUM(CASE WHEN t2.user = 'VDCL' THEN 1 ELSE 0 END) AS abandon
            FROM asterisk.vicidial_closer_log t2
            LEFT JOIN asterisk.vicidial_agent_log t1 
                ON t1.uniqueid = t2.uniqueid 
                AND t1.lead_id != '' 
                AND t2.user = t1.user
            WHERE t2.call_date >= :start_time
            AND t2.call_date < :end_time
            {campaign_condition}
            GROUP BY t2.campaign_id
        """

        query_params = {
            "start_time": start_time,
            "end_time": next_day,
            **base_params
        }

        rows = db2.execute(text(query), query_params).fetchall()

        # ---------------- 🔹 STEP 5: PROCESS DATA ----------------
        for row in rows:
            campaign_id = row[0]
            answered = row[2] or 0
            abandon = row[3] or 0
            total = answered + abandon

            if total == 0:
                continue

            # 🔥 SAME PHP LOGIC
            if total <= no_of_count:
                abandon_percent = round((abandon * 100) / total)

                data.setdefault(date_label, {})
                data[date_label][campaign_id] = {
                    "abandon_percent": f"{abandon_percent}%"
                }

                campaign_array.add(campaign_id)
                datetime_array.setdefault(date_label, []).append(campaign_id)

        current_date = next_day

    # ---------------- 🔹 FINAL RESPONSE ----------------
    return {
        "data": data,
        "dates": sorted(set(date_array)),
        "campaigns": sorted(campaign_array),
        "datetime_map": datetime_array
    }






@router.get("/abandon-call")
def abandon_call(
    start_date: date,
    end_date: date,
    client_id: str = Query("All"),
    db: Session = Depends(get_db4),   # registration_master
    db2: Session = Depends(get_db2)   # vicidial DB
) -> Dict[str, Any]:

    # ---------------- 🔹 STEP 1: GET CAMPAIGNS ----------------
    if client_id != "All":
        camp = db.execute(
            text("SELECT campaignid FROM registration_master WHERE company_id = :cid"),
            {"cid": client_id}
        ).scalar_one_or_none()

        if not camp:
            raise HTTPException(404, "Company not found")

        campaign_list = [c.strip().strip("'") for c in camp.split(",") if c.strip()]

    else:
        rows = db.execute(text("""
            SELECT campaignid 
            FROM registration_master 
            WHERE status='A' AND is_dd_client='1'
        """)).fetchall()

        campaign_list = []
        for row in rows:
            if row[0]:
                campaign_list.extend([c.strip().strip("'") for c in row[0].split(",")])

    campaign_list = list(set(campaign_list))

    if not campaign_list:
        return {"data": {}, "message": "No campaigns found"}

    campaign_condition = "AND t2.campaign_id IN :cids"
    base_params = {"cids": tuple(campaign_list)}

    # ---------------- 🔹 STEP 2: DATE LOOP ----------------
    current_date = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    data = {}
    datetime_array = {}

    while current_date < end_datetime:

        start_time = current_date
        end_time = datetime.combine(current_date.date(), datetime.max.time())
        next_day = current_date + timedelta(days=1)

        # Labels (same as PHP)
        time_label = start_time.strftime("%d-%b-%Y")   # 01-Mar-2026
        date_label = start_time.strftime("%B-%Y")      # March-2026

        datetime_array.setdefault(date_label, []).append(time_label)

        # ---------------- 🔹 STEP 3: QUERY ----------------
        query = f"""
            SELECT 
                SUM(IF(t2.user='VDCL',1,0)) `Abandon`,
                SUM(IF(((t2.user='VDCL') AND (t2.queue_seconds IS NULL OR t2.queue_seconds<=10)),1,0)) `AbndWithinTen`,
                SUM(IF(((t2.user='VDCL') AND (t2.queue_seconds>10 and t2.queue_seconds<=15)),1,0)) `AbndWithinFif`,
                SUM(IF(((t2.user='VDCL') AND (t2.queue_seconds>15 and t2.queue_seconds<=20)),1,0)) `AbndWithinTwe`,
                SUM(IF(((t2.user='VDCL') AND (t2.queue_seconds>20 and t2.queue_seconds<=30)),1,0)) `AbndWithinThr`,
                SUM(IF(((t2.user='VDCL') AND (t2.queue_seconds IS NULL OR t2.queue_seconds>30)),1,0)) `AbndAftertThr`

            FROM asterisk.vicidial_closer_log t2
            LEFT JOIN asterisk.vicidial_agent_log t1 
                ON t1.uniqueid = t2.uniqueid 
                AND t1.lead_id != '' 
                AND t2.user = t1.user

            LEFT JOIN (
                SELECT uniqueid, SUM(parked_sec) p 
                FROM park_log 
                WHERE status='GRABBED'
                AND parked_time >= :start_time
                AND parked_time < :end_time
                GROUP BY uniqueid
            ) t3 ON t1.uniqueid = t3.uniqueid

            WHERE t2.call_date >= :start_time
            AND t2.call_date < :end_time
            {campaign_condition}
        """

        params = {
            "start_time": start_time,
            "end_time": end_time,
            **base_params
        }

        result = db2.execute(text(query), params).fetchone()

        # ---------------- 🔹 STEP 4: STORE DATA ----------------
        if result:
            data.setdefault("Abandon Call", {}).setdefault(date_label, {})[time_label] = result[0] or 0
            data.setdefault("Abandon in 10 Sec", {}).setdefault(date_label, {})[time_label] = result[1] or 0
            data.setdefault("Abandon in 15 Sec", {}).setdefault(date_label, {})[time_label] = result[2] or 0
            data.setdefault("Abandon in 20 Sec", {}).setdefault(date_label, {})[time_label] = result[3] or 0
            data.setdefault("Abandon in 30 Sec", {}).setdefault(date_label, {})[time_label] = result[4] or 0
            data.setdefault("Abandon After 30 Sec", {}).setdefault(date_label, {})[time_label] = result[5] or 0

        current_date = next_day

    # ---------------- 🔹 FINAL RESPONSE ----------------
    return {
        "data": data,
        "datetime_map": datetime_array
    }