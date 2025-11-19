from fastapi import APIRouter, Query, Form, HTTPException
from datetime import datetime
from sqlalchemy import create_engine, text
from database import engine4
from pydantic import BaseModel
from typing import Optional, List
import json

router = APIRouter()

@router.post("/templates/insert")
def insert_template(
    client_id: int = Query(..., description="Client ID"),
    template_name: str = Form(...),
    template_type: str = Form(...),
    tagging: str = Form(None),
    required_fields: str = Form(None),
    template_text: str = Form(...),
):
    now = datetime.utcnow()

    def to_comma_string(value: str | None) -> str | None:
        if not value:
            return None
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return ",".join(parsed)
            elif isinstance(parsed, str):
                return parsed
        except json.JSONDecodeError:
            # already a plain string or CSV
            return value
        return value

    tagging_csv = to_comma_string(tagging)
    required_fields_csv = to_comma_string(required_fields)

    query = text("""
        INSERT INTO templates
        (client_id, template_name, template_type, tagging, required_fields, template_text,
         created_at)
        VALUES
        (:client_id, :template_name, :template_type, :tagging, :required_fields, :template_text,
         :created_at)
    """)

    with engine4.begin() as conn:
        result = conn.execute(query, {
            "client_id": client_id,
            "template_name": template_name,
            "template_type": template_type,
            "tagging": tagging_csv,
            "required_fields": required_fields_csv,
            "template_text": template_text,
            "created_at": now,
        })
        new_id = result.lastrowid

    return {"id": new_id, "message": "Template inserted successfully"}



@router.get("/templates")
def get_templates(client_id: int = Query(..., description="Client ID")):
    query = text("""
        SELECT template_name, template_text
        FROM templates
        WHERE client_id = :client_id
        ORDER BY created_at DESC
    """)

    with engine4.connect() as conn:
        result = conn.execute(query, {"client_id": client_id}).mappings().all()
        # Convert result to list of dicts
        templates = [{"template_name": row["template_name"], "template_text": row["template_text"]} for row in result]

    return {"client_id": client_id, "templates": templates}


# @router.get("/templates")
# def get_templates(client_id: int = Query(..., description="Client ID")):
#     query = text("""
#         SELECT 
#             t.template_name,
#             t.template_text,
#             am.whatsapp_api_key,
#             am.whatsapp_session_id
#         FROM templates t
#         LEFT JOIN alert_mechanisms am 
#             ON am.client_id = t.client_id 
#         WHERE t.client_id = :client_id
#         ORDER BY t.created_at DESC
#     """)

#     with engine4.connect() as conn:
#         result = conn.execute(query, {"client_id": client_id}).mappings().all()

#         # Extract templates list
#         templates = []
#         whatsapp_api_key = None
#         whatsapp_session_id = None

#         for row in result:
#             # capture WhatsApp details once
#             if whatsapp_api_key is None and row["whatsapp_api_key"]:
#                 whatsapp_api_key = row["whatsapp_api_key"]
#             if whatsapp_session_id is None and row["whatsapp_session_id"]:
#                 whatsapp_session_id = row["whatsapp_session_id"]

#             templates.append({
#                 "template_name": row["template_name"],
#                 "template_text": row["template_text"],
#             })

#     return {
#         "client_id": client_id,
#         "whatsapp_api_key": whatsapp_api_key,
#         "whatsapp_session_id": whatsapp_session_id,
#         "templates": templates,
#     }


class AlertMechanismCreate(BaseModel):
    client_id: int
    alert_category: str
    alert_on: str
    template_name: str
    template_text: str
    whatsapp_api_key: Optional[str] = None
    whatsapp_session_id: Optional[str] = None


class AlertMechanismResponse(BaseModel):
    id: int
    client_id: int
    alert_category: str
    alert_on: str
    template_name: str
    template_text: str
    whatsapp_api_key: Optional[str] = None
    whatsapp_session_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None



