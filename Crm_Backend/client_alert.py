from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db4
from email_utils import send_email
from agents import get_clients_rights_search

router = APIRouter(
    prefix="/client-alert",
    tags=["Client Alert"]
)


# =========================
# REQUEST MODELS
# =========================
class ClientAlertCreate(BaseModel):
    client_id: int
    alert_type: str
    percent: Optional[float] = None
    email_to: Optional[str] = None
    email_cc: Optional[str] = None


class ClientAlertUpdate(BaseModel):
    alert_type: Optional[str] = None
    percent: Optional[float] = None
    email_to: Optional[str] = None
    email_cc: Optional[str] = None


# =========================
# GET CLIENT ALERTS
# =========================
@router.get("/alert-mechanism")
def get_client_alerts(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db4),
):
    if client_id:
        query = text("""
            SELECT * FROM client_alert
            WHERE client_id = :client_id
            ORDER BY id DESC
        """)
        rows = db.execute(query, {"client_id": client_id}).mappings().all()
    else:
        query = text("""
            SELECT * FROM client_alert
            ORDER BY id DESC
        """)
        rows = db.execute(query).mappings().all()

    return [dict(row) for row in rows]


# =========================
# GET SINGLE CLIENT ALERT
# =========================
@router.get("/alert-mechanism/{alert_id}")
def get_client_alert(
    alert_id: int,
    db: Session = Depends(get_db4),
):
    row = db.execute(
        text("SELECT * FROM client_alert WHERE id = :alert_id"),
        {"alert_id": alert_id}
    ).mappings().fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Client alert not found")

    return dict(row)


# =========================
# CREATE CLIENT ALERT
# =========================
@router.post("/alert-mechanism")
def create_client_alert(
    payload: ClientAlertCreate,
    db: Session = Depends(get_db4),
):
    if not payload.alert_type:
        raise HTTPException(status_code=400, detail="alert_type is required")

    insert_query = text("""
        INSERT INTO client_alert
        (client_id, alert_type, percent, email_to, email_cc, created_at)
        VALUES (:client_id, :alert_type, :percent, :email_to, :email_cc, NOW())
    """)

    result = db.execute(insert_query, {
        "client_id": payload.client_id,
        "alert_type": payload.alert_type,
        "percent": payload.percent,
        "email_to": payload.email_to,
        "email_cc": payload.email_cc,
    })
    db.commit()

    return {
        "status": "success",
        "message": "Client alert saved successfully",
        "alert_id": result.lastrowid,
    }


# =========================
# EDIT CLIENT ALERT
# =========================
@router.put("/alert-mechanism/{alert_id}")
def update_client_alert(
    alert_id: int,
    payload: ClientAlertUpdate,
    db: Session = Depends(get_db4),
):
    update_fields = []
    params = {"alert_id": alert_id}

    if payload.alert_type is not None:
        update_fields.append("alert_type = :alert_type")
        params["alert_type"] = payload.alert_type
    if payload.percent is not None:
        update_fields.append("percent = :percent")
        params["percent"] = payload.percent
    if payload.email_to is not None:
        update_fields.append("email_to = :email_to")
        params["email_to"] = payload.email_to
    if payload.email_cc is not None:
        update_fields.append("email_cc = :email_cc")
        params["email_cc"] = payload.email_cc

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_query = text(f"""
        UPDATE client_alert
        SET {', '.join(update_fields)}, updated_at = NOW()
        WHERE id = :alert_id
    """)

    result = db.execute(update_query, params)
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Client alert not found")

    return {"status": "success", "message": "Client alert updated successfully"}


