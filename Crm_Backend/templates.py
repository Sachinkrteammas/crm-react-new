from fastapi import APIRouter, Query, Form
from datetime import datetime
from sqlalchemy import create_engine, text
from database import engine4

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
            "tagging": tagging,
            "required_fields": required_fields,
            "template_text": template_text,
            "created_at": now,
        })
        new_id = result.lastrowid

    return {"id": new_id, "message": "Template inserted successfully"}