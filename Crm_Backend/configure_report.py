from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4
from schemas import * 
from reports import get_cdr_report
from datetime import datetime, timedelta
from database import SessionLocal4, SessionLocal2
from month_wise_statement_summary import month_wise_statement_summary
from Agent_Apr import apr_report_json

router = APIRouter()





# ----------------------------
# API Endpoint
# ----------------------------
@router.post("/add_client_report")
def add_client_report(
    client_id: str = Query(...),          # <-- ONLY IN QUERY PARAM
    report_name: str = Query(...),        # <-- ONLY IN QUERY PARAM
    db: Session = Depends(get_db4)
):

    # 1. Validate report_name (optional but recommended)
    allowed_reports = ["CDR_REPORT", "BILLING_REPORT"]

    if report_name not in allowed_reports:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid report_name. Allowed: {', '.join(allowed_reports)}"
        )

    # 2. Check duplicate entry
    check_query = text("""
        SELECT id FROM client_report_config
        WHERE client_id = :client_id
        AND report_name = :report_name
        AND is_active = 1
    """)

    existing = db.execute(check_query, {
        "client_id": client_id,
        "report_name": report_name
    }).fetchone()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Report already configured for this client"
        )

    # 3. Insert data
    insert_query = text("""
        INSERT INTO client_report_config
        (client_id, report_name, is_active)
        VALUES
        (:client_id, :report_name, 1)
    """)

    db.execute(insert_query, {
        "client_id": client_id,
        "report_name": report_name
    })

    db.commit()

    return {
        "status": "success",
        "message": "Client report configuration saved",
        "data": {
            "client_id": client_id,
            "report_name": report_name
        }
    }





@router.get("/get_client_reports")
def get_client_reports(
    client_id: str = Query(...),
    db: Session = Depends(get_db4)
):
    try:
        query = text("""
            SELECT *
            FROM client_report_config
            WHERE client_id = :client_id
        """)

        result = db.execute(query, {"client_id": client_id}).mappings().all()

        if not result:
            return {
                "status": "success",
                "message": "No reports configured for this client",
                "data": []
            }

        return {
            "status": "success",
            "client_id": client_id,
            "total_reports": len(result),
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@router.delete("/delete_client_report_permanent")
def delete_client_report_permanent(
    id: int = Query(...),
    db: Session = Depends(get_db4)
):
    try:
        delete_query = text("""
            DELETE FROM client_report_config
            WHERE id = :id
        """)

        result = db.execute(delete_query, {"id": id})
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        return {
            "status": "success",
            "message": "Report deleted permanently",
            "id": id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))







def parse_dt(val):
    if not val:
        return None

    try:
        # Case 1: already datetime object
        if isinstance(val, datetime):
            return val

        # Case 2: ISO format with T
        if "T" in val:
            return datetime.fromisoformat(val)

        # Case 3: normal MySQL format
        return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")

    except Exception as e:
        print("❌ Datetime parse error:", val, str(e))
        return None




def run_cdr_scheduler():
    db = SessionLocal4()
    db2 = SessionLocal2()

    try:
        # yesterday = (datetime.now() - timedelta(days=1)).date()
        yesterday = datetime.strptime('2026-01-01', "%Y-%m-%d").date()


        query = text("""
            SELECT client_id, report_name
            FROM client_report_config
            WHERE is_active = 1
        """)

        clients = db.execute(query).fetchall()
        print(clients)

        for row in clients:
            client_id = row.client_id
            report_name = row.report_name

            try:
                # =====================================================
                # ✅ CDR REPORT
                # =====================================================
                if report_name == "CDR_REPORT":

                    request_data = CDRReportRequest(
                        from_date=yesterday,
                        to_date=yesterday,
                        company_id=int(client_id),
                        category="All"
                    )
                    print(request_data)

                    # ✅ Direct function call (NO API HIT)
                    data = get_cdr_report(request_data, db, db2)

                    insert_query = text("""
                        INSERT INTO cdr_report_data (
                            uniqueid, campaign_id, agent, full_name,
                            leadid, phone_number, call_date,
                            queue_start, start_time, end_time, wrap_end_time,
                            queuetime, call_duration, call_duration1, wrap_time,
                            parked_time,
                            call20, call60, call90,
                            STATUS, sub_status, term_reason,
                            xfercallid,
                            call_type,
                            category1, category2, category3, category4, category5,
                            source,
                            recording,
                            client_id, report_date
                        )
                        VALUES (
                            :uniqueid, :campaign_id, :agent, :full_name,
                            :leadid, :phone_number, :call_date,
                            :queue_start, :start_time, :end_time, :wrap_end_time,
                            :queuetime, :call_duration, :call_duration1, :wrap_time,
                            :parked_time,
                            :call20, :call60, :call90,
                            :status, :sub_status, :term_reason,
                            :xfercallid,
                            :call_type,
                            :category1, :category2, :category3, :category4, :category5,
                            :source,
                            :recording,
                            :client_id, :report_date
                        )
                    """)

                    for row_data in data:
                        try:
                            # ✅ Handle Pydantic
                            if hasattr(row_data, "dict"):
                                row_data = row_data.dict()

                            db.execute(insert_query, {
                                "uniqueid": row_data.get("uniqueid"),
                                "campaign_id": row_data.get("campaign_id"),
                                "agent": row_data.get("agent"),
                                "full_name": row_data.get("full_name"),
                                "leadid": row_data.get("leadid"),
                                "phone_number": row_data.get("phone_number"),
                                "call_date": row_data.get("call_date"),

                                "queue_start": parse_dt(row_data.get("queue_start")),
                                "start_time": parse_dt(row_data.get("start_time")),
                                "end_time": parse_dt(row_data.get("end_time")),
                                "wrap_end_time": parse_dt(row_data.get("wrap_end_time")),

                                "queuetime": row_data.get("queuetime"),
                                "call_duration": row_data.get("call_duration"),
                                "call_duration1": int(row_data.get("call_duration1") or 0),
                                "wrap_time": row_data.get("wrap_time"),

                                "parked_time": row_data.get("parked_time"),

                                "call20": row_data.get("call20"),
                                "call60": row_data.get("call60"),
                                "call90": row_data.get("call90"),

                                "status": row_data.get("status"),
                                "sub_status": row_data.get("sub_status"),
                                "term_reason": row_data.get("term_reason"),

                                "xfercallid": row_data.get("xfercallid"),

                                "call_type": row_data.get("CallType"),

                                "category1": row_data.get("Category1"),
                                "category2": row_data.get("Category2"),
                                "category3": row_data.get("Category3"),
                                "category4": row_data.get("Category4"),
                                "category5": row_data.get("Category5"),

                                "source": row_data.get("Source"),
                                "recording": row_data.get("Recording"),

                                "client_id": client_id,
                                "report_date": yesterday
                            })

                        except Exception as e:
                            print("❌ Insert Error:", str(e))

                    db.commit()

                    print(f"{len(data)} records fetched for {client_id}")

                # =====================================================
                # ✅ BILLING REPORT
                # =====================================================
                elif report_name == "BILLING_REPORT":

                    print(f"▶ Running Billing for {client_id}")

                    result = month_wise_statement_summary(
                        client_id=client_id,
                        from_date=yesterday,
                        to_date=yesterday,
                        db=db,
                        db2=db2
                    )

                    print(f"✅ Billing Done: {client_id}", result)

            except Exception as e:
                print(f"❌ Error for {client_id} ({report_name}): {str(e)}")
    finally:
        db.close()
        db2.close()









