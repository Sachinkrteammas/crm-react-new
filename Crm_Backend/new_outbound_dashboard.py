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



# @router.post("/outbound/kpi-summary")
# def outbound_kpi_summary(
#     company_id: int,
#     start_date: date,
#     end_date: date,
#     db=Depends(get_db4),
#     db2=Depends(get_db2)
# ):
#     campaign_in = get_campaign_in_clause(db, company_id)

#     query = text(f"""
#         SELECT
#             COUNT(DISTINCT vl.lead_id) AS total_data_assigned,
#             COUNT(DISTINCT v.phone_number) AS unique_numbers_dialed,
#             COUNT(*) AS total_attempts,
#             ROUND(
#                 COUNT(*) / NULLIF(COUNT(DISTINCT v.phone_number), 0),
#                 2
#             ) AS avg_attempts_per_number,
#             SUM(CASE WHEN v.user != 'VDAD' THEN 1 ELSE 0 END) AS connected_calls,
#             ROUND(
#                 SUM(CASE WHEN v.user != 'VDAD' THEN 1 ELSE 0 END) * 100
#                 / NULLIF(COUNT(*), 0),
#                 1
#             ) AS connection_rate,
#             SUM(CASE WHEN v.status = 'SALE' THEN 1 ELSE 0 END) AS qualified_leads
#         FROM vicidial_log v
#         JOIN vicidial_list vl ON v.lead_id = vl.lead_id
#         WHERE DATE(v.call_date) BETWEEN :start AND :end
#         AND v.campaign_id IN ({campaign_in})
#         AND v.lead_id IS NOT NULL
#     """)

#     r = db2.execute(query, {"start": start_date, "end": end_date}).mappings().fetchone() or {}

#     return {
#         "totalDataAssigned": int(r.get("total_data_assigned", 0) or 0),
#         "uniqueNumbersDialed": int(r.get("unique_numbers_dialed", 0) or 0),
#         "totalAttempts": int(r.get("total_attempts", 0) or 0),
#         "avgAttemptsPerNumber": float(r.get("avg_attempts_per_number") or 0),
#         "connectedCalls": int(r.get("connected_calls", 0) or 0),
#         "connectionRate": float(r.get("connection_rate") or 0),
#         "qualifiedLeads": int(r.get("qualified_leads", 0) or 0),
#     }



