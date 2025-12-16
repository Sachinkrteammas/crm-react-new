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
