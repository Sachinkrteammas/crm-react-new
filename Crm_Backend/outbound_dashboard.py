from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date
from database import get_db4, get_db2  # your database session dependency

router = APIRouter()

@router.post("/vicidial-summary")
def get_vicidial_summary(
    company_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    # Step 1: Fetch campaign IDs for this company
    campaign_query = text("""
        SELECT campaignid 
        FROM registration_master 
        WHERE company_id = :company_id
    """)
    campaign_result = db.execute(
        campaign_query, {"company_id": company_id}
    ).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]

    if not campaign_list:
        raise HTTPException(status_code=404, detail="No campaigns found for this company")

    # Step 2: Build IN clause dynamically
    campaign_in_clause = ", ".join(f"'{c}'" for c in campaign_list)

    # Step 3: Summary query (aggregated into single row)
    summary_query = text(f"""
        SELECT 
            COUNT(*) AS TotalCalls,
            SUM(CASE WHEN t2.user != 'VDAD' THEN 1 ELSE 0 END) AS Connected,
            SUM(CASE WHEN t2.status = 'SLA' THEN 1 ELSE 0 END) AS Conversions,
            ROUND(SUM(t2.length_in_sec) / COUNT(*), 2) AS AvgTalkTimeSec,
            SEC_TO_TIME(ROUND(SUM(t2.length_in_sec) / COUNT(*), 0)) AS AvgTalkTimeFormatted
        FROM 
            asterisk.vicidial_log t2
        WHERE 
            DATE(t2.call_date) BETWEEN :start_date AND :end_date
            AND t2.campaign_id IN ({campaign_in_clause})
            AND t2.lead_id IS NOT NULL;
    """)

    result = db2.execute(summary_query, {"start_date": start_date, "end_date": end_date}).mappings().fetchone()

    # ✅ Handle None result safely
    if not result:
        result = {}

    total_calls = result.get("TotalCalls") or 0
    connected = result.get("Connected") or 0
    conversions = result.get("Conversions") or 0
    avg_talk_time_sec = result.get("AvgTalkTimeSec") or 0
    avg_talk_time_formatted = result.get("AvgTalkTimeFormatted") or "0"

    # ✅ Safe casting
    return {
        "StartDate": str(start_date),
        "EndDate": str(end_date),
        "TotalCalls": int(total_calls),
        "Connected": int(connected),
        "Conversions": int(conversions),
        "AvgTalkTimeSec": int(avg_talk_time_sec),
        "AvgTalkTimeFormatted": str(avg_talk_time_formatted),
    }





@router.post("/vicidial-conversion-trend")
def get_conversion_trend(
    company_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    # Step 1: Fetch campaign IDs for this company
    campaign_query = text("""
        SELECT campaignid 
        FROM registration_master 
        WHERE company_id = :company_id
    """)
    campaign_result = db.execute(
        campaign_query, {"company_id": company_id}
    ).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]

    if not campaign_list:
        raise HTTPException(status_code=404, detail="No campaigns found for this company")

    campaign_in_clause = ", ".join(f"'{c}'" for c in campaign_list)

    # Step 2: Fetch daily call & conversion counts
    trend_query = text(f"""
        SELECT 
            DATE(t2.call_date) AS CallDate,
            COUNT(*) AS TotalCalls,
            SUM(CASE WHEN t2.status = 'SLA' THEN 1 ELSE 0 END) AS Conversions
        FROM 
            asterisk.vicidial_log t2
        WHERE 
            DATE(t2.call_date) BETWEEN :start_date AND :end_date
            AND t2.campaign_id IN ({campaign_in_clause})
            AND t2.lead_id IS NOT NULL
        GROUP BY DATE(t2.call_date)
        ORDER BY CallDate ASC;
    """)

    results = db2.execute(
        trend_query, {"start_date": start_date, "end_date": end_date}
    ).mappings().all()

    if not results:
        return []

    # Step 3: Format results for frontend
    trend_data = [
        {
            "date": str(row["CallDate"]),
            "calls": int(row["TotalCalls"] or 0),
            "conversions": int(row["Conversions"] or 0),
        }
        for row in results
    ]

    return trend_data





@router.post("/vicidial-pie-chart")
def get_pie_chart(
    company_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    # Step 1: Fetch campaign IDs for this company
    campaign_query = text("""
        SELECT campaignid 
        FROM registration_master 
        WHERE company_id = :company_id
    """)
    campaign_result = db.execute(
        campaign_query, {"company_id": company_id}
    ).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]

    if not campaign_list:
        raise HTTPException(status_code=404, detail="No campaigns found for this company")

    campaign_in_clause = ", ".join(f"'{c}'" for c in campaign_list)

    # Step 3: Summary query (aggregated into single row)
    chart_query = text(f"""
        SELECT 
            COUNT(*) AS TotalCalls,
            SUM(CASE WHEN t2.user != 'VDAD' THEN 1 ELSE 0 END) AS Connected,
            SUM(CASE WHEN t2.user = 'VDAD' THEN 1 ELSE 0 END) AS NotConnected,
            SUM(CASE WHEN t2.user = 'BUSY' THEN 1 ELSE 0 END) AS Busy
        FROM 
            asterisk.vicidial_log t2
        WHERE 
            DATE(t2.call_date) BETWEEN :start_date AND :end_date
            AND t2.campaign_id IN ({campaign_in_clause})
            AND t2.lead_id IS NOT NULL;
    """)

    result = db2.execute(chart_query, {"start_date": start_date, "end_date": end_date}).mappings().fetchone()

    # ✅ Handle None result safely
    if not result:
        result = {}

    total_calls = result.get("TotalCalls") or 0
    connected = result.get("Connected") or 0
    not_connectd = result.get("NotConnected") or 0
    busy = result.get("Busy") or 0

    # ✅ Safe casting
    return {
        "StartDate": str(start_date),
        "EndDate": str(end_date),
        "TotalCalls": int(total_calls),
        "Connected": int(connected),
        "NotConnected": int(not_connectd),
        "Busy": int(busy),
    }






