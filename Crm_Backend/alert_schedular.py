from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from datetime import datetime, timedelta
import asyncio
import json
import math
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import httpx

from database import get_db4 as get_db
from models import (
    AlertScheduler,
    AlertMechanisms,
    SmsLogHistory,
    EmailLogHistory,
    WhatsAppLogHistory,
)
from sms_service import send_sms

router = APIRouter()

# Default SMS template ID used only when a mechanism has no template_id set
DEFAULT_TEMPLATE_ID_SMS = "1707176439618550283"

# Local WhatsApp API endpoint (update to your actual URL)
WHATSAPP_API_URL = "http://localhost:3000/api/send"

# SMTP config (no .env - fill in your values here)
# SMTP_CONFIG = {
#     "smtp_server": "smtp.gmail.com",
#     "smtp_port": 587,
#     "username": "your_email@gmail.com",
#     "password": "your_password",
# }

SMTP_CONFIG = {
    "host": "email.teammas.co.in",
    "port": 587,
    "username": "ispark@teammas.co.in",
    "password": "sa3d3fd%YdT@4b",
    "use_tls": False
}


def send_email(to_email, subject, body, smtp_config=None):
    config = smtp_config or SMTP_CONFIG

    try:
        msg = MIMEMultipart()
        msg["From"] = config["username"]
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

        host = config.get("host") or config.get("smtp_server")
        port = config.get("port") or config.get("smtp_port")

        with smtplib.SMTP(host, port, timeout=10) as server:
            if config.get("use_tls", False):
                server.starttls()
            server.login(config["username"], config["password"])
            server.sendmail(config["username"], to_email, msg.as_string())

        print(f"EMAIL SENT to={to_email} subject={subject}")

        return {"status": "success"}

    except Exception as e:
        print(f"EMAIL FAILED to={to_email} subject={subject} error={e}")
        return {"status": "failed", "error": str(e)}


def _get_call_master_billing(db, data_id):
    """
    Fetch the billing-relevant fields for a call_master record by its Id.
    Returns a dict (may be empty if not found / column unavailable).
    """
    if not data_id:
        return {}

    try:
        row = db.execute(
            text("""
                SELECT Id, CallDate, SrNo, LeadId, MSISDN
                FROM call_master
                WHERE Id = :data_id
                LIMIT 1
            """),
            {"data_id": data_id},
        ).mappings().first()
        return dict(row) if row else {}
    except Exception as e:
        print(f"CALL_MASTER BILLING FETCH FAILED data_id={data_id} error={e}")
        return {}


def save_billing(db, alert, ded_type, duration, unit, alert_to):
    """
    Insert one row into billing_master (raw SQL) for a successfully delivered alert.
    data_id is the call_master Id; remaining fields are pulled from call_master
    when available, otherwise they fall back to the alert row / send time.
    """
    cm = _get_call_master_billing(db, alert.data_id) if alert.data_id else {}
    now = datetime.now()

    # call_master stores a single datetime column (CallDate) - use it for both date & time
    call_datetime = cm.get("CallDate") or now
    call_date = call_datetime.date() if isinstance(call_datetime, datetime) else call_datetime
    call_time = call_datetime.time() if isinstance(call_datetime, datetime) else now.time()

    # DedSubType: 'Alert' for caller/internal, 'Escalation' for escalation, 'CloseLoop' for close loop
    if alert.alert_category == "escalation":
        ded_sub_type = "Escalation"
    elif alert.alert_category == "closeloop":
        ded_sub_type = "CloseLoop"
    else:
        ded_sub_type = "Alert"

    db.execute(
        text("""
            INSERT INTO billing_master
            (
                clientId, data_id, CallDate, CallTime, SrNo, LeadId, CallFrom,
                AlertTo, Duration, Unit, Amount, DedType, DedSubType, send_status
            )
            VALUES
            (
                :client_id, :data_id, :call_date, :call_time, :sr_no, :lead_id, :call_from,
                :alert_to, :duration, :unit, :amount, :ded_type, :ded_sub_type, :send_status
            )
        """),
        {
            "client_id": alert.client_id,
            "data_id": alert.data_id,
            "call_date": call_date,
            "call_time": call_time,
            "sr_no": str(cm.get("SrNo") or ""),
            "lead_id": str(cm.get("LeadId") or ""),
            "call_from": str(cm.get("MSISDN") or alert.phone or ""),
            "alert_to": str(alert_to or ""),
            "duration": str(duration),
            "unit": str(unit),
            "amount": "0",
            "ded_type": ded_type,
            "ded_sub_type": ded_sub_type,
            "send_status": 0,
        }
    )