def run_agent_apr_scheduler():
    db = SessionLocal4()
    db2 = SessionLocal2()

    try:
        # yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        yesterday = datetime.strptime('2026-02-04', "%Y-%m-%d").date()

        print(f"▶ Running Agent APR RAW for {yesterday}")

        try:
            # ✅ Call your function (NO API call)
            result = apr_report_json(
                query_date=yesterday,
                end_date=yesterday,
                agent_type="All",
                process="All",
                shift="ALL"
            )

            raw_data = result.get("raw_data", [])
            print(f"Fetched {len(raw_data)} raw records")

            # 🔹 Delete existing data (avoid duplicates)
            db.execute(text("""
                DELETE FROM agent_apr_data
                WHERE report_date = :report_date
            """), {"report_date": yesterday})

            insert_query = text("""
                INSERT INTO agent_apr_data (
                    report_date, agent_type, process,
                    agent_id, agent_name,
                    calls, acht,
                    talktime, park_time,
                    transfer_count,
                    net_login, productive_login,
                    lunch, bio, tea_short, operation, quality, refresher, training,
                    quality_score, utilization_percent,
                    first_login, last_logout,
                    tagging_no
                )
                VALUES (
                    :report_date, :agent_type, :process,
                    :agent_id, :agent_name,
                    :calls, :acht,
                    :talktime, :park_time,
                    :transfer_count,
                    :net_login, :productive_login,
                    :lunch, :bio, :tea_short, :operation, :quality, :refresher, :training,
                    :quality_score, :utilization_percent,
                    :first_login, :last_logout,
                    :tagging_no
                )
            """)

            for row_data in raw_data:
                try:
                    db.execute(insert_query, {
                        "report_date": row_data.get("Date"),
                        "agent_type": row_data.get("Agent Type"),
                        "process": row_data.get("Process"),

                        "agent_id": row_data.get("Agent ID"),
                        "agent_name": row_data.get("Agent Name"),

                        "calls": row_data.get("Calls"),
                        "acht": row_data.get("ACHT"),

                        "talktime": row_data.get("Talktime"),
                        "park_time": row_data.get("Park Time"),

                        "transfer_count": row_data.get("Transfer Count"),

                        "net_login": row_data.get("Net Login"),
                        "productive_login": row_data.get("Productive Login"),

                        "lunch": row_data.get("Lunch"),
                        "bio": row_data.get("Bio"),
                        "tea_short": row_data.get("Tea/Short"),
                        "operation": row_data.get("Operation"),
                        "quality": row_data.get("Quality"),
                        "refresher": row_data.get("Refresher"),
                        "training": row_data.get("Training"),

                        "quality_score": row_data.get("Quality Score") or 0,
                        "utilization_percent": float(row_data.get("Utilization%") or 0),

                        "first_login": row_data.get("First Login"),
                        "last_logout": row_data.get("Last Logout"),

                        "tagging_no": row_data.get("Tagging no")
                    })

                except Exception as e:
                    print("❌ Insert Error:", str(e))

            db.commit()

            print(f"✅ Agent APR RAW saved for {yesterday}")

        except Exception as e:
            print("❌ Agent APR Scheduler Error:", str(e))

    finally:
        db.close()
        db2.close()