from email.mime.base import MIMEBase
from email import encoders
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
import os
from dotenv import load_dotenv
from io import BytesIO

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "CRM Report Bot")
EMAIL_RECEIVER = os.getenv("EMAIL_RECEIVER")


def send_sla_report_email(excel_stream: BytesIO, to_email=EMAIL_RECEIVER, subject="Daily SLA Report"):
    try:
        msg = MIMEMultipart()
        msg["From"] = f"{EMAIL_FROM_NAME} <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        body = "Hello,\n\nPlease find attached today's SLA Report.\n\nRegards,\nCRM Bot"
        msg.attach(MIMEText(body, "plain"))

        excel_stream.seek(0)
        part = MIMEBase(
            "application",
            "vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        part.set_payload(excel_stream.read())
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            "attachment; filename=sla_report.xlsx"
        )
        msg.attach(part)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)

        print(f"✅ SLA report sent to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send SLA email: {e}")
