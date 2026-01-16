from typing import Optional

# SLA Report For hours..//
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db2
from database import get_db4, get_engine4
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from io import BytesIO
from datetime import datetime, timedelta
from utils.email_manager import send_sla_report_email, EMAIL_RECEIVER


router = APIRouter(prefix="/sla", tags=["SLA Reports"])


# ---------------- Reusable Excel generator for mail have sent----------------
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


# ---------------- Send Data in Email ----------------
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



@router.get("/export-sla-day-wise")
def export_sla_day_wise(
    startdate: str = Query(...),
    enddate: str = Query(...),
    clientID: str = Query(...),
    sd_type: Optional[str] = Query("All"),
    db1: Session = Depends(get_db4),
    db2: Session = Depends(get_db2),
):

    data = {}

    # ---------------- Agents master ----------------
    ag_rows = db2.execute(
        text("SELECT user, full_name FROM vicidial_users WHERE active='Y'")
    ).fetchall()

    ag_list = {r.user: r.full_name for r in ag_rows}

    # ---------------- SD filter ----------------
    sd_str = ""
    sd_str2 = ""

    if sd_type == "Shared":
        sd_str = " AND is_shared='1'"
        sd_str2 = " AND vu.user_nickname='1'"
    elif sd_type == "Dedicated":
        sd_str = " AND is_shared='0'"
        sd_str2 = " AND vu.user_nickname='0'"

    # ---------------- Campaign & Client filter ----------------
    if clientID == "All":
        db1.execute(text("SET SESSION group_concat_max_len = 20000"))

        camp = db1.execute(
            text(f"""
            SELECT GROUP_CONCAT(campaignid) campaignid
            FROM registration_master
            WHERE status='A' AND is_dd_client='1' {sd_str}
            """)
        ).scalar()

        cl = db1.execute(
            text(f"""
            SELECT GROUP_CONCAT(company_id) company_id
            FROM registration_master
            WHERE status='A' AND is_dd_client='1' {sd_str}
            """)
        ).scalar()

        campaignId = f"t2.campaign_id IN ({camp})"
        client_list_str = f"ClientId IN ({cl})"

    else:
        camp = db1.execute(
            text(f"""
            SELECT campaignid FROM registration_master
            WHERE company_id='{clientID}' {sd_str}
            """)
        ).scalar()

        campaignId = f"t2.campaign_id IN ({camp})"
        client_list_str = f"ClientId IN ({clientID})"

    # ---------------- Date handling ----------------
    FromDate = datetime.strptime(startdate + " 00:00:00", "%Y-%m-%d %H:%M:%S")
    ToDate = datetime.strptime(enddate + " 23:59:59", "%Y-%m-%d %H:%M:%S")

    # ---------------- Daily Loop ----------------
    while FromDate < ToDate:

        start_time_start = FromDate
        start_time_end = FromDate + timedelta(days=1)
        FromDate = start_time_end

        dateLabel = start_time_start.strftime("%d-%m-%Y")

        qry = f"""
        SELECT 
            COUNT(*) Total,
            SUM(IF(t2.user!='VDCL' AND t2.queue_seconds<=20,1,0)) WIthinSLA,
            SUM(IF(t2.user!='VDCL',1,0)) Answered,
            COUNT(DISTINCT IF(t2.user!='VDCL',t2.user,NULL)) Manpower,

            GROUP_CONCAT(DISTINCT IF(t2.user!='VDCL',t2.user,NULL)) agents,
            GROUP_CONCAT(DISTINCT IF(t2.user!='VDCL' AND vu.user_nickname='1',t2.user,NULL)) Shared_ag,
            COUNT(DISTINCT IF(t2.user!='VDCL' AND vu.user_nickname='1',t2.user,NULL)) Shared,

            GROUP_CONCAT(DISTINCT IF(t2.user!='VDCL' AND vu.user_nickname='0',t2.user,NULL)) Dedicated_ag,
            COUNT(DISTINCT IF(t2.user!='VDCL' AND vu.user_nickname='0',t2.user,NULL)) Dedicated,

            GROUP_CONCAT(DISTINCT IF(t2.user!='VDCL' AND vu.user_nickname NOT IN('0','1'),t2.user,NULL)) Other_ag,
            COUNT(DISTINCT IF(t2.user!='VDCL' AND vu.user_nickname NOT IN('0','1'),t2.user,NULL)) Other,

            SUM(t1.talk_sec) Talk,
            SUM(t1.wait_sec) wait,
            SUM(t1.dispo_sec) dispo,
            SUM(t1.pause_sec) pause,
            SUM(IFNULL(t3.p,0)) hold,

            SUM(IF(t2.user!='VDCL',1,0))/COUNT(*)*100 Al,
            SUM(t1.talk_sec+t1.wait_sec+t1.dispo_sec+t1.pause_sec+IFNULL(t3.p,0)) `Total_login`,
            SUM(t1.talk_sec+t1.wait_sec+t1.dispo_sec+IFNULL(t3.p,0)) `Net_login`,
            (SUM(t1.talk_sec+t1.dispo_sec+IFNULL(t3.p,0)) /
             SUM(t1.talk_sec+t1.wait_sec+t1.dispo_sec+IFNULL(t3.p,0))) *100 Utilization

        FROM vicidial_closer_log t2
        LEFT JOIN vicidial_users vu ON t2.user=vu.user
        LEFT JOIN vicidial_agent_log t1 ON t1.uniqueid=t2.uniqueid AND t2.user=t1.user
        LEFT JOIN (
            SELECT uniqueid,SUM(parked_sec) p
            FROM park_log
            WHERE STATUS='GRABBED'
              AND parked_time>='{start_time_start}'
              AND parked_time<'{start_time_end}'
            GROUP BY uniqueid
        ) t3 ON t1.uniqueid=t3.uniqueid

        WHERE t2.call_date>='{start_time_start}'
          AND t2.call_date<'{start_time_end}'
          AND {campaignId}
        """

        row = db2.execute(text(qry)).fetchone()

        # ---------------- Agent Name Mapping ----------------
        def map_agents(csv):
            if not csv:
                return ""
            return ",".join(
                [f"{ag_list.get(a,a)}({a})" for a in csv.split(",") if a]
            )

        # ---------------- RL ----------------
        rl = db1.execute(
            text(f"""
            SELECT COUNT(1) cnt
            FROM aband_call_master
            WHERE {client_list_str}
              AND call_status='answer'
              AND calldate>='{start_time_start}'
              AND calldate<'{start_time_end}'
            """)
        ).scalar()

        # ---------------- Final Data ----------------
        data[dateLabel] = {
            "Total": row.Total,
            "Answered": row.Answered,
            "Manpower": row.Manpower,
            "Shared": row.Shared,
            "Dedicated": row.Dedicated,
            "Other": row.Other,
            "Talk": row.Talk,
            "wait": row.wait,
            "dispo": row.dispo,
            "hold": row.hold,
            "Al %": round(row.Al, 2),
            "SL %": round((row.WIthinSLA / row.Answered) * 100, 2) if row.Answered else 0,
            "RL": rl,
            "RL %": round(((rl + row.Answered) / row.Total) * 100, 2) if row.Total else 0,
            "Total login": row.Total_login,
            "Net login": row.Net_login,
            "Utilization %": round(row.Utilization, 2),
            "Manpower Agents": map_agents(row.agents),
            "Shared Agents": map_agents(row.Shared_ag),
            "Dedicated Agents": map_agents(row.Dedicated_ag),
            "Other Agents": map_agents(row.Other_ag),
            "WIthinSLA": row.WIthinSLA,
        }

    return data


