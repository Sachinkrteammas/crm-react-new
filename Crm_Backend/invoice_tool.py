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
import io
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from logger import logger
from dotenv import load_dotenv

try:
    import pdfplumber
    PDF_LIB = "pdfplumber"
except ImportError:
    try:
        import PyPDF2
        PDF_LIB = "PyPDF2"
    except ImportError:
        PDF_LIB = None

load_dotenv()

router = APIRouter()

INVOICE_UPLOAD_DIR = os.path.join("uploads", "invoices")
os.makedirs(INVOICE_UPLOAD_DIR, exist_ok=True)


# =========================================================
# FALLBACK TEMPLATES
# =========================================================
FALLBACK_TEMPLATES = [
    {"id": 1, "template_key": "retainer", "template_name": "Retainer Invoice", "invoice_category": "Retainer",
     "subject_template": "Invoice {{invoice_number}} – Retainer",
     "email_template": "Dear {{client_name}},\n\nPlease find attached the Retainer invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk"},
    {"id": 2, "template_key": "subscription", "template_name": "Subscription Invoice", "invoice_category": "Subscription",
     "subject_template": "Invoice {{invoice_number}} – Subscription",
     "email_template": "Dear {{client_name}},\n\nPlease find attached the Subscription invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk"},
    {"id": 3, "template_key": "dedicated_seat", "template_name": "Dedicated Seat Invoice", "invoice_category": "Dedicated Seat",
     "subject_template": "Invoice {{invoice_number}} – Dedicated Seat",
     "email_template": "Dear {{client_name}},\n\nPlease find attached the Dedicated Seat invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk"},
    {"id": 4, "template_key": "excess_usage", "template_name": "Excess Usage Invoice", "invoice_category": "Excess Usage",
     "subject_template": "Invoice {{invoice_number}} – Excess Usage",
     "email_template": "Dear {{client_name}},\n\nPlease find attached the Excess Usage invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk"},
]

ALERT_FALLBACK_TEMPLATES = [
    {"id": 1, "alert_key": "payment_reminder", "alert_name": "Payment Reminder",
     "subject_template": "Payment Reminder – Invoice {{invoice_number}}",
     "email_template": "Dear {{client_name}},\n\nThis is a gentle reminder that payment for Invoice {{invoice_number}} (Amount: {{amount}}) is still pending.\n\nDue Date: {{due_date}}\nDays Overdue: {{days_overdue}}\n\nKindly process the payment at the earliest.\n\nRegards,\nTeam DialDesk"},
    {"id": 2, "alert_key": "final_notice", "alert_name": "Final Notice",
     "subject_template": "FINAL NOTICE – Invoice {{invoice_number}}",
     "email_template": "Dear {{client_name}},\n\nThis is a FINAL NOTICE for the pending payment of Invoice {{invoice_number}} (Amount: {{amount}}).\n\nDue Date: {{due_date}}\nDays Overdue: {{days_overdue}}\n\nPlease clear the dues immediately to avoid service interruption.\n\nRegards,\nTeam DialDesk"},
]


# =========================================================
# PYDANTIC MODELS
# =========================================================
class SMTPSettingsBody(BaseModel):
    host: str; port: int; username: str; password: str; sender_email: str
    use_tls: Optional[bool] = True


class ClientConfigBody(BaseModel):
    client_id: int; client_name: str; to_email: str
    cc_email: Optional[str] = ""
    template_key: Optional[str] = "subscription"
    subject: Optional[str] = "Invoice from DialDesk"
    email_template: Optional[str] = ""
    invoice_type: Optional[str] = "Monthly"


class TemplateBody(BaseModel):
    template_key: str; template_name: str; invoice_category: str
    subject_template: str; email_template: str


class AlertTemplateBody(BaseModel):
    alert_key: str; alert_name: str
    subject_template: str; email_template: str


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
        logger.error(f"SMTP seed failed: {e}")


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
        logger.error(f"Template seed failed: {e}")


