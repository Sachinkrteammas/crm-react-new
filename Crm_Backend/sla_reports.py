# from fastapi import APIRouter, Depends, HTTPException
# from fastapi.responses import StreamingResponse
# from sqlalchemy.orm import Session
# from sqlalchemy import text
# from pydantic import BaseModel
# from datetime import datetime
# from database import get_db4, get_db2
# from openpyxl import Workbook
# from io import BytesIO

# router = APIRouter()


# class SLARequest(BaseModel):
#     from_date: str
#     to_date: str
#     company_id: int


# @router.post("/sla_cdr_report_excel")
# def get_sla_cdr_report_excel(
#     request: SLARequest,
#     db: Session = Depends(get_db4),
#     db2: Session = Depends(get_db2),
# ):
#     # Validate dates
#     try:
#         from_dt = datetime.strptime(request.from_date, "%Y-%m-%d").date()
#         to_dt = datetime.strptime(request.to_date, "%Y-%m-%d").date()
#     except ValueError:
#         raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

#     # Allow only client 656
#     if request.company_id != 656:
#         raise HTTPException(status_code=403, detail="This SLA CDR report is ONLY available for client 656.")

#     # Fetch campaigns for client 656
#     reg_query = text("""
#         SELECT GroupId, campaignid
#         FROM registration_master
#         WHERE company_id = :cid
#     """)
#     reg_row = db.execute(reg_query, {"cid": 656}).mappings().first()
#     if not reg_row:
#         raise HTTPException(status_code=404, detail="Client 656 not found or has no campaigns.")

#     campaigns_raw = reg_row["GroupId"] or reg_row["campaignid"] or ""
#     campaign_clean = [c.strip().strip("'") for c in campaigns_raw.split(",") if c.strip()]
#     if not campaign_clean:
#         raise HTTPException(status_code=404, detail="No campaigns found for client 656.")

#     # Use t3 (vicidial_agent_log) for wait_sec/talk_sec/pause_sec/dispo_sec
#     # COALESCE handles cases where agent_log row is absent
#     cdr_query = text("""
#         SELECT
#             t2.user AS agent,
#             t2.phone_number,
#             DATE(t2.call_date) AS call_date,
#             COALESCE(t3.wait_sec, 0) AS queue_time,
#             FROM_UNIXTIME(t2.start_epoch) AS start_time,
#             FROM_UNIXTIME(t2.end_epoch) AS end_time,
#             COALESCE(t3.dispo_sec, 0) AS wrap_time,
#             (COALESCE(t3.talk_sec, 0) + COALESCE(t3.wait_sec, 0) + COALESCE(t3.pause_sec, 0)) AS call_duration_sec,
#             t2.campaign_id AS source,
#             t2.uniqueid
#         FROM vicidial_log t2
#         LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid
#         WHERE t2.campaign_id IN :campaign_ids
#           AND DATE(t2.call_date) BETWEEN :from_dt AND :to_dt
#         ORDER BY t2.call_date DESC
#     """)

#     rows = db2.execute(
#         cdr_query,
#         {
#             "campaign_ids": tuple(campaign_clean),
#             "from_dt": str(from_dt),
#             "to_dt": str(to_dt),
#         },
#     ).mappings().all()

#     # Build Excel
#     wb = Workbook()
#     ws = wb.active
#     ws.title = "SLA CDR Report"

#     headers = [
#         "Agent",
#         "PhoneNumber",
#         "CallDate",
#         "QueueTime",
#         "StartTime",
#         "EndTime",
#         "WrapTime",
#         "CallDurationSec",
#         "Source",
#         "Recording",
#     ]
#     ws.append(headers)

#     for r in rows:
#         rec_url = (
#             f"https://dialdesk.co.in/download-recording/download.php?"
#             f"mode=DD&filename={r['uniqueid']}&agent={r['agent']}"
#         )

#         ws.append(
#             [
#                 r["agent"],
#                 r["phone_number"],
#                 str(r["call_date"]),
#                 r["queue_time"],
#                 r["start_time"],
#                 r["end_time"],
#                 r["wrap_time"],
#                 r["call_duration_sec"],
#                 r["source"],
#                 rec_url,
#             ]
#         )

#     # Auto-fit columns
#     for col in ws.columns:
#         max_len = max(len(str(cell.value)) if cell.value is not None else 0 for cell in col)
#         ws.column_dimensions[col[0].column_letter].width = max_len + 2

#     # Stream back
#     output = BytesIO()
#     wb.save(output)
#     output.seek(0)
#     filename = f"SLA_CDR_Report_{from_dt}_to_{to_dt}.xlsx"

#     return StreamingResponse(
#         output,
#         media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
#         headers={"Content-Disposition": f"attachment; filename={filename}"},
#     )






# {"variant":"standard","id":"56125","title":"Cleaned SLA Reports Module"}
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from datetime import datetime
from database import get_db4, get_db2
from openpyxl import Workbook
from io import BytesIO

router = APIRouter()

