from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4, get_db2
import json
import requests

router = APIRouter()

# ---------------------------------------------
# SMS Configuration
# ---------------------------------------------
SMS_CONFIG = {
    "FABONOW": {
        "template_id": "1707178211044395154",
        "message": (
            "Thank you for connecting with Fabo Laundry & Services. "
            "Your booking is not yet complete. "
            "To schedule your pickup, visit www.fabonow.com "
            "or connect with us on WhatsApp at +91 8977005508. Ispark"
        )
    },
    "PRISTINO": {
        "template_id": "1707178211041542150",
        "message": (
            "Thank you for connecting with Pristino Laundry & Services. "
            "Your booking is not yet complete. "
            "To schedule your pickup, visit www.thepristino.com "
            "or connect with us on WhatsApp at +91 8106047373. Ispark"
        )
    }
}



def send_sms(phone: str, message: str, template_id: str):
    try:
        # ---- Normalize mobile number (same as PHP) ----
        phone = str(phone)
        phone = phone[-10:]  # last 10 digits

        if len(phone) < 11:
            phone = "91" + phone

        payload = {
            "username": "mascallnet.trans",
            "password": "COjap",
            "unicode": "False",
            "from": "Ispark",
            "to": phone,
            "dltContentId": template_id,
            "text": message
        }



        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        response = requests.post(
            "https://api.smartping.ai/fe/api/v1/send",
            data=payload,
            headers=headers,
            timeout=10
        )
        

        # API usually returns text / JSON
        response_text = response.text

        # ---- Decide success ----
        if response.status_code == 200:
            return {
                "status": "success",
                "response": response_text
            }
        else:
            return {
                "status": "failed",
                "http_status": response.status_code,
                "response": response_text
            }

    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }








# ---------------------------------------------
# Identify client from campaign
# ---------------------------------------------
# def get_client(campaign_id: str):

#     if not campaign_id:
#         return None

#     campaign = campaign_id.upper()

#     if "FABO" in campaign:
#         return "FABONOW"

#     if "PRISTINO" in campaign:
#         return "PRISTINO"

#     return None


def get_client(campaign_id: str):
    if not campaign_id:
        return None

    campaign = campaign_id.strip().upper()

    # Fabonow Campaigns
    fabonow_campaigns = {
        "FABON000",
        "FABOE000",
        "FABOIN0000",
        "FABONOW0000",
        "FABOINBOUNDOB000",
        "FABOOBH000",
        "FABOOBF0000",
        "FABOOBP000"
    }

    # Pristino Campaigns
    pristino_campaigns = {
        "FaboPristino00001",
        "FABOPRISTINO00001"
    }

    if campaign in fabonow_campaigns:
        return "FABONOW"

    if campaign in pristino_campaigns:
        return "PRISTINO"

    return None



# ---------------------------------------------
# API
# ---------------------------------------------
@router.get("/run")
def abandoned_call_sms(db: Session = Depends(get_db4), db2: Session = Depends(get_db2)):

    # Fetch abandoned calls
    query = text("""
        SELECT
            uniqueid,
            phone_number,
            campaign_id,
            call_date
        FROM vicidial_closer_log
        WHERE user='VDCL'
        ORDER BY call_date DESC
    """)

    calls = db2.execute(query).mappings().all()

    total_sms = 0
    response_list = []

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

        client = get_client(call["campaign_id"])

        if not client:
            continue

        sms_data = SMS_CONFIG[client]

        sms_response = send_sms(
            phone=call["phone_number"],
            message=sms_data["message"],
            template_id=sms_data["template_id"]
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
            "uniqueid": call["uniqueid"],
            "phone": call["phone_number"],
            "campaign": call["campaign_id"],
            "client": client,
            "sms_response": sms_response
        })

    db.commit()

    return {
        "status": "success",
        "sms_sent": total_sms,
        "details": response_list
    }












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