def seed_alert_templates_if_empty(db: Session):
    try:
        if db.execute(text("SELECT id FROM invoice_alert_templates LIMIT 1")).fetchone():
            return
        for t in ALERT_FALLBACK_TEMPLATES:
            db.execute(text("""
                INSERT INTO invoice_alert_templates
                    (alert_key, alert_name, subject_template, email_template)
                VALUES (:key, :name, :subj, :body)
            """), {"key": t["alert_key"], "name": t["alert_name"],
                   "subj": t["subject_template"], "body": t["email_template"]})
        db.commit()
    except Exception as e:
        logger.error(f"Alert template seed failed: {e}")


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
    final_password = existing["password"] if (existing and body.password in ("__KEEP_EXISTING__", "", "********")) else body.password
    if existing:
        db.execute(text("""
            UPDATE invoice_smtp_settings
            SET host=:host, port=:port, username=:username, password=:password,
                sender_email=:sender_email, use_tls=:use_tls WHERE id=:id
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
        return {"status": "success", "message": "SMTP OK"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP test failed: {str(e)}")


# =========================================================
# 2. TEMPLATES
# =========================================================
@router.get("/templates", tags=["Invoice Tool"])
def list_templates(db: Session = Depends(get_db4)):
    try:
        seed_templates_if_empty(db)
        rows = db.execute(text("""
            SELECT id, template_key, template_name, invoice_category,
                   subject_template, email_template
            FROM invoice_templates WHERE is_active = 1 ORDER BY id ASC
        """)).mappings().all()
        return {"data": [dict(r) for r in rows] if rows else FALLBACK_TEMPLATES}
    except Exception as e:
        logger.error(f"list_templates error: {e}")
        return {"data": FALLBACK_TEMPLATES, "error": str(e)}


@router.post("/template", tags=["Invoice Tool"])
def create_or_update_template(body: TemplateBody, db: Session = Depends(get_db4)):
    if not body.template_key or not body.template_name:
        raise HTTPException(status_code=400, detail="Key and name required")
    existing = db.execute(text("SELECT id FROM invoice_templates WHERE template_key=:key"),
                          {"key": body.template_key}).fetchone()
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
    db.execute(text("UPDATE invoice_templates SET is_active = 0 WHERE template_key = :key"), {"key": template_key})
    db.commit()
    return {"status": "success", "message": "Deleted"}


# =========================================================
# 3. PDF EXTRACTION
# =========================================================
CATEGORY_KEYWORDS = {
    "retainer": ["retainer", "retainer cost", "retainer charges"],
    "subscription": ["subscription", "subscription charges", "monthly subscription",
                     "telephone based support", "support services", "monthly support",
                     "amc", "annual maintenance"],
    "dedicated_seat": ["dedicated seat", "dedicated seats", "dedicated agent"],
    "excess_usage": ["excess usage", "overage", "extra usage", "usage overage"],
}

INVOICE_NO_PATTERNS = [
    r"Bill\s*No[\s\S]{0,150}?([0-9]{1,4}[-/][0-9A-Z]{1,10}(?:[-/][0-9A-Z]{1,10})?)",
    r"Bill\s*No[:\s]+([A-Z0-9][A-Z0-9\-/]{2,30})",
    r"(?:invoice|inv|bill)\s*(?:no|number|#|num)?[:\s#\-]*([A-Z0-9][A-Z0-9\-/]{2,30})",
    r"(?:invoice|inv)\s*[:\s#\-]\s*([A-Z0-9][A-Z0-9\-/]{2,30})",
]
AMOUNT_PATTERNS = [
    r"G\.?\s*Total[\s\S]{0,80}?([\d,]+(?:\.\d{1,2})?)",
    r"(?:grand\s*total|total\s*amount|amount\s*due|net\s*amount|total\s*payable|total\s*due|invoice\s*amount|payable\s*amount)[:\s]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)",
    r"(?:^|\s)total[:\s]+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)",
    r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)",
]
PERIOD_PATTERNS = [
    r"([A-Za-z]{3,9}[\s\-]\d{2,4}\s*(?:to|–|-|through)\s*[A-Za-z]{3,9}[\s\-]\d{2,4})",
    r"(?:period|billing\s*period|for\s*the\s*period)[:\s]*([A-Za-z]{3,9}[\s\-]\d{2,4})",
    r"([A-Za-z]{3,9}\s*\d{4})",
]
DUE_DATE_PATTERNS = [
    r"(?:due\s*date|payment\s*due|pay\s*by)[:\s]*(\d{1,2}[\-/\.]\d{1,2}[\-/\.]\d{2,4})",
    r"(?:due\s*date|payment\s*due)[:\s]*(\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-]\d{2,4})",
]
INVOICE_DATE_PATTERNS = [
    r"(?:^|\n)\s*Date[\s]*\n?\s*(\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-]\d{2,4})",
    r"(?:invoice\s*date|date\s*of\s*issue|dated)[:\s]*(\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-]\d{2,4})",
]
CLIENT_NAME_PATTERNS = [
    r"Bill\s*to\s*Address[\s\S]{0,300}?\n\s*([A-Z][A-Za-z0-9&.,'\s]{5,80}?)\s*\n",
    r"Bill\s*To[:\s]+([A-Z][A-Za-z0-9&.,'\s]{5,80})",
]


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    if PDF_LIB == "pdfplumber":
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
                    for table in page.extract_tables() or []:
                        for row in table:
                            text += " | ".join(str(c or "") for c in row) + "\n"
            return text
        except Exception as e:
            logger.error(f"pdfplumber failed: {e}")
    if PDF_LIB == "PyPDF2":
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        except Exception as e:
            logger.error(f"PyPDF2 failed: {e}")
    return text


def _find_first(patterns, text):
    for pat in patterns:
        try:
            m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
            if m: return m.group(1).strip()
        except Exception: continue
    return None


def _find_all(patterns, text):
    results = []
    for pat in patterns:
        try:
            for m in re.finditer(pat, text, re.IGNORECASE | re.MULTILINE):
                results.append(m.group(1).strip())
        except Exception: continue
    return results


def _detect_category(text):
    lower = text.lower()
    for key, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return {"retainer": "Retainer", "subscription": "Subscription",
                        "dedicated_seat": "Dedicated Seat", "excess_usage": "Excess Usage"}[key]
    return None


def _clean_amount(amt):
    if not amt: return ""
    cleaned = amt.replace(",", "").strip()
    try:
        val = float(cleaned)
        return f"₹ {int(val):,}" if val.is_integer() else f"₹ {val:,.2f}"
    except Exception:
        return f"₹ {amt}"


def _normalize_date(date_str):
    if not date_str: return ""
    for fmt in ("%d-%b-%Y", "%d-%b-%y", "%d %b %Y", "%d %B %Y",
                "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%d-%m-%y", "%d/%m/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except Exception: continue
    return date_str


@router.post("/extract-from-pdf", tags=["Invoice Tool"])
async def extract_from_pdf(file: UploadFile = File(...)):
    if PDF_LIB is None:
        raise HTTPException(status_code=500, detail="PDF library not installed. Run: pip install pdfplumber")

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read failed: {str(e)}")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    text = _extract_text_from_pdf(file_bytes)

    if not text or len(text.strip()) < 20:
        return {"status": "partial", "message": "Could not extract text",
                "data": {"invoice_number": "", "amount": "", "invoice_category": "",
                         "period": "", "due_date": "", "client_name": "", "raw_text_preview": text[:500]}}

    invoice_number = _find_first(INVOICE_NO_PATTERNS, text) or ""
    g_total_matches = _find_all([r"G\.?\s*Total[\s\S]{0,100}?([\d,]+(?:\.\d{1,2})?)"], text)
    raw_amount = g_total_matches[-1] if g_total_matches else (_find_first(AMOUNT_PATTERNS, text) or "")
    amount = _clean_amount(raw_amount) if raw_amount else ""
    invoice_category = _detect_category(text) or ""
    period = _find_first(PERIOD_PATTERNS, text) or ""
    due_date_raw = _find_first(DUE_DATE_PATTERNS, text) or _find_first(INVOICE_DATE_PATTERNS, text) or ""
    normalized_due = _normalize_date(due_date_raw)
    client_name = _find_first(CLIENT_NAME_PATTERNS, text) or ""

    logger.info(f"PDF extract → inv={invoice_number} amt={amount} cat={invoice_category}")

    return {"status": "success", "data": {
        "invoice_number": invoice_number, "amount": amount,
        "invoice_category": invoice_category, "period": period,
        "due_date": normalized_due, "client_name": client_name,
        "raw_text_preview": text[:800],
    }}


# =========================================================
# 4. INVOICES
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
        return {"data": [], "count": 0, "error": str(e)}


# =========================================================
# 5. CLIENT CONFIG
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
    return {"status": "success", "message": "Deleted"}


# =========================================================
# 6. DYNAMIC BUILDERS
# =========================================================
def build_dynamic_subject(subject_template, invoice_number, invoice_category):
    subj = subject_template or "Invoice {{invoice_number}} – {{invoice_category}}"
    subj = subj.replace("{{invoice_number}}", invoice_number or "")
    subj = subj.replace("{{invoice_category}}", invoice_category or "")
    return re.sub(r"\s+", " ", subj).strip()


def build_dynamic_body(email_template, ctx):
    body = email_template or ""
    for k, v in ctx.items():
        body = body.replace(f"{{{{{k}}}}}", str(v or ""))
    return body


# =========================================================
# 7. SEND INVOICE (with alert scheduling)
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
    alert_enabled: int = Form(0),
    alert_template_key: Optional[str] = Form("payment_reminder"),
    alert_after_days: int = Form(25),
    file: UploadFile = File(...),
    db: Session = Depends(get_db4),
):
    client = db.execute(text("SELECT * FROM invoice_client_config WHERE client_id = :cid"),
                        {"cid": client_id}).mappings().fetchone()
    if not client:
        raise HTTPException(status_code=404, detail="Client not configured")

    smtp = db.execute(text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")).mappings().fetchone()
    if not smtp:
        raise HTTPException(status_code=400, detail="SMTP not configured")

    template = db.execute(text("""
        SELECT * FROM invoice_templates WHERE template_key = :key AND is_active = 1
    """), {"key": template_key}).mappings().fetchone()
    if not template:
        fb = next((t for t in FALLBACK_TEMPLATES if t["template_key"] == template_key), None)
        if not fb:
            raise HTTPException(status_code=404, detail=f"Template '{template_key}' not found")
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

    body_ctx = {"client_name": client["client_name"], "invoice_number": invoice_number,
                "invoice_category": final_category, "invoice_type": invoice_type,
                "period": period, "amount": amount, "due_date": due_date, "remarks": remarks}
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

        # 🔥 Schedule alert
        if alert_enabled and alert_template_key:
            try:
                db.execute(text("""
                    INSERT INTO invoice_alert_schedule
                        (client_id, invoice_number, invoice_category, amount, due_date,
                         template_key, alert_after_days, scheduled_date, status)
                    VALUES (:cid, :inv, :cat, :amt, :due, :tk, :days,
                            DATE_ADD(NOW(), INTERVAL :days DAY), 'PENDING')
                """), {"cid": client_id, "inv": invoice_number, "cat": final_category,
                       "amt": amount, "due": due_date or None,
                       "tk": alert_template_key, "days": alert_after_days})
                logger.info(f"Alert scheduled client_id={client_id} after {alert_after_days} days")
            except Exception as e:
                logger.error(f"Alert schedule failed: {e}")

        db.execute(text("""
            INSERT INTO invoice_send_log
                (client_id, template_key, invoice_number, invoice_category, subject_used,
                 to_email, cc_email, file_name, file_path, status,
                 alert_enabled, alert_template_key, alert_after_days)
            VALUES (:client_id, :template_key, :invoice_number, :invoice_category, :subject_used,
                    :to_email, :cc_email, :file_name, :file_path, :status,
                    :alert_enabled, :alert_template_key, :alert_after_days)
        """), {"client_id": client_id, "template_key": template_key,
               "invoice_number": invoice_number, "invoice_category": final_category,
               "subject_used": subject_used, "to_email": client["to_email"],
               "cc_email": client["cc_email"], "file_name": file.filename,
               "file_path": file_path, "status": "SENT",
               "alert_enabled": alert_enabled, "alert_template_key": alert_template_key,
               "alert_after_days": alert_after_days})
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
                        :to_email, :cc_email, :file_name, :file_path, 'FAILED', :err)
            """), {"client_id": client_id, "template_key": template_key,
                   "invoice_number": invoice_number, "invoice_category": final_category,
                   "subject_used": subject_used, "to_email": client["to_email"],
                   "cc_email": client["cc_email"], "file_name": file.filename,
                   "file_path": file_path, "err": str(e)})
            db.commit()
        except Exception: pass
        raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")


