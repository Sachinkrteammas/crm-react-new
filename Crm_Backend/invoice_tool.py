# Crm_Backend/invoice_tool.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import smtplib
import os
import shutil
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from logger import logger
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

INVOICE_UPLOAD_DIR = os.path.join("uploads", "invoices")
os.makedirs(INVOICE_UPLOAD_DIR, exist_ok=True)


# =========================================================
# FALLBACK TEMPLATES
# =========================================================
FALLBACK_TEMPLATES = [
    {"id": 1, "template_key": "retainer", "template_name": "Retainer Invoice",
     "invoice_category": "Retainer",
     "subject_template": "Invoice {{invoice_number}} – Retainer",
     "email_template": "Dear {{client_name}},\n\nPlease find attached the Retainer invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk"},
    {"id": 2, "template_key": "subscription", "template_name": "Subscription Invoice",
     "invoice_category": "Subscription",
     "subject_template": "Invoice {{invoice_number}} – Subscription",
     "email_template": "Dear {{client_name}},\n\nPlease find attached the Subscription invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk"},
    {"id": 3, "template_key": "dedicated_seat", "template_name": "Dedicated Seat Invoice",
     "invoice_category": "Dedicated Seat",
     "subject_template": "Invoice {{invoice_number}} – Dedicated Seat",
     "email_template": "Dear {{client_name}},\n\nPlease find attached the Dedicated Seat invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk"},
    {"id": 4, "template_key": "excess_usage", "template_name": "Excess Usage Invoice",
     "invoice_category": "Excess Usage",
     "subject_template": "Invoice {{invoice_number}} – Excess Usage",
     "email_template": "Dear {{client_name}},\n\nPlease find attached the Excess Usage invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk"},
]


# =========================================================
# PYDANTIC MODELS
# =========================================================
class SMTPSettingsBody(BaseModel):
    host: str
    port: int
    username: str
    password: str
    sender_email: str
    use_tls: Optional[bool] = True


class ClientConfigBody(BaseModel):
    client_id: int
    client_name: str
    to_email: str
    cc_email: Optional[str] = ""
    template_key: Optional[str] = "subscription"
    subject: Optional[str] = "Invoice from DialDesk"
    email_template: Optional[str] = ""
    invoice_type: Optional[str] = "Monthly"


class TemplateBody(BaseModel):
    template_key: str
    template_name: str
    invoice_category: str
    subject_template: str
    email_template: str


# =========================================================
# SEED HELPERS
# =========================================================
def seed_smtp_from_env_if_empty(db: Session):
    try:
        if db.execute(text("SELECT id FROM invoice_smtp_settings LIMIT 1")).fetchone():
            return
        host = os.getenv("INVOICE_SMTP_HOST"); port = os.getenv("INVOICE_SMTP_PORT")
        user = os.getenv("INVOICE_SMTP_USER"); password = os.getenv("INVOICE_SMTP_PASSWORD")
        sender = os.getenv("INVOICE_SMTP_SENDER")
        use_tls = os.getenv("INVOICE_SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")
        if not all([host, port, user, password, sender]):
            return
        db.execute(text("""
            INSERT INTO invoice_smtp_settings
                (host, port, username, password, sender_email, use_tls)
            VALUES (:host, :port, :username, :password, :sender_email, :use_tls)
        """), {"host": host, "port": int(port), "username": user, "password": password,
               "sender_email": sender, "use_tls": 1 if use_tls else 0})
        db.commit()
    except Exception as e:
        logger.error(f"SMTP auto-seed failed: {e}")


def seed_templates_if_empty(db: Session):
    try:
        if db.execute(text("SELECT id FROM invoice_templates LIMIT 1")).fetchone():
            return
        for t in FALLBACK_TEMPLATES:
            db.execute(text("""
                INSERT INTO invoice_templates
                    (template_key, template_name, invoice_category, subject_template, email_template)
                VALUES (:key, :name, :cat, :subj, :body)
            """), {"key": t["template_key"], "name": t["template_name"],
                   "cat": t["invoice_category"], "subj": t["subject_template"],
                   "body": t["email_template"]})
        db.commit()
    except Exception as e:
        logger.error(f"Template auto-seed failed: {e}")


