
# SLA Report For hours..//
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db2
from database import get_db4, get_engine4
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from io import BytesIO
from datetime import datetime
from utils.email_manager import send_sla_report_email, EMAIL_RECEIVER



router = APIRouter(prefix="/sla", tags=["SLA Reports"])



# ---------------- Reusable Excel generator ----------------
def generate_sla_excel_bytes(start_date: str, end_date: str, campaign_ids: list, db: Session):
    campaigns = [str(c).strip() for c in campaign_ids if str(c).strip()]
    if not campaigns:
        raise HTTPException(status_code=400, detail="No valid campaign IDs provided")

    placeholders = ", ".join([f":c{i}" for i in range(len(campaigns))])
    sql = text(f"""
        SELECT
            DATE_FORMAT(t2.call_date, '%Y-%m-%d %H:00:00') AS timeslot,
            COUNT(*) AS total_calls,
            SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 ELSE 0 END) AS answered,
            COUNT(DISTINCT CASE WHEN t2.user <> 'VDCL' THEN t2.user END) AS manpower,
            ROUND((SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 END) / COUNT(*)) * 100, 2) AS al_percent,
            ROUND(
                (SUM(CASE WHEN t2.user <> 'VDCL' AND t2.queue_seconds <= 20 THEN 1 END) /
                NULLIF(SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 END),0)) * 100, 2
            ) AS sl_percent
        FROM asterisk.vicidial_closer_log t2
        WHERE 
            t2.call_date BETWEEN CONCAT(:start_date,' 00:00:00') AND CONCAT(:end_date,' 23:59:59')
            AND t2.campaign_id IN ({placeholders})
        GROUP BY timeslot
        ORDER BY timeslot
    """)

    params = {"start_date": start_date, "end_date": end_date}
    params.update({f"c{i}": c for i, c in enumerate(campaigns)})
    data = db.execute(sql, params).mappings().all()

    # ---------- Generate Excel ----------
    wb = Workbook()
    ws = wb.active
    ws.title = "SLA Report"

    ws["A1"] = "SLA Report : AL/SL/RL"
    ws["A1"].font = Font(size=14, bold=True)
    ws["A2"] = f"Date Range: {start_date} to {end_date}"
    ws["A2"].font = Font(size=12)

    headers = ["Date", "Hour", "Total Calls", "Answered", "Manpower", "AL %", "SL %"]
    ws.append([])
    ws.append(headers)
    header_row = ws.max_row

    fill = PatternFill("solid", fgColor="3A84F7")
    font_white = Font(color="FFFFFF", bold=True)
    center = Alignment(horizontal="center", vertical="center")
    for col in range(1, len(headers)+1):
        cell = ws.cell(header_row, col)
        cell.fill = fill
        cell.font = font_white
        cell.alignment = center

    total_calls = total_answered = total_manpower = 0
    sl_values = []

    # ---------- Data Rows ----------
    for row in data:
        ts = row["timeslot"]
        hour = int(ts[11:13])
        if hour < 9 or hour > 20:
            continue

        date = ts[:10]
        tc = int(row.get("total_calls", 0))
        ans = int(row.get("answered", 0))
        mp = int(row.get("manpower", 0))
        al = float(row.get("al_percent", 0) or 0) / 100
        sl = float(row.get("sl_percent", 0) or 0) / 100

        ws.append([date, hour, tc, ans, mp, al, sl])
        total_calls += tc
        total_answered += ans
        total_manpower += mp
        sl_values.append(sl)

    # ---------- TOTAL ROW ----------
    tr = ws.max_row + 1
    ws[f"A{tr}"] = "TOTAL"
    ws[f"C{tr}"] = total_calls
    ws[f"D{tr}"] = total_answered
    ws[f"E{tr}"] = total_manpower
    ws[f"F{tr}"] = (total_answered / total_calls if total_calls else 0)
    ws[f"G{tr}"] = (sum(sl_values) / len(sl_values) if sl_values else 0)
    for col in range(1, len(headers)+1):
        ws.cell(tr, col).font = Font(bold=True)

    # ---------- Format percentages ----------
    for row_cells in ws.iter_rows(min_row=header_row+1, min_col=6, max_col=7):
        for cell in row_cells:
            cell.number_format = "0.00%"

    # ---------- Auto column width ----------
    thin = Side(border_style="thin", color="000000")
    for col in ws.columns:
        max_len = max(len(str(cell.value)) if cell.value else 0 for cell in col)
        ws.column_dimensions[col[0].column_letter].width = max_len + 4

    # ---------- Borders ----------
    for r in ws[f"A{header_row}:G{ws.max_row}"]:
        for cell in r:
            cell.border = Border(top=thin, left=thin, right=thin, bottom=thin)

    # ---------- Save Excel to BytesIO ----------
    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


