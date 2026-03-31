from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
import requests
import io
from sqlalchemy import text
from database import get_engine2, get_engine4

router = APIRouter()

PHP_URL = (
    "https://dialdesk.co.in/dialdesk/app/webroot/"
    "billing_statement/apr_report/"
    "AST_agent_time_detail.php"
)

@router.get("/agent-apr-export")
def agent_apr_export(
    start_date: str = Query(..., example="2026-01-01"),
    end_date: str = Query(..., example="2026-01-02"),
    agent_type: str = Query("All", example="All"),   # All | Unit 1 | Unit 2
    dialer: str = Query("ALL", example="ALL")        # ALL | Dialer5 | Dialer8
):

    # Dialer mapping (matches PHP exactly)
    group_value = "--ALL--" if dialer == "ALL" else dialer

    # EXACT params as PHP expects
    params = {
        "agent_type": agent_type,          # All / Unit 1 / Unit 2
        "DB": "",
        "query_date": start_date,
        "end_date": end_date,
        "group[]": group_value,
        "user_group[]": "--ALL--",
        "shift": "ALL",
        "report_display_type": "TEXT",
        "SUBMIT": "SUBMIT",
    }

    # Call PHP export
    response = requests.get(PHP_URL, params=params, timeout=300)

    filename = f"APR_Report_{start_date}_to_{end_date}.xlsx"

    return StreamingResponse(
        io.BytesIO(response.content),
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )










from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import mysql.connector
from mysql.connector import Error
import io
from datetime import date, datetime, time
import openpyxl
from openpyxl import Workbook
from contextlib import contextmanager



# ─────────────────────────────────────────────
# DB CONFIG
# ─────────────────────────────────────────────
DIALDESK_DB = dict(host="192.168.10.12", user="root", password="dial@mas123", database="db_dialdesk")
ASTERISK_DB  = dict(host="192.168.10.21", user="root", password="vicidialnow", database="asterisk")
VICIDIAL_DB  = dict(host="192.168.10.21", user="root", password="vicidialnow", database="asterisk")  # adjust if different


@contextmanager
def get_db(config: dict):
    conn = mysql.connector.connect(**config)
    try:
        yield conn
    finally:
        conn.close()


def query(conn, sql: str, params=None):
    cur = conn.cursor()
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    cur.close()
    return rows


def query_one(conn, sql: str, params=None):
    rows = query(conn, sql, params)
    return rows[0] if rows else None


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def sec_convert(sec) -> str:
    """Convert seconds → H:MM:SS string."""
    try:
        sec = int(sec or 0)
    except (ValueError, TypeError):
        sec = 0
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    return f"{h}:{m:02d}:{s:02d}"


def safe_div(a, b, decimals=2):
    try:
        return round(a / b * 100, decimals) if b else 0.0
    except Exception:
        return 0.0




def get_unit_agents(agent_type: Optional[str], process: Optional[str] = None):
    """Return agent metadata + tagging counts using SQLAlchemy."""
    print("🔌 Connecting to DB (SQLAlchemy)...")
    engine = get_engine4()

    with engine.connect() as conn:
        print("➡️ Running query")

        sql = "SELECT * FROM agent_master WHERE status = 'A'"
        params = {}

        if agent_type and agent_type != "All":
            sql += " AND agent_type = :agent_type"
            params["agent_type"] = agent_type

        if process and process != "All":
            sql += " AND processname = :process"
            params["process"] = process

        result = conn.execute(text(sql), params)
        agents = [dict(row._mapping) for row in result]

    # ───────── Process Data ─────────
    agent_type_list = {}
    agents_crm = {}
    ag_list2 = {}

    for ag in agents:
        user = ag["username"]
        agent_type_list[user] = ag["agent_type"]
        agents_crm[user] = ag
        ag_list2[int(ag["id"])] = user

    print(f"✅ Total agents fetched: {len(agents)}")
    return agent_type_list, agents_crm, ag_list2


