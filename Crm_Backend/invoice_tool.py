# Crm_Backend/invoice_tool.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4  # 🔥 local test DB
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import smtplib
import os
import shutil
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from logger import logger
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# ---------------------------------------------------------
# UPLOAD FOLDER
# ---------------------------------------------------------
INVOICE_UPLOAD_DIR = os.path.join("uploads", "invoices")
os.makedirs(INVOICE_UPLOAD_DIR, exist_ok=True)


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
    subject: Optional[str] = "Invoice from DialDesk"
    email_template: Optional[str] = "Dear Client,\n\nPlease find the attached invoice.\n\nRegards,\nTeam"
    invoice_type: Optional[str] = "Monthly"


# =========================================================
# 🔥 AUTO-SEED SMTP FROM ENV (only if table is empty)
# =========================================================
def seed_smtp_from_env_if_empty(db: Session):
    """
    If invoice_smtp_settings table is empty, seed it once from .env.
    After first seed, DB becomes source of truth.
    """
    try:
        existing = db.execute(
            text("SELECT id FROM invoice_smtp_settings LIMIT 1")
        ).fetchone()

        if existing:
            return  # already configured — don't overwrite

        host = os.getenv("INVOICE_SMTP_HOST")
        port = os.getenv("INVOICE_SMTP_PORT")
        user = os.getenv("INVOICE_SMTP_USER")
        password = os.getenv("INVOICE_SMTP_PASSWORD")
        sender = os.getenv("INVOICE_SMTP_SENDER")
        use_tls = os.getenv("INVOICE_SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

        if not all([host, port, user, password, sender]):
            logger.warning("Invoice SMTP env vars incomplete — skipping auto-seed")
            return

        db.execute(text("""
            INSERT INTO invoice_smtp_settings
                (host, port, username, password, sender_email, use_tls)
            VALUES
                (:host, :port, :username, :password, :sender_email, :use_tls)
        """), {
            "host": host,
            "port": int(port),
            "username": user,
            "password": password,
            "sender_email": sender,
            "use_tls": 1 if use_tls else 0,
        })
        db.commit()
        logger.info("✅ Invoice SMTP settings auto-seeded from .env (first time)")
    except Exception as e:
        logger.error(f"SMTP auto-seed failed: {e}")


# =========================================================
# 1. SMTP SETTINGS — GET / POST / TEST
# =========================================================
@router.get("/smtp-settings", tags=["Invoice Tool"])
def get_smtp_settings(db: Session = Depends(get_db4)):
    # 🔥 Auto-seed on first call if table is empty
    seed_smtp_from_env_if_empty(db)

    row = db.execute(
        text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")
    ).mappings().fetchone()

    if not row:
        return {"configured": False, "data": None}

    data = dict(row)
    data["password"] = "********"  # mask password
    return {"configured": True, "data": data}


@router.post("/smtp-settings", tags=["Invoice Tool"])
def save_smtp_settings(body: SMTPSettingsBody, db: Session = Depends(get_db4)):
    existing = db.execute(
        text("SELECT * FROM invoice_smtp_settings LIMIT 1")
    ).mappings().fetchone()

    # 🔥 Handle password preservation
    incoming_password = body.password
    if existing and incoming_password in ("__KEEP_EXISTING__", "", "********"):
        final_password = existing["password"]
    else:
        final_password = incoming_password

    if existing:
        db.execute(text("""
            UPDATE invoice_smtp_settings
            SET host=:host, port=:port, username=:username,
                password=:password, sender_email=:sender_email, use_tls=:use_tls
            WHERE id=:id
        """), {
            "host": body.host,
            "port": body.port,
            "username": body.username,
            "password": final_password,
            "sender_email": body.sender_email,
            "use_tls": 1 if body.use_tls else 0,
            "id": existing["id"],
        })
    else:
        db.execute(text("""
            INSERT INTO invoice_smtp_settings
                (host, port, username, password, sender_email, use_tls)
            VALUES
                (:host, :port, :username, :password, :sender_email, :use_tls)
        """), {
            "host": body.host,
            "port": body.port,
            "username": body.username,
            "password": final_password,
            "sender_email": body.sender_email,
            "use_tls": 1 if body.use_tls else 0,
        })

    db.commit()
    return {"status": "success", "message": "SMTP settings saved"}


@router.post("/smtp-settings/test", tags=["Invoice Tool"])
def test_smtp(db: Session = Depends(get_db4)):
    smtp = db.execute(
        text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")
    ).mappings().fetchone()

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
# 2. CLIENT CONFIG — GET / POST / DELETE
# =========================================================
@router.get("/clients", tags=["Invoice Tool"])
def list_clients(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT id, client_id, client_name, to_email, cc_email, subject, invoice_type
        FROM invoice_client_config
        ORDER BY client_name ASC
    """)).mappings().all()
    return {"data": [dict(r) for r in rows]}


@router.get("/client/{client_id}", tags=["Invoice Tool"])
def get_client(client_id: int, db: Session = Depends(get_db4)):
    row = db.execute(text("""
        SELECT * FROM invoice_client_config WHERE client_id = :cid
    """), {"cid": client_id}).mappings().fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Client config not found")
    return {"data": dict(row)}


@router.post("/client", tags=["Invoice Tool"])
def save_client(body: ClientConfigBody, db: Session = Depends(get_db4)):
    existing = db.execute(text("""
        SELECT id FROM invoice_client_config WHERE client_id = :cid
    """), {"cid": body.client_id}).fetchone()

    if existing:
        db.execute(text("""
            UPDATE invoice_client_config
            SET client_name=:client_name, to_email=:to_email, cc_email=:cc_email,
                subject=:subject, email_template=:email_template, invoice_type=:invoice_type
            WHERE client_id=:client_id
        """), body.model_dump())
    else:
        db.execute(text("""
            INSERT INTO invoice_client_config
                (client_id, client_name, to_email, cc_email, subject, email_template, invoice_type)
            VALUES
                (:client_id, :client_name, :to_email, :cc_email, :subject, :email_template, :invoice_type)
        """), body.model_dump())

    db.commit()
    return {"status": "success", "message": "Client config saved"}


@router.delete("/client/{client_id}", tags=["Invoice Tool"])
def delete_client(client_id: int, db: Session = Depends(get_db4)):
    db.execute(
        text("DELETE FROM invoice_client_config WHERE client_id = :cid"),
        {"cid": client_id},
    )
    db.commit()
    return {"status": "success", "message": "Client config deleted"}


# =========================================================
# 3. SEND INVOICE (Upload + Email)
# =========================================================
@router.post("/send-invoice", tags=["Invoice Tool"])
async def send_invoice(
    client_id: int = Form(...),
    invoice_type: str = Form("Monthly"),
    remarks: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db4),
):
    client = db.execute(text("""
        SELECT * FROM invoice_client_config WHERE client_id = :cid
    """), {"cid": client_id}).mappings().fetchone()

    if not client:
        raise HTTPException(status_code=404, detail="Client not configured. Please configure first.")

    smtp = db.execute(
        text("SELECT * FROM invoice_smtp_settings ORDER BY id DESC LIMIT 1")
    ).mappings().fetchone()

    if not smtp:
        raise HTTPException(status_code=400, detail="SMTP not configured. Please configure SMTP first.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{client_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(INVOICE_UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

    try:
        msg = MIMEMultipart()
        msg["From"] = smtp["sender_email"]
        msg["To"] = client["to_email"]
        if client["cc_email"]:
            msg["Cc"] = client["cc_email"]
        msg["Subject"] = client["subject"] or "Invoice"

        body_text = client["email_template"] or "Please find attached invoice."
        body_text = body_text.replace("{client_name}", client["client_name"])
        body_text = body_text.replace("{invoice_type}", invoice_type)
        body_text = body_text.replace("{remarks}", remarks)

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
                (client_id, to_email, cc_email, file_name, file_path, status)
            VALUES
                (:client_id, :to_email, :cc_email, :file_name, :file_path, :status)
        """), {
            "client_id": client_id,
            "to_email": client["to_email"],
            "cc_email": client["cc_email"],
            "file_name": file.filename,
            "file_path": file_path,
            "status": "SENT",
        })
        db.commit()

        logger.info(f"Invoice sent → client_id={client_id} → {client['to_email']}")
        return {
            "status": "success",
            "message": f"Invoice sent to {client['to_email']}",
            "file": safe_name,
        }

    except Exception as e:
        try:
            db.execute(text("""
                INSERT INTO invoice_send_log
                    (client_id, to_email, cc_email, file_name, file_path, status, error_msg)
                VALUES
                    (:client_id, :to_email, :cc_email, :file_name, :file_path, :status, :error_msg)
            """), {
                "client_id": client_id,
                "to_email": client["to_email"],
                "cc_email": client["cc_email"],
                "file_name": file.filename,
                "file_path": file_path,
                "status": "FAILED",
                "error_msg": str(e),
            })
            db.commit()
        except Exception:
            pass

        logger.error(f"Invoice send failed → client_id={client_id} → {str(e)}")
        raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")


# =========================================================
# 4. SEND LOG (history)
# =========================================================
@router.get("/logs", tags=["Invoice Tool"])
def get_logs(limit: int = 100, db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT * FROM invoice_send_log ORDER BY sent_at DESC LIMIT :lim
    """), {"lim": limit}).mappings().all()
    return {"data": [dict(r) for r in rows]}