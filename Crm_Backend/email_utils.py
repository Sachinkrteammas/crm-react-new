import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv
from email.message import EmailMessage
import time
from logger import logger

load_dotenv()

def send_email(to_emails, subject, html_content, cc_emails=None):
    sender = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT"))

    msg = MIMEMultipart()
    msg["From"] = sender

    if isinstance(to_emails, list):
        msg["To"] = ", ".join(to_emails)
    else:
        msg["To"] = to_emails
        to_emails = [to_emails]

    if cc_emails:
        if isinstance(cc_emails, list):
            msg["Cc"] = ", ".join(cc_emails)
        else:
            msg["Cc"] = cc_emails
            cc_emails = [cc_emails]
    else:
        cc_emails = []

    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))

    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(sender, password)

        all_recipients = to_emails + cc_emails
        server.sendmail(sender, all_recipients, msg.as_string())



def send_reset_password_email(to_email: str, reset_link: str):
    subject = "Reset Your Password"

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <h3>Password Reset Request</h3>
            <p>We received a request to reset your password.</p>

            <p>
                <a href="{reset_link}"
                   style="
                        background-color: #0d6efd;
                        color: #ffffff;
                        padding: 10px 16px;
                        text-decoration: none;
                        border-radius: 4px;
                        display: inline-block;
                   ">
                   Reset Password
                </a>
            </p>

            <p>This link will expire in <b>15 minutes</b>.</p>

            <p>If you did not request this, please ignore this email.</p>

            <br>
            <p style="font-size: 12px; color: #666;">
                This is an automated email. Please do not reply.
            </p>
        </body>
    </html>
    """

    send_email(
        to_emails=to_email,
        subject=subject,
        html_content=html_content
    )





def normalize_emails(emails):
    if not emails:
        return []

    if isinstance(emails, list):
        return [e.strip() for e in emails if e.strip()]

    # if string like "a@gmail.com,b@gmail.com"
    return [e.strip() for e in emails.split(",") if e.strip()]


def send_email_with_excel(
    to_email,
    subject,
    body,
    excel_stream=None,
    filename=None,
    cc_emails=None
):
    sender = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT"))

    try:
        msg = EmailMessage()
        msg["From"] = sender
        msg["Subject"] = subject

        # Normalize emails
        to_list = normalize_emails(to_email)
        cc_list = normalize_emails(cc_emails)

        msg["To"] = ", ".join(to_list)

        if cc_list:
            msg["Cc"] = ", ".join(cc_list)

        # Email body
        msg.add_alternative(body, subtype="html")

        # ✅ Attach Excel ONLY if provided
        if excel_stream and filename:
            excel_stream.seek(0)
            msg.add_attachment(
                excel_stream.read(),
                maintype="application",
                subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                filename=filename
            )

        recipients = to_list + cc_list

        smtp_start = time.time()

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            logger.info(f"SMTP CONNECT: {time.time() - smtp_start}")
            server.starttls()
            logger.info(f"TLS DONE: {time.time() - smtp_start}")
            server.login(sender, password)
            logger.info(f"LOGIN DONE: {time.time() - smtp_start}")
            server.send_message(msg, from_addr=sender, to_addrs=recipients)
            logger.info(f"SEND DONE: {time.time() - smtp_start}")

        print(f"Email sent successfully to {recipients}")

    except Exception as e:
        print(f"Error sending email: {str(e)}")