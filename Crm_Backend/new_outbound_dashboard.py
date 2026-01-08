from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date
from database import get_db4, get_db2

router = APIRouter()


def get_campaign_in_clause(db: Session, company_id: int):
    query = text("""
        SELECT campaignid 
        FROM registration_master 
        WHERE company_id = :company_id
    """)
    row = db.execute(query, {"company_id": company_id}).mappings().fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Company ID not found")

    campaigns = [c.strip().strip("'") for c in row["campaignid"].split(",") if c.strip()]

    if not campaigns:
        raise HTTPException(status_code=404, detail="No campaigns found")

    return ", ".join(f"'{c}'" for c in campaigns)



@router.post("/outbound/kpi-summary")
def outbound_kpi_summary(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    query = text(f"""
        SELECT
            COUNT(DISTINCT vl.lead_id) AS total_data_assigned,
            COUNT(DISTINCT v.phone_number) AS unique_numbers_dialed,
            COUNT(*) AS total_attempts,
            ROUND(
                COUNT(*) / NULLIF(COUNT(DISTINCT v.phone_number), 0),
                2
            ) AS avg_attempts_per_number,
            SUM(CASE WHEN v.user != 'VDAD' THEN 1 ELSE 0 END) AS connected_calls,
            ROUND(
                SUM(CASE WHEN v.user != 'VDAD' THEN 1 ELSE 0 END) * 100
                / NULLIF(COUNT(*), 0),
                1
            ) AS connection_rate,
            SUM(CASE WHEN v.status = 'SALE' THEN 1 ELSE 0 END) AS qualified_leads
        FROM vicidial_log v
        JOIN vicidial_list vl ON v.lead_id = vl.lead_id
        WHERE DATE(v.call_date) BETWEEN :start AND :end
        AND v.campaign_id IN ({campaign_in})
        AND v.lead_id IS NOT NULL
    """)

    r = db2.execute(query, {"start": start_date, "end": end_date}).mappings().fetchone() or {}

    return {
        "totalDataAssigned": int(r.get("total_data_assigned", 0)),
        "uniqueNumbersDialed": int(r.get("unique_numbers_dialed", 0)),
        "totalAttempts": int(r.get("total_attempts", 0)),
        "avgAttemptsPerNumber": float(r.get("avg_attempts_per_number", 0)),
        "connectedCalls": int(r.get("connected_calls", 0)),
        "connectionRate": float(r.get("connection_rate", 0)),
        "qualifiedLeads": int(r.get("qualified_leads", 0)),
    }


@router.post("/outbound/call-funnel")
def outbound_call_funnel(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    query = text(f"""
            SELECT
                COUNT(DISTINCT vl.lead_id) AS total_data,
                COUNT(DISTINCT v.phone_number) AS unique_dialed,
                COUNT(*) AS total_attempts,
                SUM(CASE WHEN v.user != 'VDAD' THEN 1 ELSE 0 END) AS connected,
                SUM(CASE WHEN v.status = 'SALE' THEN 1 ELSE 0 END) AS qualified
            FROM vicidial_log v
            JOIN vicidial_list vl ON v.lead_id = vl.lead_id
            WHERE DATE(v.call_date) BETWEEN :start AND :end
            AND v.campaign_id IN ({campaign_in})
            AND v.lead_id IS NOT NULL
        """)

    r = db2.execute(
        query,
        {"start": start_date, "end": end_date}
    ).mappings().fetchone() or {}

    total_data = r.get("total_data", 0)
    unique_dialed = r.get("unique_dialed", 0)
    connected = r.get("connected", 0)
    qualified = r.get("qualified", 0)
    total_attempts = r.get("total_attempts", 0)

    dial_rate = (unique_dialed * 100 / total_data) if total_data else 0
    connect_rate = (connected * 100 / unique_dialed) if unique_dialed else 0
    outcome_rate = (qualified * 100 / connected) if connected else 0

    return {
        # Absolute numbers
        "uniqueDialed": int(unique_dialed),
        "totalAttempts": int(total_attempts),
        "connectedCalls": int(connected),
        "qualifiedLeads": int(qualified),

        # Funnel rates
        "dialRate": round(dial_rate, 1),
        "connectRate": round(connect_rate, 1),
        "outcomeRate": round(outcome_rate, 1),
    }


@router.post("/outbound/performance-trend")
def outbound_performance_trend(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    query = text(f"""
        SELECT
            DATE(call_date) AS day,
            COUNT(*) AS attempts,
            ROUND(SUM(user != 'VDAD') * 100 / COUNT(*), 1) AS connect_rate,
            ROUND(SUM(status = 'SALE') * 100 / COUNT(*), 1) AS outcome_rate
        FROM vicidial_log
        WHERE DATE(call_date) BETWEEN :start AND :end
        AND campaign_id IN ({campaign_in})
        GROUP BY DATE(call_date)
        ORDER BY day
    """)

    rows = db2.execute(query, {"start": start_date, "end": end_date}).mappings().all()

    return {
        "trend": [
            {
                "day": str(r["day"]),
                "attempts": int(r["attempts"]),
                "connect": float(r["connect_rate"]),
                "outcome": float(r["outcome_rate"]),
            } for r in rows
        ],
        "averages": {
            "avgAttempts": round(sum(r["attempts"] for r in rows) / len(rows), 0),
            "avgConnect": round(sum(r["connect_rate"] for r in rows) / len(rows), 1),
            "avgOutcome": round(sum(r["outcome_rate"] for r in rows) / len(rows), 1),
        }
    }



@router.post("/outbound/efficiency-metrics")
def efficiency_metrics(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    query = text(f"""
        SELECT
            user AS agent,
            ROUND(AVG(talk_sec),0) AS avg_talk,
            ROUND(AVG(dispo_sec),0) AS avg_wrap,
            ROUND(AVG(talk_sec + dispo_sec),0) AS avg_aht
        FROM vicidial_agent_log
        WHERE DATE(event_time) BETWEEN :start AND :end
        AND campaign_id IN ({campaign_in})
        GROUP BY user
        ORDER BY avg_aht DESC
        LIMIT 5
    """)

    rows = db2.execute(query, {"start": start_date, "end": end_date}).mappings().fetchall() or []

    total_agents = len(rows)

    overall = {
        "avgTalkTimeSec": round(sum(r["avg_talk"] or 0 for r in rows) / total_agents, 0) if total_agents else 0,
        "avgWrapUpTimeSec": round(sum(r["avg_wrap"] or 0 for r in rows) / total_agents, 0) if total_agents else 0,
        "avgAHTSec": round(sum(r["avg_aht"] or 0 for r in rows) / total_agents, 0) if total_agents else 0,
    }

    return {
        "agents": [
            {
                "agent": r["agent"],
                "talkSec": int(r["avg_talk"]),
                "wrapSec": int(r["avg_wrap"]),
                "avgAHTSec": int(r["avg_aht"]),
            }
            for r in rows
        ],
        "overall": overall
    }



@router.post("/outbound/agent-performance")
def agent_performance(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    query = text(f"""
        SELECT
            user AS agent,
            COUNT(*) AS calls,
            ROUND(SUM(user != 'VDAD') * 100 / COUNT(*),1) AS connect_rate,
            ROUND(SUM(status = 'SALE') * 100 / COUNT(*),1) AS outcome_rate,
            ROUND(AVG(length_in_sec),0) AS aht
        FROM vicidial_log
        WHERE DATE(call_date) BETWEEN :start AND :end
        AND campaign_id IN ({campaign_in})
        AND user != 'VDAD'
        GROUP BY user
        ORDER BY outcome_rate DESC
    """)

    rows = db2.execute(query, {"start": start_date, "end": end_date}).mappings().all()

    return [
        {
            "agent": r["agent"],
            "calls": int(r["calls"]),
            "connection": float(r["connect_rate"]),
            "outcome": float(r["outcome_rate"]),
            "ahtSec": int(r["aht"]),
        }
        for r in rows
    ]



@router.post("/outbound/drop-reasons")
def drop_reasons(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    query = text(f"""
        SELECT
            term_reason AS reason,
            COUNT(*) AS value,
            ROUND(COUNT(*) * 100 / SUM(COUNT(*)) OVER (), 1) AS percentage
        FROM vicidial_log
        WHERE DATE(call_date) BETWEEN :start AND :end
        AND campaign_id IN ({campaign_in})
        AND user = 'VDAD'
        AND term_reason != 'NONE'
        GROUP BY term_reason
        ORDER BY value DESC
        LIMIT 5
    """)

    rows = db2.execute(query, {"start": start_date, "end": end_date}).mappings().all()

    return [
        {
            "reason": r["reason"],
            "value": int(r["value"]),
            "percentage": float(r["percentage"]),
        }
        for r in rows
    ]

