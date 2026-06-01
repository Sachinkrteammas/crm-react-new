import requests
import json
import os
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db2
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


# ---------------- CREATE LOG FOLDER ----------------

os.makedirs("logs", exist_ok=True)

# ---------------- LOG FILE PATH ----------------

LOG_FILE = os.path.join("logs", "salesforce_leads.log")

# ---------------- CUSTOM LOGGER ----------------

logger = logging.getLogger("salesforce_logger")

logger.setLevel(logging.INFO)

# Prevent duplicate logs
logger.propagate = False

# ---------------- FILE HANDLER ----------------

file_handler = logging.FileHandler(
    LOG_FILE,
    encoding="utf-8"
)

file_handler.setLevel(logging.INFO)

# ---------------- FORMATTER ----------------

formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s"
)

file_handler.setFormatter(formatter)

# ---------------- ADD HANDLER ----------------

if not logger.handlers:
    logger.addHandler(file_handler)




# ---------------- SALESFORCE TOKEN API ----------------

CLIENT_ID = os.getenv("SALESFORCE_CLIENT_ID")

CLIENT_SECRET = os.getenv("SALESFORCE_CLIENT_SECRET")

TOKEN_URL = os.getenv("SALESFORCE_TOKEN_URL")

# ---------------- LEADS API ----------------

LEADS_URL = "https://momentum-energy-1063.my.salesforce.com/services/apexrest/PushLeadToCallCenter"


def generate_access_token():

    try:

        params = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials"
        }

        response = requests.post(TOKEN_URL, params=params)

        if response.status_code != 200:
            print("Token Generation Failed")
            print(response.text)
            return None

        data = response.json()

        access_token = data.get("access_token")

        print("Access Token Generated")

        return access_token

    except Exception as e:
        print("Error generating token:", str(e))
        return None


# ---------------- SAVE LEAD ----------------

def save_lead_to_vicidial(db2: Session, lead):

    try:
        # -------- LOG EACH LEAD --------

        logger.info(
            "LEAD RECEIVED:\n" +
            json.dumps(lead, indent=4)
        )

        salesforce_id = lead.get("SalesforceId", "").strip()

        # ---------------- DUPLICATE CHECK ----------------

        check_query = text("""
            SELECT lead_id
            FROM vicidial_list
            WHERE source_id = :source_id
            LIMIT 1
        """)

        existing = db2.execute(
            check_query,
            {
                "source_id": salesforce_id
            }
        ).fetchone()

        if existing:
            logger.warning(
                f"Duplicate Lead Skipped | SalesforceId: {salesforce_id}"
            )
            
            return

        # ---------------- PHONE NUMBER ----------------

        phone = lead.get("Phone") or ""

        # Keep only digits
        phone = ''.join(filter(str.isdigit, phone))

        # Keep last 10 digits
        if len(phone) >= 10:
            phone = phone[-10:]

        # ---------------- INSERT QUERY ----------------

        insert_query = text("""
            INSERT INTO vicidial_list
            (
                entry_date,
                status,
                source_id,
                list_id,
                gmt_offset_now,
                called_since_last_reset,
                phone_code,
                phone_number,
                first_name,
                last_name,
                address1,
                address2,
                city,
                state,
                postal_code,
                country_code,
                email,
                comments
            )
            VALUES
            (
                NOW(),
                'NEW',
                :source_id,
                3333333,
                '5.50',
                'N',
                '1',
                :phone_number,
                :first_name,
                :last_name,
                :address1,
                :address2,
                :city,
                :state,
                :postal_code,
                :country_code,
                :email,
                :comments
            )
        """)

        db2.execute(
            insert_query,
            {
                "source_id": salesforce_id,
                "phone_number": phone,
                "first_name": lead.get("FirstName", ""),
                "last_name": lead.get("LastName", ""),
                "address1": lead.get("ExpectedCapacity", ""),
                "address2": lead.get("Company", ""),
                "city": lead.get("City", ""),
                "state": lead.get("State", ""),
                "postal_code": lead.get("PostalCode", ""),
                "country_code": lead.get("Region", ""),
                "email": lead.get("Email", ""),
                "comments": lead.get("Description", "")
            }
        )

        db2.commit()

        logger.info(
            f"Lead Saved Successfully | SalesforceId: {salesforce_id}"
        )

    except Exception as e:

        db2.rollback()

        logger.exception(
            f"DB Save Error | SalesforceId: {lead.get('SalesforceId', '')} | Error: {str(e)}"
        )


# ---------------- PULL SALESFORCE LEADS ----------------

def pull_salesforce_leads():

    db2 = next(get_db2())

    try:
        logger.info("Starting Salesforce Lead Pull Process")

        # STEP 1 → Generate Access Token
        access_token = generate_access_token()

        if not access_token:
            logger.error("Access Token Not Generated")
            return

        # STEP 2 → Headers
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        # Current Date
        current_date = datetime.now().strftime("%Y-%m-%d")

        # STEP 3 → Payload
        payload = {
            "CREATED_DATE_FROM": current_date,
            "CREATED_DATE_TO": current_date
        }

        # STEP 4 → API CALL
        response = requests.post(
            LEADS_URL,
            headers=headers,
            json=payload
        )

        logger.info(
            "LEADS API FULL RESPONSE:\n" +
            response.text
        )

        if response.status_code != 200:
            logger.error(
                f"Lead API Failed | Status: {response.status_code}"
            )
            return

        data = response.json()

        logger.info(
            "LEADS API JSON DATA:\n" +
            json.dumps(data, indent=4)
        )

        leads = data.get("leads", [])

        logger.info(
            f"Total Leads Received: {len(leads)}"
        )

        # STEP 5 → SAVE LEADS
        for lead in leads:

            save_lead_to_vicidial(
                db2=db2,
                lead=lead
            )
        logger.info("Salesforce Lead Pull Completed")

    except Exception as e:
        logger.exception(
            f"Error pulling Salesforce leads: {str(e)}"
        )

    finally:
        db2.close()