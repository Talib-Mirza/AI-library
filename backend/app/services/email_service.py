import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List

from app.core.config import settings


def send_email(subject: str, recipients: List[str], html_body: str) -> None:
    """Send an HTML email using SMTP credentials in settings. In dev, if SMTP is not configured, print to console."""
    if not settings.SMTP_HOST or not settings.MAIL_FROM:
        print("[DEV EMAIL] Subject:", subject)
        print("[DEV EMAIL] To:", recipients)
        print("[DEV EMAIL] Body:\n", html_body)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    msg["To"] = ", ".join(recipients)

    part_html = MIMEText(html_body, "html")
    msg.attach(part_html)

    context = ssl.create_default_context()

    if settings.SMTP_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.MAIL_FROM, recipients, msg.as_string())
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls(context=context)
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.MAIL_FROM, recipients, msg.as_string()) 