def _escalation_is_due(db, alert, mech):
    """
    Escalation alerts are only sent when the linked call_master record is still
    Open (CloseLoopCate1 = 'Open') and its TAT has been exceeded
    (now > CallDate + tat hours). tat comes from the alert row, falling back to
    the mechanism's tat. Non-escalation alerts are always due.
    """
    if alert.alert_category != "escalation":
        return True

    if not alert.data_id:
        print(f"ESCALATION SKIP alert_id={alert.id} reason='no data_id'")
        return False

    row = db.execute(
        text("SELECT CallDate, CloseLoopCate1 FROM call_master WHERE Id = :id"),
        {"id": alert.data_id},
    ).mappings().first()
    if not row:
        print(f"ESCALATION SKIP alert_id={alert.id} reason='call_master row not found'")
        return False

    if (row.get("CloseLoopCate1") or "") != "Open":
        print(f"ESCALATION SKIP alert_id={alert.id} reason='not Open (status={row.get('CloseLoopCate1')!r})'")
        return False

    call_dt = row.get("CallDate")
    if not call_dt:
        return True
    if isinstance(call_dt, str):
        call_dt = datetime.fromisoformat(call_dt)

    tat = alert.tat or (mech.tat if mech else None) or 0
    if not tat:
        print(f"ESCALATION SEND alert_id={alert.id} reason='no TAT set (open record)'")
        return True

    due = datetime.now() > (call_dt + timedelta(hours=tat))
    if not due:
        print(f"ESCALATION SKIP alert_id={alert.id} reason='within TAT (CallDate={call_dt}, tat={tat}h)'")
    return due


@router.get("/alert_scheduler/run/{client_id}")
async def trigger_alerts(client_id: int, db: Session = Depends(get_db)):
    """
    Trigger alerts for given client:
    - Simulated SMS and Email
    - Real WhatsApp message via local API
    """
    return await process_client_alerts(db, client_id)


