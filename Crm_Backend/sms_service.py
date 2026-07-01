from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4, get_db2
import json
import requests
import re
import html
router = APIRouter()



def send_sms(phone: str, message: str, template_id: str):
    try:
        # Normalize mobile number (same as PHP)
        phone = str(phone)
        phone = phone[-10:]  # Last 10 digits

        if len(phone) < 11:
            phone = "91" + phone

        payload = {
            "username": "mascl1.trans",
            "password": "tWE7_VF@",
            "unicode": "False",
            "from": "Ispark",
            "to": phone,
            "dltContentId": template_id,
            "text": message,
            "dltPrincipalEntityId": "1001485540000016211"
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        response = requests.post(
            "https://pgapi.sparc.smartping.io/fe/api/v1/send",
            data=payload,
            headers=headers,
            timeout=10
        )

        return {
            "status": "success" if response.status_code == 200 else "failed",
            "http_status": response.status_code,
            "response": response.text
        }

    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }


# ---------------------------------------------
# API
# ---------------------------------------------

def clean_html(text: str) -> str:
    if not text:
        return ""

    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)

    # [text](url) -> text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text


@router.get("/run")
def abandoned_call_sms(
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
):

    total_sms = 0
    response_list = []

    # Get all enabled SMS configurations
    configs = db.execute(text("""
        SELECT
            client_id,
            template_id,
            template_text
        FROM alert_mechanisms
        WHERE
            alert_category='caller'
            AND alert_on='SMS'
            AND abandon=1
    """)).mappings().all()

    for config in configs:

        client_id = config["client_id"]

        # Get campaigns for this client
        campaigns = db.execute(
            text("""
                SELECT campaignid
                FROM registration_master
                WHERE company_id=:client_id
            """),
            {"client_id": client_id}
        ).scalars().all()

        if not campaigns:
            continue

        # convert it into a Python list.
        campaign_string = campaigns[0]

        campaigns = [
            x.strip().strip("'")
            for x in campaign_string.split(",")
        ]


        placeholders = ",".join(
            f":c{i}" for i in range(len(campaigns))
        )

        params = {
            f"c{i}": campaigns[i]
            for i in range(len(campaigns))
        }


        # Get abandoned calls only for this client's campaigns
        calls = db2.execute(
            text(f"""
                SELECT
                    uniqueid,
                    phone_number,
                    campaign_id,
                    call_date
                FROM vicidial_closer_log
                WHERE
                    user='VDCL'
                    AND campaign_id IN ({placeholders})
                    AND DATE(call_date) = CURDATE()
                ORDER BY call_date DESC
            """),
            params
        ).mappings().all()



        for call in calls:

            # Prevent duplicate SMS
            already_sent = db.execute(
                text("""
                    SELECT id
                    FROM abandoned_sms_log
                    WHERE uniqueid=:uid
                """),
                {"uid": call["uniqueid"]}
            ).first()

            if already_sent:
                continue

            message = clean_html(config["template_text"])


            sms_response = send_sms(
                phone=call["phone_number"],
                message=message,
                template_id=config["template_id"]
            )


            db.execute(
                text("""
                    INSERT INTO abandoned_sms_log
                    (
                        uniqueid,
                        phone,
                        campaign_id,
                        sms_status,
                        provider_response
                    )
                    VALUES
                    (
                        :uid,
                        :phone,
                        :campaign,
                        :status,
                        :response
                    )
                """),
                {
                    "uid": call["uniqueid"],
                    "phone": call["phone_number"],
                    "campaign": call["campaign_id"],
                    "status": 1 if sms_response["status"] == "success" else 0,
                    "response": json.dumps(sms_response)
                }
            )

            total_sms += 1

            response_list.append({
                "client_id": client_id,
                "uniqueid": call["uniqueid"],
                "phone": call["phone_number"],
                "campaign": call["campaign_id"],
                "sms_response": sms_response
            })

    db.commit()

    return {
        "status": "success",
        "sms_sent": total_sms,
        "details": response_list
    }


def run_abandoned_call_sms():
    db = next(get_db4())
    db2 = next(get_db2())

    try:
        abandoned_call_sms(db=db, db2=db2)
    finally:
        db.close()
        db2.close()


@router.get("/test-sms")
def test_sms():

    response = send_sms(
        phone="9522909496",
        message=(
            "Thank you for connecting with Fabo Laundry & Services. "
            "Your booking is not yet complete. "
            "To schedule your pickup, visit www.fabonow.com "
            "or connect with us on WhatsApp at +91 8977005508. Ispark"
        ),
        template_id="1707178211044395154"
    )

    return response