# =========================================================
# 8. LOGS
# =========================================================
@router.get("/logs", tags=["Invoice Tool"])
def get_logs(limit: int = 100, db: Session = Depends(get_db4)):
    rows = db.execute(text("SELECT * FROM invoice_send_log ORDER BY sent_at DESC LIMIT :lim"),
                      {"lim": limit}).mappings().all()
    return {"data": [dict(r) for r in rows]}


# =========================================================
# 9. 🔥 ALERT TEMPLATES CRUD
# =========================================================
@router.get("/alert-templates", tags=["Invoice Tool"])
def list_alert_templates(db: Session = Depends(get_db4)):
    try:
        seed_alert_templates_if_empty(db)
        rows = db.execute(text("""
            SELECT id, alert_key, alert_name, subject_template, email_template
            FROM invoice_alert_templates WHERE is_active = 1 ORDER BY id ASC
        """)).mappings().all()
        return {"data": [dict(r) for r in rows] if rows else ALERT_FALLBACK_TEMPLATES}
    except Exception as e:
        return {"data": ALERT_FALLBACK_TEMPLATES, "error": str(e)}


@router.post("/alert-template", tags=["Invoice Tool"])
def save_alert_template(body: AlertTemplateBody, db: Session = Depends(get_db4)):
    if not body.alert_key or not body.alert_name:
        raise HTTPException(status_code=400, detail="Key and name required")
    existing = db.execute(text("SELECT id FROM invoice_alert_templates WHERE alert_key=:k"),
                          {"k": body.alert_key}).fetchone()
    if existing:
        db.execute(text("""
            UPDATE invoice_alert_templates
            SET alert_name=:name, subject_template=:subj, email_template=:body, is_active=1
            WHERE alert_key=:key
        """), {"key": body.alert_key, "name": body.alert_name,
               "subj": body.subject_template, "body": body.email_template})
        msg = "Alert template updated"
    else:
        db.execute(text("""
            INSERT INTO invoice_alert_templates
                (alert_key, alert_name, subject_template, email_template)
            VALUES (:key, :name, :subj, :body)
        """), {"key": body.alert_key, "name": body.alert_name,
               "subj": body.subject_template, "body": body.email_template})
        msg = "Alert template created"
    db.commit()
    return {"status": "success", "message": msg}