async def process_client_alerts(db, client_id):
    """
    Send all pending (not-yet-sent) alerts for the given client.

    It checks which categories (caller / internal / escalation) are integrated
    for the client and only sends what is set for each integrated category.
    Returns a summary dict of what was sent.
    """

    mechanisms = db.query(AlertMechanisms).filter(AlertMechanisms.client_id == client_id).all()
    print(mechanisms, "mechanisms===")

    # Group mechanisms by alert category to know which are integrated
    mechanisms_by_category = {}
    for mech in mechanisms:
        mechanisms_by_category.setdefault(mech.alert_category, []).append(mech)

    enabled_categories = [c for c in mechanisms_by_category.keys() if c != "closeloop"]
    print(enabled_categories, "enabled_categories===")

    if not enabled_categories:
        return {
            "status": "no_mechanisms",
            "client_id": client_id,
            "reason": "No alert mechanism integrated for this client",
        }

    # Only process scheduler alerts for the integrated categories
    # (closeloop is handled by the dedicated close-loop scheduler)
    alerts = (
        db.query(AlertScheduler)
        .filter(
            AlertScheduler.client_id == client_id,
            AlertScheduler.alert_category.in_(enabled_categories),
        )
        .all()
    )

    if not alerts:
        print(f"NO ALERTS for client_id={client_id} categories={enabled_categories}")
        raise HTTPException(status_code=404, detail="No alerts found for this client")

    sms_list, email_list, whatsapp_list = [], [], []

    for alert in alerts:
        updated = False
        alert_responses = {}

        print(f"ALERT alert_id={alert.id} category={alert.alert_category} alert_on={alert.alert_on} "
              f"email={alert.email!r} email_status={alert.email_status} phone={alert.phone!r} sms_status={alert.sms_status}")

        # Mechanism row for this alert's category (used for WhatsApp creds / SMS template_id)
        category_mechanisms = mechanisms_by_category.get(alert.alert_category, [])
        mech = next(
            (m for m in category_mechanisms if m.template_text == alert.template_text),
            category_mechanisms[0] if category_mechanisms else None,
        )

        # Escalation alerts only send when the call is still Open and past TAT
        if not _escalation_is_due(db, alert, mech):
            continue

        # Simulate SMS
        if alert.alert_on in ["SMS", "All"] and alert.phone and not alert.sms_status:
            # Use the template ID configured on the mechanism, fallback to default
            template_id = (mech.template_id if mech and mech.template_id else DEFAULT_TEMPLATE_ID_SMS)

            sms_response = send_sms(
                phone=alert.phone,
                message=alert.template_text or "No message content",
                template_id=template_id
            )

            status = sms_response.get("status", "")

            # Update status ONLY if success
            if status == "success":
                alert.sms_status = True

                sms_log = SmsLogHistory(
                    alert_id=alert.id,
                    client_id=alert.client_id,
                    phone=alert.phone,
                    message=alert.template_text,
                    template_id=template_id,
                    provider_status="success",
                    provider_response=json.dumps(sms_response)
                )
                db.add(sms_log)

                # Billing log (SMS): Duration = word count, Unit = ceil(words / 60), min 1
                message = alert.template_text or ""
                sms_duration = len(message.split())
                sms_unit = max(1, math.ceil(sms_duration / 60))
                save_billing(db, alert, "SMS", sms_duration, sms_unit, alert.phone)

            else:
                alert.sms_status = False

            # Save response as VARCHAR / TEXT
            alert.sms_response = json.dumps(sms_response)

            updated = True

            sms_list.append({
                "id": alert.id,
                "phone": alert.phone,
                "message": alert.template_text,
                "response": sms_response
            })

            alert_responses["sms"] = sms_response

        if alert.alert_on in ["Email", "All"] and alert.email and not alert.email_status:
            email_response = send_email(
                to_email=alert.email,
                subject=alert.template_name or "Alert Notification",
                body=alert.template_text or "No message content",
                smtp_config=SMTP_CONFIG
            )

            # Prevent KeyError – safely read status
            status = email_response.get("status", "")
            print(f"EMAIL RESPONSE alert_id={alert.id} status={status} response={email_response}")

            # Save status
            if status.lower() == "success":
                alert.email_status = True
                # Email Log history
                email_log = EmailLogHistory(
                    alert_id=alert.id,
                    client_id=alert.client_id,
                    email=alert.email,
                    subject=alert.template_name,
                    body=alert.template_text,
                    provider_status="success",
                    provider_response=json.dumps(email_response)
                )
                db.add(email_log)

                # Billing log (Email): 1 email = 1 unit
                save_billing(db, alert, "Email", 1, 1, alert.email)

            else:
                alert.email_status = False

            alert.email_response = json.dumps(email_response)
            updated = True

            email_list.append({
                "id": alert.id,
                "email": alert.email,
                "subject": alert.template_name,
                "body": alert.template_text,
                "response": email_response
            })

        # Real WhatsApp API call (only if WhatsApp mechanism is set for this category)
        if alert.alert_on in ["WhatsApp", "All"] and alert.phone:
            if mech is None:
                print(f"No mechanism integrated for category '{alert.alert_category}'")
                alert.whatsapp_status = False
                alert.whatsapp_response = "Error: No mechanism integrated for this category"
                alert_responses["whatsapp"] = alert.whatsapp_response
                updated = True
            elif not alert.whatsapp_status:
                payload = {
                    "sessionId": mech.WHATSAPP_SESSION_ID,
                    "number": alert.phone if str(alert.phone).startswith("91") else f"9178274643803",
                    "message": alert.template_text or "No message content"
                }
                headers = {
                    "accept": "*/*",
                    "x-api-key": mech.WHATSAPP_API_KEY,
                    "Content-Type": "application/json"
                }

                try:
                    print(payload, "payload=====")
                    # Directly create an async client and call WhatsApp API
                    async with httpx.AsyncClient(timeout=10) as client:
                        response = await client.post(WHATSAPP_API_URL, json=payload, headers=headers)

                        response_text = response.text
                        print("WhatsApp API response text:", response_text)
                        try:
                            data = response.json()
                        except Exception:
                            data = {"error": "Invalid JSON", "raw": response_text}

                    if response.status_code == 200:
                        alert.whatsapp_status = True
                        alert.whatsapp_response = json.dumps(data)
                        # log history save
                        whatsapp_log = WhatsAppLogHistory(
                            alert_id=alert.id,
                            client_id=alert.client_id,
                            phone=alert.phone,
                            message=alert.template_text,
                            provider_status="success",
                            provider_response=json.dumps(data)
                        )
                        db.add(whatsapp_log)

                        # Billing log (WhatsApp): 1 message = 1 unit
                        save_billing(db, alert, "WhatsappAlert", 1, 1, alert.phone)

                        whatsapp_list.append({
                            "id": alert.id,
                            "phone": alert.phone,
                            "message": alert.template_text,
                            "response": data
                        })
                    else:
                        alert.whatsapp_status = False
                        alert.whatsapp_response = f"Failed: {data}"
                    updated = True

                except Exception as e:
                    alert.whatsapp_status = False
                    alert.whatsapp_response = f"Error: {str(e)}"

                alert_responses["whatsapp"] = alert.whatsapp_response

        # Save DB changes for updated alerts
        if updated:
            alert.updated_at = datetime.now()
            db.add(alert)

    # Commit all DB updates once
    db.commit()

    return {
        "status": "success",
        "client_id": client_id,
        "total_sms_sent": len(sms_list),
        "total_email_sent": len(email_list),
        "total_whatsapp_sent": len(whatsapp_list),
        "sms_list": sms_list,
        "email_list": email_list,
        "whatsapp_list": whatsapp_list
    }