# ---------------- JSON API for table ----------------
@router.get("/agents")
def get_sla_agents(start_date: str, end_date: str, campaign_ids: str, db: Session = Depends(get_db2)):
    campaigns = campaign_ids.split(",")

    placeholders = ", ".join([f":c{i}" for i in range(len(campaigns))])

    sql = text(f"""
        SELECT
            DATE_FORMAT(t2.call_date, '%Y-%m-%d %H:00:00') AS TimeSlot,
            COUNT(*) AS TotalCalls,
            SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 ELSE 0 END) AS Answered,
            SUM(CASE WHEN t2.user = 'VDCL' THEN 1 ELSE 0 END) AS Abandon,
            SUM(CASE WHEN t2.user <> 'VDCL' AND t2.queue_seconds <= 20 THEN 1 ELSE 0 END) AS SLA_Calls,
            COUNT(DISTINCT CASE WHEN t2.user <> 'VDCL' THEN t2.user END) AS Manpower,
            ROUND(
                (SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 END) / COUNT(*)) * 100, 2
            ) AS AL_Percentage,
            ROUND(
                (SUM(CASE WHEN t2.user <> 'VDCL' AND t2.queue_seconds <= 20 THEN 1 END) /
                NULLIF(SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 END),0)) * 100, 2
            ) AS SL_Percentage
        FROM asterisk.vicidial_closer_log t2
        WHERE 
            t2.call_date BETWEEN CONCAT(:start_date,' 00:00:00')
            AND CONCAT(:end_date,' 23:59:59')
            AND t2.campaign_id IN ({placeholders})
        GROUP BY TimeSlot
        ORDER BY TimeSlot
    """)

    params = {"start_date": start_date, "end_date": end_date}
    params.update({f"c{i}": c for i, c in enumerate(campaigns)})

    rows = db.execute(sql, params).mappings().all()
    return {"data": rows}