# =========================================================
# 1. SMTP SETTINGS
# =========================================================
@router.get("/smtp-settings", tags=["Invoice Tool"])
def get_smtp_settings(db: Session = Depends(get_db4)):
    seed_smtp_from_env_if_empty(db)
    row = db.execute(text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")).mappings().fetchone()
    if not row:
        return {"configured": False, "data": None}
    data = dict(row); data["password"] = "********"
    return {"configured": True, "data": data}


@router.post("/smtp-settings", tags=["Invoice Tool"])
def save_smtp_settings(body: SMTPSettingsBody, db: Session = Depends(get_db4)):
    existing = db.execute(text("SELECT * FROM invoice_smtp_settings LIMIT 1")).mappings().fetchone()
    if existing and body.password in ("__KEEP_EXISTING__", "", "********"):
        final_password = existing["password"]
    else:
        final_password = body.password
    if existing:
        db.execute(text("""
            UPDATE invoice_smtp_settings
            SET host=:host, port=:port, username=:username,
                password=:password, sender_email=:sender_email, use_tls=:use_tls
            WHERE id=:id
        """), {"host": body.host, "port": body.port, "username": body.username,
               "password": final_password, "sender_email": body.sender_email,
               "use_tls": 1 if body.use_tls else 0, "id": existing["id"]})
    else:
        db.execute(text("""
            INSERT INTO invoice_smtp_settings
                (host, port, username, password, sender_email, use_tls)
            VALUES (:host, :port, :username, :password, :sender_email, :use_tls)
        """), {"host": body.host, "port": body.port, "username": body.username,
               "password": final_password, "sender_email": body.sender_email,
               "use_tls": 1 if body.use_tls else 0})
    db.commit()
    return {"status": "success", "message": "SMTP settings saved"}


@router.post("/smtp-settings/test", tags=["Invoice Tool"])
def test_smtp(db: Session = Depends(get_db4)):
    smtp = db.execute(text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")).mappings().fetchone()
    if not smtp:
        raise HTTPException(status_code=400, detail="SMTP not configured")
    try:
        server = smtplib.SMTP(smtp["host"], smtp["port"], timeout=15)
        if smtp["use_tls"]:
            server.starttls()
        server.login(smtp["username"], smtp["password"])
        server.quit()
        return {"status": "success", "message": "SMTP connection successful"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP test failed: {str(e)}")


# =========================================================
# 2. TEMPLATES — GET / CREATE / DELETE
# =========================================================
@router.get("/templates", tags=["Invoice Tool"])
def list_templates(db: Session = Depends(get_db4)):
    try:
        seed_templates_if_empty(db)
        rows = db.execute(text("""
            SELECT id, template_key, template_name, invoice_category,
                   subject_template, email_template
            FROM invoice_templates
            WHERE is_active = 1
            ORDER BY id ASC
        """)).mappings().all()
        if rows:
            return {"data": [dict(r) for r in rows], "source": "db"}
        return {"data": FALLBACK_TEMPLATES, "source": "fallback"}
    except Exception as e:
        logger.error(f"list_templates error: {e}")
        return {"data": FALLBACK_TEMPLATES, "source": "fallback", "error": str(e)}


@router.post("/template", tags=["Invoice Tool"])
def create_or_update_template(body: TemplateBody, db: Session = Depends(get_db4)):
    if not body.template_key or not body.template_name:
        raise HTTPException(status_code=400, detail="Template key and name required")

    existing = db.execute(text("""
        SELECT id FROM invoice_templates WHERE template_key = :key
    """), {"key": body.template_key}).fetchone()

    if existing:
        db.execute(text("""
            UPDATE invoice_templates
            SET template_name=:name, invoice_category=:cat,
                subject_template=:subj, email_template=:body, is_active=1
            WHERE template_key=:key
        """), {"key": body.template_key, "name": body.template_name,
               "cat": body.invoice_category, "subj": body.subject_template,
               "body": body.email_template})
        msg = "Template updated"
    else:
        db.execute(text("""
            INSERT INTO invoice_templates
                (template_key, template_name, invoice_category, subject_template, email_template)
            VALUES (:key, :name, :cat, :subj, :body)
        """), {"key": body.template_key, "name": body.template_name,
               "cat": body.invoice_category, "subj": body.subject_template,
               "body": body.email_template})
        msg = "Template created"
    db.commit()
    return {"status": "success", "message": msg}


@router.delete("/template/{template_key}", tags=["Invoice Tool"])
def delete_template(template_key: str, db: Session = Depends(get_db4)):
    db.execute(text("UPDATE invoice_templates SET is_active = 0 WHERE template_key = :key"),
               {"key": template_key})
    db.commit()
    return {"status": "success", "message": "Template deleted"}


# =========================================================
# 3. INVOICES
# =========================================================
@router.get("/invoices", tags=["Invoice Tool"])
def list_invoices(client_id: Optional[int] = None, db: Session = Depends(get_db4)):
    try:
        if client_id:
            rows = db.execute(text("""
                SELECT id, invoice_number, client_id, client_name,
                       invoice_category, period, amount, due_date
                FROM invoices WHERE client_id = :cid ORDER BY id DESC LIMIT 200
            """), {"cid": client_id}).mappings().all()
        else:
            rows = db.execute(text("""
                SELECT id, invoice_number, client_id, client_name,
                       invoice_category, period, amount, due_date
                FROM invoices ORDER BY id DESC LIMIT 200
            """)).mappings().all()
        return {"data": [dict(r) for r in rows], "count": len(rows)}
    except Exception as e:
        logger.error(f"list_invoices ERROR: {e}")
        return {"data": [], "count": 0, "error": str(e)}


# =========================================================
# 4. CLIENT CONFIG
# =========================================================
@router.get("/clients", tags=["Invoice Tool"])
def list_clients(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT id, client_id, client_name, to_email, cc_email,
               template_key, subject, invoice_type
        FROM invoice_client_config ORDER BY client_name ASC
    """)).mappings().all()
    return {"data": [dict(r) for r in rows]}


@router.get("/client/{client_id}", tags=["Invoice Tool"])
def get_client(client_id: int, db: Session = Depends(get_db4)):
    row = db.execute(text("SELECT * FROM invoice_client_config WHERE client_id = :cid"),
                     {"cid": client_id}).mappings().fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Client config not found")
    return {"data": dict(row)}


@router.post("/client", tags=["Invoice Tool"])
def save_client(body: ClientConfigBody, db: Session = Depends(get_db4)):
    existing = db.execute(text("SELECT id FROM invoice_client_config WHERE client_id = :cid"),
                          {"cid": body.client_id}).fetchone()
    payload = body.model_dump()
    if existing:
        db.execute(text("""
            UPDATE invoice_client_config
            SET client_name=:client_name, to_email=:to_email, cc_email=:cc_email,
                template_key=:template_key, subject=:subject,
                email_template=:email_template, invoice_type=:invoice_type
            WHERE client_id=:client_id
        """), payload)
    else:
        db.execute(text("""
            INSERT INTO invoice_client_config
                (client_id, client_name, to_email, cc_email,
                 template_key, subject, email_template, invoice_type)
            VALUES (:client_id, :client_name, :to_email, :cc_email,
                    :template_key, :subject, :email_template, :invoice_type)
        """), payload)
    db.commit()
    return {"status": "success", "message": "Client config saved"}


@router.delete("/client/{client_id}", tags=["Invoice Tool"])
def delete_client(client_id: int, db: Session = Depends(get_db4)):
    db.execute(text("DELETE FROM invoice_client_config WHERE client_id = :cid"), {"cid": client_id})
    db.commit()
    return {"status": "success", "message": "Client config deleted"}


# =========================================================
# 5. DYNAMIC BUILDERS
# =========================================================
def build_dynamic_subject(subject_template: str, invoice_number: str, invoice_category: str) -> str:
    subj = subject_template or "Invoice {{invoice_number}} – {{invoice_category}}"
    subj = subj.replace("{{invoice_number}}", invoice_number or "")
    subj = subj.replace("{{invoice_category}}", invoice_category or "")
    return re.sub(r"\s+", " ", subj).strip()


def build_dynamic_body(email_template: str, ctx: dict) -> str:
    body = email_template or ""
    for key, val in ctx.items():
        body = body.replace(f"{{{{{key}}}}}", str(val or ""))
    return body


# =========================================================
# 6. SEND INVOICE
# =========================================================
@router.post("/send-invoice", tags=["Invoice Tool"])
async def send_invoice(
    client_id: int = Form(...),
    template_key: str = Form(...),
    invoice_number: str = Form(...),
    invoice_category: Optional[str] = Form(""),
    invoice_type: str = Form("Monthly"),
    period: str = Form(""),
    amount: str = Form(""),
    due_date: str = Form(""),
    remarks: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db4),
):
    client = db.execute(text("SELECT * FROM invoice_client_config WHERE client_id = :cid"),
                        {"cid": client_id}).mappings().fetchone()
    if not client:
        raise HTTPException(status_code=404, detail="Client not configured.")

    smtp = db.execute(text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")).mappings().fetchone()
    if not smtp:
        raise HTTPException(status_code=400, detail="SMTP not configured.")

    template = db.execute(text("""
        SELECT * FROM invoice_templates WHERE template_key = :key AND is_active = 1
    """), {"key": template_key}).mappings().fetchone()
    if not template:
        fb = next((t for t in FALLBACK_TEMPLATES if t["template_key"] == template_key), None)
        if not fb:
            raise HTTPException(status_code=404, detail=f"Template '{template_key}' not found.")
        template = fb

    final_category = template["invoice_category"] or invoice_category or "Invoice"
    subject_used = build_dynamic_subject(template["subject_template"], invoice_number, final_category)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{client_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(INVOICE_UPLOAD_DIR, safe_name)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

    body_ctx = {
        "client_name": client["client_name"], "invoice_number": invoice_number,
        "invoice_category": final_category, "invoice_type": invoice_type,
        "period": period, "amount": amount, "due_date": due_date, "remarks": remarks,
    }
    body_text = build_dynamic_body(template["email_template"], body_ctx)

    try:
        msg = MIMEMultipart()
        msg["From"] = smtp["sender_email"]
        msg["To"] = client["to_email"]
        if client["cc_email"]:
            msg["Cc"] = client["cc_email"]
        msg["Subject"] = subject_used
        msg.attach(MIMEText(body_text, "plain"))

        with open(file_path, "rb") as f:
            part = MIMEApplication(f.read(), Name=file.filename)
            part["Content-Disposition"] = f'attachment; filename="{file.filename}"'
            msg.attach(part)

        recipients = [client["to_email"]]
        if client["cc_email"]:
            recipients += [e.strip() for e in client["cc_email"].split(",") if e.strip()]

        server = smtplib.SMTP(smtp["host"], smtp["port"], timeout=30)
        if smtp["use_tls"]:
            server.starttls()
        server.login(smtp["username"], smtp["password"])
        server.sendmail(smtp["sender_email"], recipients, msg.as_string())
        server.quit()

        db.execute(text("""
            INSERT INTO invoice_send_log
                (client_id, template_key, invoice_number, invoice_category, subject_used,
                 to_email, cc_email, file_name, file_path, status)
            VALUES (:client_id, :template_key, :invoice_number, :invoice_category, :subject_used,
                    :to_email, :cc_email, :file_name, :file_path, :status)
        """), {"client_id": client_id, "template_key": template_key,
               "invoice_number": invoice_number, "invoice_category": final_category,
               "subject_used": subject_used, "to_email": client["to_email"],
               "cc_email": client["cc_email"], "file_name": file.filename,
               "file_path": file_path, "status": "SENT"})
        db.commit()

        return {"status": "success", "message": f"Invoice sent to {client['to_email']}",
                "subject": subject_used, "file": safe_name}

    except Exception as e:
        try:
            db.execute(text("""
                INSERT INTO invoice_send_log
                    (client_id, template_key, invoice_number, invoice_category, subject_used,
                     to_email, cc_email, file_name, file_path, status, error_msg)
                VALUES (:client_id, :template_key, :invoice_number, :invoice_category, :subject_used,
                        :to_email, :cc_email, :file_name, :file_path, :status, :error_msg)
            """), {"client_id": client_id, "template_key": template_key,
                   "invoice_number": invoice_number, "invoice_category": final_category,
                   "subject_used": subject_used, "to_email": client["to_email"],
                   "cc_email": client["cc_email"], "file_name": file.filename,
                   "file_path": file_path, "status": "FAILED", "error_msg": str(e)})
            db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")


# =========================================================
# 7. LOGS
# =========================================================
@router.get("/logs", tags=["Invoice Tool"])
def get_logs(limit: int = 100, db: Session = Depends(get_db4)):
    rows = db.execute(text("SELECT * FROM invoice_send_log ORDER BY sent_at DESC LIMIT :lim"),
                      {"lim": limit}).mappings().all()
    return {"data": [dict(r) for r in rows]}