@router.get("/caller/alert-mechanism", response_model=List[AlertMechanismResponse])
def get_caller_alert_mechanisms(client_id: Optional[int] = None):
    try:
        with engine4.begin() as conn:
            if client_id:
                query = text("""
                    SELECT * FROM alert_mechanisms
                    WHERE alert_category = 'caller' AND client_id = :client_id
                    ORDER BY id DESC
                """)
                result = conn.execute(query, {"client_id": client_id})
            else:
                query = text("""
                    SELECT * FROM alert_mechanisms
                    WHERE alert_category = 'caller'
                    ORDER BY id DESC
                """)
                result = conn.execute(query)

            rows = [dict(row._mapping) for row in result]
            return rows

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@router.post("/caller/alert-mechanism")
def create_alert_mechanism(payload: AlertMechanismCreate):
    # Validate alert_category
    if payload.alert_category != "caller":
        raise HTTPException(status_code=400, detail="Invalid alert_category, must be 'caller'")

    insert_query = text("""
        INSERT INTO alert_mechanisms
        (client_id, alert_category, alert_on, template_name, template_text, whatsapp_api_key, whatsapp_session_id, created_at)
        VALUES (:client_id, :alert_category, :alert_on, :template_name, :template_text, :whatsapp_api_key, :whatsapp_session_id, NOW())
    """)

    try:
        with engine4.begin() as conn:
            result = conn.execute(insert_query, {
                "client_id": payload.client_id,
                "alert_category": payload.alert_category,
                "alert_on": payload.alert_on,
                "template_name": payload.template_name,
                "template_text": payload.template_text,
                "whatsapp_api_key": payload.whatsapp_api_key,
                "whatsapp_session_id": payload.whatsapp_session_id
            })

        return {
            "message": "Alert mechanism saved successfully",
            "alert_id": result.lastrowid
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")




class AlertMechanismUpdate(BaseModel):
    alert_on: Optional[str] = None
    template_name: Optional[str] = None
    template_text: Optional[str] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_session_id: Optional[str] = None


@router.put("/caller/alert-mechanism/{alert_id}")
def update_caller_alert_mechanism(alert_id: int, payload: AlertMechanismUpdate):
    try:
        update_fields = []
        params = {"alert_id": alert_id}

        if payload.alert_on:
            update_fields.append("alert_on = :alert_on")
            params["alert_on"] = payload.alert_on
        if payload.template_name:
            update_fields.append("template_name = :template_name")
            params["template_name"] = payload.template_name
        if payload.template_text:
            update_fields.append("template_text = :template_text")
            params["template_text"] = payload.template_text

        if payload.whatsapp_api_key is not None:
            update_fields.append("whatsapp_api_key = :whatsapp_api_key")
            params["whatsapp_api_key"] = payload.whatsapp_api_key

        if payload.whatsapp_session_id is not None:
            update_fields.append("whatsapp_session_id = :whatsapp_session_id")
            params["whatsapp_session_id"] = payload.whatsapp_session_id
    

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        update_query = text(f"""
            UPDATE alert_mechanisms
            SET {', '.join(update_fields)}, updated_at = NOW()
            WHERE id = :alert_id AND alert_category = 'caller'
        """)

        with engine4.begin() as conn:
            result = conn.execute(update_query, params)

            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Alert mechanism not found")

        return {"message": "Alert mechanism updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")




@router.delete("/caller/alert-mechanism/{alert_id}")
def delete_caller_alert_mechanism(alert_id: int):
    try:
        delete_query = text("""
            DELETE FROM alert_mechanisms
            WHERE id = :alert_id AND alert_category = 'caller'
        """)

        with engine4.begin() as conn:
            result = conn.execute(delete_query, {"alert_id": alert_id})

            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Alert mechanism not found")

        return {"message": "Alert mechanism deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")




class InternalAlertMechanismCreate(BaseModel):
    client_id: int
    alert_category: str
    alert_on: str
    template_name: str
    template_text: str
    scenario1: int | None = None
    scenario2: int | None = None
    scenario3: int | None = None
    scenario4: int | None = None
    scenario5: int | None = None
    person_name: str
    phone: str
    email: Optional[str] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_session_id: Optional[str] = None


class InternalAlertMechanismResponse(BaseModel):
    id: int
    client_id: int
    alert_category: str
    alert_on: str
    template_name: str
    template_text: str
    scenario1: Optional[int] = None
    scenario2: Optional[int] = None
    scenario3: Optional[int] = None
    scenario4: Optional[int] = None
    scenario5: Optional[int] = None
    person_name: str
    phone: str
    email: Optional[str] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_session_id: Optional[str] = None


class InternalAlertMechanismUpdate(BaseModel):
    alert_on: Optional[str]
    template_name: Optional[str]
    template_text: Optional[str]
    scenario1: Optional[int]
    scenario2: Optional[int]
    scenario3: Optional[int]
    scenario4: Optional[int]
    scenario5: Optional[int]
    person_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    whatsapp_api_key: Optional[str] = None
    whatsapp_session_id: Optional[str] = None



@router.get("/internal/alert-mechanism", response_model=List[InternalAlertMechanismResponse])
def get_internal_alert_mechanisms(client_id: Optional[int] = None):
    try:
        with engine4.begin() as conn:
            if client_id:
                query = text("""
                    SELECT * FROM alert_mechanisms
                    WHERE alert_category = 'internal' AND client_id = :client_id
                    ORDER BY id DESC
                """)
                result = conn.execute(query, {"client_id": client_id})
            else:
                query = text("""
                    SELECT * FROM alert_mechanisms
                    WHERE alert_category = 'internal'
                    ORDER BY id DESC
                """)
                result = conn.execute(query)

            rows = [dict(row._mapping) for row in result]
            return rows

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@router.post("/internal/alert-mechanism")
def create_internal_alert_mechanism(payload: InternalAlertMechanismCreate):
    # Validate alert_category
    if payload.alert_category != "internal":
        raise HTTPException(status_code=400, detail="Invalid alert_category, must be 'internal'")

    insert_query = text("""
        INSERT INTO alert_mechanisms
        (
            client_id, alert_category, alert_on, template_name, template_text,
            scenario1, scenario2, scenario3, scenario4, scenario5,
            person_name, phone, email, whatsapp_api_key, whatsapp_session_id, created_at
        )
        VALUES
        (
            :client_id, :alert_category, :alert_on, :template_name, :template_text,
            :scenario1, :scenario2, :scenario3, :scenario4, :scenario5,
            :person_name, :phone, :email, :whatsapp_api_key, :whatsapp_session_id, NOW()
        )
    """)

    try:
        with engine4.begin() as conn:
            result = conn.execute(insert_query, {
                "client_id": payload.client_id,
                "alert_category": payload.alert_category,
                "alert_on": payload.alert_on,
                "template_name": payload.template_name,
                "template_text": payload.template_text,
                "scenario1": payload.scenario1,
                "scenario2": payload.scenario2,
                "scenario3": payload.scenario3,
                "scenario4": payload.scenario4,
                "scenario5": payload.scenario5,
                "person_name": payload.person_name,
                "phone": payload.phone,
                "email": payload.email,
                "whatsapp_api_key": payload.whatsapp_api_key,
                "whatsapp_session_id": payload.whatsapp_session_id
            })

        return {
            "message": "Internal alert mechanism saved successfully",
            "alert_id": result.lastrowid
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@router.put("/internal/alert-mechanism/{alert_id}")
def update_internal_alert_mechanism(alert_id: int, payload: InternalAlertMechanismUpdate):
    try:
        update_fields = []
        params = {"alert_id": alert_id}

        # Dynamically add provided fields
        for field in payload.dict(exclude_unset=True):
            update_fields.append(f"{field} = :{field}")
            params[field] = getattr(payload, field)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        update_query = text(f"""
            UPDATE alert_mechanisms
            SET {', '.join(update_fields)}, updated_at = NOW()
            WHERE id = :alert_id AND alert_category = 'internal'
        """)

        with engine4.begin() as conn:
            result = conn.execute(update_query, params)
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Internal alert not found")

        return {"message": "Internal alert updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@router.delete("/internal/alert-mechanism/{alert_id}")
def delete_internal_alert_mechanism(alert_id: int):
    try:
        delete_query = text("""
            DELETE FROM alert_mechanisms
            WHERE id = :alert_id AND alert_category = 'internal'
        """)

        with engine4.begin() as conn:
            result = conn.execute(delete_query, {"alert_id": alert_id})
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Internal alert not found")

        return {"message": "Internal alert deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



class EscalationAlertMechanismCreate(BaseModel):
    client_id: int
    alert_category: str
    alert_on: str
    template_name: str
    template_text: str
    scenario1: int | None = None
    scenario2: int | None = None
    scenario3: int | None = None
    scenario4: int | None = None
    scenario5: int | None = None
    person_name: str
    phone: str
    email: Optional[str] = None
    tat: int
    whatsapp_api_key: Optional[str] = None
    whatsapp_session_id: Optional[str] = None


class EscalationAlertMechanismUpdate(BaseModel):
    alert_on: Optional[str] = None
    template_name: Optional[str] = None
    template_text: Optional[str] = None
    scenario1: Optional[int] = None
    scenario2: Optional[int] = None
    scenario3: Optional[int] = None
    scenario4: Optional[int] = None
    scenario5: Optional[int] = None
    person_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tat: Optional[int] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_session_id: Optional[str] = None


@router.post("/escalation/alert-mechanism")
def create_escalation_alert_mechanism(payload: EscalationAlertMechanismCreate):
    # Validate alert_category
    if payload.alert_category != "escalation":
        raise HTTPException(status_code=400, detail="Invalid alert_category, must be 'escalation'")

    insert_query = text("""
        INSERT INTO alert_mechanisms
        (
            client_id, alert_category, alert_on, template_name, template_text,
            scenario1, scenario2, scenario3, scenario4, scenario5,
            person_name, phone, email, tat, whatsapp_api_key, whatsapp_session_id, created_at
        )
        VALUES
        (
            :client_id, :alert_category, :alert_on, :template_name, :template_text,
            :scenario1, :scenario2, :scenario3, :scenario4, :scenario5,
            :person_name, :phone, :email, :tat, :whatsapp_api_key, :whatsapp_session_id, NOW()
        )
    """)

    try:
        with engine4.begin() as conn:
            result = conn.execute(insert_query, {
                "client_id": payload.client_id,
                "alert_category": payload.alert_category,
                "alert_on": payload.alert_on,
                "template_name": payload.template_name,
                "template_text": payload.template_text,
                "scenario1": payload.scenario1,
                "scenario2": payload.scenario2,
                "scenario3": payload.scenario3,
                "scenario4": payload.scenario4,
                "scenario5": payload.scenario5,
                "person_name": payload.person_name,
                "phone": payload.phone,
                "email": payload.email,
                "tat": payload.tat,
                "whatsapp_api_key": payload.whatsapp_api_key,
                "whatsapp_session_id": payload.whatsapp_session_id
            })

        return {
            "message": "Escalation alert mechanism saved successfully",
            "alert_id": result.lastrowid
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@router.get("/escalation/alert-mechanism")
def get_escalation_alerts(client_id: int):
    query = text("""
        SELECT * FROM alert_mechanisms
        WHERE client_id = :client_id AND alert_category = 'escalation'
        ORDER BY created_at DESC
    """)
    try:
        with engine4.begin() as conn:
            result = conn.execute(query, {"client_id": client_id})
            alerts = [dict(row._mapping) for row in result.fetchall()]
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@router.put("/escalation/alert-mechanism/{alert_id}")
def update_escalation_alert(alert_id: int, payload: EscalationAlertMechanismUpdate):
    # Build dynamic update based on provided fields
    fields_to_update = {k: v for k, v in payload.dict().items() if v is not None}
    if not fields_to_update:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_clause = ", ".join([f"{key} = :{key}" for key in fields_to_update.keys()])
    update_query = text(f"""
        UPDATE alert_mechanisms
        SET {set_clause}
        WHERE id = :alert_id AND alert_category = 'escalation'
    """)

    try:
        with engine4.begin() as conn:
            result = conn.execute(update_query, {**fields_to_update, "alert_id": alert_id})
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Escalation alert not found")
        return {"message": "Escalation alert updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@router.delete("/escalation/alert-mechanism/{alert_id}")
def delete_escalation_alert(alert_id: int):
    delete_query = text("""
        DELETE FROM alert_mechanisms
        WHERE id = :alert_id AND alert_category = 'escalation'
    """)
    try:
        with engine4.begin() as conn:
            result = conn.execute(delete_query, {"alert_id": alert_id})
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Escalation alert not found")
        return {"message": "Escalation alert deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")