@router.post("/outbound/kpi-summary")
def outbound_kpi_summary(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    start_dt = f"{start_date} 00:00:00"
    end_dt = f"{end_date} 23:59:59"

    query = text(f"""
        SELECT
            COUNT(DISTINCT vl.lead_id) AS total_data_assigned,
            COUNT(DISTINCT v.phone_number) AS unique_numbers_dialed,
            COUNT(*) AS total_attempts,
            COUNT(CASE
                WHEN vl.list_id = 998 THEN vl.lead_id
            END) AS manual_count,

            ROUND(
                COUNT(*) / NULLIF(COUNT(DISTINCT v.phone_number), 0),
                2
            ) AS avg_attempts_per_number,

            /* Strict Connected Logic */
            SUM(
                CASE
                    WHEN va.uniqueid IS NOT NULL
                    AND v.length_in_sec != '0'
                    AND v.user != 'VDAD'
                    THEN 1 ELSE 0
                END
            ) AS connected_calls,

            SUM(CASE WHEN v.status = 'SALE' THEN 1 ELSE 0 END) AS qualified_leads

        FROM vicidial_log v

        LEFT JOIN vicidial_agent_log va
            ON v.uniqueid = va.uniqueid

        JOIN vicidial_list vl
            ON v.lead_id = vl.lead_id

        WHERE v.call_date BETWEEN :start_dt AND :end_dt
        AND v.campaign_id IN ({campaign_in})
        AND v.lead_id IS NOT NULL
    """)

    r = db2.execute(
        query,
        {"start_dt": start_dt, "end_dt": end_dt}
    ).mappings().fetchone() or {}

    total_attempts = int(r.get("total_attempts", 0) or 0)
    connected_calls = int(r.get("connected_calls", 0) or 0)

    connection_rate = (
        round((connected_calls * 100) / total_attempts, 1)
        if total_attempts else 0
    )

    pd_count = int(total_attempts) - int(r.get("manual_count", 0) or 0)

    return {
        "totalDataAssigned": int(r.get("total_data_assigned", 0) or 0),
        "uniqueNumbersDialed": int(r.get("unique_numbers_dialed", 0) or 0),
        "totalAttempts": total_attempts,
        "avgAttemptsPerNumber": float(r.get("avg_attempts_per_number") or 0),
        "connectedCalls": connected_calls,
        "connectionRate": connection_rate,
        "qualifiedLeads": int(r.get("qualified_leads", 0) or 0),
        "manual_count": int(r.get("manual_count", 0) or 0),
        "pdCount": pd_count
    }



@router.post("/outbound/pd-data")
def pd_data(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    query = text(f"""
        SELECT
            v.uniqueid,
            v.lead_id,
            vl.list_id,
            v.campaign_id,
            v.call_date,
            v.start_epoch,
            v.end_epoch,
            v.length_in_sec,
            v.status,
            v.phone_code,
            v.phone_number,
            v.user,
            v.comments,
            v.processed,
            v.user_group,
            v.term_reason,
            v.alt_dial,
            v.called_count
        FROM vicidial_log v
        JOIN vicidial_list vl
            ON v.lead_id = vl.lead_id
        WHERE v.call_date BETWEEN :start_dt AND :end_dt
          AND v.campaign_id IN ({campaign_in})
          AND vl.list_id != 998
        ORDER BY v.call_date DESC
    """)

    rows = db2.execute(
        query,
        {
            "start_dt": f"{start_date} 00:00:00",
            "end_dt": f"{end_date} 23:59:59"
        }
    ).mappings().all()

    return {
        "total_records": len(rows),
        "data": [dict(row) for row in rows]
    }


# @router.post("/outbound/call-funnel")
# def outbound_call_funnel(
#     company_id: int,
#     start_date: date,
#     end_date: date,
#     db=Depends(get_db4),
#     db2=Depends(get_db2)
# ):
#     campaign_in = get_campaign_in_clause(db, company_id)

#     query = text(f"""
#             SELECT
#                 COUNT(DISTINCT vl.lead_id) AS total_data,
#                 COUNT(DISTINCT v.phone_number) AS unique_dialed,
#                 COUNT(*) AS total_attempts,
#                 SUM(CASE WHEN v.user != 'VDAD' THEN 1 ELSE 0 END) AS connected,
#                 SUM(CASE WHEN v.status = 'SALE' THEN 1 ELSE 0 END) AS qualified
#             FROM vicidial_log v
#             JOIN vicidial_list vl ON v.lead_id = vl.lead_id
#             WHERE DATE(v.call_date) BETWEEN :start AND :end
#             AND v.campaign_id IN ({campaign_in})
#             AND v.lead_id IS NOT NULL
#         """)

#     r = db2.execute(
#         query,
#         {"start": start_date, "end": end_date}
#     ).mappings().fetchone() or {}

#     total_data = r.get("total_data", 0)
#     unique_dialed = r.get("unique_dialed", 0)
#     connected = r.get("connected", 0)
#     qualified = r.get("qualified", 0)
#     total_attempts = r.get("total_attempts", 0)

#     dial_rate = (unique_dialed * 100 / total_data) if total_data else 0
#     connect_rate = (connected * 100 / unique_dialed) if unique_dialed else 0
#     outcome_rate = (qualified * 100 / connected) if connected else 0

#     return {
#         # Absolute numbers
#         "uniqueDialed": int(unique_dialed or 0),
#         "totalAttempts": int(total_attempts or 0),
#         "connectedCalls": int(connected or 0),
#         "qualifiedLeads": int(qualified or 0),

#         # Funnel rates
#         "dialRate": round(dial_rate, 1),
#         "connectRate": round(connect_rate, 1),
#         "outcomeRate": round(outcome_rate, 1),
#     }



@router.post("/outbound/call-funnel")
def outbound_call_funnel(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    start_dt = f"{start_date} 00:00:00"
    end_dt = f"{end_date} 23:59:59"

    query = text(f"""
        SELECT
            COUNT(DISTINCT vl.lead_id) AS total_data,
            COUNT(DISTINCT v.phone_number) AS unique_dialed,
            COUNT(*) AS total_attempts,

            /* Strict Connected Logic */
            SUM(
                CASE
                    WHEN va.uniqueid IS NOT NULL
                    AND v.length_in_sec != '0'
                    AND v.user != 'VDAD'
                    THEN 1 ELSE 0
                END
            ) AS connected,

            SUM(CASE WHEN v.status = 'SALE' THEN 1 ELSE 0 END) AS qualified

        FROM vicidial_log v

        LEFT JOIN vicidial_agent_log va
            ON v.uniqueid = va.uniqueid

        JOIN vicidial_list vl
            ON v.lead_id = vl.lead_id

        WHERE v.call_date BETWEEN :start_dt AND :end_dt
        AND v.campaign_id IN ({campaign_in})
        AND v.lead_id IS NOT NULL
    """)

    r = db2.execute(
        query,
        {"start_dt": start_dt, "end_dt": end_dt}
    ).mappings().fetchone() or {}

    total_data = int(r.get("total_data", 0) or 0)
    unique_dialed = int(r.get("unique_dialed", 0) or 0)
    total_attempts = int(r.get("total_attempts", 0) or 0)
    connected = int(r.get("connected", 0) or 0)
    qualified = int(r.get("qualified", 0) or 0)

    dial_rate = (unique_dialed * 100 / total_data) if total_data else 0
    connect_rate = (connected * 100 / unique_dialed) if unique_dialed else 0
    outcome_rate = (qualified * 100 / connected) if connected else 0

    return {
        "totaldata": total_data,
        "uniqueDialed": unique_dialed,
        "totalAttempts": total_attempts,
        "connectedCalls": connected,
        "qualifiedLeads": qualified,
        "dialRate": round(dial_rate, 1),
        "connectRate": round(connect_rate, 1),
        "outcomeRate": round(outcome_rate, 1),
    }


# @router.post("/outbound/performance-trend")
# def outbound_performance_trend(
#     company_id: int,
#     start_date: date,
#     end_date: date,
#     db=Depends(get_db4),
#     db2=Depends(get_db2)
# ):
#     campaign_in = get_campaign_in_clause(db, company_id)

#     query = text(f"""
#         SELECT
#             DATE(call_date) AS day,
#             COUNT(*) AS attempts,
#             ROUND(SUM(user != 'VDAD') * 100 / COUNT(*), 1) AS connect_rate,
#             ROUND(SUM(status = 'SALE') * 100 / COUNT(*), 1) AS outcome_rate
#         FROM vicidial_log
#         WHERE DATE(call_date) BETWEEN :start AND :end
#         AND campaign_id IN ({campaign_in})
#         GROUP BY DATE(call_date)
#         ORDER BY day
#     """)

#     rows = db2.execute(query, {"start": start_date, "end": end_date}).mappings().all()

#     total_days = len(rows)
#     return {
#         "trend": [
#             {
#                 "day": str(r["day"]),
#                 "attempts": int(r["attempts"]),
#                 "connect": float(r["connect_rate"] or 0),
#                 "outcome": float(r["outcome_rate"] or 0),
#             } for r in rows
#         ],
#         "averages": {
#             "avgAttempts": round(sum(r["attempts"] for r in rows) / total_days, 0) if total_days else 0,
#             "avgConnect": round(sum(r["connect_rate"] for r in rows) / total_days, 1) if total_days else 0,
#             "avgOutcome": round(sum(r["outcome_rate"] for r in rows) / total_days, 1) if total_days else 0,
#         }
#     }





@router.post("/outbound/performance-trend")
def outbound_performance_trend(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    start_dt = f"{start_date} 00:00:00"
    end_dt = f"{end_date} 23:59:59"

    # -----------------------------------
    # 1️⃣ Daily Attempts (INDEX SAFE)
    # -----------------------------------
    attempts_query = text(f"""
        SELECT
            DATE(call_date) AS day,
            COUNT(*) AS attempts,
            SUM(CASE WHEN status = 'SALE' THEN 1 ELSE 0 END) AS sales
        FROM vicidial_log
        WHERE call_date BETWEEN :start AND :end
        AND campaign_id IN ({campaign_in})
        GROUP BY DATE(call_date)
        ORDER BY day
    """)

    attempt_rows = db2.execute(
        attempts_query,
        {"start": start_dt, "end": end_dt}
    ).mappings().all()

    trend_data = {
        r["day"]: {
            "attempts": int(r["attempts"] or 0),
            "sales": int(r["sales"] or 0),
            "connected": 0
        }
        for r in attempt_rows
    }

    # -----------------------------------
    # 2️⃣ Daily Connected (Optimized Join)
    # -----------------------------------
    connected_query = text(f"""
        SELECT
            DATE(v.call_date) AS day,
            COUNT(1) AS connected
        FROM (
            SELECT uniqueid, call_date
            FROM vicidial_log
            WHERE call_date BETWEEN :start AND :end
            AND campaign_id IN ({campaign_in})
            AND length_in_sec > 0
            AND user != 'VDAD'
        ) v
        INNER JOIN vicidial_agent_log va
            ON v.uniqueid = va.uniqueid
        GROUP BY DATE(v.call_date)
    """)

    connected_rows = db2.execute(
        connected_query,
        {"start": start_dt, "end": end_dt}
    ).mappings().all()

    for r in connected_rows:
        day = r["day"]
        if day in trend_data:
            trend_data[day]["connected"] = int(r["connected"] or 0)

    # -----------------------------------
    # 3️⃣ Build Final Response
    # -----------------------------------
    trend_list = []

    for day in sorted(trend_data.keys()):
        attempts = trend_data[day]["attempts"]
        connected = trend_data[day]["connected"]
        sales = trend_data[day]["sales"]

        connect_rate = (connected * 100 / attempts) if attempts else 0
        outcome_rate = (sales * 100 / connected) if connected else 0

        trend_list.append({
            "day": str(day),
            "attempts": attempts,
            "connect": round(connect_rate, 1),
            "outcome": round(outcome_rate, 1),
        })

    total_days = len(trend_list)

    return {
        "trend": trend_list,
        "averages": {
            "avgAttempts": round(
                sum(d["attempts"] for d in trend_list) / total_days, 0
            ) if total_days else 0,
            "avgConnect": round(
                sum(d["connect"] for d in trend_list) / total_days, 1
            ) if total_days else 0,
            "avgOutcome": round(
                sum(d["outcome"] for d in trend_list) / total_days, 1
            ) if total_days else 0,
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
            val.user AS agent,
            ROUND(AVG(talk_sec),0) AS avg_talk,
            ROUND(AVG(dispo_sec),0) AS avg_wrap,
            ROUND(AVG(talk_sec + dispo_sec),0) AS avg_aht
        FROM vicidial_agent_log val
        JOIN vicidial_log vl ON vl.uniqueid=val.uniqueid 
        WHERE DATE(event_time) BETWEEN :start AND :end
        AND val.campaign_id IN ({campaign_in})
        GROUP BY val.user
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



# @router.post("/outbound/agent-performance")
# def agent_performance(
#     company_id: int,
#     start_date: date,
#     end_date: date,
#     db=Depends(get_db4),
#     db2=Depends(get_db2)
# ):
#     campaign_in = get_campaign_in_clause(db, company_id)

#     query = text(f"""
#         SELECT
#             user AS agent,
#             COUNT(*) AS calls,
#             ROUND(SUM(user != 'VDAD') * 100 / COUNT(*),1) AS connect_rate,
#             ROUND(SUM(status = 'SALE') * 100 / COUNT(*),1) AS outcome_rate,
#             ROUND(AVG(length_in_sec),0) AS aht
#         FROM vicidial_log
#         WHERE DATE(call_date) BETWEEN :start AND :end
#         AND campaign_id IN ({campaign_in})
#         AND user != 'VDAD'
#         GROUP BY user
#         ORDER BY outcome_rate DESC
#     """)

#     rows = db2.execute(query, {"start": start_date, "end": end_date}).mappings().all()

#     return [
#         {
#             "agent": r["agent"],
#             "calls": int(r["calls"]),
#             "connection": float(r["connect_rate"]),
#             "outcome": float(r["outcome_rate"]),
#             "ahtSec": int(r["aht"]),
#         }
#         for r in rows
#     ]



@router.post("/outbound/agent-performance")
def agent_performance(
    company_id: int,
    start_date: date,
    end_date: date,
    db=Depends(get_db4),
    db2=Depends(get_db2)
):
    campaign_in = get_campaign_in_clause(db, company_id)

    start_dt = f"{start_date} 00:00:00"
    end_dt = f"{end_date} 23:59:59"

    # ---------------------------------------
    # 1️⃣ Total Calls Per Agent (INDEX SAFE)
    # ---------------------------------------
    calls_query = text(f"""
        SELECT
            vu.full_name,
            vl.user AS agent,
            COUNT(*) AS total_calls,
            SUM(vl.status = 'SALE') AS total_sales,
            ROUND(AVG(vl.length_in_sec),0) AS aht
        FROM vicidial_log vl
        LEFT JOIN vicidial_users vu ON vl.user=vu.user
        WHERE vl.call_date BETWEEN :start AND :end
        AND vl.campaign_id IN ({campaign_in})
        AND vl.user != 'VDAD'
        GROUP BY vl.user
    """)

    calls_rows = db2.execute(
        calls_query,
        {"start": start_dt, "end": end_dt}
    ).mappings().all()

    agent_data = {
        r["agent"]: {
            "full_name": r["full_name"],
            "calls": int(r["total_calls"] or 0),
            "sales": int(r["total_sales"] or 0),
            "aht": int(r["aht"] or 0),
            "connected": 0
        }
        for r in calls_rows
    }

    # ---------------------------------------
    # 2️⃣ Connected Calls (Optimized Join)
    # ---------------------------------------
    connected_query = text(f"""
        SELECT
            v.user AS agent,
            COUNT(1) AS total_connected
        FROM (
            SELECT uniqueid, user
            FROM vicidial_log
            WHERE call_date BETWEEN :start AND :end
            AND campaign_id IN ({campaign_in})
            AND length_in_sec > 0
            AND user != 'VDAD'
        ) v
        INNER JOIN vicidial_agent_log va
            ON v.uniqueid = va.uniqueid
        GROUP BY v.user
    """)

    connected_rows = db2.execute(
        connected_query,
        {"start": start_dt, "end": end_dt}
    ).mappings().all()

    for r in connected_rows:
        agent = r["agent"]
        if agent in agent_data:
            agent_data[agent]["connected"] = int(r["total_connected"] or 0)

    # ---------------------------------------
    # 3️⃣ Build Final Response
    # ---------------------------------------
    result = []

    for agent, data in agent_data.items():
        calls = data["calls"]
        connected = data["connected"]
        sales = data["sales"]

        connection_percent = (connected * 100 / calls) if calls else 0
        outcome_percent = (sales * 100 / connected) if connected else 0

        result.append({
            "agent": data["full_name"] or agent,
            "calls": calls,
            # "connectedCalls": connected,
            "connection": round(connection_percent, 1),
            "outcome": round(outcome_percent, 1),
            "ahtSec": data["aht"],
        })

    result.sort(key=lambda x: x["outcome"], reverse=True)

    return result



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

