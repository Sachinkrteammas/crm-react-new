import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

def send_email(to_email, subject, html_content):
    sender = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT"))

    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))

    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)
