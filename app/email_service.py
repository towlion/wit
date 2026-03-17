import datetime
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from app.models import EmailLog, User

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "")
SMTP_TLS = os.environ.get("SMTP_TLS", "true").lower() in ("true", "1", "yes")


def should_send_email(
    db: Session, user_id: int, work_item_id: int | None, event_type: str
) -> bool:
    user = db.get(User, user_id)
    if not user or not user.email_notifications:
        return False
    if not SMTP_HOST:
        return False
    if work_item_id:
        one_hour_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)
        recent = (
            db.query(EmailLog)
            .filter(
                EmailLog.user_id == user_id,
                EmailLog.work_item_id == work_item_id,
                EmailLog.sent_at >= one_hour_ago,
            )
            .first()
        )
        if recent:
            return False
    return True


def send_notification_email(
    db: Session,
    user: User,
    work_item_id: int | None,
    event_type: str,
    title: str,
    detail: str,
):
    if not SMTP_HOST:
        return

    html = f"""\
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #1a1a2e;">WIT Notification</h2>
  </div>
  <h3 style="margin: 0 0 8px 0; color: #1a1a2e;">{title}</h3>
  <p style="color: #495057; line-height: 1.5;">{detail}</p>
  <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;" />
  <p style="font-size: 12px; color: #868e96;">
    You received this because you have email notifications enabled in WIT.
  </p>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[WIT] {title}"
    msg["From"] = SMTP_FROM
    msg["To"] = user.email
    msg.attach(MIMEText(detail, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        if SMTP_TLS:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, [user.email], msg.as_string())
        server.quit()

        db.add(EmailLog(
            user_id=user.id,
            work_item_id=work_item_id,
            event_type=event_type,
        ))
        db.commit()
    except Exception as e:
        logger.warning("Failed to send email to %s: %s", user.email, e)