@router.get("/slot-wise-utilization")
def slot_wise_utilization(
    startdate: str = Query(...),
    enddate: str = Query(...),
    clientID: str = Query(...),
    sd_type: str = Query("All"),
    db1: Session = Depends(get_db4),   # registration_master
    db2: Session = Depends(get_db2),   # vicidial
):
    data = {}
    datetimeArray = {}
    datearray = []
    timearray = []

    # ------------------ AGENT MASTER ------------------
    ag_sql = text("""
        SELECT user, full_name
        FROM vicidial_users
        WHERE active='Y'
    """)
    ag_rows = db2.execute(ag_sql).fetchall()
    ag_list = {r.user: r.full_name for r in ag_rows}

    # ------------------ DATE SETUP ------------------
    from_dt = datetime.strptime(startdate, "%Y-%m-%d")
    to_dt = datetime.strptime(enddate, "%Y-%m-%d") + timedelta(days=1)

    # ------------------ SD TYPE ------------------
    sd_str = ""
    if sd_type == "Shared":
        sd_str = " AND is_shared='1'"
    elif sd_type == "Dedicated":
        sd_str = " AND is_shared='0'"

    # ------------------ CLIENT / CAMPAIGN ------------------
    if clientID == "All":
        db1.execute(text("SET SESSION group_concat_max_len = 20000"))

        camp_sql = text(f"""
            SELECT GROUP_CONCAT(campaignid) AS campaign_id
            FROM registration_master
            WHERE status='A' AND is_dd_client='1' {sd_str}
        """)
        campaignId = db1.execute(camp_sql).fetchone().campaign_id
        campaign_cond = f"t2.campaign_id IN ({campaignId})" if campaignId else "1=0"

        cli_sql = text(f"""
            SELECT GROUP_CONCAT(company_id) AS company_id
            FROM registration_master
            WHERE status='A' AND is_dd_client='1' {sd_str}
        """)
        client_list = db1.execute(cli_sql).fetchone().company_id
        client_list_cond = f"ClientId IN ({client_list})" if client_list else "1=0"

    else:
        camp_sql = text(f"""
            SELECT campaignid
            FROM registration_master
            WHERE company_id=:clientID {sd_str}
            LIMIT 1
        """)
        campaignId = db1.execute(camp_sql, {"clientID": clientID}).fetchone().campaignid
        campaign_cond = f"t2.campaign_id IN ({campaignId})"
        client_list_cond = f"ClientId IN ({clientID})"

    # ------------------ LOOP SLOT WISE (HOURLY) ------------------
    cur = from_dt
    while cur < to_dt:
        date_label = cur.strftime("%Y-%m-%d")
        time_label = cur.strftime("%H")

        start_time = cur.strftime("%Y-%m-%d %H:%M:%S")
        end_time = (cur + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")

        datearray.append(date_label)
        timearray.append(time_label)
        datetimeArray.setdefault(date_label, []).append(time_label)

        qry = text(f"""
            SELECT COUNT(*) Total,
            SUM(IF(t2.user!='VDCL' AND t2.queue_seconds<=20,1,0)) WIthinSLA,
            SUM(IF(t2.user!='VDCL',1,0)) Answered,
            COUNT(DISTINCT IF(t2.user!='vdcl', t2.user, NULL)) Manpower,
            GROUP_CONCAT(DISTINCT IF(t2.user!='vdcl', t2.user, NULL)) agents,
            GROUP_CONCAT(DISTINCT IF(t2.user!='vdcl' AND vu.user_nickname='1', t2.user, NULL)) Shared_ag,
            COUNT(DISTINCT IF(t2.user!='vdcl' AND vu.user_nickname='1', t2.user, NULL)) Shared,
            GROUP_CONCAT(DISTINCT IF(t2.user!='vdcl' AND vu.user_nickname='0', t2.user, NULL)) Dedicated_ag,
            COUNT(DISTINCT IF(t2.user!='vdcl' AND vu.user_nickname='0', t2.user, NULL)) Dedicated,
            GROUP_CONCAT(DISTINCT IF(t2.user!='vdcl' AND vu.user_nickname NOT IN ('0','1'), t2.user, NULL)) Other_ag,
            COUNT(DISTINCT IF(t2.user!='vdcl' AND vu.user_nickname NOT IN ('0','1'), t2.user, NULL)) Other,
            SUM(t1.talk_sec) Talk,
            SUM(t1.wait_sec) wait,
            SUM(t1.dispo_sec) dispo,
            SUM(t1.pause_sec) pause,
            SUM(IFNULL(t3.p,0)) hold,
            SUM(IF(t2.user!='VDCL',1,0))/COUNT(*)*100 Al,
            SUM(t1.talk_sec)+SUM(t1.wait_sec)+SUM(t1.dispo_sec)+SUM(t1.pause_sec)+SUM(IFNULL(t3.p,0)) Total_login,
            SUM(t1.talk_sec)+SUM(t1.wait_sec)+SUM(t1.dispo_sec)+SUM(IFNULL(t3.p,0)) Net_login,
            (SUM(t1.talk_sec)+SUM(t1.dispo_sec)+SUM(IFNULL(t3.p,0))) /
            (SUM(t1.talk_sec)+SUM(t1.wait_sec)+SUM(t1.dispo_sec)+SUM(IFNULL(t3.p,0))) * 100 Utilization
            FROM asterisk.vicidial_closer_log t2
            LEFT JOIN asterisk.vicidial_users vu ON t2.user=vu.user
            LEFT JOIN asterisk.vicidial_agent_log t1 ON t1.uniqueid=t2.uniqueid AND t2.user=t1.user
            LEFT JOIN (
                SELECT uniqueid,SUM(parked_sec) p
                FROM park_log
                WHERE STATUS='GRABBED'
                AND parked_time>='{start_time}'
                AND parked_time<'{end_time}'
                GROUP BY uniqueid
            ) t3 ON t1.uniqueid=t3.uniqueid
            WHERE t2.call_date>='{start_time}'
            AND t2.call_date<'{end_time}'
            AND {campaign_cond}
        """)

        r = db2.execute(qry).fetchone()

        data.setdefault(date_label, {})[time_label] = {
            "Total": r.Total,
            "Answered": r.Answered,
            "Manpower": r.Manpower,
            "Shared": r.Shared,
            "Dedicated": r.Dedicated,
            "Other": r.Other,
            "Talk": r.Talk,
            "wait": r.wait,
            "dispo": r.dispo,
            "pause": r.pause,
            "hold": r.hold,
            "Al %": round(r.Al or 0, 2),
            "SL %": round((r.WIthinSLA / r.Answered) * 100, 2) if r.Answered else 0,
            "Total login": r.Total_login,
            "Net login": r.Net_login,
            "Utilization %": round(r.Utilization or 0, 2),
            "WIthinSLA": r.WIthinSLA,
            "Manpower Agents": ",".join([f"{ag_list.get(a)}({a})" for a in (r.agents or "").split(",") if a]),
            "Shared Agents": ",".join([f"{ag_list.get(a)}({a})" for a in (r.Shared_ag or "").split(",") if a]),
            "Dedicated Agents": ",".join([f"{ag_list.get(a)}({a})" for a in (r.Dedicated_ag or "").split(",") if a]),
            "Other Agents": ",".join([f"{ag_list.get(a)}({a})" for a in (r.Other_ag or "").split(",") if a]),
        }

        cur += timedelta(hours=1)

    return {
        "data": data,
        "datearray": list(set(datearray)),
        "timearray": list(set(timearray)),
        "datetimeArray": datetimeArray
    }