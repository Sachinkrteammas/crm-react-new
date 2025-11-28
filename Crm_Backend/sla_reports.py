
# SLA Report For hours..//
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db2
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from io import BytesIO

router = APIRouter(prefix="/sla", tags=["SLA Reports"])

# ---------------- JSON API for table ----------------
@router.get("/agents")
def get_sla_agents(start_date: str, end_date: str, db: Session = Depends(get_db2)):
    """
    Get SLA agent performance for table view (JSON)
    """
    sql = f"""
        SELECT
            fc.call_date AS date,
            fc.time_slot AS hour,
            COUNT(*) AS total_calls,
            SUM(CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') THEN 1 ELSE 0 END) AS answered,
            COUNT(DISTINCT CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') THEN fc.user END) AS manpower,
            ROUND(SUM(CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') THEN 1 END)/COUNT(*), 4) AS ai_percent,
            ROUND(SUM(CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') AND (fc.end_epoch - fc.start_epoch) <= 20 THEN 1 END)/COUNT(*), 4) AS sl_percent,
            ROUND(SUM(CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') THEN 1 END)/COUNT(*), 4) AS rl_percent
        FROM (
            SELECT DATE(call_date) AS call_date, HOUR(call_date) AS time_slot, user, status, start_epoch, end_epoch
            FROM vicidial_log
            WHERE DATE(call_date) BETWEEN '{start_date}' AND '{end_date}' AND HOUR(call_date) BETWEEN 9 AND 21
            UNION ALL
            SELECT DATE(call_date) AS call_date, HOUR(call_date) AS time_slot, user, status, start_epoch, end_epoch
            FROM vicidial_closer_log
            WHERE DATE(call_date) BETWEEN '{start_date}' AND '{end_date}' AND HOUR(call_date) BETWEEN 9 AND 21
        ) fc
        GROUP BY fc.call_date, fc.time_slot
        ORDER BY fc.call_date, fc.time_slot
    """
    data = db.execute(text(sql)).mappings().all()
    return {"data": data}



# ---------------- Excel export ----------------
@router.get("/agents/export")
def export_sla_excel(start_date: str, end_date: str, db: Session = Depends(get_db2)):
    """
    Export SLA agent performance as Excel
    """
    sql = f"""
        SELECT
            fc.call_date AS date,
            fc.time_slot AS hour,
            COUNT(*) AS total_calls,
            SUM(CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') THEN 1 ELSE 0 END) AS answered,
            COUNT(DISTINCT CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') THEN fc.user END) AS manpower,
            ROUND(SUM(CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') THEN 1 END)/COUNT(*)*100, 2) AS ai_percent,
            ROUND(SUM(CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') AND (fc.end_epoch - fc.start_epoch) <= 20 THEN 1 END)/COUNT(*)*100, 2) AS sl_percent,
            ROUND(SUM(CASE WHEN fc.status IN ('A','ANSWER','AA','INCALL') THEN 1 END)/COUNT(*)*100, 2) AS rl_percent
        FROM (
            SELECT DATE(call_date) AS call_date, HOUR(call_date) AS time_slot, user, status, start_epoch, end_epoch
            FROM vicidial_log
            WHERE DATE(call_date) BETWEEN '{start_date}' AND '{end_date}' AND HOUR(call_date) BETWEEN 9 AND 21
            UNION ALL
            SELECT DATE(call_date) AS call_date, HOUR(call_date) AS time_slot, user, status, start_epoch, end_epoch
            FROM vicidial_closer_log
            WHERE DATE(call_date) BETWEEN '{start_date}' AND '{end_date}' AND HOUR(call_date) BETWEEN 9 AND 21
        ) fc
        GROUP BY fc.call_date, fc.time_slot
        ORDER BY fc.call_date, fc.time_slot
    """
    data = db.execute(text(sql)).mappings().all()

    # --- Excel generation remains unchanged ---
    wb = Workbook()
    ws = wb.active
    ws.title = "SLA Report"
    ws["A1"] = "SLA Report : AL/SL/RL"
    ws["A1"].font = Font(size=14, bold=True)
    ws["A2"] = f"Date Range: {start_date} to {end_date}"
    ws["A2"].font = Font(size=12)
    headers = ["Date", "Hour", "Total Calls", "Answered", "Manpower", "AI %", "SL %", "RL %"]
    ws.append([])
    ws.append(headers)
    header_row = 4
    fill = PatternFill("solid", fgColor="3A84F7")
    font_white = Font(color="FFFFFF", bold=True)
    center = Alignment(horizontal="center", vertical="center")
    for col in range(1, len(headers) + 1):
        c = ws.cell(header_row, col)
        c.fill = fill
        c.font = font_white
        c.alignment = center
    total_calls = total_answered = total_manpower = total_sl_hit = 0
    for row in data:
        tc = row["total_calls"] or 0
        ans = row["answered"] or 0
        mp = row["manpower"] or 0
        sl_count = round((row["sl_percent"] or 0) / 100 * tc)
        ai = (row["ai_percent"] or 0) / 100
        sl = (row["sl_percent"] or 0) / 100
        rl = (row["rl_percent"] or 0) / 100
        ws.append([row["date"], row["hour"], tc, ans, mp, ai, sl, rl])
        total_calls += tc
        total_answered += ans
        total_manpower += mp
        total_sl_hit += sl_count
    tr = ws.max_row + 1
    ws[f"A{tr}"] = "TOTAL"
    ws[f"C{tr}"] = total_calls
    ws[f"D{tr}"] = total_answered
    ws[f"E{tr}"] = total_manpower
    ws[f"F{tr}"] = (total_answered / total_calls if total_calls else 0)
    ws[f"G{tr}"] = (total_sl_hit / total_calls if total_calls else 0)
    ws[f"H{tr}"] = (total_answered / total_calls if total_calls else 0)
    for col in range(1, 9):
        ws.cell(tr, col).font = Font(bold=True)
    for row in ws.iter_rows(min_row=5, min_col=6, max_col=8):
        for cell in row:
            cell.number_format = "0.00%"
    for col in ws.columns:
        max_len = max(len(str(cell.value)) if cell.value else 0 for cell in col)
        ws.column_dimensions[col[0].column_letter].width = max_len + 4
    thin = Side(border_style="thin", color="000000")
    rng = f"A4:H{ws.max_row}"
    for r in ws[rng]:
        for cell in r:
            cell.border = Border(top=thin, left=thin, right=thin, bottom=thin)
    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=sla_report.xlsx"}
    )