async def run_pending_alerts():
    """
    Run process_client_alerts for every client that still has a pending
    (not-yet-sent) alert_scheduler row. Used by the background scheduler.
    Returns a list of per-client results.
    """
    db = next(get_db())
    results = []
    try:
        pending_clients = (
            db.query(AlertScheduler.client_id)
            .filter(
                or_(
                    AlertScheduler.sms_status.is_not(True),
                    AlertScheduler.email_status.is_not(True),
                    AlertScheduler.whatsapp_status.is_not(True),
                )
            )
            .distinct()
            .all()
        )

        for (client_id,) in pending_clients:
            try:
                result = await process_client_alerts(db, client_id)
                results.append({"client_id": client_id, "status": result.get("status")})
            except HTTPException as e:
                results.append({"client_id": client_id, "status": "error", "detail": e.detail})
                db.rollback()
            except Exception as e:
                results.append({"client_id": client_id, "status": "error", "detail": str(e)})
                db.rollback()

        return results
    finally:
        db.close()


def scheduled_pending_alerts():
    """Sync wrapper so APScheduler (BackgroundScheduler) can run run_pending_alerts."""
    asyncio.run(run_pending_alerts())


async def run_escalation_checks():
    """
    Scheduled job: look at pending escalation rows already set in alert_scheduler,
    and for each linked call_master record that is still Open and past its TAT
    (now > CallDate + tat hours), deliver the alert to the recipient configured
    on the alert row. Delivery gating happens inside process_client_alerts via
    _escalation_is_due, so rows that are not due yet stay pending.
    """
    db = next(get_db())
    results = []
    try:
        pending_clients = (
            db.query(AlertScheduler.client_id)
            .filter(
                AlertScheduler.alert_category == "escalation",
                or_(
                    AlertScheduler.sms_status.is_not(True),
                    AlertScheduler.email_status.is_not(True),
                    AlertScheduler.whatsapp_status.is_not(True),
                ),
            )
            .distinct()
            .all()
        )

        for (client_id,) in pending_clients:
            try:
                result = await process_client_alerts(db, client_id)
                results.append({"client_id": client_id, "status": result.get("status")})
            except HTTPException as e:
                results.append({"client_id": client_id, "status": "error", "detail": e.detail})
                db.rollback()
            except Exception as e:
                results.append({"client_id": client_id, "status": "error", "detail": str(e)})
                db.rollback()

        return results
    finally:
        db.close()


def scheduled_escalation_checks():
    """Sync wrapper so APScheduler (BackgroundScheduler) can run run_escalation_checks."""
    asyncio.run(run_escalation_checks())


def enqueue_category_alerts(db, client_id, category, phone=None, email=None, data_id=None):
    """
    Create one pending alert_scheduler row per alert mechanism of the given
    category ('caller' / 'internal' / 'escalation') configured for the client.
    Used when data is tagged in call_master. data_id is the call_master Id.
    """
    mechanisms = (
        db.query(AlertMechanisms)
        .filter(
            AlertMechanisms.client_id == client_id,
            AlertMechanisms.alert_category == category,
        )
        .all()
    )

    if not mechanisms:
        return 0

    for mech in mechanisms:
        db.add(AlertScheduler(
            client_id=client_id,
            data_id=data_id,
            alert_category=category,
            alert_on=mech.alert_on,
            template_name=mech.template_name,
            template_text=mech.template_text,
            phone=phone or mech.phone,
            email=email or mech.email,
            tat=mech.tat,
            sms_status=False,
            email_status=False,
            whatsapp_status=False,
            updated_at=datetime.now(),
        ))

    db.commit()
    return len(mechanisms)