@router.delete("/alert-template/{alert_key}", tags=["Invoice Tool"])
def delete_alert_template(alert_key: str, db: Session = Depends(get_db4)):
    db.execute(text("UPDATE invoice_alert_templates SET is_active = 0 WHERE alert_key = :key"),
               {"key": alert_key})
    db.commit()
    return {"status": "success", "message": "Deleted"}


# =========================================================
# 10. 🔥 ALERT SCHEDULE — list, send-now, mark-paid, run
# =========================================================
@router.get("/alerts", tags=["Invoice Tool"])
def list_alerts(status: Optional[str] = None, db: Session = Depends(get_db4)):
    try:
        if status:
            rows = db.execute(text("""
                SELECT * FROM invoice_alert_schedule WHERE status = :s
                ORDER BY scheduled_date ASC LIMIT 500
            """), {"s": status}).mappings().all()
        else:
            rows = db.execute(text("""
                SELECT * FROM invoice_alert_schedule ORDER BY scheduled_date ASC LIMIT 500
            """)).mappings().all()
        return {"data": [dict(r) for r in rows], "count": len(rows)}
    except Exception as e:
        return {"data": [], "count": 0, "error": str(e)}


@router.post("/alert/send-now", tags=["Invoice Tool"])
async def send_alert_now(
    client_id: int = Form(...),
    invoice_number: str = Form(...),
    invoice_category: str = Form(""),
    amount: str = Form(""),
    due_date: str = Form(""),
    template_key: str = Form("payment_reminder"),
    days_overdue: int = Form(0),
    db: Session = Depends(get_db4),
):
    client = db.execute(text("SELECT * FROM invoice_client_config WHERE client_id = :cid"),
                        {"cid": client_id}).mappings().fetchone()
    if not client:
        raise HTTPException(status_code=404, detail="Client not configured")
    smtp = db.execute(text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")).mappings().fetchone()
    if not smtp:
        raise HTTPException(status_code=400, detail="SMTP not configured")
    tmpl = db.execute(text("""
        SELECT * FROM invoice_alert_templates WHERE alert_key = :key AND is_active = 1
    """), {"key": template_key}).mappings().fetchone()
    if not tmpl:
        fb = next((t for t in ALERT_FALLBACK_TEMPLATES if t["alert_key"] == template_key), None)
        if not fb:
            raise HTTPException(status_code=404, detail="Alert template not found")
        tmpl = fb

    ctx = {"client_name": client["client_name"], "invoice_number": invoice_number,
           "invoice_category": invoice_category, "amount": amount,
           "due_date": due_date, "days_overdue": days_overdue}

    subject = tmpl["subject_template"] or ""
    body = tmpl["email_template"] or ""
    for k, v in ctx.items():
        subject = subject.replace(f"{{{{{k}}}}}", str(v or ""))
        body = body.replace(f"{{{{{k}}}}}", str(v or ""))

    try:
        msg = MIMEMultipart()
        msg["From"] = smtp["sender_email"]
        msg["To"] = client["to_email"]
        if client["cc_email"]:
            msg["Cc"] = client["cc_email"]
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

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
            UPDATE invoice_alert_schedule SET status='SENT', sent_at=NOW()
            WHERE client_id=:cid AND invoice_number=:inv AND status='PENDING'
        """), {"cid": client_id, "inv": invoice_number})
        db.commit()

        return {"status": "success", "message": f"Alert sent to {client['to_email']}", "subject": subject}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert send failed: {str(e)}")


@router.post("/alert/mark-paid/{alert_id}", tags=["Invoice Tool"])
def mark_alert_paid(alert_id: int, db: Session = Depends(get_db4)):
    db.execute(text("UPDATE invoice_alert_schedule SET status='PAID' WHERE id=:id"), {"id": alert_id})
    db.commit()
    return {"status": "success", "message": "Marked as paid"}


@router.post("/alerts/run", tags=["Invoice Tool"])
async def run_due_alerts(db: Session = Depends(get_db4)):
    """Fire all PENDING alerts whose scheduled_date <= now."""
    try:
        rows = db.execute(text("""
            SELECT * FROM invoice_alert_schedule
            WHERE status='PENDING' AND scheduled_date <= NOW() LIMIT 100
        """)).mappings().all()

        fired, failed = 0, 0
        for r in rows:
            try:
                client = db.execute(text("SELECT * FROM invoice_client_config WHERE client_id=:cid"),
                                    {"cid": r["client_id"]}).mappings().fetchone()
                smtp = db.execute(text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")).mappings().fetchone()
                tmpl = db.execute(text("SELECT * FROM invoice_alert_templates WHERE alert_key=:key"),
                                  {"key": r["template_key"]}).mappings().fetchone()
                if not (client and smtp and tmpl):
                    continue

                days_overdue = 0
                if r["due_date"]:
                    try:
                        dd = r["due_date"]
                        if isinstance(dd, str):
                            dd = datetime.strptime(dd, "%Y-%m-%d").date()
                        days_overdue = (datetime.now().date() - dd).days
                    except Exception: pass

                ctx = {"client_name": client["client_name"], "invoice_number": r["invoice_number"],
                       "invoice_category": r["invoice_category"] or "", "amount": r["amount"] or "",
                       "due_date": str(r["due_date"] or ""), "days_overdue": days_overdue}

                subject = tmpl["subject_template"] or ""
                body = tmpl["email_template"] or ""
                for k, v in ctx.items():
                    subject = subject.replace(f"{{{{{k}}}}}", str(v or ""))
                    body = body.replace(f"{{{{{k}}}}}", str(v or ""))

                msg = MIMEMultipart()
                msg["From"] = smtp["sender_email"]
                msg["To"] = client["to_email"]
                if client["cc_email"]:
                    msg["Cc"] = client["cc_email"]
                msg["Subject"] = subject
                msg.attach(MIMEText(body, "plain"))

                recipients = [client["to_email"]]
                if client["cc_email"]:
                    recipients += [e.strip() for e in client["cc_email"].split(",") if e.strip()]

                server = smtplib.SMTP(smtp["host"], smtp["port"], timeout=30)
                if smtp["use_tls"]:
                    server.starttls()
                server.login(smtp["username"], smtp["password"])
                server.sendmail(smtp["sender_email"], recipients, msg.as_string())
                server.quit()

                db.execute(text("UPDATE invoice_alert_schedule SET status='SENT', sent_at=NOW() WHERE id=:id"),
                           {"id": r["id"]})
                db.commit()
                fired += 1
            except Exception as e:
                logger.error(f"Alert fire failed id={r['id']}: {e}")
                db.execute(text("UPDATE invoice_alert_schedule SET status='FAILED', error_msg=:e WHERE id=:id"),
                           {"id": r["id"], "e": str(e)})
                db.commit()
                failed += 1

        return {"status": "success", "fired": fired, "failed": failed, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    