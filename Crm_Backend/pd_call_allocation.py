# pd_call_allocation.py
# Python port of AdmindataAllocationsController (PHP)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from database import get_db4

router = APIRouter(prefix="/pd-call-allocation", tags=["PD Call Allocation"])


# -------------------- Request Models --------------------
class AllocateRequest(BaseModel):
    allocation_id: int              # PHP: AdmindataAllocations[AllocationName] (allocation id)
    allocated: int                  # PHP: AdmindataAllocations[Allocated] (records to distribute)
    agent_ids: List[int]            # PHP: Agent[] (selected agent ids)


# -------------------- Companies (PHP: index - admin view) --------------------
@router.get("/companies")
def get_companies(
    db: Session = Depends(get_db4),
):
    """List active companies for the dropdown (like RegistrationMaster->find('list'))."""
    query = text("""
        SELECT company_id, company_name
        FROM registration_master
        WHERE status = 'A'
        ORDER BY company_name ASC
    """)
    rows = db.execute(query).mappings().all()
    return [
        {"company_id": row["company_id"], "company_name": row["company_name"]}
        for row in rows
    ]


# -------------------- Agents (PHP: index - page_record) --------------------
@router.get("/agents")
def get_agents(
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db4),
):
    """
    List active agents.
    - If company_id given -> agents whose ClientRights contains that company
      (like PHP FIND_IN_SET(clientId, ClientRights)).
    - If company_id omitted -> all active agents (admin view).
    """
    if company_id is not None:
        query = text("""
            SELECT *
            FROM agent_master
            WHERE status = 'A'
              AND FIND_IN_SET(:company_id, ClientRights)
        """)
        rows = db.execute(query, {"company_id": company_id}).mappings().all()
    else:
        query = text("""
            SELECT *
            FROM agent_master
            WHERE status = 'A'
        """)
        rows = db.execute(query).mappings().all()

    return [dict(row) for row in rows]


# -------------------- Campaigns (PHP: get_campaign) --------------------
@router.get("/campaigns")
def get_campaigns(
    client_id: int = Query(...),
    db: Session = Depends(get_db4),
):
    """Return campaigns for a client (like CampaignName->find('list', conditions ClientId))."""
    query = text("""
        SELECT id, CampaignName
        FROM ob_campaign
        WHERE ClientId = :client_id
    """)
    rows = db.execute(query, {"client_id": client_id}).mappings().all()
    return [
        {"id": row["id"], "CampaignName": row["CampaignName"]}
        for row in rows
    ]


# -------------------- Allocations (PHP: get_allocation) --------------------
@router.get("/allocations")
def get_allocations(
    client_id: int = Query(...),
    campaign_id: int = Query(...),
    db: Session = Depends(get_db4),
):
    """Return allocations for a client + campaign (like ObAllocationMaster->find('list'))."""
    query = text("""
        SELECT id, AllocationName
        FROM ob_allocation_name
        WHERE ClientId = :client_id
          AND CampaignId = :campaign_id
    """)
    rows = db.execute(query, {
        "client_id": client_id,
        "campaign_id": campaign_id,
    }).mappings().all()
    return [
        {"id": row["id"], "AllocationName": row["AllocationName"]}
        for row in rows
    ]


# -------------------- Unallocated Count (PHP: get_count) --------------------
@router.get("/count")
def get_unallocated_count(
    allocation_id: int = Query(..., alias="AllocationId"),
    db: Session = Depends(get_db4),
):
    """Count records in ob_campaign_data that still have AgentId IS NULL."""
    query = text("""
        SELECT COUNT(id)
        FROM ob_campaign_data
        WHERE AllocationId = :allocation_id
          AND AgentId IS NULL
    """)
    count = db.execute(query, {"allocation_id": allocation_id}).scalar()
    return {"count": count}


# -------------------- Allocate Records (PHP: index POST) --------------------
@router.post("/allocate")
def allocate_records(
    payload: AllocateRequest,
    db: Session = Depends(get_db4),
):
    """
    Distribute 'allocated' unassigned records of an allocation evenly among
    selected agents, replicating the PHP logic:
    - every agent gets floor(allocated / count(agents))
    - the first (allocated % count(agents)) agents get 1 extra each
    """
    allocation_id = payload.allocation_id
    allocated = payload.allocated
    agent_ids = payload.agent_ids

    if not agent_ids:
        raise HTTPException(status_code=400, detail="No agents selected")

    num_agents = len(agent_ids)
    if allocated <= 0:
        raise HTTPException(status_code=400, detail="Allocated count must be positive")

    # Build distribution map: agent_id -> number of records
    base = allocated // num_agents
    remainder = allocated % num_agents

    distribution = {agent_id: base for agent_id in agent_ids}
    for agent_id in agent_ids[:remainder]:
        distribution[agent_id] += 1

    updated = {}
    try:
        for agent_id in agent_ids:
            if distribution[agent_id] <= 0:
                continue
            # PHP: UPDATE ob_campaign_data SET AgentId = <key>
            #      WHERE AllocationId = <allocationid> AND AgentId IS NULL LIMIT <value>
            query = text("""
                UPDATE ob_campaign_data
                SET AgentId = :agent_id
                WHERE AllocationId = :allocation_id
                  AND AgentId IS NULL
                LIMIT :limit_value
            """)
            result = db.execute(query, {
                "agent_id": agent_id,
                "allocation_id": allocation_id,
                "limit_value": distribution[agent_id],
            })
            updated[agent_id] = result.rowcount

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")

    return {
        "status": "success",
        "message": "Allocated Successfully.",
        "allocation_id": allocation_id,
        "distribution": updated,
    }