def enqueue_caller_alerts(db, client_id, phone=None, email=None, data_id=None):
    """
    Create one pending alert_scheduler row per 'caller' alert mechanism
    configured for the client. Used when data is tagged in call_master.
    """
    return enqueue_category_alerts(db, client_id, "caller", phone=phone, email=email, data_id=data_id)


def enqueue_internal_alerts(db, client_id, phone=None, email=None, data_id=None):
    """Create one pending alert_scheduler row per 'internal' alert mechanism."""
    return enqueue_category_alerts(db, client_id, "internal", phone=phone, email=email, data_id=data_id)


def enqueue_escalation_alerts(db, client_id, phone=None, email=None, data_id=None):
    """Create one pending alert_scheduler row per 'escalation' alert mechanism."""
    return enqueue_category_alerts(db, client_id, "escalation", phone=phone, email=email, data_id=data_id)


async def send_alerts_on_tag(db, client_id, category, phone=None, email=None, data_id=None):
    """
    Enqueue alerts of the given category for a freshly tagged call_master record
    and immediately deliver them. Returns the delivery summary dict.
    """
    enqueued = enqueue_category_alerts(db, client_id, category, phone=phone, email=email, data_id=data_id)

    if not enqueued:
        return {
            "status": "no_alerts",
            "client_id": client_id,
            "reason": f"No {category} alert mechanism configured for this client",
        }

    return await process_client_alerts(db, client_id)


async def send_caller_alerts_on_tag(db, client_id, phone=None, email=None, data_id=None):
    """
    Enqueue caller alerts for a freshly tagged call_master record and
    immediately deliver them. Returns the delivery summary dict.
    """
    return await send_alerts_on_tag(db, client_id, "caller", phone=phone, email=email, data_id=data_id)


async def send_internal_alerts_on_tag(db, client_id, phone=None, email=None, data_id=None):
    """Enqueue and deliver 'internal' alerts for a freshly tagged record."""
    return await send_alerts_on_tag(db, client_id, "internal", phone=phone, email=email, data_id=data_id)


async def send_escalation_alerts_on_tag(db, client_id, phone=None, email=None, data_id=None):
    """Enqueue and deliver 'escalation' alerts for a freshly tagged record."""
    return await send_alerts_on_tag(db, client_id, "escalation", phone=phone, email=email, data_id=data_id)


# ============================================================
# Close Loop scheduler (SMS only)
#
# alert_scheduler rows for 'closeloop' are created by an external close-loop
# process. This scheduler only DELIVERS them:
#   1. It checks a pending 'closeloop' row exists for the client in
#      alert_scheduler.
#   2. It verifies the linked call_master ticket matches the close loop status
#      set on the mechanism (close_action_type / close_action_sub_type) and the
#      ticket is closed (CloseLoopingDate set).
#   3. It sends the SMS to the caller (alert.phone = call_master.MSISDN), logs
#      it in sms_log_history and adds a billing_master row on success.
# ============================================================


