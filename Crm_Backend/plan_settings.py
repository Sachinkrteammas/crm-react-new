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

        # CHECK EXISTING CLIENT
        check_query = text("""
            SELECT id
            FROM plandetails
            WHERE client_id = :client_id
            LIMIT 1
        """)

        existing = db.execute(
            check_query,
            {"client_id": payload.client_id}
        ).fetchone()

        # UPDATE
        if existing:

            update_query = text("""
                UPDATE plandetails
                SET
                    remote_agents = :remote_agents,
                    dedicated_agents = :dedicated_agents,
                    created_at = NOW()
                WHERE client_id = :client_id
            """)

            db.execute(
                update_query,
                {
                    "client_id": payload.client_id,
                    "remote_agents": remote_agents,
                    "dedicated_agents": dedicated_agents,
                }
            )

            message = "Plan setting updated successfully"

        # INSERT
        else:

            insert_query = text("""
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
                insert_query,
                {
                    "client_id": payload.client_id,
                    "remote_agents": remote_agents,
                    "dedicated_agents": dedicated_agents,
                }
            )

            message = "Plan setting saved successfully"

        db.commit()

        return {
            "status": "success",
            "message": message
        }

    except Exception as e:

        db.rollback()

        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/get-plan-setting")
def get_plan_setting(
    client_id: int = Query(...),
    db: Session = Depends(get_db4),
):
    try:

        query = text("""
            SELECT
                client_id,
                remote_agents,
                dedicated_agents
            FROM plandetails
            WHERE client_id = :client_id
            ORDER BY id DESC
            LIMIT 1
        """)

        row = db.execute(
            query,
            {"client_id": client_id}
        ).fetchone()

        if not row:
            return {
                "status": "success",
                "remote_agents": [],
                "dedicated_agents": []
            }

        remote_agents = (
            row.remote_agents.split(",")
            if row.remote_agents
            else []
        )

        dedicated_agents = (
            row.dedicated_agents.split(",")
            if row.dedicated_agents
            else []
        )

        return {
            "status": "success",
            "client_id": row.client_id,
            "remote_agents": remote_agents,
            "dedicated_agents": dedicated_agents,
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }