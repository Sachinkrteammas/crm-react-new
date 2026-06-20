# Crm_Backend/cdr_webhook.py

from fastapi import APIRouter, HTTPException, Depends, Body, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4
from datetime import datetime, time, date
from pydantic import BaseModel
from typing import Optional, Any
import logging
import os
import json


router = APIRouter(
    prefix="/api/webhook",
    tags=["CDR Webhook"]
)


# =========================
# LOG FILE SETUP
# =========================


LOG_FOLDER = "logs"

if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)

logger = logging.getLogger("cdr_webhook_logger")

logger.setLevel(logging.INFO)

file_handler = logging.FileHandler(
    f"{LOG_FOLDER}/cdr_webhook.log"
)

formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s"
)

file_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(file_handler)


# =========================
# REQUEST MODEL
# =========================

class CDRWebhookRequest(BaseModel):
    client_id: Optional[str] = None
    date_time: Optional[str] = None
    call_uuid: Optional[str] = None
    customer_name: Optional[str] = None
    customer_number: Optional[str] = None
    contact_unique_id: Optional[str] = None
    did_clid: Optional[str] = None
    created_on: Optional[str] = None
    campaign_name: Optional[str] = None
    queue_name: Optional[str] = None
    list_name: Optional[str] = None
    call_direction: Optional[str] = None
    call_status: Optional[str] = None
    agent_name: Optional[str] = None
    agent_username: Optional[str] = None
    agent_number: Optional[str] = None
    abandoned_on_agents: Optional[str] = None
    customer_call_setup_time: Optional[int] = None
    duration: Optional[str] = None
    total_call_duration: Optional[str] = None
    wrapup_time: Optional[str] = None
    total_hold_time: Optional[str] = None
    hold_time_detail: Optional[str] = None
    total_mute_time: Optional[str] = None
    mute_time_detail: Optional[str] = None
    agent_ringing_time: Optional[str] = None
    hangup_cause: Optional[str] = None
    hangup_cause_code: Optional[str] = None
    call_type: Optional[str] = None
    disposition: Optional[str] = None
    sub_disposition_1: Optional[str] = None
    sub_disposition_2: Optional[str] = None
    sub_disposition_3: Optional[str] = None
    sub_disposition_4: Optional[str] = None
    sub_disposition_5: Optional[str] = None
    call_back_disposition: Optional[str] = None
    custom_field_data: Optional[Any] = None
    remark: Optional[str] = None
    recording: Optional[str] = None
    disconnected_by: Optional[str] = None
    queue_wait_time: Optional[str] = None
    dtmfs: Optional[str] = None

    class Config:
        extra = "allow"


# =========================
# HELPERS
# =========================

def parse_datetime(value):
    if not value:
        return None

    try:
        return datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
    except:
        return None


def parse_time(value):
    if not value:
        return None

    try:
        parts = str(value).split(":")

        if len(parts) == 3:
            return time(
                hour=int(parts[0]),
                minute=int(parts[1]),
                second=int(parts[2])
            )
    except:
        return None

    return None


# =========================
# WEBHOOK API
# =========================

@router.post("/cdr")
async def save_cdr(
    payload: CDRWebhookRequest = Body(...)
    ,
    db: Session = Depends(get_db4)
):

    try:

        data = payload.dict()

        # =========================
        # REQUEST LOG
        # =========================

        logger.info(f"Webhook Request: {json.dumps(data)}")

        query = text("""
            INSERT INTO cdr_webhook_logs (
                client_id,
                date_time,
                call_uuid,
                customer_name,
                customer_number,
                contact_unique_id,
                did_clid,
                created_on,
                campaign_name,
                queue_name,
                list_name,
                call_direction,
                call_status,
                agent_name,
                agent_username,
                agent_number,
                abandoned_on_agents,
                customer_call_setup_time,
                duration,
                total_call_duration,
                wrapup_time,
                total_hold_time,
                hold_time_detail,
                total_mute_time,
                mute_time_detail,
                agent_ringing_time,
                hangup_cause,
                hangup_cause_code,
                call_type,
                disposition,
                sub_disposition_1,
                sub_disposition_2,
                sub_disposition_3,
                sub_disposition_4,
                sub_disposition_5,
                call_back_disposition,
                custom_field_data,
                remark,
                recording,
                disconnected_by,
                queue_wait_time,
                dtmfs
            )
            VALUES (
                :client_id,
                :date_time,
                :call_uuid,
                :customer_name,
                :customer_number,
                :contact_unique_id,
                :did_clid,
                :created_on,
                :campaign_name,
                :queue_name,
                :list_name,
                :call_direction,
                :call_status,
                :agent_name,
                :agent_username,
                :agent_number,
                :abandoned_on_agents,
                :customer_call_setup_time,
                :duration,
                :total_call_duration,
                :wrapup_time,
                :total_hold_time,
                :hold_time_detail,
                :total_mute_time,
                :mute_time_detail,
                :agent_ringing_time,
                :hangup_cause,
                :hangup_cause_code,
                :call_type,
                :disposition,
                :sub_disposition_1,
                :sub_disposition_2,
                :sub_disposition_3,
                :sub_disposition_4,
                :sub_disposition_5,
                :call_back_disposition,
                :custom_field_data,
                :remark,
                :recording,
                :disconnected_by,
                :queue_wait_time,
                :dtmfs
            )
        """)

        call_details = data.get("call_details", {})
        customer_details = data.get("customer_details", {})
        agent_details = data.get("agent_details", [])

        agent = agent_details[0] if agent_details else {}

        values = {

            "client_id":
                data.get("client_id")
                or call_details.get("sme_id"),

            "date_time":
                parse_datetime(
                    data.get("date_time")
                    or call_details.get("start_date_time")
                ),

            "call_uuid":
                data.get("call_uuid")
                or call_details.get("session_id"),

            "customer_name":
                data.get("customer_name")
                or customer_details.get("customer_name"),

            "customer_number":
                data.get("customer_number")
                or customer_details.get("customer_number"),

            "contact_unique_id":
                data.get("contact_unique_id")
                or call_details.get("session_id"),

            "did_clid":
                data.get("did_clid")
                or call_details.get("longcode"),

            "created_on":
                parse_datetime(
                    data.get("created_on")
                    or call_details.get("start_date_time")
                ),

            "campaign_name":
                data.get("campaign_name")
                or call_details.get("flow_name"),

            "queue_name":
                data.get("queue_name")
                or call_details.get("queue_name"),

            "list_name":
                data.get("list_name"),

            "call_direction":
                data.get("call_direction")
                or call_details.get("call_direction"),

            "call_status":
                data.get("call_status")
                or customer_details.get("call_status")
                or call_details.get("overall_call_status"),

            "agent_name":
                data.get("agent_name")
                or agent.get("agent_name"),

            "agent_username":
                data.get("agent_username")
                or agent.get("agent_email"),

            "agent_number":
                data.get("agent_number")
                or agent.get("agent_mobile"),

            "abandoned_on_agents":
                data.get("abandoned_on_agents"),

            "customer_call_setup_time":
                data.get("customer_call_setup_time")
                or call_details.get("ringing_duration"),

            "duration":
                parse_time(data.get("duration"))
                if data.get("duration")
                else None,

            "total_call_duration":
                parse_time(data.get("total_call_duration"))
                if data.get("total_call_duration")
                else None,

            "wrapup_time":
                parse_time(data.get("wrapup_time"))
                if data.get("wrapup_time")
                else None,

            "total_hold_time":
                parse_time(data.get("total_hold_time"))
                if data.get("total_hold_time")
                else None,

            "hold_time_detail":
                parse_time(data.get("hold_time_detail"))
                if data.get("hold_time_detail")
                else None,

            "total_mute_time":
                parse_time(data.get("total_mute_time"))
                if data.get("total_mute_time")
                else None,

            "mute_time_detail":
                parse_time(data.get("mute_time_detail"))
                if data.get("mute_time_detail")
                else None,

            "agent_ringing_time":
                parse_time(data.get("agent_ringing_time"))
                if data.get("agent_ringing_time")
                else None,

            "hangup_cause":
                data.get("hangup_cause"),

            "hangup_cause_code":
                data.get("hangup_cause_code"),

            "call_type":
                data.get("call_type")
                or call_details.get("call_direction"),

            "disposition":
                data.get("disposition")
                or call_details.get("dispositions"),

            "sub_disposition_1":
                data.get("sub_disposition_1"),

            "sub_disposition_2":
                data.get("sub_disposition_2"),

            "sub_disposition_3":
                data.get("sub_disposition_3"),

            "sub_disposition_4":
                data.get("sub_disposition_4"),

            "sub_disposition_5":
                data.get("sub_disposition_5"),

            "call_back_disposition":
                data.get("call_back_disposition"),

            "custom_field_data":
                json.dumps(data),

            "remark":
                data.get("remark")
                or call_details.get("remarks"),

            "recording":
                data.get("recording")
                or call_details.get("recording_path")
                or customer_details.get("recording_path"),

            "disconnected_by":
                data.get("disconnected_by")
                or call_details.get("disconnected_by"),

            "queue_wait_time":
                parse_time(data.get("queue_wait_time"))
                if data.get("queue_wait_time")
                else None,

            "dtmfs":
                data.get("dtmfs"),
        }

        db.execute(query, values)
        db.commit()

        logger.info(
            f"CDR Saved Successfully | UUID: {data.get('call_uuid')}"
        )

        return {
            "status": True,
            "message": "CDR saved successfully",
            "received_data": data
        }

    except Exception as e:

        db.rollback()

        logger.error(f"Webhook Error: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


################################# C2p Report ########################
@router.get("/c2p_cdr_queues")
def c2p_cdr_queues(
    db: Session = Depends(get_db4)
):
    try:

        query = text("""
            SELECT DISTINCT queue_name
            FROM cdr_webhook_logs
            WHERE queue_name IS NOT NULL
              AND queue_name != ''
            ORDER BY queue_name
        """)

        result = db.execute(query).fetchall()

        #queue_names = [row[0] for row in result]
        queue_names = sorted({
            row[0].strip()
            for row in result
            if row[0]
               and row[0].strip()
               and row[0].strip().lower() != "null"
        })

        return {
            "status": True,
            "total": len(queue_names),
            "queues": queue_names
        }

    except Exception as e:
        return {
            "status": False,
            "message": str(e)
        }


# =====================================================
# API 2 : Get Records Using Date Filter + Queue Name
# =====================================================

@router.get("/c2p_cdr")
def c2p_cdr(
    start_date: date = Query(...),
    end_date: date = Query(...),
    queue_name: str = Query(None),
    db: Session = Depends(get_db4)
):
    try:

        base_query = """
            SELECT
                customer_name,
                customer_number,
                did_clid,
                created_on,
                queue_name,
                call_direction,
                call_status,
                call_type,
                agent_name,
                agent_username,
                agent_number,
                customer_call_setup_time,
                recording
            FROM cdr_webhook_logs
            WHERE DATE(date_time) BETWEEN :start_date AND :end_date
        """

        params = {
            "start_date": start_date,
            "end_date": end_date
        }

        if queue_name:
            base_query += " AND queue_name = :queue_name"
            params["queue_name"] = queue_name

        base_query += " ORDER BY date_time DESC"

        query = text(base_query)

        records = db.execute(query, params).mappings().all()

        return {
            "status": True,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "queue_name": queue_name,
            "total_records": len(records),
            "data": records
        }

    except Exception as e:
        return {
            "status": False,
            "message": str(e)
        }