# --- Request model ---
class SLARequest(BaseModel):
    from_date: str
    to_date: str
    company_id: int

# --- SLA CDR Excel Report endpoint ---
@router.post("/sla_cdr_report_excel")
def get_sla_cdr_report_excel(
    request: SLARequest,
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2),
):
    # Validate date format
    try:
        from_dt = datetime.strptime(request.from_date, "%Y-%m-%d").date()
        to_dt = datetime.strptime(request.to_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Restrict report to client 656 (adjust if needed for multiple clients)
    if request.company_id != 656:
        raise HTTPException(
            status_code=403,
            detail="This SLA CDR report is ONLY available for client 656."
        )

    # Fetch campaigns for client
    reg_query = text("""
        SELECT GroupId, campaignid
        FROM registration_master
        WHERE company_id = :cid
    """)
    reg_row = db.execute(reg_query, {"cid": request.company_id}).mappings().first()
    if not reg_row:
        raise HTTPException(status_code=404, detail="Client not found or has no campaigns.")

    campaigns_raw = reg_row["GroupId"] or reg_row["campaignid"] or ""
    campaign_clean = [c.strip().strip("'") for c in campaigns_raw.split(",") if c.strip()]
    if not campaign_clean:
        raise HTTPException(status_code=404, detail="No campaigns found for this client.")

    # --- Fetch CDR data ---
    cdr_query = text("""
        SELECT
            t2.uniqueid,
            t2.user AS agent,
            t4.full_name AS full_name,
            t2.lead_id,
            t2.phone_number,
            DATE(t2.call_date) AS call_date,
            SEC_TO_TIME(COALESCE(t3.wait_sec,0)) AS queuetime,
            DATE_FORMAT(DATE_SUB(FROM_UNIXTIME(t2.start_epoch), INTERVAL COALESCE(t3.wait_sec,0) SECOND),'%Y-%m-%dT%H:%i:%s') AS queue_start,
            DATE_FORMAT(FROM_UNIXTIME(t2.start_epoch),'%Y-%m-%dT%H:%i:%s') AS start_time,
            DATE_FORMAT(FROM_UNIXTIME(t2.end_epoch),'%Y-%m-%dT%H:%i:%s') AS end_time,
            SEC_TO_TIME(COALESCE(t3.dispo_sec,0)) AS wrap_time,
            DATE_FORMAT(DATE_ADD(FROM_UNIXTIME(t2.end_epoch), INTERVAL COALESCE(t3.dispo_sec,0) SECOND),'%Y-%m-%dT%H:%i:%s') AS wrap_end_time,
            SEC_TO_TIME(t2.length_in_sec) AS call_duration,
            t2.length_in_sec AS call_duration1,
            (t2.length_in_sec >= 20) AS call20,
            (t2.length_in_sec >= 60) AS call60,
            (t2.length_in_sec >= 90) AS call90,
            t2.status,
            t2.term_reason,
            t2.campaign_id AS source,
            0 AS xfercallid
        FROM vicidial_log t2
        LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid = t3.uniqueid
        LEFT JOIN vicidial_users t4 ON t2.user = t4.user
        WHERE t2.campaign_id IN :campaign_ids
          AND DATE(t2.call_date) BETWEEN :from_dt AND :to_dt
        ORDER BY t2.call_date DESC
    """)

    rows = db2.execute(
        cdr_query,
        {
            "campaign_ids": tuple(campaign_clean),
            "from_dt": str(from_dt),
            "to_dt": str(to_dt)
        }
    ).mappings().all()

    # --- Generate Excel ---
    wb = Workbook()
    ws = wb.active
    ws.title = "SLA CDR Report"

    headers = [
        "UniqueID","Agent","AgentName","LeadID","PhoneNumber","CallDate",
        "QueueTime","QueueStart","StartTime","EndTime","WrapTime","WrapEndTime",
        "CallDuration","CallDurationSec","Call20","Call60","Call90",
        "Status","TermReason","Source","XferCallID","Recording"
    ]
    ws.append(headers)

    for r in rows:
        rec_url = f"https://dialdesk.co.in/download-recording/download.php?mode=DD&filename={r['uniqueid']}&agent={r['agent']}"
        ws.append([
            r["uniqueid"],
            r["agent"],
            r["full_name"],
            r["lead_id"],
            r["phone_number"],
            str(r["call_date"]),
            r["queuetime"],
            r["queue_start"],
            r["start_time"],
            r["end_time"],
            r["wrap_time"],
            r["wrap_end_time"],
            r["call_duration"],
            r["call_duration1"],
            r["call20"],
            r["call60"],
            r["call90"],
            r["status"],
            r["term_reason"],
            r["source"],
            r["xfercallid"],
            rec_url
        ])

    # Auto-fit columns
    for col in ws.columns:
        max_len = max(len(str(cell.value)) if cell.value else 0 for cell in col)
        ws.column_dimensions[col[0].column_letter].width = max_len + 2

    # Stream Excel
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    filename = f"SLA_CDR_Report_{request.company_id}_{from_dt}_to_{to_dt}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