def get_tag_counts(from_date: str, to_date: str, ag_list2: dict):
    engine = get_engine4()
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT date(calldate) dater, AgentId, count(1) tagging
            FROM call_master
            WHERE date(calldate) BETWEEN :from_date AND :to_date
            GROUP BY date(calldate), AgentId
        """), {"from_date": from_date, "to_date": to_date})

        rows = result.fetchall()
    tag_count_list: dict = {}
    for dater, agent_id, tagging in rows:
        agent_id = int(agent_id) if agent_id is not None else None
        username = ag_list2.get(agent_id)
        if username:
            tag_count_list.setdefault(str(dater), {})[username] = tagging
    print(tag_count_list)
    return tag_count_list




def get_agent_log_data(from_dt: str, to_dt: str, unit_users: list, vicidial_db_config: dict):

    engine2 = get_engine2()

    sql = """
        SELECT `user`, DATE(event_time) AS dater,
        IF(wait_sec>10000,0,wait_sec) AS wait_sec,
        talk_sec, dispo_sec,
        IF(pause_sec>10000,0,pause_sec) AS pause_sec,
        lead_id, status, dead_sec, sub_status
        FROM vicidial_agent_log
        WHERE event_time <= :to_dt AND event_time >= :from_dt
    """

    params = {
        "to_dt": to_dt,
        "from_dt": from_dt
    }

    if unit_users:
        sql += " AND `user` IN :users"
        params["users"] = tuple(unit_users)

    with engine2.connect() as conn:
        result = conn.execute(text(sql), params)
        rows = result.fetchall()

    # aggregation dicts
    swait  = {}; stalk  = {}; sdispo = {}; spause = {}; sdead = {}; scust = {}
    scalls = {}; stime  = {}
    launch = {}; bio    = {}; tea    = {}; oper   = {}; qual  = {}; refr  = {}; train = {}
    transfer = {}
    date_list            = {}
    date_wise_user_list  = {}

    for row in rows:
        user, dater, wait, talk, dispo, pause, lead, status, dead, sub_stat = row
        dater = str(dater)
        wait  = min(int(wait  or 0), 65000)
        talk  = min(int(talk  or 0), 65000)
        dispo = min(int(dispo or 0), 65000)
        pause = min(int(pause or 0), 65000)
        dead  = min(int(dead  or 0), 65000)

        date_list[dater] = dater
        date_wise_user_list.setdefault(dater, {})[user] = user

        key = (dater, user)
        swait[key]  = swait.get(key, 0)  + wait
        stalk[key]  = stalk.get(key, 0)  + talk
        sdispo[key] = sdispo.get(key, 0) + dispo
        spause[key] = spause.get(key, 0) + pause
        sdead[key]  = sdead.get(key, 0)  + dead

        if lead and status and status.upper() != "NULL":
            scalls[key] = scalls.get(key, 0) + 1

        sub2 = (sub_stat or "").strip().replace(" ", "")

        if sub2 == "Lunch":
            launch[key] = launch.get(key, 0) + pause
        elif sub2 == "Bio":
            bio[key]    = bio.get(key, 0)    + pause
        elif sub2 in ("Short", "Tea"):
            tea[key]    = tea.get(key, 0)    + pause
        elif sub2.lower() == "oper":
            oper[key]   = oper.get(key, 0)   + pause
        elif sub2.lower() == "qualit":
            qual[key]   = qual.get(key, 0)   + pause
        elif sub2.lower() == "refres":
            refr[key]   = refr.get(key, 0)   + pause
        elif sub2.lower() == "traing":
            train[key]  = train.get(key, 0)  + pause

        if (status or "").lower().strip() == "xfer":
            transfer[key] = transfer.get(key, 0) + 1

    return dict(
        swait=swait, stalk=stalk, sdispo=sdispo, spause=spause, sdead=sdead,
        scalls=scalls, launch=launch, bio=bio, tea=tea, oper=oper, qual=qual,
        refr=refr, train=train, transfer=transfer,
        date_list=date_list, date_wise_user_list=date_wise_user_list,
    )



def get_park_data(from_dt: str, to_dt: str, vicidial_db_config: dict):

    sql = """
        SELECT user,
               DATE(parked_time) AS dater,
               COUNT(*) AS cnt,
               SUM(parked_sec) AS secs
        FROM park_log
        WHERE parked_time <= :to_dt
          AND parked_time >= :from_dt
        GROUP BY user, DATE(parked_time)
    """

    park_date: dict = {}
    park_user: dict = {}

    engine2 = get_engine2()

    with engine2.connect() as conn:
        result = conn.execute(
            text(sql),
            {"to_dt": to_dt, "from_dt": from_dt}
        )
        rows = result.fetchall()

    for user, dater, cnt, secs in rows:
        dater = str(dater)

        park_date.setdefault(dater, {}).setdefault(user, [0, 0])
        park_date[dater][user][0] += cnt
        park_date[dater][user][1] += (secs or 0)

        park_user.setdefault(user, [0, 0])
        park_user[user][0] += cnt
        park_user[user][1] += (secs or 0)

    return park_date, park_user




def get_login_logout(user: str, from_dt: str, to_dt: str, vicidial_db_config: dict, date_filter: Optional[str] = None):

    engine2 = get_engine2()

    with engine2.connect() as conn:

        if date_filter:
            login_sql = """
                SELECT TIME(MIN(event_date))
                FROM vicidial_user_log
                WHERE user = :user
                  AND event = 'Login'
                  AND DATE(event_date) = :date_filter
            """

            logout_sql = """
                SELECT TIME(MAX(event_date))
                FROM vicidial_user_log
                WHERE user = :user
                  AND event = 'LOGOUT'
                  AND DATE(event_date) = :date_filter
            """

            params = {
                "user": user,
                "date_filter": date_filter
            }

        else:
            login_sql = """
                SELECT TIME(MIN(event_date))
                FROM vicidial_user_log
                WHERE user = :user
                  AND event = 'Login'
                  AND event_date BETWEEN :from_dt AND :to_dt
            """

            logout_sql = """
                SELECT TIME(MAX(event_date))
                FROM vicidial_user_log
                WHERE user = :user
                  AND event = 'LOGOUT'
                  AND event_date BETWEEN :from_dt AND :to_dt
            """

            params = {
                "user": user,
                "from_dt": from_dt,
                "to_dt": to_dt
            }

        login_row = conn.execute(text(login_sql), params).fetchone()
        logout_row = conn.execute(text(logout_sql), params).fetchone()

    login_t  = str(login_row[0])  if login_row and login_row[0] else "00:00:00"
    logout_t = str(logout_row[0]) if logout_row and logout_row[0] else "00:00:00"

    return login_t, logout_t


# ─────────────────────────────────────────────
# REPORT BUILDER
# ─────────────────────────────────────────────

def build_report(
    query_date: str,
    end_date: str,
    agent_type: Optional[str] = None,
    process: Optional[str] = None,
    shift: str = "ALL",
    start_timexx: str = "00:00:00",
    end_timexx: str = "23:59:59",
    vicidial_db_config: Optional[dict] = None,
):
    if vicidial_db_config is None:
        vicidial_db_config = VICIDIAL_DB

    # --- time range ---
    shift_map = {
        "TEST":  ("09:45:00", "10:00:00"),
        "AM":    ("03:45:00", "15:14:59"),
        "PM":    ("15:15:00", "23:15:00"),
        "ALL":   ("00:00:00", "23:59:59"),
        "9AM-5PM":     ("09:00:00", "16:59:59"),
        "5PM-MIDNIGHT":("17:00:00", "23:59:59"),
    }
    t_begin, t_end = shift_map.get(shift, ("00:00:00", "23:59:59"))
    from_dt = f"{query_date} {t_begin}"
    to_dt   = f"{end_date} {t_end}"

    # --- agents ---
    print("STEP 1: agents")
    agent_type_list, agents_crm, ag_list2 = get_unit_agents(agent_type, process)
    unit_users = list(agents_crm.keys())          # usernames (lowercase)

    # tag counts
    print("STEP 2: tags")
    tag_count_list = get_tag_counts(query_date, end_date, ag_list2)

    # agent log
    print("STEP 3: agent log")
    log = get_agent_log_data(from_dt, to_dt, unit_users, vicidial_db_config)

    # park
    park_date, park_user = get_park_data(from_dt, to_dt, vicidial_db_config)

    # ── aggregate per-user summary ──
    user_summary: dict = {}
    date_list = sorted(log["date_list"].keys())

    for dater in date_list:
        print(dater)
        for user in log["date_wise_user_list"].get(dater, {}):
            k = (dater, user)
            stalk   = log["stalk"].get(k, 0)
            sdispo  = log["sdispo"].get(k, 0)
            spause  = log["spause"].get(k, 0)
            swait   = log["swait"].get(k, 0)
            launch  = log["launch"].get(k, 0)
            bio     = log["bio"].get(k, 0)
            tea     = log["tea"].get(k, 0)
            oper    = log["oper"].get(k, 0)
            qual    = log["qual"].get(k, 0)
            refr    = log["refr"].get(k, 0)
            train   = log["train"].get(k, 0)
            calls   = log["scalls"].get(k, 0)
            xfer    = log["transfer"].get(k, 0)
            park_secs = (park_date.get(dater, {}).get(user) or [0, 0])[1]

            stime = swait + stalk + sdispo + spause
            productive_login = stime - launch - bio - tea

            if user not in user_summary:
                user_summary[user] = dict(
                    stalk=0, sdispo=0, spause=0, swait=0,
                    launch=0, bio=0, tea=0, oper=0, qual=0, refr=0, train=0,
                    calls=0, xfer=0, stime=0, productive_login=0,
                    park_secs=0, tags=0, mandays=0,
                )

            s = user_summary[user]
            s["stalk"]           += stalk
            s["sdispo"]          += sdispo
            s["spause"]          += spause
            s["swait"]           += swait
            s["launch"]          += launch
            s["bio"]             += bio
            s["tea"]             += tea
            s["oper"]            += oper
            s["qual"]            += qual
            s["refr"]            += refr
            s["train"]           += train
            s["calls"]           += calls
            s["xfer"]            += xfer
            s["stime"]           += stime
            s["productive_login"]+= productive_login
            s["park_secs"]       += park_secs
            s["tags"]            += tag_count_list.get(dater, {}).get(user, 0)

            login_t, _ = get_login_logout(user, from_dt, to_dt, vicidial_db_config, dater)
            if login_t != "00:00:00":
                s["mandays"] += 1

    # ── build rows ──
    summary_rows  = []
    raw_data_rows = []

    summary_header = [
        "Agent Type", "Process", "Agent ID", "Agent Name",
        "Calls", "ACHT", "Talktime", "Park Time", "Transfer Count",
        "Net Login", "Productive Login", "Lunch", "Bio", "Tea/Short",
        "Operation", "Quality", "Refresher", "Training",
        "Quality Score", "Utilization%",
        # "Utilization OP%",
        "First Login", "Last Logout", "Tagging no", "Mandays",
    ]

    raw_header = ["Date"] + summary_header[:-1]  # no Mandays in raw

    summary_rows.append(summary_header)
    raw_data_rows.append(raw_header)

    # per-date raw rows
    for dater in date_list:
        for user in log["date_wise_user_list"].get(dater, {}):

            print("TAG USERS:", list(tag_count_list.get(dater, {}).keys())[:5])
            print("LOG USER:", user)
            k     = (dater, user)
            stalk = log["stalk"].get(k, 0)
            sdispo= log["sdispo"].get(k, 0)
            spause= log["spause"].get(k, 0)
            swait = log["swait"].get(k, 0)
            calls = log["scalls"].get(k, 0)
            launch= log["launch"].get(k, 0)
            bio   = log["bio"].get(k, 0)
            tea   = log["tea"].get(k, 0)
            oper  = log["oper"].get(k, 0)
            qual  = log["qual"].get(k, 0)
            refr  = log["refr"].get(k, 0)
            train = log["train"].get(k, 0)
            xfer  = log["transfer"].get(k, 0)
            park_secs = (park_date.get(dater, {}).get(user) or [0, 0])[1]

            stime = swait + stalk + sdispo + spause
            productive_login = stime - launch - bio - tea
            acht  = round((stalk + sdispo) / calls) if calls else 0
            util  = safe_div(stalk, productive_login) if productive_login else 0
            util2 = safe_div(stalk, stime) if stime else 0
            tags  = tag_count_list.get(dater, {}).get(user, 0)

            login_t, logout_t = get_login_logout(user, from_dt, to_dt, vicidial_db_config, dater)
            agent = agents_crm.get(user, {})

            raw_data_rows.append([
                dater,
                agent.get("agent_type", ""),
                agent.get("processname", ""),
                user,
                agent.get("displayname", ""),
                calls,
                acht,
                sec_convert(stalk),
                sec_convert(park_secs),
                xfer,
                sec_convert(stime),
                sec_convert(productive_login),
                sec_convert(launch),
                sec_convert(bio),
                sec_convert(tea),
                sec_convert(oper),
                sec_convert(qual),
                sec_convert(refr),
                sec_convert(train),
                "0",
                # util2,
                util,
                login_t,
                logout_t,
                tags,
            ])

    # per-user summary rows
    tot = dict(calls=0, stalk=0, sdispo=0, launch=0, bio=0, tea=0, oper=0,
               qual=0, refr=0, train=0, xfer=0, stime=0, productive_login=0,
               park_secs=0, tags=0, mandays=0)

    for user, s in user_summary.items():
        calls = s["calls"]
        stalk = s["stalk"]
        sdispo= s["sdispo"]
        acht  = round((stalk + sdispo) / calls) if calls else 0
        util  = safe_div(stalk, s["productive_login"]) if s["productive_login"] else 0
        util2 = safe_div(stalk, s["stime"]) if s["stime"] else 0

        login_t, logout_t = get_login_logout(user, from_dt, to_dt, vicidial_db_config)
        agent = agents_crm.get(user, {})

        summary_rows.append([
            agent.get("agent_type", ""),
            agent.get("processname", ""),
            user,
            agent.get("displayname", ""),
            calls,
            acht,
            sec_convert(stalk),
            sec_convert(s["park_secs"]),
            s["xfer"],
            sec_convert(s["stime"]),
            sec_convert(s["productive_login"]),
            sec_convert(s["launch"]),
            sec_convert(s["bio"]),
            sec_convert(s["tea"]),
            sec_convert(s["oper"]),
            sec_convert(s["qual"]),
            sec_convert(s["refr"]),
            sec_convert(s["train"]),
            "0",
            # util2,
            util,
            login_t,
            logout_t,
            s["tags"],
            s["mandays"],
        ])

        for key in tot:
            tot[key] += s.get(key, 0)

    # totals row
    summary_rows.append([
        "", "", "", "Total",
        tot["calls"], "00:00:00",
        sec_convert(tot["stalk"]), sec_convert(tot["park_secs"]),
        tot["xfer"], sec_convert(tot["stime"]),
        sec_convert(tot["productive_login"]),
        sec_convert(tot["launch"]), sec_convert(tot["bio"]),
        sec_convert(tot["tea"]),    sec_convert(tot["oper"]),
        sec_convert(tot["qual"]),   sec_convert(tot["refr"]),
        sec_convert(tot["train"]),  "0",
        "00:00:00", "00:00:00", "00:00:00",
        tot["tags"], tot["mandays"],
    ])
    raw_data_rows.append([
        "", "", "", "", "Total",
        tot["calls"], "",
        sec_convert(tot["stalk"]), sec_convert(tot["park_secs"]),
        tot["xfer"], sec_convert(tot["stime"]),
        sec_convert(tot["productive_login"]),
        sec_convert(tot["launch"]), sec_convert(tot["bio"]),
        sec_convert(tot["tea"]),    sec_convert(tot["oper"]),
        sec_convert(tot["qual"]),   sec_convert(tot["refr"]),
        sec_convert(tot["train"]),  "0",
        "00:00:00", "00:00:00","00:00:00", tot["tags"],
    ])

    return summary_rows, raw_data_rows


# ─────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/apr-report/json", summary="APR Report – JSON")
def apr_report_json(
    query_date:  str = Query(...,  example="2024-01-01", description="Start date YYYY-MM-DD"),
    end_date:    str = Query(...,  example="2024-01-31", description="End date   YYYY-MM-DD"),
    agent_type:  Optional[str] = Query(None, description="Filter by agent type; omit for all"),
    process:     Optional[str] = Query(None),
    shift:       str = Query("ALL", description="Shift: ALL | AM | PM | TEST | 9AM-5PM | 5PM-MIDNIGHT"),
):
    """Return both Summary and Raw Data as JSON."""
    try:
        print("started")
        summary_rows, raw_data_rows = build_report(query_date, end_date, agent_type, process, shift)
        print("build_report done")
    except Exception as e:
        import traceback
        print("🔥 ERROR OCCURRED:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    # convert to list-of-dicts using first row as header
    def rows_to_dicts(rows):
        if len(rows) < 2:
            return []
        header = rows[0]
        return [dict(zip(header, r)) for r in rows[1:]]

    return {
        "summary":  rows_to_dicts(summary_rows),
        "raw_data": rows_to_dicts(raw_data_rows),
        "generated_at": datetime.now().isoformat(),
        "params": {
            "query_date": query_date,
            "end_date":   end_date,
            "agent_type": agent_type,
            "shift":      shift,
        },
    }


@router.get("/apr-report/xlsx", summary="APR Report – Excel download")
def apr_report_xlsx(
    query_date:  str = Query(...,  example="2024-01-01"),
    end_date:    str = Query(...,  example="2024-01-31"),
    agent_type:  Optional[str] = Query(None),
    process:     Optional[str] = Query(None),
    shift:       str = Query("ALL"),
):
    """Download the APR report as an Excel (.xlsx) file with two sheets."""
    try:
        summary_rows, raw_data_rows = build_report(query_date, end_date, agent_type, process, shift)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    wb = Workbook()
    ws_summary = wb.active
    ws_summary.title = "Summary"
    for row in summary_rows:
        ws_summary.append([str(c) if c is not None else "" for c in row])

    ws_raw = wb.create_sheet(title="Raw Data")
    for row in raw_data_rows:
        ws_raw.append([str(c) if c is not None else "" for c in row])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"APR_Report_{query_date}_{end_date}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}
