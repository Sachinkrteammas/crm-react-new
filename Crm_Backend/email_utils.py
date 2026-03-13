import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv
from email.message import EmailMessage

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
        to_email=to_email,
        subject=subject,
        html_content=html_content
    )





def send_email_with_excel(
    to_email,
    subject,
    body,
    excel_stream,
    filename,
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

        # Handle TO
        if isinstance(to_email, list):
            msg["To"] = ", ".join(to_email)
            to_list = to_email
        else:
            msg["To"] = to_email
            to_list = [to_email]

        # Handle CC
        if cc_emails:
            if isinstance(cc_emails, list):
                msg["Cc"] = ", ".join(cc_emails)
                cc_list = cc_emails
            else:
                msg["Cc"] = cc_emails
                cc_list = [cc_emails]
        else:
            cc_list = []

        # Email body (HTML supported)
        msg.add_alternative(body, subtype="html")

        # Ensure stream pointer at start
        excel_stream.seek(0)

        msg.add_attachment(
            excel_stream.read(),
            maintype="application",
            subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=filename
        )

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender, password)

            recipients = to_list + cc_list
            server.send_message(msg, from_addr=sender, to_addrs=recipients)

        print(f"Email sent successfully to {recipients}")

    except Exception as e:
        print(f"Error sending email: {str(e)}")