async def process_close_loop_alerts(db, client_id=None):
    """
    Deliver pending (not-yet-sent) 'closeloop' SMS alerts already present in
    alert_scheduler.

    For each pending row the linked call_master ticket must match the close
    loop status set on the client's closeloop mechanism (close_action_type,
    and close_action_sub_type when configured) and the ticket must be closed
    (CloseLoopingDate set) before the SMS is sent.

    SMS goes to the caller (alert.phone = call_master.MSISDN), is logged in
    sms_log_history and billed in billing_master on success.
    Returns a summary dict.
    """
    alerts_query = (
        db.query(AlertScheduler)
        .filter(
            AlertScheduler.alert_category == "closeloop",
            AlertScheduler.alert_on == "SMS",
            or_(
                AlertScheduler.sms_status.is_(None),
                AlertScheduler.sms_status.is_not(True),
            ),
        )
        .order_by(AlertScheduler.id)
    )
    if client_id:
        alerts_query = alerts_query.filter(AlertScheduler.client_id == client_id)
    alerts = alerts_query.all()

    sms_list = []
    skipped = []

    for alert in alerts:
        # Load the closeloop mechanism for this client (fallback for expected status)
        mechanisms = (
            db.query(AlertMechanisms)
            .filter(
                AlertMechanisms.client_id == alert.client_id,
                AlertMechanisms.alert_category == "closeloop",
            )
            .all()
        )
        mech = next(
            (m for m in mechanisms if m.template_text == alert.template_text),
            mechanisms[0] if mechanisms else None,
        )

        # Expected status comes from the alert_scheduler row itself
        # (set by the external close-loop process), falling back to the mechanism
        expected_action = alert.close_action_type or (mech.close_action_type if mech else None)
        expected_sub_action = alert.close_action_sub_type or (mech.close_action_sub_type if mech else None)

        if not expected_action:
            skipped.append({"id": alert.id, "reason": "no close_action_type configured on alert row / mechanism"})
            continue

        # Verify the linked ticket matches the expected close loop status
        row = db.execute(
            text("""
                SELECT CloseLoopCate1, CloseLoopCate2, CloseLoopingDate
                FROM call_master
                WHERE Id = :id
            """),
            {"id": alert.data_id},
        ).mappings().first()

        if not row:
            skipped.append({"id": alert.id, "reason": "call_master row not found"})
            continue

        if row.get("CloseLoopingDate") is None:
            skipped.append({"id": alert.id, "reason": "ticket not closed"})
            continue

        if (row.get("CloseLoopCate1") or "") != expected_action:
            skipped.append({
                "id": alert.id,
                "reason": f"status mismatch (got {row.get('CloseLoopCate1')!r}, want {expected_action!r})",
            })
            continue

        if expected_sub_action and (row.get("CloseLoopCate2") or "") != expected_sub_action:
            skipped.append({
                "id": alert.id,
                "reason": f"sub status mismatch (got {row.get('CloseLoopCate2')!r}, want {expected_sub_action!r})",
            })
            continue

        template_id = alert.template_id or DEFAULT_TEMPLATE_ID_SMS

        sms_response = send_sms(
            phone=alert.phone,
            message=alert.template_text or "No message content",
            template_id=template_id,
        )

        status = sms_response.get("status", "")

        if status == "success":
            alert.sms_status = True
            sms_log = SmsLogHistory(
                alert_id=alert.id,
                client_id=alert.client_id,
                phone=alert.phone,
                message=alert.template_text,
                template_id=template_id,
                provider_status="success",
                provider_response=json.dumps(sms_response),
            )
            db.add(sms_log)

            message = alert.template_text or ""
            sms_duration = len(message.split())
            sms_unit = max(1, math.ceil(sms_duration / 60))
            save_billing(db, alert, "SMS", sms_duration, sms_unit, alert.phone)
        else:
            alert.sms_status = False

        alert.sms_response = json.dumps(sms_response)
        alert.updated_at = datetime.now()
        db.add(alert)

        sms_list.append({
            "id": alert.id,
            "data_id": alert.data_id,
            "phone": alert.phone,
            "message": alert.template_text,
            "response": sms_response,
        })

    db.commit()

    return {
        "status": "success",
        "total_sms_sent": len(sms_list),
        "total_skipped": len(skipped),
        "sms_list": sms_list,
        "skipped": skipped,
    }


def run_close_loop_alerts(client_id=None):
    """
    Sync wrapper: deliver pending close-loop alerts already present in
    alert_scheduler. Used by the background scheduler. Returns a summary dict.
    """
    db = next(get_db())
    try:
        return asyncio.run(process_close_loop_alerts(db, client_id=client_id))
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


def scheduled_close_loop_checks():
    """Sync wrapper so APScheduler (BackgroundScheduler) can run the close loop scheduler."""
    result = run_close_loop_alerts()
    if result.get("status") != "success":
        print(f"CLOSE LOOP SCHEDULER ERROR {result}")


@router.get("/alert_scheduler/run_close_loop")
async def trigger_close_loop_alerts_all(db: Session = Depends(get_db)):
    """Manually run the close-loop scheduler for every client."""
    return await process_close_loop_alerts(db)


@router.get("/alert_scheduler/run_close_loop/{client_id}")
async def trigger_close_loop_alerts(client_id: int, db: Session = Depends(get_db)):
    """Manually run the close-loop scheduler for a single client."""
    return await process_close_loop_alerts(db, client_id=client_id)

