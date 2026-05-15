from typing import List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4

router = APIRouter()


@router.get("/agent")
def get_agent(
    client_id: int = Query(..., description="Client ID"),
    db: Session = Depends(get_db4),
):
    query = text("""
        SELECT 
            displayname,
            username
        FROM agent_master
        WHERE status = 'A'
        AND FIND_IN_SET(:client_id, clientrights)
        ORDER BY displayname ASC
    """)

    rows = db.execute(
        query,
        {"client_id": str(client_id)}
    ).fetchall()

    return [
        {
            "displayname": row.displayname,
            "username": row.username
        }
        for row in rows
    ]

class PlanSettingSchema(BaseModel):
    client_id: int
    remote_agents: List[str]
    dedicated_agents: List[str]


@router.post("/save-plan-setting")
def save_plan_setting(
    payload: PlanSettingSchema,
    db: Session = Depends(get_db4),
):
    try:

        remote_agents = ",".join(payload.remote_agents)
        dedicated_agents = ",".join(payload.dedicated_agents)

        query = text("""
            INSERT INTO plandetails (
                client_id,
                remote_agents,
                dedicated_agents
            )
            VALUES (
                :client_id,
                :remote_agents,
                :dedicated_agents
            )
        """)

        db.execute(
            query,
            {
                "client_id": payload.client_id,
                "remote_agents": remote_agents,
                "dedicated_agents": dedicated_agents,
            },
        )

        db.commit()

        return {
            "status": "success",
            "message": "Plan setting saved successfully"
        }

    except Exception as e:
        db.rollback()

        return {
            "status": "error",
            "message": str(e)
        }