# ---------------- Excel export ----------------
@router.get("/agents/export")
def export_sla_excel(start_date: str, end_date: str, campaign_ids: str, db: Session = Depends(get_db2)):
    # --- Keep campaign IDs as strings ---
    campaigns = [c.strip() for c in campaign_ids.split(",") if c.strip()]
    if not campaigns:
        return {"error": "No valid campaign IDs provided"}

    placeholders = ", ".join([f":c{i}" for i in range(len(campaigns))])

    sql = text(f"""
        SELECT
            DATE_FORMAT(t2.call_date, '%Y-%m-%d %H:00:00') AS timeslot,
            COUNT(*) AS total_calls,
            SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 ELSE 0 END) AS answered,
            COUNT(DISTINCT CASE WHEN t2.user <> 'VDCL' THEN t2.user END) AS manpower,
            ROUND((SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 END) / COUNT(*)) * 100, 2) AS al_percent,
            ROUND(
                (SUM(CASE WHEN t2.user <> 'VDCL' AND t2.queue_seconds <= 20 THEN 1 END) /
                NULLIF(SUM(CASE WHEN t2.user <> 'VDCL' THEN 1 END),0)) * 100, 2
            ) AS sl_percent
        FROM asterisk.vicidial_closer_log t2
        WHERE 
            t2.call_date BETWEEN CONCAT(:start_date,' 00:00:00')
                            AND CONCAT(:end_date,' 23:59:59')
            AND t2.campaign_id IN ({placeholders})
        GROUP BY timeslot
        ORDER BY timeslot
    """)

    params = {"start_date": start_date, "end_date": end_date}
    params.update({f"c{i}": c for i, c in enumerate(campaigns)})

    data = db.execute(sql, params).mappings().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "SLA Report"

    # ---------- Header ----------
    ws["A1"] = "SLA Report : AL/SL/RL"
    ws["A1"].font = Font(size=14, bold=True)
    ws["A2"] = f"Date Range: {start_date} to {end_date}"
    ws["A2"].font = Font(size=12)

    headers = ["Date", "Hour", "Total Calls", "Answered", "Manpower", "AL %", "SL %"]
    ws.append([])
    ws.append(headers)
    header_row = ws.max_row

    fill = PatternFill("solid", fgColor="3A84F7")
    font_white = Font(color="FFFFFF", bold=True)
    center = Alignment(horizontal="center", vertical="center")

    for col in range(1, len(headers)+1):
        cell = ws.cell(header_row, col)
        cell.fill = fill
        cell.font = font_white
        cell.alignment = center

    total_calls = total_answered = total_manpower = 0
    sl_values = []

    # ---------- Data Rows ----------
    for row in data:
        ts = row["timeslot"]
        hour = int(ts[11:13])
        if hour < 9 or hour > 20:
            continue

        date = ts[:10]
        tc = int(row.get("total_calls", 0))
        ans = int(row.get("answered", 0))
        mp = int(row.get("manpower", 0))
        al = float(row.get("al_percent", 0) or 0) / 100
        sl = float(row.get("sl_percent", 0) or 0) / 100

        ws.append([date, hour, tc, ans, mp, al, sl])

        total_calls += tc
        total_answered += ans
        total_manpower += mp
        sl_values.append(sl)

    # ---------- TOTAL ROW ----------
    tr = ws.max_row + 1
    ws[f"A{tr}"] = "TOTAL"
    ws[f"C{tr}"] = total_calls
    ws[f"D{tr}"] = total_answered
    ws[f"E{tr}"] = total_manpower
    ws[f"F{tr}"] = (total_answered / total_calls if total_calls else 0)
    ws[f"G{tr}"] = (sum(sl_values) / len(sl_values) if sl_values else 0)

    for col in range(1, len(headers)+1):
        ws.cell(tr, col).font = Font(bold=True)

    # ---------- Format percentages ----------
    for row_cells in ws.iter_rows(min_row=header_row+1, min_col=6, max_col=7):
        for cell in row_cells:
            cell.number_format = "0.00%"

    # ---------- Auto column width ----------
    for col in ws.columns:
        max_len = max(len(str(cell.value)) if cell.value else 0 for cell in col)
        ws.column_dimensions[col[0].column_letter].width = max_len + 4

    # ---------- Borders ----------
    thin = Side(border_style="thin", color="000000")
    for r in ws[f"A{header_row}:G{ws.max_row}"]:
        for cell in r:
            cell.border = Border(top=thin, left=thin, right=thin, bottom=thin)

    # ---------- Return Excel ----------
    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=sla_report.xlsx"}
    )


@router.get("/agents/email", tags=["SLA Reports"])
def send_sla_report(
    start_date: str,
    end_date: str,
    campaign_ids: str,
    db: Session = Depends(get_db2)
):
    campaigns = [c.strip() for c in campaign_ids.split(",") if c.strip()]
    if not campaigns:
        raise HTTPException(status_code=400, detail="No valid campaign IDs provided")

    excel_stream = generate_sla_excel_bytes(start_date, end_date, campaigns, db)

    send_sla_report_email(excel_stream)

    return {"status": "success", "email_to": EMAIL_RECEIVER}