# =========================
# DELETE CLIENT ALERT
# =========================
@router.delete("/alert-mechanism/{alert_id}")
def delete_client_alert(
    alert_id: int,
    db: Session = Depends(get_db4),
):
    result = db.execute(
        text("DELETE FROM client_alert WHERE id = :alert_id"),
        {"alert_id": alert_id}
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Client alert not found")

    return {"status": "success", "message": "Client alert deleted successfully"}


# =========================
# MONTHLY USAGE ALERT SCHEDULER
# =========================


def _usage_alert_html(summary, threshold):
    rows = [
        ("Client ID", str(summary.get("client_id", ""))),
        ("Company", summary.get("company_name", "")),
        ("Usage", f"{summary.get('usage_percent', 0)}%"),
        ("Threshold", f"{threshold}%"),
        ("Opening", f"{summary.get('effective_opening', 0):,.2f}"),
        ("Fresh Release", f"{summary.get('fresh_release', 0):,.2f}"),
        ("Consumption", f"{summary.get('consume', 0):,.2f}"),
        ("Balance", f"{summary.get('balance', 0):,.2f}"),
    ]
    table_rows = "".join(
        f"<tr><td style='padding:6px 10px;border:1px solid #ddd;'>{k}</td>"
        f"<td style='padding:6px 10px;border:1px solid #ddd;'>{v}</td></tr>"
        for k, v in rows
    )
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <h3>Usage Alert</h3>
            <p>You have crossed the <b>{threshold}%</b> usage threshold.</p>
            <table style="border-collapse:collapse;">{table_rows}</table>
            <br>
            <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply.</p>
        </body>
    </html>
    """


def run_monthly_usage_alerts():
    """
    Check every client_alert usage config once per calendar month:
    if usage_percent >= configured percent, send one email and stamp last_sent_at.
    """
    db = next(get_db4())
    results = []
    try:
        now = datetime.now()
        month_key = now.strftime("%Y-%m")
        start_date = now.strftime("%Y-%m-01")
        end_date = now.strftime("%Y-%m-%d")

        alert_rows = db.execute(
            text("""
                SELECT *
                FROM client_alert
                WHERE email_to IS NOT NULL AND TRIM(email_to) <> ''
                  AND percent IS NOT NULL
                  AND LOWER(alert_type) LIKE '%exposure%'
            """)
        ).mappings().all()

        print(f"MONTHLY USAGE ALERT CHECK month={month_key} alerts={len(alert_rows)}")

        for row in alert_rows:
            try:
                alert_id = row["id"]
                client_id = row["client_id"]
                threshold = float(row["percent"] or 0)
                email_to = (row["email_to"] or "").strip()
                email_cc = (row["email_cc"] or "").strip() or None
                last_sent = row.get("last_sent_at")

                if last_sent is not None:
                    try:
                        last_key = last_sent.strftime("%Y-%m")
                    except Exception:
                        last_key = str(last_sent)[:7]
                    if last_key == month_key:
                        results.append({"client_id": client_id, "status": "skipped_already_sent_this_month"})
                        continue

                data = get_clients_rights_search(
                    db=db,
                    start_date=start_date,
                    end_date=end_date,
                    client_id=client_id,
                )
                if not isinstance(data, dict) or "opening" not in data:
                    results.append({"client_id": client_id, "status": "skipped_client_not_found"})
                    continue

                opening = float(data.get("opening") or 0)
                fresh_release = float(data.get("fresh_release") or 0)
                consume = float(data.get("consume") or 0)
                balance = float(data.get("balance") or 0)

                total_allotment = opening + fresh_release
                if total_allotment > 0:
                    usage_pct = round((consume / total_allotment) * 100, 2)
                else:
                    usage_pct = 100.0 if consume > 0 else 0.0

                summary = {
                    "client_id": client_id,
                    "company_name": data.get("company_name", ""),
                    "effective_opening": opening,
                    "fresh_release": fresh_release,
                    "consume": consume,
                    "balance": balance,
                    "usage_percent": usage_pct,
                }

                if usage_pct < threshold:
                    results.append({"client_id": client_id, "status": "ok", "usage_percent": usage_pct})
                    continue

                subject = f"Usage Alert: {summary['company_name']} crossed {threshold}%"
                send_email(email_to, subject, _usage_alert_html(summary, threshold), cc_emails=email_cc)

                db.execute(
                    text("UPDATE client_alert SET last_sent_at = NOW(), updated_at = NOW() WHERE id = :alert_id"),
                    {"alert_id": alert_id},
                )
                db.commit()

                results.append({
                    "client_id": client_id,
                    "status": "sent",
                    "usage_percent": usage_pct,
                    "threshold": threshold,
                    "email_to": email_to,
                })
            except Exception as e:
                db.rollback()
                results.append({"client_id": client_id, "status": "failed", "error": str(e)})

        return results
    finally:
        db.close()


def scheduled_monthly_usage_alerts():
    """Sync wrapper so APScheduler (BackgroundScheduler) can run run_monthly_usage_alerts."""
    try:
        results = run_monthly_usage_alerts()
        print(f"MONTHLY USAGE ALERT RESULT {results}")
    except Exception as e:
        print(f"MONTHLY USAGE ALERT SCHEDULER ERROR {e}")


# =========================
# MANUAL TRIGGER (for testing)
# =========================
@router.get("/alert-mechanism/run-monthly-usage")
def trigger_monthly_usage_alerts():
    """Manually run the monthly usage alert scheduler now."""
    return run_monthly_usage_alerts()