@router.post("/vicidial-campaign-summary")
def get_campaign_summary(
    company_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    # Step 1: Fetch campaign IDs for this company
    campaign_query = text("""
        SELECT campaignid 
        FROM registration_master 
        WHERE company_id = :company_id
    """)
    campaign_result = db.execute(
        campaign_query, {"company_id": company_id}
    ).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]

    if not campaign_list:
        raise HTTPException(status_code=404, detail="No campaigns found for this company")

    campaign_in_clause = ", ".join(f"'{c}'" for c in campaign_list)

    # ✅ Step 2: Fetch data per campaign_id
    chart_query = text(f"""
        SELECT 
            t2.campaign_id AS CampaignID,
            COUNT(*) AS TotalCalls,
            SUM(CASE WHEN t2.user != 'VDAD' THEN 1 ELSE 0 END) AS Connected
        FROM 
            asterisk.vicidial_log t2
        WHERE 
            DATE(t2.call_date) BETWEEN :start_date AND :end_date
            AND t2.campaign_id IN ({campaign_in_clause})
            AND t2.lead_id IS NOT NULL
        GROUP BY 
            t2.campaign_id
        ORDER BY 
            t2.campaign_id;
    """)

    results = db2.execute(
        chart_query, {"start_date": start_date, "end_date": end_date}
    ).mappings().fetchall()

    if not results:
        return {}

    # ✅ Return list of campaign summaries
    return [
        {
            "CampaignID": row["CampaignID"],
            "TotalCalls": int(row["TotalCalls"] or 0),
            "Connected": int(row["Connected"] or 0),
        }
        for row in results
    ]




@router.post("/vicidial-agent-leaderboard")
def get_agent_leaderboard(
    company_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    # Step 1: Fetch campaign IDs for this company
    campaign_query = text("""
        SELECT campaignid 
        FROM registration_master 
        WHERE company_id = :company_id
    """)
    campaign_result = db.execute(
        campaign_query, {"company_id": company_id}
    ).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]

    if not campaign_list:
        raise HTTPException(status_code=404, detail="No campaigns found for this company")

    campaign_in_clause = ", ".join(f"'{c}'" for c in campaign_list)

    # ✅ Step 2: Query agent leaderboard (aggregated per agent)
    leaderboard_query = text(f"""
        SELECT 
            vu.full_name AS AgentName,
            COUNT(*) AS total_calls,
            SUM(CASE WHEN t2.user != 'VDAD' THEN 1 ELSE 0 END) AS connected,
            SUM(CASE WHEN t2.status = 'SLA' THEN 1 ELSE 0 END) AS conversions,
            ROUND(SUM(t2.length_in_sec) / COUNT(*), 2) AS avg_talk_time_in_sec
        FROM 
            asterisk.vicidial_log t2
        LEFT JOIN 
            asterisk.vicidial_users vu 
            ON t2.user = vu.user
        WHERE 
            DATE(t2.call_date) BETWEEN :start_date AND :end_date
            AND t2.campaign_id IN ({campaign_in_clause})
            AND t2.lead_id IS NOT NULL
        GROUP BY 
            vu.full_name
        ORDER BY 
            Conversions DESC;
    """)

    results = db2.execute(
        leaderboard_query, {"start_date": start_date, "end_date": end_date}
    ).mappings().fetchall()

    if not results:
        return {}

    # Convert SQLAlchemy mappings to list of dicts
    leaderboard = [dict(row) for row in results]

    return leaderboard




@router.post("/vicidial-qa-summary")
def get_qa_summary(
    company_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):
    # Step 1: Fetch campaign IDs for this company
    campaign_query = text("""
        SELECT campaignid 
        FROM registration_master 
        WHERE company_id = :company_id
    """)
    campaign_result = db.execute(
        campaign_query, {"company_id": company_id}
    ).mappings().fetchone()

    if not campaign_result:
        raise HTTPException(status_code=404, detail="Company ID not found")

    raw_campaign = campaign_result["campaignid"]
    campaign_list = [c.strip().strip("'") for c in raw_campaign.split(",") if c.strip()]

    if not campaign_list:
        raise HTTPException(status_code=404, detail="No campaigns found for this company")

    campaign_in_clause = ", ".join(f"'{c}'" for c in campaign_list)

     # Step 3: QaSummary query 
    summary_query = text(f"""
        SELECT 
            COUNT(*) AS TotalCalls,
            CAST(SUM(CASE WHEN t2.user != 'VDAD' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS INT) AS Positivity,
            CAST(SUM(CASE WHEN t2.user = 'VDAD' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS INT) AS Negativity
        FROM 
            asterisk.vicidial_log t2
        WHERE 
            DATE(t2.call_date) BETWEEN :start_date AND :end_date
            AND t2.campaign_id IN ({campaign_in_clause})
            AND t2.lead_id IS NOT NULL;
    """)

    result = db2.execute(summary_query, {"start_date": start_date, "end_date": end_date}).mappings().fetchone()

    # ✅ Handle None result safely
    if not result:
        result = {}

    total_calls = result.get("TotalCalls") or 0
    positivity = result.get("Positivity") or 0
    negativity = result.get("Negativity") or 0


    # ✅ Safe casting
    return {
        "TotalCalls": int(total_calls),
        "Positivity": int(positivity),
        "Negativity": int(negativity),
    }